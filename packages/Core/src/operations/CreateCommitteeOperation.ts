import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingOperation } from './OperationKeys.js';

/** A new committee for the accrediting organization that owns a program. */
export interface CreateCommitteeInput {
    /** A program the caller can read; its accrediting organization will own the committee. */
    ProgramID: string;
    Name: string;
    /** A BizApps Committees committee type. */
    CommitteeTypeID: string;
}

/** The committee created, with its name as stored. */
export interface CreateCommitteeOutput {
    CommitteeID: string;
    Name: string;
}

/**
 * Creates a BizApps Committees committee owned by the organization of one of the caller's programs,
 * so a program version of an organization that has no committee yet can be given its deciding
 * committee (and then activated) without leaving Program Studio. The caller names a program, never an
 * organization: the server finds the owning organization itself.
 *
 * The contract only; the server subclass in `@mj-biz-apps/credentialing-core-entities-server` runs it.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.CreateCommittee)
export class CreateCommitteeOperation extends BaseRemotableOperation<CreateCommitteeInput, CreateCommitteeOutput> {
    public readonly OperationKey: string = CredentialingOperation.CreateCommittee;
}
