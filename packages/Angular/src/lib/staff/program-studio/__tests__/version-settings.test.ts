import '@angular/compiler';
import { describe, expect, it, vi } from 'vitest';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { VersionSettingsRules, type VersionStatus } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingProgramVersionEntity } from '@mj-biz-apps/credentialing-entities';
import type { CommitteeRow } from '../studio-data';
import { StudioViewModel } from '../studio-view-model';
import { CommitteeCreatedSentence, NO_COMMITTEE_SENTENCE, VersionSettingsComponent } from '../version-settings.component';

function createComponent(): VersionSettingsComponent {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const injector = Injector.create({ providers: [{ provide: ChangeDetectorRef, useValue: cdr }] });
    return runInInjectionContext(injector, () => new VersionSettingsComponent());
}

/** The parts of a version the committee controls read and write. */
type VersionStub = Pick<mjBizAppsCredentialingProgramVersionEntity, 'Status' | 'CommitteeID'>;

/** A settings widget showing a version of `status` with no committee chosen. The stub stands in for the entity object. */
function withVersion(status: VersionStatus): { Component: VersionSettingsComponent; Version: VersionStub } {
    const version: VersionStub = { Status: status, CommitteeID: null };
    const component = createComponent();
    component.Version = version as mjBizAppsCredentialingProgramVersionEntity;
    return { Component: component, Version: version };
}

const LISTED: CommitteeRow[] = [{ ID: 'C1', Name: 'Appeals Panel', Status: 'Active' }];
const CREATED = { CommitteeID: 'c2', Name: 'Standards Committee' };
const CREATED_ROW: CommitteeRow = { ID: 'C2', Name: 'Standards Committee', Status: 'Active' };

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

    describe('New committee', () => {
        it('offers New committee on a Draft version only', () => {
            expect(withVersion('Draft').Component.ShowNewCommittee).toBe(true);
            expect(withVersion('Active').Component.ShowNewCommittee).toBe(false);
            expect(withVersion('Retired').Component.ShowNewCommittee).toBe(false);
            expect(createComponent().ShowNewCommittee).toBe(false);
        });

        it('points an organization with no committee at the button', () => {
            expect(NO_COMMITTEE_SENTENCE).toBe("This program's organization has no committee yet, so the version cannot be activated. Create one with New committee.");
            expect(createComponent().NoCommitteeSentence).toBe(NO_COMMITTEE_SENTENCE);
        });

        it('opens and closes the form; Cancel changes nothing else', () => {
            const { Component: c, Version: version } = withVersion('Draft');
            c.OpenCommitteeForm();
            expect(c.IsCommitteeFormOpen).toBe(true);
            c.CloseCommitteeForm();
            expect(c.IsCommitteeFormOpen).toBe(false);
            expect(version.CommitteeID).toBeNull();
            expect(c.CommitteeMessage).toBe('');
        });

        it('finds the created committee in a list by ID, ignoring case, and not before the list holds it', () => {
            expect(VersionSettingsComponent.CreatedIn(LISTED, CREATED)).toBeNull();
            expect(VersionSettingsComponent.CreatedIn([...LISTED, CREATED_ROW], CREATED)).toBe(CREATED_ROW);
            expect(VersionSettingsComponent.CreatedIn([...LISTED, CREATED_ROW], null)).toBeNull();
        });

        it('on creation closes the form and asks the page for the committees, choosing nothing yet', () => {
            const { Component: c, Version: version } = withVersion('Draft');
            c.Committees = LISTED;
            const emitted = vi.fn();
            c.CommitteeCreated.subscribe(emitted);
            c.OpenCommitteeForm();
            c.OnCommitteeCreated(CREATED);
            expect(c.IsCommitteeFormOpen).toBe(false);
            expect(emitted).toHaveBeenCalledWith(CREATED);
            expect(version.CommitteeID).toBeNull();
            expect(c.CommitteeMessage).toBe('');
        });

        it('chooses the new committee when the reloaded list arrives, with the ID as the list has it, and says so', () => {
            const { Component: c, Version: version } = withVersion('Draft');
            c.Committees = LISTED;
            c.OnCommitteeCreated(CREATED);
            c.Committees = [...LISTED, CREATED_ROW];
            expect(version.CommitteeID).toBe('C2');
            expect(c.CommitteeMessage).toBe('Standards Committee was created and selected. Save settings to keep it.');
            expect(CommitteeCreatedSentence('Standards Committee')).toBe(c.CommitteeMessage);
        });

        it('chooses it once: a later list does not choose it again over the user\'s own pick', () => {
            const { Component: c, Version: version } = withVersion('Draft');
            c.OnCommitteeCreated(CREATED);
            c.Committees = [...LISTED, CREATED_ROW];
            version.CommitteeID = 'C1';
            c.Committees = [...LISTED, CREATED_ROW];
            expect(version.CommitteeID).toBe('C1');
        });

        it('a list that arrives when nothing was created chooses nothing', () => {
            const { Component: c, Version: version } = withVersion('Draft');
            c.Committees = [...LISTED, CREATED_ROW];
            expect(version.CommitteeID).toBeNull();
            expect(c.CommitteeMessage).toBe('');
        });

        it('opening the form again clears the created-and-selected line', () => {
            const { Component: c } = withVersion('Draft');
            c.OnCommitteeCreated(CREATED);
            c.Committees = [CREATED_ROW];
            c.OpenCommitteeForm();
            expect(c.CommitteeMessage).toBe('');
        });
    });
});
