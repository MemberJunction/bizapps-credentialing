import { beforeEach, describe, expect, it } from 'vitest';
import { NOT_FOUND_REASON } from '@mj-biz-apps/credentialing-core';
import {
    EvidenceIntake,
    EvidenceRefusal,
    type CurrentDocumentState,
    type EvidenceIntakeData,
    type EvidenceIntakeTransaction,
    type EvidenceUpload,
    type NewEvidenceRow,
} from '../evidence/EvidenceIntake.js';
import { CredentialingServices, type EvidenceStore, type ExtractedText, type TextExtractor } from '../services/CredentialingServices.js';

const SUBJECT = '0F0E0D0C-0000-4000-8000-000000000001';
const REQUIREMENT = '0F0E0D0C-0000-4000-8000-000000000002';
const PRIOR = '0F0E0D0C-0000-4000-8000-000000000003';
const USER = '0F0E0D0C-0000-4000-8000-000000000004';
const SUBMITTED_SENTENCE = 'This document is part of a submitted application and cannot be replaced until that review is finished.';

/** A store that records what it was asked to do. */
class RecordingStore implements EvidenceStore {
    public Puts: string[] = [];
    public Removed: string[] = [];

    public async Put(_bytes: Buffer, fileName: string): Promise<{ FileID: string }> {
        this.Puts.push(fileName);
        return { FileID: `file-${this.Puts.length}` };
    }

    public async Get(): Promise<Buffer> {
        return Buffer.alloc(0);
    }

    public async Remove(fileID: string): Promise<void> {
        this.Removed.push(fileID);
    }

    public async RemoveOrphans(): Promise<number> {
        return 0;
    }
}

/** A text extractor that answers one fixed result. */
class FixedText implements TextExtractor {
    public Calls = 0;

    public constructor(private readonly result: ExtractedText) {}

    public async Extract(): Promise<ExtractedText> {
        this.Calls++;
        return this.result;
    }
}

/** In-memory intake data: the state before the transaction and the state re-read inside it can differ. */
class FakeData implements EvidenceIntakeData {
    public Admitted = 0;
    public Superseded: string[] = [];
    public Inserted: NewEvidenceRow[] = [];

    public constructor(
        private readonly before: CurrentDocumentState,
        private readonly inside: CurrentDocumentState,
        private readonly admit: () => void = () => undefined,
    ) {}

    public async Admit(_upload: EvidenceUpload): Promise<void> {
        this.Admitted++;
        this.admit();
    }

    public async ReadCurrent(): Promise<CurrentDocumentState> {
        return this.before;
    }

    public async Commit(_subjectID: string, work: (tx: EvidenceIntakeTransaction) => Promise<string>): Promise<string> {
        const tx: EvidenceIntakeTransaction = {
            ReadCurrent: async () => this.inside,
            Supersede: async (id) => {
                this.Superseded.push(id);
            },
            Insert: async (row) => {
                this.Inserted.push(row);
                return 'new-document';
            },
        };
        return work(tx);
    }
}

const PDF_BYTES = Buffer.from('%PDF-1.4\nsample\n%%EOF\n', 'latin1');
const EXTRACTED: ExtractedText = { Status: 'Extracted', Text: 'sample', PageCount: 1, Note: null };
const DRAFT_PRIOR: CurrentDocumentState = { Current: { ID: PRIOR, Status: 'Current' }, FrozenBy: ['Draft'] };
const SUBMITTED_PRIOR: CurrentDocumentState = { Current: { ID: PRIOR, Status: 'Current' }, FrozenBy: ['Submitted'] };

function upload(overrides: Partial<EvidenceUpload> = {}): EvidenceUpload {
    return { SubjectID: SUBJECT, RequirementID: REQUIREMENT, FileName: 'policy.pdf', Bytes: PDF_BYTES, ...overrides };
}

async function refusalOf(work: Promise<unknown>): Promise<EvidenceRefusal> {
    try {
        await work;
    } catch (err: unknown) {
        if (err instanceof EvidenceRefusal) {
            return err;
        }
        throw err;
    }
    throw new Error('expected the upload to be refused');
}

describe('EvidenceIntake.Hash', () => {
    it('is the lowercase SHA-256 hex digest', () => {
        expect(EvidenceIntake.Hash(Buffer.from('abc', 'utf8'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
        expect(EvidenceIntake.Hash(Buffer.alloc(0))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });
});

describe('EvidenceIntake.AcceptWith', () => {
    let store: RecordingStore;
    let text: FixedText;
    let stored: string[];

    beforeEach(() => {
        store = new RecordingStore();
        text = new FixedText(EXTRACTED);
        stored = [];
        CredentialingServices.Register({ Store: store, Text: text, OnEvidenceStored: (id) => stored.push(id) });
        EvidenceIntake.Seams.AfterStore = undefined;
    });

    it('refuses a file the rules refuse before any read, extraction or store', async () => {
        const data = new FakeData(DRAFT_PRIOR, DRAFT_PRIOR);
        const refusal = await refusalOf(EvidenceIntake.AcceptWith(upload({ Bytes: Buffer.from('plain text', 'utf8') }), data, USER));
        expect(refusal.Kind).toBe('Invalid');
        expect(refusal.message).toBe('This file is not a valid PDF file.');
        expect(data.Admitted).toBe(0);
        expect(text.Calls).toBe(0);
        expect(store.Puts).toEqual([]);
    });

    it('refuses an empty file with its sentence', async () => {
        const refusal = await refusalOf(EvidenceIntake.AcceptWith(upload({ Bytes: Buffer.alloc(0) }), new FakeData(DRAFT_PRIOR, DRAFT_PRIOR), USER));
        expect(refusal.message).toBe('This file is empty.');
    });

    it('stores nothing when the caller is not admitted to the subject', async () => {
        const data = new FakeData(DRAFT_PRIOR, DRAFT_PRIOR, () => {
            throw new EvidenceRefusal('NotFound', NOT_FOUND_REASON);
        });
        const refusal = await refusalOf(EvidenceIntake.AcceptWith(upload(), data, USER));
        expect(refusal.Kind).toBe('NotFound');
        expect(store.Puts).toEqual([]);
    });

    it('refuses fast, before storing, when the current document is already frozen by a submission', async () => {
        const refusal = await refusalOf(EvidenceIntake.AcceptWith(upload(), new FakeData(SUBMITTED_PRIOR, SUBMITTED_PRIOR), USER));
        expect(refusal.Kind).toBe('Conflict');
        expect(refusal.message).toBe(SUBMITTED_SENTENCE);
        expect(store.Puts).toEqual([]);
    });

    it('removes the stored file when the decision inside the transaction refuses (a submission won the race)', async () => {
        const data = new FakeData(DRAFT_PRIOR, SUBMITTED_PRIOR);
        const refusal = await refusalOf(EvidenceIntake.AcceptWith(upload(), data, USER));
        expect(refusal.Kind).toBe('Conflict');
        expect(refusal.message).toBe(SUBMITTED_SENTENCE);
        expect(store.Puts).toEqual(['policy.pdf']);
        expect(store.Removed).toEqual(['file-1']);
        expect(data.Superseded).toEqual([]);
        expect(data.Inserted).toEqual([]);
        expect(stored).toEqual([]);
    });

    it('removes the stored file when the paused seam throws', async () => {
        EvidenceIntake.Seams.AfterStore = async () => {
            throw new Error('seam failure');
        };
        await expect(EvidenceIntake.AcceptWith(upload(), new FakeData(DRAFT_PRIOR, DRAFT_PRIOR), USER)).rejects.toThrow('seam failure');
        expect(store.Removed).toEqual(['file-1']);
    });

    it('supersedes the current document, names it, stores the hash and text, and nudges the reading queue', async () => {
        const data = new FakeData(DRAFT_PRIOR, DRAFT_PRIOR);
        const accepted = await EvidenceIntake.AcceptWith(upload({ FileName: 'folder/policy.pdf' }), data, USER);
        expect(accepted).toEqual({ EvidenceDocumentID: 'new-document', TextStatus: 'Extracted', TextNote: null });
        expect(data.Superseded).toEqual([PRIOR]);
        expect(data.Inserted).toHaveLength(1);
        const row = data.Inserted[0];
        expect(row.SupersedesDocumentID).toBe(PRIOR);
        expect(row.FileName).toBe('policy.pdf');
        expect(row.ContentType).toBe('application/pdf');
        expect(row.ContentHash).toBe(EvidenceIntake.Hash(PDF_BYTES));
        expect(row.SizeBytes).toBe(PDF_BYTES.length);
        expect(row.UploadedByUserID).toBe(USER);
        expect(store.Removed).toEqual([]);
        expect(stored).toEqual(['new-document']);
    });

    it('a general upload (no requirement) supersedes nothing', async () => {
        const data = new FakeData(SUBMITTED_PRIOR, SUBMITTED_PRIOR);
        await EvidenceIntake.AcceptWith(upload({ RequirementID: null }), data, USER);
        expect(data.Superseded).toEqual([]);
        expect(data.Inserted[0].SupersedesDocumentID).toBeNull();
    });

    it('starts reading for text and scans, and not for files with nothing to read', () => {
        expect(EvidenceIntake.ReadingStatusFor(EXTRACTED)).toBe('Pending');
        expect(EvidenceIntake.ReadingStatusFor({ Status: 'Awaiting Recognition', Text: null, PageCount: 1, Note: 'scan' })).toBe('Pending');
        expect(EvidenceIntake.ReadingStatusFor({ Status: 'Could Not Read', Text: null, PageCount: null, Note: 'x' })).toBe('Not Applicable');
        expect(EvidenceIntake.ReadingStatusFor({ Status: 'No Text Found', Text: null, PageCount: null, Note: 'x' })).toBe('Not Applicable');
    });
});
