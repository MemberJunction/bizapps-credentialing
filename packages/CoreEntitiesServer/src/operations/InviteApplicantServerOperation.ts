/**
 * Server body of `Credentialing.InviteApplicant` (FRD FR-3.1): invites an applicant contact onto an
 * Active program version in one transaction, then refreshes the user cache and issues a magic link
 * after commit.
 *
 * System-user writes are limited to platform/dependency entities the staff caller holds no permission
 * on (`MJ_BizApps_Common: People` / `Organizations`, `MJ: Users`, `MJ: User Roles`,
 * `MJ: User Applications`). The credentialing rows (`Subject`, `SubjectContact`, `Application`,
 * `StandardResponse`) are saved as the staff caller inside `OperationWrite.Run` so the caller's row
 * filters apply and Record Changes attribute the work to the caller.
 */
import { BaseRemotableOperation, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import type { MJUserEntity } from '@memberjunction/core-entities';
import { EscapeSQLString, IsValidUUID, RegisterClass, UUIDsEqual } from '@memberjunction/global';
import type { mjBizAppsCommonOrganizationEntity, mjBizAppsCommonPersonEntity } from '@mj-biz-apps/common-entities';
import {
    ApplicationLifecycleRules,
    CREDENTIALING_STAFF_ROLE,
    CredentialingEntity,
    CredentialingOperation,
    InvitationRules,
    InviteApplicantOperation,
    NOT_FOUND_REASON,
    type ApplicationStatus,
    type InviteApplicantInput,
    type InviteApplicantOutput,
    type RuleResult,
} from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingApplicationEntity,
    mjBizAppsCredentialingProgramEntity,
    mjBizAppsCredentialingStandardResponseEntity,
    mjBizAppsCredentialingSubjectContactEntity,
    mjBizAppsCredentialingSubjectEntity,
} from '@mj-biz-apps/credentialing-entities';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { LockedWrite } from '../guards/LockedWrite.js';
import { OperationWrite, type OperationWriteScope } from '../guards/OperationWrite.js';
import { ParentVersionLoader, type LoadedVersion } from '../guards/ParentVersionLoader.js';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { SystemUser } from '../guards/SystemUser.js';
import {
    COMMON_ORGANIZATIONS_ENTITY,
    COMMON_PEOPLE_ENTITY,
    InvitationSupport,
    USERS_ENTITY,
    type IDRow,
    type UserAccountRow,
} from './InvitationSupport.js';
import { OperationSupport } from './OperationSupport.js';

interface CommittedInvitation {
    SubjectID: string;
    ApplicationID: string;
    ContactUserID: string;
    NormalizedContactEmail: string;
}

interface ExistingApplicationRow {
    Status: ApplicationStatus;
    IsHistorical: boolean;
}

interface ExistingContactRow {
    ID: string;
    UserID: string;
}

interface ProgramSummaryRow {
    ID: string;
    AccreditingOrganizationID: string;
    SubjectType: mjBizAppsCredentialingProgramEntity['SubjectType'];
}

@RegisterClass(BaseRemotableOperation, CredentialingOperation.InviteApplicant)
export class InviteApplicantServerOperation extends InviteApplicantOperation {
    protected override async Authorize(_input: InviteApplicantInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE);
    }

    protected override async InternalExecute(
        input: InviteApplicantInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<InviteApplicantOutput> {
        InviteApplicantServerOperation.require(InvitationRules.Validate(input));
        if (!IsValidUUID(input.ProgramVersionID)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        if ('ExistingSubjectID' in input.Subject && !IsValidUUID(input.Subject.ExistingSubjectID)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }

        const initialScope = await this.loadVersionAndProgram(input.ProgramVersionID, provider, user);
        const contactEmail = InvitationRules.NormalizeEmail(input.Contact.Email);

        const committed = await OperationWrite.Run(provider, async (scope) => {
            await AuthoringLock.ForUserEmail(contactEmail, provider, user);
            await AuthoringLock.ForOrganization(initialScope.Program.AccreditingOrganizationID, provider, user);
            await AuthoringLock.ForVersion(initialScope.Version.ID, provider, user);

            const { Version: version, Program: program } = await this.loadVersionAndProgram(input.ProgramVersionID, provider, user);
            const system = SystemUser.Get('Inviting an applicant');
            const existingUser = await this.findUserByEmail(contactEmail, provider, system);
            if (existingUser != null) {
                await InvitationSupport.AssertExternalAccount(existingUser, provider, system);
            }

            InviteApplicantServerOperation.require(
                ApplicationLifecycleRules.CanStart([], version.Status, program.SubjectType, program.SubjectType),
            );

            const subject = await this.findOrCreateSubject(input, program, contactEmail, provider, user, system, scope);
            const contactUserID = existingUser?.ID ?? (await this.createContactUser(input, contactEmail, subject, provider, system));
            await InvitationSupport.EnsureApplicantGrants(contactUserID, provider, system);
            await this.ensureSubjectContact(subject.ID, contactUserID, provider, user, scope);
            const application = await this.createDraftApplication(subject.ID, version.ID, provider, user, scope);
            await this.createEmptyResponses(application.ID, version.ID, subject.ID, provider, user, scope);

            return {
                SubjectID: subject.ID,
                ApplicationID: application.ID,
                ContactUserID: contactUserID,
                NormalizedContactEmail: contactEmail,
            };
        });

        await InvitationSupport.RefreshUserCache();
        const issued = await InvitationSupport.IssueLinkAfterCommit(committed.NormalizedContactEmail);
        return {
            SubjectID: committed.SubjectID,
            ApplicationID: committed.ApplicationID,
            ContactUserID: committed.ContactUserID,
            ...issued,
        };
    }

    private async loadVersionAndProgram(
        versionID: string,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<{ Version: LoadedVersion; Program: ProgramSummaryRow }> {
        const escapedID = EscapeSQLString(versionID);
        const [versions, programs] = await InvitationSupport.Read<LoadedVersion | ProgramSummaryRow>(
            [
                ParentVersionLoader.VersionParams(versionID),
                {
                    EntityName: CredentialingEntity.Program,
                    ExtraFilter: IsValidUUID(versionID)
                        ? `ID IN (SELECT v.ProgramID FROM [__mj_BizAppsCredentialing].[vwProgramVersions] v WHERE v.ID = '${escapedID}')`
                        : '1 = 0',
                    Fields: ['ID', 'AccreditingOrganizationID', 'SubjectType'],
                    ResultType: 'simple',
                    MaxRows: 1,
                    SkipTotalRowCount: true,
                },
            ],
            provider,
            user,
            'invited version and program',
        );
        const version = versions[0] as LoadedVersion | undefined;
        const program = programs[0] as ProgramSummaryRow | undefined;
        if (version == null || program == null || !UUIDsEqual(program.ID, version.ProgramID)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        return { Version: version, Program: program };
    }

    private async findUserByEmail(email: string, provider: IMetadataProvider, system: UserInfo): Promise<UserAccountRow | null> {
        const [users] = await InvitationSupport.Read<UserAccountRow>(
            [
                {
                    EntityName: USERS_ENTITY,
                    ExtraFilter: `LOWER(Email) = LOWER('${EscapeSQLString(email)}')`,
                    Fields: ['ID', 'Email', 'Type'],
                    ResultType: 'simple',
                    MaxRows: 1,
                },
            ],
            provider,
            system,
            'invited user',
        );
        return users[0] ?? null;
    }

    private async findOrCreateSubject(
        input: InviteApplicantInput,
        program: ProgramSummaryRow,
        contactEmail: string,
        provider: IMetadataProvider,
        user: UserInfo,
        system: UserInfo,
        scope: OperationWriteScope,
    ): Promise<mjBizAppsCredentialingSubjectEntity> {
        if ('ExistingSubjectID' in input.Subject) {
            const existing = await SubjectAccess.Subject(input.Subject.ExistingSubjectID, provider, user);
            if (!UUIDsEqual(existing.AccreditingOrganizationID, program.AccreditingOrganizationID)) {
                OperationSupport.Refuse(NOT_FOUND_REASON);
            }
            await AuthoringLock.ForSubject(existing.ID, provider, user);
            await this.assertCanStartForSubject(existing.ID, input.ProgramVersionID, program.SubjectType, existing.SubjectType, provider, user);
            return existing;
        }

        const displayName = input.Subject.DisplayName.trim();
        const primaryEmail = InvitationRules.NormalizeEmail(input.Subject.PrimaryEmail);
        const [existingByName] = await InvitationSupport.Read<mjBizAppsCredentialingSubjectEntity>(
            [
                {
                    EntityName: CredentialingEntity.Subject,
                    ExtraFilter: `AccreditingOrganizationID = '${EscapeSQLString(program.AccreditingOrganizationID)}' AND LOWER(LTRIM(RTRIM(DisplayName))) = LOWER('${EscapeSQLString(displayName)}')`,
                    ResultType: 'entity_object',
                    MaxRows: 1,
                },
            ],
            provider,
            user,
            'subject by display name',
        );
        if (existingByName[0] != null) {
            const existing = existingByName[0];
            await AuthoringLock.ForSubject(existing.ID, provider, user);
            await this.assertCanStartForSubject(existing.ID, input.ProgramVersionID, program.SubjectType, existing.SubjectType, provider, user);
            return existing;
        }

        const party = await this.createPartyRecord(
            program.SubjectType,
            displayName,
            primaryEmail,
            primaryEmail === contactEmail ? input.Contact : null,
            provider,
            system,
        );
        const subject = await OperationSupport.NewRecord<mjBizAppsCredentialingSubjectEntity>(provider, CredentialingEntity.Subject, user);
        subject.AccreditingOrganizationID = program.AccreditingOrganizationID;
        subject.SubjectType = program.SubjectType;
        subject.DisplayName = displayName;
        subject.PrimaryEmail = primaryEmail;
        subject.Status = 'Active';
        subject.PartyEntityID = party.EntityID;
        subject.PartyRecordID = party.RecordID;
        await scope.Save(subject);
        await AuthoringLock.ForSubject(subject.ID, provider, user);
        return subject;
    }

    private async assertCanStartForSubject(
        subjectID: string,
        versionID: string,
        programSubjectType: string,
        subjectType: string,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<void> {
        const [existingApps] = await InvitationSupport.Read<ExistingApplicationRow>(
            [
                {
                    EntityName: CredentialingEntity.Application,
                    ExtraFilter: `SubjectID = '${EscapeSQLString(subjectID)}' AND ProgramVersionID = '${EscapeSQLString(versionID)}'`,
                    Fields: ['Status', 'IsHistorical'],
                    ResultType: 'simple',
                },
            ],
            provider,
            user,
            'existing applications',
        );
        InviteApplicantServerOperation.require(
            ApplicationLifecycleRules.CanStart(existingApps, 'Active', programSubjectType, subjectType),
        );
    }

    private static require(rule: RuleResult): void {
        const reason = LockedWrite.ReasonOf(rule);
        if (reason != null) {
            OperationSupport.Refuse(reason);
        }
    }

    private async createPartyRecord(
        subjectType: mjBizAppsCredentialingProgramEntity['SubjectType'],
        displayName: string,
        primaryEmail: string,
        contact: InviteApplicantInput['Contact'] | null,
        provider: IMetadataProvider,
        system: UserInfo,
    ): Promise<{ EntityID: string; RecordID: string }> {
        if (subjectType === 'Organization') {
            const orgEntity = provider.EntityByName(COMMON_ORGANIZATIONS_ENTITY);
            if (orgEntity == null) {
                throw new Error(`Entity '${COMMON_ORGANIZATIONS_ENTITY}' is not registered.`);
            }
            const org = await OperationSupport.NewRecord<mjBizAppsCommonOrganizationEntity>(provider, COMMON_ORGANIZATIONS_ENTITY, system);
            org.Name = displayName;
            org.Email = primaryEmail;
            await OperationSupport.Save(org);
            return { EntityID: orgEntity.ID, RecordID: org.ID };
        }

        const peopleEntity = provider.EntityByName(COMMON_PEOPLE_ENTITY);
        if (peopleEntity == null) {
            throw new Error(`Entity '${COMMON_PEOPLE_ENTITY}' is not registered.`);
        }
        const names = contact != null
            ? { FirstName: contact.FirstName.trim(), LastName: contact.LastName.trim() }
            : InviteApplicantServerOperation.splitDisplayName(displayName);
        const person = await OperationSupport.NewRecord<mjBizAppsCommonPersonEntity>(provider, COMMON_PEOPLE_ENTITY, system);
        person.FirstName = names.FirstName;
        person.LastName = names.LastName;
        person.Email = primaryEmail;
        await OperationSupport.Save(person);
        return { EntityID: peopleEntity.ID, RecordID: person.ID };
    }

    private async createContactUser(
        input: InviteApplicantInput,
        contactEmail: string,
        subject: mjBizAppsCredentialingSubjectEntity,
        provider: IMetadataProvider,
        system: UserInfo,
    ): Promise<string> {
        const peopleEntity = provider.EntityByName(COMMON_PEOPLE_ENTITY);
        if (peopleEntity == null) {
            throw new Error(`Entity '${COMMON_PEOPLE_ENTITY}' is not registered.`);
        }
        const personID = await this.personIDForContactUser(input.Contact, contactEmail, subject, peopleEntity.ID, provider, system);
        const newUser = await OperationSupport.NewRecord<MJUserEntity>(provider, USERS_ENTITY, system);
        newUser.Name = contactEmail;
        newUser.Email = contactEmail;
        newUser.FirstName = input.Contact.FirstName.trim();
        newUser.LastName = input.Contact.LastName.trim();
        newUser.Type = 'User';
        newUser.IsActive = true;
        newUser.LinkedEntityID = peopleEntity.ID;
        newUser.LinkedEntityRecordID = personID;
        await OperationSupport.Save(newUser);
        return newUser.ID;
    }

    private async personIDForContactUser(
        contact: InviteApplicantInput['Contact'],
        contactEmail: string,
        subject: mjBizAppsCredentialingSubjectEntity,
        peopleEntityID: string,
        provider: IMetadataProvider,
        system: UserInfo,
    ): Promise<string> {
        if (
            subject.PartyEntityID != null &&
            UUIDsEqual(subject.PartyEntityID, peopleEntityID) &&
            subject.PartyRecordID != null &&
            InvitationRules.NormalizeEmail(subject.PrimaryEmail) === contactEmail
        ) {
            return subject.PartyRecordID;
        }
        const [existing] = await InvitationSupport.Read<IDRow>(
            [
                {
                    EntityName: COMMON_PEOPLE_ENTITY,
                    ExtraFilter: `LOWER(Email) = LOWER('${EscapeSQLString(contactEmail)}')`,
                    Fields: ['ID'],
                    ResultType: 'simple',
                    MaxRows: 1,
                },
            ],
            provider,
            system,
            'contact person',
        );
        if (existing[0] != null) {
            return existing[0].ID;
        }
        const person = await OperationSupport.NewRecord<mjBizAppsCommonPersonEntity>(provider, COMMON_PEOPLE_ENTITY, system);
        person.FirstName = contact.FirstName.trim();
        person.LastName = contact.LastName.trim();
        person.Email = contactEmail;
        await OperationSupport.Save(person);
        return person.ID;
    }

    private async ensureSubjectContact(
        subjectID: string,
        contactUserID: string,
        provider: IMetadataProvider,
        user: UserInfo,
        scope: OperationWriteScope,
    ): Promise<void> {
        const [contacts] = await InvitationSupport.Read<ExistingContactRow>(
            [
                {
                    EntityName: CredentialingEntity.SubjectContact,
                    ExtraFilter: `SubjectID = '${EscapeSQLString(subjectID)}'`,
                    Fields: ['ID', 'UserID'],
                    ResultType: 'simple',
                },
            ],
            provider,
            user,
            'existing subject contacts',
        );
        const match = contacts.find((c) => UUIDsEqual(c.UserID, contactUserID));
        if (match != null) {
            const [loaded] = await InvitationSupport.Read<mjBizAppsCredentialingSubjectContactEntity>(
                [
                    {
                        EntityName: CredentialingEntity.SubjectContact,
                        ExtraFilter: `ID = '${EscapeSQLString(match.ID)}'`,
                        ResultType: 'entity_object',
                        MaxRows: 1,
                    },
                ],
                provider,
                user,
                'subject contact',
            );
            if (loaded[0] != null) {
                loaded[0].InvitedByUserID = user.ID;
                loaded[0].LastInvitedAt = new Date();
                await scope.Save(loaded[0]);
                return;
            }
        }
        const contact = await OperationSupport.NewRecord<mjBizAppsCredentialingSubjectContactEntity>(provider, CredentialingEntity.SubjectContact, user);
        contact.SubjectID = subjectID;
        contact.UserID = contactUserID;
        contact.ContactRole = contacts.length === 0 ? 'Primary' : 'Staff';
        contact.InvitedByUserID = user.ID;
        contact.LastInvitedAt = new Date();
        await scope.Save(contact);
    }

    private async createDraftApplication(
        subjectID: string,
        versionID: string,
        provider: IMetadataProvider,
        user: UserInfo,
        scope: OperationWriteScope,
    ): Promise<mjBizAppsCredentialingApplicationEntity> {
        const application = await OperationSupport.NewRecord<mjBizAppsCredentialingApplicationEntity>(provider, CredentialingEntity.Application, user);
        application.SubjectID = subjectID;
        application.ProgramVersionID = versionID;
        application.Status = 'Draft';
        application.IsHistorical = false;
        await scope.Save(application);
        return application;
    }

    private async createEmptyResponses(
        applicationID: string,
        versionID: string,
        subjectID: string,
        provider: IMetadataProvider,
        user: UserInfo,
        scope: OperationWriteScope,
    ): Promise<void> {
        const [standards] = await InvitationSupport.Read<IDRow>(
            [
                {
                    EntityName: CredentialingEntity.Standard,
                    ExtraFilter: `ProgramVersionID = '${EscapeSQLString(versionID)}'`,
                    Fields: ['ID'],
                    OrderBy: 'Sequence, Code',
                    ResultType: 'simple',
                },
            ],
            provider,
            user,
            'version standards',
        );
        for (const standard of standards) {
            const response = await OperationSupport.NewRecord<mjBizAppsCredentialingStandardResponseEntity>(
                provider,
                CredentialingEntity.StandardResponse,
                user,
            );
            response.ApplicationID = applicationID;
            response.StandardID = standard.ID;
            response.SubjectID = subjectID;
            response.Status = 'Empty';
            response.AuthorType = 'Human';
            await scope.Save(response);
        }
    }

    private static splitDisplayName(displayName: string): { FirstName: string; LastName: string } {
        const parts = displayName.trim().split(/\s+/).filter((p) => p.length > 0);
        if (parts.length <= 1) {
            const single = parts[0] ?? 'Applicant';
            return { FirstName: single, LastName: single };
        }
        return { FirstName: parts.slice(0, -1).join(' '), LastName: parts[parts.length - 1] };
    }
}
