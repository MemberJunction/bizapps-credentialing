import { CompositeKey, RunView, type IMetadataProvider, type RunViewParams, type UserInfo } from '@memberjunction/core';
import { IsValidUUID } from '@memberjunction/global';
import { CredentialingEntity, type ApplicationStatus } from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingApplicationEntity,
    mjBizAppsCredentialingEvidenceDocumentEntity,
    mjBizAppsCredentialingExtractionEntity,
    mjBizAppsCredentialingResponseSourceEntity,
    mjBizAppsCredentialingStandardEntity,
} from '@mj-biz-apps/credentialing-entities';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite, type OperationWriteScope } from '../guards/OperationWrite.js';
import { SystemUser } from '../guards/SystemUser.js';
import { OperationSupport } from '../operations/OperationSupport.js';
import { CredentialingServices } from '../services/CredentialingServices.js';
import type {
    DocumentLockScope,
    NewExtraction,
    ReadingCommitScope,
    ReadingData,
    ReadingDocument,
    ReadingStateChange,
    RecognizedTextChange,
    StandardToRead,
} from './ReadingData.js';

type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;
type ExtractionEntity = mjBizAppsCredentialingExtractionEntity;

/** The parts of a response source the reading plan reads. */
type SourceRow = Pick<mjBizAppsCredentialingResponseSourceEntity, 'StandardID' | 'ProgramVersionID'>;
/** The parts of a standard a reading request carries. */
type StandardRow = Pick<mjBizAppsCredentialingStandardEntity, 'ID' | 'Code' | 'Statement' | 'Guidance' | 'EvidenceHint' | 'IntakeMode' | 'ProgramVersionID'>;
/** The parts of an application the reading plan and the commit read. */
type ApplicationRow = Pick<mjBizAppsCredentialingApplicationEntity, 'ID' | 'ProgramVersionID' | 'Status'>;

const PURPOSE = 'Reading uploaded evidence';

/** A comma-separated list of quoted UUIDs for an `IN (…)` filter; throws on anything that is not a UUID. */
function uuidList(ids: readonly string[]): string {
    for (const id of ids) {
        if (!IsValidUUID(id)) {
            throw new Error(`Not a UUID: ${id}`);
        }
    }
    return ids.map((id) => `'${id}'`).join(', ');
}

/** The subject filter of a search narrowed to some subjects (a check's own), or an empty string. */
function subjectClause(subjectIDs: readonly string[] | null): string {
    return subjectIDs == null ? '' : subjectIDs.length === 0 ? ' AND 1 = 0' : ` AND SubjectID IN (${uuidList(subjectIDs)})`;
}

/** Runs one simple view as `user` on `provider`; throws with the view's error when it fails. */
async function readRows<T extends object>(provider: IMetadataProvider, user: UserInfo, params: RunViewParams): Promise<T[]> {
    const result = await RunView.FromMetadataProvider(provider).RunView<T>({ ...params, ResultType: 'simple', IgnoreMaxRows: true }, user);
    if (!result.Success) {
        throw new Error(`Reading ${params.EntityName} failed: ${result.ErrorMessage ?? 'unknown error'}`);
    }
    return result.Results;
}

/** The queue's view of a loaded document entity. */
function toReading(document: EvidenceDocumentEntity): ReadingDocument {
    return {
        ID: document.ID,
        SubjectID: document.SubjectID,
        DocumentRequirementID: document.DocumentRequirementID,
        SupersedesDocumentID: document.SupersedesDocumentID,
        FileID: document.FileID,
        FileName: document.FileName,
        ContentType: document.ContentType,
        SizeBytes: document.SizeBytes,
        PageCount: document.PageCount,
        ExtractedText: document.ExtractedText,
        TextStatus: document.TextStatus,
        TextNote: document.TextNote,
        ReadingStatus: document.ReadingStatus,
        ReadingNote: document.ReadingNote,
        ReadingClaimID: document.ReadingClaimID,
        ReadingClaimedAt: document.ReadingClaimedAt,
        ReadingAttempts: document.ReadingAttempts,
    };
}

/** Applies the queue's columns and, when given, a scan's recognized text to a loaded document entity. */
function applyChange(document: EvidenceDocumentEntity, change: ReadingStateChange & Partial<RecognizedTextChange>): void {
    if (change.ReadingStatus !== undefined) document.ReadingStatus = change.ReadingStatus;
    if (change.ReadingNote !== undefined) document.ReadingNote = change.ReadingNote;
    if (change.ReadingClaimID !== undefined) document.ReadingClaimID = change.ReadingClaimID;
    if (change.ReadingClaimedAt !== undefined) document.ReadingClaimedAt = change.ReadingClaimedAt;
    if (change.ReadingAttempts !== undefined) document.ReadingAttempts = change.ReadingAttempts;
    if (change.TextStatus !== undefined) document.TextStatus = change.TextStatus;
    if (change.ExtractedText !== undefined) document.ExtractedText = change.ExtractedText;
    if (change.TextNote !== undefined) document.TextNote = change.TextNote;
    if (change.PageCount !== undefined) document.PageCount = change.PageCount;
}

/**
 * The document one locked unit of work reads and saves. It loads the row inside the unit's
 * transaction (after its locks) and saves the same entity object through the operation's scope, so
 * the entity subclass admits the write.
 */
class LockedDocument {
    private entity: EvidenceDocumentEntity | null = null;

    public constructor(
        private readonly documentID: string,
        private readonly scope: OperationWriteScope,
        private readonly provider: IMetadataProvider,
        private readonly system: UserInfo,
    ) {}

    public async Read(): Promise<ReadingDocument | null> {
        const entity = await this.provider.GetEntityObject<EvidenceDocumentEntity>(CredentialingEntity.EvidenceDocument, this.system);
        this.entity = (await entity.InnerLoad(CompositeKey.FromID(this.documentID))) ? entity : null;
        return this.entity == null ? null : toReading(this.entity);
    }

    public async Save(change: ReadingStateChange & Partial<RecognizedTextChange>): Promise<void> {
        if (this.entity == null) {
            throw new Error(`Document ${this.documentID} was saved before it was read.`);
        }
        applyChange(this.entity, change);
        await this.scope.Save(this.entity);
    }
}

/**
 * The server's {@link ReadingData}. Background work has no caller, so every read and write is made as
 * the system user (listed with its reason in `docs/isolation-read-paths.md`); every unit of work runs
 * on its own isolated provider (`CredentialingServices.InBackground`), never on the global one, and
 * every write is an entity save inside `OperationWrite` under an application lock after a re-read — no
 * raw DML.
 */
export class DatabaseReadingData implements ReadingData {
    public FindCandidates(staleBefore: Date, subjectIDs: readonly string[] | null): Promise<string[]> {
        const stale = staleBefore.toISOString();
        const filter =
            `(ReadingStatus = 'Pending' OR (ReadingStatus = 'Running' AND (ReadingClaimedAt IS NULL OR ReadingClaimedAt < '${stale}')))` +
            subjectClause(subjectIDs);
        return DatabaseReadingData.documentIDs(filter);
    }

    public FindRequeueable(maxAttempts: number, includeCouldNotRun: boolean, subjectIDs: readonly string[] | null): Promise<string[]> {
        const failed = `(ReadingStatus = 'Failed' AND ReadingAttempts < ${Math.trunc(maxAttempts)})`;
        const filter = (includeCouldNotRun ? `(${failed} OR ReadingStatus = 'Could Not Run')` : failed) + subjectClause(subjectIDs);
        return DatabaseReadingData.documentIDs(filter);
    }

    public FindRecentlyReadSubjects(since: Date, subjectIDs: readonly string[] | null): Promise<string[]> {
        const drafts = `SELECT a.SubjectID FROM [__mj_BizAppsCredentialing].[vwApplications] a WHERE a.Status = 'Draft'`;
        const filter =
            `ReadingStatus IN ('Complete', 'Failed') AND __mj_UpdatedAt >= '${since.toISOString()}' AND SubjectID IN (${drafts})` + subjectClause(subjectIDs);
        return CredentialingServices.InBackground(async (provider) => {
            const rows = await readRows<{ SubjectID: string }>(provider, SystemUser.Get(PURPOSE), {
                EntityName: CredentialingEntity.EvidenceDocument,
                ExtraFilter: filter,
                Fields: ['SubjectID'],
            });
            const subjects = new Map<string, string>();
            for (const row of rows) {
                subjects.set(row.SubjectID.toLowerCase(), row.SubjectID);
            }
            return [...subjects.values()];
        });
    }

    public UnderDocumentLock<T>(documentID: string, work: (scope: DocumentLockScope) => Promise<T>): Promise<T> {
        return CredentialingServices.InBackground((provider) =>
            OperationWrite.Run(provider, async (scope) => {
                const system = SystemUser.Get(PURPOSE);
                await AuthoringLock.ForDocument(documentID, provider, system);
                const document = new LockedDocument(documentID, scope, provider, system);
                return work({ Read: () => document.Read(), Save: (change) => document.Save(change) });
            }),
        );
    }

    public StandardsToRead(document: ReadingDocument): Promise<StandardToRead[]> {
        const requirementID = document.DocumentRequirementID;
        if (requirementID == null) {
            return Promise.resolve([]);
        }
        return CredentialingServices.InBackground((provider) => DatabaseReadingData.readingPlan(provider, document.SubjectID, requirementID));
    }

    public Commit<T>(subjectID: string, documentID: string, work: (scope: ReadingCommitScope) => Promise<T>): Promise<T> {
        return CredentialingServices.InBackground((provider) =>
            OperationWrite.Run(provider, async (scope) => {
                const system = SystemUser.Get(PURPOSE);
                await AuthoringLock.ForSubject(subjectID, provider, system);
                await AuthoringLock.ForDocument(documentID, provider, system);
                const document = new LockedDocument(documentID, scope, provider, system);
                return work({
                    ReadDocument: () => document.Read(),
                    SaveDocument: (change) => document.Save(change),
                    ApplicationStatuses: (ids) => DatabaseReadingData.applicationStatuses(provider, system, ids),
                    SupersedeExtractions: (documentIDs, standardIDs) => DatabaseReadingData.supersede(scope, provider, system, documentIDs, standardIDs),
                    InsertExtraction: (row) => DatabaseReadingData.insert(scope, provider, system, row),
                });
            }),
        );
    }

    /**
     * Removes evidence files older than `olderThanMinutes` that no evidence document references (a
     * crash between storing a file and committing its row). The store decides the candidates; this
     * answers which of them a document names.
     */
    public static RemoveOrphans(olderThanMinutes: number): Promise<number> {
        return CredentialingServices.Store.RemoveOrphans(olderThanMinutes, (candidateIDs) =>
            CredentialingServices.InBackground(async (provider) => {
                if (candidateIDs.length === 0) {
                    return new Set<string>();
                }
                const rows = await readRows<{ FileID: string }>(provider, SystemUser.Get(PURPOSE), {
                    EntityName: CredentialingEntity.EvidenceDocument,
                    ExtraFilter: `FileID IN (${uuidList(candidateIDs)})`,
                    Fields: ['FileID'],
                });
                return new Set(rows.map((r) => r.FileID.toLowerCase()));
            }),
        );
    }

    private static documentIDs(filter: string): Promise<string[]> {
        return CredentialingServices.InBackground(async (provider) => {
            const rows = await readRows<{ ID: string }>(provider, SystemUser.Get(PURPOSE), {
                EntityName: CredentialingEntity.EvidenceDocument,
                ExtraFilter: filter,
                Fields: ['ID'],
                OrderBy: 'UploadedAt',
            });
            return rows.map((r) => r.ID);
        });
    }

    /** One batch: the sources naming the requirement, their standards, and the subject's Draft applications on those versions. */
    private static async readingPlan(provider: IMetadataProvider, subjectID: string, requirementID: string): Promise<StandardToRead[]> {
        const system = SystemUser.Get(PURPOSE);
        const sources = `SELECT s.StandardID FROM [__mj_BizAppsCredentialing].[vwResponseSources] s WHERE s.SourceType = 'Document Extraction' AND s.DocumentRequirementID = '${requirementID}'`;
        const versions = `SELECT s.ProgramVersionID FROM [__mj_BizAppsCredentialing].[vwResponseSources] s WHERE s.SourceType = 'Document Extraction' AND s.DocumentRequirementID = '${requirementID}'`;
        const [standardsResult, applicationsResult] = await RunView.FromMetadataProvider(provider).RunViews<StandardRow | ApplicationRow>(
            [
                {
                    EntityName: CredentialingEntity.Standard,
                    ExtraFilter: `ID IN (${sources}) AND IntakeMode <> 'Manual'`,
                    Fields: ['ID', 'Code', 'Statement', 'Guidance', 'EvidenceHint', 'IntakeMode', 'ProgramVersionID'],
                    OrderBy: 'Sequence',
                    ResultType: 'simple',
                },
                {
                    EntityName: CredentialingEntity.Application,
                    ExtraFilter: `SubjectID = '${subjectID}' AND Status = 'Draft' AND ProgramVersionID IN (${versions})`,
                    Fields: ['ID', 'ProgramVersionID', 'Status'],
                    ResultType: 'simple',
                },
            ],
            system,
        );
        if (!standardsResult.Success || !applicationsResult.Success) {
            throw new Error(`Reading the standards to read failed: ${standardsResult.ErrorMessage ?? applicationsResult.ErrorMessage ?? 'unknown error'}`);
        }
        return DatabaseReadingData.pair(standardsResult.Results as StandardRow[], applicationsResult.Results as ApplicationRow[]);
    }

    private static pair(standards: StandardRow[], applications: ApplicationRow[]): StandardToRead[] {
        const plan: StandardToRead[] = [];
        for (const standard of standards) {
            if (standard.IntakeMode === 'Manual') {
                continue;
            }
            for (const application of applications.filter((a) => a.ProgramVersionID.toLowerCase() === standard.ProgramVersionID.toLowerCase())) {
                plan.push({
                    ApplicationID: application.ID,
                    Standard: {
                        ID: standard.ID,
                        Code: standard.Code,
                        Statement: standard.Statement,
                        Guidance: standard.Guidance,
                        EvidenceHint: standard.EvidenceHint,
                        IntakeMode: standard.IntakeMode,
                    },
                });
            }
        }
        return plan;
    }

    private static async applicationStatuses(provider: IMetadataProvider, system: UserInfo, ids: readonly string[]): Promise<Map<string, ApplicationStatus>> {
        const rows = await readRows<Pick<ApplicationRow, 'ID' | 'Status'>>(provider, system, {
            EntityName: CredentialingEntity.Application,
            ExtraFilter: `ID IN (${uuidList(ids)})`,
            Fields: ['ID', 'Status'],
        });
        return new Map(rows.map((r) => [r.ID.toLowerCase(), r.Status]));
    }

    private static async supersede(
        scope: OperationWriteScope,
        provider: IMetadataProvider,
        system: UserInfo,
        documentIDs: readonly string[],
        standardIDs: readonly string[],
    ): Promise<number> {
        const result = await RunView.FromMetadataProvider(provider).RunView<ExtractionEntity>(
            {
                EntityName: CredentialingEntity.Extraction,
                ExtraFilter: `IsSuperseded = 0 AND EvidenceDocumentID IN (${uuidList(documentIDs)}) AND StandardID IN (${uuidList(standardIDs)})`,
                ResultType: 'entity_object',
                IgnoreMaxRows: true,
            },
            system,
        );
        if (!result.Success) {
            throw new Error(`Reading the current extractions failed: ${result.ErrorMessage ?? 'unknown error'}`);
        }
        for (const extraction of result.Results) {
            extraction.IsSuperseded = true;
            await scope.Save(extraction);
        }
        return result.Results.length;
    }

    private static async insert(scope: OperationWriteScope, provider: IMetadataProvider, system: UserInfo, row: NewExtraction): Promise<void> {
        const extraction = await OperationSupport.NewRecord<ExtractionEntity>(provider, CredentialingEntity.Extraction, system);
        extraction.EvidenceDocumentID = row.EvidenceDocumentID;
        extraction.StandardID = row.StandardID;
        extraction.Value = row.Value;
        extraction.Excerpt = row.Excerpt;
        extraction.StartOffset = row.StartOffset;
        extraction.EndOffset = row.EndOffset;
        extraction.PageReference = row.PageReference?.slice(0, 50) ?? null;
        extraction.HeadingPath = row.HeadingPath?.slice(0, 1000) ?? null;
        extraction.Confidence = Math.round(row.Confidence * 10_000) / 10_000;
        extraction.Reasoning = row.Reasoning;
        extraction.AIPromptRunID = row.AIPromptRunID;
        extraction.Status = 'Proposed';
        extraction.IsSuperseded = false;
        await scope.Save(extraction);
    }
}
