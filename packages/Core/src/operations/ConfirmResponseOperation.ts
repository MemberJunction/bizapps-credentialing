import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingOperation } from './OperationKeys.js';
import type { ResponseOutput } from './SaveResponseOperation.js';

/** Input for confirming an applicant's standard response. */
export interface ConfirmResponseInput {
    ResponseID: string;
    ExpectedUpdatedAt: string;
}

/**
 * Confirms an applicant's standard response as a deliberate second act, enforcing
 * `ResponseRules.CanConfirm` and stamping `ConfirmedByUserID` and `ConfirmedAt` on the server.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.ConfirmResponse)
export class ConfirmResponseOperation extends BaseRemotableOperation<ConfirmResponseInput, ResponseOutput> {
    public readonly OperationKey: string = CredentialingOperation.ConfirmResponse;
}
