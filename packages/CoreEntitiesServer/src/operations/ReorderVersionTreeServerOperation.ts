/**
 * Server body of `Credentialing.ReorderVersionTree` (FRD FR-2.2): sets the `Sequence` of a version's
 * sections and standards in one transaction.
 *
 * The version lock is taken FIRST, and only then are the rows read and saved. Every write under a
 * version takes the same lock, so no other edit can land between the read and the saves: the rows
 * saved here are the rows as stored, and a concurrent edit is never overwritten by an older copy.
 * A version that is not a Draft is refused by the row guards with the tree-edit sentence.
 */
import {
    BaseRemotableOperation,
    RunView,
    type BaseEntity,
    type IMetadataProvider,
    type UserInfo,
} from '@memberjunction/core';
import { IsValidUUID, RegisterClass, UUIDsEqual } from '@memberjunction/global';
import {
    CREDENTIALING_STAFF_ROLE,
    CredentialingEntity,
    CredentialingOperation,
    NOT_FOUND_REASON,
    ReorderVersionTreeOperation,
    type ReorderVersionTreeInput,
    type ReorderVersionTreeOutput,
    type TreeRowSequence,
} from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingSectionEntity, mjBizAppsCredentialingStandardEntity } from '@mj-biz-apps/credentialing-entities';
import { VersionTree } from '../guards/VersionTree.js';
import { OperationSupport } from './OperationSupport.js';

/** A row of the tree whose `Sequence` the operation sets. */
type TreeRow = mjBizAppsCredentialingSectionEntity | mjBizAppsCredentialingStandardEntity;

@RegisterClass(BaseRemotableOperation, CredentialingOperation.ReorderVersionTree)
export class ReorderVersionTreeServerOperation extends ReorderVersionTreeOperation {
    protected override async Authorize(_input: ReorderVersionTreeInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE);
    }

    protected override async InternalExecute(input: ReorderVersionTreeInput, provider: IMetadataProvider, user: UserInfo): Promise<ReorderVersionTreeOutput> {
        const sections = input.Sections ?? [];
        const standards = input.Standards ?? [];
        return OperationSupport.InTransaction(provider, async () => {
            const version = IsValidUUID(input.VersionID) ? await VersionTree.LockVersion(input.VersionID, user, provider) : null;
            if (version == null) {
                OperationSupport.Refuse(NOT_FOUND_REASON);
            }
            const [storedSections, storedStandards] = await this.loadTree(version.ID, provider, user);
            const sectionRows = this.match(sections, storedSections);
            const standardRows = this.match(standards, storedStandards);
            for (const [row, sequence] of [...sectionRows, ...standardRows]) {
                if (row.Sequence !== sequence) {
                    row.Sequence = sequence;
                    await OperationSupport.Save(row);
                }
            }
            return { SectionsUpdated: sectionRows.length, StandardsUpdated: standardRows.length };
        });
    }

    /** The version's sections and standards as entity objects of the caller, read under the lock in one RunViews call. */
    private async loadTree(
        versionID: string,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<[mjBizAppsCredentialingSectionEntity[], mjBizAppsCredentialingStandardEntity[]]> {
        const filter = `ProgramVersionID = '${versionID}'`;
        const results = await RunView.FromMetadataProvider(provider).RunViews<BaseEntity>(
            [
                { EntityName: CredentialingEntity.Section, ExtraFilter: filter, ResultType: 'entity_object' },
                { EntityName: CredentialingEntity.Standard, ExtraFilter: filter, ResultType: 'entity_object' },
            ],
            user,
        );
        const failed = results.find((r) => !r.Success);
        if (failed != null) {
            throw new Error(`reading the version's tree failed: ${failed.ErrorMessage}`);
        }
        return [results[0].Results as mjBizAppsCredentialingSectionEntity[], results[1].Results as mjBizAppsCredentialingStandardEntity[]];
    }

    /** Pairs each requested row with its stored entity; a row that is not in the version is not found. */
    private match<T extends TreeRow>(requested: TreeRowSequence[], stored: T[]): Array<[T, number]> {
        return requested.map((r) => {
            const row = stored.find((s) => UUIDsEqual(s.ID, r.ID));
            if (row == null) {
                OperationSupport.Refuse(NOT_FOUND_REASON);
            }
            if (!Number.isInteger(r.Sequence)) {
                OperationSupport.Refuse('Each position in the new order must be a whole number.');
            }
            return [row, r.Sequence];
        });
    }
}
