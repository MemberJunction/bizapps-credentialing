import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORG_ID = 'A0000000-0000-0000-0000-00000000000A';
const VERSION_ID = 'A0000000-0000-0000-0000-000000000001';
const OTHER_PROGRAM_ID = 'C0000000-0000-0000-0000-000000000002';

const ORGANIZATIONS = 'MJ_BizApps_Credentialing: Accrediting Organizations';
const PROGRAMS = 'MJ_BizApps_Credentialing: Programs';
const VERSIONS = 'MJ_BizApps_Credentialing: Program Versions';
const SECTIONS = 'MJ_BizApps_Credentialing: Sections';

/** What the fake database returns to reads made as the caller (the row filter already applied). */
const db = {
    organization: null as { ID: string } | null,
    programs: [] as Array<{ ID: string; Name: string; CredentialPrefix: string }>,
    version: null as { ID: string; Status: 'Draft' | 'Active' | 'Retired'; ProgramID: string; ClonedFromVersionID: string | null } | null,
    sections: [] as Array<{ ID: string; Number: string }>,
};
const sqlSeen: string[] = [];
const filtersSeen: string[] = [];

interface ViewParams { EntityName: string; ExtraFilter: string; Fields?: string[] }
interface ViewResult { Success: boolean; Results: object[]; ErrorMessage?: string }

function viewResult(p: ViewParams): ViewResult {
    filtersSeen.push(`${p.EntityName}: ${p.ExtraFilter}`);
    switch (p.EntityName) {
        case ORGANIZATIONS:
            return { Success: true, Results: db.organization ? [db.organization] : [] };
        case PROGRAMS:
            return { Success: true, Results: db.programs };
        case VERSIONS:
            return { Success: true, Results: db.version ? [db.version] : [] };
        case SECTIONS:
            return { Success: true, Results: db.sections };
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
    class FakeEntity {
        ID = '';
        IsSaved = false;
        ActiveUser = { ID: 'user-1', Email: 'user@example.test' };
        ProviderToUse = provider;
        LatestResult: { CompleteMessage: string } | null = null;
        Fields: Array<{ Name: string; Dirty: boolean }> = [];
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
    }
    return {
        mjBizAppsCredentialingProgramEntity: class extends FakeEntity {
            AccreditingOrganizationID = ORG_ID;
            Name = '';
            CredentialPrefix = '';
            EntityInfo = { Name: PROGRAMS };
        },
        mjBizAppsCredentialingSectionEntity: class extends FakeEntity {
            ProgramVersionID = VERSION_ID;
            Number = '';
            __mj_UpdatedAt: Date | null = null;
            EntityInfo = { Name: SECTIONS };
        },
    };
});

const { ProgramEntityServer } = await import('../ProgramEntityServer.js');
const { SectionEntityServer } = await import('../SectionEntityServer.js');

function newProgram(name: string, prefix: string): InstanceType<typeof ProgramEntityServer> {
    const program = new ProgramEntityServer();
    program.Name = name;
    program.CredentialPrefix = prefix;
    return program;
}

function newSection(number: string): InstanceType<typeof SectionEntityServer> {
    const section = new SectionEntityServer();
    section.Number = number;
    return section;
}

beforeEach(() => {
    db.organization = { ID: ORG_ID };
    db.programs = [{ ID: OTHER_PROGRAM_ID, Name: 'Field Technician', CredentialPrefix: 'SFT' }];
    db.version = { ID: VERSION_ID, Status: 'Draft', ProgramID: OTHER_PROGRAM_ID, ClonedFromVersionID: null };
    db.sections = [{ ID: 'B0000000-0000-0000-0000-000000000001', Number: '1' }];
    sqlSeen.length = 0;
    filtersSeen.length = 0;
});

describe('ProgramEntityServer uniqueness', () => {
    it('refuses a name that differs from another program of the organization only by case or spaces', async () => {
        const program = newProgram('  field TECHNICIAN ', 'NEW');
        expect(await program.Save()).toBe(false);
        expect(program.LatestResult?.CompleteMessage).toBe('A program named field TECHNICIAN already exists in this organization.');
    });

    it('refuses a credential prefix already used in the organization, ignoring case and spaces', async () => {
        const program = newProgram('Another Program', ' sft ');
        expect(await program.Save()).toBe(false);
        expect(program.LatestResult?.CompleteMessage).toBe('Credential prefix sft is already used in this organization.');
    });

    it('stores the name and prefix trimmed and saves a unique program', async () => {
        const program = newProgram('  Another Program ', ' AP ');
        expect(await program.Save()).toBe(true);
        expect(program.Name).toBe('Another Program');
        expect(program.CredentialPrefix).toBe('AP');
    });

    it('takes the organization lock and reads only the program organization', async () => {
        await newProgram('Another Program', 'AP').Save();
        expect(sqlSeen.some((q) => q.includes('sp_getapplock'))).toBe(true);
        expect(filtersSeen).toContain(`${PROGRAMS}: AccreditingOrganizationID = '${ORG_ID}'`);
    });

    it('refuses an organization the caller cannot read as not found, without looking for duplicates or locking', async () => {
        db.organization = null;
        const program = newProgram('Field Technician', 'SFT');
        expect(await program.Save()).toBe(false);
        expect(program.LatestResult?.CompleteMessage).toBe('Record not found.');
        expect(filtersSeen.some((f) => f.startsWith(PROGRAMS))).toBe(false);
        expect(sqlSeen).toEqual([]);
    });
});

describe('SectionEntityServer uniqueness', () => {
    it('refuses a number already used in the version, ignoring case and spaces', async () => {
        db.sections = [{ ID: 'B0000000-0000-0000-0000-000000000001', Number: '1a' }];
        const section = newSection(' 1A ');
        expect(await section.Save()).toBe(false);
        expect(section.LatestResult?.CompleteMessage).toBe('Section number 1A is already used in this version.');
    });

    it('stores the number trimmed, under the version lock', async () => {
        const section = newSection(' 2 ');
        expect(await section.Save()).toBe(true);
        expect(section.Number).toBe('2');
        expect(sqlSeen.some((q) => q.includes('sp_getapplock'))).toBe(true);
    });

    it('a frozen version is refused with the tree-edit sentence before the number is checked', async () => {
        db.version = { ID: VERSION_ID, Status: 'Active', ProgramID: OTHER_PROGRAM_ID, ClonedFromVersionID: null };
        const section = newSection('1');
        expect(await section.Save()).toBe(false);
        expect(section.LatestResult?.CompleteMessage).toBe('Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.');
    });
});
