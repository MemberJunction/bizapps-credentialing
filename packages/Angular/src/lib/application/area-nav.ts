/**
 * Which areas of Credentialing a user sees, and which item opens first — decided from the user's
 * roles and what those roles let them read (their {@link Standing}). Pure: no Angular, no data access,
 * so every combination of roles is unit-tested.
 */
import { CREDENTIALING_ADMIN_ROLE, CREDENTIALING_STAFF_ROLE } from '@mj-biz-apps/credentialing-core';

/** The five Credentialing roles, by the names their `MJ: Roles` rows carry. */
export const CredentialingRole = {
    Staff: CREDENTIALING_STAFF_ROLE,
    Admin: CREDENTIALING_ADMIN_ROLE,
    Reviewer: 'Credentialing Reviewer',
    Committee: 'Credentialing Committee',
    Applicant: 'Credentialing Applicant',
} as const;

/** An area of the application: who it serves, not what it shows. */
export type CredentialingArea = 'Applicant' | 'Review' | 'Staff';

/** An accrediting organization the signed-in staff member belongs to. */
export interface StaffOrganization {
    ID: string;
    Name: string;
}

/** What navigation needs to know about the signed-in user. */
export interface Standing {
    /** The user's role names, as on the user object. */
    RoleNames: readonly string[];
    /** The accrediting organizations the user is a staff member of; empty unless the user holds Credentialing Staff. */
    StaffOrganizations: readonly StaffOrganization[];
    /** How many accrediting organizations exist; null unless the user holds Credentialing Admin. */
    OrganizationCount: number | null;
}

/** One navigation item of the application. */
export interface AreaNavItem {
    Area: CredentialingArea;
    Label: string;
    Icon: string;
    /** The `BaseResourceComponent` registration the item opens. */
    DriverClass: string;
    IsDefault: boolean;
}

/** What the Staff area shows: its normal screens, the first-run setup, or why there is nothing to show. */
export type StaffState = 'Ready' | 'FirstRunSetup' | 'NoMembership';

/** The registration names of the application's resource components. */
export const CredentialingResource = {
    ProgramStudio: 'CredentialingProgramStudioResource',
    OrganizationSetup: 'CredentialingOrganizationSetupResource',
    ReviewHome: 'CredentialingReviewHomeResource',
    ApplicantHome: 'CredentialingApplicantHomeResource',
} as const;

/** An item before the default is chosen, with its rank as a default (lower wins). */
interface RankedItem {
    Item: Omit<AreaNavItem, 'IsDefault'>;
    DefaultRank: number;
}

const PROGRAM_STUDIO: RankedItem['Item'] = { Area: 'Staff', Label: 'Program Studio', Icon: 'fa-solid fa-diagram-project', DriverClass: CredentialingResource.ProgramStudio };
const SET_UP_ORGANIZATION: RankedItem['Item'] = { Area: 'Staff', Label: 'Set up organization', Icon: 'fa-solid fa-building-circle-check', DriverClass: CredentialingResource.OrganizationSetup };
const NEW_ORGANIZATION: RankedItem['Item'] = { Area: 'Staff', Label: 'New organization', Icon: 'fa-solid fa-building-circle-arrow-right', DriverClass: CredentialingResource.OrganizationSetup };
const ASSIGNMENTS: RankedItem['Item'] = { Area: 'Review', Label: 'Assignments', Icon: 'fa-solid fa-clipboard-check', DriverClass: CredentialingResource.ReviewHome };
const MY_APPLICATIONS: RankedItem['Item'] = { Area: 'Applicant', Label: 'My Applications', Icon: 'fa-solid fa-file-signature', DriverClass: CredentialingResource.ApplicantHome };

/** Default ranks: first-run setup is the one thing an admin must do; New organization opens first only when alone. */
const RANK = { SetUpOrganization: 0, ProgramStudio: 1, Assignments: 2, MyApplications: 3, NewOrganization: 4 } as const;

export class AreaNav {
    /** The areas the user sees, in navigation order, each once. */
    public static AreasFor(standing: Standing): CredentialingArea[] {
        const areas: CredentialingArea[] = [];
        for (const item of AreaNav.ItemsFor(standing)) {
            if (!areas.includes(item.Area)) {
                areas.push(item.Area);
            }
        }
        return areas;
    }

    /** The navigation items, in order, with exactly one default when there is any item. */
    public static ItemsFor(standing: Standing): AreaNavItem[] {
        const ranked = [...AreaNav.staffItems(standing), ...AreaNav.reviewItems(standing), ...AreaNav.applicantItems(standing)];
        if (ranked.length === 0) {
            return [];
        }
        const best = Math.min(...ranked.map((r) => r.DefaultRank));
        const defaultIndex = ranked.findIndex((r) => r.DefaultRank === best);
        return ranked.map((r, i) => ({ ...r.Item, IsDefault: i === defaultIndex }));
    }

    /** What the Staff area shows for this user. */
    public static StaffState(standing: Standing): StaffState {
        if (AreaNav.holds(standing, CredentialingRole.Admin) && standing.OrganizationCount === 0) {
            return 'FirstRunSetup';
        }
        if (AreaNav.holds(standing, CredentialingRole.Staff) && standing.StaffOrganizations.length === 0) {
            return 'NoMembership';
        }
        return 'Ready';
    }

    private static staffItems(standing: Standing): RankedItem[] {
        const items: RankedItem[] = [];
        if (AreaNav.holds(standing, CredentialingRole.Staff)) {
            items.push({ Item: PROGRAM_STUDIO, DefaultRank: RANK.ProgramStudio });
        }
        if (AreaNav.holds(standing, CredentialingRole.Admin)) {
            items.push(
                standing.OrganizationCount === 0
                    ? { Item: SET_UP_ORGANIZATION, DefaultRank: RANK.SetUpOrganization }
                    : { Item: NEW_ORGANIZATION, DefaultRank: RANK.NewOrganization },
            );
        }
        return items;
    }

    private static reviewItems(standing: Standing): RankedItem[] {
        const reviews = AreaNav.holds(standing, CredentialingRole.Reviewer) || AreaNav.holds(standing, CredentialingRole.Committee);
        return reviews ? [{ Item: ASSIGNMENTS, DefaultRank: RANK.Assignments }] : [];
    }

    private static applicantItems(standing: Standing): RankedItem[] {
        return AreaNav.holds(standing, CredentialingRole.Applicant) ? [{ Item: MY_APPLICATIONS, DefaultRank: RANK.MyApplications }] : [];
    }

    private static holds(standing: Standing, role: string): boolean {
        const wanted = role.trim().toLowerCase();
        return standing.RoleNames.some((r) => r.trim().toLowerCase() === wanted);
    }
}
