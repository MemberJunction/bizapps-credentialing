/**
 * Server-side subclass of Standard — a standard belongs to the version of its section, is edited only
 * on a Draft version the caller can read, has a code and a statement that hold text (both stored
 * trimmed), has a code unique in its version (trimmed, ignoring case),
 * and its evaluation mode changes only through the Trust screen or a version clone (FRD FR-2, BR-2).
 * Writes run under the version's authoring lock (guards/AuthoringLock.ts).
 */
import {
    BaseEntity,
    LogError,
    RunView,
    ValidationResult,
    type EntityDeleteOptions,
    type EntitySaveOptions,
    type IMetadataProvider,
    type RunViewParams,
} from '@memberjunction/core';
import { IsValidUUID, RegisterClass, UUIDsEqual } from '@memberjunction/global';
import { CredentialingEntity, NOT_FOUND_REASON, StandardAuthoringRules, type EvaluationMode } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingStandardEntity } from '@mj-biz-apps/credentialing-entities';
import { LockedWrite, type StaleCheckRow } from './guards/LockedWrite.js';
import { ParentVersionLoader, type LoadedSection, type LoadedVersion } from './guards/ParentVersionLoader.js';
import { VersionTree } from './guards/VersionTree.js';

const SOURCE = 'StandardEntityServer';

/** Another standard of the version, as the code rule reads it. */
interface SiblingCode {
    ID: string;
    Code: string;
}

/** The standard a version clone copies, as the clone rule reads it. */
interface CloneSource {
    ID: string;
    ProgramVersionID: string;
    LineageKey: string;
    EvaluationMode: EvaluationMode;
}

@RegisterClass(BaseEntity, CredentialingEntity.Standard)
export class StandardEntityServer extends mjBizAppsCredentialingStandardEntity {
    /** Set by {@link MarkAsVersionClone}; cleared after every save attempt. Never an entity field. */
    private versionCloneSourceID: string | null = null;

    /** Async validation carries the rules, so it must run on every save. */
    public override get DefaultSkipAsyncValidation(): boolean {
        return false;
    }

    /**
     * Marks the next save of this NEW standard as the copy of `sourceStandardID` made by a version
     * clone, which may carry the source's evaluation mode into the new Draft. The save checks the mark
     * against the stored source — readable by the caller, same lineage and evaluation mode, and this
     * version cloned from the source's — and is refused as not found when any of them fails. Server
     * code only: nothing sent over GraphQL reaches this method.
     */
    public MarkAsVersionClone(sourceStandardID: string): void {
        this.versionCloneSourceID = sourceStandardID;
    }

    public override async Save(options?: EntitySaveOptions): Promise<boolean> {
        try {
            return await LockedWrite.Run(this, this.IsSaved ? 'update' : 'create', async () => {
                await this.AcquireAuthoringLocks();
                return super.Save(options);
            });
        } finally {
            this.versionCloneSourceID = null;
        }
    }

    public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
        return LockedWrite.Run(this, 'delete', async () => {
            await this.AcquireAuthoringLocks();
            const refusal = await this.deleteRefusal();
            if (refusal != null) {
                LockedWrite.Refuse(this, 'delete', refusal);
                return false;
            }
            return super.Delete(options);
        });
    }

    public override async ValidateAsync(): Promise<ValidationResult> {
        const result = await super.ValidateAsync();
        try {
            const refusal = await this.saveRefusal();
            if (refusal != null) {
                LockedWrite.Fail(result, SOURCE, refusal);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            LogError(`${SOURCE}: checking standard ${this.ID ?? '(new)'} failed: ${msg}`);
            LockedWrite.Fail(result, SOURCE, `The standard was not saved: its rules could not be checked (${msg}).`);
        }
        return result;
    }

    /**
     * Resolves the version from the section, read as the caller, and takes the version lock. On a
     * create it also replaces whatever version the caller sent with the section's, and trims the code
     * and the statement — all before the entity's own required-field validation runs. An unreadable
     * section takes no lock.
     */
    protected async AcquireAuthoringLocks(): Promise<void> {
        this.normalizeText();
        const sectionID = this.IsSaved ? LockedWrite.LoadedString(this, 'SectionID') : this.SectionID;
        const section = sectionID != null ? await ParentVersionLoader.LoadSection(sectionID, this.ActiveUser, this.provider) : null;
        if (section == null) {
            return;
        }
        if (!this.IsSaved) {
            this.ProgramVersionID = section.ProgramVersionID;
        }
        await VersionTree.LockVersion(section.ProgramVersionID, this.ActiveUser, this.provider);
    }

    private get provider(): IMetadataProvider {
        return LockedWrite.ProviderOf(this);
    }

    /** Stores the code and the statement trimmed; missing text becomes empty, which the text rule refuses. */
    private normalizeText(): void {
        if ((!this.IsSaved || LockedWrite.AnyChanged(this, ['Code'])) && this.Code !== LockedWrite.Trimmed(this.Code)) {
            this.Code = LockedWrite.Trimmed(this.Code);
        }
        if ((!this.IsSaved || LockedWrite.AnyChanged(this, ['Statement'])) && this.Statement !== LockedWrite.Trimmed(this.Statement)) {
            this.Statement = LockedWrite.Trimmed(this.Statement);
        }
    }

    /** A code or statement that holds no text, on a create or a save that changes either. */
    private textRefusal(): string | null {
        if (this.IsSaved && !LockedWrite.AnyChanged(this, ['Code', 'Statement'])) {
            return null;
        }
        return LockedWrite.ReasonOf(StandardAuthoringRules.CheckStandardText({ Code: this.Code, Statement: this.Statement }));
    }

    private async saveRefusal(): Promise<string | null> {
        if (this.IsSaved) {
            const stale = await LockedWrite.StaleReason(CredentialingEntity.Standard, this.ID, this.__mj_UpdatedAt, this.ActiveUser, this.provider);
            if (stale != null) return stale;
        }
        // A saved standard is judged in the section it is stored in; a move is refused by the rule below.
        const sectionID = this.IsSaved ? LockedWrite.LoadedString(this, 'SectionID') : this.SectionID;
        const section = sectionID != null ? await ParentVersionLoader.LoadSection(sectionID, this.ActiveUser, this.provider) : null;
        if (section == null) {
            return NOT_FOUND_REASON;
        }
        const [version, siblings, cloneSource] = await this.loadContext(section.ProgramVersionID);
        if (version == null) {
            return NOT_FOUND_REASON;
        }
        const codeRefusal = this.textRefusal() ?? this.codeRefusal(siblings);
        if (codeRefusal != null) {
            return codeRefusal;
        }
        const isVersionClone = this.versionCloneSourceID != null;
        if (isVersionClone && !this.cloneMarkHolds(version, cloneSource)) {
            return NOT_FOUND_REASON;
        }
        const rule = StandardAuthoringRules.CanSaveStandard({
            IsNew: !this.IsSaved,
            IsVersionClone: isVersionClone,
            VersionStatus: version.Status,
            ChangedFields: LockedWrite.ChangedFields(this),
            EvaluationMode: this.EvaluationMode,
            IsInterpretive: this.IsInterpretive,
        });
        return LockedWrite.ReasonOf(rule);
    }

    /** The version, the version's other codes and (when marked) the clone source, in one RunViews call. */
    private async loadContext(versionID: string): Promise<[LoadedVersion | null, SiblingCode[], CloneSource | null]> {
        const params: RunViewParams[] = [
            ParentVersionLoader.VersionParams(versionID),
            {
                EntityName: CredentialingEntity.Standard,
                ExtraFilter: IsValidUUID(versionID) ? `ProgramVersionID = '${versionID}'` : '1 = 0',
                Fields: ['ID', 'Code'],
                ResultType: 'simple',
            },
        ];
        const cloneSourceID = this.versionCloneSourceID;
        if (cloneSourceID != null && IsValidUUID(cloneSourceID)) {
            params.push({
                EntityName: CredentialingEntity.Standard,
                ExtraFilter: `ID = '${cloneSourceID}'`,
                Fields: ['ID', 'ProgramVersionID', 'LineageKey', 'EvaluationMode'],
                ResultType: 'simple',
                MaxRows: 1,
            });
        }
        const results = await RunView.FromMetadataProvider(this.provider).RunViews<LoadedVersion | SiblingCode | CloneSource>(params, this.ActiveUser);
        const failed = results.find((r) => !r.Success);
        if (failed != null) {
            throw new Error(`reading the standard's version failed: ${failed.ErrorMessage}`);
        }
        const version = (results[0].Results[0] as LoadedVersion | undefined) ?? null;
        const siblings = results[1].Results as SiblingCode[];
        const source = (results[2]?.Results[0] as CloneSource | undefined) ?? null;
        return [version, siblings, source];
    }

    private codeRefusal(siblings: SiblingCode[]): string | null {
        if (this.IsSaved && !LockedWrite.AnyChanged(this, ['Code'])) {
            return null;
        }
        const code = StandardAuthoringRules.NormalizeCode(this.Code ?? '');
        const taken = siblings.some((s) => !(this.IsSaved && UUIDsEqual(s.ID, this.ID)) && StandardAuthoringRules.CodesCollide(s.Code, code));
        return taken ? `Standard code ${code} is already used in this version.` : null;
    }

    /**
     * A clone mark holds only for a new standard whose stored source the caller can read, with this
     * standard's lineage and evaluation mode, in the version this standard's version was cloned from.
     */
    private cloneMarkHolds(version: LoadedVersion, source: CloneSource | null): boolean {
        return (
            !this.IsSaved &&
            source != null &&
            UUIDsEqual(source.LineageKey, this.LineageKey) &&
            source.EvaluationMode === this.EvaluationMode &&
            UUIDsEqual(version.ClonedFromVersionID, source.ProgramVersionID)
        );
    }

    private async deleteRefusal(): Promise<string | null> {
        const validSection = this.SectionID != null && IsValidUUID(this.SectionID);
        const [staleRes, sectionRes, versionRes] = await RunView.FromMetadataProvider(this.provider).RunViews<
            StaleCheckRow | LoadedSection | LoadedVersion
        >(
            [
                LockedWrite.StaleParams(CredentialingEntity.Standard, this.ID),
                ParentVersionLoader.SectionParams(this.SectionID),
                {
                    EntityName: CredentialingEntity.ProgramVersion,
                    ExtraFilter: validSection
                        ? `ID IN (SELECT s.ProgramVersionID FROM [__mj_BizAppsCredentialing].[vwSections] s WHERE s.ID = '${this.SectionID}')`
                        : '1 = 0',
                    Fields: ['ID', 'Status', 'ProgramID', 'ClonedFromVersionID'],
                    ResultType: 'simple',
                    MaxRows: 1,
                    SkipTotalRowCount: true,
                },
            ],
            this.ActiveUser,
        );
        if (!staleRes?.Success) {
            LogError(`${SOURCE}: re-reading standard ${this.ID} before delete failed: ${staleRes?.ErrorMessage}`);
            return NOT_FOUND_REASON;
        }
        const stale = LockedWrite.StaleReasonFromRow(staleRes.Results[0] as StaleCheckRow | undefined, this.__mj_UpdatedAt);
        if (stale != null) {
            return stale;
        }
        if (!sectionRes?.Success || !versionRes?.Success) {
            LogError(`${SOURCE}: reading section/version for standard ${this.ID} failed: ${sectionRes?.ErrorMessage ?? versionRes?.ErrorMessage}`);
            return NOT_FOUND_REASON;
        }
        const section = sectionRes.Results[0] as LoadedSection | undefined;
        const version = versionRes.Results[0] as LoadedVersion | undefined;
        if (section == null || version == null || !UUIDsEqual(version.ID, section.ProgramVersionID)) {
            return NOT_FOUND_REASON;
        }
        return LockedWrite.ReasonOf(StandardAuthoringRules.CanEditTree(version.Status));
    }
}
