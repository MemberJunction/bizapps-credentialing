import { describe, expect, it } from 'vitest';
import type { SectionRow, StandardRow } from '../studio-data';
import { StudioTree } from '../studio-tree';
import { StudioViewModel } from '../studio-view-model';

const V1 = 'V1111111-1111-1111-1111-111111111111';
const V2 = 'V2222222-2222-2222-2222-222222222222';

function section(id: string, number: string, sequence: number, versionID = V1): SectionRow {
    return { ID: id, ProgramVersionID: versionID, Number: number, Name: `Section ${number}`, Description: null, Sequence: sequence };
}

function standard(id: string, sectionID: string, code: string, sequence: number): StandardRow {
    return {
        ID: id, SectionID: sectionID, ProgramVersionID: V1, Code: code, Statement: `Statement ${code}`, ResponseType: 'Attestation',
        IntakeMode: 'Manual', EvaluationMode: 'Human Only', IsInterpretive: false, IsEligibility: false, Sequence: sequence,
    };
}

describe('StudioTree.Build', () => {
    it('keeps only the version, orders by Sequence and breaks ties in natural order', () => {
        const sections = [section('S2', '2', 2), section('S1', '1', 1), section('SX', '1', 1, V2)];
        const standards = [standard('A', 'S1', '1.10', 0), standard('B', 'S1', '1.2', 0), standard('C', 'S1', '1.1', 5), standard('D', 'S2', '2.1', 0)];
        const tree = StudioTree.Build(V1.toLowerCase(), sections, standards);
        expect(tree.map((n) => n.Section.ID)).toEqual(['S1', 'S2']);
        expect(tree[0].Standards.map((s) => s.Code)).toEqual(['1.2', '1.10', '1.1']);
        expect(tree[1].Standards.map((s) => s.Code)).toEqual(['2.1']);
    });
});

describe('StudioTree.Move', () => {
    it('renumbers the siblings in the new order and returns only the rows whose Sequence changed', () => {
        const rows = [{ ID: 'a', Sequence: 1 }, { ID: 'b', Sequence: 2 }, { ID: 'c', Sequence: 3 }];
        expect(StudioTree.Move(rows, 'c', -1)).toEqual([{ ID: 'c', Sequence: 2 }, { ID: 'b', Sequence: 3 }]);
        expect(StudioTree.Move(rows, 'A', 1)).toEqual([{ ID: 'b', Sequence: 1 }, { ID: 'a', Sequence: 2 }]);
    });

    it('numbers every sibling when the stored sequences tie', () => {
        const rows = [{ ID: 'a', Sequence: 0 }, { ID: 'b', Sequence: 0 }, { ID: 'c', Sequence: 0 }];
        expect(StudioTree.Move(rows, 'b', 1)).toEqual([{ ID: 'a', Sequence: 1 }, { ID: 'c', Sequence: 2 }, { ID: 'b', Sequence: 3 }]);
    });

    it('returns nothing for a move past either end or an unknown row', () => {
        const rows = [{ ID: 'a', Sequence: 1 }, { ID: 'b', Sequence: 2 }];
        expect(StudioTree.Move(rows, 'a', -1)).toEqual([]);
        expect(StudioTree.Move(rows, 'b', 1)).toEqual([]);
        expect(StudioTree.Move(rows, 'z', 1)).toEqual([]);
    });
});

describe('StudioTree helpers', () => {
    it('NextSequence is one past the largest', () => {
        expect(StudioTree.NextSequence([])).toBe(1);
        expect(StudioTree.NextSequence([{ ID: 'a', Sequence: 4 }, { ID: 'b', Sequence: 2 }])).toBe(5);
    });

    it('places a refusal beside the field it names', () => {
        expect(StudioTree.StandardFieldFor('Standard code 1.1 is already used in this version.')).toBe('Code');
        expect(StudioTree.StandardFieldFor('An interpretive standard is always reviewed by people.')).toBe('IsInterpretive');
        expect(StudioTree.StandardFieldFor('Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.')).toBe('Form');
        expect(StudioTree.StandardFieldFor('Record not found.')).toBe('Form');
    });

    it('places a duplicate section number beside the Number field and anything else on the form', () => {
        expect(StudioTree.SectionFieldFor('Section number 1 is already used in this version.')).toBe('Number');
        expect(StudioTree.SectionFieldFor("Remove this section's standards before deleting it.")).toBe('Form');
    });

    it('places each required-text refusal beside the field it names', () => {
        expect(StudioTree.StandardFieldFor("Enter the standard's code.")).toBe('Code');
        expect(StudioTree.StandardFieldFor("Enter the standard's statement.")).toBe('Statement');
        expect(StudioTree.SectionFieldFor("Enter the section's number.")).toBe('Number');
        expect(StudioTree.SectionFieldFor("Enter the section's name.")).toBe('Name');
        expect(StudioTree.SectionFieldFor('Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.')).toBe('Form');
        expect(StudioTree.RequirementFieldFor("Enter the document's name.")).toBe('Name');
        expect(StudioTree.RequirementFieldFor('A document requirement named Charter already exists in this version.')).toBe('Name');
        expect(StudioTree.RequirementFieldFor('This record was changed by someone else. Reload it and try again.')).toBe('Form');
    });
});

describe('StudioViewModel.PickVersion', () => {
    const versions = [
        { ID: 'R1', Status: 'Retired' as const },
        { ID: 'A1', Status: 'Active' as const },
        { ID: 'D1', Status: 'Draft' as const },
    ];

    it('takes the requested version when the program has it, ignoring case', () => {
        expect(StudioViewModel.PickVersion(versions, 'r1')?.ID).toBe('R1');
    });

    it('otherwise the Draft, then the Active version, then the first', () => {
        expect(StudioViewModel.PickVersion(versions, 'not-there')?.ID).toBe('D1');
        expect(StudioViewModel.PickVersion(versions.slice(0, 2), null)?.ID).toBe('A1');
        expect(StudioViewModel.PickVersion(versions.slice(0, 1), null)?.ID).toBe('R1');
        expect(StudioViewModel.PickVersion([], null)).toBeNull();
    });
});

describe('StudioTree.ToggleSelection', () => {
    it('opens the clicked standard when none is open', () => {
        expect(StudioTree.ToggleSelection(null, 'A1')).toBe('A1');
    });
    it('switches to another standard', () => {
        expect(StudioTree.ToggleSelection('A1', 'B2')).toBe('B2');
    });
    it('closes the standard that is already open, whatever the case of its ID', () => {
        expect(StudioTree.ToggleSelection('ab-12', 'AB-12')).toBeNull();
    });
});
