import { describe, it, expect } from 'vitest';
import { NOT_FOUND_REASON, RequiredTextRule, STALE_RECORD_REASON } from '../RuleResult.js';

describe('shared refusal sentences', () => {
    it('are the sentences users read', () => {
        expect(NOT_FOUND_REASON).toBe('Record not found.');
        expect(STALE_RECORD_REASON).toBe('This record was changed by someone else. Reload it and try again.');
    });
});

describe('RequiredTextRule', () => {
    it('treats missing, empty and whitespace-only text as blank', () => {
        for (const blank of [null, undefined, '', ' ', '    ', '\t\n']) {
            expect(RequiredTextRule.IsBlank(blank)).toBe(true);
        }
        expect(RequiredTextRule.IsBlank(' a ')).toBe(false);
    });

    it('refuses with the reason of the first blank entry', () => {
        expect(RequiredTextRule.FirstBlank([{ Value: 'a', Reason: 'first' }, { Value: ' ', Reason: 'second' }, { Value: '', Reason: 'third' }])).toEqual({
            Allowed: false,
            Reason: 'second',
        });
        expect(RequiredTextRule.FirstBlank([{ Value: 'a', Reason: 'first' }])).toEqual({ Allowed: true });
    });
});
