import { beforeEach, describe, expect, it } from 'vitest';
import type { RunViewParams, RunViewResult } from '@memberjunction/core';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { AreaNav, CredentialingResource, CredentialingRole } from '../../application/area-nav';
import { StandingDataSource, StandingService, StandingUser } from '../standing.service';

const ORG_A = { ID: 'A1111111-1111-1111-1111-111111111111', Name: 'Organization A' };

/** A provider stub that records every RunViews call and answers each view in order. */
class StubSource implements StandingDataSource {
    public readonly Calls: RunViewParams[][] = [];
    constructor(public readonly CurrentUser: StandingUser | null, private readonly answers: RunViewResult<{ ID: string; Name: string }>[] = []) {}

    public async RunViews<T>(params: RunViewParams[]): Promise<RunViewResult<T>[]> {
        this.Calls.push(params);
        return params.map((_p, i) => this.answers[i] as RunViewResult<T>);
    }
}

function user(id: string, roles: string[]): StandingUser {
    return { ID: id, UserRoles: roles.map((r) => ({ Role: r })) };
}

function rows(results: { ID: string; Name: string }[]): RunViewResult<{ ID: string; Name: string }> {
    return { Success: true, Results: results, RowCount: results.length, TotalRowCount: results.length, ExecutionTime: 1, ErrorMessage: '' };
}

function count(total: number): RunViewResult<{ ID: string; Name: string }> {
    return { Success: true, Results: [], RowCount: 0, TotalRowCount: total, ExecutionTime: 1, ErrorMessage: '' };
}

describe('StandingService', () => {
    beforeEach(() => StandingService.ClearCache());

    it('counts subject contacts in one count_only view for a user holding Credentialing Applicant', async () => {
        const source = new StubSource(user('U1', [CredentialingRole.Applicant]), [count(2)]);
        const standing = await new StandingService(source).Load();
        expect(source.Calls).toHaveLength(1);
        expect(source.Calls[0]).toHaveLength(1);
        expect(source.Calls[0][0]).toMatchObject({ EntityName: CredentialingEntity.SubjectContact, ResultType: 'count_only' });
        expect(source.Calls[0][0].ExtraFilter).toContain("UserID = 'U1'");
        expect(standing).toEqual({ RoleNames: [CredentialingRole.Applicant], StaffOrganizations: [], OrganizationCount: null, SubjectCount: 2 });
    });

    it('requests no view for a user holding no credentialing role', async () => {
        const source = new StubSource(user('U2', ['UI']));
        const standing = await new StandingService(source).Load();
        expect(source.Calls).toEqual([]);
        expect(standing.SubjectCount).toBe(0);
    });

    it('makes one RunViews call with one view of the readable organizations for staff', async () => {
        const source = new StubSource(user('U3', [CredentialingRole.Staff]), [rows([ORG_A])]);
        const standing = await new StandingService(source).Load();
        expect(source.Calls).toHaveLength(1);
        expect(source.Calls[0]).toHaveLength(1);
        expect(source.Calls[0][0]).toMatchObject({ EntityName: CredentialingEntity.AccreditingOrganization, Fields: ['ID', 'Name'], ResultType: 'simple' });
        expect(standing).toEqual({ RoleNames: [CredentialingRole.Staff], StaffOrganizations: [ORG_A], OrganizationCount: null, SubjectCount: 0 });
    });

    it('makes one RunViews call with one count view for an admin', async () => {
        const source = new StubSource(user('U4', [CredentialingRole.Admin]), [count(0)]);
        const standing = await new StandingService(source).Load();
        expect(source.Calls).toHaveLength(1);
        expect(source.Calls[0]).toHaveLength(1);
        expect(source.Calls[0][0]).toMatchObject({ EntityName: CredentialingEntity.AccreditingOrganization, ResultType: 'count_only' });
        expect(standing.OrganizationCount).toBe(0);
        expect(standing.StaffOrganizations).toEqual([]);
        expect(standing.SubjectCount).toBe(0);
    });

    it('makes one RunViews call with two views for a user holding both internal roles', async () => {
        const source = new StubSource(user('U5', [CredentialingRole.Staff, CredentialingRole.Admin]), [rows([ORG_A]), count(4)]);
        const standing = await new StandingService(source).Load();
        expect(source.Calls).toHaveLength(1);
        expect(source.Calls[0]).toHaveLength(2);
        // An admin's unfiltered read exempts them from the staff row filter, so their own organizations come from the membership.
        expect(source.Calls[0][0].ExtraFilter).toContain("UserID = 'U5'");
        expect(standing).toEqual({ RoleNames: [CredentialingRole.Staff, CredentialingRole.Admin], StaffOrganizations: [ORG_A], OrganizationCount: 4, SubjectCount: 0 });
    });

    it('caches the standing for the session and reloads it on request', async () => {
        const source = new StubSource(user('U6', [CredentialingRole.Admin]), [count(0)]);
        await new StandingService(source).Load();
        await new StandingService(source).Load();
        expect(source.Calls).toHaveLength(1);
        await new StandingService(source).Reload();
        expect(source.Calls).toHaveLength(2);
    });

    it('after the first organization is created, Reload gives the standing whose nav item is New organization', async () => {
        // The database answers 0 organizations, then 1 once the admin has set one up.
        let total = 0;
        const source: StandingDataSource & { Calls: number } = {
            CurrentUser: user('U8', [CredentialingRole.Admin]),
            Calls: 0,
            async RunViews<T>(params: RunViewParams[]): Promise<RunViewResult<T>[]> {
                this.Calls++;
                return params.map(() => count(total) as RunViewResult<T>);
            },
        };
        const before = await new StandingService(source).Load();
        expect(AreaNav.ItemsFor(before).map((i) => i.Label)).toEqual(['Set up organization']);

        total = 1;
        // Cached: a plain Load still answers from the first read.
        expect((await new StandingService(source).Load()).OrganizationCount).toBe(0);
        const after = await new StandingService(source).Reload();
        expect(after.OrganizationCount).toBe(1);
        expect(AreaNav.ItemsFor(after).map((i) => i.Label)).toEqual(['New organization']);
        // The tab that created it is retargeted to the new item; a later Load sees the reloaded standing.
        expect(AreaNav.RetargetTab('Set up organization', CredentialingResource.OrganizationSetup, after)).toBe('New organization');
        expect((await new StandingService(source).Load()).OrganizationCount).toBe(1);
        expect(source.Calls).toBe(2);
    });

    it('rejects when a view fails, and does not cache the failure', async () => {
        const failed: RunViewResult<{ ID: string; Name: string }> = { ...rows([]), Success: false, ErrorMessage: 'boom' };
        const source = new StubSource(user('U7', [CredentialingRole.Staff]), [failed]);
        await expect(new StandingService(source).Load()).rejects.toThrow('boom');
        await expect(new StandingService(source).Load()).rejects.toThrow('boom');
        expect(source.Calls).toHaveLength(2);
    });

    it('treats a missing current user as holding no role', async () => {
        const source = new StubSource(null);
        const standing = await new StandingService(source).Load();
        expect(source.Calls).toEqual([]);
        expect(standing.RoleNames).toEqual([]);
    });
});
