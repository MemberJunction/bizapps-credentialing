/**
 * Server-side subclass of Section — a section is edited only on a Draft version the caller can read,
 * stays in its version, and is deleted only once it holds no standards. Writes run under the
 * version's authoring lock (guards/AuthoringLock.ts).
 */
import {
    BaseEntity,
    LogError,
    RunView,
    ValidationResult,
    type EntityDeleteOptions,
    type EntitySaveOptions,
    type IMetadataProvider,
} from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingSectionEntity } from '@mj-biz-apps/credentialing-entities';
import { LockedWrite } from './guards/LockedWrite.js';
import { VersionTree } from './guards/VersionTree.js';

const SOURCE = 'SectionEntityServer';

@RegisterClass(BaseEntity, CredentialingEntity.Section)
export class SectionEntityServer extends mjBizAppsCredentialingSectionEntity {
    /** Async validation carries the rules, so it must run on every save. */
    public override get DefaultSkipAsyncValidation(): boolean {
        return false;
    }

    public override async Save(options?: EntitySaveOptions): Promise<boolean> {
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

    /** Takes the version lock, the version resolved as the caller (none when it is unreadable). */
    protected async AcquireAuthoringLocks(): Promise<void> {
        const versionID = this.IsSaved ? LockedWrite.LoadedString(this, 'ProgramVersionID') : this.ProgramVersionID;
        await VersionTree.LockVersion(versionID, this.ActiveUser, this.provider);
    }

    private get provider(): IMetadataProvider {
        return LockedWrite.ProviderOf(this);
    }

    private async saveRefusal(): Promise<string | null> {
        if (this.IsSaved) {
            const stale = await LockedWrite.StaleReason(CredentialingEntity.Section, this.ID, this.__mj_UpdatedAt, this.ActiveUser, this.provider);
            if (stale != null) return stale;
            if (LockedWrite.AnyChanged(this, ['ProgramVersionID'])) return 'A section cannot be moved to another version.';
        }
        return VersionTree.EditRefusal(this.ProgramVersionID, this.ActiveUser, this.provider);
    }

    private async deleteRefusal(): Promise<string | null> {
        const stale = await LockedWrite.StaleReason(CredentialingEntity.Section, this.ID, this.__mj_UpdatedAt, this.ActiveUser, this.provider);
        if (stale != null) {
            return stale;
        }
        const edit = await VersionTree.EditRefusal(this.ProgramVersionID, this.ActiveUser, this.provider);
        if (edit != null) {
            return edit;
        }
        const res = await RunView.FromMetadataProvider(this.provider).RunView<{ ID: string }>(
            { EntityName: CredentialingEntity.Standard, ExtraFilter: `SectionID = '${this.ID}'`, Fields: ['ID'], ResultType: 'simple', MaxRows: 1 },
            this.ActiveUser,
        );
        if (!res.Success) {
            throw new Error(`reading the section's standards failed: ${res.ErrorMessage}`);
        }
        return res.Results.length > 0 ? "Remove this section's standards before deleting it." : null;
    }
}
