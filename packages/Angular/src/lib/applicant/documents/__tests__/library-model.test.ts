import { describe, expect, it } from 'vitest';
import type { LedgerRow, LibraryDocument } from '@mj-biz-apps/credentialing-core';
import type { DocumentLibrary } from '@mj-biz-apps/credentialing-core';
import {
    CanReadAgain,
    DefaultAttestationStatement,
    LibraryNeedsPolling,
    READING_IN_PROGRESS_SENTENCE,
    DocumentRowStatusLabel,
    FormatAttestedNotice,
    FormatHashShort,
    FormatWhatWasRead,
    ResolveLedgerRowActions,
} from '../library-model';

function makeDoc(overrides: Partial<LibraryDocument> = {}): LibraryDocument {
    return {
        EvidenceDocumentID: 'D1111111-1111-1111-1111-111111111111',
        FileName: 'safety-policy.pdf',
        ContentType: 'application/pdf',
        UploadedAt: '2026-11-17T12:00:00.000Z',
        UploadedByName: 'Applicant Evidence',
        Status: 'Current',
        ContentHash: 'a'.repeat(64),
        TextStatus: 'Extracted',
        TextNote: null,
        ReadingStatus: 'Pending',
        ReadingNote: null,
        CitationCount: 0,
        Versions: [
            {
                EvidenceDocumentID: 'D1111111-1111-1111-1111-111111111111',
                UploadedAt: '2026-11-17T12:00:00.000Z',
                UploadedByName: 'Applicant Evidence',
                ContentHash: 'a'.repeat(64),
                OrderIsRecorded: true,
            },
        ],
        ...overrides,
    };
}

function makeRow(overrides: Partial<LedgerRow> = {}): LedgerRow {
    return {
        RequirementID: 'R1111111-1111-1111-1111-111111111111',
        Name: 'Written safety policy',
        Description: 'Current annual safety policy.',
        IsRequired: true,
        RestrictedAllowed: false,
        Document: null,
        Attestation: null,
        Locked: false,
        LockedReason: null,
        ...overrides,
    };
}

describe('library-model', () => {
    describe('ResolveLedgerRowActions', () => {
        it('offers Upload only for an empty Normal requirement when unlocked for an applicant', () => {
            const actions = ResolveLedgerRowActions(makeRow(), true);
            expect(actions.ShowUpload).toBe(true);
            expect(actions.ShowUploadNew).toBe(false);
            expect(actions.ShowStillCurrent).toBe(false);
            expect(actions.ShowVersions).toBe(false);
            expect(actions.ShowDownloadOriginal).toBe(false);
            expect(actions.ShowView).toBe(false);
            expect(actions.ShowAttest).toBe(false);
        });

        it('offers Upload and Attest instead of uploading for an empty Restricted Allowed requirement', () => {
            const actions = ResolveLedgerRowActions(makeRow({ RestrictedAllowed: true }), true);
            expect(actions.ShowUpload).toBe(true);
            expect(actions.ShowAttest).toBe(true);
            expect(actions.AttestLabel).toBe('Attest instead of uploading');
        });

        it('offers Upload new, Versions, Download original, and View for a Current document (no Still current)', () => {
            const actions = ResolveLedgerRowActions(makeRow({ Document: makeDoc({ Status: 'Current' }) }), true);
            expect(actions.ShowUpload).toBe(false);
            expect(actions.ShowUploadNew).toBe(true);
            expect(actions.ShowStillCurrent).toBe(false);
            expect(actions.ShowVersions).toBe(true);
            expect(actions.ShowDownloadOriginal).toBe(true);
            expect(actions.ShowView).toBe(true);
            expect(actions.ShowAttest).toBe(false);
        });

        it('offers Still current only when document Status is Confirm Current and unlocked', () => {
            const actions = ResolveLedgerRowActions(makeRow({ Document: makeDoc({ Status: 'Confirm Current' }) }), true);
            expect(actions.ShowStillCurrent).toBe(true);
            expect(actions.ShowUploadNew).toBe(true);
        });

        it('hides upload, still-current, and attest actions when the row is locked by a submitted application', () => {
            const lockedSentence = 'This document is part of a submitted application and cannot be replaced until that review is finished.';
            const actions = ResolveLedgerRowActions(
                makeRow({
                    Document: makeDoc({ Status: 'Confirm Current' }),
                    Locked: true,
                    LockedReason: lockedSentence,
                }),
                true,
            );
            expect(actions.Locked).toBe(true);
            expect(actions.LockedReason).toBe(lockedSentence);
            expect(actions.ShowUpload).toBe(false);
            expect(actions.ShowUploadNew).toBe(false);
            expect(actions.ShowStillCurrent).toBe(false);
            expect(actions.ShowAttest).toBe(false);
            expect(actions.ShowView).toBe(true);
            expect(actions.ShowVersions).toBe(true);
            expect(actions.ShowDownloadOriginal).toBe(true);
        });

        it('offers read-only actions only when viewed by staff (not an applicant)', () => {
            const actions = ResolveLedgerRowActions(
                makeRow({ RestrictedAllowed: true, Document: makeDoc({ Status: 'Confirm Current' }) }),
                false,
            );
            expect(actions.ShowUpload).toBe(false);
            expect(actions.ShowUploadNew).toBe(false);
            expect(actions.ShowStillCurrent).toBe(false);
            expect(actions.ShowAttest).toBe(false);
            expect(actions.ShowView).toBe(true);
            expect(actions.ShowVersions).toBe(true);
            expect(actions.ShowDownloadOriginal).toBe(true);
        });

        it('offers Upload and Update attestation on an unlocked attested row', () => {
            const actions = ResolveLedgerRowActions(
                makeRow({
                    RestrictedAllowed: true,
                    Attestation: {
                        Statement: 'Held on file.',
                        AttestedAt: '2026-11-17T12:00:00.000Z',
                        AttestedByName: 'Applicant Evidence',
                    },
                }),
                true,
            );
            expect(actions.ShowUpload).toBe(true);
            expect(actions.ShowAttest).toBe(true);
            expect(actions.AttestLabel).toBe('Update attestation');
            expect(actions.ShowView).toBe(false);
        });
    });

    describe('Read again and polling', () => {
        it('offers Read again to the applicant only on Could Not Run or Failed, locked or not', () => {
            for (const status of ['Could Not Run', 'Failed'] as const) {
                expect(ResolveLedgerRowActions(makeRow({ Document: makeDoc({ ReadingStatus: status }) }), true).ShowReadAgain).toBe(true);
                expect(ResolveLedgerRowActions(makeRow({ Locked: true, LockedReason: 'Locked.', Document: makeDoc({ ReadingStatus: status }) }), true).ShowReadAgain).toBe(true);
                expect(ResolveLedgerRowActions(makeRow({ Document: makeDoc({ ReadingStatus: status }) }), false).ShowReadAgain).toBe(false);
            }
            for (const status of ['Pending', 'Running', 'Complete', 'Not Applicable'] as const) {
                expect(CanReadAgain({ ReadingStatus: status })).toBe(false);
                expect(ResolveLedgerRowActions(makeRow({ Document: makeDoc({ ReadingStatus: status }) }), true).ShowReadAgain).toBe(false);
            }
            expect(ResolveLedgerRowActions(makeRow(), true).ShowReadAgain).toBe(false);
        });

        it('polls while any ledger or general document is Pending or Running, and stops otherwise', () => {
            const library = (ledgerStatus: LibraryDocument['ReadingStatus'] | null, general: LibraryDocument['ReadingStatus'][]): DocumentLibrary => ({
                Ledgers: [
                    {
                        ProgramName: 'P',
                        VersionLabel: '1',
                        ApplicationID: 'A',
                        ApplicationStatus: 'Draft',
                        Rows: [makeRow({ Document: ledgerStatus == null ? null : makeDoc({ ReadingStatus: ledgerStatus }) })],
                    },
                ],
                General: general.map((s) => makeDoc({ ReadingStatus: s })),
            });
            expect(LibraryNeedsPolling(null)).toBe(false);
            expect(LibraryNeedsPolling(library('Pending', []))).toBe(true);
            expect(LibraryNeedsPolling(library('Complete', ['Running']))).toBe(true);
            expect(LibraryNeedsPolling(library('Complete', ['Failed', 'Could Not Run', 'Not Applicable']))).toBe(false);
            expect(LibraryNeedsPolling(library(null, []))).toBe(false);
        });
    });

    describe('FormatWhatWasRead', () => {
        it('shows citation count when ReadingStatus is Complete with citations', () => {
            expect(FormatWhatWasRead(makeDoc({ ReadingStatus: 'Complete', CitationCount: 3 }))).toBe('3 passages cited');
            expect(FormatWhatWasRead(makeDoc({ ReadingStatus: 'Complete', CitationCount: 1 }))).toBe('1 passage cited');
        });

        it('shows the reading note when ReadingStatus is Complete with zero citations', () => {
            expect(
                FormatWhatWasRead(makeDoc({ ReadingStatus: 'Complete', CitationCount: 0, ReadingNote: 'No matching passages found.' })),
            ).toBe('No matching passages found.');
        });

        it('shows the scan note when TextStatus is Awaiting Recognition and ReadingStatus is Pending', () => {
            const scanNote = 'This is a scan. The assistant is reading it; this can take a few minutes.';
            expect(
                FormatWhatWasRead(makeDoc({ TextStatus: 'Awaiting Recognition', TextNote: scanNote, ReadingStatus: 'Pending' })),
            ).toBe(scanNote);
        });

        it('shows Reading… for Pending and Running extracted text', () => {
            expect(FormatWhatWasRead(makeDoc({ TextStatus: 'Extracted', ReadingStatus: 'Pending' }))).toBe(READING_IN_PROGRESS_SENTENCE);
            expect(FormatWhatWasRead(makeDoc({ TextStatus: 'Extracted', ReadingStatus: 'Running' }))).toBe('Reading…');
        });

        it('shows the final sentence of a completed reading with no citations yet', () => {
            expect(FormatWhatWasRead(makeDoc({ ReadingStatus: 'Complete', CitationCount: 0, ReadingNote: '2 passages found for 2 standards.' }))).toBe(
                '2 passages found for 2 standards.',
            );
        });

        it('shows TextNote when ReadingStatus is Not Applicable', () => {
            const note = 'This file could not be opened. It is stored, but nothing can be drafted from it.';
            expect(
                FormatWhatWasRead(makeDoc({ TextStatus: 'Could Not Read', TextNote: note, ReadingStatus: 'Not Applicable' })),
            ).toBe(note);
        });

        it('shows the reading note for Could Not Run or Failed', () => {
            expect(
                FormatWhatWasRead(makeDoc({ ReadingStatus: 'Could Not Run', ReadingNote: 'No reading model is configured.' })),
            ).toBe('No reading model is configured.');
            expect(
                FormatWhatWasRead(makeDoc({ ReadingStatus: 'Failed', ReadingNote: 'The assistant could not read this document.' })),
            ).toBe('The assistant could not read this document.');
        });
    });

    describe('attestation and hash formatting', () => {
        it('builds the default attestation statement naming the requirement', () => {
            expect(DefaultAttestationStatement('Confidential board minutes')).toBe(
                'I attest that Confidential board minutes exists and is maintained, and can be shown to a reviewer on request.',
            );
        });

        it('formats the attested row sentence', () => {
            const notice = FormatAttestedNotice({
                Statement: 'Kept offline.',
                AttestedAt: '2026-11-17T12:00:00.000Z',
                AttestedByName: 'Applicant Evidence',
            });
            expect(notice).toMatch(/^Attested by Applicant Evidence on .+\. No file is stored\.$/);
        });

        it('shortens a SHA-256 hash to 12 characters', () => {
            const hash = '0123456789abcdef'.repeat(4);
            expect(FormatHashShort(hash)).toBe('0123456789ab');
        });

        it('formats row status labels', () => {
            expect(DocumentRowStatusLabel(makeRow())).toBe('Not uploaded');
            expect(DocumentRowStatusLabel(makeRow({ Document: makeDoc({ Status: 'Confirm Current' }) }))).toBe('Confirm Current');
            expect(
                DocumentRowStatusLabel(
                    makeRow({
                        RestrictedAllowed: true,
                        Attestation: { Statement: 'Ok', AttestedAt: '2026-11-17T12:00:00.000Z', AttestedByName: 'A' },
                    }),
                ),
            ).toBe('Attested');
        });
    });
});
