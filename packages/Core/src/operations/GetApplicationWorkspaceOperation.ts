import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { ResponseStatus, SelfAssessment } from '../rules/ResponseRules.js';
import type { MyApplication } from './GetMySubjectsOperation.js';
import { CredentialingOperation } from './OperationKeys.js';

/** Input identifying the application whose workspace read model is requested. */
export interface GetApplicationWorkspaceInput {
    ApplicationID: string;
}

/** Plain-language provenance explanation shown on an AI-assisted answer. */
export interface WorkspaceExplanation {
    What: string;
    Why: string;
    How: string;
}

/** One evidence citation attached to a standard response. */
export interface WorkspaceCitation {
    CitationID: string;
    EvidenceDocumentID: string;
    SourceLabel: string;
    PageReference: string | null;
    Excerpt: string;
    StartOffset: number;
    EndOffset: number;
}

/** Response state and citations returned for one standard in the workspace. */
export interface WorkspaceStandardResponse {
    ResponseID: string;
    Status: ResponseStatus;
    ResponseText: string | null;
    SelfAssessment: SelfAssessment | null;
    AuthorType: 'Human' | 'Agent';
    ConfirmedAt: string | null;
    UpdatedAt: string;
    SourceType: string | null;
    SourceLabel: string | null;
    SourceRetrievedAt: string | null;
    IsStale: boolean;
    Explanation: WorkspaceExplanation | null;
    Citations: WorkspaceCitation[];
}

/** Whitelisted standard fields plus its response for the applicant workspace (Decision 3). */
export interface WorkspaceStandard {
    StandardID: string;
    Code: string;
    Statement: string;
    Guidance: string | null;
    ResponseType: string;
    IntakeMode: string;
    IsEligibility: boolean;
    IsNewForVersion: boolean;
    EvidenceHint: string | null;
    Response: WorkspaceStandardResponse;
}

/** One section of the workspace, ordered eligibility-first then by sequence. */
export interface WorkspaceSection {
    SectionID: string;
    Number: string;
    Name: string;
    Description: string | null;
    Standards: WorkspaceStandard[];
}

/** Application header fields exposed to the workspace. */
export type WorkspaceApplication = MyApplication & {
    SubjectID: string;
    RequiresGoverningBodyAttestation: boolean;
    WithdrawalReason: string | null;
    CanPrefill: boolean;
};

/** Complete applicant workspace read model for one application. */
export interface ApplicationWorkspace {
    Application: WorkspaceApplication;
    Sections: WorkspaceSection[];
}

/**
 * Loads the applicant-safe read model of an application's sections, standards, responses, and
 * citations in batched reads. Never exposes internal authoring columns such as `EvaluationMode`,
 * `IsInterpretive`, `LineageKey`, or promotion thresholds.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.GetApplicationWorkspace)
export class GetApplicationWorkspaceOperation extends BaseRemotableOperation<GetApplicationWorkspaceInput, ApplicationWorkspace> {
    public readonly OperationKey: string = CredentialingOperation.GetApplicationWorkspace;
}
