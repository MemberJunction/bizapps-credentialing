import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingOperation } from './OperationKeys.js';

/** Input for attesting to a restricted document instead of uploading it (FRD FR-5.3). */
export interface AttestInLieuInput {
    SubjectID: string;
    DocumentRequirementID: string;
    Statement: string;
}

/** The attestation recorded, and the one it replaced (null when there was none). */
export interface AttestInLieuOutput {
    DocumentAttestationID: string;
    SupersededAttestationID: string | null;
    AttestedAt: string;
}

/**
 * Records a subject contact's attestation in lieu of uploading a document whose requirement allows
 * restricted material. A row is never edited: an earlier current attestation is marked superseded
 * and a new one is inserted, unless an application past Draft froze the current one.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.AttestInLieu)
export class AttestInLieuOperation extends BaseRemotableOperation<AttestInLieuInput, AttestInLieuOutput> {
    public readonly OperationKey: string = CredentialingOperation.AttestInLieu;
}
