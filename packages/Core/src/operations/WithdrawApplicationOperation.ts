import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { ApplicationStatus } from '../rules/ApplicationLifecycleRules.js';
import { CredentialingOperation } from './OperationKeys.js';

/** Input for withdrawing an application with a recorded reason. */
export interface WithdrawApplicationInput {
    ApplicationID: string;
    Reason: string;
}

/** Result returned after withdrawing an application. */
export interface WithdrawApplicationOutput {
    ApplicationID: string;
    Status: ApplicationStatus;
    WithdrawnAt: string;
    WithdrawalReason: string;
}

/**
 * Withdraws an application in accordance with `ApplicationLifecycleRules.CanWithdraw` for the
 * caller's actor (`Applicant` or `Staff`), stamping who withdrew and when.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.WithdrawApplication)
export class WithdrawApplicationOperation extends BaseRemotableOperation<WithdrawApplicationInput, WithdrawApplicationOutput> {
    public readonly OperationKey: string = CredentialingOperation.WithdrawApplication;
}
