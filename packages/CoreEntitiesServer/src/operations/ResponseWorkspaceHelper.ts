/**
 * Shared projection helpers for turning stored `StandardResponse`, `ResponseCitation`, and
 * `Extraction` rows into the applicant-safe {@link WorkspaceStandardResponse} shape used by both
 * `GetApplicationWorkspace` and the response mutation operations (`SaveResponse`, `ConfirmResponse`,
 * `ReopenResponse`).
 */
import { RunView, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { EscapeSQLString } from '@memberjunction/global';
import {
    APPLICANT_RESPONSIBILITY_SENTENCE,
    CredentialingEntity,
    NOT_FOUND_REASON,
    STALE_RECORD_REASON,
    type ResponseStatus,
    type RuleResult,
    type SelfAssessment,
    type WorkspaceCitation,
    type WorkspaceExplanation,
    type WorkspaceStandardResponse,
} from '@mj-biz-apps/credentialing-core';
import { LockedWrite } from '../guards/LockedWrite.js';
import { OperationSupport } from './OperationSupport.js';

export interface RawResponseRow {
    ID: string;
    StandardID: string;
    Status: ResponseStatus;
    ResponseText: string | null;
    SelfAssessment: SelfAssessment | null;
    AuthorType: 'Human' | 'Agent';
    ConfirmedByUser: string | null;
    ConfirmedAt: Date | string | null;
    __mj_UpdatedAt: Date | string;
    SourceType: string | null;
    SourceLabel: string | null;
    SourceReference: string | null;
    SourceRetrievedAt: Date | string | null;
    IsStale: boolean;
    ReopenReason: string | null;
}

export interface RawCitationRow {
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

export interface RawExtractionRow {
    ID: string;
    Value: string;
    Reasoning: string | null;
}

export const RESPONSE_WORKSPACE_FIELDS: string[] = [
    'ID',
    'StandardID',
    'Status',
    'ResponseText',
    'SelfAssessment',
    'AuthorType',
    'ConfirmedByUser',
    'ConfirmedAt',
    '__mj_UpdatedAt',
    'SourceType',
    'SourceLabel',
    'SourceReference',
    'SourceRetrievedAt',
    'IsStale',
    'ReopenReason',
];

export const CITATION_WORKSPACE_FIELDS: string[] = [
    'ID',
    'StandardResponseID',
    'EvidenceDocumentID',
    'ExtractionID',
    'SourceLabel',
    'PageReference',
    'Excerpt',
    'StartOffset',
    'EndOffset',
];

export const EXTRACTION_WORKSPACE_FIELDS: string[] = ['ID', 'Value', 'Reasoning'];

export function ToIsoString(value: Date | string | null | undefined): string | null {
    if (value == null) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
}

function firstSentence(text: string | null | undefined): string {
    const trimmed = (text ?? '').trim();
    if (trimmed.length === 0) return '';
    const match = trimmed.match(/^.+?[.!?](?=\s|$)/);
    return match ? match[0].trim() : trimmed;
}

export function BuildWorkspaceExplanation(
    response: Pick<RawResponseRow, 'AuthorType' | 'ResponseText' | 'SourceLabel' | 'SourceReference'>,
    citations: readonly RawCitationRow[],
    extractionsById: ReadonlyMap<string, RawExtractionRow>,
): WorkspaceExplanation | null {
    const extractionID = response.SourceReference ?? citations.find((c) => c.ExtractionID != null)?.ExtractionID ?? null;
    const extraction = extractionID != null ? extractionsById.get(extractionID.toLowerCase()) : undefined;
    if (response.AuthorType !== 'Agent' && extraction == null && response.SourceReference == null) {
        return null;
    }
    const what =
        firstSentence(extraction?.Value ?? response.ResponseText) ||
        (response.SourceLabel ? `Passage located in ${response.SourceLabel}.` : 'Suggested from your uploaded document.');
    const why =
        (extraction?.Reasoning ?? '').trim() ||
        (response.SourceLabel ? `Supported by ${response.SourceLabel}.` : 'Extracted from your uploaded evidence.');
    return {
        What: what,
        Why: why,
        How: `Read from your uploaded document by the assistant. ${APPLICANT_RESPONSIBILITY_SENTENCE}`,
    };
}

export function BuildWorkspaceResponse(
    resp: RawResponseRow,
    respCitations: readonly RawCitationRow[],
    extractionsById: ReadonlyMap<string, RawExtractionRow>,
): WorkspaceStandardResponse {
    const citations: WorkspaceCitation[] = respCitations.map((c) => ({
        CitationID: c.ID,
        EvidenceDocumentID: c.EvidenceDocumentID,
        SourceLabel: c.SourceLabel,
        PageReference: c.PageReference ?? null,
        Excerpt: c.Excerpt,
        StartOffset: c.StartOffset,
        EndOffset: c.EndOffset,
    }));

    return {
        ResponseID: resp.ID,
        Status: resp.Status,
        ResponseText: resp.ResponseText ?? null,
        SelfAssessment: resp.SelfAssessment ?? null,
        AuthorType: resp.AuthorType,
        ConfirmedByName: resp.ConfirmedByUser ?? null,
        ConfirmedAt: ToIsoString(resp.ConfirmedAt),
        UpdatedAt: ToIsoString(resp.__mj_UpdatedAt) ?? '',
        SourceType: resp.SourceType ?? null,
        SourceLabel: resp.SourceLabel ?? null,
        SourceRetrievedAt: ToIsoString(resp.SourceRetrievedAt),
        IsStale: Boolean(resp.IsStale),
        ReopenReason: resp.ReopenReason ?? null,
        Explanation: BuildWorkspaceExplanation(resp, respCitations, extractionsById),
        Citations: citations,
    };
}

export async function LoadWorkspaceResponseByID(
    responseID: string,
    subjectID: string,
    provider: IMetadataProvider,
    user: UserInfo,
): Promise<WorkspaceStandardResponse> {
    const escapedID = EscapeSQLString(responseID);
    const escapedSubjectID = EscapeSQLString(subjectID);
    const results = await RunView.FromMetadataProvider(provider).RunViews<unknown>(
        [
            {
                EntityName: CredentialingEntity.StandardResponse,
                ExtraFilter: `ID = '${escapedID}'`,
                Fields: RESPONSE_WORKSPACE_FIELDS,
                ResultType: 'simple',
                MaxRows: 1,
                SkipTotalRowCount: true,
            },
            {
                EntityName: CredentialingEntity.ResponseCitation,
                ExtraFilter: `StandardResponseID = '${escapedID}'`,
                Fields: CITATION_WORKSPACE_FIELDS,
                ResultType: 'simple',
                SkipTotalRowCount: true,
            },
            {
                EntityName: CredentialingEntity.Extraction,
                ExtraFilter: `SubjectID = '${escapedSubjectID}' AND IsSuperseded = 0`,
                Fields: EXTRACTION_WORKSPACE_FIELDS,
                ResultType: 'simple',
                SkipTotalRowCount: true,
            },
        ],
        user,
    );
    const failed = results.find((r) => !r.Success);
    if (failed != null) {
        throw new Error(failed.ErrorMessage || 'Could not load updated response.');
    }
    const resp = (results[0]?.Results ?? [])[0] as RawResponseRow | undefined;
    if (resp == null) {
        OperationSupport.Refuse(NOT_FOUND_REASON);
    }
    const citations = (results[1]?.Results ?? []) as RawCitationRow[];
    const extractions = (results[2]?.Results ?? []) as RawExtractionRow[];
    const extractionsById = new Map<string, RawExtractionRow>();
    for (const ex of extractions) {
        extractionsById.set(ex.ID.toLowerCase(), ex);
    }
    return BuildWorkspaceResponse(resp, citations, extractionsById);
}

export function RequireRule(rule: RuleResult): void {
    const reason = LockedWrite.ReasonOf(rule);
    if (reason != null) {
        OperationSupport.Refuse(reason);
    }
}

export function AssertExpectedUpdatedAt(expectedUpdatedAt: string, actualUpdatedAt: Date | string): void {
    const expectedMs = Date.parse(expectedUpdatedAt);
    const actualMs = new Date(actualUpdatedAt).getTime();
    if (!expectedUpdatedAt || Number.isNaN(expectedMs) || Number.isNaN(actualMs) || expectedMs !== actualMs) {
        OperationSupport.Refuse(STALE_RECORD_REASON);
    }
}
