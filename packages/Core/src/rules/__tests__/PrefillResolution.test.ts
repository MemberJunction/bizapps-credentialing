import { describe, it, expect } from 'vitest';
import {
    PrefillResolution,
    type CitationDraft,
    type PrefillResponseState,
    type SourceCandidate,
} from '../PrefillResolution.js';

const sampleCitation: CitationDraft = {
    EvidenceDocumentID: 'doc-1',
    ExtractionID: 'ext-1',
    SourceLabel: 'Bylaws.pdf',
    PageReference: 'p. 3',
    Excerpt: 'The board meets at least four times per year.',
    StartOffset: 100,
    EndOffset: 146,
};

function makeCandidate(overrides: Partial<SourceCandidate> = {}): SourceCandidate {
    return {
        SourceID: 'src-1',
        Rank: 1,
        Sequence: 0,
        Value: 'The board meets quarterly.',
        Label: 'Bylaws.pdf',
        Reference: 'ext-1',
        Citation: sampleCitation,
        ...overrides,
    };
}

function makeResponse(overrides: Partial<PrefillResponseState> = {}): PrefillResponseState {
    return {
        Status: 'Empty',
        AuthorType: 'Human',
        ResponseText: null,
        SelfAssessment: null,
        SourceReference: null,
        SourceRawValue: null,
        ...overrides,
    };
}

describe('PrefillResolution', () => {
    describe('Pick', () => {
        it('picks the lowest rank with a non-empty value', () => {
            const candidates: SourceCandidate[] = [
                makeCandidate({ SourceID: 's1', Rank: 1, Sequence: 0, Value: '   ' }),
                makeCandidate({ SourceID: 's2', Rank: 3, Sequence: 0, Value: 'Rank 3 value' }),
                makeCandidate({ SourceID: 's3', Rank: 2, Sequence: 1, Value: 'Rank 2 value' }),
            ];
            expect(PrefillResolution.Pick(candidates)?.SourceID).toBe('s3');
        });

        it('breaks rank ties by lowest Sequence', () => {
            const candidates: SourceCandidate[] = [
                makeCandidate({ SourceID: 's2', Rank: 1, Sequence: 2, Value: 'Second' }),
                makeCandidate({ SourceID: 's1', Rank: 1, Sequence: 1, Value: 'First' }),
            ];
            expect(PrefillResolution.Pick(candidates)?.SourceID).toBe('s1');
        });

        it('returns null when no candidate has a non-empty value', () => {
            expect(
                PrefillResolution.Pick([
                    makeCandidate({ Value: null }),
                    makeCandidate({ Value: '  \t ' }),
                ])
            ).toBeNull();
        });
    });

    describe('Apply', () => {
        it('Review Focus 4: never overwrites a Confirmed response when picked value matches SourceRawValue or is null', () => {
            const confirmed = makeResponse({
                Status: 'Confirmed',
                AuthorType: 'Human',
                ResponseText: 'The board meets quarterly.',
                SelfAssessment: 'Met',
                SourceReference: 'ext-1',
                SourceRawValue: 'The board meets quarterly.',
            });
            expect(PrefillResolution.Apply(confirmed, 'Prefill', makeCandidate())).toEqual({
                Kind: 'Unchanged',
            });
            expect(PrefillResolution.Apply(confirmed, 'Prefill', null)).toEqual({
                Kind: 'Unchanged',
            });
        });

        it('Review Focus 4: marks a Confirmed response stale when picked value differs from SourceRawValue', () => {
            const confirmed = makeResponse({
                Status: 'Confirmed',
                AuthorType: 'Human',
                ResponseText: 'The board meets quarterly.',
                SelfAssessment: 'Met',
                SourceReference: 'ext-1',
                SourceRawValue: 'The board meets quarterly.',
            });
            const changed = makeCandidate({ Reference: 'ext-2', Value: 'The board meets annually.' });
            expect(PrefillResolution.Apply(confirmed, 'Prefill', changed)).toEqual({
                Kind: 'MarkedStale',
            });
        });

        it('Review Focus 4: never overwrites a human Drafted response', () => {
            const humanDraft = makeResponse({
                Status: 'Drafted',
                AuthorType: 'Human',
                ResponseText: 'Applicant wrote this.',
            });
            expect(PrefillResolution.Apply(humanDraft, 'Prefill', makeCandidate())).toEqual({
                Kind: 'Unchanged',
            });
            expect(PrefillResolution.Apply(humanDraft, 'Prefill', null)).toEqual({
                Kind: 'Unchanged',
            });
            expect(PrefillResolution.Apply(humanDraft, 'Locate', makeCandidate())).toEqual({
                Kind: 'Unchanged',
            });
        });

        it('leaves Manual standards unchanged', () => {
            expect(PrefillResolution.Apply(makeResponse(), 'Manual', makeCandidate())).toEqual({
                Kind: 'Unchanged',
            });
        });

        it('prefills an Empty response on a Prefill standard', () => {
            const picked = makeCandidate();
            expect(PrefillResolution.Apply(makeResponse(), 'Prefill', picked)).toEqual({
                Kind: 'Prefilled',
                Status: 'Prefilled',
                AuthorType: 'Agent',
                ResponseText: picked.Value,
                SourceType: 'Document Extraction',
                SourceLabel: picked.Label,
                SourceReference: picked.Reference,
                SourceRawValue: picked.Value,
                Citation: picked.Citation,
            });
        });

        it('locates a citation without writing response text on a Locate standard', () => {
            const picked = makeCandidate();
            expect(PrefillResolution.Apply(makeResponse(), 'Locate', picked)).toEqual({
                Kind: 'Located',
                Status: 'Located',
                AuthorType: 'Agent',
                SourceType: 'Document Extraction',
                SourceLabel: picked.Label,
                SourceReference: picked.Reference,
                SourceRawValue: picked.Value,
                Citation: picked.Citation,
            });
        });

        it('clears a Prefilled or Located response back to Empty when no source yields a value', () => {
            expect(
                PrefillResolution.Apply(
                    makeResponse({ Status: 'Prefilled', AuthorType: 'Agent', ResponseText: 'Old' }),
                    'Prefill',
                    null
                )
            ).toEqual({ Kind: 'Cleared' });

            expect(
                PrefillResolution.Apply(
                    makeResponse({ Status: 'Located', AuthorType: 'Agent', SourceReference: 'ext-1' }),
                    'Locate',
                    null
                )
            ).toEqual({ Kind: 'Cleared' });
        });
    });
});
