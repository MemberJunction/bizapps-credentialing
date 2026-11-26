import { LogError, RunView, type BaseEntity, type IMetadataProvider, type RunViewParams, type UserInfo } from '@memberjunction/core';
import { IsValidUUID, UUIDsEqual } from '@memberjunction/global';
import {
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_STAFF_ROLE,
    CredentialingEntity,
    NOT_FOUND_REASON,
    type ApplicationActor,
} from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingApplicationEntity,
    mjBizAppsCredentialingDocumentRequirementEntity,
    mjBizAppsCredentialingEvidenceDocumentEntity,
    mjBizAppsCredentialingProgramEntity,
    mjBizAppsCredentialingProgramVersionEntity,
    mjBizAppsCredentialingStandardEntity,
    mjBizAppsCredentialingStandardResponseEntity,
    mjBizAppsCredentialingSubjectEntity,
} from '@mj-biz-apps/credentialing-entities';
import { OperationSupport } from '../operations/OperationSupport.js';
import { SystemUser } from './SystemUser.js';

type SubjectEntity = mjBizAppsCredentialingSubjectEntity;
type ApplicationEntity = mjBizAppsCredentialingApplicationEntity;
type StandardResponseEntity = mjBizAppsCredentialingStandardResponseEntity;
type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;
type DocumentRequirementEntity = mjBizAppsCredentialingDocumentRequirementEntity;
type ProgramVersionEntity = mjBizAppsCredentialingProgramVersionEntity;
type ProgramEntity = mjBizAppsCredentialingProgramEntity;
type StandardEntity = mjBizAppsCredentialingStandardEntity;

/** An application the caller owns or serves, with its subject and the authoring rows it was started on. */
export interface ApplicationAccess {
    Application: ApplicationEntity;
    Subject: SubjectEntity;
    Version: ProgramVersionEntity;
    Program: ProgramEntity;
}

/** A response the caller owns or serves, with its application and the authoring rows it answers. */
export interface ResponseAccess {
    Response: StandardResponseEntity;
    Application: ApplicationEntity;
    Standard: StandardEntity;
    Version: ProgramVersionEntity;
}

/** A document of a subject the caller owns or serves. */
export interface DocumentAccess {
    Document: EvidenceDocumentEntity;
    Subject: SubjectEntity;
}

/** An ID-only row. */
interface IDRow {
    ID: string;
}

/**
 * How every operation reaches a subject's application data (FRD BR-13, plan Review Focus 1).
 *
 * Ownership is read **as the caller**, through the caller's own permissions and row filters
 * (`Credentialing: Applicant Subjects` / `… Rows By Subject` for a contact, `Credentialing: Staff
 * Subjects` / `… Rows By Subject` for staff): a row of another subject or organization does not load,
 * exactly like a random ID, and both refuse the operation with `RemoteOperationError(OPERATION_REFUSED,
 * NOT_FOUND_REASON)`.
 *
 * Only after the caller's filter has admitted the owned row does it read, **as the system user**, the
 * authoring rows the caller holds no permission on (version, program, standard, requirement) — by
 * the IDs the owned row carries, one row each. An applicant holds no permission on authoring entities
 * or memberships (plan Global Constraints); these reads return entity objects to server code, never
 * to the client, which receives only what each operation chooses to return. Listed with the other
 * system-user reads in `docs/isolation-read-paths.md`.
 *
 * Every read runs on `provider`, so inside an operation's transaction it sees the operation's own
 * writes.
 */
export class SubjectAccess {
    /** The subject `id`, read as `user`. */
    public static async Subject(id: string, provider: IMetadataProvider, user: UserInfo): Promise<SubjectEntity> {
        return SubjectAccess.ownedByID<SubjectEntity>(CredentialingEntity.Subject, id, provider, user);
    }

    /** The application `id` and its subject, read as `user` in one RunViews batch; then its version and program as the system user. */
    public static async Application(id: string, provider: IMetadataProvider, user: UserInfo): Promise<ApplicationAccess> {
        if (id == null || !IsValidUUID(id)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        const [application, subject] = await SubjectAccess.ownedPair<ApplicationEntity, SubjectEntity>(
            SubjectAccess.byID(CredentialingEntity.Application, id),
            {
                EntityName: CredentialingEntity.Subject,
                ExtraFilter: `ID IN (SELECT a.SubjectID FROM [__mj_BizAppsCredentialing].[vwApplications] a WHERE a.ID = '${id}')`,
                ResultType: 'entity_object',
                MaxRows: 1,
                SkipTotalRowCount: true,
            },
            provider,
            user,
        );
        if (!UUIDsEqual(subject.ID, application.SubjectID)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        const system = SystemUser.Get('Reading the program of an application');
        const [version, program] = await SubjectAccess.systemRows<ProgramVersionEntity | ProgramEntity>(
            [
                SubjectAccess.byID(CredentialingEntity.ProgramVersion, application.ProgramVersionID),
                {
                    EntityName: CredentialingEntity.Program,
                    ExtraFilter: `ID IN (SELECT v.ProgramID FROM [__mj_BizAppsCredentialing].[vwProgramVersions] v WHERE v.ID = '${application.ProgramVersionID}')`,
                    ResultType: 'entity_object',
                    MaxRows: 1,
                    SkipTotalRowCount: true,
                },
            ],
            provider,
            system,
        );
        return { Application: application, Subject: subject, Version: version as ProgramVersionEntity, Program: program as ProgramEntity };
    }

    /** The response `id` and its application, read as `user` in one RunViews batch; then its standard and version as the system user. */
    public static async Response(id: string, provider: IMetadataProvider, user: UserInfo): Promise<ResponseAccess> {
        if (id == null || !IsValidUUID(id)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        const [response, application] = await SubjectAccess.ownedPair<StandardResponseEntity, ApplicationEntity>(
            SubjectAccess.byID(CredentialingEntity.StandardResponse, id),
            {
                EntityName: CredentialingEntity.Application,
                ExtraFilter: `ID IN (SELECT r.ApplicationID FROM [__mj_BizAppsCredentialing].[vwStandardResponses] r WHERE r.ID = '${id}')`,
                ResultType: 'entity_object',
                MaxRows: 1,
                SkipTotalRowCount: true,
            },
            provider,
            user,
        );
        if (!UUIDsEqual(application.ID, response.ApplicationID)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        const system = SystemUser.Get('Reading the standard of a response');
        const [standard, version] = await SubjectAccess.systemRows<StandardEntity | ProgramVersionEntity>(
            [SubjectAccess.byID(CredentialingEntity.Standard, response.StandardID), SubjectAccess.byID(CredentialingEntity.ProgramVersion, application.ProgramVersionID)],
            provider,
            system,
        );
        return { Response: response, Application: application, Standard: standard as StandardEntity, Version: version as ProgramVersionEntity };
    }

    /** The evidence document `id` and its subject, read as `user` in one RunViews batch. */
    public static async Document(id: string, provider: IMetadataProvider, user: UserInfo): Promise<DocumentAccess> {
        if (id == null || !IsValidUUID(id)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        const [document, subject] = await SubjectAccess.ownedPair<EvidenceDocumentEntity, SubjectEntity>(
            SubjectAccess.byID(CredentialingEntity.EvidenceDocument, id),
            {
                EntityName: CredentialingEntity.Subject,
                ExtraFilter: `ID IN (SELECT d.SubjectID FROM [__mj_BizAppsCredentialing].[vwEvidenceDocuments] d WHERE d.ID = '${id}')`,
                ResultType: 'entity_object',
                MaxRows: 1,
                SkipTotalRowCount: true,
            },
            provider,
            user,
        );
        if (!UUIDsEqual(subject.ID, document.SubjectID)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        return { Document: document, Subject: subject };
    }

    /**
     * The document requirement `id`, read as the system user in one RunViews batch, admitted only
     * when the subject holds an application on the requirement's version. `subjectID` must come
     * from a subject the caller was already admitted to ({@link Subject}, {@link Document}, {@link Application}).
     */
    public static async Requirement(id: string, subjectID: string, provider: IMetadataProvider): Promise<DocumentRequirementEntity> {
        if (!IsValidUUID(id) || !IsValidUUID(subjectID)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        const system = SystemUser.Get('Reading a document requirement for a subject');
        const [reqRes, heldRes] = await RunView.FromMetadataProvider(provider).RunViews<DocumentRequirementEntity | IDRow>(
            [
                SubjectAccess.byID(CredentialingEntity.DocumentRequirement, id),
                {
                    EntityName: CredentialingEntity.Application,
                    ExtraFilter: `SubjectID = '${subjectID}' AND ProgramVersionID IN (SELECT r.ProgramVersionID FROM [__mj_BizAppsCredentialing].[vwDocumentRequirements] r WHERE r.ID = '${id}')`,
                    Fields: ['ID'],
                    ResultType: 'simple',
                    MaxRows: 1,
                    SkipTotalRowCount: true,
                },
            ],
            system,
        );
        if (!reqRes.Success || !heldRes.Success) {
            LogError(`SubjectAccess: reading requirement ${id} as the system user failed: ${reqRes.ErrorMessage ?? heldRes.ErrorMessage}`);
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        const requirement = reqRes.Results[0] as DocumentRequirementEntity | undefined;
        if (requirement == null || heldRes.Results.length === 0) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        return requirement;
    }

    /**
     * How `user` acts for `subject`: `Applicant` when the user is a contact of the subject and holds
     * `Credentialing Applicant`, `Staff` when the user is a member of the subject's accrediting
     * organization and holds `Credentialing Staff`, `Applicant` when both, null when neither. Read as
     * the system user (an applicant cannot read memberships), filtered to this one user and this one
     * subject. Call it only with a subject the caller was admitted to.
     */
    public static async ActorFor(user: UserInfo, subject: SubjectEntity, provider: IMetadataProvider): Promise<ApplicationActor | null> {
        const system = SystemUser.Get('Deciding how a user acts for a subject');
        const params: RunViewParams[] = [
            {
                EntityName: CredentialingEntity.SubjectContact,
                ExtraFilter: `SubjectID = '${subject.ID}' AND UserID = '${user.ID}'`,
                Fields: ['ID'],
                ResultType: 'simple',
                MaxRows: 1,
            },
            {
                EntityName: CredentialingEntity.OrganizationMembership,
                ExtraFilter: `AccreditingOrganizationID = '${subject.AccreditingOrganizationID}' AND UserID = '${user.ID}'`,
                Fields: ['ID'],
                ResultType: 'simple',
                MaxRows: 1,
            },
        ];
        const [contacts, memberships] = await RunView.FromMetadataProvider(provider).RunViews<IDRow>(params, system);
        if (!contacts.Success || !memberships.Success) {
            throw new Error(`Deciding how a user acts for a subject could not read ${contacts.ErrorMessage ?? memberships.ErrorMessage ?? 'its rows'}.`);
        }
        if (contacts.Results.length > 0 && OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE)) {
            return 'Applicant';
        }
        if (memberships.Results.length > 0 && OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE)) {
            return 'Staff';
        }
        return null;
    }

    /** Two caller-owned rows read in one RunViews batch as `user`; refuses as not found if either does not load. */
    private static async ownedPair<A extends BaseEntity, B extends BaseEntity>(
        first: RunViewParams,
        second: RunViewParams,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<[A, B]> {
        const results = await RunView.FromMetadataProvider(provider).RunViews<A | B>([first, second], user);
        if (!results[0]?.Success || !results[1]?.Success) {
            LogError(
                `SubjectAccess: reading ${first.EntityName}/${second.EntityName} as ${user?.Email ?? 'no user'} failed: ${results[0]?.ErrorMessage ?? results[1]?.ErrorMessage}`,
            );
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        const rowA = results[0].Results?.[0] as A | undefined;
        const rowB = results[1].Results?.[0] as B | undefined;
        if (rowA == null || rowB == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        return [rowA, rowB];
    }

    /** One row of `entityName` by `id`, read as `user`; refuses as not found when it does not load. */
    private static async ownedByID<T extends BaseEntity>(entityName: string, id: string, provider: IMetadataProvider, user: UserInfo): Promise<T> {
        if (id == null || !IsValidUUID(id)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        const rows = await SubjectAccess.readRows<T>(SubjectAccess.byID(entityName, id), provider, user);
        const row = rows[0];
        if (row == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        return row;
    }

    /**
     * Rows the system user reads by the IDs an admitted row carries, one per parameter set, in one
     * RunViews call. A missing row is refused as not found, like a row the caller cannot read.
     */
    private static async systemRows<T extends BaseEntity>(params: RunViewParams[], provider: IMetadataProvider, system: UserInfo): Promise<T[]> {
        const results = await RunView.FromMetadataProvider(provider).RunViews<T>(params, system);
        return results.map((result, i) => {
            if (!result.Success) {
                LogError(`SubjectAccess: reading ${params[i].EntityName} as the system user failed: ${result.ErrorMessage}`);
                OperationSupport.Refuse(NOT_FOUND_REASON);
            }
            const row = result.Results[0];
            if (row == null) {
                OperationSupport.Refuse(NOT_FOUND_REASON);
            }
            return row;
        });
    }

    /** The rows a read returns; a read that fails is logged and reads as no rows (the caller refuses). */
    private static async readRows<T>(params: RunViewParams, provider: IMetadataProvider, user: UserInfo): Promise<T[]> {
        const result = await RunView.FromMetadataProvider(provider).RunView<T>(params, user);
        if (!result.Success) {
            LogError(`SubjectAccess: reading ${params.EntityName} as ${user?.Email ?? 'no user'} failed: ${result.ErrorMessage}`);
            return [];
        }
        return result.Results ?? [];
    }

    /** Parameters reading one whole row of `entityName` by a validated ID, as entity objects. */
    private static byID(entityName: string, id: string): RunViewParams {
        const filter = IsValidUUID(id) ? `ID = '${id}'` : '1 = 0';
        return { EntityName: entityName, ExtraFilter: filter, ResultType: 'entity_object', MaxRows: 1, SkipTotalRowCount: true };
    }
}
