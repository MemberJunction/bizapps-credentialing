/**
 * Server-side subclass of ProgramVersion — enforces the version lifecycle, activation, one-draft,
 * label, settings and settings-range rules (FRD BR-2, BR-3, BR-10) and makes a Draft delete one atomic cascade.
 *
 * Every write runs under the program's authoring lock and, for a saved version, the version's
 * (see guards/AuthoringLock.ts), so the rows the rules read cannot change before the write lands.
 */
import {
    BaseEntity,
    LogError,
    RunView,
    ValidationResult,
    type EntityDeleteOptions,
    type EntitySaveOptions,
    type IMetadataProvider,
    type UserInfo,
} from '@memberjunction/core';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import {
    CredentialingEntity,
    NOT_FOUND_REASON,
    VersionLifecycleRules,
    VersionSettingsRules,
    type VersionStatus,
} from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingProgramVersionEntity } from '@mj-biz-apps/credentialing-entities';
import { AuthoringLock } from './guards/AuthoringLock.js';
import { LockedWrite } from './guards/LockedWrite.js';
import { ParentVersionLoader } from './guards/ParentVersionLoader.js';

const SOURCE = 'ProgramVersionEntityServer';

/** The refusal given for a version label that is empty once trimmed. */
export const BLANK_LABEL_REASON = 'Enter a label for this version.';

/** Another version of the same program, as the label and one-draft rules read it. */
interface SiblingVersion {
    ID: string;
    Label: string;
    Status: VersionStatus;
}

/** A row of the version's tree, as the activation rule reads it. */
interface TreeSection {
    ID: string;
    Number: string;
    Sequence: number;
}
interface TreeStandard {
    ID: string;
    SectionID: string;
}

@RegisterClass(BaseEntity, CredentialingEntity.ProgramVersion)
export class ProgramVersionEntityServer extends mjBizAppsCredentialingProgramVersionEntity {
    /**
     * Test seam: when set, a Draft delete's cascade throws after deleting this many child rows, so a
     * check can prove the cascade rolls back as a whole. Server-only: no client input reaches it.
     */
    public FailCascadeAfter: number | null = null;

    /** Async validation carries the rules, so it must run on every save. */
    public override get DefaultSkipAsyncValidation(): boolean {
        return false;
    }

    public override async Save(options?: EntitySaveOptions): Promise<boolean> {
        if ((!this.IsSaved || LockedWrite.AnyChanged(this, ['Label'])) && this.Label != null && this.Label !== this.Label.trim()) {
            this.Label = this.Label.trim();
        }
        return LockedWrite.Run(this, this.IsSaved ? 'update' : 'create', async () => {
            await this.AcquireAuthoringLocks();
            return super.Save(options);
        });
    }

    public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
        return LockedWrite.Run(this, 'delete', async () => {
            await this.AcquireAuthoringLocks();
            const refusal = await this.deleteRefusal();
            if (refusal != null) {
                LockedWrite.Refuse(this, 'delete', refusal);
                return false;
            }
            await this.deleteTree();
            return super.Delete(options);
        });
    }

    public override async ValidateAsync(): Promise<ValidationResult> {
        const result = await super.ValidateAsync();
        try {
            const refusal = await this.saveRefusal();
            if (refusal != null) {
                return LockedWrite.Fail(result, SOURCE, refusal);
            }
            this.stampTransition();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            LogError(`${SOURCE}: checking version ${this.ID ?? '(new)'} failed: ${msg}`);
            LockedWrite.Fail(result, SOURCE, `The version was not saved: its rules could not be checked (${msg}).`);
        }
        return result;
    }

    /**
     * Takes the program lock and, for a saved version, the version lock — in that order, which every
     * writer follows. The program is resolved as the caller; an unreadable program takes no lock, and
     * the write is then refused as not found.
     */
    protected async AcquireAuthoringLocks(): Promise<void> {
        const programID = this.IsSaved ? LockedWrite.LoadedString(this, 'ProgramID') : this.ProgramID;
        if (programID == null) {
            return;
        }
        const program = await ParentVersionLoader.LoadProgram(programID, this.ActiveUser, this.provider);
        if (program == null) {
            return;
        }
        await AuthoringLock.ForProgram(program.ID, this.provider, this.ActiveUser);
        if (this.IsSaved) {
            await AuthoringLock.ForVersion(this.ID, this.provider, this.ActiveUser);
        }
    }

    private get provider(): IMetadataProvider {
        return LockedWrite.ProviderOf(this);
    }

    /** The status stored for this version — the loaded value, which the stale check has confirmed. */
    private storedStatus(): VersionStatus {
        const stored = LockedWrite.LoadedString(this, 'Status');
        if (stored === 'Draft' || stored === 'Active' || stored === 'Retired') {
            return stored;
        }
        throw new Error(`version ${this.ID} has no stored status`);
    }

    private async saveRefusal(): Promise<string | null> {
        const user = this.ActiveUser;
        if (this.IsSaved) {
            const stale = await LockedWrite.StaleReason(CredentialingEntity.ProgramVersion, this.ID, this.__mj_UpdatedAt, user, this.provider);
            if (stale != null) return stale;
            if (LockedWrite.AnyChanged(this, ['ProgramID'])) return 'A version cannot be moved to another program.';
        }
        const program = await ParentVersionLoader.LoadProgram(this.ProgramID, user, this.provider);
        if (program == null) {
            return NOT_FOUND_REASON;
        }
        return this.IsSaved ? this.updateRefusal(program.ID, user) : this.createRefusal(program.ID, user);
    }

    private async createRefusal(programID: string, user: UserInfo): Promise<string | null> {
        if (this.Status !== 'Draft') {
            return 'A new version starts as a Draft.';
        }
        const ranges = this.rangeRefusal();
        if (ranges != null) {
            return ranges;
        }
        const siblings = await this.loadSiblings(programID, user);
        const draft = siblings.find((s) => s.Status === 'Draft');
        const startDraft = VersionLifecycleRules.CanStartDraft({ ExistingDraftLabel: draft?.Label ?? null });
        const startDraftReason = LockedWrite.ReasonOf(startDraft);
        if (startDraftReason != null) {
            return startDraftReason;
        }
        return this.labelRefusal(siblings);
    }

    private async updateRefusal(programID: string, user: UserInfo): Promise<string | null> {
        const stored = this.storedStatus();
        const changed = LockedWrite.ChangedFields(this);
        const settings = VersionSettingsRules.CanChangeFields(stored, changed);
        const settingsReason = LockedWrite.ReasonOf(settings) ?? this.changedRangeRefusal();
        if (settingsReason != null) {
            return settingsReason;
        }
        if (changed.includes('Status')) {
            const transition = VersionLifecycleRules.CanTransition(stored, this.Status);
            const transitionReason = LockedWrite.ReasonOf(transition);
            if (transitionReason != null) {
                return transitionReason;
            }
            if (this.Status === 'Active') {
                const activation = await this.activationRefusal(stored, user);
                if (activation != null) return activation;
            }
        }
        if (changed.includes('Label')) {
            return this.labelRefusal(await this.loadSiblings(programID, user));
        }
        return null;
    }

    /** {@link rangeRefusal} for an update, which is checked only when it changes a number setting. */
    private changedRangeRefusal(): string | null {
        return LockedWrite.AnyChanged(this, VersionSettingsRules.NumberSettingFields) ? this.rangeRefusal() : null;
    }

    /** A number setting that is missing or outside its range, as a sentence that names it by its label. */
    private rangeRefusal(): string | null {
        return LockedWrite.ReasonOf(
            VersionSettingsRules.CheckRanges({
                PeerReviewerCount: this.PeerReviewerCount,
                PassiveApprovalWindowDays: this.PassiveApprovalWindowDays,
                MinimumAgreeRate: this.MinimumAgreeRate,
                MinimumObservations: this.MinimumObservations,
                MinimumReviewers: this.MinimumReviewers,
                MinimumReplayFloor: this.MinimumReplayFloor,
            }),
        );
    }

    /** The activation rule, read from the tree in one RunViews call under the version lock. */
    private async activationRefusal(stored: VersionStatus, user: UserInfo): Promise<string | null> {
        const filter = `ProgramVersionID = '${this.ID}'`;
        const [sectionsRes, standardsRes] = await RunView.FromMetadataProvider(this.provider).RunViews<TreeSection | TreeStandard>(
            [
                { EntityName: CredentialingEntity.Section, ExtraFilter: filter, Fields: ['ID', 'Number', 'Sequence'], OrderBy: 'Sequence, Number', ResultType: 'simple' },
                { EntityName: CredentialingEntity.Standard, ExtraFilter: filter, Fields: ['ID', 'SectionID'], ResultType: 'simple' },
            ],
            user,
        );
        if (!sectionsRes?.Success || !standardsRes?.Success) {
            throw new Error(`reading the tree failed: ${sectionsRes?.ErrorMessage ?? standardsRes?.ErrorMessage ?? 'unknown'}`);
        }
        const sections = sectionsRes.Results as TreeSection[];
        const standards = standardsRes.Results as TreeStandard[];
        const empty = sections.filter((s) => !standards.some((st) => UUIDsEqual(st.SectionID, s.ID))).map((s) => s.Number);
        const activation = VersionLifecycleRules.CanActivate({
            Status: stored,
            SectionCount: sections.length,
            StandardCount: standards.length,
            EmptySectionNumbers: empty,
            CommitteeID: this.CommitteeID,
        });
        return LockedWrite.ReasonOf(activation);
    }

    /** Every other version of this program, read as the caller under the program lock. */
    private async loadSiblings(programID: string, user: UserInfo): Promise<SiblingVersion[]> {
        const res = await RunView.FromMetadataProvider(this.provider).RunView<SiblingVersion>(
            {
                EntityName: CredentialingEntity.ProgramVersion,
                ExtraFilter: `ProgramID = '${programID}'`,
                Fields: ['ID', 'Label', 'Status'],
                ResultType: 'simple',
            },
            user,
        );
        if (!res.Success) {
            throw new Error(`reading the program's versions failed: ${res.ErrorMessage}`);
        }
        return res.Results.filter((s) => !this.IsSaved || !UUIDsEqual(s.ID, this.ID));
    }

    private labelRefusal(siblings: SiblingVersion[]): string | null {
        const label = (this.Label ?? '').trim();
        // An empty string passes the entity's required-field check (it is not null), so it is refused here.
        if (label.length === 0) {
            return BLANK_LABEL_REASON;
        }
        const taken = siblings.some((s) => s.Label.trim().toLowerCase() === label.toLowerCase());
        return taken ? `A version labelled ${label} already exists for this program.` : null;
    }

    /** Records when the version was activated or retired, on the write that makes the transition. */
    private stampTransition(): void {
        if (!this.IsSaved || !LockedWrite.AnyChanged(this, ['Status'])) {
            return;
        }
        if (this.Status === 'Active') {
            this.ActivatedAt = new Date();
        } else if (this.Status === 'Retired') {
            this.RetiredAt = new Date();
        }
    }

    private async deleteRefusal(): Promise<string | null> {
        const stale = await LockedWrite.StaleReason(CredentialingEntity.ProgramVersion, this.ID, this.__mj_UpdatedAt, this.ActiveUser, this.provider);
        if (stale != null) {
            return stale;
        }
        const rule = VersionLifecycleRules.CanDelete(this.storedStatus());
        return LockedWrite.ReasonOf(rule);
    }

    /**
     * Deletes the version's standards, then sections, then document requirements, one at a time, in
     * this transaction. The first child that is not deleted throws, which rolls back every row.
     */
    private async deleteTree(): Promise<void> {
        const filter = `ProgramVersionID = '${this.ID}'`;
        const results = await RunView.FromMetadataProvider(this.provider).RunViews<BaseEntity>(
            [
                { EntityName: CredentialingEntity.Standard, ExtraFilter: filter, ResultType: 'entity_object' },
                { EntityName: CredentialingEntity.Section, ExtraFilter: filter, ResultType: 'entity_object' },
                { EntityName: CredentialingEntity.DocumentRequirement, ExtraFilter: filter, ResultType: 'entity_object' },
            ],
            this.ActiveUser,
        );
        const failed = results.find((r) => !r.Success);
        if (failed != null) {
            throw new Error(`reading the version's rows failed: ${failed.ErrorMessage}`);
        }
        let deleted = 0;
        for (const child of results.flatMap((r) => r.Results)) {
            if (this.FailCascadeAfter != null && deleted >= this.FailCascadeAfter) {
                throw new Error(`The delete stopped after ${deleted} of this version's rows (FailCascadeAfter).`);
            }
            if (!(await child.Delete())) {
                throw new Error(child.LatestResult?.CompleteMessage ?? `${child.EntityInfo.Name} ${child.PrimaryKey.ToString()} was not deleted.`);
            }
            deleted++;
        }
    }
}
