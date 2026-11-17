import { beforeEach, describe, expect, it } from 'vitest';
import { UserInfo } from '@memberjunction/core';
import type { ApplicationStatus } from '@mj-biz-apps/credentialing-core';
import type {
    DocumentLockScope,
    NewExtraction,
    ReadingCommitScope,
    ReadingData,
    ReadingDocument,
    ReadingStateChange,
    RecognizedTextChange,
    StandardToRead,
} from '../reading/ReadingData.js';
import {
    CompleteReadingNote,
    NO_TEXT_FOUND_NOTE,
    READING_FAILED_FINAL_NOTE,
    READING_FAILED_RETRY_NOTE,
    RECOGNIZED_TEXT_NOTE,
    ReadingWorker,
    type ReadingQueueSeams,
} from '../reading/ReadingWorker.js';
import { ReadingQueue } from '../reading/ReadingQueue.js';
import type { EvidenceReader, ReadingRequest, ReadingResult, RecognitionResult, SweepStep, TextRecognizer } from '../services/CredentialingServices.js';

const SUBJECT = 'A0000000-0000-4000-8000-000000000001';
const APP_ONE = 'A0000000-0000-4000-8000-0000000000A1';
const APP_TWO = 'A0000000-0000-4000-8000-0000000000A2';
const DOC = 'D0000000-0000-4000-8000-000000000001';
const TEXT = '[Page 1]\nSafety policy\nThe practice reviews its written safety policy every twelve months.\nSigned minutes are kept for seven years.';
const EXCERPT_ONE = 'The practice reviews its written safety policy every twelve months.';
const EXCERPT_TWO = 'Signed minutes are kept for seven years.';

/** A promise and the function that settles it. */
function gate(): { Promise: Promise<void>; Open: () => void } {
    let open!: () => void;
    const promise = new Promise<void>((resolve) => (open = resolve));
    return { Promise: promise, Open: open };
}

/** Lets every pending promise continuation run. */
async function settle(): Promise<void> {
    for (let i = 0; i < 20; i++) {
        await new Promise<void>((resolve) => setImmediate(resolve));
    }
}

/** A mutex per key, so the in-memory locks exclude each other as the database's application locks do. */
class Locks {
    private readonly tails = new Map<string, Promise<void>>();

    public async Run<T>(keys: string[], work: () => Promise<T>): Promise<T> {
        const releases: Array<() => void> = [];
        for (const key of keys) {
            const previous = this.tails.get(key) ?? Promise.resolve();
            const held = gate();
            this.tails.set(key, previous.then(() => held.Promise));
            await previous;
            releases.push(held.Open);
        }
        try {
            return await work();
        } finally {
            releases.reverse().forEach((release) => release());
        }
    }
}

interface StoredExtraction extends NewExtraction {
    ID: number;
    IsSuperseded: boolean;
}

/** The in-memory database both "processes" share. */
class MemoryData implements ReadingData {
    public readonly Documents = new Map<string, ReadingDocument>();
    public readonly Applications = new Map<string, ApplicationStatus>();
    public readonly Extractions: StoredExtraction[] = [];
    public Standards: StandardToRead[] = [];
    public FindCandidateCalls = 0;
    public FailRequeue = false;
    public CommitCount = 0;
    private readonly locks = new Locks();
    private nextExtraction = 1;

    public async FindCandidates(staleBefore: Date): Promise<string[]> {
        this.FindCandidateCalls++;
        return [...this.Documents.values()]
            .filter((d) => d.ReadingStatus === 'Pending' || (d.ReadingStatus === 'Running' && (d.ReadingClaimedAt == null || d.ReadingClaimedAt < staleBefore)))
            .map((d) => d.ID);
    }

    public async FindRequeueable(maxAttempts: number, includeCouldNotRun: boolean): Promise<string[]> {
        if (this.FailRequeue) {
            throw new Error('requeue read failed');
        }
        return [...this.Documents.values()]
            .filter((d) => (d.ReadingStatus === 'Failed' && d.ReadingAttempts < maxAttempts) || (includeCouldNotRun && d.ReadingStatus === 'Could Not Run'))
            .map((d) => d.ID);
    }

    public UnderDocumentLock<T>(documentID: string, work: (scope: DocumentLockScope) => Promise<T>): Promise<T> {
        return this.locks.Run([`document:${documentID}`], () =>
            work({
                Read: async () => this.copy(documentID),
                Save: async (change: ReadingStateChange) => this.apply(documentID, change),
            }),
        );
    }

    public async StandardsToRead(): Promise<StandardToRead[]> {
        return this.Standards.filter((s) => this.Applications.get(s.ApplicationID) === 'Draft');
    }

    public Commit<T>(subjectID: string, documentID: string, work: (scope: ReadingCommitScope) => Promise<T>): Promise<T> {
        return this.locks.Run([`subject:${subjectID}`, `document:${documentID}`], async () => {
            const pending: Array<() => void> = [];
            const result = await work({
                ReadDocument: async () => this.copy(documentID),
                ApplicationStatuses: async (ids) => new Map(ids.map((id) => [id.toLowerCase(), this.Applications.get(id.toUpperCase()) ?? 'Draft'])),
                SaveDocument: async (change) => {
                    pending.push(() => this.apply(documentID, change));
                },
                SupersedeExtractions: async (documentIDs, standardIDs) => {
                    const hits = this.Extractions.filter((e) => !e.IsSuperseded && documentIDs.includes(e.EvidenceDocumentID) && standardIDs.includes(e.StandardID));
                    pending.push(() => hits.forEach((e) => (e.IsSuperseded = true)));
                    return hits.length;
                },
                InsertExtraction: async (row) => {
                    pending.push(() => {
                        const duplicate = this.Extractions.some((e) => !e.IsSuperseded && e.EvidenceDocumentID === row.EvidenceDocumentID && e.StandardID === row.StandardID);
                        if (duplicate) throw new Error('UQ_Extraction_OneCurrent');
                        this.Extractions.push({ ...row, ID: this.nextExtraction++, IsSuperseded: false });
                    });
                },
            });
            pending.forEach((write) => write());
            this.CommitCount++;
            return result;
        });
    }

    public AddDocument(overrides: Partial<ReadingDocument> = {}): ReadingDocument {
        const document: ReadingDocument = {
            ID: DOC,
            SubjectID: SUBJECT,
            DocumentRequirementID: 'R0000000-0000-4000-8000-000000000001',
            SupersedesDocumentID: null,
            FileID: 'F0000000-0000-4000-8000-000000000001',
            FileName: 'policy.pdf',
            ContentType: 'application/pdf',
            SizeBytes: 1000,
            PageCount: 1,
            ExtractedText: TEXT,
            TextStatus: 'Extracted',
            TextNote: null,
            ReadingStatus: 'Pending',
            ReadingNote: null,
            ReadingClaimID: null,
            ReadingClaimedAt: null,
            ReadingAttempts: 0,
            ...overrides,
        };
        this.Documents.set(document.ID, document);
        return document;
    }

    public Doc(id: string = DOC): ReadingDocument {
        const document = this.Documents.get(id);
        if (document == null) throw new Error(`no document ${id}`);
        return document;
    }

    public Current(documentID: string = DOC): StoredExtraction[] {
        return this.Extractions.filter((e) => e.EvidenceDocumentID === documentID && !e.IsSuperseded);
    }

    private copy(documentID: string): ReadingDocument | null {
        const document = this.Documents.get(documentID);
        return document == null ? null : { ...document };
    }

    private apply(documentID: string, change: ReadingStateChange & Partial<RecognizedTextChange>): void {
        const document = this.Documents.get(documentID);
        if (document == null) throw new Error(`no document ${documentID}`);
        this.Documents.set(documentID, { ...document, ...change });
    }
}

function standard(code: string, applicationID: string = APP_ONE): StandardToRead {
    return {
        ApplicationID: applicationID,
        Standard: { ID: `S-${code}`, Code: code, Statement: `Standard ${code}.`, Guidance: null, EvidenceHint: null, IntakeMode: 'Prefill' },
    };
}

/** A reader that answers from a table keyed by standard code; a gate can hold every call. */
class TableReader implements EvidenceReader {
    public Calls: string[] = [];
    public Hold: Promise<void> | null = null;
    public Throw = false;
    public constructor(public Answers: Record<string, ReadingResult>) {}

    public async Read(request: ReadingRequest): Promise<ReadingResult> {
        this.Calls.push(request.Standard.Code);
        if (this.Hold != null) await this.Hold;
        if (this.Throw) throw new Error('reader exploded');
        return this.Answers[request.Standard.Code] ?? { Kind: 'NothingFound', PromptRunID: null };
    }
}

class FixedRecognizer implements TextRecognizer {
    public Calls = 0;
    public constructor(public Result: RecognitionResult) {}

    public async Recognize(): Promise<RecognitionResult> {
        this.Calls++;
        return this.Result;
    }
}

function found(excerpt: string, value = 'Drafted answer.'): ReadingResult {
    return { Kind: 'Found', Value: value, Excerpt: excerpt, PageReference: '1', HeadingPath: 'Safety policy', Confidence: 0.9, Reasoning: 'It says so.', PromptRunID: null };
}

/** One "process": a worker over the shared in-memory data, with its own seams and a shared fake clock. */
class Process {
    public readonly Worker: ReadingWorker;
    public readonly Seams: ReadingQueueSeams = {};
    public Committed: string[] = [];
    public OrphanRuns = 0;
    public Steps: SweepStep[] = [];
    private claims = 0;

    public constructor(data: MemoryData, clock: { Now: Date }, reader: EvidenceReader, recognizer: TextRecognizer, name: string) {
        this.Seams.Now = () => clock.Now;
        this.Worker = new ReadingWorker({
            Data: data,
            Recognizer: () => recognizer,
            Reader: () => reader,
            Bytes: async () => Buffer.from('%PDF-1.4 scan'),
            ContextUser: () => new UserInfo(null, { ID: 'U0000000-0000-4000-8000-000000000001' }),
            NewClaimID: () => `C${name}000000-0000-4000-8000-${String(++this.claims).padStart(12, '0')}`,
            Seams: this.Seams,
            Limits: { StaleAfterMinutes: 15, MaxAttempts: 3 },
            Committed: async (subjectID) => {
                this.Committed.push(subjectID);
            },
            SweepSteps: () => this.Steps,
            RemoveOrphans: async () => {
                this.OrphanRuns++;
                return 0;
            },
        });
    }
}

describe('ReadingQueue', () => {
    let data: MemoryData;
    let clock: { Now: Date };
    let reader: TableReader;
    let recognizer: FixedRecognizer;
    let one: Process;

    function minutes(n: number): void {
        clock.Now = new Date(clock.Now.getTime() + n * 60_000);
    }

    beforeEach(() => {
        data = new MemoryData();
        data.Applications.set(APP_ONE, 'Draft');
        data.Standards = [standard('R.1'), standard('R.2')];
        clock = { Now: new Date('2026-11-17T10:00:00Z') };
        reader = new TableReader({ 'R.1': found(EXCERPT_ONE), 'R.2': found(EXCERPT_TWO) });
        recognizer = new FixedRecognizer({ Kind: 'Recognized', Text: TEXT, PageCount: 1, Truncated: false, PromptRunID: 'P-1' });
        one = new Process(data, clock, reader, recognizer, '1');
    });

    describe('limits', () => {
        it('declares the plan\'s limits', () => {
            expect(ReadingQueue.StaleAfterMinutes).toBe(15);
            expect(ReadingQueue.SweepEveryMinutes).toBe(5);
            expect(ReadingQueue.MaxAttempts).toBe(3);
        });
    });

    describe('DrainOnce', () => {
        it('reads a pending document into one located extraction per bound standard', async () => {
            data.AddDocument();
            const counts = await one.Worker.DrainOnce();
            expect(counts).toEqual({ Claimed: 1, Completed: 1, Failed: 0, Discarded: 0 });
            const document = data.Doc();
            expect(document.ReadingStatus).toBe('Complete');
            expect(document.ReadingNote).toBe('2 passages found for 2 standards.');
            expect(document.ReadingClaimID).toBeNull();
            expect(document.ReadingAttempts).toBe(1);
            const current = data.Current();
            expect(current.map((e) => e.StandardID).sort()).toEqual(['S-R.1', 'S-R.2']);
            for (const e of current) {
                expect(TEXT.slice(e.StartOffset, e.EndOffset)).toBe(e.Excerpt);
            }
            expect(one.Committed).toEqual([SUBJECT]);
        });

        it('a second DrainOnce during a drain starts no second read, and the drain runs again once', async () => {
            data.AddDocument();
            const held = gate();
            reader.Hold = held.Promise;
            const first = one.Worker.DrainOnce();
            await settle();
            const second = one.Worker.DrainOnce();
            expect(second).toBe(first);
            await settle();
            expect(reader.Calls).toEqual(['R.1']);
            held.Open();
            const counts = await first;
            expect(reader.Calls).toEqual(['R.1', 'R.2']);
            expect(counts.Claimed).toBe(1);
            expect(data.FindCandidateCalls).toBe(2);
        });

        it('a second DrainOnce after the drain finished drains again', async () => {
            data.AddDocument();
            await one.Worker.DrainOnce();
            const again = await one.Worker.DrainOnce();
            expect(again).toEqual({ Claimed: 0, Completed: 0, Failed: 0, Discarded: 0 });
            expect(data.Current()).toHaveLength(2);
        });

        it('two queues over one store (two processes) take one claim', async () => {
            data.AddDocument();
            const two = new Process(data, clock, reader, recognizer, '2');
            const held = gate();
            reader.Hold = held.Promise;
            const drains = [one.Worker.DrainOnce(), two.Worker.DrainOnce()];
            await settle();
            held.Open();
            const [a, b] = await Promise.all(drains);
            expect(a.Claimed + b.Claimed).toBe(1);
            expect(reader.Calls).toHaveLength(2);
            expect(data.Current()).toHaveLength(2);
        });

        it('a document with no bound standards is Complete with 0 passages found for 0 standards', async () => {
            data.Standards = [];
            data.AddDocument();
            await one.Worker.DrainOnce();
            expect(data.Doc().ReadingStatus).toBe('Complete');
            expect(data.Doc().ReadingNote).toBe('0 passages found for 0 standards.');
            expect(reader.Calls).toEqual([]);
        });

        it('drops an excerpt that is not in the text and counts it', async () => {
            reader.Answers['R.2'] = found('The board approved a policy that does not appear anywhere.');
            data.AddDocument();
            await one.Worker.DrainOnce();
            expect(data.Current().map((e) => e.StandardID)).toEqual(['S-R.1']);
            expect(data.Doc().ReadingNote).toBe(
                '1 passage found for 2 standards. 1 passage the assistant quoted was not in the document and was discarded.',
            );
            expect(CompleteReadingNote(1, 2, 3)).toBe('1 passage found for 2 standards. 3 passages the assistant quoted were not in the document and were discarded.');
        });

        it('every read CouldNotRun → Could Not Run with the reason', async () => {
            reader.Answers = {
                'R.1': { Kind: 'CouldNotRun', Reason: 'No AI model is available on this server.' },
                'R.2': { Kind: 'CouldNotRun', Reason: 'No AI model is available on this server.' },
            };
            data.AddDocument();
            await one.Worker.DrainOnce();
            expect(data.Doc().ReadingStatus).toBe('Could Not Run');
            expect(data.Doc().ReadingNote).toBe('No AI model is available on this server.');
            expect(data.Current()).toHaveLength(0);
        });

        it('an exception → Failed with attempts 1, and Sweep requeues it until the third attempt', async () => {
            reader.Throw = true;
            data.AddDocument();
            const counts = await one.Worker.DrainOnce();
            expect(counts.Failed).toBe(1);
            expect(data.Doc().ReadingStatus).toBe('Failed');
            expect(data.Doc().ReadingAttempts).toBe(1);
            expect(data.Doc().ReadingNote).toBe(READING_FAILED_RETRY_NOTE);
            await one.Worker.Sweep(false);
            expect(data.Doc().ReadingAttempts).toBe(2);
            expect(data.Doc().ReadingStatus).toBe('Failed');
            await one.Worker.Sweep(false);
            expect(data.Doc().ReadingAttempts).toBe(3);
            expect(data.Doc().ReadingNote).toBe(READING_FAILED_FINAL_NOTE);
            await one.Worker.Sweep(false);
            expect(data.Doc().ReadingAttempts).toBe(3);
            expect(data.Doc().ReadingStatus).toBe('Failed');
            expect(reader.Calls).toHaveLength(3);
        });
    });

    describe('claims', () => {
        it('a stale Running row is reclaimed; the first worker\'s late commit is discarded and the second worker\'s results stand', async () => {
            data.AddDocument();
            const two = new Process(data, clock, reader, recognizer, '2');
            const held = gate();
            const reached = gate();
            one.Seams.BeforeCommit = async () => {
                reached.Open();
                await held.Promise;
            };
            const firstDrain = one.Worker.DrainOnce();
            await reached.Promise;
            minutes(16);
            const secondCounts = await two.Worker.DrainOnce();
            expect(secondCounts).toEqual({ Claimed: 1, Completed: 1, Failed: 0, Discarded: 0 });
            held.Open();
            const firstCounts = await firstDrain;
            expect(firstCounts.Discarded).toBe(1);
            expect(firstCounts.Completed).toBe(0);
            const current = data.Current();
            expect(current).toHaveLength(2);
            expect(new Set(current.map((e) => e.StandardID)).size).toBe(2);
            expect(data.Doc().ReadingAttempts).toBe(2);
            expect(data.Doc().ReadingStatus).toBe('Complete');
        });

        it('a worker that renews its claim is not reclaimed', async () => {
            data.AddDocument();
            const two = new Process(data, clock, reader, recognizer, '2');
            const held = gate();
            let reads = 0;
            const slow: EvidenceReader = {
                Read: async (request) => {
                    reads++;
                    if (reads === 1) {
                        minutes(10);
                    }
                    if (reads === 2) {
                        await held.Promise;
                    }
                    return reader.Read(request);
                },
            };
            const renewing = new Process(data, clock, slow, recognizer, '3');
            const drain = renewing.Worker.DrainOnce();
            await settle();
            // The renewal before the second read set ReadingClaimedAt to the 10-minute mark.
            minutes(10);
            const counts = await two.Worker.DrainOnce();
            expect(counts.Claimed).toBe(0);
            held.Open();
            const finished = await drain;
            expect(finished.Completed).toBe(1);
            expect(data.Doc().ReadingAttempts).toBe(1);
        });

        it('three crash-reclaims, then the fourth pass marks the row Failed without reading', async () => {
            data.AddDocument();
            const crash = gate();
            const crashing: EvidenceReader = { Read: async () => crash.Promise.then((): ReadingResult => ({ Kind: 'NothingFound', PromptRunID: null })) };
            for (let attempt = 1; attempt <= 3; attempt++) {
                const worker = new Process(data, clock, crashing, recognizer, `${attempt}`);
                void worker.Worker.DrainOnce();
                await settle();
                expect(data.Doc().ReadingStatus).toBe('Running');
                expect(data.Doc().ReadingAttempts).toBe(attempt);
                minutes(16);
            }
            const fresh = new TableReader({});
            const fourth = new Process(data, clock, fresh, recognizer, '4');
            const counts = await fourth.Worker.DrainOnce();
            expect(counts).toEqual({ Claimed: 0, Completed: 0, Failed: 1, Discarded: 0 });
            expect(fresh.Calls).toEqual([]);
            expect(data.Doc().ReadingStatus).toBe('Failed');
            expect(data.Doc().ReadingNote).toBe(READING_FAILED_FINAL_NOTE);
            expect(data.Doc().ReadingClaimID).toBeNull();
        });
    });

    describe('scans', () => {
        it('Awaiting Recognition + Recognized → the text is stored with its note, then read', async () => {
            data.AddDocument({ ExtractedText: null, TextStatus: 'Awaiting Recognition', TextNote: 'This is a scan.' });
            await one.Worker.DrainOnce();
            const document = data.Doc();
            expect(recognizer.Calls).toBe(1);
            expect(document.TextStatus).toBe('Recognized');
            expect(document.ExtractedText).toBe(TEXT);
            expect(document.TextNote).toBe(RECOGNIZED_TEXT_NOTE);
            expect(document.ReadingStatus).toBe('Complete');
            expect(data.Current()).toHaveLength(2);
        });

        it('recognized text is stored even when every read could not run', async () => {
            reader.Answers = { 'R.1': { Kind: 'CouldNotRun', Reason: 'No AI model is available on this server.' }, 'R.2': { Kind: 'CouldNotRun', Reason: 'No AI model is available on this server.' } };
            data.AddDocument({ ExtractedText: null, TextStatus: 'Awaiting Recognition' });
            await one.Worker.DrainOnce();
            expect(data.Doc().TextStatus).toBe('Recognized');
            expect(data.Doc().ReadingStatus).toBe('Could Not Run');
        });

        it('recognizer Unreadable → No Text Found and Not Applicable', async () => {
            recognizer.Result = { Kind: 'Unreadable', PromptRunID: 'P-2' };
            data.AddDocument({ ExtractedText: null, TextStatus: 'Awaiting Recognition' });
            await one.Worker.DrainOnce();
            expect(data.Doc().TextStatus).toBe('No Text Found');
            expect(data.Doc().TextNote).toBe(NO_TEXT_FOUND_NOTE);
            expect(data.Doc().ReadingStatus).toBe('Not Applicable');
            expect(reader.Calls).toEqual([]);
        });

        it('recognizer CouldNotRun → Could Not Run with the reason, text still awaiting recognition', async () => {
            recognizer.Result = { Kind: 'CouldNotRun', Reason: 'No AI model is available on this server.' };
            data.AddDocument({ ExtractedText: null, TextStatus: 'Awaiting Recognition' });
            await one.Worker.DrainOnce();
            expect(data.Doc().ReadingStatus).toBe('Could Not Run');
            expect(data.Doc().ReadingNote).toBe('No AI model is available on this server.');
            expect(data.Doc().TextStatus).toBe('Awaiting Recognition');
        });

        it('a recognized scan is not recognized again when it is read again', async () => {
            data.AddDocument({ ExtractedText: null, TextStatus: 'Awaiting Recognition' });
            await one.Worker.DrainOnce();
            data.Documents.set(DOC, { ...data.Doc(), ReadingStatus: 'Pending' });
            await one.Worker.DrainOnce();
            expect(recognizer.Calls).toBe(1);
            expect(data.Doc().ExtractedText).toBe(TEXT);
            expect(data.Current()).toHaveLength(2);
            expect(data.Extractions.filter((e) => e.IsSuperseded)).toHaveLength(2);
        });
    });

    describe('a submission that commits during the reading', () => {
        it('drops the submitted application\'s results, keeps the Draft one\'s, and still stores the scan\'s text', async () => {
            data.Applications.set(APP_TWO, 'Draft');
            data.Standards = [standard('R.1', APP_ONE), standard('R.2', APP_TWO)];
            data.AddDocument({ ExtractedText: null, TextStatus: 'Awaiting Recognition' });
            data.Extractions.push({
                ID: 999, EvidenceDocumentID: DOC, StandardID: 'S-R.1', Value: 'old', Excerpt: EXCERPT_ONE, StartOffset: 0, EndOffset: 1,
                PageReference: null, HeadingPath: null, Confidence: 0.5, Reasoning: null, AIPromptRunID: null, IsSuperseded: false,
            });
            const held = gate();
            const reached = gate();
            one.Seams.BeforeCommit = async () => {
                reached.Open();
                await held.Promise;
            };
            const drain = one.Worker.DrainOnce();
            await reached.Promise;
            data.Applications.set(APP_ONE, 'Submitted');
            held.Open();
            await drain;
            const current = data.Current();
            expect(current.find((e) => e.StandardID === 'S-R.1')?.ID).toBe(999);
            expect(current.filter((e) => e.StandardID === 'S-R.1')).toHaveLength(1);
            expect(current.filter((e) => e.StandardID === 'S-R.2')).toHaveLength(1);
            expect(data.Doc().TextStatus).toBe('Recognized');
            expect(data.Doc().ExtractedText).toBe(TEXT);
            expect(data.Doc().ReadingNote).toBe('1 passage found for 1 standard.');
        });
    });

    describe('Sweep', () => {
        it('a second Sweep during a sweep does nothing', async () => {
            const held = gate();
            let runs = 0;
            one.Steps = [{ Name: 'redispatch', Phase: 'BeforeQueue', Run: async () => { runs++; await held.Promise; } }];
            const first = one.Worker.Sweep(false);
            const second = one.Worker.Sweep(false);
            expect(second).toBe(first);
            held.Open();
            await first;
            expect(runs).toBe(1);
            expect(one.OrphanRuns).toBe(1);
        });

        it('a sweep whose requeue step throws still runs redispatch, orphan removal and the drain', async () => {
            const order: string[] = [];
            one.Steps = [
                { Name: 'redispatch', Phase: 'BeforeQueue', Run: async () => { order.push('redispatch'); } },
                { Name: 'after', Phase: 'AfterQueue', Run: async () => { order.push('after'); } },
            ];
            data.FailRequeue = true;
            data.AddDocument();
            await one.Worker.Sweep(false);
            expect(order).toEqual(['redispatch', 'after']);
            expect(one.OrphanRuns).toBe(1);
            expect(data.Doc().ReadingStatus).toBe('Complete');
        });

        it('sets every Could Not Run back to Pending with attempts reset at boot only', async () => {
            data.AddDocument({ ReadingStatus: 'Could Not Run', ReadingNote: 'No AI model is available on this server.', ReadingAttempts: 2 });
            data.Standards = [];
            const two = new Process(data, clock, reader, recognizer, '2');
            // Not at boot: untouched.
            await two.Worker.Sweep(false);
            expect(data.Doc().ReadingStatus).toBe('Could Not Run');
            await two.Worker.Sweep(true);
            expect(data.Doc().ReadingStatus).toBe('Complete');
            expect(data.Doc().ReadingAttempts).toBe(1);
        });

        it('a Running row a crash left behind is read by the sweep once the clock passes StaleAfterMinutes', async () => {
            data.AddDocument({ ReadingStatus: 'Running', ReadingClaimID: 'CDEAD000-0000-4000-8000-000000000000', ReadingClaimedAt: new Date(clock.Now.getTime() - 60_000), ReadingAttempts: 1 });
            expect((await one.Worker.DrainOnce()).Claimed).toBe(0);
            minutes(15);
            await one.Worker.Sweep(false);
            expect(data.Doc().ReadingStatus).toBe('Complete');
            expect(data.Doc().ReadingAttempts).toBe(2);
        });
    });
});
