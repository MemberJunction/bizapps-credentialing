import type { ApplicationStatus } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingEvidenceDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import type { ReadingRequest } from '../services/CredentialingServices.js';

type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;

/** A document's reading state. */
export type DocumentReadingStatus = EvidenceDocumentEntity['ReadingStatus'];

/** A document's text state. */
export type DocumentTextStatus = EvidenceDocumentEntity['TextStatus'];

/** The columns of an evidence document the reading queue reads. */
export interface ReadingDocument {
    ID: string;
    SubjectID: string;
    DocumentRequirementID: string | null;
    SupersedesDocumentID: string | null;
    FileID: string;
    FileName: string;
    ContentType: string;
    SizeBytes: number;
    PageCount: number | null;
    ExtractedText: string | null;
    TextStatus: DocumentTextStatus;
    TextNote: string | null;
    ReadingStatus: DocumentReadingStatus;
    ReadingNote: string | null;
    ReadingClaimID: string | null;
    ReadingClaimedAt: Date | null;
    ReadingAttempts: number;
}

/** The queue's own columns of a document: the reading state and the claim. */
export interface ReadingStateChange {
    ReadingStatus?: DocumentReadingStatus;
    ReadingNote?: string | null;
    ReadingClaimID?: string | null;
    ReadingClaimedAt?: Date | null;
    ReadingAttempts?: number;
}

/** The text of a scan, written once by the queue when recognition answered. */
export interface RecognizedTextChange {
    ExtractedText: string | null;
    TextStatus: DocumentTextStatus;
    TextNote: string | null;
    PageCount: number | null;
}

/** One standard to read a document for, and the Draft application of the subject that holds it. */
export interface StandardToRead {
    ApplicationID: string;
    Standard: ReadingRequest['Standard'];
}

/** One extraction the commit inserts. */
export interface NewExtraction {
    EvidenceDocumentID: string;
    StandardID: string;
    Value: string;
    Excerpt: string;
    StartOffset: number;
    EndOffset: number;
    PageReference: string | null;
    HeadingPath: string | null;
    Confidence: number;
    Reasoning: string | null;
    AIPromptRunID: string | null;
}

/** What a short transaction under one document's lock may do. */
export interface DocumentLockScope {
    /** Re-reads the document inside the lock; null when it no longer exists. */
    Read(): Promise<ReadingDocument | null>;
    /** Saves the queue's columns of the document. */
    Save(change: ReadingStateChange): Promise<void>;
}

/** What the commit transaction (subject lock, then document lock) may do. */
export interface ReadingCommitScope {
    /** Re-reads the document inside the locks; null when it no longer exists. */
    ReadDocument(): Promise<ReadingDocument | null>;
    /** The current status of each application, keyed by lower-case ID. */
    ApplicationStatuses(applicationIDs: readonly string[]): Promise<Map<string, ApplicationStatus>>;
    /** Saves the queue's columns of the document and, once, the recognized text of a scan. */
    SaveDocument(change: ReadingStateChange & Partial<RecognizedTextChange>): Promise<void>;
    /** Marks superseded every current extraction of the documents for the standards; returns how many. */
    SupersedeExtractions(documentIDs: readonly string[], standardIDs: readonly string[]): Promise<number>;
    /** Inserts one extraction. */
    InsertExtraction(row: NewExtraction): Promise<void>;
}

/**
 * Everything the reading queue reads and writes. {@link DatabaseReadingData} is the server's: each
 * unit of work on a fresh isolated provider, every write an entity save under an application lock
 * after a re-read, as the system user (a background worker has no caller). Unit tests give an
 * in-memory implementation.
 */
export interface ReadingData {
    /**
     * IDs of the documents a claim may take: `Pending`, or `Running` with a claim taken before
     * `staleBefore` (or none). `subjectIDs` narrows the search to those subjects when given.
     */
    FindCandidates(staleBefore: Date, subjectIDs: readonly string[] | null): Promise<string[]>;
    /**
     * IDs of the documents the sweep may set back to `Pending`: `Failed` with fewer than `maxAttempts`
     * attempts and, when `includeCouldNotRun`, every `Could Not Run`.
     */
    FindRequeueable(maxAttempts: number, includeCouldNotRun: boolean, subjectIDs: readonly string[] | null): Promise<string[]>;
    /**
     * The subjects that hold a `Draft` application and a document whose reading finished (`Complete`
     * or `Failed`, which still commits what it found) at or after `since`: the boot-time pass that
     * re-runs the reading-committed hook a crash may have skipped.
     */
    FindRecentlyReadSubjects(since: Date, subjectIDs: readonly string[] | null): Promise<string[]>;
    /** Runs `work` in one short transaction holding the document's lock. */
    UnderDocumentLock<T>(documentID: string, work: (scope: DocumentLockScope) => Promise<T>): Promise<T>;
    /**
     * The standards to read the document for: those of the versions the subject holds a `Draft`
     * application on that have a `Document Extraction` source naming the document's requirement.
     */
    StandardsToRead(document: ReadingDocument): Promise<StandardToRead[]>;
    /** Runs `work` in one transaction holding the subject's lock, then the document's. */
    Commit<T>(subjectID: string, documentID: string, work: (scope: ReadingCommitScope) => Promise<T>): Promise<T>;
}
