import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingOperation } from './OperationKeys.js';

/** Input identifying the application whose prefill resolution should run. */
export interface RefreshPrefillsInput {
    ApplicationID: string;
}

/** Outcome counts returned by {@link RefreshPrefillsOperation}. */
export interface RefreshPrefillsOutput {
    Prefilled: number;
    Located: number;
    MarkedStale: number;
    Cleared: number;
    Unchanged: number;
}

/**
 * Re-runs deterministic prefill resolution across every standard on an application without
 * overwriting any Confirmed or human-Drafted answer (FR-4.10, FR-7.2). Callable by a contact or
 * staff member of the application's subject.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.RefreshPrefills)
export class RefreshPrefillsOperation extends BaseRemotableOperation<RefreshPrefillsInput, RefreshPrefillsOutput> {
    public readonly OperationKey: string = CredentialingOperation.RefreshPrefills;
}
