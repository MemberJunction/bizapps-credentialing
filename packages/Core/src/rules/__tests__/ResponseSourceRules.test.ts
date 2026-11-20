import { describe, it, expect } from 'vitest';
import { NOT_FOUND_REASON } from '../RuleResult.js';
import { StandardAuthoringRules } from '../StandardAuthoringRules.js';
import { ResponseSourceRules, type SourceDraft } from '../ResponseSourceRules.js';

const validSources: readonly SourceDraft[] = [
    { DocumentRequirementID: 'req-1', Mode: 'Prefill Only' },
    { DocumentRequirementID: 'req-2', Mode: 'Both' },
];

describe('ResponseSourceRules', () => {
    describe('Validate', () => {
        it('allows valid sources on a Draft Locate or Prefill standard', () => {
            expect(
                ResponseSourceRules.Validate(validSources, { IntakeMode: 'Prefill' }, 'Draft', [
                    'req-1',
                    'req-2',
                ])
            ).toEqual({ Allowed: true });

            expect(
                ResponseSourceRules.Validate([], { IntakeMode: 'Manual' }, 'Draft', ['req-1'])
            ).toEqual({ Allowed: true });
        });

        it('refuses non-Draft versions with StandardAuthoringRules tree-edit sentence', () => {
            expect(
                ResponseSourceRules.Validate(validSources, { IntakeMode: 'Prefill' }, 'Active', [
                    'req-1',
                    'req-2',
                ])
            ).toEqual(StandardAuthoringRules.CanEditTree('Active'));

            expect(
                ResponseSourceRules.Validate(validSources, { IntakeMode: 'Prefill' }, 'Retired', [
                    'req-1',
                    'req-2',
                ])
            ).toEqual(StandardAuthoringRules.CanEditTree('Retired'));
        });

        it('refuses any source on a Manual standard', () => {
            expect(
                ResponseSourceRules.Validate(
                    [{ DocumentRequirementID: 'req-1', Mode: 'Prefill Only' }],
                    { IntakeMode: 'Manual' },
                    'Draft',
                    ['req-1']
                )
            ).toEqual({ Allowed: false, Reason: 'Manual standards have no sources.' });
        });

        it('refuses a requirement not belonging to the standard version with NOT_FOUND_REASON', () => {
            expect(
                ResponseSourceRules.Validate(
                    [{ DocumentRequirementID: 'req-other', Mode: 'Prefill Only' }],
                    { IntakeMode: 'Locate' },
                    'Draft',
                    ['req-1', 'req-2']
                )
            ).toEqual({ Allowed: false, Reason: NOT_FOUND_REASON });

            expect(
                ResponseSourceRules.Validate(
                    [{ DocumentRequirementID: null, Mode: 'Prefill Only' }],
                    { IntakeMode: 'Locate' },
                    'Draft',
                    ['req-1']
                )
            ).toEqual({ Allowed: false, Reason: NOT_FOUND_REASON });
        });

        it('refuses the same requirement listed twice (case-insensitive UUID match)', () => {
            const reqUuid = '11111111-1111-1111-1111-111111111111';
            expect(
                ResponseSourceRules.Validate(
                    [
                        { DocumentRequirementID: reqUuid, Mode: 'Prefill Only' },
                        { DocumentRequirementID: reqUuid.toUpperCase(), Mode: 'Verify Only' },
                    ],
                    { IntakeMode: 'Prefill' },
                    'Draft',
                    [reqUuid]
                )
            ).toEqual({
                Allowed: false,
                Reason: 'This document is already a source for this standard.',
            });
        });
    });
});
