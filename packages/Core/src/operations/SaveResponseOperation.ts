import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { SelfAssessment } from '../rules/ResponseRules.js';
import type { WorkspaceStandard } from './GetApplicationWorkspaceOperation.js';
import { CredentialingOperation } from './OperationKeys.js';

/** Input for saving a draft answer or self-assessment on a standard response. */
export interface SaveResponseInput {
    ResponseID: string;
    ResponseText: string | null;
    SelfAssessment: SelfAssessment | null;
    ExpectedUpdatedAt: string;
}

/** Response row returned after a save, confirm, or reopen operation. */
export interface ResponseOutput {
    Response: WorkspaceStandard['Response'];
}

/**
 * Saves an applicant's draft text and self-assessment on a standard response under the subject and
 * application locks, enforcing optimistic concurrency (`ExpectedUpdatedAt`) and response rules.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.SaveResponse)
export class SaveResponseOperation extends BaseRemotableOperation<SaveResponseInput, ResponseOutput> {
    public readonly OperationKey: string = CredentialingOperation.SaveResponse;
}
