import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { mjBizAppsCredentialingEvidenceDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import type { ApplicationStatus } from '../rules/ApplicationLifecycleRules.js';
import { CredentialingOperation } from './OperationKeys.js';

/** Input identifying the subject whose document library is requested. */
export interface GetDocumentLibraryInput {
    SubjectID: string;
}

/** One entry in an evidence document's version chain. */
export interface DocumentVersionInfo {
    EvidenceDocumentID: string;
    UploadedAt: string;
    UploadedByName: string;
    ContentHash: string;
    OrderIsRecorded: boolean;
}

/** One evidence document shown in a requirement ledger or in General uploads. */
export interface LibraryDocument {
    EvidenceDocumentID: string;
    FileName: string;
    ContentType: string;
    UploadedAt: string;
    UploadedByName: string;
    Status: mjBizAppsCredentialingEvidenceDocumentEntity['Status'];
    ContentHash: string;
    TextStatus: mjBizAppsCredentialingEvidenceDocumentEntity['TextStatus'];
    TextNote: string | null;
    ReadingStatus: mjBizAppsCredentialingEvidenceDocumentEntity['ReadingStatus'];
    ReadingNote: string | null;
    CitationCount: number;
    Versions: DocumentVersionInfo[];
}

/** Current attestation in lieu of uploading a restricted document. */
export interface LibraryAttestation {
    Statement: string;
    AttestedAt: string;
    AttestedByName: string;
}

/** One requirement row inside an application's document ledger. */
export interface LedgerRow {
    RequirementID: string;
    Name: string;
    Description: string | null;
    IsRequired: boolean;
    RestrictedAllowed: boolean;
    Document: LibraryDocument | null;
    Attestation: LibraryAttestation | null;
    Locked: boolean;
    LockedReason: string | null;
}

/** One application's document ledger in the subject's library. */
export interface DocumentLedger {
    ProgramName: string;
    VersionLabel: string;
    ApplicationID: string;
    ApplicationStatus: ApplicationStatus;
    Rows: LedgerRow[];
}

/** Complete document library for one subject (FRD FR-5.1). */
export interface DocumentLibrary {
    Ledgers: DocumentLedger[];
    General: LibraryDocument[];
}

/**
 * Loads the subject's document library: one ledger per application the subject holds (requirements,
 * current document or attestation, version history, citation counts, lock state), followed by
 * general uploads not tied to a requirement.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.GetDocumentLibrary)
export class GetDocumentLibraryOperation extends BaseRemotableOperation<GetDocumentLibraryInput, DocumentLibrary> {
    public readonly OperationKey: string = CredentialingOperation.GetDocumentLibrary;
}
