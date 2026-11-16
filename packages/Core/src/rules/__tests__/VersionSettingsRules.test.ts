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
});
