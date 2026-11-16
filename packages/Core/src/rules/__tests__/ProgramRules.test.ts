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
});
