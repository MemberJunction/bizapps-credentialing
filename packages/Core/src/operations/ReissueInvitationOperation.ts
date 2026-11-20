import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { InviteApplicantOutput } from './InviteApplicantOperation.js';
import { CredentialingOperation } from './OperationKeys.js';

/** Input identifying the subject contact to send a new sign-in link to. */
export interface ReissueInvitationInput {
    SubjectContactID: string;
}

/** Result of re-issuing a single-use sign-in link for an existing subject contact. */
export type ReissueInvitationOutput = Pick<InviteApplicantOutput, 'EmailSent' | 'InvitationUrl' | 'ExpiresAt' | 'InvitationNote'>;

/**
 * Issues a new magic-link invitation for an existing subject contact (FRD FR-3.1, FR-3.2).
 *
 * This class is the contract only: the key and the types. On the client `Execute` sends the call to
 * MJAPI; on the server the subclass in `@mj-biz-apps/credentialing-core-entities-server` runs it.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.ReissueInvitation)
export class ReissueInvitationOperation extends BaseRemotableOperation<ReissueInvitationInput, ReissueInvitationOutput> {
    public readonly OperationKey: string = CredentialingOperation.ReissueInvitation;
}
