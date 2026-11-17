/**
 * Pure view-model helpers for the Applicant Document Library (FRD FR-5.1, 5.3, 5.5, 5.6).
 *
 * Keeps row action availability, "What the assistant read" wording, attestation copy, and hash
 * formatting independent of Angular templates so every rule is unit-tested without a DOM.
 */
import type {
    LedgerRow,
    LibraryAttestation,
    LibraryDocument,
} from '@mj-biz-apps/credentialing-core';

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

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
            return doc.ReadingNote?.trim() || 'Waiting for the assistant to read this document.';
        case 'Running':
            if (doc.TextStatus === 'Awaiting Recognition') {
                return doc.TextNote?.trim() || 'This is a scan. The assistant is reading it; this can take a few minutes.';
            }
            return doc.ReadingNote?.trim() || 'Reading document...';
        case 'Not Applicable':
            return doc.TextNote?.trim() || doc.ReadingNote?.trim() || 'This document cannot be read by the assistant.';
        case 'Could Not Run':
        case 'Failed':
            return doc.ReadingNote?.trim() || doc.TextNote?.trim() || 'The assistant could not read this document.';
        default:
            return doc.ReadingNote?.trim() || doc.TextNote?.trim() || '—';
    }
}

/**
 * Resolves which actions a requirement ledger row offers given its document/attestation state,
 * sensitivity policy, lock state, and whether the viewer is an applicant (`true`) or staff (`false`).
 * (`Read again` for `Could Not Run`/`Failed` is wired in Task 9 when `RequeueReading` lands.)
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
    };
}
