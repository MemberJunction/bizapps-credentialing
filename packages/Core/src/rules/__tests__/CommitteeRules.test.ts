import { describe, it, expect } from 'vitest';
import { CommitteeRules } from '../CommitteeRules.js';

const NAME_SENTENCE = "Enter the committee's name.";
const TYPE_SENTENCE = 'Choose a committee type.';

describe('CommitteeRules', () => {
    describe('NormalizeName', () => {
        it('trims the name and collapses inner whitespace to one space', () => {
            expect(CommitteeRules.NormalizeName('  Standards \t  Review   Committee \n')).toBe('Standards Review Committee');
        });

        it('gives an empty name for missing text', () => {
            expect(CommitteeRules.NormalizeName(null)).toBe('');
            expect(CommitteeRules.NormalizeName(undefined)).toBe('');
        });
    });

    describe('CheckName', () => {
        it('allows a name that holds text', () => {
            expect(CommitteeRules.CheckName('Standards Committee')).toEqual({ Allowed: true });
        });

        it('refuses a blank name — empty, whitespace or missing — with its sentence', () => {
            for (const blank of ['', '   ', '\t\n', null, undefined]) {
                expect(CommitteeRules.CheckName(blank)).toEqual({ Allowed: false, Reason: NAME_SENTENCE });
            }
            expect(CommitteeRules.NameRequiredReason).toBe(NAME_SENTENCE);
        });
    });

    describe('CheckType', () => {
        it('allows a type that exists and refuses one that does not with its sentence', () => {
            expect(CommitteeRules.CheckType(true)).toEqual({ Allowed: true });
            expect(CommitteeRules.CheckType(false)).toEqual({ Allowed: false, Reason: TYPE_SENTENCE });
            expect(CommitteeRules.TypeRequiredReason).toBe(TYPE_SENTENCE);
        });
    });

    describe('CheckUnique', () => {
        const existing = ['Standards Committee', 'Appeals  Panel '];

        it('allows a name no committee of the organization has', () => {
            expect(CommitteeRules.CheckUnique('Ethics Committee', existing)).toEqual({ Allowed: true });
            expect(CommitteeRules.CheckUnique('Ethics Committee', [])).toEqual({ Allowed: true });
        });

        it('refuses the same name with the sentence naming it', () => {
            expect(CommitteeRules.CheckUnique('Standards Committee', existing)).toEqual({
                Allowed: false,
                Reason: 'A committee named Standards Committee already exists for this organization.',
            });
        });

        it('refuses a name that differs only by case or spaces, naming it as it would be stored', () => {
            expect(CommitteeRules.CheckUnique('  STANDARDS   committee ', existing)).toEqual({
                Allowed: false,
                Reason: 'A committee named STANDARDS committee already exists for this organization.',
            });
            expect(CommitteeRules.CheckUnique('appeals panel', existing)).toEqual({
                Allowed: false,
                Reason: 'A committee named appeals panel already exists for this organization.',
            });
        });
    });

    describe('FieldFor', () => {
        it('places the blank-name and duplicate-name sentences beside the name', () => {
            expect(CommitteeRules.FieldFor(NAME_SENTENCE)).toBe('Name');
            expect(CommitteeRules.FieldFor(CommitteeRules.DuplicateNameReason('Standards Committee'))).toBe('Name');
            expect(CommitteeRules.FieldFor(`Refused: ${CommitteeRules.DuplicateNameReason('A already exists B')}`)).toBe('Name');
        });

        it('places the type sentence beside the type', () => {
            expect(CommitteeRules.FieldFor(TYPE_SENTENCE)).toBe('CommitteeTypeID');
        });

        it('places any other text under the form', () => {
            expect(CommitteeRules.FieldFor('Record not found.')).toBeNull();
            expect(CommitteeRules.FieldFor('already exists for this organization.')).toBeNull();
            expect(CommitteeRules.FieldFor('')).toBeNull();
        });
    });
});
