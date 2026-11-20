import { createHash } from 'node:crypto';
import { LogError, RemoteOperationError, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { EvidenceFileRules, OPERATION_REFUSED, type ApplicationStatus } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingEvidenceDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import { LockedWrite } from '../guards/LockedWrite.js';
import { CredentialingServices, type ExtractedText } from '../services/CredentialingServices.js';
import { DatabaseEvidenceIntakeData } from './EvidenceIntakeData.js';

type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;

/** Bytes of a file's head the signature check reads. */
const SIGNATURE_BYTES = 8192;

/** Prefix of every evidence object name in storage (`StorageEvidenceStore`). */
export const EVIDENCE_OBJECT_PREFIX = 'credentialing-evidence/';

/** One upload, as the route received it. `SubjectID` and `RequirementID` are the caller's claims, checked here. */
export interface EvidenceUpload {
    SubjectID: string;
    RequirementID: string | null;
    FileName: string;
    Bytes: Buffer;
}

/** What an accepted upload answers. */
export interface AcceptedEvidence {
    EvidenceDocumentID: string;
    TextStatus: EvidenceDocumentEntity['TextStatus'];
    TextNote: string | null;
}

/** The current document of one requirement and the statuses of the applications that froze it. */
export interface CurrentDocumentState {
    Current: { ID: string; Status: EvidenceDocumentEntity['Status'] } | null;
    FrozenBy: ApplicationStatus[];
}

/** The row an accepted upload inserts. */
export interface NewEvidenceRow {
    SubjectID: string;
    RequirementID: string | null;
    SupersedesDocumentID: string | null;
    FileID: string;
    FileName: string;
    ContentType: string;
    SizeBytes: number;
    ContentHash: string;
    Text: ExtractedText;
    UploadedByUserID: string;
}

/** The writes of the upload's one transaction (step 5). */
export interface EvidenceIntakeTransaction {
    ReadCurrent(subjectID: string, requirementID: string): Promise<CurrentDocumentState>;
    Supersede(documentID: string): Promise<void>;
    Insert(row: NewEvidenceRow): Promise<string>;
}

/** The reads and the transaction the upload makes; {@link DatabaseEvidenceIntakeData} is the server's. */
export interface EvidenceIntakeData {
    /** Step 2: refuses as not found unless the caller is a contact of the subject and the requirement is the subject's. */
    Admit(upload: EvidenceUpload): Promise<void>;
    /** Step 3: the current document of the requirement and what froze it (a fast first look). */
    ReadCurrent(subjectID: string, requirementID: string): Promise<CurrentDocumentState>;
    /** Step 5: one transaction holding the subject's lock. */
    Commit(subjectID: string, work: (tx: EvidenceIntakeTransaction) => Promise<string>): Promise<string>;
}

/** How a refusal of an upload is answered: a file the rules refuse, a record the caller cannot reach, or a state that forbids it. */
export type EvidenceRefusalKind = 'Invalid' | 'NotFound' | 'Conflict';

/** A refused upload; `Kind` tells the route which HTTP status answers it. */
export class EvidenceRefusal extends RemoteOperationError {
    public readonly Kind: EvidenceRefusalKind;

    public constructor(kind: EvidenceRefusalKind, message: string) {
        super(OPERATION_REFUSED, message);
        this.Kind = kind;
    }
}

/** The test seam of {@link EvidenceIntake}. */
export interface EvidenceIntakeSeams {
    /** Awaited between `Store.Put` and the transaction (a check pauses here to race a submission). */
    AfterStore?: () => Promise<void>;
}

/**
 * The upload of one evidence file (FRD FR-5.7, NFR-1.5), independent of HTTP:
 *
 * 1. `EvidenceFileRules.Validate` (size, type, signature) before any database call;
 * 2. the subject as the caller, who must act for it as `Applicant` (staff never upload into an
 *    applicant's record, FR-5.9), and the requirement, when given, through `SubjectAccess`;
 * 3. a first `CanSupersede` on the requirement's current document: a fast refusal only;
 * 4. hash, text extraction, `Store.Put`, then `Seams.AfterStore`;
 * 5. one transaction under the subject's lock that re-reads the current document and the
 *    applications that froze it and decides `CanSupersede` again — the check that counts, because
 *    `SubmitApplication` takes the same lock — then supersedes the prior document and inserts the new one;
 * 6. any failure after `Put` removes the stored object again; after commit, the reading queue is nudged.
 *
 * A general upload (no requirement) supersedes nothing.
 */
export class EvidenceIntake {
    public static readonly Seams: EvidenceIntakeSeams = {};

    /** The SHA-256 digest of `bytes`, lowercase hex. */
    public static Hash(bytes: Buffer): string {
        return createHash('sha256').update(bytes).digest('hex');
    }

    /** Accepts one upload as `user`, reading and writing through `provider` (one per request). */
    public static async Accept(upload: EvidenceUpload, provider: IMetadataProvider, user: UserInfo): Promise<AcceptedEvidence> {
        return EvidenceIntake.AcceptWith(upload, new DatabaseEvidenceIntakeData(provider, user), user.ID);
    }

    /** {@link Accept} over any {@link EvidenceIntakeData} (the unit tests give an in-memory one). */
    public static async AcceptWith(upload: EvidenceUpload, data: EvidenceIntakeData, userID: string): Promise<AcceptedEvidence> {
        const fileName = EvidenceFileRules.SanitizeName(upload.FileName);
        const kind = EvidenceIntake.validate(fileName, upload.Bytes);
        await data.Admit(upload);
        if (upload.RequirementID != null) {
            EvidenceIntake.requireSupersedable(await data.ReadCurrent(upload.SubjectID, upload.RequirementID));
        }
        const contentType = EvidenceFileRules.ContentTypeFor(fileName) ?? 'application/octet-stream';
        const contentHash = EvidenceIntake.Hash(upload.Bytes);
        const text = await CredentialingServices.Text.Extract(kind, upload.Bytes);
        const { FileID } = await CredentialingServices.Store.Put(upload.Bytes, fileName, contentType);
        let documentID: string;
        try {
            await EvidenceIntake.Seams.AfterStore?.();
            documentID = await data.Commit(upload.SubjectID, (tx) =>
                EvidenceIntake.write(tx, {
                    SubjectID: upload.SubjectID,
                    RequirementID: upload.RequirementID,
                    SupersedesDocumentID: null,
                    FileID,
                    FileName: fileName,
                    ContentType: contentType,
                    SizeBytes: upload.Bytes.length,
                    ContentHash: contentHash,
                    Text: text,
                    UploadedByUserID: userID,
                }),
            );
        } catch (err: unknown) {
            await EvidenceIntake.removeQuietly(FileID);
            throw err;
        }
        CredentialingServices.NotifyEvidenceStored(documentID);
        return { EvidenceDocumentID: documentID, TextStatus: text.Status, TextNote: text.Note };
    }

    /** The reading state a new document starts in: read when it has text or will have it, otherwise nothing to read. */
    public static ReadingStatusFor(text: ExtractedText): EvidenceDocumentEntity['ReadingStatus'] {
        return text.Status === 'No Text Found' || text.Status === 'Could Not Read' ? 'Not Applicable' : 'Pending';
    }

    /** Step 1; returns the parser kind, or refuses with the rule's sentence. */
    private static validate(fileName: string, bytes: Buffer): NonNullable<ReturnType<typeof EvidenceFileRules.Validate>['Kind']> {
        const rule = EvidenceFileRules.Validate({ FileName: fileName, SizeBytes: bytes.length, FirstBytes: bytes.subarray(0, SIGNATURE_BYTES) });
        const reason = LockedWrite.ReasonOf(rule);
        if (reason != null) {
            throw new EvidenceRefusal('Invalid', reason);
        }
        if (rule.Kind == null) {
            throw new EvidenceRefusal('Invalid', 'This file type cannot be read.');
        }
        return rule.Kind;
    }

    /** Refuses when the current document is frozen by a live application past Draft. */
    private static requireSupersedable(state: CurrentDocumentState): void {
        const reason = LockedWrite.ReasonOf(EvidenceFileRules.CanSupersede(state.Current, state.FrozenBy));
        if (reason != null) {
            throw new EvidenceRefusal('Conflict', reason);
        }
    }

    /** Step 5, inside the transaction: re-read, decide again, supersede, insert. */
    private static async write(tx: EvidenceIntakeTransaction, row: NewEvidenceRow): Promise<string> {
        let supersedes: string | null = null;
        if (row.RequirementID != null) {
            const state = await tx.ReadCurrent(row.SubjectID, row.RequirementID);
            EvidenceIntake.requireSupersedable(state);
            if (state.Current != null) {
                await tx.Supersede(state.Current.ID);
                supersedes = state.Current.ID;
            }
        }
        return tx.Insert({ ...row, SupersedesDocumentID: supersedes });
    }

    /** Removes a stored object after a failed upload; a failure to remove is logged (the orphan sweep collects it). */
    private static async removeQuietly(fileID: string): Promise<void> {
        try {
            await CredentialingServices.Store.Remove(fileID);
        } catch (err: unknown) {
            LogError(`EvidenceIntake: removing file ${fileID} after a failed upload failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
}
