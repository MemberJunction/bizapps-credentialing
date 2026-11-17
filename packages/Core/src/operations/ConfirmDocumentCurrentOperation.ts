import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { mjBizAppsCredentialingEvidenceDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import { CredentialingOperation } from './OperationKeys.js';

/** Input for confirming that a document marked `Confirm Current` is still current. */
export interface ConfirmDocumentCurrentInput {
    EvidenceDocumentID: string;
}

/** The document after confirmation. */
export interface ConfirmDocumentCurrentOutput {
    EvidenceDocumentID: string;
    Status: mjBizAppsCredentialingEvidenceDocumentEntity['Status'];
    ConfirmedCurrentAt: string | null;
}

/**
 * A subject contact's "Still current" on a document marked `Confirm Current`: sets
 * `ConfirmedCurrentAt` and `Status = 'Current'`. Refused with the supersession sentence when an
 * application past Draft froze the document.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.ConfirmDocumentCurrent)
export class ConfirmDocumentCurrentOperation extends BaseRemotableOperation<ConfirmDocumentCurrentInput, ConfirmDocumentCurrentOutput> {
    public readonly OperationKey: string = CredentialingOperation.ConfirmDocumentCurrent;
}
