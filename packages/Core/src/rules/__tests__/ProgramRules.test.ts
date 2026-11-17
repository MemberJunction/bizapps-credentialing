import { describe, it, expect } from 'vitest';
import { ProgramRules } from '../ProgramRules.js';

describe('ProgramRules', () => {
    it('declares AccreditingOrganizationID as immutable', () => {
        expect(ProgramRules.ImmutableFields).toContain('AccreditingOrganizationID');
    });

    it('allows a new record to set AccreditingOrganizationID', () => {
        expect(ProgramRules.CanChangeFields(true, ['AccreditingOrganizationID', 'Name'])).toEqual({
            Allowed: true,
        });
    });

    it('refuses updating AccreditingOrganizationID on an existing program', () => {
        expect(ProgramRules.CanChangeFields(false, ['AccreditingOrganizationID'])).toEqual({
            Allowed: false,
            Reason: 'A program cannot be moved to another organization.',
        });
    });

    it('allows updating Name on an existing program', () => {
        expect(ProgramRules.CanChangeFields(false, ['Name'])).toEqual({
            Allowed: true,
        });
    });

    describe('CheckRequiredText', () => {
        const filled = { Name: 'Field Technician', CredentialPrefix: 'SFT', SubjectNoun: 'technician' };

        it('allows a program whose name, prefix and subject noun hold text', () => {
            expect(ProgramRules.CheckRequiredText(filled)).toEqual({ Allowed: true });
        });

        it('refuses a blank name, prefix or subject noun — empty, whitespace or missing — with its sentence', () => {
            for (const blank of ['', '   ', null, undefined]) {
                expect(ProgramRules.CheckRequiredText({ ...filled, Name: blank })).toEqual({ Allowed: false, Reason: "Enter the program's name." });
                expect(ProgramRules.CheckRequiredText({ ...filled, CredentialPrefix: blank })).toEqual({ Allowed: false, Reason: 'Enter the credential prefix.' });
                expect(ProgramRules.CheckRequiredText({ ...filled, SubjectNoun: blank })).toEqual({ Allowed: false, Reason: 'Enter the subject noun.' });
            }
        });

        it('reports the name first', () => {
            expect(ProgramRules.CheckRequiredText({ Name: ' ', CredentialPrefix: '', SubjectNoun: '' })).toEqual({ Allowed: false, Reason: "Enter the program's name." });
        });

        it('lists the fields the check reads', () => {
            expect(ProgramRules.RequiredTextFields).toEqual(['Name', 'CredentialPrefix', 'SubjectNoun']);
        });
    });
});
