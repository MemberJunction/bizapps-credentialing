/**
 * Server body of `Credentialing.CreateCommittee`: a BizApps Committees committee owned by the
 * organization of one of the caller's programs, so a version of an organization that has no committee
 * yet can be given its deciding committee from Program Studio.
 *
 * WRITES AS THE SYSTEM USER — the third use of the system user in this app's product code, and the
 * second that writes; `docs/isolation-read-paths.md` ("System-user work") lists all three. Staff
 * have, and should have, no Create permission on `Committees: Committees`: it is another app's entity,
 * and a staff member able to write it freely could create a committee for any organization. So the
 * operation fixes the owning organization itself and the caller only names a program:
 *
 * - the program and its accrediting organization are read AS THE CALLER, through the caller's row
 *   filter, so a program of another organization answers `Record not found.` exactly as a random ID;
 * - only then, as the system user ({@link SystemUser}), it reads whether the committee type exists
 *   (`ID` only) and whether that one organization already has a committee of the name (`ID` only, one
 *   row at most), and saves the one committee row. Nothing the system user read reaches the caller
 *   beyond the fixed sentences of `CommitteeRules`.
 *
 * One transaction, under the accrediting organization's authoring lock (taken first, before any other
 * lock — it is the only lock this body takes), so two simultaneous calls with one name run one after
 * the other and the second is refused with the duplicate-name sentence.
 */
import { BaseRemotableOperation, RunView, type IMetadataProvider, type RunViewParams, type UserInfo } from '@memberjunction/core';
import { EscapeSQLString, IsValidUUID, RegisterClass } from '@memberjunction/global';
import type { mjBizAppsCommitteesCommitteeEntity } from '@mj-biz-apps/committees-entities';
import {
    CREDENTIALING_STAFF_ROLE,
    CommitteeRules,
    CreateCommitteeOperation,
    CredentialingEntity,
    CredentialingOperation,
    NOT_FOUND_REASON,
    type CreateCommitteeInput,
    type CreateCommitteeOutput,
    type RuleResult,
} from '@mj-biz-apps/credentialing-core';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { LockedWrite } from '../guards/LockedWrite.js';
import { ParentVersionLoader } from '../guards/ParentVersionLoader.js';
import { SystemUser } from '../guards/SystemUser.js';
import { OperationSupport } from './OperationSupport.js';

const COMMITTEES_ENTITY = 'Committees: Committees';
const COMMITTEE_TYPES_ENTITY = 'Committees: Types';

/** An ID-only row. */
interface IDRow {
    ID: string;
}

/** The Common organization behind an accrediting organization. */
interface OwnerRow {
    OrganizationID: string;
}

@RegisterClass(BaseRemotableOperation, CredentialingOperation.CreateCommittee)
export class CreateCommitteeServerOperation extends CreateCommitteeOperation {
    protected override async Authorize(_input: CreateCommitteeInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE);
    }

    protected override async InternalExecute(input: CreateCommitteeInput, provider: IMetadataProvider, user: UserInfo): Promise<CreateCommitteeOutput> {
        return OperationSupport.InTransaction(provider, async () => {
            const commonOrganizationID = await this.ownerOfProgram(input.ProgramID, provider, user);
            CreateCommitteeServerOperation.require(CommitteeRules.CheckName(input.Name));
            const name = CommitteeRules.NormalizeName(input.Name);
            const system = SystemUser.Get('Creating a committee');
            await this.checkTypeAndName(input.CommitteeTypeID, name, commonOrganizationID, provider, system);
            const committee = await this.createCommittee(name, input.CommitteeTypeID, commonOrganizationID, provider, system);
            return { CommitteeID: committee.ID, Name: committee.Name };
        });
    }

    /**
     * The Common organization that will own the committee, found from the program AS THE CALLER, with
     * the accrediting organization's authoring lock held from here to the end of the transaction. A
     * program or organization the caller cannot read is refused as not found.
     *
     * The organization is read after its lock is taken, so an organization deleted at the same moment
     * (its delete holds the same lock) is either still there or already not found.
     */
    private async ownerOfProgram(programID: string, provider: IMetadataProvider, user: UserInfo): Promise<string> {
        const program = await ParentVersionLoader.LoadProgram(programID, user, provider);
        if (program == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        await AuthoringLock.ForOrganization(program.AccreditingOrganizationID, provider, user);
        const owners = await RunView.FromMetadataProvider(provider).RunView<OwnerRow>(
            {
                EntityName: CredentialingEntity.AccreditingOrganization,
                ExtraFilter: `ID = '${EscapeSQLString(program.AccreditingOrganizationID)}'`,
                Fields: ['OrganizationID'],
                ResultType: 'simple',
                MaxRows: 1,
            },
            user,
        );
        const owner = owners.Success ? owners.Results[0] : undefined;
        if (owner == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        return owner.OrganizationID;
    }

    /**
     * Refuses a committee type that does not exist and a name the organization already uses. Both are
     * read as the system user in one RunViews call: the type by ID, and at most one committee of that
     * one organization whose trimmed name matches ignoring case.
     */
    private async checkTypeAndName(typeID: string, name: string, commonOrganizationID: string, provider: IMetadataProvider, system: UserInfo): Promise<void> {
        const typeFilter = IsValidUUID(typeID) ? `ID = '${typeID}'` : '1 = 0';
        const sameName = `OrganizationID = '${EscapeSQLString(commonOrganizationID)}' AND LOWER(LTRIM(RTRIM(Name))) = LOWER('${EscapeSQLString(name)}')`;
        const params: RunViewParams[] = [
            { EntityName: COMMITTEE_TYPES_ENTITY, ExtraFilter: typeFilter, Fields: ['ID'], ResultType: 'simple', MaxRows: 1 },
            { EntityName: COMMITTEES_ENTITY, ExtraFilter: sameName, Fields: ['ID'], ResultType: 'simple', MaxRows: 1 },
        ];
        const results = await RunView.FromMetadataProvider(provider).RunViews<IDRow>(params, system);
        const failed = results.find((r) => !r.Success);
        if (failed != null) {
            throw new Error(`Creating a committee could not read ${failed.ErrorMessage ?? 'its rows'}.`);
        }
        const [types, committees] = results;
        CreateCommitteeServerOperation.require(CommitteeRules.CheckType(types.Results.length > 0));
        if (committees.Results.length > 0) {
            OperationSupport.Refuse(CommitteeRules.DuplicateNameReason(name));
        }
    }

    /**
     * Saves the committee as the system user, owned by `commonOrganizationID`.
     *
     * Column values, from BizApps Committees' baseline migration (`Committee` table):
     * - `Status` 'Active' (the column default): the committee is created to decide applications now.
     * - `IsPublic` FALSE, not the column default of 1. In BizApps Committees a public committee is open
     *   to every user of that app, while a private one is locked for anyone who is neither Committees
     *   staff nor a member of it. A committee that decides credentialing applications is created
     *   private; a Committees administrator can open it later.
     * - `Description`, `ParentCommitteeID`, `CharterDocumentURL`, `MissionStatement`, `FormationDate`
     *   and `DissolutionDate` stay NULL: all are optional and nothing here knows them (no formation
     *   date is invented).
     */
    private async createCommittee(
        name: string,
        typeID: string,
        commonOrganizationID: string,
        provider: IMetadataProvider,
        system: UserInfo,
    ): Promise<mjBizAppsCommitteesCommitteeEntity> {
        const committee = await OperationSupport.NewRecord<mjBizAppsCommitteesCommitteeEntity>(provider, COMMITTEES_ENTITY, system);
        committee.Name = name;
        committee.TypeID = typeID;
        committee.OrganizationID = commonOrganizationID;
        committee.Status = 'Active';
        committee.IsPublic = false;
        await OperationSupport.Save(committee);
        return committee;
    }

    /** Refuses the operation with the rule's reason when the rule did not allow it. */
    private static require(rule: RuleResult): void {
        const reason = LockedWrite.ReasonOf(rule);
        if (reason != null) {
            OperationSupport.Refuse(reason);
        }
    }
}
