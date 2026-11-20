import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { InviteApplicantInput } from '../rules/InvitationRules.js';
import { CredentialingOperation } from './OperationKeys.js';

/** Result of inviting an applicant onto an active program version. */
export interface InviteApplicantOutput {
    SubjectID: string;
    ApplicationID: string;
    ContactUserID: string;
    EmailSent: boolean;
    InvitationUrl: string | null;
    ExpiresAt: string | null;
    InvitationNote: string | null;
}

/**
 * Invites an applicant contact onto an Active program version (FRD FR-3.1): ensures the subject
 * (and its BizApps Common party record), the external user account, the `Credentialing Applicant`
 * role and Credentialing application row, the subject contact, the Draft application and its empty
 * standard responses in one transaction, then issues a single-use magic link after commit.
 *
 * This class is the contract only: the key and the types. On the client `Execute` sends the call to
 * MJAPI; on the server the subclass in `@mj-biz-apps/credentialing-core-entities-server` runs it.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.InviteApplicant)
export class InviteApplicantOperation extends BaseRemotableOperation<InviteApplicantInput, InviteApplicantOutput> {
    public readonly OperationKey: string = CredentialingOperation.InviteApplicant;
}
