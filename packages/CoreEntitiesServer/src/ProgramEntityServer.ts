/**
 * Server-side subclass of Program — a program stays in the accrediting organization it was created in,
 * a new program can only be created in an organization the caller can read (FRD BR-13: an unreadable
 * organization is refused exactly like one that does not exist), its name, credential prefix and
 * subject noun hold text (stored trimmed), and its name and credential prefix
 * are unique within the organization (trimmed, ignoring case), refused with a sentence rather than
 * left to the unique constraints.
 *
 * A create, and an update that changes `Name` or `CredentialPrefix`, runs under the organization's
 * authoring lock (`AuthoringLock.ForOrganization`), so two simultaneous saves of the same name cannot
 * both pass the duplicate check: the second waits, then reads the first's committed row.
 *
 * The duplicate check reads programs as the caller, filtered to this program's own organization, which
 * the caller must be able to read (a create into an unreadable organization is refused as not found
 * before the check runs, and the organization of a saved program cannot change). The staff row filter
 * limits the read to the caller's own organizations, so the check cannot find, and so cannot reveal,
 * a program of another organization.
 */
import { BaseEntity, LogError, RunView, ValidationResult, type EntitySaveOptions, type IMetadataProvider } from '@memberjunction/core';
import { IsValidUUID, RegisterClass, UUIDsEqual } from '@memberjunction/global';
import { CredentialingEntity, NOT_FOUND_REASON, ProgramRules } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingProgramEntity } from '@mj-biz-apps/credentialing-entities';
import { AuthoringLock } from './guards/AuthoringLock.js';
import { LockedWrite } from './guards/LockedWrite.js';
import { ParentVersionLoader } from './guards/ParentVersionLoader.js';

const SOURCE = 'ProgramEntityServer';

/** The fields unique within an organization; changing either runs the duplicate check under the lock. */
const UNIQUE_FIELDS: readonly string[] = ['Name', 'CredentialPrefix'];

interface SiblingProgram {
    ID: string;
    Name: string;
    CredentialPrefix: string;
}

@RegisterClass(BaseEntity, CredentialingEntity.Program)
export class ProgramEntityServer extends mjBizAppsCredentialingProgramEntity {
    /** Async validation carries the rules, so it must run on every save. */
    public override get DefaultSkipAsyncValidation(): boolean {
        return false;
    }

    public override async Save(options?: EntitySaveOptions): Promise<boolean> {
        this.trimText();
        if (!this.needsUniqueCheck()) {
            return super.Save(options);
        }
        return LockedWrite.Run(this, this.IsSaved ? 'update' : 'create', async () => {
            await this.AcquireOrganizationLock();
            return super.Save(options);
        });
    }

    public override async ValidateAsync(): Promise<ValidationResult> {
        const result = await super.ValidateAsync();
        if (this.IsSaved && !LockedWrite.AnyChanged(this, [...ProgramRules.ImmutableFields, ...ProgramRules.RequiredTextFields])) {
            return result;
        }
        try {
            const refusal = await this.refusal();
            if (refusal != null) {
                LockedWrite.Fail(result, SOURCE, refusal);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            LogError(`${SOURCE}: checking program ${this.ID ?? '(new)'} failed: ${msg}`);
            LockedWrite.Fail(result, SOURCE, `The program was not saved: its rules could not be checked (${msg}).`);
        }
        return result;
    }

    /**
     * Takes the organization's authoring lock, the organization resolved as the caller. An organization
     * the caller cannot read takes no lock; the save is then refused as not found during validation.
     */
    protected async AcquireOrganizationLock(): Promise<void> {
        const organizationID = this.IsSaved ? LockedWrite.LoadedString(this, 'AccreditingOrganizationID') ?? this.AccreditingOrganizationID : this.AccreditingOrganizationID;
        if (organizationID == null) {
            return;
        }
        const organization = await ParentVersionLoader.LoadAccreditingOrganization(organizationID, this.ActiveUser, this.provider);
        if (organization != null) {
            await AuthoringLock.ForOrganization(organization.ID, this.provider, this.ActiveUser);
        }
    }

    private needsUniqueCheck(): boolean {
        return !this.IsSaved || LockedWrite.AnyChanged(this, UNIQUE_FIELDS);
    }

    /**
     * The name, prefix and subject noun are stored without surrounding spaces; on a create, or when one
     * is changed, missing text becomes empty, which the text rule refuses.
     */
    private trimText(): void {
        if (this.writes('Name') && this.Name !== LockedWrite.Trimmed(this.Name)) {
            this.Name = LockedWrite.Trimmed(this.Name);
        }
        if (this.writes('CredentialPrefix') && this.CredentialPrefix !== LockedWrite.Trimmed(this.CredentialPrefix)) {
            this.CredentialPrefix = LockedWrite.Trimmed(this.CredentialPrefix);
        }
        if (this.writes('SubjectNoun') && this.SubjectNoun !== LockedWrite.Trimmed(this.SubjectNoun)) {
            this.SubjectNoun = LockedWrite.Trimmed(this.SubjectNoun);
        }
    }

    /** Whether this save writes `fieldName`: every field on a create, a changed one on an update. */
    private writes(fieldName: string): boolean {
        return !this.IsSaved || LockedWrite.AnyChanged(this, [fieldName]);
    }

    /** A name, prefix or subject noun that holds no text, on a create or a save that changes one of them. */
    private textRefusal(): string | null {
        if (this.IsSaved && !LockedWrite.AnyChanged(this, ProgramRules.RequiredTextFields)) {
            return null;
        }
        return LockedWrite.ReasonOf(
            ProgramRules.CheckRequiredText({ Name: this.Name, CredentialPrefix: this.CredentialPrefix, SubjectNoun: this.SubjectNoun }),
        );
    }

    private get provider(): IMetadataProvider {
        return LockedWrite.ProviderOf(this);
    }

    private async refusal(): Promise<string | null> {
        const rule = ProgramRules.CanChangeFields(!this.IsSaved, LockedWrite.ChangedFields(this));
        const ruleReason = LockedWrite.ReasonOf(rule) ?? this.textRefusal();
        if (ruleReason != null) {
            return ruleReason;
        }
        if (!this.IsSaved) {
            const organization = await ParentVersionLoader.LoadAccreditingOrganization(this.AccreditingOrganizationID, this.ActiveUser, this.provider);
            if (organization == null) {
                return NOT_FOUND_REASON;
            }
        }
        return this.needsUniqueCheck() ? this.duplicateRefusal(await this.loadSiblings()) : null;
    }

    /** The other programs of this program's organization, read as the caller in one RunView. */
    private async loadSiblings(): Promise<SiblingProgram[]> {
        if (!IsValidUUID(this.AccreditingOrganizationID)) {
            throw new Error('the program has no valid accrediting organization');
        }
        const res = await RunView.FromMetadataProvider(this.provider).RunView<SiblingProgram>(
            {
                EntityName: CredentialingEntity.Program,
                ExtraFilter: `AccreditingOrganizationID = '${this.AccreditingOrganizationID}'`,
                Fields: ['ID', 'Name', 'CredentialPrefix'],
                ResultType: 'simple',
            },
            this.ActiveUser,
        );
        if (!res.Success) {
            throw new Error(`reading the organization's programs failed: ${res.ErrorMessage}`);
        }
        return res.Results.filter((p) => !this.IsSaved || !UUIDsEqual(p.ID, this.ID));
    }

    private duplicateRefusal(siblings: SiblingProgram[]): string | null {
        const name = (this.Name ?? '').trim();
        const prefix = (this.CredentialPrefix ?? '').trim();
        const same = (a: string | null, b: string): boolean => (a ?? '').trim().toLowerCase() === b.toLowerCase();
        if (LockedWrite.AnyChanged(this, ['Name']) || !this.IsSaved) {
            if (name.length > 0 && siblings.some((p) => same(p.Name, name))) {
                return `A program named ${name} already exists in this organization.`;
            }
        }
        if (LockedWrite.AnyChanged(this, ['CredentialPrefix']) || !this.IsSaved) {
            if (prefix.length > 0 && siblings.some((p) => same(p.CredentialPrefix, prefix))) {
                return `Credential prefix ${prefix} is already used in this organization.`;
            }
        }
        return null;
    }
}
