import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { mjBizAppsCredentialingEvidenceDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import { CredentialingOperation } from './OperationKeys.js';

/** Input for asking the assistant to read a document again. */
export interface RequeueReadingInput {
    EvidenceDocumentID: string;
}

/** The document's reading state after the request. */
export interface RequeueReadingOutput {
    EvidenceDocumentID: string;
    ReadingStatus: mjBizAppsCredentialingEvidenceDocumentEntity['ReadingStatus'];
    ReadingNote: string | null;
}

/**
 * "Read again" on a document the assistant could not read (`Could Not Run` or `Failed`): a contact or
 * staff member of the document's subject sets it back to `Pending` with its attempts reset, and the
 * reading queue is nudged. A document already waiting or being read is answered as it is.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.RequeueReading)
export class RequeueReadingOperation extends BaseRemotableOperation<RequeueReadingInput, RequeueReadingOutput> {
    public readonly OperationKey: string = CredentialingOperation.RequeueReading;
}
