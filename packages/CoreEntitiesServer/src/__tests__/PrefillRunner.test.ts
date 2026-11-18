import { describe, expect, it } from 'vitest';
import { UserInfo } from '@memberjunction/core';
import type {
    ApplicationStatus,
    IntakeMode,
    ResponseAuthorType,
    ResponseSourceMode,
    ResponseSourceType,
    ResponseStatus,
    SelfAssessment,
    SourceCandidate,
} from '@mj-biz-apps/credentialing-core';
import {
    PrefillWorker,
    type PrefillCitationRecord,
    type PrefillData,
    type PrefillResponseRecord,
    type PrefillTransactionScope,
} from '../prefill/PrefillRunner.js';
import type { PrefillContext, ResponseSourceRow, SourceEvaluator } from '../prefill/SourceEvaluators.js';

const APP_ID = 'A0000000-0000-4000-8000-000000000001';
const SUBJECT_ID = 'B0000000-0000-4000-8000-000000000001';
const VERSION_ID = 'C0000000-0000-4000-8000-000000000001';
const STD_PREFILL = 'S0000000-0000-4000-8000-000000000001';
const STD_LOCATE = 'S0000000-0000-4000-8000-000000000002';
const STD_MANUAL = 'S0000000-0000-4000-8000-000000000003';
const DOC_1 = 'D0000000-0000-4000-8000-000000000001';
const EXT_1 = 'E0000000-0000-4000-8000-000000000001';
const EXT_2 = 'E0000000-0000-4000-8000-000000000002';

function makeUser(): UserInfo {
    const user = new UserInfo();
    user.ID = 'U0000000-0000-4000-8000-000000000001';
    user.Email = 'applicant@example.test';
    return user;
}

class MemoryPrefillData implements PrefillData {
    public ApplicationStatus: ApplicationStatus = 'Draft';
    public Standards = new Map<string, IntakeMode>([
        [STD_PREFILL.toLowerCase(), 'Prefill'],
        [STD_LOCATE.toLowerCase(), 'Locate'],
        [STD_MANUAL.toLowerCase(), 'Manual'],
    ]);
    public Sources: ResponseSourceRow[] = [];
    public Responses: PrefillResponseRecord[] = [];
    public Citations: PrefillCitationRecord[] = [];
    public SaveCalls = 0;

    public async FindApplicationSubject(): Promise<{ ID: string; SubjectID: string } | null> {
        return { ID: APP_ID, SubjectID: SUBJECT_ID };
    }

    public async InLockedTransaction<T>(
        _applicationID: string,
        _subjectID: string,
        work: (scope: PrefillTransactionScope) => Promise<T>,
    ): Promise<T> {
        const self = this;
        const scope: PrefillTransactionScope = {
            async LoadState() {
                return {
                    Application: {
                        ID: APP_ID,
                        SubjectID: SUBJECT_ID,
                        ProgramVersionID: VERSION_ID,
                        Status: self.ApplicationStatus,
                    },
                    Standards: new Map(self.Standards),
                    Sources: self.Sources.filter((s) => s.Mode === 'Prefill Only' || s.Mode === 'Both'),
                    Responses: self.Responses.map((r) => ({ ...r })),
                    Citations: self.Citations.map((c) => ({ ...c })),
                };
            },
            async UpdateResponse(responseID, patch) {
                self.SaveCalls++;
                const row = self.Responses.find((r) => r.ID === responseID);
                if (!row) throw new Error(`Missing response ${responseID}`);
                Object.assign(row, patch);
            },
            async DeleteCitations(citationIDs) {
                const drop = new Set(citationIDs);
                self.Citations = self.Citations.filter((c) => !drop.has(c.ID));
            },
            async InsertCitation(citation) {
                self.Citations.push({
                    ID: `CIT-${self.Citations.length + 1}`,
                    ...citation,
                });
            },
        };
        return work(scope);
    }
}

class StubEvaluator implements SourceEvaluator {
    public readonly SourceType: ResponseSourceType = 'Document Extraction';
    public CandidatesByStandard = new Map<string, SourceCandidate[]>();

    public async Evaluate(
        _sources: ResponseSourceRow[],
        _context: PrefillContext,
    ): Promise<Map<string, SourceCandidate[]>> {
        return this.CandidatesByStandard;
    }
}

function makeResponse(overrides: Partial<PrefillResponseRecord> = {}): PrefillResponseRecord {
    return {
        ID: 'R0000000-0000-4000-8000-000000000001',
        StandardID: STD_PREFILL,
        Status: 'Empty' as ResponseStatus,
        AuthorType: 'Human' as ResponseAuthorType,
        ResponseText: null,
        SelfAssessment: null as SelfAssessment | null,
        SourceType: null,
        SourceLabel: null,
        SourceReference: null,
        SourceRetrievedAt: null,
        SourceRawValue: null,
        IsStale: false,
        ...overrides,
    };
}

function makeSource(overrides: Partial<ResponseSourceRow> = {}): ResponseSourceRow {
    return {
        ID: 'SRC-1',
        StandardID: STD_PREFILL,
        ProgramVersionID: VERSION_ID,
        SourceType: 'Document Extraction',
        DocumentRequirementID: 'REQ-1',
        Mode: 'Prefill Only' as ResponseSourceMode,
        Rank: 1,
        Sequence: 0,
        ...overrides,
    };
}

function makeCandidate(overrides: Partial<SourceCandidate> = {}): SourceCandidate {
    return {
        SourceID: 'SRC-1',
        Rank: 1,
        Sequence: 0,
        Value: 'The safety policy is reviewed annually.',
        Label: 'safety-policy.pdf',
        Reference: EXT_1,
        Citation: {
            EvidenceDocumentID: DOC_1,
            ExtractionID: EXT_1,
            SourceLabel: 'safety-policy.pdf',
            PageReference: '1',
            Excerpt: 'The safety policy is reviewed annually by the board.',
            StartOffset: 10,
            EndOffset: 62,
        },
        ...overrides,
    };
}

describe('PrefillWorker', () => {
    it('returns all zeros and performs no writes when application is not Draft', async () => {
        const data = new MemoryPrefillData();
        data.ApplicationStatus = 'Submitted';
        data.Sources = [makeSource()];
        data.Responses = [makeResponse()];
        const evaluator = new StubEvaluator();
        evaluator.CandidatesByStandard.set(STD_PREFILL.toLowerCase(), [makeCandidate()]);

        const worker = new PrefillWorker(data, [evaluator], () => new Date('2026-11-17T12:00:00Z'));
        const counts = await worker.RunForApplication(APP_ID, makeUser());

        expect(counts).toEqual({ Prefilled: 0, Located: 0, MarkedStale: 0, Cleared: 0, Unchanged: 0 });
        expect(data.SaveCalls).toBe(0);
        expect(data.Responses[0].Status).toBe('Empty');
    });

    it('picks the lowest rank with a non-empty value, breaking ties by lowest sequence', async () => {
        const data = new MemoryPrefillData();
        data.Sources = [
            makeSource({ ID: 'SRC-R2', Rank: 2, Sequence: 0 }),
            makeSource({ ID: 'SRC-R1-S2', Rank: 1, Sequence: 2 }),
            makeSource({ ID: 'SRC-R1-S1', Rank: 1, Sequence: 1 }),
        ];
        data.Responses = [makeResponse()];

        const evaluator = new StubEvaluator();
        evaluator.CandidatesByStandard.set(STD_PREFILL.toLowerCase(), [
            makeCandidate({ SourceID: 'SRC-R2', Rank: 2, Sequence: 0, Value: 'Rank 2' }),
            makeCandidate({ SourceID: 'SRC-R1-S2', Rank: 1, Sequence: 2, Value: 'Rank 1 Seq 2' }),
            makeCandidate({ SourceID: 'SRC-R1-S1', Rank: 1, Sequence: 1, Value: 'Rank 1 Seq 1', Reference: EXT_2 }),
        ]);

        const worker = new PrefillWorker(data, [evaluator], () => new Date('2026-11-17T12:00:00Z'));
        const counts = await worker.RunForApplication(APP_ID, makeUser());

        expect(counts.Prefilled).toBe(1);
        expect(data.Responses[0].ResponseText).toBe('Rank 1 Seq 1');
        expect(data.Responses[0].SourceReference).toBe(EXT_2);
    });

    it('handles all five outcomes: Prefilled, Located, MarkedStale, Cleared, Unchanged', async () => {
        const data = new MemoryPrefillData();
        data.Sources = [
            makeSource({ ID: 'S-PRE', StandardID: STD_PREFILL }),
            makeSource({ ID: 'S-LOC', StandardID: STD_LOCATE }),
        ];
        data.Standards.set('s-stale', 'Prefill');
        data.Standards.set('s-clear', 'Prefill');
        data.Standards.set('s-human', 'Prefill');

        data.Responses = [
            makeResponse({ ID: 'R-PRE', StandardID: STD_PREFILL, Status: 'Empty' }),
            makeResponse({ ID: 'R-LOC', StandardID: STD_LOCATE, Status: 'Empty' }),
            makeResponse({
                ID: 'R-STALE',
                StandardID: 'S-STALE',
                Status: 'Confirmed',
                AuthorType: 'Agent',
                ResponseText: 'Old confirmed text',
                SourceRawValue: 'Old raw value',
                SourceReference: EXT_1,
            }),
            makeResponse({
                ID: 'R-CLEAR',
                StandardID: 'S-CLEAR',
                Status: 'Prefilled',
                AuthorType: 'Agent',
                ResponseText: 'Previously prefilled',
                SourceType: 'Document Extraction',
                SourceLabel: 'old.pdf',
                SourceReference: EXT_1,
                SourceRawValue: 'Previously prefilled',
            }),
            makeResponse({
                ID: 'R-HUMAN',
                StandardID: 'S-HUMAN',
                Status: 'Drafted',
                AuthorType: 'Human',
                ResponseText: 'Applicant wrote this.',
            }),
            makeResponse({
                ID: 'R-MANUAL',
                StandardID: STD_MANUAL,
                Status: 'Empty',
            }),
        ];
        data.Citations = [
            {
                ID: 'CIT-OLD-CLEAR',
                StandardResponseID: 'R-CLEAR',
                EvidenceDocumentID: DOC_1,
                ExtractionID: EXT_1,
                SourceLabel: 'old.pdf',
                PageReference: '1',
                Excerpt: 'Old excerpt.',
                StartOffset: 0,
                EndOffset: 12,
            },
        ];

        const evaluator = new StubEvaluator();
        evaluator.CandidatesByStandard.set(STD_PREFILL.toLowerCase(), [makeCandidate()]);
        evaluator.CandidatesByStandard.set(STD_LOCATE.toLowerCase(), [makeCandidate({ SourceID: 'S-LOC' })]);
        evaluator.CandidatesByStandard.set('s-stale', [makeCandidate({ Value: 'Updated raw value', Reference: EXT_2 })]);
        evaluator.CandidatesByStandard.set('s-human', [makeCandidate({ Value: 'Should not overwrite' })]);

        const worker = new PrefillWorker(data, [evaluator], () => new Date('2026-11-17T12:00:00Z'));
        const counts = await worker.RunForApplication(APP_ID, makeUser());

        expect(counts).toEqual({
            Prefilled: 1,
            Located: 1,
            MarkedStale: 1,
            Cleared: 1,
            Unchanged: 2,
        });

        const pre = data.Responses.find((r) => r.ID === 'R-PRE')!;
        expect(pre.Status).toBe('Prefilled');
        expect(pre.AuthorType).toBe('Agent');
        expect(pre.ResponseText).toBe('The safety policy is reviewed annually.');
        expect(pre.SourceLabel).toBe('safety-policy.pdf');
        expect(data.Citations.filter((c) => c.StandardResponseID === 'R-PRE')).toHaveLength(1);

        const loc = data.Responses.find((r) => r.ID === 'R-LOC')!;
        expect(loc.Status).toBe('Located');
        expect(loc.ResponseText).toBeNull();
        expect(data.Citations.filter((c) => c.StandardResponseID === 'R-LOC')).toHaveLength(1);

        const stale = data.Responses.find((r) => r.ID === 'R-STALE')!;
        expect(stale.Status).toBe('Confirmed');
        expect(stale.ResponseText).toBe('Old confirmed text');
        expect(stale.IsStale).toBe(true);

        const cleared = data.Responses.find((r) => r.ID === 'R-CLEAR')!;
        expect(cleared.Status).toBe('Empty');
        expect(cleared.AuthorType).toBe('Human');
        expect(cleared.ResponseText).toBeNull();
        expect(cleared.SourceReference).toBeNull();
        expect(data.Citations.filter((c) => c.StandardResponseID === 'R-CLEAR')).toHaveLength(0);

        const human = data.Responses.find((r) => r.ID === 'R-HUMAN')!;
        expect(human.Status).toBe('Drafted');
        expect(human.ResponseText).toBe('Applicant wrote this.');
    });
});
