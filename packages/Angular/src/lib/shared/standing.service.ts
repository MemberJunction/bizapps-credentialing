/**
 * Loads the signed-in user's {@link Standing} — what navigation and the Staff area need to know —
 * with as few reads as the user's roles allow, and caches it for the session.
 *
 * The role names come from the user object (no query). Only the two internal roles cause a read:
 * Credentialing Staff reads the accrediting organizations it can see (the row filter returns exactly
 * the user's own), Credentialing Admin counts them; both together go in ONE RunViews call. A user
 * holding neither causes no query at all — the external roles have no permission on these entities,
 * and a refused read on every navigation build would be noise and a wasted round trip.
 */
import { RunView, type IMetadataProvider, type RunViewParams, type RunViewResult } from '@memberjunction/core';
import { BaseSingleton, EscapeSQLString } from '@memberjunction/global';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { CredentialingRole, type Standing, type StaffOrganization } from '../application/area-nav';

/** The parts of the signed-in user the standing reads. `UserInfo` satisfies it. */
export interface StandingUser {
    ID: string;
    UserRoles: readonly { Role: string }[];
}

/** Where the standing comes from: the signed-in user and a way to run views as them. */
export interface StandingDataSource {
    readonly CurrentUser: StandingUser | null;
    RunViews<T>(params: RunViewParams[]): Promise<RunViewResult<T>[]>;
}

/** The session-wide cache of standings, by user ID. A singleton so every caller shares one load. */
class StandingCache extends BaseSingleton<StandingCache> {
    public readonly ByUser = new Map<string, Promise<Standing>>();

    protected constructor() {
        super();
    }

    public static get Instance(): StandingCache {
        return super.getInstance<StandingCache>();
    }
}

const MEMBERSHIP_VIEW = '[__mj_BizAppsCredentialing].[vwOrganizationMemberships]';

export class StandingService {
    constructor(private readonly source: StandingDataSource) {}

    /** A service reading through `provider` (a component's `ProviderToUse`, an application's `Provider`). */
    public static ForProvider(provider: IMetadataProvider): StandingService {
        const runView = RunView.FromMetadataProvider(provider);
        return new StandingService({
            get CurrentUser(): StandingUser | null {
                return provider.CurrentUser ?? null;
            },
            RunViews<T>(params: RunViewParams[]): Promise<RunViewResult<T>[]> {
                return runView.RunViews<T>(params);
            },
        });
    }

    /** Forgets every cached standing (sign-out, tests). */
    public static ClearCache(): void {
        StandingCache.Instance.ByUser.clear();
    }

    /** The signed-in user's standing, loaded once per session. Rejects when a read fails; a failure is not cached. */
    public Load(): Promise<Standing> {
        const key = this.userKey();
        const cache = StandingCache.Instance.ByUser;
        const cached = cache.get(key);
        if (cached) {
            return cached;
        }
        const loading = this.read();
        cache.set(key, loading);
        loading.catch(() => {
            if (cache.get(key) === loading) {
                cache.delete(key);
            }
        });
        return loading;
    }

    /** Drops the cached standing and loads it again (after an organization is created). */
    public Reload(): Promise<Standing> {
        StandingCache.Instance.ByUser.delete(this.userKey());
        return this.Load();
    }

    private userKey(): string {
        return (this.source.CurrentUser?.ID ?? '').toLowerCase();
    }

    private async read(): Promise<Standing> {
        const user = this.source.CurrentUser;
        const roleNames = (user?.UserRoles ?? []).map((r) => r.Role);
        const isStaff = StandingService.holds(roleNames, CredentialingRole.Staff);
        const isAdmin = StandingService.holds(roleNames, CredentialingRole.Admin);
        const params = StandingService.viewsFor(user, isStaff, isAdmin);
        if (params.length === 0) {
            return { RoleNames: roleNames, StaffOrganizations: [], OrganizationCount: null };
        }
        const results = await this.source.RunViews<StaffOrganization>(params);
        const failed = results.find((r) => !r.Success);
        if (failed) {
            throw new Error(failed.ErrorMessage || 'Your Credentialing standing could not be loaded.');
        }
        const organizations = isStaff ? results[0].Results.map((r) => ({ ID: r.ID, Name: r.Name })) : [];
        const countResult = isAdmin ? results[isStaff ? 1 : 0] : null;
        return { RoleNames: roleNames, StaffOrganizations: organizations, OrganizationCount: countResult ? (countResult.TotalRowCount ?? 0) : null };
    }

    /** The views the roles call for: the staff member's organizations first, then the admin's count. */
    private static viewsFor(user: StandingUser | null, isStaff: boolean, isAdmin: boolean): RunViewParams[] {
        const params: RunViewParams[] = [];
        if (isStaff && user) {
            params.push({
                EntityName: CredentialingEntity.AccreditingOrganization,
                Fields: ['ID', 'Name'],
                OrderBy: 'Name',
                ResultType: 'simple',
                // An admin's unfiltered read exempts the user from the staff row filter, so a user holding
                // both roles names their memberships explicitly; for staff alone the row filter already does.
                ExtraFilter: isAdmin ? `ID IN (SELECT m.AccreditingOrganizationID FROM ${MEMBERSHIP_VIEW} m WHERE m.UserID = '${EscapeSQLString(user.ID)}')` : undefined,
            });
        }
        if (isAdmin) {
            params.push({ EntityName: CredentialingEntity.AccreditingOrganization, ResultType: 'count_only' });
        }
        return params;
    }

    private static holds(roleNames: readonly string[], role: string): boolean {
        const wanted = role.trim().toLowerCase();
        return roleNames.some((r) => r.trim().toLowerCase() === wanted);
    }
}
