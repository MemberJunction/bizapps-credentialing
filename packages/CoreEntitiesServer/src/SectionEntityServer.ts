/**
 * Server-side subclass of Section — a section is edited only on a Draft version the caller can read,
 * stays in its version, has a number and a name that hold text (both stored trimmed), has a number
 * unique within its version (trimmed, ignoring case), and is deleted only once it holds no standards. Writes run under the version's authoring
 * lock (guards/AuthoringLock.ts), so the number check and the write it guards are one step and two
 * simultaneous saves of the same number give one row and one refusal with the sentence.
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
import { CredentialingEntity, NOT_FOUND_REASON, StandardAuthoringRules } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingSectionEntity } from '@mj-biz-apps/credentialing-entities';
import { LockedWrite, type StaleCheckRow } from './guards/LockedWrite.js';
import { ParentVersionLoader, type LoadedVersion } from './guards/ParentVersionLoader.js';
import { VersionTree } from './guards/VersionTree.js';

const SOURCE = 'SectionEntityServer';

@RegisterClass(BaseEntity, CredentialingEntity.Section)
export class SectionEntityServer extends mjBizAppsCredentialingSectionEntity {
    /** Async validation carries the rules, so it must run on every save. */
    public override get DefaultSkipAsyncValidation(): boolean {
        return false;
    }

    public override async Save(options?: EntitySaveOptions): Promise<boolean> {
        this.normalizeText();
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
            LogError(`${SOURCE}: checking section ${this.ID ?? '(new)'} failed: ${msg}`);
            LockedWrite.Fail(result, SOURCE, `The section was not saved: its rules could not be checked (${msg}).`);
        }
        return result;
    }

    /** Stores the number and the name trimmed; missing text becomes empty, which the text rule refuses. */
    private normalizeText(): void {
        if ((!this.IsSaved || LockedWrite.AnyChanged(this, ['Number'])) && this.Number !== LockedWrite.Trimmed(this.Number)) {
            this.Number = LockedWrite.Trimmed(this.Number);
        }
        if ((!this.IsSaved || LockedWrite.AnyChanged(this, ['Name'])) && this.Name !== LockedWrite.Trimmed(this.Name)) {
            this.Name = LockedWrite.Trimmed(this.Name);
        }
    }

    /** Takes the version lock, the version resolved as the caller (none when it is unreadable). */
    protected async AcquireAuthoringLocks(): Promise<void> {
        const versionID = this.IsSaved ? LockedWrite.LoadedString(this, 'ProgramVersionID') : this.ProgramVersionID;
        await VersionTree.LockVersion(versionID, this.ActiveUser, this.provider);
    }

    private get provider(): IMetadataProvider {
        return LockedWrite.ProviderOf(this);
    }

    private async saveRefusal(): Promise<string | null> {
        const needsNumberCheck = !this.IsSaved || LockedWrite.AnyChanged(this, ['Number']);
        const params: RunViewParams[] = [];
        let staleIdx = -1;
        if (this.IsSaved) {
            staleIdx = params.length;
            params.push(LockedWrite.StaleParams(CredentialingEntity.Section, this.ID));
        }
        const versionIdx = params.length;
        params.push(ParentVersionLoader.VersionParams(this.ProgramVersionID));
        let siblingsIdx = -1;
        if (needsNumberCheck) {
            siblingsIdx = params.length;
            params.push({
                EntityName: CredentialingEntity.Section,
                ExtraFilter: IsValidUUID(this.ProgramVersionID) ? `ProgramVersionID = '${this.ProgramVersionID}'` : '1 = 0',
                Fields: ['ID', 'Number'],
                ResultType: 'simple',
                SkipTotalRowCount: true,
            });
        }

        const results = await RunView.FromMetadataProvider(this.provider).RunViews<
            StaleCheckRow | LoadedVersion | { ID: string; Number: string }
        >(params, this.ActiveUser);

        if (staleIdx >= 0) {
            const staleRes = results[staleIdx];
            if (!staleRes?.Success) {
                LogError(`${SOURCE}: re-reading section ${this.ID} failed: ${staleRes?.ErrorMessage}`);
                return NOT_FOUND_REASON;
            }
            const stale = LockedWrite.StaleReasonFromRow(staleRes.Results[0] as StaleCheckRow | undefined, this.__mj_UpdatedAt);
            if (stale != null) return stale;
            if (LockedWrite.AnyChanged(this, ['ProgramVersionID'])) return 'A section cannot be moved to another version.';
        }

        const versionRes = results[versionIdx];
        if (!versionRes?.Success) {
            LogError(`${SOURCE}: reading version ${this.ProgramVersionID} failed: ${versionRes?.ErrorMessage}`);
            return NOT_FOUND_REASON;
        }
        const version = versionRes.Results[0] as LoadedVersion | undefined;
        if (version == null) {
            return NOT_FOUND_REASON;
        }
        const edit = LockedWrite.ReasonOf(StandardAuthoringRules.CanEditTree(version.Status));
        if (edit != null) {
            return edit;
        }

        if (!this.IsSaved || LockedWrite.AnyChanged(this, ['Number', 'Name'])) {
            const text = LockedWrite.ReasonOf(StandardAuthoringRules.CheckSectionText({ Number: this.Number, Name: this.Name }));
            if (text != null) return text;
        }

        if (siblingsIdx >= 0) {
            const siblingsRes = results[siblingsIdx];
            if (!siblingsRes?.Success) {
                throw new Error(`reading the version's sections failed: ${siblingsRes?.ErrorMessage}`);
            }
            const number = LockedWrite.Trimmed(this.Number);
            const siblings = siblingsRes.Results as { ID: string; Number: string }[];
            const taken = siblings.some((s) => !(this.IsSaved && UUIDsEqual(s.ID, this.ID)) && (s.Number ?? '').trim().toLowerCase() === number.toLowerCase());
            return taken ? `Section number ${number} is already used in this version.` : null;
        }
        return null;
    }

    private async deleteRefusal(): Promise<string | null> {
        const [staleRes, versionRes, standardsRes] = await RunView.FromMetadataProvider(this.provider).RunViews<
            StaleCheckRow | LoadedVersion | { ID: string }
        >(
            [
                LockedWrite.StaleParams(CredentialingEntity.Section, this.ID),
                ParentVersionLoader.VersionParams(this.ProgramVersionID),
                {
                    EntityName: CredentialingEntity.Standard,
                    ExtraFilter: IsValidUUID(this.ID) ? `SectionID = '${this.ID}'` : '1 = 0',
                    Fields: ['ID'],
                    ResultType: 'simple',
                    MaxRows: 1,
                    SkipTotalRowCount: true,
                },
            ],
            this.ActiveUser,
        );
        if (!staleRes?.Success) {
            LogError(`${SOURCE}: re-reading section ${this.ID} before delete failed: ${staleRes?.ErrorMessage}`);
            return NOT_FOUND_REASON;
        }
        const stale = LockedWrite.StaleReasonFromRow(staleRes.Results[0] as StaleCheckRow | undefined, this.__mj_UpdatedAt);
        if (stale != null) {
            return stale;
        }
        if (!versionRes?.Success) {
            LogError(`${SOURCE}: reading version ${this.ProgramVersionID} before delete failed: ${versionRes?.ErrorMessage}`);
            return NOT_FOUND_REASON;
        }
        const version = versionRes.Results[0] as LoadedVersion | undefined;
        if (version == null) {
            return NOT_FOUND_REASON;
        }
        const edit = LockedWrite.ReasonOf(StandardAuthoringRules.CanEditTree(version.Status));
        if (edit != null) {
            return edit;
        }
        if (!standardsRes?.Success) {
            throw new Error(`reading the section's standards failed: ${standardsRes?.ErrorMessage}`);
        }
        return standardsRes.Results.length > 0 ? "Remove this section's standards before deleting it." : null;
    }
}
