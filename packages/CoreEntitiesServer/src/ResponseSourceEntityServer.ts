/**
 * Server-side subclass of ResponseSource — authoring data under a version, not applicant data: a
 * source is written by staff (the only role with a permission on it) only on a Draft version the
 * caller can read; its version is always its standard's (server-set), it never moves to another
 * standard, and the standard's whole list of sources satisfies `ResponseSourceRules`. Writes run under
 * the version's authoring lock (guards/AuthoringLock.ts), so the list checked is the list written.
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
import { CredentialingEntity, NOT_FOUND_REASON, ResponseSourceRules, type SourceDraft, type VersionStatus } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingResponseSourceEntity } from '@mj-biz-apps/credentialing-entities';
import { LockedWrite } from './guards/LockedWrite.js';
import { ParentVersionLoader } from './guards/ParentVersionLoader.js';
import { VersionTree } from './guards/VersionTree.js';

const SOURCE = 'ResponseSourceEntityServer';

/** The parts of a standard a source's rules read. */
interface StandardRow {
    ID: string;
    ProgramVersionID: string;
    IntakeMode: string;
}

/** The parts of a sibling source the list rule reads. */
interface SourceRow {
    ID: string;
    SourceType: SourceDraft['SourceType'];
    DocumentRequirementID: string | null;
    Mode: SourceDraft['Mode'];
    Rank: number;
    Sequence: number;
}

@RegisterClass(BaseEntity, CredentialingEntity.ResponseSource)
export class ResponseSourceEntityServer extends mjBizAppsCredentialingResponseSourceEntity {
    /** Async validation carries the rules, so it must run on every save. */
    public override get DefaultSkipAsyncValidation(): boolean {
        return false;
    }

    public override async Save(options?: EntitySaveOptions): Promise<boolean> {
        const kind = this.IsSaved ? 'update' : 'create';
        return LockedWrite.Run(this, kind, async () => {
            const standard = await this.loadStandard(this.IsSaved ? LockedWrite.LoadedString(this, 'StandardID') : this.StandardID);
            if (standard == null) {
                LockedWrite.Refuse(this, kind, NOT_FOUND_REASON);
                return false;
            }
            if (!this.IsSaved || !UUIDsEqual(this.ProgramVersionID, standard.ProgramVersionID)) {
                this.ProgramVersionID = standard.ProgramVersionID;
            }
            await VersionTree.LockVersion(standard.ProgramVersionID, this.ActiveUser, this.provider);
            return super.Save(options);
        });
    }

    public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
        return LockedWrite.Run(this, 'delete', async () => {
            await VersionTree.LockVersion(LockedWrite.LoadedString(this, 'ProgramVersionID'), this.ActiveUser, this.provider);
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
            LogError(`${SOURCE}: checking response source ${this.ID ?? '(new)'} failed: ${msg}`);
            LockedWrite.Fail(result, SOURCE, `The response source was not saved: its rules could not be checked (${msg}).`);
        }
        return result;
    }

    private get provider(): IMetadataProvider {
        return LockedWrite.ProviderOf(this);
    }

    /** The standard, read as the caller; null when the caller cannot read it or it does not exist. */
    private async loadStandard(standardID: string | null): Promise<StandardRow | null> {
        if (standardID == null || !IsValidUUID(standardID)) {
            return null;
        }
        const res = await RunView.FromMetadataProvider(this.provider).RunView<StandardRow>(
            {
                EntityName: CredentialingEntity.Standard,
                ExtraFilter: `ID = '${standardID}'`,
                Fields: ['ID', 'ProgramVersionID', 'IntakeMode'],
                ResultType: 'simple',
                MaxRows: 1,
            },
            this.ActiveUser,
        );
        if (!res.Success) {
            LogError(`${SOURCE}: reading standard ${standardID} failed: ${res.ErrorMessage}`);
            return null;
        }
        return res.Results[0] ?? null;
    }

    private async saveRefusal(): Promise<string | null> {
        if (this.IsSaved) {
            const stale = await LockedWrite.StaleReason(CredentialingEntity.ResponseSource, this.ID, this.__mj_UpdatedAt, this.ActiveUser, this.provider);
            if (stale != null) return stale;
            if (LockedWrite.AnyChanged(this, ['StandardID'])) return 'A response source cannot be moved to another standard.';
        }
        const standard = await this.loadStandard(this.StandardID);
        const version = standard == null ? null : await ParentVersionLoader.LoadVersion(standard.ProgramVersionID, this.ActiveUser, this.provider);
        if (standard == null || version == null) {
            return NOT_FOUND_REASON;
        }
        return this.listRefusal(standard, version.Status);
    }

    /** Checks the standard's whole list of sources, with this row in it as it will be written. */
    private async listRefusal(standard: StandardRow, versionStatus: VersionStatus): Promise<string | null> {
        const params: RunViewParams[] = [
            {
                EntityName: CredentialingEntity.ResponseSource,
                ExtraFilter: `StandardID = '${standard.ID}'`,
                Fields: ['ID', 'SourceType', 'DocumentRequirementID', 'Mode', 'Rank', 'Sequence'],
                ResultType: 'simple',
            },
            { EntityName: CredentialingEntity.DocumentRequirement, ExtraFilter: `ProgramVersionID = '${standard.ProgramVersionID}'`, Fields: ['ID'], ResultType: 'simple' },
        ];
        const [sources, requirements] = await RunView.FromMetadataProvider(this.provider).RunViews<SourceRow | { ID: string }>(params, this.ActiveUser);
        if (!sources.Success || !requirements.Success) {
            throw new Error(`reading the standard's sources failed: ${sources.ErrorMessage ?? requirements.ErrorMessage}`);
        }
        const siblings = (sources.Results as SourceRow[]).filter((s) => !(this.IsSaved && UUIDsEqual(s.ID, this.ID)));
        const list: SourceDraft[] = [...siblings, this.asDraft()];
        const requirementIDs = requirements.Results.map((r) => r.ID);
        return LockedWrite.ReasonOf(ResponseSourceRules.Validate(list, { IntakeMode: standard.IntakeMode }, versionStatus, requirementIDs));
    }

    private asDraft(): SourceDraft {
        return {
            ID: this.IsSaved ? this.ID : undefined,
            SourceType: this.SourceType,
            DocumentRequirementID: this.DocumentRequirementID,
            Mode: this.Mode,
            Rank: this.Rank,
            Sequence: this.Sequence,
        };
    }

    private async deleteRefusal(): Promise<string | null> {
        const stale = await LockedWrite.StaleReason(CredentialingEntity.ResponseSource, this.ID, this.__mj_UpdatedAt, this.ActiveUser, this.provider);
        if (stale != null) {
            return stale;
        }
        return VersionTree.EditRefusal(this.ProgramVersionID, this.ActiveUser, this.provider);
    }
}
