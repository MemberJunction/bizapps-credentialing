import { beforeEach, describe, expect, it, vi } from 'vitest';

const VERSION_ID = 'A0000000-0000-0000-0000-000000000001';
const SECTION_ID = 'B0000000-0000-0000-0000-000000000001';
const PROGRAM_ID = 'C0000000-0000-0000-0000-000000000001';
const EXISTING_STANDARD_ID = 'D0000000-0000-0000-0000-000000000001';

const SECTIONS = 'MJ_BizApps_Credentialing: Sections';
const VERSIONS = 'MJ_BizApps_Credentialing: Program Versions';
const STANDARDS = 'MJ_BizApps_Credentialing: Standards';

interface SectionRow { ID: string; ProgramVersionID: string }
interface VersionRow { ID: string; Status: 'Draft' | 'Active' | 'Retired'; ProgramID: string; ClonedFromVersionID: string | null }
interface StandardCodeRow { ID: string; Code: string }

/** What the fake database returns to reads made as the caller. */
const db = {
    section: null as SectionRow | null,
    version: null as VersionRow | null,
    standards: [] as StandardCodeRow[],
};
const sqlSeen: string[] = [];

interface ViewParams { EntityName: string; ExtraFilter: string; Fields?: string[] }
interface ViewResult { Success: boolean; Results: object[]; ErrorMessage?: string }

function viewResult(p: ViewParams): ViewResult {
    switch (p.EntityName) {
        case SECTIONS:
            return { Success: true, Results: db.section ? [db.section] : [] };
        case VERSIONS:
            return { Success: true, Results: db.version ? [db.version] : [] };
        case STANDARDS:
            return { Success: true, Results: db.standards };
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
        constructor(public Success: boolean, public Message: string, public Type: string) {}
        get CompleteMessage(): string { return this.Message; }
    }
    class ProviderBase {}
    // The shared operation contracts in @mj-biz-apps/credentialing-core extend this at import time.
    class BaseRemotableOperation {}
    const runView = {
        async RunView(p: ViewParams) { return viewResult(p); },
        async RunViews(params: ViewParams[]) { return params.map((p) => viewResult(p)); },
    };
    return {
        BaseEntity: class {},
        BaseEntityResult,
        BaseRemotableOperation,
        ProviderBase,
        LogError: vi.fn(),
        RunInEntityTransaction: async <T>(_provider: object, work: () => Promise<T>): Promise<T> => work(),
        RunView: { FromMetadataProvider: () => runView },
        ValidationResult,
        ValidationErrorInfo,
    };
});

vi.mock('@memberjunction/sqlserver-dataprovider', async () => {
    const core = await import('@memberjunction/core');
    class SQLServerDataProvider extends core.ProviderBase {
        async ExecuteSQL(query: string): Promise<Array<{ Result: number }>> {
            sqlSeen.push(query);
            return [{ Result: 0 }];
        }
    }
    return { SQLServerDataProvider };
});

vi.mock('@mj-biz-apps/credentialing-entities', async () => {
    const sqlServer = await import('@memberjunction/sqlserver-dataprovider');
    const provider = new sqlServer.SQLServerDataProvider();
    return {
        mjBizAppsCredentialingStandardEntity: class {
            ID = '';
            SectionID = SECTION_ID;
            ProgramVersionID = '';
            Code = '';
            LineageKey = 'E0000000-0000-0000-0000-000000000001';
            EvaluationMode: 'Human Only' | 'AI Assisted' | 'AI Automated' = 'Human Only';
            IsInterpretive = false;
            IsSaved = false;
            ActiveUser = { ID: 'user-1', Email: 'user@example.test' };
            ProviderToUse = provider;
            LatestResult: { CompleteMessage: string } | null = null;
            Fields: Array<{ Name: string; Dirty: boolean }> = [];
            EntityInfo = { Name: STANDARDS };
            GetFieldByName(name: string) { return { Name: name, Dirty: !this.IsSaved, OldValue: null }; }
            RegisterResultHistoryEntry(result: { CompleteMessage: string }) { this.LatestResult = result; }
            async ValidateAsync() { return { Success: true, Errors: [] as Array<{ Message: string }> }; }
            /** Stands in for BaseEntity.Save(): runs async validation and records a refusal. */
            async Save(): Promise<boolean> {
                const result = await this.ValidateAsync();
                if (!result.Success) {
                    this.LatestResult = { CompleteMessage: result.Errors.map((e) => e.Message).join('\n') };
                    return false;
                }
                return true;
            }
        },
    };
});

const { StandardEntityServer } = await import('../StandardEntityServer.js');

function newStandard(code: string): InstanceType<typeof StandardEntityServer> {
    const standard = new StandardEntityServer();
    standard.Code = code;
    return standard;
}

describe('StandardEntityServer', () => {
    beforeEach(() => {
        db.section = { ID: SECTION_ID, ProgramVersionID: VERSION_ID };
        db.version = { ID: VERSION_ID, Status: 'Draft', ProgramID: PROGRAM_ID, ClonedFromVersionID: null };
        db.standards = [{ ID: EXISTING_STANDARD_ID, Code: '1.1' }];
        sqlSeen.length = 0;
    });

    it('opts in to async validation so the rules always run', () => {
        expect(newStandard('9.9').DefaultSkipAsyncValidation).toBe(false);
    });

    it('refuses a new standard whose code differs from an existing one only by surrounding spaces', async () => {
        const standard = newStandard(' 1.1 ');
        const saved = await standard.Save();
        expect(saved).toBe(false);
        expect(standard.LatestResult?.CompleteMessage).toBe('Standard code 1.1 is already used in this version.');
    });

    it('takes the version lock before it validates', async () => {
        await newStandard(' 1.1 ').Save();
        expect(sqlSeen.some((q) => q.includes('sp_getapplock'))).toBe(true);
    });

    it('stores the code trimmed and the version taken from its section', async () => {
        const standard = newStandard(' 9.9 ');
        standard.ProgramVersionID = 'F0000000-0000-0000-0000-000000000009';
        const saved = await standard.Save();
        expect(saved).toBe(true);
        expect(standard.Code).toBe('9.9');
        expect(standard.ProgramVersionID).toBe(VERSION_ID);
    });

    it('refuses with the not-found sentence when the parent section does not load for the caller', async () => {
        db.section = null;
        const standard = newStandard('9.9');
        const saved = await standard.Save();
        expect(saved).toBe(false);
        expect(standard.LatestResult?.CompleteMessage).toBe('Record not found.');
        expect(sqlSeen).toEqual([]);
    });

    it('refuses with the not-found sentence when the parent version does not load for the caller', async () => {
        db.version = null;
        const standard = newStandard('9.9');
        expect(await standard.Save()).toBe(false);
        expect(standard.LatestResult?.CompleteMessage).toBe('Record not found.');
    });
});
