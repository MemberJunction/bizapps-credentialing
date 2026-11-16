import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingOperation } from './OperationKeys.js';

/** The Active or Retired version to copy, and the label of the new Draft. */
export interface CloneVersionToDraftInput {
    SourceVersionID: string;
    NewLabel: string;
}

/** The new Draft version and how many rows were copied into it. */
export interface CloneVersionToDraftOutput {
    VersionID: string;
    SectionCount: number;
    StandardCount: number;
    DocumentRequirementCount: number;
}

/**
 * Copies an Active or Retired version — its settings, sections, standards and document requirements —
 * into a new Draft of the same program, as one unit of work on the server (FRD FR-2.2). Each copied
 * standard keeps its lineage and evaluation mode. Nothing is written when any row is refused.
 *
 * The contract only; the server subclass in `@mj-biz-apps/credentialing-core-entities-server` runs it.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.CloneVersionToDraft)
export class CloneVersionToDraftOperation extends BaseRemotableOperation<CloneVersionToDraftInput, CloneVersionToDraftOutput> {
    public readonly OperationKey: string = CredentialingOperation.CloneVersionToDraft;
}
