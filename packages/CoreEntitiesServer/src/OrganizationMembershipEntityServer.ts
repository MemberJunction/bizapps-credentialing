/**
 * Server-side subclass of OrganizationMembership — a membership names one person in one accrediting
 * organization for its whole life: both keys are fixed once it is created.
 */
import { BaseEntity, ValidationResult } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingOrganizationMembershipEntity } from '@mj-biz-apps/credentialing-entities';
import { LockedWrite } from './guards/LockedWrite.js';

const SOURCE = 'OrganizationMembershipEntityServer';
const IMMUTABLE_FIELDS: readonly string[] = ['AccreditingOrganizationID', 'UserID'];

@RegisterClass(BaseEntity, CredentialingEntity.OrganizationMembership)
export class OrganizationMembershipEntityServer extends mjBizAppsCredentialingOrganizationMembershipEntity {
    /** Async validation carries the rules, so it must run on every save. */
    public override get DefaultSkipAsyncValidation(): boolean {
        return false;
    }

    public override async ValidateAsync(): Promise<ValidationResult> {
        const result = await super.ValidateAsync();
        if (this.IsSaved && LockedWrite.AnyChanged(this, IMMUTABLE_FIELDS)) {
            LockedWrite.Fail(result, SOURCE, 'A membership cannot be moved to another organization or person.');
        }
        return result;
    }
}
