import { BaseRemotableOperation, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import {
    ConfirmDocumentCurrentOperation,
    CREDENTIALING_APPLICANT_ROLE,
    CredentialingOperation,
    DOCUMENT_REPLACED_REASON,
    EvidenceFileRules,
    NOT_FOUND_REASON,
    type ConfirmDocumentCurrentInput,
    type ConfirmDocumentCurrentOutput,
} from '@mj-biz-apps/credentialing-core';
import { DocumentFreeze } from '../evidence/DocumentFreeze.js';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite } from '../guards/OperationWrite.js';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { OperationSupport } from './OperationSupport.js';
import { RequireRule } from './ResponseWorkspaceHelper.js';

/**
 * `Credentialing.ConfirmDocumentCurrent`: a subject contact's "Still current" on a document marked
 * `Confirm Current`. Under the subject's and the document's locks it re-reads the document and the
 * applications that froze it; it is refused with the `CanSupersede` sentence when an application
 * past Draft froze it, and with {@link DOCUMENT_REPLACED_REASON} when a newer upload replaced it.
 * A document already `Current` is answered as it is.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.ConfirmDocumentCurrent)
export class ConfirmDocumentCurrentServerOperation extends ConfirmDocumentCurrentOperation {
    protected override async Authorize(_input: ConfirmDocumentCurrentInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE);
    }

    protected override async InternalExecute(input: ConfirmDocumentCurrentInput, provider: IMetadataProvider, user: UserInfo): Promise<ConfirmDocumentCurrentOutput> {
        const initial = await SubjectAccess.Document(input.EvidenceDocumentID, provider, user);
        if ((await SubjectAccess.ActorFor(user, initial.Subject, provider)) !== 'Applicant') {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }

        return OperationWrite.Run(provider, async (scope) => {
            await AuthoringLock.ForSubject(initial.Subject.ID, provider, user);
            await AuthoringLock.ForDocument(initial.Document.ID, provider, user);
            const { Document } = await SubjectAccess.Document(input.EvidenceDocumentID, provider, user);
            if (Document.Status === 'Superseded') {
                OperationSupport.Refuse(DOCUMENT_REPLACED_REASON);
            }
            const frozenBy = await DocumentFreeze.Statuses('EvidenceDocumentID', Document.ID, provider, user);
            RequireRule(EvidenceFileRules.CanSupersede(Document, frozenBy));
            if (Document.Status === 'Confirm Current') {
                Document.Status = 'Current';
                Document.ConfirmedCurrentAt = new Date();
                await scope.Save(Document);
            }
            return {
                EvidenceDocumentID: Document.ID,
                Status: Document.Status,
                ConfirmedCurrentAt: Document.ConfirmedCurrentAt?.toISOString() ?? null,
            };
        });
    }
}
