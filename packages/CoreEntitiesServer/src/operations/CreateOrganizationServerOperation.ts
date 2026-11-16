/**
 * Server body of `Credentialing.CreateOrganization` (FRD FR-1.2, reduced to what B1 needs): an
 * accrediting organization and its first staff member, in one transaction.
 *
 * ACTS AS THE SYSTEM USER. The writes land in three places the calling admin has, and should have, no
 * permission on: BizApps Common's `Organization`, `MJ: User Roles` and `MJ: User Applications`. So
 * once {@link Authorize} has established that the caller holds `Credentialing Admin`, every read and
 * write of the body runs as the system user. This is the only place in the app's product code that
 * does; `docs/isolation-read-paths.md` lists it.
 *
 * Idempotent by construction: every row is found before it is created, under an application lock on
 * the organization's name, so a second call with the same input — even one running at the same
 * moment — finds every row, creates none and returns the same IDs.
 */
import {
    BaseRemotableOperation,
    LogError,
    RunView,
    type IMetadataProvider,
    type RunViewParams,
    type UserInfo,
} from '@memberjunction/core';
import type { MJUserApplicationEntity, MJUserRoleEntity } from '@memberjunction/core-entities';
import { UserCache } from '@memberjunction/generic-database-provider';
import { EscapeSQLString, RegisterClass } from '@memberjunction/global';
import type { mjBizAppsCommonOrganizationEntity } from '@mj-biz-apps/common-entities';
import {
    CREDENTIALING_ADMIN_ROLE,
    CREDENTIALING_STAFF_ROLE,
    CreateOrganizationOperation,
    CredentialingEntity,
    CredentialingOperation,
    type CreateOrganizationInput,
    type CreateOrganizationOutput,
} from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingAccreditingOrganizationEntity,
    mjBizAppsCredentialingOrganizationMembershipEntity,
} from '@mj-biz-apps/credentialing-entities';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationSupport } from './OperationSupport.js';

const USERS_ENTITY = 'MJ: Users';
const ROLES_ENTITY = 'MJ: Roles';
const APPLICATIONS_ENTITY = 'MJ: Applications';
const USER_ROLES_ENTITY = 'MJ: User Roles';
const USER_APPLICATIONS_ENTITY = 'MJ: User Applications';
const COMMON_ORGANIZATIONS_ENTITY = 'MJ_BizApps_Common: Organizations';
/** The application organization setup gives the first staff member. */
const CREDENTIALING_APPLICATION_NAME = 'Credentialing';

/** The refusal given for a name that is empty once trimmed. */
export const ORGANIZATION_NAME_REQUIRED_REASON = "Enter the organization's name.";

/** The refusal given for a blank staff email. */
export const STAFF_EMAIL_REQUIRED_REASON = "Enter the first staff member's email address.";

/** The refusal given when no user has the staff email. */
export function NoUserWithEmailReason(email: string): string {
    return `No user has the email address ${email}. Create the user first, then set up the organization.`;
}

/** An ID-only row. */
interface IDRow {
    ID: string;
}

/** An accrediting organization found by name. */
interface AccreditingRow {
    ID: string;
    OrganizationID: string;
}

/** The rows organization setup needs before it writes, read as the system user. */
interface SetupContext {
    StaffUserID: string;
    StaffRoleID: string;
    ApplicationID: string;
    Existing: AccreditingRow | null;
}

@RegisterClass(BaseRemotableOperation, CredentialingOperation.CreateOrganization)
export class CreateOrganizationServerOperation extends CreateOrganizationOperation {
    /** Name trimmed, with every run of inner whitespace collapsed to one space. */
    public static NormalizeName(name: string | null | undefined): string {
        return (name ?? '').trim().replace(/\s+/g, ' ');
    }

    protected override async Authorize(_input: CreateOrganizationInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_ADMIN_ROLE);
    }

    protected override async InternalExecute(input: CreateOrganizationInput, provider: IMetadataProvider): Promise<CreateOrganizationOutput> {
        const name = CreateOrganizationServerOperation.NormalizeName(input.Name);
        if (name.length === 0) {
            OperationSupport.Refuse(ORGANIZATION_NAME_REQUIRED_REASON);
        }
        const email = (input.FirstStaffEmail ?? '').trim();
        if (email.length === 0) {
            OperationSupport.Refuse(STAFF_EMAIL_REQUIRED_REASON);
        }
        const system = this.systemUser();
        const output = await OperationSupport.InTransaction(provider, async () => {
            await AuthoringLock.ForOrganizationName(name, provider, system);
            const context = await this.loadContext(name, email, provider, system);
            const accreditingID = context.Existing?.ID ?? (await this.createOrganization(name, provider, system));
            const membershipID = await this.ensureGrants(accreditingID, context, provider, system);
            return { AccreditingOrganizationID: accreditingID, MembershipID: membershipID, StaffUserID: context.StaffUserID };
        });
        await this.refreshUserCache();
        return output;
    }

    /** The system user from the server's user cache; organization setup cannot run without it. */
    private systemUser(): UserInfo {
        const system = UserCache.Instance.GetSystemUser();
        if (system == null) {
            throw new Error('Organization setup needs the system user, and the server user cache does not hold it.');
        }
        return system;
    }

    /** The staff user, the Credentialing Staff role, the Credentialing application and any accrediting organization of this name, in one RunViews call. */
    private async loadContext(name: string, email: string, provider: IMetadataProvider, system: UserInfo): Promise<SetupContext> {
        const params: RunViewParams[] = [
            { EntityName: USERS_ENTITY, ExtraFilter: `LOWER(Email) = LOWER('${EscapeSQLString(email)}')`, Fields: ['ID'], ResultType: 'simple' },
            { EntityName: ROLES_ENTITY, ExtraFilter: `Name = '${EscapeSQLString(CREDENTIALING_STAFF_ROLE)}'`, Fields: ['ID'], ResultType: 'simple' },
            { EntityName: APPLICATIONS_ENTITY, ExtraFilter: `Name = '${EscapeSQLString(CREDENTIALING_APPLICATION_NAME)}'`, Fields: ['ID'], ResultType: 'simple' },
            {
                EntityName: CredentialingEntity.AccreditingOrganization,
                ExtraFilter: `Name = '${EscapeSQLString(name)}'`,
                Fields: ['ID', 'OrganizationID'],
                ResultType: 'simple',
            },
        ];
        const [users, roles, applications, accrediting] = await this.read<IDRow | AccreditingRow>(params, provider, system);
        if (users.length !== 1) {
            OperationSupport.Refuse(NoUserWithEmailReason(email));
        }
        if (roles.length !== 1 || applications.length !== 1) {
            throw new Error(`Organization setup needs the ${CREDENTIALING_STAFF_ROLE} role and the ${CREDENTIALING_APPLICATION_NAME} application, and this instance is missing one.`);
        }
        return {
            StaffUserID: users[0].ID,
            StaffRoleID: roles[0].ID,
            ApplicationID: applications[0].ID,
            Existing: (accrediting[0] as AccreditingRow | undefined) ?? null,
        };
    }

    /**
     * A NEW BizApps Common organization with this name, and the accrediting organization standing for
     * it. A Common organization is never looked up by name: Common has no unique name, so a name match
     * could attach the accrediting body to someone else's organization record.
     */
    private async createOrganization(name: string, provider: IMetadataProvider, system: UserInfo): Promise<string> {
        const common = await OperationSupport.NewRecord<mjBizAppsCommonOrganizationEntity>(provider, COMMON_ORGANIZATIONS_ENTITY, system);
        common.Name = name;
        await OperationSupport.Save(common);
        const accrediting = await OperationSupport.NewRecord<mjBizAppsCredentialingAccreditingOrganizationEntity>(
            provider,
            CredentialingEntity.AccreditingOrganization,
            system,
        );
        accrediting.Name = name;
        accrediting.OrganizationID = common.ID;
        await OperationSupport.Save(accrediting);
        return accrediting.ID;
    }

    /** Finds or creates the membership, the staff role grant and the application grant. Returns the membership's ID. */
    private async ensureGrants(accreditingID: string, context: SetupContext, provider: IMetadataProvider, system: UserInfo): Promise<string> {
        const user = `UserID = '${context.StaffUserID}'`;
        const [memberships, userRoles, userApplications] = await this.read<IDRow>(
            [
                { EntityName: CredentialingEntity.OrganizationMembership, ExtraFilter: `AccreditingOrganizationID = '${accreditingID}' AND ${user}`, Fields: ['ID'], ResultType: 'simple' },
                { EntityName: USER_ROLES_ENTITY, ExtraFilter: `${user} AND RoleID = '${context.StaffRoleID}'`, Fields: ['ID'], ResultType: 'simple' },
                { EntityName: USER_APPLICATIONS_ENTITY, ExtraFilter: `${user} AND ApplicationID = '${context.ApplicationID}'`, Fields: ['ID'], ResultType: 'simple' },
            ],
            provider,
            system,
        );
        const membershipID = memberships[0]?.ID ?? (await this.createMembership(accreditingID, context.StaffUserID, provider, system));
        if (userRoles.length === 0) {
            const grant = await OperationSupport.NewRecord<MJUserRoleEntity>(provider, USER_ROLES_ENTITY, system);
            grant.UserID = context.StaffUserID;
            grant.RoleID = context.StaffRoleID;
            await OperationSupport.Save(grant);
        }
        if (userApplications.length === 0) {
            const grant = await OperationSupport.NewRecord<MJUserApplicationEntity>(provider, USER_APPLICATIONS_ENTITY, system);
            grant.UserID = context.StaffUserID;
            grant.ApplicationID = context.ApplicationID;
            grant.IsActive = true;
            await OperationSupport.Save(grant);
        }
        return membershipID;
    }

    private async createMembership(accreditingID: string, userID: string, provider: IMetadataProvider, system: UserInfo): Promise<string> {
        const membership = await OperationSupport.NewRecord<mjBizAppsCredentialingOrganizationMembershipEntity>(
            provider,
            CredentialingEntity.OrganizationMembership,
            system,
        );
        membership.AccreditingOrganizationID = accreditingID;
        membership.UserID = userID;
        await OperationSupport.Save(membership);
        return membership.ID;
    }

    /** Runs `params` in one RunViews call; a failed read aborts the setup. */
    private async read<T>(params: RunViewParams[], provider: IMetadataProvider, system: UserInfo): Promise<T[][]> {
        const results = await RunView.FromMetadataProvider(provider).RunViews<T>(params, system);
        const failed = results.find((r) => !r.Success);
        if (failed != null) {
            throw new Error(`Organization setup could not read ${failed.ErrorMessage ?? 'its rows'}.`);
        }
        return results.map((r) => r.Results);
    }

    /**
     * Reloads this server's user cache after the commit, so the staff member's next request carries the
     * new role. `RefreshNow()` reloads through the provider the cache was set up with (the process-wide
     * one); `Refresh(provider)` would rebind the cache to this request's provider for every later
     * self-refresh. Other MJAPI processes pick the grant up on their own refresh or restart. A failure
     * here does not undo the committed setup; it is logged.
     */
    private async refreshUserCache(): Promise<void> {
        try {
            await UserCache.Instance.RefreshNow();
        } catch (err: unknown) {
            LogError(`Organization setup committed, but refreshing the user cache failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}
