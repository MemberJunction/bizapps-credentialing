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
} from '@memberjunction/core';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import { CredentialingEntity, StandardAuthoringRules } from '@mj-biz-apps/credentialing-core';
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
        if (this.IsSaved) {
            const stale = await LockedWrite.StaleReason(CredentialingEntity.Section, this.ID, this.__mj_UpdatedAt, this.ActiveUser, this.provider);
            if (stale != null) return stale;
            if (LockedWrite.AnyChanged(this, ['ProgramVersionID'])) return 'A section cannot be moved to another version.';
        }
        const edit = await VersionTree.EditRefusal(this.ProgramVersionID, this.ActiveUser, this.provider);
        if (edit != null) {
            return edit;
        }
        if (!this.IsSaved || LockedWrite.AnyChanged(this, ['Number', 'Name'])) {
            const text = LockedWrite.ReasonOf(StandardAuthoringRules.CheckSectionText({ Number: this.Number, Name: this.Name }));
            if (text != null) return text;
        }
        return !this.IsSaved || LockedWrite.AnyChanged(this, ['Number']) ? this.numberRefusal() : null;
    }

    /** Another section of this version with the same number (trimmed, ignoring case), read as the caller in one RunView. */
    private async numberRefusal(): Promise<string | null> {
        const number = LockedWrite.Trimmed(this.Number);
        const res = await RunView.FromMetadataProvider(this.provider).RunView<{ ID: string; Number: string }>(
            { EntityName: CredentialingEntity.Section, ExtraFilter: `ProgramVersionID = '${this.ProgramVersionID}'`, Fields: ['ID', 'Number'], ResultType: 'simple' },
            this.ActiveUser,
        );
        if (!res.Success) {
            throw new Error(`reading the version's sections failed: ${res.ErrorMessage}`);
        }
        const taken = res.Results.some((s) => !(this.IsSaved && UUIDsEqual(s.ID, this.ID)) && (s.Number ?? '').trim().toLowerCase() === number.toLowerCase());
        return taken ? `Section number ${number} is already used in this version.` : null;
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
