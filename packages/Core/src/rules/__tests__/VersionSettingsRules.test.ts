import { describe, it, expect } from 'vitest';
import { mjBizAppsCredentialingProgramVersionSchema } from '@mj-biz-apps/credentialing-entities';
import { VersionSettingsRules } from '../VersionSettingsRules.js';

/**
 * Fields on the generated ProgramVersion entity that are not version settings:
 * - Identity, lifecycle, and clone-lineage columns
 * - System audit timestamps managed by MJ
 * - Virtual/display fields projected from vwProgramVersions for related record names
 */
const NON_SETTINGS_FIELDS = [
    'ID',
    'ProgramID',
    'Label',
    'Status',
    'ActivatedAt',
    'RetiredAt',
    'ClonedFromVersionID',
    '__mj_CreatedAt',
    '__mj_UpdatedAt',
    'Program',
    'Committee',
] as const;

describe('VersionSettingsRules', () => {
    it('has disjoint field lists that together cover every settings column of ProgramVersion', () => {
        const toggles = VersionSettingsRules.WorkflowToggleFields;
        const thresholds = VersionSettingsRules.PromotionThresholdFields;
        const rollout = VersionSettingsRules.RolloutFlagFields;

        const allSettingsFields = [...toggles, ...thresholds, ...rollout];
        expect(new Set(allSettingsFields).size).toBe(allSettingsFields.length);

        const entityFields = Object.keys(mjBizAppsCredentialingProgramVersionSchema.shape);
        const nonSettingsSet = new Set<string>(NON_SETTINGS_FIELDS);
        const expectedSettingsFields = entityFields.filter((f) => !nonSettingsSet.has(f));

        expect(new Set(allSettingsFields)).toEqual(new Set(expectedSettingsFields));
    });

    describe('CanChangeFields', () => {
        it('allows Draft to change any setting field', () => {
            const allSettings = [
                ...VersionSettingsRules.WorkflowToggleFields,
                ...VersionSettingsRules.PromotionThresholdFields,
                ...VersionSettingsRules.RolloutFlagFields,
            ];
            for (const field of allSettings) {
                expect(VersionSettingsRules.CanChangeFields('Draft', [field])).toEqual({
                    Allowed: true,
                });
            }
            expect(VersionSettingsRules.CanChangeFields('Draft', allSettings)).toEqual({
                Allowed: true,
            });
        });

        it('allows Active to change each rollout flag', () => {
            for (const field of VersionSettingsRules.RolloutFlagFields) {
                expect(VersionSettingsRules.CanChangeFields('Active', [field])).toEqual({
                    Allowed: true,
                });
            }
            expect(
                VersionSettingsRules.CanChangeFields('Active', VersionSettingsRules.RolloutFlagFields)
            ).toEqual({ Allowed: true });
        });

        it('refuses Active changing each workflow toggle field', () => {
            for (const field of VersionSettingsRules.WorkflowToggleFields) {
                expect(VersionSettingsRules.CanChangeFields('Active', [field])).toEqual({
                    Allowed: false,
                    Reason: `${field} can only be changed on a Draft version. It defines what a review means for applications already in progress.`,
                });
            }
        });

        it('refuses Active changing each promotion threshold field', () => {
            for (const field of VersionSettingsRules.PromotionThresholdFields) {
                expect(VersionSettingsRules.CanChangeFields('Active', [field])).toEqual({
                    Allowed: false,
                    Reason: `${field} can only be changed on a Draft version. It defines what a review means for applications already in progress.`,
                });
            }
        });

        it('names the first offending field when multiple fields are changed on Active', () => {
            const result = VersionSettingsRules.CanChangeFields('Active', [
                'PromotionEnabled',
                'MinimumAgreeRate',
                'PeerReviewerCount',
            ]);
            expect(result).toEqual({
                Allowed: false,
                Reason: 'MinimumAgreeRate can only be changed on a Draft version. It defines what a review means for applications already in progress.',
            });
        });

        it('refuses Retired changing a workflow toggle field', () => {
            expect(VersionSettingsRules.CanChangeFields('Retired', ['PeerReviewerCount'])).toEqual({
                Allowed: false,
                Reason: 'PeerReviewerCount can only be changed on a Draft version. It defines what a review means for applications already in progress.',
            });
        });
    });

    describe('CheckRanges', () => {
        const valid = {
            PeerReviewerCount: 2,
            PassiveApprovalWindowDays: 10,
            MinimumAgreeRate: 0.95,
            MinimumObservations: 20,
            MinimumReviewers: 3,
            MinimumReplayFloor: 0.9,
        };

        it('allows values inside every range, the bounds included', () => {
            expect(VersionSettingsRules.CheckRanges(valid)).toEqual({ Allowed: true });
            expect(
                VersionSettingsRules.CheckRanges({
                    PeerReviewerCount: 0,
                    PassiveApprovalWindowDays: 1,
                    MinimumAgreeRate: 0,
                    MinimumObservations: 1,
                    MinimumReviewers: 1,
                    MinimumReplayFloor: 1,
                }),
            ).toEqual({ Allowed: true });
        });

        it('refuses each value outside its range with a sentence that uses the on-screen label', () => {
            const cases: Array<[Partial<typeof valid>, string]> = [
                [{ PeerReviewerCount: -1 }, 'Peer reviewers per application cannot be negative.'],
                [{ PassiveApprovalWindowDays: 0 }, 'Passive approval window must be at least 1 day.'],
                [{ MinimumObservations: 0 }, 'Minimum observations must be at least 1.'],
                [{ MinimumReviewers: 0 }, 'Minimum reviewers must be at least 1.'],
                [{ MinimumAgreeRate: 1.01 }, 'Minimum agree rate must be between 0 and 1.'],
                [{ MinimumAgreeRate: -0.1 }, 'Minimum agree rate must be between 0 and 1.'],
                [{ MinimumReplayFloor: 2 }, 'Minimum replay agreement must be between 0 and 1.'],
            ];
            for (const [change, reason] of cases) {
                expect(VersionSettingsRules.CheckRanges({ ...valid, ...change })).toEqual({ Allowed: false, Reason: reason });
            }
        });

        it('refuses a missing value by naming the setting', () => {
            expect(VersionSettingsRules.CheckRanges({ ...valid, PeerReviewerCount: null })).toEqual({
                Allowed: false,
                Reason: 'Enter a value for Peer reviewers per application.',
            });
            expect(VersionSettingsRules.CheckRanges({ ...valid, MinimumReplayFloor: undefined })).toEqual({
                Allowed: false,
                Reason: 'Enter a value for Minimum replay agreement.',
            });
            expect(VersionSettingsRules.CheckRanges({ ...valid, MinimumObservations: Number.NaN })).toEqual({
                Allowed: false,
                Reason: 'Enter a value for Minimum observations.',
            });
        });

        it('reports the first problem in screen order, with its field', () => {
            expect(VersionSettingsRules.FirstRangeProblem({ ...valid, MinimumReviewers: 0, PassiveApprovalWindowDays: 0 })).toEqual({
                Field: 'PassiveApprovalWindowDays',
                Reason: 'Passive approval window must be at least 1 day.',
            });
            expect(VersionSettingsRules.FirstRangeProblem(valid)).toBeNull();
        });

        it('finds the setting a range sentence is about, and none for any other text', () => {
            for (const field of VersionSettingsRules.NumberSettingFields) {
                expect(VersionSettingsRules.NumberSettingFor(VersionSettingsRules.NumberRanges[field].OutOfRangeReason)).toBe(field);
                expect(VersionSettingsRules.NumberSettingFor(VersionSettingsRules.MissingValueReason(field))).toBe(field);
            }
            expect(VersionSettingsRules.NumberSettingFor('Choose the deciding committee before activating this version.')).toBeNull();
        });

        it('has a range for every number setting and a label for every setting', () => {
            const settings = [
                ...VersionSettingsRules.WorkflowToggleFields,
                ...VersionSettingsRules.PromotionThresholdFields,
                ...VersionSettingsRules.RolloutFlagFields,
            ];
            expect(Object.keys(VersionSettingsRules.Labels).sort()).toEqual([...settings].sort());
            expect(Object.keys(VersionSettingsRules.NumberRanges).sort()).toEqual([...VersionSettingsRules.NumberSettingFields].sort());
            // The lower bounds are the database CHECK constraints.
            expect(VersionSettingsRules.NumberRanges.PeerReviewerCount.Min).toBe(0);
            expect(VersionSettingsRules.NumberRanges.PassiveApprovalWindowDays.Min).toBe(1);
            expect(VersionSettingsRules.NumberRanges.MinimumObservations.Min).toBe(1);
            expect(VersionSettingsRules.NumberRanges.MinimumReviewers.Min).toBe(1);
        });
    });
});
