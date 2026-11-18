import { describe, expect, it } from 'vitest';
import { StudioViewModel } from '../studio-view-model';

describe('StudioViewModel', () => {
    it('a Draft can be authored and activated, and every settings tier is editable', () => {
        const vm = StudioViewModel.For({ Status: 'Draft' });
        expect(vm.CanAuthor).toBe(true);
        expect(vm.ShowActivate).toBe(true);
        expect(vm.ShowEditInDraft).toBe(false);
        expect(vm.ShowRetire).toBe(false);
        expect(vm.SettingsTierEditable).toEqual({ WorkflowToggles: true, PromotionThresholds: true, RolloutFlags: true });
    });

    it('an Active version is frozen: Edit in draft and Retire are offered and only the rollout flags are editable', () => {
        const vm = StudioViewModel.For({ Status: 'Active' });
        expect(vm.CanAuthor).toBe(false);
        expect(vm.ShowEditInDraft).toBe(true);
        expect(vm.ShowRetire).toBe(true);
        expect(vm.ShowActivate).toBe(false);
        expect(vm.SettingsTierEditable).toEqual({ WorkflowToggles: false, PromotionThresholds: false, RolloutFlags: true });
    });

    it('a Retired version offers only Edit in draft and nothing is editable', () => {
        const vm = StudioViewModel.For({ Status: 'Retired' });
        expect(vm.CanAuthor).toBe(false);
        expect(vm.ShowEditInDraft).toBe(true);
        expect(vm.ShowRetire).toBe(false);
        expect(vm.ShowActivate).toBe(false);
        expect(vm.SettingsTierEditable).toEqual({ WorkflowToggles: false, PromotionThresholds: false, RolloutFlags: false });
    });

    it('offers New committee on a Draft only, where the deciding committee can still be chosen', () => {
        expect(StudioViewModel.For({ Status: 'Draft' }).ShowNewCommittee).toBe(true);
        expect(StudioViewModel.For({ Status: 'Active' }).ShowNewCommittee).toBe(false);
        expect(StudioViewModel.For({ Status: 'Retired' }).ShowNewCommittee).toBe(false);
    });
});
