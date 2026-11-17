import { describe, expect, it } from 'vitest';
import type { RunViewParams, RunViewResult } from '@memberjunction/core';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { COMMITTEE_ENTITY, COMMITTEE_TYPE_ENTITY, StudioData, type CommitteeRow, type StudioDataSource } from '../studio-data';

type Row = { ID: string; AccreditingOrganizationID?: string; OrganizationID?: string };

class StubSource implements StudioDataSource {
    public readonly Calls: RunViewParams[][] = [];
    constructor(private readonly answer: (params: RunViewParams, index: number) => RunViewResult<Row>) {}

    public async RunViews<T>(params: RunViewParams[]): Promise<RunViewResult<T>[]> {
        this.Calls.push(params);
        return params.map((p, i) => this.answer(p, i) as RunViewResult<T>);
    }
}

function rows(results: Row[]): RunViewResult<Row> {
    return { Success: true, Results: results, RowCount: results.length, TotalRowCount: results.length, ExecutionTime: 1, ErrorMessage: '' };
}

const PROGRAM = 'F1111111-1111-1111-1111-111111111111';

const VERSION = 'E1111111-1111-1111-1111-111111111111';
const ORG = 'A1111111-1111-1111-1111-111111111111';
const COMMON_ORG = 'C1111111-1111-1111-1111-111111111111';

/** Answers the first call with the program, one version and its organization; the second with empty views. */
function programAnswer(p: RunViewParams): RunViewResult<Row> {
    if (p.EntityName === CredentialingEntity.Program) return rows([{ ID: PROGRAM, AccreditingOrganizationID: ORG } as Row]);
    if (p.EntityName === CredentialingEntity.ProgramVersion) return rows([{ ID: VERSION }]);
    if (p.EntityName === CredentialingEntity.AccreditingOrganization) return rows([{ ID: 'other' } as Row, { ID: ORG, OrganizationID: COMMON_ORG } as Row]);
    return rows([]);
}

describe('StudioData.LoadProgram', () => {
    it('reads the program and everything under it in two calls', async () => {
        const source = new StubSource((p) => programAnswer(p));
        const load = await new StudioData(source).LoadProgram(PROGRAM);
        expect(load.Found).toBe(true);
        expect(source.Calls).toHaveLength(2);
        expect(source.Calls[0].map((p) => p.EntityName)).toEqual([CredentialingEntity.Program, CredentialingEntity.ProgramVersion, CredentialingEntity.AccreditingOrganization]);
        expect(source.Calls[1].map((p) => p.EntityName)).toEqual([CredentialingEntity.Section, CredentialingEntity.Standard, CredentialingEntity.DocumentRequirement, COMMITTEE_ENTITY, COMMITTEE_TYPE_ENTITY]);
    });

    it('filters the tree by the version IDs and the committees by the program organization, with no subquery', async () => {
        const source = new StubSource((p) => programAnswer(p));
        await new StudioData(source).LoadProgram(PROGRAM);
        const [sections, , , committees] = source.Calls[1];
        expect(sections.ExtraFilter).toBe(`ProgramVersionID IN ('${VERSION}')`);
        expect(committees.ExtraFilter).toBe(`OrganizationID = '${COMMON_ORG}'`);
        for (const p of [...source.Calls[0], ...source.Calls[1]]) {
            expect(p.ExtraFilter ?? '').not.toMatch(/select/i);
        }
    });

    it('a program with no versions reads no tree rows', () => {
        const params = StudioData.TreeParams([], null);
        expect(params.slice(0, 4).map((p) => p.ExtraFilter)).toEqual(['1 = 0', '1 = 0', '1 = 0', '1 = 0']);
    });

    it('reads the committee types, a catalog, unfiltered and by name in the second call, so the page makes no call of its own for them', async () => {
        const types = StudioData.TreeParams([VERSION], COMMON_ORG)[4];
        expect(types).toEqual({ EntityName: COMMITTEE_TYPE_ENTITY, Fields: ['ID', 'Name'], OrderBy: 'Name', ResultType: 'simple' });
        const source = new StubSource((p) => (p.EntityName === COMMITTEE_TYPE_ENTITY ? rows([{ ID: 'T1' }, { ID: 'T2' }]) : programAnswer(p)));
        const load = await new StudioData(source).LoadProgram(PROGRAM);
        expect(load.Found && load.Bundle.CommitteeTypes.map((t) => t.ID)).toEqual(['T1', 'T2']);
        expect(load.Found && load.Bundle.CommonOrganizationID).toBe(COMMON_ORG);
        expect(source.Calls).toHaveLength(2);
    });

    it('loads display rows as simple rows with named fields, and versions as entity objects to edit', () => {
        const params = [...StudioData.ProgramParams(PROGRAM), ...StudioData.TreeParams([VERSION], COMMON_ORG)];
        expect(params[1].ResultType).toBe('entity_object');
        for (const p of [params[0], ...params.slice(2)]) {
            expect(p.ResultType).toBe('simple');
            expect((p.Fields ?? []).length).toBeGreaterThan(0);
        }
    });

    it('a program the user cannot read is not found, and nothing more is read', async () => {
        const source = new StubSource((p) => (p.EntityName === CredentialingEntity.Program ? rows([]) : rows([{ ID: 'X' }])));
        expect(await new StudioData(source).LoadProgram(PROGRAM)).toEqual({ Found: false });
        expect(source.Calls).toHaveLength(1);
    });

    it('an ID that is not a UUID is not found, exactly like a program that does not exist, and no query is sent with it', async () => {
        for (const id of ['not-a-uuid', '', '   ', "x' OR 1=1 --", `${PROGRAM}0`]) {
            const source = new StubSource((p) => programAnswer(p));
            expect(await new StudioData(source).LoadProgram(id)).toEqual({ Found: false });
            expect(source.Calls).toEqual([]);
        }
    });

    it('a failed view rejects with its message instead of showing an empty tree', async () => {
        const source = new StubSource((p) => (p.EntityName === CredentialingEntity.Standard ? { ...rows([]), Success: false, ErrorMessage: 'Standards could not be read' } : programAnswer(p)));
        await expect(new StudioData(source).LoadProgram(PROGRAM)).rejects.toThrow('Standards could not be read');
    });

    it('escapes IDs inside every filter', () => {
        const params = [...StudioData.ProgramParams("x' OR 1=1 --"), ...StudioData.TreeParams(["y' OR 1=1 --"], "z' --")];
        for (const p of params) {
            expect(p.ExtraFilter ?? '').not.toMatch(/'[xyz]' OR|'z' --/);
        }
    });
});

describe('StudioData.Committees', () => {
    it('reads only the committees of the one organization, by name, in one call', async () => {
        const source = new StubSource(() => rows([{ ID: 'C1' }]));
        const committees = await new StudioData(source).Committees(COMMON_ORG);
        expect(committees.map((c) => c.ID)).toEqual(['C1']);
        expect(source.Calls).toEqual([[{ EntityName: COMMITTEE_ENTITY, Fields: ['ID', 'Name', 'Status'], ExtraFilter: `OrganizationID = '${COMMON_ORG}'`, OrderBy: 'Name', ResultType: 'simple' }]]);
    });

    it('reads no committee for an unknown organization and escapes the ID', () => {
        expect(StudioData.CommitteeParams(null).ExtraFilter).toBe('1 = 0');
        expect(StudioData.CommitteeParams("z' --").ExtraFilter).toBe("OrganizationID = 'z'' --'");
    });

    it('a failed read rejects with its message', async () => {
        const source = new StubSource(() => ({ ...rows([]), Success: false, ErrorMessage: 'Committees could not be read' }));
        await expect(new StudioData(source).Committees(COMMON_ORG)).rejects.toThrow('Committees could not be read');
    });
});

describe('StudioData.WithCommittee', () => {
    const listed: CommitteeRow[] = [
        { ID: 'C1', Name: 'Appeals Panel', Status: 'Active' },
        { ID: 'C3', Name: 'Standards Committee', Status: 'Inactive' },
    ];

    it('adds a created committee the list does not hold, in name order, as Active', () => {
        expect(StudioData.WithCommittee(listed, { ID: 'C2', Name: 'Ethics Committee' })).toEqual([
            listed[0],
            { ID: 'C2', Name: 'Ethics Committee', Status: 'Active' },
            listed[1],
        ]);
        expect(StudioData.WithCommittee([], { ID: 'C2', Name: 'Ethics Committee' })).toEqual([{ ID: 'C2', Name: 'Ethics Committee', Status: 'Active' }]);
    });

    it('leaves a list that already holds the committee as it was read, whatever the case of the ID', () => {
        expect(StudioData.WithCommittee(listed, { ID: 'c3', Name: 'Standards Committee' })).toEqual(listed);
    });
});
