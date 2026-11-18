import {
    EntitySaveOptions,
    RunView,
    type IMetadataProvider,
    type UserInfo,
} from '@memberjunction/core';
import { EscapeSQLString, IsValidUUID } from '@memberjunction/global';
import {
    CredentialingEntity,
    NOT_FOUND_REASON,
    PrefillResolution,
    type ApplicationStatus,
    type CitationDraft,
    type IntakeMode,
    type PrefillOutcome,
    type RefreshPrefillsOutput,
    type ResponseAuthorType,
    type ResponseSourceType,
    type ResponseStatus,
    type SelfAssessment,
    type SourceCandidate,
} from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingResponseCitationEntity,
    mjBizAppsCredentialingStandardResponseEntity,
} from '@mj-biz-apps/credentialing-entities';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite, type OperationWriteScope } from '../guards/OperationWrite.js';
import { SystemUser } from '../guards/SystemUser.js';
import { OperationSupport } from '../operations/OperationSupport.js';
import { CredentialingServices } from '../services/CredentialingServices.js';
import {
    DocumentExtractionEvaluator,
    type ResponseSourceRow,
    type SourceEvaluator,
} from './SourceEvaluators.js';

type StandardResponseEntity = mjBizAppsCredentialingStandardResponseEntity;
type ResponseCitationEntity = mjBizAppsCredentialingResponseCitationEntity;

const PURPOSE = 'Running prefill resolution';
const STANDARD_RESPONSES_VIEW = '[__mj_BizAppsCredentialing].[vwStandardResponses]';
const PREFILL_SAVE_OPTIONS = Object.assign(new EntitySaveOptions(), {
    SkipEntityAIActions: true,
    SaveReturnMode: 'datestamps_only' as const,
});

/** Application row fields used by prefill resolution. */
export interface PrefillApplicationRecord {
    ID: string;
    SubjectID: string;
    ProgramVersionID: string;
    Status: ApplicationStatus;
}

/** Response fields read and written during prefill resolution. */
export interface PrefillResponseRecord {
    ID: string;
    StandardID: string;
    Status: ResponseStatus;
    AuthorType: ResponseAuthorType;
    ResponseText: string | null;
    SelfAssessment: SelfAssessment | null;
    SourceType: StandardResponseEntity['SourceType'];
    SourceLabel: string | null;
    SourceReference: string | null;
    SourceRetrievedAt: Date | null;
    SourceRawValue: string | null;
    IsStale: boolean;
}

/** Citation fields read and replaced during prefill resolution. */
export interface PrefillCitationRecord {
    ID: string;
    StandardResponseID: string;
    EvidenceDocumentID: string;
    ExtractionID: string | null;
    SourceLabel: string;
    PageReference: string | null;
    Excerpt: string;
    StartOffset: number;
    EndOffset: number;
}

/** Everything read inside the lock for one application's prefill pass. */
export interface PrefillLoadedState {
    Application: PrefillApplicationRecord;
    Standards: Map<string, IntakeMode>;
    Sources: ResponseSourceRow[];
    Responses: PrefillResponseRecord[];
    Citations: PrefillCitationRecord[];
}

/** Transactional write scope inside the subject+application locks. */
export interface PrefillTransactionScope {
    LoadState(): Promise<PrefillLoadedState>;
    UpdateResponse(responseID: string, patch: Partial<PrefillResponseRecord>): Promise<void>;
    DeleteCitations(citationIDs: readonly string[]): Promise<void>;
    InsertCitation(citation: Omit<PrefillCitationRecord, 'ID'>): Promise<void>;
}

/** Application header and optional pre-loaded authoring sources read before acquiring the lock. */
export interface PrefillApplicationHeader {
    ID: string;
    SubjectID: string;
    ProgramVersionID?: string;
    Sources?: ResponseSourceRow[];
}

/** Data adapter separating locking/persistence from the resolution algorithm for unit testing. */
export interface PrefillData {
    FindApplicationSubject(applicationID: string): Promise<PrefillApplicationHeader | null>;
    InLockedTransaction<T>(
        applicationID: string,
        subjectID: string,
        work: (scope: PrefillTransactionScope) => Promise<T>,
    ): Promise<T>;
}

/** Test seams for proving deterministic lock ordering and timing. */
export interface PrefillSeams {
    AfterLoadBeforeLock?: () => Promise<void>;
    InsideLock?: () => Promise<void>;
}

function zeroCounts(): RefreshPrefillsOutput {
    return { Prefilled: 0, Located: 0, MarkedStale: 0, Cleared: 0, Unchanged: 0 };
}

/**
 * Pure orchestration over {@link PrefillData} and {@link SourceEvaluator}s.
 * Evaluates sources inside the subject+application lock from fresh rows and writes outcomes
 * through `OperationWrite`.
 */
export class PrefillWorker {
    public constructor(
        private readonly data: PrefillData,
        private readonly evaluators: readonly SourceEvaluator[],
        private readonly now: () => Date = () => new Date(),
        private readonly seams: PrefillSeams = {},
    ) {}

    public async RunForApplication(
        applicationID: string,
        writer: UserInfo,
        provider?: IMetadataProvider,
    ): Promise<RefreshPrefillsOutput> {
        const appHeader = await this.data.FindApplicationSubject(applicationID);
        if (appHeader == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }

        await this.seams.AfterLoadBeforeLock?.();

        return this.data.InLockedTransaction(appHeader.ID, appHeader.SubjectID, async (scope) => {
            await this.seams.InsideLock?.();
            if (appHeader.Sources != null) {
                const [state, candidatesByStandard] = await Promise.all([
                    scope.LoadState(),
                    this.evaluateAll(appHeader.Sources, appHeader.SubjectID, writer, provider),
                ]);
                if (state.Application.Status !== 'Draft') {
                    return zeroCounts();
                }
                return this.applyAll(scope, state, candidatesByStandard);
            }

            const state = await scope.LoadState();
            if (state.Application.Status !== 'Draft') {
                return zeroCounts();
            }

            const candidatesByStandard = await this.evaluateAll(state.Sources, state.Application.SubjectID, writer, provider);
            return this.applyAll(scope, state, candidatesByStandard);
        });
    }

    private async evaluateAll(
        sources: readonly ResponseSourceRow[],
        subjectID: string,
        writer: UserInfo,
        provider?: IMetadataProvider,
    ): Promise<Map<string, SourceCandidate[]>> {
        const merged = new Map<string, SourceCandidate[]>();
        if (sources.length === 0) {
            return merged;
        }
        const byType = new Map<ResponseSourceType, ResponseSourceRow[]>();
        for (const source of sources) {
            const list = byType.get(source.SourceType) ?? [];
            list.push(source);
            byType.set(source.SourceType, list);
        }
        for (const evaluator of this.evaluators) {
            const group = byType.get(evaluator.SourceType);
            if (group == null || group.length === 0) continue;
            const evaluated = await evaluator.Evaluate(group, {
                SubjectID: subjectID,
                Provider: provider as IMetadataProvider,
                User: writer,
            });
            for (const [stdID, candidates] of evaluated.entries()) {
                const key = stdID.toLowerCase();
                const existing = merged.get(key) ?? [];
                existing.push(...candidates);
                merged.set(key, existing);
            }
        }
        return merged;
    }

    private async applyAll(
        scope: PrefillTransactionScope,
        state: PrefillLoadedState,
        candidatesByStandard: ReadonlyMap<string, SourceCandidate[]>,
    ): Promise<RefreshPrefillsOutput> {
        const citationsByResponse = new Map<string, PrefillCitationRecord[]>();
        for (const c of state.Citations) {
            const key = c.StandardResponseID.toLowerCase();
            const list = citationsByResponse.get(key) ?? [];
            list.push(c);
            citationsByResponse.set(key, list);
        }

        const counts = zeroCounts();
        const retrievedAt = this.now();

        for (const response of state.Responses) {
            const intakeMode = state.Standards.get(response.StandardID.toLowerCase()) ?? 'Manual';
            const candidates = candidatesByStandard.get(response.StandardID.toLowerCase()) ?? [];
            const picked = PrefillResolution.Pick(candidates);
            const outcome = PrefillResolution.Apply(
                {
                    Status: response.Status,
                    AuthorType: response.AuthorType,
                    ResponseText: response.ResponseText,
                    SelfAssessment: response.SelfAssessment,
                    SourceReference: response.SourceReference,
                    SourceRawValue: response.SourceRawValue,
                },
                intakeMode,
                picked,
            );
            await this.applyOutcome(
                scope,
                response,
                outcome,
                citationsByResponse.get(response.ID.toLowerCase()) ?? [],
                retrievedAt,
                counts,
            );
        }
        return counts;
    }

    private async applyOutcome(
        scope: PrefillTransactionScope,
        response: PrefillResponseRecord,
        outcome: PrefillOutcome,
        existingCitations: readonly PrefillCitationRecord[],
        retrievedAt: Date,
        counts: RefreshPrefillsOutput,
    ): Promise<void> {
        switch (outcome.Kind) {
            case 'Unchanged':
                counts.Unchanged++;
                return;
            case 'MarkedStale':
                if (!response.IsStale) {
                    await scope.UpdateResponse(response.ID, { IsStale: true });
                }
                counts.MarkedStale++;
                return;
            case 'Cleared':
                await scope.UpdateResponse(response.ID, {
                    Status: 'Empty',
                    AuthorType: 'Human',
                    ResponseText: null,
                    SourceType: null,
                    SourceLabel: null,
                    SourceReference: null,
                    SourceRetrievedAt: null,
                    SourceRawValue: null,
                    IsStale: false,
                });
                if (existingCitations.length > 0) {
                    await scope.DeleteCitations(existingCitations.map((c) => c.ID));
                }
                counts.Cleared++;
                return;
            case 'Prefilled':
                await scope.UpdateResponse(response.ID, {
                    Status: 'Prefilled',
                    AuthorType: outcome.AuthorType,
                    ResponseText: outcome.ResponseText,
                    SourceType: outcome.SourceType,
                    SourceLabel: outcome.SourceLabel,
                    SourceReference: outcome.SourceReference,
                    SourceRetrievedAt: retrievedAt,
                    SourceRawValue: outcome.SourceRawValue,
                    IsStale: false,
                });
                await this.replaceCitations(scope, response.ID, existingCitations, outcome.Citation);
                counts.Prefilled++;
                return;
            case 'Located':
                await scope.UpdateResponse(response.ID, {
                    Status: 'Located',
                    AuthorType: outcome.AuthorType,
                    ResponseText: null,
                    SourceType: outcome.SourceType,
                    SourceLabel: outcome.SourceLabel,
                    SourceReference: outcome.SourceReference,
                    SourceRetrievedAt: retrievedAt,
                    SourceRawValue: outcome.SourceRawValue,
                    IsStale: false,
                });
                await this.replaceCitations(scope, response.ID, existingCitations, outcome.Citation);
                counts.Located++;
                return;
        }
    }

    private async replaceCitations(
        scope: PrefillTransactionScope,
        responseID: string,
        existingCitations: readonly PrefillCitationRecord[],
        next: CitationDraft | null,
    ): Promise<void> {
        if (existingCitations.length > 0) {
            await scope.DeleteCitations(existingCitations.map((c) => c.ID));
        }
        if (next != null) {
            await scope.InsertCitation({
                StandardResponseID: responseID,
                EvidenceDocumentID: next.EvidenceDocumentID,
                ExtractionID: next.ExtractionID,
                SourceLabel: next.SourceLabel,
                PageReference: next.PageReference,
                Excerpt: next.Excerpt,
                StartOffset: next.StartOffset,
                EndOffset: next.EndOffset,
            });
        }
    }
}

interface RawStandardIntakeRow {
    ID: string;
    IntakeMode: IntakeMode;
}

class DatabasePrefillData implements PrefillData {
    private preloadedVersionID: string | null = null;
    private preloadedStandards: Map<string, IntakeMode> | null = null;
    private preloadedSources: ResponseSourceRow[] | null = null;

    public constructor(
        private readonly provider: IMetadataProvider,
        private readonly writer: UserInfo,
    ) {}

    public async FindApplicationSubject(
        applicationID: string,
    ): Promise<PrefillApplicationHeader | null> {
        if (!IsValidUUID(applicationID)) {
            return null;
        }
        const res = await RunView.FromMetadataProvider(this.provider).RunView<{
            ID: string;
            SubjectID: string;
            ProgramVersionID: string;
        }>(
            {
                EntityName: CredentialingEntity.Application,
                ExtraFilter: `ID = '${EscapeSQLString(applicationID)}'`,
                Fields: ['ID', 'SubjectID', 'ProgramVersionID'],
                ResultType: 'simple',
                MaxRows: 1,
                SkipTotalRowCount: true,
            },
            this.writer,
        );
        const row = res.Success ? res.Results?.[0] : undefined;
        if (row == null) {
            return null;
        }
        // Program version authoring (standards and sources) is not protected by the subject lock,
        // so pre-loading it here lets InsideLock run response/citation reads and extraction evaluation in one step.
        const authoring = await this.loadVersionAuthoring(row.ProgramVersionID);
        this.preloadedVersionID = row.ProgramVersionID.toLowerCase();
        this.preloadedStandards = authoring.Standards;
        this.preloadedSources = authoring.Sources;
        return {
            ID: row.ID,
            SubjectID: row.SubjectID,
            ProgramVersionID: row.ProgramVersionID,
            Sources: authoring.Sources,
        };
    }

    private async loadVersionAuthoring(
        programVersionID: string,
    ): Promise<{ Standards: Map<string, IntakeMode>; Sources: ResponseSourceRow[] }> {
        const escapedVersionID = EscapeSQLString(programVersionID);
        const system = SystemUser.Get(PURPOSE);
        const systemAuthoring = await RunView.FromMetadataProvider(this.provider).RunViews<
            RawStandardIntakeRow | ResponseSourceRow
        >(
            [
                {
                    EntityName: CredentialingEntity.Standard,
                    ExtraFilter: `ProgramVersionID = '${escapedVersionID}'`,
                    Fields: ['ID', 'IntakeMode'],
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.ResponseSource,
                    ExtraFilter: `ProgramVersionID = '${escapedVersionID}' AND Mode IN ('Prefill Only', 'Both')`,
                    Fields: [
                        'ID',
                        'StandardID',
                        'ProgramVersionID',
                        'SourceType',
                        'DocumentRequirementID',
                        'Mode',
                        'Rank',
                        'Sequence',
                    ],
                    OrderBy: 'Rank ASC, Sequence ASC',
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
            ],
            system,
        );
        if (!systemAuthoring[0].Success || !systemAuthoring[1].Success) {
            throw new Error(
                `Loading standards and sources for prefill failed: ${systemAuthoring[0].ErrorMessage ?? systemAuthoring[1].ErrorMessage ?? 'unknown error'}`,
            );
        }
        const standards = new Map<string, IntakeMode>();
        for (const st of (systemAuthoring[0].Results ?? []) as RawStandardIntakeRow[]) {
            standards.set(st.ID.toLowerCase(), st.IntakeMode);
        }
        return {
            Standards: standards,
            Sources: (systemAuthoring[1].Results ?? []) as ResponseSourceRow[],
        };
    }

    public InLockedTransaction<T>(
        applicationID: string,
        subjectID: string,
        work: (scope: PrefillTransactionScope) => Promise<T>,
    ): Promise<T> {
        return OperationWrite.Run(this.provider, async (writeScope) => {
            await AuthoringLock.ForSubject(subjectID, this.provider, this.writer);
            await AuthoringLock.ForApplication(applicationID, this.provider, this.writer);

            const responseEntities = new Map<string, StandardResponseEntity>();
            const citationEntities = new Map<string, ResponseCitationEntity>();

            const scope: PrefillTransactionScope = {
                LoadState: () =>
                    this.loadStateInsideLock(writeScope, applicationID, responseEntities, citationEntities),
                UpdateResponse: (responseID, patch) =>
                    this.updateResponse(writeScope, responseEntities, responseID, patch),
                DeleteCitations: (citationIDs) =>
                    this.deleteCitations(writeScope, citationEntities, citationIDs),
                InsertCitation: (citation) =>
                    this.insertCitation(writeScope, citation),
            };
            return work(scope);
        });
    }

    private async loadStateInsideLock(
        writeScope: OperationWriteScope,
        applicationID: string,
        responseEntities: Map<string, StandardResponseEntity>,
        citationEntities: Map<string, ResponseCitationEntity>,
    ): Promise<PrefillLoadedState> {
        const escapedAppID = EscapeSQLString(applicationID);
        const system = SystemUser.Get(PURPOSE);

        // Read Application and StandardResponse IDs as the caller first so row-level security decides access,
        // while loading entity objects for agent-authored writes as SystemUser to avoid 750+ per-row RLS round trips.
        const [callerRes, systemRes] = await Promise.all([
            RunView.FromMetadataProvider(this.provider).RunViews<
                PrefillApplicationRecord | { ID: string }
            >(
                [
                    {
                        EntityName: CredentialingEntity.Application,
                        ExtraFilter: `ID = '${escapedAppID}'`,
                        Fields: ['ID', 'SubjectID', 'ProgramVersionID', 'Status'],
                        ResultType: 'simple',
                        MaxRows: 1,
                        SkipTotalRowCount: true,
                    },
                    {
                        EntityName: CredentialingEntity.StandardResponse,
                        ExtraFilter: `ApplicationID = '${escapedAppID}'`,
                        Fields: ['ID'],
                        ResultType: 'simple',
                        IgnoreMaxRows: true,
                        SkipTotalRowCount: true,
                    },
                ],
                this.writer,
            ),
            RunView.FromMetadataProvider(this.provider).RunViews<
                StandardResponseEntity | ResponseCitationEntity
            >(
                [
                    {
                        EntityName: CredentialingEntity.StandardResponse,
                        ExtraFilter: `ApplicationID = '${escapedAppID}'`,
                        ResultType: 'entity_object',
                        IgnoreMaxRows: true,
                        SkipTotalRowCount: true,
                    },
                    {
                        EntityName: CredentialingEntity.ResponseCitation,
                        ExtraFilter: `StandardResponseID IN (SELECT r.ID FROM ${STANDARD_RESPONSES_VIEW} r WHERE r.ApplicationID = '${escapedAppID}')`,
                        ResultType: 'entity_object',
                        IgnoreMaxRows: true,
                        SkipTotalRowCount: true,
                    },
                ],
                system,
            ),
        ]);

        if (!callerRes[0].Success || !callerRes[1].Success || !systemRes[0].Success || !systemRes[1].Success) {
            throw new Error(
                `Loading prefill state failed: ${callerRes[0].ErrorMessage ?? callerRes[1].ErrorMessage ?? systemRes[0].ErrorMessage ?? systemRes[1].ErrorMessage ?? 'unknown error'}`,
            );
        }

        const app = (callerRes[0].Results ?? [])[0] as PrefillApplicationRecord | undefined;
        if (app == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }

        const callerResponseIDs = new Set(
            ((callerRes[1].Results ?? []) as { ID: string }[]).map((r) => r.ID.toLowerCase()),
        );
        const responses = ((systemRes[0].Results ?? []) as StandardResponseEntity[]).filter((r) =>
            callerResponseIDs.has(r.ID.toLowerCase()),
        );
        const citations = (systemRes[1].Results ?? []) as ResponseCitationEntity[];
        responseEntities.clear();
        citationEntities.clear();
        for (const r of responses) {
            responseEntities.set(r.ID.toLowerCase(), r);
            writeScope.CacheParentSubject(CredentialingEntity.StandardResponse, r.ID, r.SubjectID);
        }
        for (const c of citations) {
            citationEntities.set(c.ID.toLowerCase(), c);
        }

        const authoring =
            this.preloadedVersionID === app.ProgramVersionID.toLowerCase() &&
            this.preloadedStandards != null &&
            this.preloadedSources != null
                ? { Standards: this.preloadedStandards, Sources: this.preloadedSources }
                : await this.loadVersionAuthoring(app.ProgramVersionID);

        return {
            Application: app,
            Standards: authoring.Standards,
            Sources: authoring.Sources,
            Responses: responses.map((r) => ({
                ID: r.ID,
                StandardID: r.StandardID,
                Status: r.Status,
                AuthorType: r.AuthorType,
                ResponseText: r.ResponseText,
                SelfAssessment: r.SelfAssessment,
                SourceType: r.SourceType,
                SourceLabel: r.SourceLabel,
                SourceReference: r.SourceReference,
                SourceRetrievedAt: r.SourceRetrievedAt,
                SourceRawValue: r.SourceRawValue,
                IsStale: r.IsStale,
            })),
            Citations: citations.map((c) => ({
                ID: c.ID,
                StandardResponseID: c.StandardResponseID,
                EvidenceDocumentID: c.EvidenceDocumentID,
                ExtractionID: c.ExtractionID,
                SourceLabel: c.SourceLabel,
                PageReference: c.PageReference,
                Excerpt: c.Excerpt,
                StartOffset: c.StartOffset,
                EndOffset: c.EndOffset,
            })),
        };
    }

    private async updateResponse(
        writeScope: OperationWriteScope,
        responseEntities: ReadonlyMap<string, StandardResponseEntity>,
        responseID: string,
        patch: Partial<PrefillResponseRecord>,
    ): Promise<void> {
        const entity = responseEntities.get(responseID.toLowerCase());
        if (entity == null) {
            throw new Error(`Missing StandardResponse entity ${responseID}`);
        }
        if (patch.Status !== undefined) entity.Status = patch.Status;
        if (patch.AuthorType !== undefined) entity.AuthorType = patch.AuthorType;
        if (patch.ResponseText !== undefined) entity.ResponseText = patch.ResponseText;
        if (patch.SourceType !== undefined) entity.SourceType = patch.SourceType;
        if (patch.SourceLabel !== undefined) entity.SourceLabel = patch.SourceLabel;
        if (patch.SourceReference !== undefined) entity.SourceReference = patch.SourceReference;
        if (patch.SourceRetrievedAt !== undefined) entity.SourceRetrievedAt = patch.SourceRetrievedAt;
        if (patch.SourceRawValue !== undefined) entity.SourceRawValue = patch.SourceRawValue;
        if (patch.IsStale !== undefined) entity.IsStale = patch.IsStale;
        await writeScope.Save(entity, PREFILL_SAVE_OPTIONS);
    }

    private async deleteCitations(
        writeScope: OperationWriteScope,
        citationEntities: ReadonlyMap<string, ResponseCitationEntity>,
        citationIDs: readonly string[],
    ): Promise<void> {
        for (const id of citationIDs) {
            const entity = citationEntities.get(id.toLowerCase());
            if (entity != null) {
                await writeScope.Delete(entity);
            }
        }
    }

    private async insertCitation(
        writeScope: OperationWriteScope,
        citation: Omit<PrefillCitationRecord, 'ID'>,
    ): Promise<void> {
        const system = SystemUser.Get(PURPOSE);
        const entity = await OperationSupport.NewRecord<ResponseCitationEntity>(
            this.provider,
            CredentialingEntity.ResponseCitation,
            system,
        );
        entity.StandardResponseID = citation.StandardResponseID;
        entity.EvidenceDocumentID = citation.EvidenceDocumentID;
        entity.ExtractionID = citation.ExtractionID;
        entity.SourceLabel = citation.SourceLabel;
        entity.PageReference = citation.PageReference;
        entity.Excerpt = citation.Excerpt;
        entity.StartOffset = citation.StartOffset;
        entity.EndOffset = citation.EndOffset;
        await writeScope.Save(entity, PREFILL_SAVE_OPTIONS);
    }
}

/**
 * Resolves prefill-capable response sources against an application's current evidence and writes
 * drafted or located responses + citations without overwriting human work (FR-4.7, FR-4.10, FR-7.2).
 */
export class PrefillRunner {
    /** Test seams for proving deterministic lock behavior and measuring lock duration. */
    public static readonly Seams: PrefillSeams = {};

    /** Runs prefill resolution for one application inside a single transaction on `provider`. */
    public static async RunForApplication(
        applicationID: string,
        provider: IMetadataProvider,
        writer: UserInfo,
        evaluators: readonly SourceEvaluator[] = [new DocumentExtractionEvaluator()],
    ): Promise<RefreshPrefillsOutput> {
        const data = new DatabasePrefillData(provider, writer);
        const worker = new PrefillWorker(data, evaluators, () => new Date(), PrefillRunner.Seams);
        return worker.RunForApplication(applicationID, writer, provider);
    }

    /**
     * Background entry point called after the reading queue commits a document's reading.
     * Runs each Draft application of `subjectID` in its own isolated `InBackground` unit as the system user.
     */
    public static async RunForSubject(subjectID: string): Promise<void> {
        if (!IsValidUUID(subjectID)) {
            return;
        }
        const system = SystemUser.Get(PURPOSE);
        const draftAppIDs = await CredentialingServices.InBackground(async (provider) => {
            const res = await RunView.FromMetadataProvider(provider).RunView<{ ID: string }>(
                {
                    EntityName: CredentialingEntity.Application,
                    ExtraFilter: `SubjectID = '${EscapeSQLString(subjectID)}' AND Status = 'Draft'`,
                    Fields: ['ID'],
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
                system,
            );
            if (!res.Success) {
                throw new Error(`Finding Draft applications for subject ${subjectID} failed: ${res.ErrorMessage ?? 'unknown error'}`);
            }
            return (res.Results ?? []).map((r) => r.ID);
        });

        for (const appID of draftAppIDs) {
            await CredentialingServices.InBackground((provider) =>
                PrefillRunner.RunForApplication(appID, provider, system),
            );
        }
    }
}
