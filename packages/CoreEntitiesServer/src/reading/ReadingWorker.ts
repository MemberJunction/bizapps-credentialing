import { LogError, type UserInfo } from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import { ExcerptLocator, type ApplicationStatus } from '@mj-biz-apps/credentialing-core';
import type {
    EvidenceReader,
    ReadingResult,
    RecognitionResult,
    SweepStep,
    TextRecognizer,
} from '../services/CredentialingServices.js';
import type {
    DocumentReadingStatus,
    NewExtraction,
    ReadingCommitScope,
    ReadingData,
    ReadingDocument,
    RecognizedTextChange,
    StandardToRead,
} from './ReadingData.js';

/** The note stored with the text of a scan the assistant read. */
export const RECOGNIZED_TEXT_NOTE = 'This text was read from a scan by the assistant and may contain errors.';
/** Appended to {@link RECOGNIZED_TEXT_NOTE} when the transcription was cut at the stored-text limit (`Truncated`). */
export const RECOGNIZED_TRUNCATED_NOTE = ' Only the first part of this scan was read because it is very long.';
/** The note of a scan in which the assistant found no text. */
export const NO_TEXT_FOUND_NOTE = 'No readable text was found in this scan. It is stored, but nothing can be drafted from it.';
/** The reading note of a document whose reading threw, while attempts remain. */
export const READING_FAILED_RETRY_NOTE = 'The assistant could not finish reading this document. It will try again.';
/** The reading note of a document whose reading failed on its last attempt. */
export const READING_FAILED_FINAL_NOTE = 'The assistant could not read this document.';

/** The reading note of a completed reading: `{n} passages found for {m} standards.` plus the discarded count when any. */
export function CompleteReadingNote(found: number, standards: number, discarded: number): string {
    const note = `${found} ${found === 1 ? 'passage' : 'passages'} found for ${standards} ${standards === 1 ? 'standard' : 'standards'}.`;
    if (discarded === 0) {
        return note;
    }
    return discarded === 1
        ? `${note} 1 passage the assistant quoted was not in the document and was discarded.`
        : `${note} ${discarded} passages the assistant quoted were not in the document and were discarded.`;
}

/** What one drain pass (or one `DrainOnce`, summed over its passes) did. */
export interface DrainCounts {
    Claimed: number;
    Completed: number;
    Failed: number;
    Discarded: number;
}

/** Test seams of the queue. Every field is read at the moment it is needed, so a test may set it at any time. */
export interface ReadingQueueSeams {
    /** Awaited before the commit transaction begins (before any lock), with the document's ID. */
    BeforeCommit?: (documentID: string) => Promise<void>;
    /** The queue's clock; the real time when unset. */
    Now?: () => Date;
    /** When set, the queue sees only the documents of these subjects (a check's own scratch subjects). */
    OnlySubjectIDs?: readonly string[];
}

/** The limits of the queue (`ReadingQueue.StaleAfterMinutes`, `MaxAttempts`). */
export interface ReadingLimits {
    StaleAfterMinutes: number;
    MaxAttempts: number;
}

/** What a worker needs; the server's come from `CredentialingServices`, the unit tests' from memory. */
export interface ReadingWorkerOptions {
    Data: ReadingData;
    Recognizer: () => TextRecognizer;
    Reader: () => EvidenceReader;
    /** The stored bytes of a file. */
    Bytes: (fileID: string) => Promise<Buffer>;
    /** The user the model calls run as (the system user on the server). */
    ContextUser: () => UserInfo;
    NewClaimID: () => string;
    Seams: ReadingQueueSeams;
    Limits: ReadingLimits;
    /** Runs after a reading committed (the prefill runner's hook); never throws. */
    Committed: (subjectID: string) => Promise<void>;
    /** The sweep steps other parts of the app contribute. */
    SweepSteps: () => readonly SweepStep[];
    /** Removes stored files no document references; returns how many. */
    RemoveOrphans: () => Promise<number>;
}

/** A claim this worker holds on a document. */
interface Claim {
    ClaimID: string;
    Document: ReadingDocument;
}

type ClaimOutcome = { Kind: 'Claimed'; Claim: Claim } | { Kind: 'GaveUp' } | { Kind: 'Skipped' };

/** One standard's reading. */
interface StandardReading {
    ApplicationID: string;
    StandardID: string;
    Result: ReadingResult;
}

/** What the work outside any transaction produced, or `Lost` when the claim went to another worker. */
type WorkOutcome =
    | { Kind: 'Lost' }
    | { Kind: 'Recognition'; Text: RecognizedTextChange | null; Status: DocumentReadingStatus; Note: string | null }
    | { Kind: 'Read'; Text: RecognizedTextChange | null; ReadText: string; Readings: StandardReading[] };

/** The writes a commit decided, after dropping what non-Draft applications must not receive. */
interface CommitPlan {
    Status: DocumentReadingStatus;
    Note: string | null;
    SupersedeStandardIDs: string[];
    Inserts: NewExtraction[];
}

function zeroCounts(): DrainCounts {
    return { Claimed: 0, Completed: 0, Failed: 0, Discarded: 0 };
}

function errorText(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

/**
 * The reading queue of one process (plan Task 9): claims documents through the database, recognizes
 * scans, reads each document once per bound standard, and commits the results in one short
 * transaction. Two workers over one database (two processes) are arbitrated by the claim; within one
 * worker, a drain and a sweep are each single-flight.
 */
export class ReadingWorker {
    private running: Promise<DrainCounts> | null = null;
    private again = false;
    private sweeping: Promise<void> | null = null;

    public constructor(private readonly options: ReadingWorkerOptions) {}

    /**
     * Claims and reads every candidate. A call that arrives while a drain runs sets a "run again"
     * flag and returns the running drain's promise; the drain loops while the flag is set.
     */
    public DrainOnce(): Promise<DrainCounts> {
        if (this.running != null) {
            this.again = true;
            return this.running;
        }
        this.running = this.drainLoop();
        return this.running;
    }

    /**
     * Runs the sweep: contributed `BeforeQueue` steps, the requeue rules, orphan removal, the drain,
     * then contributed `AfterQueue` steps — each in its own try/catch. A sweep that arrives while one
     * runs is dropped (it gets the running sweep's promise).
     */
    public Sweep(atBoot: boolean): Promise<void> {
        if (this.sweeping != null) {
            return this.sweeping;
        }
        const run = this.sweepSteps(atBoot).finally(() => {
            this.sweeping = null;
        });
        this.sweeping = run;
        return run;
    }

    private async drainLoop(): Promise<DrainCounts> {
        const total = zeroCounts();
        try {
            for (;;) {
                this.again = false;
                const pass = await this.drainPass();
                total.Claimed += pass.Claimed;
                total.Completed += pass.Completed;
                total.Failed += pass.Failed;
                total.Discarded += pass.Discarded;
                if (!this.again) {
                    this.running = null;
                    return total;
                }
            }
        } catch (err: unknown) {
            this.running = null;
            LogError(`ReadingQueue: the drain stopped: ${errorText(err)}`);
            return total;
        }
    }

    private async drainPass(): Promise<DrainCounts> {
        const counts = zeroCounts();
        const candidates = await this.options.Data.FindCandidates(this.staleBefore(), this.options.Seams.OnlySubjectIDs ?? null);
        for (const documentID of candidates) {
            await this.processCandidate(documentID, counts);
        }
        return counts;
    }

    private async processCandidate(documentID: string, counts: DrainCounts): Promise<void> {
        let claimed: ClaimOutcome;
        try {
            claimed = await this.claim(documentID);
        } catch (err: unknown) {
            LogError(`ReadingQueue: claiming document ${documentID} failed: ${errorText(err)}`);
            return;
        }
        if (claimed.Kind === 'GaveUp') {
            counts.Failed++;
            return;
        }
        if (claimed.Kind === 'Skipped') {
            return;
        }
        counts.Claimed++;
        await this.readClaimed(claimed.Claim, counts);
    }

    private async readClaimed(claim: Claim, counts: DrainCounts): Promise<void> {
        try {
            const outcome = await this.work(claim);
            const committed = outcome.Kind !== 'Lost' && (await this.commit(claim, outcome));
            if (!committed) {
                counts.Discarded++;
                return;
            }
            counts.Completed++;
            await this.options.Committed(claim.Document.SubjectID);
        } catch (err: unknown) {
            LogError(`ReadingQueue: reading document ${claim.Document.ID} failed: ${errorText(err)}`);
            counts.Failed++;
            await this.markFailed(claim);
        }
    }

    // ─── Claim ─────────────────────────────────────────────────────────────────

    private now(): Date {
        return this.options.Seams.Now?.() ?? new Date();
    }

    private staleBefore(): Date {
        return new Date(this.now().getTime() - this.options.Limits.StaleAfterMinutes * 60_000);
    }

    /**
     * Under the document's lock: re-reads the row and, if it is still a candidate, takes it. A stale
     * `Running` row that has used every attempt is set to `Failed` in the same save instead.
     */
    private claim(documentID: string): Promise<ClaimOutcome> {
        return this.options.Data.UnderDocumentLock(documentID, async (scope): Promise<ClaimOutcome> => {
            const current = await scope.Read();
            if (current == null || !this.isCandidate(current)) {
                return { Kind: 'Skipped' };
            }
            if (current.ReadingStatus === 'Running' && current.ReadingAttempts >= this.options.Limits.MaxAttempts) {
                await scope.Save({ ReadingStatus: 'Failed', ReadingNote: READING_FAILED_FINAL_NOTE, ReadingClaimID: null, ReadingClaimedAt: null });
                return { Kind: 'GaveUp' };
            }
            const claimID = this.options.NewClaimID();
            const claimedAt = this.now();
            const attempts = current.ReadingAttempts + 1;
            await scope.Save({ ReadingStatus: 'Running', ReadingNote: null, ReadingClaimID: claimID, ReadingClaimedAt: claimedAt, ReadingAttempts: attempts });
            const document: ReadingDocument = { ...current, ReadingStatus: 'Running', ReadingNote: null, ReadingClaimID: claimID, ReadingClaimedAt: claimedAt, ReadingAttempts: attempts };
            return { Kind: 'Claimed', Claim: { ClaimID: claimID, Document: document } };
        });
    }

    private isCandidate(document: ReadingDocument): boolean {
        if (document.ReadingStatus === 'Pending') {
            return true;
        }
        if (document.ReadingStatus !== 'Running') {
            return false;
        }
        return document.ReadingClaimedAt == null || document.ReadingClaimedAt.getTime() < this.staleBefore().getTime();
    }

    private ownsClaim(document: ReadingDocument | null, claim: Claim): document is ReadingDocument {
        return document != null && document.ReadingClaimID != null && UUIDsEqual(document.ReadingClaimID, claim.ClaimID);
    }

    /** Renews the claim between model calls; false when the claim is no longer this worker's. */
    private renew(claim: Claim): Promise<boolean> {
        return this.options.Data.UnderDocumentLock(claim.Document.ID, async (scope) => {
            const current = await scope.Read();
            if (!this.ownsClaim(current, claim)) {
                return false;
            }
            await scope.Save({ ReadingClaimedAt: this.now() });
            return true;
        });
    }

    /** Records a reading that threw as `Failed`, only while the claim is still this worker's. */
    private async markFailed(claim: Claim): Promise<void> {
        try {
            await this.options.Data.UnderDocumentLock(claim.Document.ID, async (scope) => {
                const current = await scope.Read();
                if (!this.ownsClaim(current, claim)) {
                    return;
                }
                const note = current.ReadingAttempts >= this.options.Limits.MaxAttempts ? READING_FAILED_FINAL_NOTE : READING_FAILED_RETRY_NOTE;
                await scope.Save({ ReadingStatus: 'Failed', ReadingNote: note, ReadingClaimID: null, ReadingClaimedAt: null });
            });
        } catch (err: unknown) {
            LogError(`ReadingQueue: recording the failure of document ${claim.Document.ID} failed: ${errorText(err)}`);
        }
    }

    // ─── Work (outside any transaction) ────────────────────────────────────────

    private async work(claim: Claim): Promise<WorkOutcome> {
        const document = claim.Document;
        let text: RecognizedTextChange | null = null;
        let readText = document.ExtractedText;
        let calls = 0;
        if (document.TextStatus === 'Awaiting Recognition') {
            const recognized = await this.recognize(document);
            calls++;
            if (recognized.Kind !== 'Recognized') {
                return this.recognitionOutcome(document, recognized);
            }
            text = this.recognizedText(document, recognized);
            readText = recognized.Text;
        }
        if (readText == null) {
            return { Kind: 'Recognition', Text: null, Status: 'Not Applicable', Note: null };
        }
        const readings: StandardReading[] = [];
        for (const standard of await this.options.Data.StandardsToRead(document)) {
            if (calls > 0 && !(await this.renew(claim))) {
                return { Kind: 'Lost' };
            }
            calls++;
            readings.push(await this.read(document, readText, standard));
        }
        return { Kind: 'Read', Text: text, ReadText: readText, Readings: readings };
    }

    private async recognize(document: ReadingDocument): Promise<RecognitionResult> {
        const bytes = await this.options.Bytes(document.FileID);
        return this.options.Recognizer().Recognize({ Bytes: bytes, ContentType: document.ContentType, FileName: document.FileName }, this.options.ContextUser());
    }

    private recognitionOutcome(document: ReadingDocument, result: Exclude<RecognitionResult, { Kind: 'Recognized' }>): WorkOutcome {
        if (result.Kind === 'CouldNotRun') {
            return { Kind: 'Recognition', Text: null, Status: 'Could Not Run', Note: result.Reason };
        }
        const text: RecognizedTextChange = { ExtractedText: null, TextStatus: 'No Text Found', TextNote: NO_TEXT_FOUND_NOTE, PageCount: document.PageCount };
        return { Kind: 'Recognition', Text: text, Status: 'Not Applicable', Note: null };
    }

    private recognizedText(document: ReadingDocument, result: Extract<RecognitionResult, { Kind: 'Recognized' }>): RecognizedTextChange {
        return {
            ExtractedText: result.Text,
            TextStatus: 'Recognized',
            TextNote: result.Truncated ? RECOGNIZED_TEXT_NOTE + RECOGNIZED_TRUNCATED_NOTE : RECOGNIZED_TEXT_NOTE,
            PageCount: result.PageCount ?? document.PageCount,
        };
    }

    private async read(document: ReadingDocument, text: string, standard: StandardToRead): Promise<StandardReading> {
        const result = await this.options.Reader().Read(
            { Document: { ID: document.ID, FileName: document.FileName, Text: text }, Standard: standard.Standard },
            this.options.ContextUser(),
        );
        return { ApplicationID: standard.ApplicationID, StandardID: standard.Standard.ID, Result: result };
    }

    // ─── Commit ────────────────────────────────────────────────────────────────

    /**
     * One short transaction (subject lock, then document lock): discards everything when the claim is
     * no longer this worker's; otherwise writes the scan's text (once), supersedes and inserts the
     * extractions of applications still in Draft, and sets the final state. True when it wrote.
     */
    private async commit(claim: Claim, outcome: Exclude<WorkOutcome, { Kind: 'Lost' }>): Promise<boolean> {
        const document = claim.Document;
        await this.options.Seams.BeforeCommit?.(document.ID);
        return this.options.Data.Commit(document.SubjectID, document.ID, async (scope) => {
            const current = await scope.ReadDocument();
            if (!this.ownsClaim(current, claim)) {
                return false;
            }
            const plan = outcome.Kind === 'Read' ? await this.planReadings(scope, outcome) : this.planRecognition(outcome);
            await this.writePlan(scope, current, outcome.Text, plan);
            return true;
        });
    }

    private planRecognition(outcome: Extract<WorkOutcome, { Kind: 'Recognition' }>): CommitPlan {
        return { Status: outcome.Status, Note: outcome.Note, SupersedeStandardIDs: [], Inserts: [] };
    }

    /** Decides the writes from the readings of applications that are still `Draft`, re-read inside the locks. */
    private async planReadings(scope: ReadingCommitScope, outcome: Extract<WorkOutcome, { Kind: 'Read' }>): Promise<CommitPlan> {
        const applicationIDs = [...new Set(outcome.Readings.map((r) => r.ApplicationID.toLowerCase()))];
        const statuses = applicationIDs.length > 0 ? await scope.ApplicationStatuses(applicationIDs) : new Map<string, ApplicationStatus>();
        const kept = outcome.Readings.filter((r) => statuses.get(r.ApplicationID.toLowerCase()) === 'Draft');
        const plan: CommitPlan = { Status: 'Complete', Note: null, SupersedeStandardIDs: [], Inserts: [] };
        let discarded = 0;
        let couldNotRun: string | null = null;
        for (const reading of kept) {
            const result = reading.Result;
            if (result.Kind === 'CouldNotRun') {
                couldNotRun = couldNotRun ?? result.Reason;
                continue;
            }
            plan.SupersedeStandardIDs.push(reading.StandardID);
            if (result.Kind === 'Found') {
                const row = this.locatedExtraction(outcome.ReadText, reading.StandardID, result);
                if (row == null) discarded++;
                else plan.Inserts.push(row);
            }
        }
        plan.Status = couldNotRun != null ? 'Could Not Run' : 'Complete';
        plan.Note = couldNotRun ?? CompleteReadingNote(plan.Inserts.length, kept.length, discarded);
        return plan;
    }

    /** The extraction for a `Found` answer whose excerpt is verbatim in the text, or null (BR-15). */
    private locatedExtraction(text: string, standardID: string, result: Extract<ReadingResult, { Kind: 'Found' }>): NewExtraction | null {
        const span = ExcerptLocator.Locate(text, result.Excerpt);
        if ('Reason' in span) {
            return null;
        }
        return {
            EvidenceDocumentID: '',
            StandardID: standardID,
            Value: result.Value.trim().length > 0 ? result.Value : text.slice(span.Start, span.End),
            Excerpt: text.slice(span.Start, span.End),
            StartOffset: span.Start,
            EndOffset: span.End,
            PageReference: result.PageReference,
            HeadingPath: result.HeadingPath,
            Confidence: Math.min(1, Math.max(0, result.Confidence)),
            Reasoning: result.Reasoning.trim().length > 0 ? result.Reasoning : null,
            AIPromptRunID: result.PromptRunID,
        };
    }

    private async writePlan(scope: ReadingCommitScope, current: ReadingDocument, text: RecognizedTextChange | null, plan: CommitPlan): Promise<void> {
        const textToWrite = text != null && current.TextStatus === 'Awaiting Recognition' ? text : {};
        await scope.SaveDocument({ ...textToWrite, ReadingStatus: plan.Status, ReadingNote: plan.Note, ReadingClaimID: null, ReadingClaimedAt: null });
        if (plan.SupersedeStandardIDs.length > 0) {
            const documents = current.SupersedesDocumentID != null ? [current.ID, current.SupersedesDocumentID] : [current.ID];
            await scope.SupersedeExtractions(documents, plan.SupersedeStandardIDs);
        }
        for (const row of plan.Inserts) {
            await scope.InsertExtraction({ ...row, EvidenceDocumentID: current.ID });
        }
    }

    // ─── Sweep ─────────────────────────────────────────────────────────────────

    private async sweepSteps(atBoot: boolean): Promise<void> {
        const contributed = this.options.SweepSteps();
        for (const step of contributed.filter((s) => s.Phase === 'BeforeQueue')) {
            await this.step(step.Name, step.Run);
        }
        await this.step('requeue', () => this.requeue(atBoot));
        await this.step('orphan removal', async () => {
            await this.options.RemoveOrphans();
        });
        await this.step('drain', async () => {
            await this.DrainOnce();
        });
        for (const step of contributed.filter((s) => s.Phase === 'AfterQueue')) {
            await this.step(step.Name, step.Run);
        }
    }

    private async step(name: string, run: () => Promise<void>): Promise<void> {
        try {
            await run();
        } catch (err: unknown) {
            LogError(`ReadingQueue: the sweep step "${name}" failed: ${errorText(err)}`);
        }
    }

    /**
     * Sets back to `Pending` each `Failed` document with attempts left and, at boot only, each `Could
     * Not Run` document with its attempts reset (a model may have been configured since). Each is an
     * entity save under the document's lock after a re-read.
     */
    private async requeue(atBoot: boolean): Promise<void> {
        const limits = this.options.Limits;
        const ids = await this.options.Data.FindRequeueable(limits.MaxAttempts, atBoot, this.options.Seams.OnlySubjectIDs ?? null);
        for (const documentID of ids) {
            await this.options.Data.UnderDocumentLock(documentID, async (scope) => {
                const current = await scope.Read();
                if (current?.ReadingStatus === 'Failed' && current.ReadingAttempts < limits.MaxAttempts) {
                    await scope.Save({ ReadingStatus: 'Pending', ReadingNote: null });
                } else if (atBoot && current?.ReadingStatus === 'Could Not Run') {
                    await scope.Save({ ReadingStatus: 'Pending', ReadingNote: null, ReadingAttempts: 0 });
                }
            });
        }
    }
}
