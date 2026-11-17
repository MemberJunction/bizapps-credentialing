/**
 * Pure view-model helpers for the Applicant Document Library (FRD FR-5.1, 5.3, 5.5, 5.6).
 *
 * Keeps row action availability, "What the assistant read" wording, attestation copy, and hash
 * formatting independent of Angular templates so every rule is unit-tested without a DOM.
 */
import type {
    DocumentLibrary,
    LedgerRow,
    LibraryAttestation,
    LibraryDocument,
} from '@mj-biz-apps/credentialing-core';

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

/** What a document waiting for, or in, the assistant's reading shows (FR-5.4). */
export const READING_IN_PROGRESS_SENTENCE = 'Reading…';

/** How often the library reloads while any document is waiting for or in the assistant's reading. */
export const LIBRARY_POLL_MS = 5000;

/** Copy shown in every upload dropzone so applicants know uploading does not submit anything. */
export const UPLOAD_DOES_NOT_SUBMIT_SENTENCE = 'Uploading does not submit anything.';

/** Computed visibility and labels for the actions on one requirement ledger row. */
export interface LedgerRowActions {
    Locked: boolean;
    LockedReason: string | null;
    ShowUpload: boolean;
    ShowUploadNew: boolean;
    ShowStillCurrent: boolean;
    ShowView: boolean;
    ShowVersions: boolean;
    ShowDownloadOriginal: boolean;
    ShowAttest: boolean;
    AttestLabel: 'Attest instead of uploading' | 'Update attestation';
    /** `Read again`, on a document the assistant could not read (`Could Not Run` or `Failed`). */
    ShowReadAgain: boolean;
}

/** Formats an ISO timestamp for display in the Document Library and version history. */
export function FormatLibraryDate(iso: string | null | undefined): string {
    if (!iso) return '—';
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? iso : DATE_FORMAT.format(parsed);
}

/** First 12 characters of a SHA-256 content hash for compact display (full hash shown on focus). */
export function FormatHashShort(hash: string): string {
    return (hash ?? '').slice(0, 12);
}

/** Default statement offered when attesting in lieu of uploading a restricted document. */
export function DefaultAttestationStatement(requirementName: string): string {
    return `I attest that ${requirementName} exists and is maintained, and can be shown to a reviewer on request.`;
}

/** Visible summary shown on a requirement row satisfied by an attestation in lieu of upload. */
export function FormatAttestedNotice(attestation: LibraryAttestation): string {
    return `Attested by ${attestation.AttestedByName} on ${FormatLibraryDate(attestation.AttestedAt)}. No file is stored.`;
}

/** Human-readable status label for a ledger row. */
export function DocumentRowStatusLabel(row: Pick<LedgerRow, 'Document' | 'Attestation'>): string {
    if (row.Document != null) {
        return row.Document.Status;
    }
    if (row.Attestation != null) {
        return 'Attested';
    }
    return 'Not uploaded';
}

/**
 * Plain-language summary for the "What the assistant read" column across every `ReadingStatus` and
 * `TextStatus` in the schema.
 */
export function FormatWhatWasRead(
    doc: Pick<LibraryDocument, 'TextStatus' | 'TextNote' | 'ReadingStatus' | 'ReadingNote' | 'CitationCount'>,
): string {
    switch (doc.ReadingStatus) {
        case 'Complete': {
            if (doc.CitationCount > 0) {
                return `${doc.CitationCount} ${doc.CitationCount === 1 ? 'passage' : 'passages'} cited`;
            }
            return doc.ReadingNote?.trim() || '0 passages cited';
        }
        case 'Pending':
            if (doc.TextStatus === 'Awaiting Recognition') {
                return doc.TextNote?.trim() || 'This is a scan. The assistant is reading it; this can take a few minutes.';
            }
            return doc.ReadingNote?.trim() || READING_IN_PROGRESS_SENTENCE;
        case 'Running':
            if (doc.TextStatus === 'Awaiting Recognition') {
                return doc.TextNote?.trim() || 'This is a scan. The assistant is reading it; this can take a few minutes.';
            }
            return doc.ReadingNote?.trim() || READING_IN_PROGRESS_SENTENCE;
        case 'Not Applicable':
            return doc.TextNote?.trim() || doc.ReadingNote?.trim() || 'This document cannot be read by the assistant.';
        case 'Could Not Run':
        case 'Failed':
            return doc.ReadingNote?.trim() || doc.TextNote?.trim() || 'The assistant could not read this document.';
        default:
            return doc.ReadingNote?.trim() || doc.TextNote?.trim() || '—';
    }
}

/** Whether `Read again` applies: the assistant could not read the document (not the same as an unreadable scan). */
export function CanReadAgain(doc: Pick<LibraryDocument, 'ReadingStatus'>): boolean {
    return doc.ReadingStatus === 'Could Not Run' || doc.ReadingStatus === 'Failed';
}

/** Whether a document is waiting for, or in, the assistant's reading. */
export function IsReadingInProgress(doc: Pick<LibraryDocument, 'ReadingStatus'>): boolean {
    return doc.ReadingStatus === 'Pending' || doc.ReadingStatus === 'Running';
}

/** Whether the library must keep reloading: any current document (ledger or general) is still being read. */
export function LibraryNeedsPolling(library: DocumentLibrary | null): boolean {
    if (library == null) return false;
    const ledgerDocs = library.Ledgers.flatMap((l) => l.Rows.map((r) => r.Document));
    return [...ledgerDocs, ...library.General].some((doc) => doc != null && IsReadingInProgress(doc));
}

/**
 * Resolves which actions a requirement ledger row offers given its document/attestation state,
 * sensitivity policy, lock state, and whether the viewer is an applicant (`true`) or staff (`false`).
 * `Read again` is offered to the applicant on a `Could Not Run` or `Failed` document, locked or not:
 * it changes only the reading's own state (the queue never moves a submitted application's evidence).
 */
export function ResolveLedgerRowActions(row: LedgerRow, isApplicant: boolean): LedgerRowActions {
    const hasDoc = row.Document != null;
    const hasAttestation = !hasDoc && row.Attestation != null;
    const unlockedApplicant = isApplicant && !row.Locked;

    return {
        Locked: row.Locked,
        LockedReason: row.Locked ? row.LockedReason : null,
        ShowUpload: unlockedApplicant && !hasDoc,
        ShowUploadNew: unlockedApplicant && hasDoc,
        ShowStillCurrent: unlockedApplicant && row.Document?.Status === 'Confirm Current',
        ShowView: hasDoc,
        ShowVersions: hasDoc,
        ShowDownloadOriginal: hasDoc,
        ShowAttest: unlockedApplicant && !hasDoc && row.RestrictedAllowed,
        AttestLabel: hasAttestation ? 'Update attestation' : 'Attest instead of uploading',
        ShowReadAgain: isApplicant && row.Document != null && CanReadAgain(row.Document),
    };
}
