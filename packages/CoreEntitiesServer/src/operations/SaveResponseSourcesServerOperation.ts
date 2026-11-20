import { BaseRemotableOperation, RunView, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { EscapeSQLString, IsValidUUID, RegisterClass, UUIDsEqual } from '@memberjunction/global';
import {
    CREDENTIALING_STAFF_ROLE,
    CredentialingEntity,
    CredentialingOperation,
    NOT_FOUND_REASON,
    ResponseSourceRules,
    SaveResponseSourcesOperation,
    type ResponseSourceMode,
    type SavedResponseSource,
    type SaveResponseSourcesInput,
    type SaveResponseSourcesOutput,
    type SourceDraft,
} from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingResponseSourceEntity } from '@mj-biz-apps/credentialing-entities';
import { VersionTree } from '../guards/VersionTree.js';
import { OperationSupport } from './OperationSupport.js';
import { RequireRule } from './ResponseWorkspaceHelper.js';

type ResponseSourceEntity = mjBizAppsCredentialingResponseSourceEntity;

interface StandardSummaryRow {
    ID: string;
    ProgramVersionID: string;
    IntakeMode: string;
}

interface RequirementSummaryRow {
    ID: string;
    Name: string;
}

const VALID_MODES: ReadonlySet<ResponseSourceMode> = new Set(['Prefill Only', 'Verify Only', 'Both']);

@RegisterClass(BaseRemotableOperation, CredentialingOperation.SaveResponseSources)
export class SaveResponseSourcesServerOperation extends SaveResponseSourcesOperation {
    protected override async Authorize(_input: SaveResponseSourcesInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE);
    }

    protected override async InternalExecute(
        input: SaveResponseSourcesInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<SaveResponseSourcesOutput> {
        if (!IsValidUUID(input.StandardID)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        const items = input.Sources ?? [];
        for (const item of items) {
            if (!VALID_MODES.has(item.Mode)) {
                OperationSupport.Refuse('Choose a valid mode for each response source.');
            }
            if (item.ID != null && !IsValidUUID(item.ID)) {
                OperationSupport.Refuse(NOT_FOUND_REASON);
            }
        }

        return OperationSupport.InTransaction(provider, async () => {
            const initialStandard = await this.loadStandard(input.StandardID, provider, user);
            if (initialStandard == null) {
                OperationSupport.Refuse(NOT_FOUND_REASON);
            }

            const version = await VersionTree.LockVersion(initialStandard.ProgramVersionID, user, provider);
            if (version == null) {
                OperationSupport.Refuse(NOT_FOUND_REASON);
            }

            const [freshStandard, requirements, stored] = await this.loadUnderLock(
                input.StandardID,
                version.ID,
                provider,
                user,
            );
            if (freshStandard == null) {
                OperationSupport.Refuse(NOT_FOUND_REASON);
            }

            const storedByID = new Map<string, ResponseSourceEntity>();
            for (const row of stored) {
                storedByID.set(row.ID.toLowerCase(), row);
            }

            const seenIDs = new Set<string>();
            for (const item of items) {
                if (item.ID != null) {
                    const key = item.ID.toLowerCase();
                    if (!storedByID.has(key) || seenIDs.has(key)) {
                        OperationSupport.Refuse(NOT_FOUND_REASON);
                    }
                    seenIDs.add(key);
                }
            }

            const drafts: SourceDraft[] = items.map((item, idx) => ({
                ID: item.ID,
                SourceType: 'Document Extraction',
                DocumentRequirementID: item.DocumentRequirementID,
                Mode: item.Mode,
                Rank: idx + 1,
                Sequence: idx,
            }));
            const requirementIDs = requirements.map((r) => r.ID);
            RequireRule(
                ResponseSourceRules.Validate(
                    drafts,
                    { IntakeMode: freshStandard.IntakeMode },
                    version.Status,
                    requirementIDs,
                ),
            );

            // Delete removed rows first so re-adding a removed requirement never collides during entity validation.
            const removed = stored.filter((row) => !seenIDs.has(row.ID.toLowerCase()));
            for (const row of removed) {
                await this.deleteRow(row);
            }

            // If any kept row changes its DocumentRequirementID, delete it before saving to avoid transient swap collisions.
            const recreateIDs = new Set<string>();
            for (const item of items) {
                if (item.ID == null) continue;
                const existing = storedByID.get(item.ID.toLowerCase())!;
                if (
                    existing.DocumentRequirementID == null ||
                    !UUIDsEqual(existing.DocumentRequirementID, item.DocumentRequirementID)
                ) {
                    recreateIDs.add(existing.ID.toLowerCase());
                    await this.deleteRow(existing);
                }
            }

            const reqNameByID = new Map(requirements.map((r) => [r.ID.toLowerCase(), r.Name]));
            const saved: SavedResponseSource[] = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const rank = i + 1;
                const sequence = i;
                const existing =
                    item.ID != null && !recreateIDs.has(item.ID.toLowerCase())
                        ? storedByID.get(item.ID.toLowerCase())
                        : undefined;

                let row: ResponseSourceEntity;
                if (existing != null) {
                    existing.SourceType = 'Document Extraction';
                    existing.Mode = item.Mode;
                    existing.Rank = rank;
                    existing.Sequence = sequence;
                    if (existing.Dirty) {
                        await OperationSupport.Save(existing);
                    }
                    row = existing;
                } else {
                    row = await OperationSupport.NewRecord<ResponseSourceEntity>(
                        provider,
                        CredentialingEntity.ResponseSource,
                        user,
                    );
                    row.StandardID = freshStandard.ID;
                    row.ProgramVersionID = freshStandard.ProgramVersionID;
                    row.SourceType = 'Document Extraction';
                    row.DocumentRequirementID = item.DocumentRequirementID;
                    row.Mode = item.Mode;
                    row.Rank = rank;
                    row.Sequence = sequence;
                    await OperationSupport.Save(row);
                }

                saved.push({
                    ID: row.ID,
                    StandardID: row.StandardID,
                    SourceType: row.SourceType,
                    DocumentRequirementID: row.DocumentRequirementID,
                    DocumentRequirement:
                        row.DocumentRequirementID != null
                            ? (reqNameByID.get(row.DocumentRequirementID.toLowerCase()) ?? row.DocumentRequirement)
                            : null,
                    Mode: row.Mode,
                    Rank: row.Rank,
                    Sequence: row.Sequence,
                });
            }

            return { Sources: saved };
        });
    }

    private async loadStandard(
        standardID: string,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<StandardSummaryRow | null> {
        const res = await RunView.FromMetadataProvider(provider).RunView<StandardSummaryRow>(
            {
                EntityName: CredentialingEntity.Standard,
                ExtraFilter: `ID = '${EscapeSQLString(standardID)}'`,
                Fields: ['ID', 'ProgramVersionID', 'IntakeMode'],
                ResultType: 'simple',
                MaxRows: 1,
                SkipTotalRowCount: true,
            },
            user,
        );
        if (!res.Success) {
            throw new Error(`Reading standard failed: ${res.ErrorMessage ?? 'unknown error'}`);
        }
        return res.Results?.[0] ?? null;
    }

    private async loadUnderLock(
        standardID: string,
        versionID: string,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<[StandardSummaryRow | null, RequirementSummaryRow[], ResponseSourceEntity[]]> {
        const escapedStd = EscapeSQLString(standardID);
        const escapedVer = EscapeSQLString(versionID);
        const results = await RunView.FromMetadataProvider(provider).RunViews<
            StandardSummaryRow | RequirementSummaryRow | ResponseSourceEntity
        >(
            [
                {
                    EntityName: CredentialingEntity.Standard,
                    ExtraFilter: `ID = '${escapedStd}'`,
                    Fields: ['ID', 'ProgramVersionID', 'IntakeMode'],
                    ResultType: 'simple',
                    MaxRows: 1,
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.DocumentRequirement,
                    ExtraFilter: `ProgramVersionID = '${escapedVer}'`,
                    Fields: ['ID', 'Name'],
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.ResponseSource,
                    ExtraFilter: `StandardID = '${escapedStd}'`,
                    OrderBy: 'Rank ASC, Sequence ASC',
                    ResultType: 'entity_object',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
            ],
            user,
        );
        const failed = results.find((r) => !r.Success);
        if (failed != null) {
            throw new Error(`Reading response sources failed: ${failed.ErrorMessage ?? 'unknown error'}`);
        }
        return [
            (results[0].Results?.[0] as StandardSummaryRow | undefined) ?? null,
            (results[1].Results ?? []) as RequirementSummaryRow[],
            (results[2].Results ?? []) as ResponseSourceEntity[],
        ];
    }

    private async deleteRow(row: ResponseSourceEntity): Promise<void> {
        if (!(await row.Delete())) {
            OperationSupport.Refuse(
                row.LatestResult?.CompleteMessage || 'The response source could not be removed.',
            );
        }
    }
}
