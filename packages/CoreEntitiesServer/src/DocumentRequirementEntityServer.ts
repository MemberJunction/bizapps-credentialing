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
} from '@memberjunction/core';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import { CredentialingEntity, StandardAuthoringRules } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingDocumentRequirementEntity } from '@mj-biz-apps/credentialing-entities';
import { LockedWrite } from './guards/LockedWrite.js';
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
        if (this.IsSaved) {
            const stale = await LockedWrite.StaleReason(
                CredentialingEntity.DocumentRequirement,
                this.ID,
                this.__mj_UpdatedAt,
                this.ActiveUser,
                this.provider,
            );
            if (stale != null) return stale;
            if (LockedWrite.AnyChanged(this, ['ProgramVersionID'])) return 'A document requirement cannot be moved to another version.';
        }
        const edit = await VersionTree.EditRefusal(this.ProgramVersionID, this.ActiveUser, this.provider);
        if (edit != null) {
            return edit;
        }
        if (!this.IsSaved || LockedWrite.AnyChanged(this, ['Name'])) {
            const text = LockedWrite.ReasonOf(StandardAuthoringRules.CheckDocumentRequirementText({ Name: this.Name }));
            return text ?? this.nameRefusal();
        }
        return null;
    }

    /** A name another requirement of the version already has, compared trimmed and ignoring case. */
    private async nameRefusal(): Promise<string | null> {
        const res = await RunView.FromMetadataProvider(this.provider).RunView<{ ID: string; Name: string }>(
            {
                EntityName: CredentialingEntity.DocumentRequirement,
                ExtraFilter: `ProgramVersionID = '${this.ProgramVersionID}'`,
                Fields: ['ID', 'Name'],
                ResultType: 'simple',
            },
            this.ActiveUser,
        );
        if (!res.Success) {
            throw new Error(`reading the version's document requirements failed: ${res.ErrorMessage}`);
        }
        const name = LockedWrite.Trimmed(this.Name);
        const taken = res.Results.some(
            (r) => !(this.IsSaved && UUIDsEqual(r.ID, this.ID)) && r.Name.trim().toLowerCase() === name.toLowerCase(),
        );
        return taken ? `A document requirement named ${name} already exists in this version.` : null;
    }

    private async deleteRefusal(): Promise<string | null> {
        const stale = await LockedWrite.StaleReason(
            CredentialingEntity.DocumentRequirement,
            this.ID,
            this.__mj_UpdatedAt,
            this.ActiveUser,
            this.provider,
        );
        if (stale != null) {
            return stale;
        }
        return VersionTree.EditRefusal(this.ProgramVersionID, this.ActiveUser, this.provider);
    }
}
