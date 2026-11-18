import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { ResponseSourceMode, ResponseSourceType } from '../rules/ResponseSourceRules.js';
import { CredentialingOperation } from './OperationKeys.js';

/** One source binding in the ordered list submitted by Program Studio for a standard. */
export interface SaveResponseSourceItem {
    ID?: string;
    DocumentRequirementID: string;
    Mode: ResponseSourceMode;
}

/** Input replacing the full ordered list of response sources for one standard on a Draft version. */
export interface SaveResponseSourcesInput {
    StandardID: string;
    Sources: SaveResponseSourceItem[];
}

/** Stored response source returned after saving. */
export interface SavedResponseSource {
    ID: string;
    StandardID: string;
    SourceType: ResponseSourceType;
    DocumentRequirementID: string | null;
    DocumentRequirement: string | null;
    Mode: ResponseSourceMode;
    Rank: number;
    Sequence: number;
}

/** Full saved source list for the standard, in rank/sequence order. */
export interface SaveResponseSourcesOutput {
    Sources: SavedResponseSource[];
}

/**
 * Replaces the full list of response sources on a standard in one transaction (Decision 7, FR-7.1).
 * The order in `Sources` determines both `Rank` (1-based) and `Sequence` (0-based); stored sources
 * omitted from the list are deleted. Allowed only for staff on a Draft version.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.SaveResponseSources)
export class SaveResponseSourcesOperation extends BaseRemotableOperation<SaveResponseSourcesInput, SaveResponseSourcesOutput> {
    public readonly OperationKey: string = CredentialingOperation.SaveResponseSources;
}
