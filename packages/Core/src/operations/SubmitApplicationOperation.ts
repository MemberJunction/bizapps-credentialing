import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { AttestationInput } from '../rules/SubmissionGate.js';
import { CredentialingOperation } from './OperationKeys.js';

/** Input for submitting an application with optional governing-body attestation. */
export interface SubmitApplicationInput {
    ApplicationID: string;
    Attestation: AttestationInput | null;
}

/** Output returned when an application is submitted and frozen. */
export interface SubmitApplicationOutput {
    SubmittedAt: string;
}

/**
 * Submits a Draft application (applicant only): re-reads inside the subject+application locks,
 * checks the submission gate and attestation, stamps submission and subject snapshot, freezes
 * in-scope documents and attestations into `ApplicationDocument`, moves status to `Submitted`,
 * and triggers durable post-submission dispatch and best-effort staff notification after commit.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.SubmitApplication)
export class SubmitApplicationOperation extends BaseRemotableOperation<
    SubmitApplicationInput,
    SubmitApplicationOutput
> {
    public readonly OperationKey: string = CredentialingOperation.SubmitApplication;
}
