import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingOperation } from './OperationKeys.js';
import type { ResponseOutput } from './SaveResponseOperation.js';

/** Input for staff reopening a confirmed standard response with a recorded reason. */
export interface ReopenResponseInput {
    ResponseID: string;
    Reason: string;
}

/**
 * Staff-only operation reopening a confirmed standard response (`Confirmed -> Drafted`) while
 * preserving its text and recording `ReopenReason`.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.ReopenResponse)
export class ReopenResponseOperation extends BaseRemotableOperation<ReopenResponseInput, ResponseOutput> {
    public readonly OperationKey: string = CredentialingOperation.ReopenResponse;
}
