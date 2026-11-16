/**
 * Server-side subclass of AccreditingOrganization — an accrediting organization stays linked to the
 * BizApps Common organization it was created for, and is deleted only once it has no programs.
 */
import { BaseEntity, LogError, RunView, ValidationResult, type EntityDeleteOptions } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingAccreditingOrganizationEntity } from '@mj-biz-apps/credentialing-entities';
import { LockedWrite } from './guards/LockedWrite.js';

const SOURCE = 'AccreditingOrganizationEntityServer';
const IMMUTABLE_FIELDS: readonly string[] = ['OrganizationID'];

@RegisterClass(BaseEntity, CredentialingEntity.AccreditingOrganization)
export class AccreditingOrganizationEntityServer extends mjBizAppsCredentialingAccreditingOrganizationEntity {
    /** Async validation carries the rules, so it must run on every save. */
    public override get DefaultSkipAsyncValidation(): boolean {
        return false;
    }

    public override async ValidateAsync(): Promise<ValidationResult> {
        const result = await super.ValidateAsync();
        if (this.IsSaved && LockedWrite.AnyChanged(this, IMMUTABLE_FIELDS)) {
            LockedWrite.Fail(result, SOURCE, 'An accrediting organization cannot be linked to another organization record.');
        }
        return result;
    }

    public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
        let refusal: string | null;
        try {
            refusal = await this.deleteRefusal();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            LogError(`${SOURCE}: checking organization ${this.ID} before delete failed: ${msg}`);
            refusal = `The organization was not deleted: its programs could not be checked (${msg}).`;
        }
        if (refusal != null) {
            LockedWrite.Refuse(this, 'delete', refusal);
            return false;
        }
        return super.Delete(options);
    }

    private async deleteRefusal(): Promise<string | null> {
        const res = await RunView.FromMetadataProvider(LockedWrite.ProviderOf(this)).RunView<{ ID: string }>(
            {
                EntityName: CredentialingEntity.Program,
                ExtraFilter: `AccreditingOrganizationID = '${this.ID}'`,
                Fields: ['ID'],
                ResultType: 'simple',
                MaxRows: 1,
            },
            this.ActiveUser,
        );
        if (!res.Success) {
            throw new Error(`reading the organization's programs failed: ${res.ErrorMessage}`);
        }
        return res.Results.length > 0 ? "Remove this organization's programs before deleting it." : null;
    }
}
