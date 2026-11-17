import { BaseRemotableOperation, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import {
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_STAFF_ROLE,
    CredentialingOperation,
    NOT_FOUND_REASON,
    READING_NOT_REQUEUEABLE_REASON,
    RequeueReadingOperation,
    type RequeueReadingInput,
    type RequeueReadingOutput,
} from '@mj-biz-apps/credentialing-core';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite } from '../guards/OperationWrite.js';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { CredentialingServices } from '../services/CredentialingServices.js';
import { OperationSupport } from './OperationSupport.js';

/**
 * `Credentialing.RequeueReading` ("Read again"): a contact or staff member of the document's subject
 * sets a `Could Not Run` or `Failed` document back to `Pending`, its attempts reset and its claim
 * cleared, and nudges the reading queue after commit. The document is read as the caller (a document
 * of another subject or organization answers `Record not found.`), then re-read under its lock — the
 * lock every claim takes — so a claim and this request never interleave. A document already `Pending`
 * or `Running` is answered as it is; any other state is refused.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.RequeueReading)
export class RequeueReadingServerOperation extends RequeueReadingOperation {
    protected override async Authorize(_input: RequeueReadingInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE) || OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE);
    }

    protected override async InternalExecute(input: RequeueReadingInput, provider: IMetadataProvider, user: UserInfo): Promise<RequeueReadingOutput> {
        const initial = await SubjectAccess.Document(input.EvidenceDocumentID, provider, user);
        if ((await SubjectAccess.ActorFor(user, initial.Subject, provider)) == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        let requeued = false;
        const output = await OperationWrite.Run(provider, async (scope): Promise<RequeueReadingOutput> => {
            await AuthoringLock.ForDocument(initial.Document.ID, provider, user);
            const { Document } = await SubjectAccess.Document(input.EvidenceDocumentID, provider, user);
            if (Document.ReadingStatus === 'Could Not Run' || Document.ReadingStatus === 'Failed') {
                Document.ReadingStatus = 'Pending';
                Document.ReadingNote = null;
                Document.ReadingAttempts = 0;
                Document.ReadingClaimID = null;
                Document.ReadingClaimedAt = null;
                await scope.Save(Document);
                requeued = true;
            } else if (Document.ReadingStatus !== 'Pending' && Document.ReadingStatus !== 'Running') {
                OperationSupport.Refuse(READING_NOT_REQUEUEABLE_REASON);
            }
            return { EvidenceDocumentID: Document.ID, ReadingStatus: Document.ReadingStatus, ReadingNote: Document.ReadingNote };
        });
        if (requeued) {
            CredentialingServices.NotifyEvidenceStored(output.EvidenceDocumentID);
        }
        return output;
    }
}
