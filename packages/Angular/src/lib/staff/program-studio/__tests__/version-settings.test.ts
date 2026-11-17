import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { VersionSettingsRules } from '@mj-biz-apps/credentialing-core';
import { VersionSettingsComponent } from '../version-settings.component';

describe('VersionSettingsComponent', () => {
    it('has three groups, which list exactly the fields of the three settings tiers, in order', () => {
        const groups = VersionSettingsComponent.Groups;
        expect(groups.map((g) => g.Tier)).toEqual(['WorkflowToggles', 'PromotionThresholds', 'RolloutFlags']);
        expect(groups[0].Settings.map((s) => s.Field)).toEqual([...VersionSettingsRules.WorkflowToggleFields]);
        expect(groups[1].Settings.map((s) => s.Field)).toEqual([...VersionSettingsRules.PromotionThresholdFields]);
        expect(groups[2].Settings.map((s) => s.Field)).toEqual([...VersionSettingsRules.RolloutFlagFields]);
    });

    it('every setting has a visible label and each group a heading', () => {
        for (const group of VersionSettingsComponent.Groups) {
            expect(group.Heading.trim().length).toBeGreaterThan(0);
            for (const setting of group.Settings) {
                expect(setting.Label.trim().length).toBeGreaterThan(0);
            }
        }
    });
});
