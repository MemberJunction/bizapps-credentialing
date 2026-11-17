import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORG_ID = 'A0000000-0000-0000-0000-00000000000A';
const LOADED_AT = new Date('2026-11-01T10:00:00.000Z');

const ORGANIZATIONS = 'MJ_BizApps_Credentialing: Accrediting Organizations';
const PROGRAMS = 'MJ_BizApps_Credentialing: Programs';
const MEMBERSHIPS = 'MJ_BizApps_Credentialing: Organization Memberships';

const CALLER = { ID: 'admin-1', Email: 'admin@example.test' };
const SYSTEM = { ID: 'system-1', Email: 'system@example.test' };

const PROGRAMS_SENTENCE = "Remove this organization's programs before deleting it.";
const MEMBERS_SENTENCE = "Remove this organization's members before deleting it.";
const STALE_SENTENCE = 'This record was changed by someone else. Reload it and try again.';

/** What the fake database holds; reads see it whatever the user (the user is recorded, not applied). */
const db = {
    organizationUpdatedAt: LOADED_AT as Date | null,
    programs: [] as Array<{ ID: string }>,
    memberships: [] as Array<{ ID: string }>,
    failProgramsRead: false,
    callerCanDelete: true,
};

/** Every step the delete took, in order: locks, reads (with the user they ran as) and the row delete. */
const steps: string[] = [];

interface ViewParams { EntityName: string; ExtraFilter: string; Fields?: string[]; MaxRows?: number }
interface ViewResult { Success: boolean; Results: object[]; ErrorMessage?: string }

function viewResult(p: ViewParams, user: { ID: string }): ViewResult {
    steps.push(`read ${p.EntityName} as ${user.ID}: ${p.ExtraFilter} [${(p.Fields ?? []).join(',')}] max ${p.MaxRows ?? 'none'}`);
    switch (p.EntityName) {
        case ORGANIZATIONS:
            return { Success: true, Results: db.organizationUpdatedAt ? [{ ID: ORG_ID, __mj_UpdatedAt: db.organizationUpdatedAt }] : [] };
        case PROGRAMS:
            return db.failProgramsRead
                ? { Success: false, Results: [], ErrorMessage: 'the database went away' }
                : { Success: true, Results: db.programs };
        case MEMBERSHIPS:
            return { Success: true, Results: db.memberships };
        default:
            return { Success: false, Results: [], ErrorMessage: `unexpected entity ${p.EntityName}` };
    }
}

vi.mock('@memberjunction/global', () => ({
    RegisterClass: () => () => {},
    IsValidUUID: (v: string | null | undefined) =>
        v != null && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    UUIDsEqual: (a: string | null | undefined, b: string | null | undefined) =>
        a != null && b != null && a.toLowerCase() === b.toLowerCase(),
}));

vi.mock('@memberjunction/core', () => {
    class ValidationResult { Success = true; Errors: Array<{ Message: string }> = []; }
    class ValidationErrorInfo { constructor(public Source: string, public Message: string, public Value: unknown) {} }
    class BaseEntityResult {
        Errors: Array<{ Message: string }> = [];
        EndedAt: Date | null = null;
        constructor(public Success: boolean, public Message: string, public Type: string) {}
        get CompleteMessage(): string { return this.Message; }
    }
    class ProviderBase {}
    class BaseRemotableOperation {}
    const runView = {
        async RunView(p: ViewParams, user: { ID: string }) { return viewResult(p, user); },
        async RunViews(params: ViewParams[], user: { ID: string }) { return params.map((p) => viewResult(p, user)); },
    };
    return {
        BaseEntity: class {},
        BaseEntityResult,
        BaseRemotableOperation,
        EntityPermissionType: { Read: 'Read', Create: 'Create', Update: 'Update', Delete: 'Delete' },
        ProviderBase,
        LogError: vi.fn(),
        RunInEntityTransaction: async <T>(_provider: object, work: () => Promise<T>): Promise<T> => {
            steps.push('begin transaction');
            return work();
        },
        RunView: { FromMetadataProvider: () => runView },
        ValidationResult,
        ValidationErrorInfo,
    };
});

vi.mock('@memberjunction/sqlserver-dataprovider', async () => {
    const core = await import('@memberjunction/core');
    class SQLServerDataProvider extends core.ProviderBase {
        async ExecuteSQL(_query: string, params: { LockResource: string }, _options: object, user: { ID: string }): Promise<Array<{ Result: number }>> {
            steps.push(`lock ${params.LockResource} as ${user.ID}`);
            return [{ Result: 0 }];
        }
    }
    return { SQLServerDataProvider };
});

vi.mock('@memberjunction/generic-database-provider', () => ({
    UserCache: { Instance: { GetSystemUser: () => SYSTEM } },
}));

vi.mock('@mj-biz-apps/credentialing-entities', async () => {
    const sqlServer = await import('@memberjunction/sqlserver-dataprovider');
    const provider = new sqlServer.SQLServerDataProvider();
    class FakeEntity {
        ID = ORG_ID;
        IsSaved = true;
        ActiveUser = CALLER;
        ProviderToUse = provider;
        __mj_UpdatedAt: Date | null = LOADED_AT;
        EntityInfo = { Name: ORGANIZATIONS };
        LatestResult: { CompleteMessage: string } | null = null;
        Fields: Array<{ Name: string; Dirty: boolean }> = [];
        GetFieldByName(name: string) { return { Name: name, Dirty: false, OldValue: null }; }
        RegisterResultHistoryEntry(result: { CompleteMessage: string }) { this.LatestResult = result; }
        CheckPermissions(_type: string, _throwError: boolean): boolean { return db.callerCanDelete; }
        async ValidateAsync() { return { Success: true, Errors: [] as Array<{ Message: string }> }; }
        /** Stands in for BaseEntity.Delete(): refuses a caller without Delete permission, else deletes the row. */
        async Delete(): Promise<boolean> {
            if (!db.callerCanDelete) {
                steps.push('platform permission refusal');
                this.LatestResult = { CompleteMessage: 'User does not have permission to Delete' };
                return false;
            }
            steps.push('delete row');
            return true;
        }
    }
    return {
        mjBizAppsCredentialingAccreditingOrganizationEntity: class extends FakeEntity {
            Name = 'Sample Body';
            OrganizationID = 'D0000000-0000-0000-0000-00000000000D';
        },
    };
});

const { AccreditingOrganizationEntityServer } = await import('../AccreditingOrganizationEntityServer.js');

const LOCK_STEP = `lock cred-accrediting-organization:${ORG_ID.toLowerCase()} as ${CALLER.ID}`;
const STALE_STEP = `read ${ORGANIZATIONS} as ${CALLER.ID}: ID = '${ORG_ID}' [ID,__mj_UpdatedAt] max 1`;
const PROGRAMS_STEP = `read ${PROGRAMS} as ${SYSTEM.ID}: AccreditingOrganizationID = '${ORG_ID}' [ID] max 1`;
const MEMBERS_STEP = `read ${MEMBERSHIPS} as ${CALLER.ID}: AccreditingOrganizationID = '${ORG_ID}' [ID] max 1`;

beforeEach(() => {
    db.organizationUpdatedAt = LOADED_AT;
    db.programs = [];
    db.memberships = [];
    db.failProgramsRead = false;
    db.callerCanDelete = true;
    steps.length = 0;
});

describe('AccreditingOrganizationEntityServer.Delete', () => {
    it('takes the organization lock, then checks the snapshot, the programs (as the system user) and the members (as the caller), then deletes', async () => {
        const organization = new AccreditingOrganizationEntityServer();
        expect(await organization.Delete()).toBe(true);
        expect(steps).toEqual(['begin transaction', LOCK_STEP, STALE_STEP, PROGRAMS_STEP, MEMBERS_STEP, 'delete row']);
    });

    it('refuses with the programs sentence while the organization has a program, before looking at members', async () => {
        db.programs = [{ ID: 'C0000000-0000-0000-0000-000000000001' }];
        db.memberships = [{ ID: 'E0000000-0000-0000-0000-000000000001' }];
        const organization = new AccreditingOrganizationEntityServer();
        expect(await organization.Delete()).toBe(false);
        expect(organization.LatestResult?.CompleteMessage).toBe(PROGRAMS_SENTENCE);
        expect(steps).toEqual(['begin transaction', LOCK_STEP, STALE_STEP, PROGRAMS_STEP]);
    });

    it('refuses with the members sentence while the organization has a member', async () => {
        db.memberships = [{ ID: 'E0000000-0000-0000-0000-000000000001' }];
        const organization = new AccreditingOrganizationEntityServer();
        expect(await organization.Delete()).toBe(false);
        expect(organization.LatestResult?.CompleteMessage).toBe(MEMBERS_SENTENCE);
        expect(steps).not.toContain('delete row');
    });

    it('refuses a snapshot older than the stored row with the changed-by-someone-else sentence, before any other check', async () => {
        db.organizationUpdatedAt = new Date('2026-11-02T10:00:00.000Z');
        const organization = new AccreditingOrganizationEntityServer();
        expect(await organization.Delete()).toBe(false);
        expect(organization.LatestResult?.CompleteMessage).toBe(STALE_SENTENCE);
        expect(steps).toEqual(['begin transaction', LOCK_STEP, STALE_STEP]);
    });

    it('refuses an organization that is gone as not found', async () => {
        db.organizationUpdatedAt = null;
        const organization = new AccreditingOrganizationEntityServer();
        expect(await organization.Delete()).toBe(false);
        expect(organization.LatestResult?.CompleteMessage).toBe('Record not found.');
        expect(steps).not.toContain('delete row');
    });

    it('leaves a caller without Delete permission to the platform refusal, without locking or reading as the system user', async () => {
        db.callerCanDelete = false;
        db.programs = [{ ID: 'C0000000-0000-0000-0000-000000000001' }];
        const organization = new AccreditingOrganizationEntityServer();
        expect(await organization.Delete()).toBe(false);
        expect(organization.LatestResult?.CompleteMessage).toBe('User does not have permission to Delete');
        expect(steps).toEqual(['platform permission refusal']);
    });

    it('refuses with a sentence, and gives the caller none of the read error, when the programs cannot be read', async () => {
        db.failProgramsRead = true;
        const organization = new AccreditingOrganizationEntityServer();
        expect(await organization.Delete()).toBe(false);
        expect(organization.LatestResult?.CompleteMessage).toBe('The organization was not deleted: its programs could not be checked. Try again in a moment.');
        expect(steps).not.toContain('delete row');
    });
});
