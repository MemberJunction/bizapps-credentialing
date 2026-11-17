/**
 * A version's settings in their three tiers (FRD FR-2.6, the B1 subset).
 *
 * Workflow toggles and promotion thresholds define what a review means for applications already in
 * progress, so they are editable only on a Draft; rollout flags change only what happens next, so
 * they stay editable on an Active version. Which tier is editable comes from {@link StudioViewModel};
 * the server guard decides every save. A save is one `Save()` of the version; a refusal is shown,
 * verbatim, beside the Save button.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { MJButtonDirective, MJDropdownComponent, MJNumericInputComponent, MJSwitchComponent } from '@memberjunction/ng-ui-components';
import { VersionSettingsRules } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingProgramVersionEntity } from '@mj-biz-apps/credentialing-entities';
import type { CommitteeRow } from './studio-data';
import { StudioViewModel, type SettingsTierEditable } from './studio-view-model';

type VersionField = keyof mjBizAppsCredentialingProgramVersionEntity;
type IntegerField = Extract<VersionField, 'PeerReviewerCount' | 'PassiveApprovalWindowDays' | 'MinimumObservations' | 'MinimumReviewers'>;
type RateField = Extract<VersionField, 'MinimumAgreeRate' | 'MinimumReplayFloor'>;
type FlagField = Extract<
    VersionField,
    'RequiresScreening' | 'RequiresExecutiveApproval' | 'RequiresGoverningBodyAttestation' | 'AgentObservationsVisibleToReviewers' | 'PromotionEnabled' | 'AutoCarryForwardOnRenewal'
>;

/** One setting on screen: which column it edits, how, and its label. */
export type SettingDescriptor =
    | { Kind: 'integer'; Field: IntegerField; Label: string; Unit: string }
    | { Kind: 'rate'; Field: RateField; Label: string }
    | { Kind: 'flag'; Field: FlagField; Label: string }
    | { Kind: 'committee'; Field: Extract<VersionField, 'CommitteeID'>; Label: string };

export type SettingsTier = keyof SettingsTierEditable;

/** A labelled group of settings: one tier. */
export interface SettingsGroup {
    Tier: SettingsTier;
    Heading: string;
    /** Shown above a tier that cannot be edited on this version. */
    FrozenNote: string;
    Settings: SettingDescriptor[];
}

/** The sentence over the two tiers that freeze when a version is activated. */
export const FROZEN_SETTINGS_SENTENCE = 'These settings define what a review means for applications already in progress, so they can only be changed on a Draft version.';
/** The sentence over the rollout flags. */
export const ROLLOUT_FLAGS_SENTENCE = 'These flags change only what happens next.';

const DESCRIPTORS: Readonly<Record<string, SettingDescriptor>> = {
    PeerReviewerCount: { Kind: 'integer', Field: 'PeerReviewerCount', Label: 'Peer reviewers per application', Unit: 'reviewers' },
    PassiveApprovalWindowDays: { Kind: 'integer', Field: 'PassiveApprovalWindowDays', Label: 'Passive approval window', Unit: 'days' },
    RequiresScreening: { Kind: 'flag', Field: 'RequiresScreening', Label: 'Staff screen applications before review' },
    RequiresExecutiveApproval: { Kind: 'flag', Field: 'RequiresExecutiveApproval', Label: 'Executive approves decisions' },
    RequiresGoverningBodyAttestation: { Kind: 'flag', Field: 'RequiresGoverningBodyAttestation', Label: "Applicant's governing body attests" },
    CommitteeID: { Kind: 'committee', Field: 'CommitteeID', Label: 'Deciding committee' },
    MinimumAgreeRate: { Kind: 'rate', Field: 'MinimumAgreeRate', Label: 'Minimum agree rate' },
    MinimumObservations: { Kind: 'integer', Field: 'MinimumObservations', Label: 'Minimum observations', Unit: 'findings' },
    MinimumReviewers: { Kind: 'integer', Field: 'MinimumReviewers', Label: 'Minimum reviewers', Unit: 'reviewers' },
    MinimumReplayFloor: { Kind: 'rate', Field: 'MinimumReplayFloor', Label: 'Minimum replay agreement' },
    AgentObservationsVisibleToReviewers: { Kind: 'flag', Field: 'AgentObservationsVisibleToReviewers', Label: 'Reviewers see AI observations' },
    PromotionEnabled: { Kind: 'flag', Field: 'PromotionEnabled', Label: 'Standards may be promoted' },
    AutoCarryForwardOnRenewal: { Kind: 'flag', Field: 'AutoCarryForwardOnRenewal', Label: 'Renewals start from the previous answers' },
};

function group(tier: SettingsTier, heading: string, frozenNote: string, fields: readonly string[]): SettingsGroup {
    return { Tier: tier, Heading: heading, FrozenNote: frozenNote, Settings: fields.map((f) => DESCRIPTORS[f]) };
}

@Component({
    standalone: true,
    selector: 'bizapps-cred-version-settings',
    imports: [FormsModule, MJButtonDirective, MJDropdownComponent, MJNumericInputComponent, MJSwitchComponent],
    templateUrl: './version-settings.component.html',
    styleUrls: ['./version-settings.component.scss'],
})
export class VersionSettingsComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);

    /** The three tiers, each listing exactly its `VersionSettingsRules` fields, in order. */
    public static readonly Groups: readonly SettingsGroup[] = [
        group('WorkflowToggles', 'Workflow toggles', FROZEN_SETTINGS_SENTENCE, VersionSettingsRules.WorkflowToggleFields),
        group('PromotionThresholds', 'Promotion thresholds', FROZEN_SETTINGS_SENTENCE, VersionSettingsRules.PromotionThresholdFields),
        group('RolloutFlags', 'Rollout flags', ROLLOUT_FLAGS_SENTENCE, VersionSettingsRules.RolloutFlagFields),
    ];

    /** The version whose settings are shown; edited in place and saved as one record. */
    @Input() Version: mjBizAppsCredentialingProgramVersionEntity | null = null;
    /** The committees that may decide this version. */
    @Input() Committees: readonly CommitteeRow[] = [];

    /** Emits the version ID after its settings were saved. */
    @Output() Saved = new EventEmitter<string>();

    public readonly Groups = VersionSettingsComponent.Groups;
    public IsSaving = false;
    public ErrorMessage = '';
    public SavedMessage = '';

    public get Editable(): SettingsTierEditable {
        return StudioViewModel.For({ Status: this.Version?.Status ?? 'Retired' }).SettingsTierEditable;
    }

    /** Any tier can be edited on this version. */
    public get AnyEditable(): boolean {
        const e = this.Editable;
        return e.WorkflowToggles || e.PromotionThresholds || e.RolloutFlags;
    }

    public get CanSave(): boolean {
        return !this.IsSaving && this.Version != null && this.Version.Dirty;
    }

    public get CommitteeChoices(): CommitteeRow[] {
        return [...this.Committees];
    }

    public InputID(field: string): string {
        return `cred-settings-${field}`;
    }

    /** A setting's stored value as read-only text. */
    public ValueText(setting: SettingDescriptor): string {
        const v = this.Version;
        if (v == null) {
            return '';
        }
        switch (setting.Kind) {
            case 'integer':
                return `${v[setting.Field]} ${setting.Unit}`;
            case 'rate':
                return `${Math.round(v[setting.Field] * 1000) / 10}%`;
            case 'flag':
                return v[setting.Field] ? 'Yes' : 'No';
            case 'committee':
                return this.committeeName(v.CommitteeID) ?? 'None chosen';
        }
    }

    public async Save(): Promise<void> {
        const version = this.Version;
        if (!this.CanSave || version == null) {
            return;
        }
        this.IsSaving = true;
        this.ErrorMessage = '';
        this.SavedMessage = '';
        this.cdr.markForCheck();
        try {
            if (await version.Save()) {
                this.SavedMessage = 'Settings saved.';
                this.Saved.emit(version.ID);
            } else {
                this.ErrorMessage = version.LatestResult?.CompleteMessage || 'The settings were not saved.';
            }
        } catch (e) {
            this.ErrorMessage = e instanceof Error ? e.message : String(e);
        } finally {
            this.IsSaving = false;
            this.cdr.markForCheck();
        }
    }

    /** Puts every unsaved change back to the stored value. */
    public Discard(): void {
        this.Version?.Revert();
        this.ErrorMessage = '';
        this.SavedMessage = '';
        this.cdr.markForCheck();
    }

    private committeeName(id: string | null): string | null {
        if (id == null) {
            return null;
        }
        const wanted = id.toLowerCase();
        return this.Committees.find((c) => c.ID.toLowerCase() === wanted)?.Name ?? this.Version?.Committee ?? null;
    }
}
