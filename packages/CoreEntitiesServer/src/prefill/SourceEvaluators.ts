import { RunView, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { EscapeSQLString } from '@memberjunction/global';
import {
    CredentialingEntity,
    type ResponseSourceMode,
    type ResponseSourceType,
    type SourceCandidate,
} from '@mj-biz-apps/credentialing-core';

/** Stored response source row passed to a {@link SourceEvaluator}. */
export interface ResponseSourceRow {
    ID: string;
    StandardID: string;
    ProgramVersionID: string;
    SourceType: ResponseSourceType;
    DocumentRequirementID: string | null;
    Mode: ResponseSourceMode;
    Rank: number;
    Sequence: number;
}

/** Shared context passed once per prefill run to each {@link SourceEvaluator}. */
export interface PrefillContext {
    SubjectID: string;
    Provider: IMetadataProvider;
    User: UserInfo;
}

/**
 * Evaluates all response sources of one {@link SourceType} for a subject in a single batched read
 * (never per standard), returning candidates keyed by lowercased standard ID.
 */
export interface SourceEvaluator {
    readonly SourceType: ResponseSourceType;
    Evaluate(
        sources: ResponseSourceRow[],
        context: PrefillContext,
    ): Promise<Map<string, SourceCandidate[]>>;
}

interface CurrentDocumentRow {
    ID: string;
    DocumentRequirementID: string | null;
    FileName: string;
}

interface CurrentExtractionRow {
    ID: string;
    EvidenceDocumentID: string;
    StandardID: string;
    Value: string;
    Excerpt: string;
    StartOffset: number;
    EndOffset: number;
    PageReference: string | null;
}

/**
 * Evaluates `'Document Extraction'` sources using each subject's current (non-superseded) document
 * for the source's requirement and its current (`IsSuperseded = 0`), non-`Rejected` extraction for
 * the standard.
 */
export class DocumentExtractionEvaluator implements SourceEvaluator {
    public readonly SourceType: ResponseSourceType = 'Document Extraction';

    public async Evaluate(
        sources: ResponseSourceRow[],
        context: PrefillContext,
    ): Promise<Map<string, SourceCandidate[]>> {
        const result = new Map<string, SourceCandidate[]>();
        const matching = sources.filter(
            (s) => s.SourceType === 'Document Extraction' && s.DocumentRequirementID != null,
        );
        if (matching.length === 0) {
            return result;
        }

        const subjectID = EscapeSQLString(context.SubjectID);
        const [docsRes, extractionsRes] = await RunView.FromMetadataProvider(context.Provider).RunViews<
            CurrentDocumentRow | CurrentExtractionRow
        >(
            [
                {
                    EntityName: CredentialingEntity.EvidenceDocument,
                    ExtraFilter: `SubjectID = '${subjectID}' AND Status <> 'Superseded' AND DocumentRequirementID IS NOT NULL`,
                    Fields: ['ID', 'DocumentRequirementID', 'FileName'],
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.Extraction,
                    ExtraFilter: `SubjectID = '${subjectID}' AND IsSuperseded = 0 AND Status <> 'Rejected'`,
                    Fields: [
                        'ID',
                        'EvidenceDocumentID',
                        'StandardID',
                        'Value',
                        'Excerpt',
                        'StartOffset',
                        'EndOffset',
                        'PageReference',
                    ],
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
            ],
            context.User,
        );

        if (!docsRes.Success || !extractionsRes.Success) {
            throw new Error(
                `Evaluating document extractions failed: ${docsRes.ErrorMessage ?? extractionsRes.ErrorMessage ?? 'unknown error'}`,
            );
        }

        const docByRequirement = new Map<string, CurrentDocumentRow>();
        for (const doc of (docsRes.Results ?? []) as CurrentDocumentRow[]) {
            if (doc.DocumentRequirementID != null) {
                docByRequirement.set(doc.DocumentRequirementID.toLowerCase(), doc);
            }
        }

        const extractionByDocAndStandard = new Map<string, CurrentExtractionRow>();
        for (const ex of (extractionsRes.Results ?? []) as CurrentExtractionRow[]) {
            const key = `${ex.EvidenceDocumentID.toLowerCase()}:${ex.StandardID.toLowerCase()}`;
            extractionByDocAndStandard.set(key, ex);
        }

        for (const source of matching) {
            const reqID = source.DocumentRequirementID;
            if (reqID == null) continue;
            const doc = docByRequirement.get(reqID.toLowerCase());
            if (doc == null) continue;
            const ex = extractionByDocAndStandard.get(
                `${doc.ID.toLowerCase()}:${source.StandardID.toLowerCase()}`,
            );
            if (ex == null) continue;

            const standardKey = source.StandardID.toLowerCase();
            const list = result.get(standardKey) ?? [];
            list.push({
                SourceID: source.ID,
                Rank: source.Rank,
                Sequence: source.Sequence,
                Value: ex.Value,
                Label: doc.FileName,
                Reference: ex.ID,
                Citation: {
                    EvidenceDocumentID: doc.ID,
                    ExtractionID: ex.ID,
                    SourceLabel: doc.FileName,
                    PageReference: ex.PageReference ?? null,
                    Excerpt: ex.Excerpt,
                    StartOffset: ex.StartOffset,
                    EndOffset: ex.EndOffset,
                },
            });
            result.set(standardKey, list);
        }

        return result;
    }
}
