/**
 * Server-side subclass of DocumentRequirement — a requirement is edited only on a Draft version the
 * caller can read, stays in its version, and its name holds text (stored trimmed) and is unique in the
 * version ignoring case and surrounding spaces. Writes run under the version's authoring lock (guards/AuthoringLock.ts).
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
import { mjBizAppsCredentialingDocumentRequirementEntity } from '@mj-biz-apps/credentialing-entities';
import { LockedWrite, type StaleCheckRow } from './guards/LockedWrite.js';
import { ParentVersionLoader, type LoadedVersion } from './guards/ParentVersionLoader.js';
import { VersionTree } from './guards/VersionTree.js';

const SOURCE = 'DocumentRequirementEntityServer';

@RegisterClass(BaseEntity, CredentialingEntity.DocumentRequirement)
export class DocumentRequirementEntityServer extends mjBizAppsCredentialingDocumentRequirementEntity {
    /** Async validation carries the rules, so it must run on every save. */
    public override get DefaultSkipAsyncValidation(): boolean {
        return false;
    }

    public override async Save(options?: EntitySaveOptions): Promise<boolean> {
        if ((!this.IsSaved || LockedWrite.AnyChanged(this, ['Name'])) && this.Name !== LockedWrite.Trimmed(this.Name)) {
            this.Name = LockedWrite.Trimmed(this.Name);
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
            LogError(`${SOURCE}: checking document requirement ${this.ID ?? '(new)'} failed: ${msg}`);
            LockedWrite.Fail(result, SOURCE, `The document requirement was not saved: its rules could not be checked (${msg}).`);
        }
        return result;
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
        const needsNameCheck = !this.IsSaved || LockedWrite.AnyChanged(this, ['Name']);
        const params: RunViewParams[] = [];
        let staleIdx = -1;
        if (this.IsSaved) {
            staleIdx = params.length;
            params.push(LockedWrite.StaleParams(CredentialingEntity.DocumentRequirement, this.ID));
        }
        const versionIdx = params.length;
        params.push(ParentVersionLoader.VersionParams(this.ProgramVersionID));
        let siblingsIdx = -1;
        if (needsNameCheck) {
            siblingsIdx = params.length;
            params.push({
                EntityName: CredentialingEntity.DocumentRequirement,
                ExtraFilter: IsValidUUID(this.ProgramVersionID) ? `ProgramVersionID = '${this.ProgramVersionID}'` : '1 = 0',
                Fields: ['ID', 'Name'],
                ResultType: 'simple',
                SkipTotalRowCount: true,
            });
        }

        const results = await RunView.FromMetadataProvider(this.provider).RunViews<
            StaleCheckRow | LoadedVersion | { ID: string; Name: string }
        >(params, this.ActiveUser);

        if (staleIdx >= 0) {
            const staleRes = results[staleIdx];
            if (!staleRes?.Success) {
                LogError(`${SOURCE}: re-reading document requirement ${this.ID} failed: ${staleRes?.ErrorMessage}`);
                return NOT_FOUND_REASON;
            }
            const stale = LockedWrite.StaleReasonFromRow(staleRes.Results[0] as StaleCheckRow | undefined, this.__mj_UpdatedAt);
            if (stale != null) return stale;
            if (LockedWrite.AnyChanged(this, ['ProgramVersionID'])) return 'A document requirement cannot be moved to another version.';
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

        if (needsNameCheck) {
            const text = LockedWrite.ReasonOf(StandardAuthoringRules.CheckDocumentRequirementText({ Name: this.Name }));
            if (text != null) {
                return text;
            }
            const siblingsRes = results[siblingsIdx];
            if (!siblingsRes?.Success) {
                throw new Error(`reading the version's document requirements failed: ${siblingsRes?.ErrorMessage}`);
            }
            const name = LockedWrite.Trimmed(this.Name);
            const siblings = siblingsRes.Results as { ID: string; Name: string }[];
            const taken = siblings.some(
                (r) => !(this.IsSaved && UUIDsEqual(r.ID, this.ID)) && r.Name.trim().toLowerCase() === name.toLowerCase(),
            );
            return taken ? `A document requirement named ${name} already exists in this version.` : null;
        }
        return null;
    }

    private async deleteRefusal(): Promise<string | null> {
        const [staleRes, versionRes] = await RunView.FromMetadataProvider(this.provider).RunViews<
            StaleCheckRow | LoadedVersion
        >(
            [
                LockedWrite.StaleParams(CredentialingEntity.DocumentRequirement, this.ID),
                ParentVersionLoader.VersionParams(this.ProgramVersionID),
            ],
            this.ActiveUser,
        );
        if (!staleRes?.Success) {
            LogError(`${SOURCE}: re-reading document requirement ${this.ID} before delete failed: ${staleRes?.ErrorMessage}`);
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
        return LockedWrite.ReasonOf(StandardAuthoringRules.CanEditTree(version.Status));
    }
}
