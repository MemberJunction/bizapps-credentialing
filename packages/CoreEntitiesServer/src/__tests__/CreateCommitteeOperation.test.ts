import { beforeEach, describe, expect, it, vi } from 'vitest';

const PROGRAM_ID = 'F0000000-0000-0000-0000-00000000000F';
const ORG_ID = 'A0000000-0000-0000-0000-00000000000A';
const COMMON_ORG_ID = 'D0000000-0000-0000-0000-00000000000D';
const TYPE_ID = 'B0000000-0000-0000-0000-00000000000B';
const NEW_COMMITTEE_ID = 'C0000000-0000-0000-0000-00000000000C';

const PROGRAMS = 'MJ_BizApps_Credentialing: Programs';
const ORGANIZATIONS = 'MJ_BizApps_Credentialing: Accrediting Organizations';
const COMMITTEES = 'Committees: Committees';
const COMMITTEE_TYPES = 'Committees: Types';

interface FakeUser { ID: string; Email: string; UserRoles: Array<{ Role: string }> }

const STAFF: FakeUser = { ID: 'staff-1', Email: 'staff@example.test', UserRoles: [{ Role: 'Credentialing Staff' }] };
const ADMIN: FakeUser = { ID: 'admin-1', Email: 'admin@example.test', UserRoles: [{ Role: 'Credentialing Admin' }] };
const SYSTEM: FakeUser = { ID: 'system-1', Email: 'system@example.test', UserRoles: [] };

const NOT_FOUND_SENTENCE = 'Record not found.';
const NAME_SENTENCE = "Enter the committee's name.";
const TYPE_SENTENCE = 'Choose a committee type.';

/** What the fake database holds; reads see it whatever the user (the user is recorded, not applied). */
const db = {
    programReadable: true,
    organizationReadable: true,
    typeExists: true,
    sameNameExists: false,
    failSystemRead: false,
    saveSucceeds: true,
};

/** Every step the operation took, in order: reads (with the user they ran as), the lock and the save. */
const steps: string[] = [];

/** The committee rows saved, with the user each was saved as. */
const saved: Array<{ As: string; Name: string; TypeID: string; OrganizationID: string | null; Status: string; IsPublic: boolean }> = [];

interface ViewParams { EntityName: string; ExtraFilter: string; Fields?: string[]; MaxRows?: number }
interface ViewResult { Success: boolean; Results: object[]; ErrorMessage?: string }

function viewResult(p: ViewParams, user: FakeUser): ViewResult {
    steps.push(`read ${p.EntityName} as ${user.ID}: ${p.ExtraFilter} [${(p.Fields ?? []).join(',')}] max ${p.MaxRows ?? 'none'}`);
    const systemFailure: ViewResult = { Success: false, Results: [], ErrorMessage: 'the database went away' };
    switch (p.EntityName) {
        case PROGRAMS:
            return { Success: true, Results: db.programReadable && p.ExtraFilter !== '1 = 0' ? [{ ID: PROGRAM_ID, AccreditingOrganizationID: ORG_ID }] : [] };
        case ORGANIZATIONS:
            return { Success: true, Results: db.organizationReadable ? [{ OrganizationID: COMMON_ORG_ID }] : [] };
        case COMMITTEE_TYPES:
            return db.failSystemRead ? systemFailure : { Success: true, Results: db.typeExists && p.ExtraFilter !== '1 = 0' ? [{ ID: TYPE_ID }] : [] };
        case COMMITTEES:
            return db.failSystemRead ? systemFailure : { Success: true, Results: db.sameNameExists ? [{ ID: 'E0000000-0000-0000-0000-00000000000E' }] : [] };
        default:
            return { Success: false, Results: [], ErrorMessage: `unexpected entity ${p.EntityName}` };
    }
}

vi.mock('@memberjunction/global', () => ({
    RegisterClass: () => () => {},
    EscapeSQLString: (v: string) => v.replace(/'/g, "''"),
    IsValidUUID: (v: string | null | undefined) =>
        v != null && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
    UUIDsEqual: (a: string | null | undefined, b: string | null | undefined) =>
        a != null && b != null && a.toLowerCase() === b.toLowerCase(),
}));

vi.mock('@memberjunction/core', () => {
    class RemoteOperationError extends Error {
        constructor(public Code: string, message: string) { super(message); }
    }
    class DatabaseProviderBase {}
    interface ExecuteOptions { provider: object; user: FakeUser }
    interface Result { Success: boolean; ResultCode: string; ErrorMessage?: string; Output?: object }
    /** Stands in for MJ's dispatch: Authorize, then the body; a RemoteOperationError becomes its code and message. */
    abstract class BaseRemotableOperation {
        protected abstract Authorize(input: object, user: FakeUser): Promise<boolean>;
        protected abstract InternalExecute(input: object, provider: object, user: FakeUser): Promise<object>;
        async Execute(input: object, options: ExecuteOptions): Promise<Result> {
            if (!(await this.Authorize(input, options.user))) {
                return { Success: false, ResultCode: 'FORBIDDEN', ErrorMessage: 'Not authorized' };
            }
            try {
                return { Success: true, ResultCode: 'SUCCESS', Output: await this.InternalExecute(input, options.provider, options.user) };
            } catch (err) {
                steps.push('roll back');
                const code = err instanceof RemoteOperationError ? err.Code : 'EXECUTION_ERROR';
                return { Success: false, ResultCode: code, ErrorMessage: err instanceof Error ? err.message : String(err) };
            }
        }
    }
    const runView = {
        async RunView(p: ViewParams, user: FakeUser) { return viewResult(p, user); },
        async RunViews(params: ViewParams[], user: FakeUser) { return params.map((p) => viewResult(p, user)); },
    };
    return {
        BaseRemotableOperation,
        DatabaseProviderBase,
        RemoteOperationError,
        LogError: vi.fn(),
        RunInEntityTransaction: async <T>(_provider: object, work: () => Promise<T>): Promise<T> => {
            steps.push('begin transaction');
            return work();
        },
        RunView: { FromMetadataProvider: () => runView },
    };
});

vi.mock('@memberjunction/sqlserver-dataprovider', async () => {
    const core = await import('@memberjunction/core');
    class FakeCommittee {
        ID = '';
        Name = '';
        TypeID = '';
        OrganizationID: string | null = null;
        Status = 'Pending';
        IsPublic = true;
        LatestResult: { CompleteMessage: string } | null = null;
        EntityInfo = { Name: COMMITTEES };
        constructor(private readonly user: FakeUser) {}
        NewRecord(): void {}
        async Save(): Promise<boolean> {
            steps.push(`save ${COMMITTEES} as ${this.user.ID}`);
            if (!db.saveSucceeds) {
                this.LatestResult = { CompleteMessage: 'The committee was refused by its own rules.' };
                return false;
            }
            this.ID = NEW_COMMITTEE_ID;
            saved.push({ As: this.user.ID, Name: this.Name, TypeID: this.TypeID, OrganizationID: this.OrganizationID, Status: this.Status, IsPublic: this.IsPublic });
            return true;
        }
    }
    class SQLServerDataProvider extends core.DatabaseProviderBase {
        async ExecuteSQL(_query: string, params: { LockResource: string }, _options: object, user: FakeUser): Promise<Array<{ Result: number }>> {
            steps.push(`lock ${params.LockResource} as ${user.ID}`);
            return [{ Result: 0 }];
        }
        async GetEntityObject(entityName: string, user: FakeUser): Promise<FakeCommittee> {
            steps.push(`new ${entityName} as ${user.ID}`);
            return new FakeCommittee(user);
        }
    }
    return { SQLServerDataProvider };
});

vi.mock('@memberjunction/generic-database-provider', () => ({
    UserCache: { Instance: { GetSystemUser: () => SYSTEM } },
}));

const { SQLServerDataProvider } = await import('@memberjunction/sqlserver-dataprovider');
const { CreateCommitteeServerOperation } = await import('../operations/CreateCommitteeServerOperation.js');

type Input = { ProgramID: string; Name: string; CommitteeTypeID: string };
type Options = NonNullable<Parameters<InstanceType<typeof CreateCommitteeServerOperation>['Execute']>[1]>;

/** Runs the operation as `user` on a fresh fake provider. The fakes stand in for MJ's provider and user types. */
function run(input: Partial<Input>, user: FakeUser = STAFF) {
    const options = { provider: new SQLServerDataProvider(), user } as object as Options;
    return new CreateCommitteeServerOperation().Execute({ ProgramID: PROGRAM_ID, Name: 'Standards Committee', CommitteeTypeID: TYPE_ID, ...input }, options);
}

const PROGRAM_STEP = `read ${PROGRAMS} as ${STAFF.ID}: ID = '${PROGRAM_ID}' [ID,AccreditingOrganizationID] max 1`;
const LOCK_STEP = `lock cred-accrediting-organization:${ORG_ID.toLowerCase()} as ${STAFF.ID}`;
const ORGANIZATION_STEP = `read ${ORGANIZATIONS} as ${STAFF.ID}: ID = '${ORG_ID}' [OrganizationID] max 1`;
const TYPE_STEP = `read ${COMMITTEE_TYPES} as ${SYSTEM.ID}: ID = '${TYPE_ID}' [ID] max 1`;
const sameNameStep = (name: string): string =>
    `read ${COMMITTEES} as ${SYSTEM.ID}: OrganizationID = '${COMMON_ORG_ID}' AND LOWER(LTRIM(RTRIM(Name))) = LOWER('${name}') [ID] max 1`;
const NEW_STEP = `new ${COMMITTEES} as ${SYSTEM.ID}`;
const SAVE_STEP = `save ${COMMITTEES} as ${SYSTEM.ID}`;

beforeEach(() => {
    db.programReadable = true;
    db.organizationReadable = true;
    db.typeExists = true;
    db.sameNameExists = false;
    db.failSystemRead = false;
    db.saveSucceeds = true;
    steps.length = 0;
    saved.length = 0;
});

describe('CreateCommitteeServerOperation', () => {
    it('reads the program as the caller, locks its organization, reads the owner as the caller, checks as the system user, then saves as the system user', async () => {
        const result = await run({});
        expect(result.Success).toBe(true);
        expect(result.Output).toEqual({ CommitteeID: NEW_COMMITTEE_ID, Name: 'Standards Committee' });
        expect(steps).toEqual(['begin transaction', PROGRAM_STEP, LOCK_STEP, ORGANIZATION_STEP, TYPE_STEP, sameNameStep('Standards Committee'), NEW_STEP, SAVE_STEP]);
    });

    it('saves an Active, private committee of the given type, owned by the Common organization behind the program', async () => {
        await run({});
        expect(saved).toEqual([{ As: SYSTEM.ID, Name: 'Standards Committee', TypeID: TYPE_ID, OrganizationID: COMMON_ORG_ID, Status: 'Active', IsPublic: false }]);
    });

    it('stores the name trimmed with inner whitespace collapsed, and returns it', async () => {
        const result = await run({ Name: '  Standards    Review \t Committee ' });
        expect(result.Output).toEqual({ CommitteeID: NEW_COMMITTEE_ID, Name: 'Standards Review Committee' });
        expect(steps).toContain(sameNameStep('Standards Review Committee'));
    });

    it('doubles a quote in the name before it reaches the filter', async () => {
        await run({ Name: "Members' Committee" });
        expect(steps).toContain(sameNameStep("Members'' Committee"));
        expect(saved[0].Name).toBe("Members' Committee");
    });

    it('refuses a caller without Credentialing Staff before anything is read', async () => {
        const result = await run({}, ADMIN);
        expect(result.Success).toBe(false);
        expect(result.ResultCode).toBe('FORBIDDEN');
        expect(steps).toEqual([]);
    });

    it('refuses a program the caller cannot read as not found, before any lock or system-user read', async () => {
        db.programReadable = false;
        const result = await run({});
        expect(result).toMatchObject({ Success: false, ResultCode: 'REFUSED', ErrorMessage: NOT_FOUND_SENTENCE });
        expect(steps).toEqual(['begin transaction', PROGRAM_STEP, 'roll back']);
    });

    it('refuses a program ID that is not a UUID as not found, without sending it to the database', async () => {
        const result = await run({ ProgramID: "x' OR 1=1 --" });
        expect(result).toMatchObject({ Success: false, ErrorMessage: NOT_FOUND_SENTENCE });
        expect(steps).toEqual(['begin transaction', `read ${PROGRAMS} as ${STAFF.ID}: 1 = 0 [ID,AccreditingOrganizationID] max 1`, 'roll back']);
    });

    it('refuses an organization the caller cannot read as not found, before any system-user read', async () => {
        db.organizationReadable = false;
        const result = await run({});
        expect(result).toMatchObject({ Success: false, ResultCode: 'REFUSED', ErrorMessage: NOT_FOUND_SENTENCE });
        expect(steps).toEqual(['begin transaction', PROGRAM_STEP, LOCK_STEP, ORGANIZATION_STEP, 'roll back']);
    });

    it('refuses a blank name with its sentence, before any system-user read', async () => {
        for (const blank of ['', '   ', '\t']) {
            steps.length = 0;
            const result = await run({ Name: blank });
            expect(result).toMatchObject({ Success: false, ResultCode: 'REFUSED', ErrorMessage: NAME_SENTENCE });
            expect(steps).toEqual(['begin transaction', PROGRAM_STEP, LOCK_STEP, ORGANIZATION_STEP, 'roll back']);
        }
        expect(saved).toEqual([]);
    });

    it('refuses a committee type that does not exist, and one that is not a UUID, with the type sentence', async () => {
        db.typeExists = false;
        expect(await run({})).toMatchObject({ Success: false, ResultCode: 'REFUSED', ErrorMessage: TYPE_SENTENCE });
        db.typeExists = true;
        steps.length = 0;
        expect(await run({ CommitteeTypeID: "x' OR 1=1 --" })).toMatchObject({ Success: false, ErrorMessage: TYPE_SENTENCE });
        expect(steps).toContain(`read ${COMMITTEE_TYPES} as ${SYSTEM.ID}: 1 = 0 [ID] max 1`);
        expect(saved).toEqual([]);
    });

    it('refuses a name the organization already uses with the sentence naming it, and saves nothing', async () => {
        db.sameNameExists = true;
        const result = await run({ Name: ' standards  COMMITTEE ' });
        expect(result).toMatchObject({
            Success: false,
            ResultCode: 'REFUSED',
            ErrorMessage: 'A committee named standards COMMITTEE already exists for this organization.',
        });
        expect(steps).not.toContain(SAVE_STEP);
        expect(saved).toEqual([]);
    });

    it('gives a save refused by the committee entity as the refusal', async () => {
        db.saveSucceeds = false;
        const result = await run({});
        expect(result).toMatchObject({ Success: false, ResultCode: 'REFUSED', ErrorMessage: 'The committee was refused by its own rules.' });
    });

    it('fails without saving when the system-user reads fail', async () => {
        db.failSystemRead = true;
        const result = await run({});
        expect(result.Success).toBe(false);
        expect(result.ResultCode).toBe('EXECUTION_ERROR');
        expect(saved).toEqual([]);
    });
});
