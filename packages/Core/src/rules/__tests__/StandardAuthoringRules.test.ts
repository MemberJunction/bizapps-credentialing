import { describe, it, expect } from 'vitest';
import { StandardAuthoringRules } from '../StandardAuthoringRules.js';

describe('StandardAuthoringRules', () => {
    describe('NormalizeCode', () => {
        it('trims surrounding whitespace', () => {
            expect(StandardAuthoringRules.NormalizeCode(' 1.1 ')).toBe('1.1');
            expect(StandardAuthoringRules.NormalizeCode('\t2.3A\n')).toBe('2.3A');
        });
    });

    describe('CodesCollide', () => {
        it('treats codes differing only in case or surrounding whitespace as colliding', () => {
            expect(StandardAuthoringRules.CodesCollide('1.1A', '1.1a')).toBe(true);
            expect(StandardAuthoringRules.CodesCollide(' 1.1', '1.1 ')).toBe(true);
        });

        it('treats distinct codes as non-colliding', () => {
            expect(StandardAuthoringRules.CodesCollide('1.1', '1.10')).toBe(false);
        });
    });

    describe('CanEditTree', () => {
        const treeEditReason =
            'Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.';

        it('allows Draft versions', () => {
            expect(StandardAuthoringRules.CanEditTree('Draft')).toEqual({ Allowed: true });
        });

        it('refuses Active and Retired versions', () => {
            expect(StandardAuthoringRules.CanEditTree('Active')).toEqual({
                Allowed: false,
                Reason: treeEditReason,
            });
            expect(StandardAuthoringRules.CanEditTree('Retired')).toEqual({
                Allowed: false,
                Reason: treeEditReason,
            });
        });
    });

    describe('CanSaveStandard', () => {
        const treeEditReason =
            'Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.';
        const evalModeReason =
            'Evaluation mode cannot be edited here. It changes only through the Trust screen.';
        const interpretiveReason =
            'An interpretive standard is always reviewed by people.';

        it('allows creating a new standard on Draft with Human Only', () => {
            expect(
                StandardAuthoringRules.CanSaveStandard({
                    IsNew: true,
                    IsVersionClone: false,
                    VersionStatus: 'Draft',
                    ChangedFields: ['SectionID', 'ProgramVersionID', 'Code', 'Statement', 'EvaluationMode'],
                    EvaluationMode: 'Human Only',
                    IsInterpretive: false,
                })
            ).toEqual({ Allowed: true });
        });

        it('refuses creating a new standard with AI Assisted when not a version clone', () => {
            expect(
                StandardAuthoringRules.CanSaveStandard({
                    IsNew: true,
                    IsVersionClone: false,
                    VersionStatus: 'Draft',
                    ChangedFields: ['SectionID', 'ProgramVersionID', 'Code', 'EvaluationMode'],
                    EvaluationMode: 'AI Assisted',
                    IsInterpretive: false,
                })
            ).toEqual({ Allowed: false, Reason: evalModeReason });
        });

        it('refuses updating EvaluationMode on an existing standard', () => {
            expect(
                StandardAuthoringRules.CanSaveStandard({
                    IsNew: false,
                    IsVersionClone: false,
                    VersionStatus: 'Draft',
                    ChangedFields: ['EvaluationMode'],
                    EvaluationMode: 'AI Assisted',
                    IsInterpretive: false,
                })
            ).toEqual({ Allowed: false, Reason: evalModeReason });
        });

        it('refuses updating SectionID or ProgramVersionID on an existing standard', () => {
            expect(
                StandardAuthoringRules.CanSaveStandard({
                    IsNew: false,
                    IsVersionClone: false,
                    VersionStatus: 'Draft',
                    ChangedFields: ['SectionID'],
                    EvaluationMode: 'Human Only',
                    IsInterpretive: false,
                })
            ).toEqual({
                Allowed: false,
                Reason: 'A standard cannot be moved to another section.',
            });

            expect(
                StandardAuthoringRules.CanSaveStandard({
                    IsNew: false,
                    IsVersionClone: false,
                    VersionStatus: 'Draft',
                    ChangedFields: ['ProgramVersionID'],
                    EvaluationMode: 'Human Only',
                    IsInterpretive: false,
                })
            ).toEqual({
                Allowed: false,
                Reason: 'A standard cannot be moved to another version.',
            });
        });

        it('refuses an interpretive standard with EvaluationMode other than Human Only', () => {
            expect(
                StandardAuthoringRules.CanSaveStandard({
                    IsNew: false,
                    IsVersionClone: false,
                    VersionStatus: 'Draft',
                    ChangedFields: ['IsInterpretive'],
                    EvaluationMode: 'AI Assisted',
                    IsInterpretive: true,
                })
            ).toEqual({ Allowed: false, Reason: interpretiveReason });
        });

        it('refuses any save on Active with the tree-edit sentence first', () => {
            expect(
                StandardAuthoringRules.CanSaveStandard({
                    IsNew: false,
                    IsVersionClone: false,
                    VersionStatus: 'Active',
                    ChangedFields: ['SectionID', 'EvaluationMode'],
                    EvaluationMode: 'AI Assisted',
                    IsInterpretive: true,
                })
            ).toEqual({ Allowed: false, Reason: treeEditReason });
        });

        it('allows a new version clone with AI Assisted when not interpretive', () => {
            expect(
                StandardAuthoringRules.CanSaveStandard({
                    IsNew: true,
                    IsVersionClone: true,
                    VersionStatus: 'Draft',
                    ChangedFields: ['SectionID', 'ProgramVersionID', 'EvaluationMode'],
                    EvaluationMode: 'AI Assisted',
                    IsInterpretive: false,
                })
            ).toEqual({ Allowed: true });
        });

        it('refuses a new version clone that is interpretive with AI Assisted', () => {
            expect(
                StandardAuthoringRules.CanSaveStandard({
                    IsNew: true,
                    IsVersionClone: true,
                    VersionStatus: 'Draft',
                    ChangedFields: ['SectionID', 'ProgramVersionID', 'EvaluationMode', 'IsInterpretive'],
                    EvaluationMode: 'AI Assisted',
                    IsInterpretive: true,
                })
            ).toEqual({ Allowed: false, Reason: interpretiveReason });
        });

        it('ignores IsVersionClone on update and refuses changing EvaluationMode', () => {
            expect(
                StandardAuthoringRules.CanSaveStandard({
                    IsNew: false,
                    IsVersionClone: true,
                    VersionStatus: 'Draft',
                    ChangedFields: ['EvaluationMode'],
                    EvaluationMode: 'AI Assisted',
                    IsInterpretive: false,
                })
            ).toEqual({ Allowed: false, Reason: evalModeReason });
        });
    });

    describe('required text', () => {
        const blanks = ['', '    ', '\t\n', null, undefined];

        it("refuses a standard's blank code, then its blank statement, with the sentences", () => {
            expect(StandardAuthoringRules.CheckStandardText({ Code: '1.1', Statement: 'The applicant has a policy.' })).toEqual({ Allowed: true });
            for (const blank of blanks) {
                expect(StandardAuthoringRules.CheckStandardText({ Code: blank, Statement: 'x' })).toEqual({ Allowed: false, Reason: "Enter the standard's code." });
                expect(StandardAuthoringRules.CheckStandardText({ Code: '1.1', Statement: blank })).toEqual({ Allowed: false, Reason: "Enter the standard's statement." });
            }
            expect(StandardAuthoringRules.CheckStandardText({ Code: ' ', Statement: ' ' })).toEqual({ Allowed: false, Reason: "Enter the standard's code." });
        });

        it("refuses a section's blank number, then its blank name, with the sentences", () => {
            expect(StandardAuthoringRules.CheckSectionText({ Number: '1', Name: 'Governance' })).toEqual({ Allowed: true });
            for (const blank of blanks) {
                expect(StandardAuthoringRules.CheckSectionText({ Number: blank, Name: 'x' })).toEqual({ Allowed: false, Reason: "Enter the section's number." });
                expect(StandardAuthoringRules.CheckSectionText({ Number: '1', Name: blank })).toEqual({ Allowed: false, Reason: "Enter the section's name." });
            }
        });

        it("refuses a document requirement's blank name with the sentence", () => {
            expect(StandardAuthoringRules.CheckDocumentRequirementText({ Name: 'Charter' })).toEqual({ Allowed: true });
            for (const blank of blanks) {
                expect(StandardAuthoringRules.CheckDocumentRequirementText({ Name: blank })).toEqual({ Allowed: false, Reason: "Enter the document's name." });
            }
        });
    });
});
