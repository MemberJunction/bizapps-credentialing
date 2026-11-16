/**
 * Server-side subclass of Program — a program stays in the accrediting organization it was created in,
 * and a new program can only be created in an organization the caller can read (FRD BR-13: an
 * unreadable organization is refused exactly like one that does not exist).
 */
import { BaseEntity, LogError, ValidationResult, type IMetadataProvider } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingEntity, NOT_FOUND_REASON, ProgramRules } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingProgramEntity } from '@mj-biz-apps/credentialing-entities';
import { LockedWrite } from './guards/LockedWrite.js';
import { ParentVersionLoader } from './guards/ParentVersionLoader.js';

const SOURCE = 'ProgramEntityServer';

@RegisterClass(BaseEntity, CredentialingEntity.Program)
export class ProgramEntityServer extends mjBizAppsCredentialingProgramEntity {
    /** Async validation carries the rules, so it must run on every save. */
    public override get DefaultSkipAsyncValidation(): boolean {
        return false;
    }

    public override async ValidateAsync(): Promise<ValidationResult> {
        const result = await super.ValidateAsync();
        if (this.IsSaved && !LockedWrite.AnyChanged(this, ProgramRules.ImmutableFields)) {
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

    private get provider(): IMetadataProvider {
        return LockedWrite.ProviderOf(this);
    }

    private async refusal(): Promise<string | null> {
        const rule = ProgramRules.CanChangeFields(!this.IsSaved, LockedWrite.ChangedFields(this));
        const ruleReason = LockedWrite.ReasonOf(rule);
        if (ruleReason != null) {
            return ruleReason;
        }
        if (!this.IsSaved) {
            const organization = await ParentVersionLoader.LoadAccreditingOrganization(this.AccreditingOrganizationID, this.ActiveUser, this.provider);
            if (organization == null) {
                return NOT_FOUND_REASON;
            }
        }
        return null;
    }
}
