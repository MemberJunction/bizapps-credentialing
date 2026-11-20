import { beforeEach, describe, expect, it, vi } from 'vitest';

const ORG_ID = 'A0000000-0000-0000-0000-00000000000A';
const VERSION_ID = 'A0000000-0000-0000-0000-000000000001';
const OTHER_PROGRAM_ID = 'C0000000-0000-0000-0000-000000000002';

const ORGANIZATIONS = 'MJ_BizApps_Credentialing: Accrediting Organizations';
const PROGRAMS = 'MJ_BizApps_Credentialing: Programs';
const VERSIONS = 'MJ_BizApps_Credentialing: Program Versions';
const SECTIONS = 'MJ_BizApps_Credentialing: Sections';
const REQUIREMENTS = 'MJ_BizApps_Credentialing: Document Requirements';

/** What the fake database returns to reads made as the caller (the row filter already applied). */
const db = {
    organization: null as { ID: string } | null,
    programs: [] as Array<{ ID: string; Name: string; CredentialPrefix: string }>,
    version: null as { ID: string; Status: 'Draft' | 'Active' | 'Retired'; ProgramID: string; ClonedFromVersionID: string | null } | null,
    sections: [] as Array<{ ID: string; Number: string }>,
    requirements: [] as Array<{ ID: string; Name: string }>,
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
        case REQUIREMENTS:
            return { Success: true, Results: db.requirements };
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
            SubjectNoun: string | null = 'technician';
            EntityInfo = { Name: PROGRAMS };
        },
        mjBizAppsCredentialingSectionEntity: class extends FakeEntity {
            ProgramVersionID = VERSION_ID;
            Number: string | null = '';
            Name: string | null = 'Governance';
            __mj_UpdatedAt: Date | null = null;
            EntityInfo = { Name: SECTIONS };
        },
        mjBizAppsCredentialingDocumentRequirementEntity: class extends FakeEntity {
            ProgramVersionID = VERSION_ID;
            Name: string | null = '';
            __mj_UpdatedAt: Date | null = null;
            EntityInfo = { Name: REQUIREMENTS };
        },
    };
});

const { ProgramEntityServer } = await import('../ProgramEntityServer.js');
const { SectionEntityServer } = await import('../SectionEntityServer.js');
const { DocumentRequirementEntityServer } = await import('../DocumentRequirementEntityServer.js');

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
    db.requirements = [{ ID: 'B0000000-0000-0000-0000-000000000002', Name: 'Charter' }];
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

describe('required text', () => {
    const blanks: Array<string | null> = ['', '    ', null];

    it("refuses a program's blank name, prefix or subject noun with its sentence, before looking for duplicates", async () => {
        for (const blank of blanks) {
            const unnamed = newProgram('x', 'NEW');
            unnamed.Name = blank as string;
            expect(await unnamed.Save()).toBe(false);
            expect(unnamed.LatestResult?.CompleteMessage).toBe("Enter the program's name.");

            const noPrefix = newProgram('Another Program', 'x');
            noPrefix.CredentialPrefix = blank as string;
            expect(await noPrefix.Save()).toBe(false);
            expect(noPrefix.LatestResult?.CompleteMessage).toBe('Enter the credential prefix.');

            const noNoun = newProgram('Another Program', 'NEW');
            noNoun.SubjectNoun = blank;
            expect(await noNoun.Save()).toBe(false);
            expect(noNoun.LatestResult?.CompleteMessage).toBe('Enter the subject noun.');
        }
        expect(filtersSeen.some((f) => f.startsWith(PROGRAMS))).toBe(false);
    });

    it("stores a program's subject noun trimmed", async () => {
        const program = newProgram('Another Program', 'AP');
        program.SubjectNoun = '  facility ';
        expect(await program.Save()).toBe(true);
        expect(program.SubjectNoun).toBe('facility');
    });

    it("refuses a section's blank number or name with its sentence, and stores the name trimmed", async () => {
        for (const blank of blanks) {
            const unnumbered = newSection('x');
            unnumbered.Number = blank;
            expect(await unnumbered.Save()).toBe(false);
            expect(unnumbered.LatestResult?.CompleteMessage).toBe("Enter the section's number.");

            const unnamed = newSection('2');
            unnamed.Name = blank;
            expect(await unnamed.Save()).toBe(false);
            expect(unnamed.LatestResult?.CompleteMessage).toBe("Enter the section's name.");
        }
        const section = newSection('2');
        section.Name = '  Governance ';
        expect(await section.Save()).toBe(true);
        expect(section.Name).toBe('Governance');
    });

    it("refuses a document requirement's blank name with its sentence, and stores the name trimmed", async () => {
        for (const blank of blanks) {
            const unnamed = new DocumentRequirementEntityServer();
            unnamed.Name = blank as string;
            expect(await unnamed.Save()).toBe(false);
            expect(unnamed.LatestResult?.CompleteMessage).toBe("Enter the document's name.");
        }
        const requirement = new DocumentRequirementEntityServer();
        requirement.Name = '  Bylaws ';
        expect(await requirement.Save()).toBe(true);
        expect(requirement.Name).toBe('Bylaws');
        const duplicate = new DocumentRequirementEntityServer();
        duplicate.Name = ' charter ';
        expect(await duplicate.Save()).toBe(false);
        expect(duplicate.LatestResult?.CompleteMessage).toBe('A document requirement named charter already exists in this version.');
    });
});
