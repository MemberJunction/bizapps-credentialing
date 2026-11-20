import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { mjBizAppsCredentialingProgramEntity } from '@mj-biz-apps/credentialing-entities';
import { CredentialingOperation } from './OperationKeys.js';

/** The kinds of credential a program awards. */
export type ProgramType = mjBizAppsCredentialingProgramEntity['ProgramType'];

/** Whether a program credentials people or organizations. */
export type SubjectType = mjBizAppsCredentialingProgramEntity['SubjectType'];

/** A new program and the label of its first (Draft) version. */
export interface CreateProgramInput {
    AccreditingOrganizationID: string;
    Name: string;
    ProgramType: ProgramType;
    SubjectType: SubjectType;
    SubjectNoun: string;
    CredentialPrefix: string;
    Description: string | null;
    FirstVersionLabel: string;
}

/** The program created and its first version. */
export interface CreateProgramOutput {
    ProgramID: string;
    VersionID: string;
}

/**
 * Creates a program together with its first Draft version, as one unit of work on the server
 * (FRD FR-2.1). Either both rows are written or neither is.
 *
 * This class is the contract only: the key and the types. On the client `Execute` sends the call to
 * MJAPI; on the server the subclass in `@mj-biz-apps/credentialing-core-entities-server` runs it.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.CreateProgram)
export class CreateProgramOperation extends BaseRemotableOperation<CreateProgramInput, CreateProgramOutput> {
    public readonly OperationKey: string = CredentialingOperation.CreateProgram;
}
