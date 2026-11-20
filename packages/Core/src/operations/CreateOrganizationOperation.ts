import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingOperation } from './OperationKeys.js';

/** The accrediting organization to set up and the email of an existing user who becomes its first staff member. */
export interface CreateOrganizationInput {
    Name: string;
    FirstStaffEmail: string;
}

/** The accrediting organization, the staff membership and the staff member's user. */
export interface CreateOrganizationOutput {
    AccreditingOrganizationID: string;
    MembershipID: string;
    StaffUserID: string;
}

/**
 * Sets up an accrediting organization with its first staff member (FRD FR-1.2, as far as B1 needs):
 * the organization, the membership, the `Credentialing Staff` role and the Credentialing application
 * for that user, in one unit of work on the server. Running it again with the same input finds every
 * row and creates none.
 *
 * The contract only; the server subclass in `@mj-biz-apps/credentialing-core-entities-server` runs it.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.CreateOrganization)
export class CreateOrganizationOperation extends BaseRemotableOperation<CreateOrganizationInput, CreateOrganizationOutput> {
    public readonly OperationKey: string = CredentialingOperation.CreateOrganization;
}
