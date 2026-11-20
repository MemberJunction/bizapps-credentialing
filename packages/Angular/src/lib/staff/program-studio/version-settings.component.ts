/**
 * A version's settings in their three tiers (FRD FR-2.6, the B1 subset).
 *
 * Workflow toggles and promotion thresholds define what a review means for applications already in
 * progress, so they are editable only on a Draft; rollout flags change only what happens next, so
 * they stay editable on an Active version. Which tier is editable comes from {@link StudioViewModel};
 * the server guard decides every save. A save is one `Save()` of the version. A number outside its
 * range (`VersionSettingsRules.NumberRanges`, the database's own limits) or left empty is refused
 * here first, with the sentence the server gives, beside its field; any other refusal is shown beside
 * the Save button, as {@link StudioMessages} words it. A refusal that means the screen is out of date
 * stays visible while the page reloads the stored version.
 *
 * The version object is the page's, shared with the version actions; Activate and Retire never save
 * it (see `VersionStatusChange`), so an edit made here is written only by Save settings.
 *
 * On a Draft, `New committee` beside the deciding-committee picker opens {@link NewCommitteeFormComponent}
 * (an organization with no committee could otherwise never activate a version). When a committee is
 * created this widget emits {@link VersionSettingsComponent.CommitteeCreated}; the page reads the
 * committees again, and when the new list arrives the committee is chosen in the picker — an unsaved
 * change like any other, kept only by Save settings.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { MJButtonDirective, MJDropdownComponent, MJNumericInputComponent, MJSwitchComponent } from '@memberjunction/ng-ui-components';
import { VersionSettingsRules, type CreateCommitteeOutput, type VersionNumberSetting } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingProgramVersionEntity } from '@mj-biz-apps/credentialing-entities';
import { NewCommitteeFormComponent } from './new-committee-form.component';
import type { CommitteeRow, CommitteeTypeRow } from './studio-data';
import { StudioViewModel, type SettingsTierEditable } from './studio-view-model';
import { StudioMessages } from '../studio-messages';

type VersionField = keyof mjBizAppsCredentialingProgramVersionEntity;
type IntegerField = Extract<VersionNumberSetting, 'PeerReviewerCount' | 'PassiveApprovalWindowDays' | 'MinimumObservations' | 'MinimumReviewers'>;
type RateField = Extract<VersionNumberSetting, 'MinimumAgreeRate' | 'MinimumReplayFloor'>;
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
/** The sentence over a tier that can still be edited and freezes at activation. */
export const FIXED_ON_ACTIVATION_SENTENCE = 'Fixed once the version is activated.';
/** The sentence over the rollout flags of a Retired version, which no longer change anything. */
export const RETIRED_SETTINGS_SENTENCE = 'A retired version cannot be changed.';
/** The sentence under the deciding-committee picker when the program's organization has no committee. */
export const NO_COMMITTEE_SENTENCE = "This program's organization has no committee yet, so the version cannot be activated. Create one with New committee.";

/** The status line shown once a committee was created and chosen in the picker. */
export function CommitteeCreatedSentence(name: string): string {
    return `${name} was created and selected. Save settings to keep it.`;
}

const LABELS = VersionSettingsRules.Labels;

/** How each setting is edited; its label is the one `VersionSettingsRules` names it by in its sentences. */
const DESCRIPTORS: Readonly<Record<string, SettingDescriptor>> = {
    PeerReviewerCount: { Kind: 'integer', Field: 'PeerReviewerCount', Label: LABELS.PeerReviewerCount, Unit: 'reviewers' },
    PassiveApprovalWindowDays: { Kind: 'integer', Field: 'PassiveApprovalWindowDays', Label: LABELS.PassiveApprovalWindowDays, Unit: 'days' },
    RequiresScreening: { Kind: 'flag', Field: 'RequiresScreening', Label: LABELS.RequiresScreening },
    RequiresExecutiveApproval: { Kind: 'flag', Field: 'RequiresExecutiveApproval', Label: LABELS.RequiresExecutiveApproval },
    RequiresGoverningBodyAttestation: { Kind: 'flag', Field: 'RequiresGoverningBodyAttestation', Label: LABELS.RequiresGoverningBodyAttestation },
    CommitteeID: { Kind: 'committee', Field: 'CommitteeID', Label: LABELS.CommitteeID },
    MinimumAgreeRate: { Kind: 'rate', Field: 'MinimumAgreeRate', Label: LABELS.MinimumAgreeRate },
    MinimumObservations: { Kind: 'integer', Field: 'MinimumObservations', Label: LABELS.MinimumObservations, Unit: 'findings' },
    MinimumReviewers: { Kind: 'integer', Field: 'MinimumReviewers', Label: LABELS.MinimumReviewers, Unit: 'reviewers' },
    MinimumReplayFloor: { Kind: 'rate', Field: 'MinimumReplayFloor', Label: LABELS.MinimumReplayFloor },
    AgentObservationsVisibleToReviewers: { Kind: 'flag', Field: 'AgentObservationsVisibleToReviewers', Label: LABELS.AgentObservationsVisibleToReviewers },
    PromotionEnabled: { Kind: 'flag', Field: 'PromotionEnabled', Label: LABELS.PromotionEnabled },
    AutoCarryForwardOnRenewal: { Kind: 'flag', Field: 'AutoCarryForwardOnRenewal', Label: LABELS.AutoCarryForwardOnRenewal },
};

function group(tier: SettingsTier, heading: string, frozenNote: string, fields: readonly string[]): SettingsGroup {
    return { Tier: tier, Heading: heading, FrozenNote: frozenNote, Settings: fields.map((f) => DESCRIPTORS[f]) };
}

@Component({
    standalone: true,
    selector: 'bizapps-cred-version-settings',
    imports: [FormsModule, MJButtonDirective, MJDropdownComponent, MJNumericInputComponent, MJSwitchComponent, NewCommitteeFormComponent],
    templateUrl: './version-settings.component.html',
    styleUrls: ['./version-settings.component.scss'],
})
export class VersionSettingsComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private _committees: readonly CommitteeRow[] = [];
    /** The committee just created, until the list that holds it arrives and it is chosen. */
    private createdCommittee: CreateCommitteeOutput | null = null;

    /** The three tiers, each listing exactly its `VersionSettingsRules` fields, in order. */
    public static readonly Groups: readonly SettingsGroup[] = [
        group('WorkflowToggles', 'Workflow toggles', FROZEN_SETTINGS_SENTENCE, VersionSettingsRules.WorkflowToggleFields),
        group('PromotionThresholds', 'Promotion thresholds', FROZEN_SETTINGS_SENTENCE, VersionSettingsRules.PromotionThresholdFields),
        group('RolloutFlags', 'Rollout flags', ROLLOUT_FLAGS_SENTENCE, VersionSettingsRules.RolloutFlagFields),
    ];

    /** The version whose settings are shown; edited in place and saved as one record. */
    @Input() Version: mjBizAppsCredentialingProgramVersionEntity | null = null;
    /** The program the version belongs to; a new committee is created for its organization. */
    @Input() ProgramID: string | null = null;
    /** The committees that may decide this version. A list holding the committee just created chooses it. */
    @Input()
    set Committees(value: readonly CommitteeRow[]) {
        this._committees = value ?? [];
        this.selectCreatedCommittee();
    }
    get Committees(): readonly CommitteeRow[] {
        return this._committees;
    }
    /** The committee types a new committee can have. */
    @Input() CommitteeTypes: readonly CommitteeTypeRow[] = [];

    /** Emits the version ID after its settings were saved. */
    @Output() Saved = new EventEmitter<string>();
    /** A committee was created for the program's organization: the page should read the committees again. */
    @Output() CommitteeCreated = new EventEmitter<CreateCommitteeOutput>();
    /** A save was refused because the version changed elsewhere: the page should reload what is stored. */
    @Output() ReloadRequested = new EventEmitter<void>();

    public readonly Groups = VersionSettingsComponent.Groups;
    public IsSaving = false;
    public ErrorMessage = '';
    /** The number setting {@link ErrorMessage} is about, or null when it belongs beside the Save button. */
    public ErrorField: VersionNumberSetting | null = null;
    public SavedMessage = '';
    /** The new-committee form is open. */
    public IsCommitteeFormOpen = false;
    /** Says a committee was created and chosen, until the settings are saved or discarded. */
    public CommitteeMessage = '';
    public readonly NoCommitteeSentence = NO_COMMITTEE_SENTENCE;

    /**
     * The committee of `committees` that is the one just created (IDs compared ignoring case), or null
     * while the list does not hold it yet.
     */
    public static CreatedIn(committees: readonly CommitteeRow[], created: Pick<CreateCommitteeOutput, 'CommitteeID'> | null): CommitteeRow | null {
        const wanted = created?.CommitteeID.toLowerCase();
        return committees.find((c) => c.ID.toLowerCase() === wanted) ?? null;
    }

    /**
     * The sentence above a tier: that it freezes at activation while it can still be edited, why it is
     * frozen once it cannot, and — for the rollout flags, which stay editable on an Active version —
     * that a retired version cannot be changed.
     */
    public static NoteFor(group: SettingsGroup, editable: SettingsTierEditable): string {
        if (group.Tier === 'RolloutFlags') {
            return editable.RolloutFlags ? group.FrozenNote : RETIRED_SETTINGS_SENTENCE;
        }
        return editable[group.Tier] ? FIXED_ON_ACTIVATION_SENTENCE : group.FrozenNote;
    }

    public NoteFor(group: SettingsGroup): string {
        return VersionSettingsComponent.NoteFor(group, this.Editable);
    }

    /** The smallest value a number setting accepts. */
    public MinFor(field: VersionNumberSetting): number {
        return VersionSettingsRules.NumberRanges[field].Min;
    }

    /** The largest value a number setting accepts; null when it has no upper bound. */
    public MaxFor(field: VersionNumberSetting): number | null {
        return VersionSettingsRules.NumberRanges[field].Max;
    }

    /** The refusal about one number setting, or ''. */
    public FieldError(field: VersionNumberSetting): string {
        return this.ErrorField === field ? this.ErrorMessage : '';
    }

    /** The refusal that names no number setting, shown beside the Save button, or ''. */
    public get FormError(): string {
        return this.ErrorField == null ? this.ErrorMessage : '';
    }

    public ErrorID(field: string): string {
        return `${this.InputID(field)}-error`;
    }

    public get Editable(): SettingsTierEditable {
        return StudioViewModel.For({ Status: this.Version?.Status ?? 'Retired' }).SettingsTierEditable;
    }

    /** Any tier can be edited on this version. */
    public get AnyEditable(): boolean {
        const e = this.Editable;
        return e.WorkflowToggles || e.PromotionThresholds || e.RolloutFlags;
    }

    /** `New committee` exists only where the deciding committee can still be chosen: on a Draft. */
    public get ShowNewCommittee(): boolean {
        return this.Version != null && StudioViewModel.For({ Status: this.Version.Status }).ShowNewCommittee;
    }

    public OpenCommitteeForm(): void {
        this.IsCommitteeFormOpen = true;
        this.CommitteeMessage = '';
        this.cdr.markForCheck();
    }

    public CloseCommitteeForm(): void {
        this.IsCommitteeFormOpen = false;
        this.cdr.markForCheck();
    }

    /** The form created a committee: close it and ask the page for the list that holds the committee. */
    public OnCommitteeCreated(created: CreateCommitteeOutput): void {
        this.IsCommitteeFormOpen = false;
        this.createdCommittee = created;
        this.CommitteeCreated.emit(created);
        this.cdr.markForCheck();
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
        this.clearMessages();
        const problem = this.numbersEditable ? VersionSettingsRules.FirstRangeProblem(version) : null;
        if (problem != null) {
            this.showError(problem.Reason);
            return;
        }
        this.IsSaving = true;
        this.cdr.markForCheck();
        try {
            if (await version.Save()) {
                this.SavedMessage = 'Settings saved.';
                this.Saved.emit(version.ID);
            } else {
                this.showError(StudioMessages.ForUser(version.LatestResult?.CompleteMessage || 'The settings were not saved.'));
            }
        } catch (e) {
            this.showError(StudioMessages.FromError(e));
        } finally {
            this.IsSaving = false;
            this.cdr.markForCheck();
        }
    }

    /** Puts every unsaved change back to the stored value. */
    public Discard(): void {
        this.Version?.Revert();
        this.clearMessages();
        this.cdr.markForCheck();
    }

    /** The number settings sit in the two tiers that are editable only on a Draft. */
    private get numbersEditable(): boolean {
        const e = this.Editable;
        return e.WorkflowToggles || e.PromotionThresholds;
    }

    private clearMessages(): void {
        this.ErrorMessage = '';
        this.ErrorField = null;
        this.SavedMessage = '';
        this.CommitteeMessage = '';
    }

    /** Chooses the committee just created once the list holds it, and says so. */
    private selectCreatedCommittee(): void {
        const created = this.createdCommittee;
        const row = VersionSettingsComponent.CreatedIn(this._committees, created);
        if (created == null || row == null || this.Version == null) {
            return;
        }
        this.createdCommittee = null;
        this.Version.CommitteeID = row.ID;
        this.SavedMessage = '';
        this.CommitteeMessage = CommitteeCreatedSentence(created.Name);
        this.cdr.markForCheck();
    }

    /** Shows a refusal beside the number setting it names; one that means the screen is out of date also reloads. */
    private showError(message: string): void {
        this.ErrorMessage = message;
        this.ErrorField = VersionSettingsRules.NumberSettingFor(message);
        if (StudioMessages.MeansStaleView(message)) {
            this.ReloadRequested.emit();
        }
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
