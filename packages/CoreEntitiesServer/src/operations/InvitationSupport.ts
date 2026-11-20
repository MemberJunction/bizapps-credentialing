import { LogError, RunView, type IMetadataProvider, type RunViewParams, type UserInfo } from '@memberjunction/core';
import type { MJUserApplicationEntity, MJUserRoleEntity } from '@memberjunction/core-entities';
import { UserCache } from '@memberjunction/generic-database-provider';
import { EscapeSQLString } from '@memberjunction/global';
import {
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_COMMITTEE_ROLE,
    CREDENTIALING_REVIEWER_ROLE,
    INVITATION_FAILED_NOTE,
    MAGIC_LINK_BASELINE_ROLE,
    type InviteApplicantOutput,
    type ReissueInvitationOutput,
} from '@mj-biz-apps/credentialing-core';
import { CredentialingServices } from '../services/CredentialingServices.js';
import { OperationSupport } from './OperationSupport.js';

export const USERS_ENTITY = 'MJ: Users';
export const ROLES_ENTITY = 'MJ: Roles';
export const APPLICATIONS_ENTITY = 'MJ: Applications';
export const USER_ROLES_ENTITY = 'MJ: User Roles';
export const USER_APPLICATIONS_ENTITY = 'MJ: User Applications';
export const COMMON_PEOPLE_ENTITY = 'MJ_BizApps_Common: People';
export const COMMON_ORGANIZATIONS_ENTITY = 'MJ_BizApps_Common: Organizations';
export const CREDENTIALING_APPLICATION_NAME = 'Credentialing';

export const INTERNAL_ACCOUNT_REASON = 'This email belongs to an internal account and cannot be invited as an applicant.';
export const INVITATION_LINK_FAILED_NOTE = INVITATION_FAILED_NOTE;

const ALLOWED_EXTERNAL_ROLES: ReadonlySet<string> = new Set(
    [CREDENTIALING_APPLICANT_ROLE, CREDENTIALING_REVIEWER_ROLE, CREDENTIALING_COMMITTEE_ROLE, MAGIC_LINK_BASELINE_ROLE].map((r) =>
        r.trim().toLowerCase(),
    ),
);

/** An ID-only row. */
export interface IDRow {
    ID: string;
}

/** A user row read as the system user. */
export interface UserAccountRow {
    ID: string;
    Email: string;
    Type: string;
}

/** A role name row from `MJ: User Roles`. */
interface UserRoleRow {
    Role: string;
}

/** Shared helpers for `InviteApplicantServerOperation` and `ReissueInvitationServerOperation`. */
export class InvitationSupport {
    /**
     * Throws {@link INTERNAL_ACCOUNT_REASON} when `userRow` is an Owner or holds any role outside the
     * three credentialing external roles and `Magic Link Baseline`.
     */
    public static async AssertExternalAccount(userRow: UserAccountRow, provider: IMetadataProvider, system: UserInfo): Promise<void> {
        if ((userRow.Type ?? '').trim().toLowerCase() === 'owner') {
            OperationSupport.Refuse(INTERNAL_ACCOUNT_REASON);
        }
        const res = await RunView.FromMetadataProvider(provider).RunView<UserRoleRow>(
            { EntityName: USER_ROLES_ENTITY, ExtraFilter: `UserID = '${EscapeSQLString(userRow.ID)}'`, Fields: ['Role'], ResultType: 'simple' },
            system,
        );
        if (!res.Success) {
            throw new Error(`Checking existing user roles failed: ${res.ErrorMessage ?? 'unknown error'}`);
        }
        const hasInternalRole = (res.Results ?? []).some((r) => !ALLOWED_EXTERNAL_ROLES.has((r.Role ?? '').trim().toLowerCase()));
        if (hasInternalRole) {
            OperationSupport.Refuse(INTERNAL_ACCOUNT_REASON);
        }
    }

    /** Ensures `userID` holds `Credentialing Applicant` and a `Credentialing` application row, as `system`. */
    public static async EnsureApplicantGrants(userID: string, provider: IMetadataProvider, system: UserInfo): Promise<void> {
        const [roles, apps] = await InvitationSupport.read<IDRow>(
            [
                { EntityName: ROLES_ENTITY, ExtraFilter: `Name = '${EscapeSQLString(CREDENTIALING_APPLICANT_ROLE)}'`, Fields: ['ID'], ResultType: 'simple' },
                { EntityName: APPLICATIONS_ENTITY, ExtraFilter: `Name = '${EscapeSQLString(CREDENTIALING_APPLICATION_NAME)}'`, Fields: ['ID'], ResultType: 'simple' },
            ],
            provider,
            system,
            'invitation grant targets',
        );
        if (roles.length !== 1 || apps.length !== 1) {
            throw new Error(
                `Inviting an applicant needs the ${CREDENTIALING_APPLICANT_ROLE} role and the ${CREDENTIALING_APPLICATION_NAME} application.`,
            );
        }
        const roleID = roles[0].ID;
        const appID = apps[0].ID;
        const [existingRoles, existingApps] = await InvitationSupport.read<IDRow>(
            [
                { EntityName: USER_ROLES_ENTITY, ExtraFilter: `UserID = '${userID}' AND RoleID = '${roleID}'`, Fields: ['ID'], ResultType: 'simple' },
                {
                    EntityName: USER_APPLICATIONS_ENTITY,
                    ExtraFilter: `UserID = '${userID}' AND ApplicationID = '${appID}'`,
                    Fields: ['ID'],
                    ResultType: 'simple',
                },
            ],
            provider,
            system,
            'existing applicant grants',
        );
        if (existingRoles.length === 0) {
            const grant = await OperationSupport.NewRecord<MJUserRoleEntity>(provider, USER_ROLES_ENTITY, system);
            grant.UserID = userID;
            grant.RoleID = roleID;
            await OperationSupport.Save(grant);
        }
        if (existingApps.length === 0) {
            const appGrant = await OperationSupport.NewRecord<MJUserApplicationEntity>(provider, USER_APPLICATIONS_ENTITY, system);
            appGrant.UserID = userID;
            appGrant.ApplicationID = appID;
            appGrant.IsActive = true;
            await OperationSupport.Save(appGrant);
        }
    }

    /** Refreshes the server-wide user cache after commit so new users and grants are immediately visible. */
    public static async RefreshUserCache(): Promise<void> {
        try {
            await UserCache.Instance.RefreshNow();
        } catch (err: unknown) {
            LogError(`Invitation committed, but refreshing the user cache failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    /**
     * Issues a magic-link sign-in URL after commit. If issuing throws, the invitation stays committed
     * and the caller receives {@link INVITATION_LINK_FAILED_NOTE}.
     */
    public static async IssueLinkAfterCommit(email: string): Promise<ReissueInvitationOutput> {
        try {
            const issued = await CredentialingServices.Invitations.IssueApplicantLink(email);
            return {
                EmailSent: issued.EmailSent,
                InvitationUrl: issued.InvitationUrl,
                ExpiresAt: issued.ExpiresAt.toISOString(),
                InvitationNote: null,
            };
        } catch (err: unknown) {
            LogError(`Invitation committed for ${email}, but issuing the link failed: ${err instanceof Error ? err.message : String(err)}`);
            return {
                EmailSent: false,
                InvitationUrl: null,
                ExpiresAt: null,
                InvitationNote: INVITATION_LINK_FAILED_NOTE,
            };
        }
    }

    /** Runs `params` in one RunViews call; throws on any failed view. */
    public static async Read<T>(params: RunViewParams[], provider: IMetadataProvider, user: UserInfo, label: string): Promise<T[][]> {
        return InvitationSupport.read<T>(params, provider, user, label);
    }

    private static async read<T>(params: RunViewParams[], provider: IMetadataProvider, user: UserInfo, label: string): Promise<T[][]> {
        const results = await RunView.FromMetadataProvider(provider).RunViews<T>(params, user);
        const failed = results.find((r) => !r.Success);
        if (failed != null) {
            throw new Error(`Reading ${label} failed: ${failed.ErrorMessage ?? 'unknown error'}`);
        }
        return results.map((r) => r.Results);
    }
}

export type { InviteApplicantOutput };
