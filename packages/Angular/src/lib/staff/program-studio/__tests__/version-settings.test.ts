import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { VersionSettingsRules } from '@mj-biz-apps/credentialing-core';
import { StudioViewModel } from '../studio-view-model';
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

    it('labels each setting with the label the range sentences name it by', () => {
        for (const group of VersionSettingsComponent.Groups) {
            for (const setting of group.Settings) {
                expect(setting.Label).toBe(VersionSettingsRules.Labels[setting.Field]);
            }
        }
        expect(VersionSettingsRules.NumberRanges.PassiveApprovalWindowDays.OutOfRangeReason.startsWith(VersionSettingsRules.Labels.PassiveApprovalWindowDays)).toBe(true);
    });

    it('says above each tier what is true of it for a Draft, an Active and a Retired version', () => {
        const [toggles, thresholds, rollout] = VersionSettingsComponent.Groups;
        const frozen = 'These settings define what a review means for applications already in progress, so they can only be changed on a Draft version.';
        const notes = (status: 'Draft' | 'Active' | 'Retired'): string[] => {
            const editable = StudioViewModel.For({ Status: status }).SettingsTierEditable;
            return [toggles, thresholds, rollout].map((g) => VersionSettingsComponent.NoteFor(g, editable));
        };
        expect(notes('Draft')).toEqual(['Fixed once the version is activated.', 'Fixed once the version is activated.', 'These flags change only what happens next.']);
        expect(notes('Active')).toEqual([frozen, frozen, 'These flags change only what happens next.']);
        expect(notes('Retired')).toEqual([frozen, frozen, 'A retired version cannot be changed.']);
    });
});
