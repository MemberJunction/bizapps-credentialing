import type { mjBizAppsCredentialingStandardResponseEntity } from '@mj-biz-apps/credentialing-entities';
import type { IntakeMode, ResponseAuthorType, ResponseState } from './ResponseRules.js';
import { RequiredTextRule } from './RuleResult.js';

/** Source type values derived from the generated StandardResponse entity. */
type ResponseSourceKind = NonNullable<mjBizAppsCredentialingStandardResponseEntity['SourceType']>;

/** Citation fields produced when prefilling or locating from a document extraction. */
export interface CitationDraft {
    EvidenceDocumentID: string;
    ExtractionID: string | null;
    SourceLabel: string;
    PageReference: string | null;
    Excerpt: string;
    StartOffset: number;
    EndOffset: number;
}

/** Evaluated source candidate competing to populate or locate a standard response. */
export interface SourceCandidate {
    SourceID: string;
    Rank: number;
    Sequence: number;
    Value: string | null;
    Label: string;
    Reference: string;
    Citation: CitationDraft | null;
}

/** Response state fields read by {@link PrefillResolution.Apply}. */
export type PrefillResponseState = ResponseState & {
    SourceReference: string | null;
    SourceRawValue?: string | null;
};

/** Outcome of applying a picked source candidate to a standard response. */
export type PrefillOutcome =
    | { Kind: 'Unchanged' }
    | {
          Kind: 'Prefilled';
          Status: 'Prefilled';
          AuthorType: ResponseAuthorType;
          ResponseText: string;
          SourceType: ResponseSourceKind;
          SourceLabel: string;
          SourceReference: string;
          SourceRawValue: string;
          Citation: CitationDraft | null;
      }
    | {
          Kind: 'Located';
          Status: 'Located';
          AuthorType: ResponseAuthorType;
          SourceType: ResponseSourceKind;
          SourceLabel: string;
          SourceReference: string;
          SourceRawValue: string;
          Citation: CitationDraft | null;
      }
    | { Kind: 'MarkedStale' }
    | { Kind: 'Cleared' };

/**
 * Pure domain rules for deterministic source ranking and non-destructive prefill application.
 */
export class PrefillResolution {
    /**
     * Picks the candidate with the lowest Rank that holds a non-empty Value, breaking ties by Sequence.
     */
    public static Pick(candidates: readonly SourceCandidate[]): SourceCandidate | null {
        let best: SourceCandidate | null = null;
        for (const candidate of candidates) {
            if (RequiredTextRule.IsBlank(candidate.Value)) {
                continue;
            }
            if (
                best == null ||
                candidate.Rank < best.Rank ||
                (candidate.Rank === best.Rank && candidate.Sequence < best.Sequence)
            ) {
                best = candidate;
            }
        }
        return best;
    }

    /**
     * Applies a picked candidate (or absence of one) to the current response without overwriting human work.
     */
    public static Apply(
        response: PrefillResponseState,
        intakeMode: IntakeMode,
        picked: SourceCandidate | null
    ): PrefillOutcome {
        if (intakeMode === 'Manual') {
            return { Kind: 'Unchanged' };
        }
        if (response.Status === 'Confirmed') {
            return PrefillResolution.applyToConfirmed(response, picked);
        }
        if (response.Status === 'Drafted' && response.AuthorType === 'Human') {
            return { Kind: 'Unchanged' };
        }
        if (picked == null || RequiredTextRule.IsBlank(picked.Value)) {
            return response.Status === 'Prefilled' || response.Status === 'Located'
                ? { Kind: 'Cleared' }
                : { Kind: 'Unchanged' };
        }
        return PrefillResolution.applyCandidate(response, intakeMode, picked);
    }

    private static applyToConfirmed(
        response: PrefillResponseState,
        picked: SourceCandidate | null
    ): PrefillOutcome {
        if (picked == null || RequiredTextRule.IsBlank(picked.Value)) {
            return { Kind: 'Unchanged' };
        }
        const previousRaw = response.SourceRawValue ?? null;
        return picked.Value === previousRaw ? { Kind: 'Unchanged' } : { Kind: 'MarkedStale' };
    }

    private static applyCandidate(
        response: PrefillResponseState,
        intakeMode: 'Locate' | 'Prefill',
        picked: SourceCandidate
    ): PrefillOutcome {
        const value = picked.Value!;
        if (intakeMode === 'Locate') {
            if (
                response.Status === 'Located' &&
                response.SourceReference === picked.Reference &&
                (response.SourceRawValue ?? null) === value
            ) {
                return { Kind: 'Unchanged' };
            }
            return {
                Kind: 'Located',
                Status: 'Located',
                AuthorType: 'Agent',
                SourceType: 'Document Extraction',
                SourceLabel: picked.Label,
                SourceReference: picked.Reference,
                SourceRawValue: value,
                Citation: picked.Citation,
            };
        }

        if (
            response.Status === 'Prefilled' &&
            response.SourceReference === picked.Reference &&
            (response.SourceRawValue ?? null) === value &&
            response.ResponseText === value
        ) {
            return { Kind: 'Unchanged' };
        }
        return {
            Kind: 'Prefilled',
            Status: 'Prefilled',
            AuthorType: 'Agent',
            ResponseText: value,
            SourceType: 'Document Extraction',
            SourceLabel: picked.Label,
            SourceReference: picked.Reference,
            SourceRawValue: value,
            Citation: picked.Citation,
        };
    }
}
