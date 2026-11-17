import { describe, expect, it } from 'vitest';
import { AreaNav, AreaNavItem, CredentialingRole, Standing } from '../area-nav';

const ORG_A = { ID: 'A1111111-1111-1111-1111-111111111111', Name: 'Organization A' };

function standing(roleNames: string[], staffOrganizations: { ID: string; Name: string }[] = [], organizationCount: number | null = null): Standing {
    return { RoleNames: roleNames, StaffOrganizations: staffOrganizations, OrganizationCount: organizationCount };
}

function labels(items: AreaNavItem[]): string[] {
    return items.map((i) => i.Label);
}

function defaults(items: AreaNavItem[]): AreaNavItem[] {
    return items.filter((i) => i.IsDefault);
}

describe('AreaNav', () => {
    it('staff with a membership get Program Studio as the default item, state Ready', () => {
        const s = standing([CredentialingRole.Staff], [ORG_A]);
        const items = AreaNav.ItemsFor(s);
        expect(items).toEqual([
            { Area: 'Staff', Label: 'Program Studio', Icon: expect.any(String), DriverClass: 'CredentialingProgramStudioResource', IsDefault: true },
        ]);
        expect(AreaNav.StaffState(s)).toBe('Ready');
        expect(AreaNav.AreasFor(s)).toEqual(['Staff']);
    });

    it('an admin on a database with no organization gets Set up organization as the default, state FirstRunSetup', () => {
        const s = standing([CredentialingRole.Admin], [], 0);
        const items = AreaNav.ItemsFor(s);
        expect(items).toEqual([
            { Area: 'Staff', Label: 'Set up organization', Icon: expect.any(String), DriverClass: 'CredentialingOrganizationSetupResource', IsDefault: true },
        ]);
        expect(AreaNav.StaffState(s)).toBe('FirstRunSetup');
    });

    it('an admin with one organization gets New organization, default because it is the only item', () => {
        const s = standing([CredentialingRole.Admin], [], 1);
        const items = AreaNav.ItemsFor(s);
        expect(items).toEqual([
            { Area: 'Staff', Label: 'New organization', Icon: expect.any(String), DriverClass: 'CredentialingOrganizationSetupResource', IsDefault: true },
        ]);
        expect(AreaNav.StaffState(s)).toBe('Ready');
    });

    it('New organization is not the default when the admin has another item', () => {
        const s = standing([CredentialingRole.Admin, CredentialingRole.Staff], [ORG_A], 3);
        const items = AreaNav.ItemsFor(s);
        expect(labels(items)).toEqual(['Program Studio', 'New organization']);
        expect(labels(defaults(items))).toEqual(['Program Studio']);
    });

    it('staff with no membership still get Program Studio, state NoMembership', () => {
        const s = standing([CredentialingRole.Staff], []);
        expect(labels(AreaNav.ItemsFor(s))).toEqual(['Program Studio']);
        expect(AreaNav.StaffState(s)).toBe('NoMembership');
    });

    it.each([CredentialingRole.Reviewer, CredentialingRole.Committee])('%s gets the Review item Assignments', (role) => {
        const s = standing([role]);
        expect(AreaNav.ItemsFor(s)).toEqual([
            { Area: 'Review', Label: 'Assignments', Icon: expect.any(String), DriverClass: 'CredentialingReviewHomeResource', IsDefault: true },
        ]);
        expect(AreaNav.AreasFor(s)).toEqual(['Review']);
    });

    it('a reviewer who is also on a committee gets one Review item', () => {
        expect(labels(AreaNav.ItemsFor(standing([CredentialingRole.Reviewer, CredentialingRole.Committee])))).toEqual(['Assignments']);
    });

    it('an applicant gets only My Applications', () => {
        const s = standing([CredentialingRole.Applicant], [], null);
        expect(AreaNav.ItemsFor(s)).toEqual([
            { Area: 'Applicant', Label: 'My Applications', Icon: expect.any(String), DriverClass: 'CredentialingApplicantHomeResource', IsDefault: true },
        ]);
        expect(AreaNav.AreasFor(s)).toEqual(['Applicant']);
    });

    it('a user holding none of the five roles gets no items', () => {
        const s = standing(['UI', 'Developer']);
        expect(AreaNav.ItemsFor(s)).toEqual([]);
        expect(AreaNav.AreasFor(s)).toEqual([]);
    });

    it('a user holding Staff and Applicant gets both areas with exactly one default item', () => {
        const s = standing([CredentialingRole.Applicant, CredentialingRole.Staff], [ORG_A]);
        const items = AreaNav.ItemsFor(s);
        expect(AreaNav.AreasFor(s)).toEqual(['Staff', 'Applicant']);
        expect(defaults(items)).toHaveLength(1);
        expect(defaults(items)[0].Label).toBe('Program Studio');
    });

    it('first-run setup outranks Program Studio as the default for an admin who is also staff', () => {
        const s = standing([CredentialingRole.Staff, CredentialingRole.Admin], [], 0);
        const items = AreaNav.ItemsFor(s);
        expect(labels(items)).toEqual(['Program Studio', 'Set up organization']);
        expect(labels(defaults(items))).toEqual(['Set up organization']);
        expect(AreaNav.StaffState(s)).toBe('FirstRunSetup');
    });

    it('every combination of the five roles yields exactly one default item, or none when there are no items', () => {
        const roles = Object.values(CredentialingRole);
        for (let mask = 0; mask < 1 << roles.length; mask++) {
            const held = roles.filter((_r, i) => (mask & (1 << i)) !== 0);
            for (const count of [0, 2]) {
                const items = AreaNav.ItemsFor(standing(held, [ORG_A], held.includes(CredentialingRole.Admin) ? count : null));
                expect(defaults(items)).toHaveLength(items.length === 0 ? 0 : 1);
            }
        }
    });
});
