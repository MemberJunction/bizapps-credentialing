import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingOperation } from './OperationKeys.js';

/** The new position of one section or standard. */
export interface TreeRowSequence {
    ID: string;
    Sequence: number;
}

/** The version whose tree is reordered, and the new positions of its rows. */
export interface ReorderVersionTreeInput {
    VersionID: string;
    Sections: TreeRowSequence[];
    Standards: TreeRowSequence[];
}

/** How many rows were saved. */
export interface ReorderVersionTreeOutput {
    SectionsUpdated: number;
    StandardsUpdated: number;
}

/**
 * Sets the `Sequence` of sections and standards of a Draft version, as one unit of work on the server
 * (FRD FR-2.2). Every row named must belong to the version; nothing is written otherwise.
 *
 * The contract only; the server subclass in `@mj-biz-apps/credentialing-core-entities-server` runs it.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.ReorderVersionTree)
export class ReorderVersionTreeOperation extends BaseRemotableOperation<ReorderVersionTreeInput, ReorderVersionTreeOutput> {
    public readonly OperationKey: string = CredentialingOperation.ReorderVersionTree;
}
