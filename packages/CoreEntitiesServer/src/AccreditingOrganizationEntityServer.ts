/**
 * Server-side subclass of AccreditingOrganization — an accrediting organization stays linked to the
 * BizApps Common organization it was created for, and is deleted only once it has no programs and no
 * members, refused with a sentence rather than left to the foreign keys.
 *
 * A delete runs in one transaction under the organization's authoring lock
 * (`AuthoringLock.ForOrganization`, the lock a `Program` create takes), in this order: lock, then the
 * stale-snapshot check, then the programs check, then the members check, then the row delete. So a
 * program created at the same moment is either committed before the programs check reads (and the
 * delete is refused with the sentence) or starts after the delete commits (and is refused as not
 * found, because it reads the organization as its caller under the same lock).
 *
 * READS AS THE SYSTEM USER, once. The only role that may delete an accrediting organization,
 * `Credentialing Admin`, has no permission on programs, so the programs check reads whether this one
 * organization still has a program as the system user ({@link SystemUser}): `ID` only, at most one row,
 * and nothing about the program reaches the caller beyond the fixed sentence. The admin provisions
 * organizations and may be told that programs exist, never which. That read is reached only by a
 * caller who holds Delete permission on accrediting organizations and can read this one (the
 * stale-snapshot check reads it as the caller first); any other caller gets the platform's own
 * permission refusal before the lock is taken. `docs/isolation-read-paths.md` lists it. The members
 * check reads as the caller: the admin reads and deletes memberships.
 *
 * The BizApps Common `Organization` row is NOT deleted: it belongs to BizApps Common and may be used
 * by other apps.
 */
import { BaseEntity, EntityPermissionType, LogError, RunView, ValidationResult, type EntityDeleteOptions, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingAccreditingOrganizationEntity } from '@mj-biz-apps/credentialing-entities';
import { AuthoringLock } from './guards/AuthoringLock.js';
import { LockedWrite } from './guards/LockedWrite.js';
import { SystemUser } from './guards/SystemUser.js';

const SOURCE = 'AccreditingOrganizationEntityServer';
const IMMUTABLE_FIELDS: readonly string[] = ['OrganizationID'];

/** The refusal given while the organization has a program. */
export const ORGANIZATION_HAS_PROGRAMS_REASON = "Remove this organization's programs before deleting it.";

/** The refusal given while the organization has a member. */
export const ORGANIZATION_HAS_MEMBERS_REASON = "Remove this organization's members before deleting it.";

/** Thrown when a check's read fails; the caller gets the sentence, the log gets the read's error. */
class CheckNotRead extends Error {
    constructor(what: 'programs' | 'members', detail: string) {
        super(`The organization was not deleted: its ${what} could not be checked. Try again in a moment.`);
        this.name = 'CheckNotRead';
        LogError(`${SOURCE}: reading the organization's ${what} before deleting it failed: ${detail}`);
    }
}

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
        if (!this.CheckPermissions(EntityPermissionType.Delete, false)) {
            // The platform refuses the delete in its own words; nothing below runs for this caller.
            return super.Delete(options);
        }
        return LockedWrite.Run(this, 'delete', async () => {
            await AuthoringLock.ForOrganization(this.ID, this.provider, this.ActiveUser);
            const refusal = await this.deleteRefusal();
            if (refusal != null) {
                LockedWrite.Refuse(this, 'delete', refusal);
                return false;
            }
            return super.Delete(options);
        });
    }

    private get provider(): IMetadataProvider {
        return LockedWrite.ProviderOf(this);
    }

    /** Why the organization may not be deleted now, or null when it may. Runs under the organization lock. */
    private async deleteRefusal(): Promise<string | null> {
        const stale = await LockedWrite.StaleReason(CredentialingEntity.AccreditingOrganization, this.ID, this.__mj_UpdatedAt, this.ActiveUser, this.provider);
        if (stale != null) {
            return stale;
        }
        if (await this.hasAny(CredentialingEntity.Program, 'programs', SystemUser.Get('Deleting an accrediting organization'))) {
            return ORGANIZATION_HAS_PROGRAMS_REASON;
        }
        if (await this.hasAny(CredentialingEntity.OrganizationMembership, 'members', this.ActiveUser)) {
            return ORGANIZATION_HAS_MEMBERS_REASON;
        }
        return null;
    }

    /** Whether any row of `entityName` belongs to this organization, read as `user`: one ID at most. */
    private async hasAny(entityName: string, what: 'programs' | 'members', user: UserInfo): Promise<boolean> {
        const res = await RunView.FromMetadataProvider(this.provider).RunView<{ ID: string }>(
            {
                EntityName: entityName,
                ExtraFilter: `AccreditingOrganizationID = '${this.ID}'`,
                Fields: ['ID'],
                ResultType: 'simple',
                MaxRows: 1,
            },
            user,
        );
        if (!res.Success) {
            throw new CheckNotRead(what, res.ErrorMessage ?? 'no error message');
        }
        return res.Results.length > 0;
    }
}
