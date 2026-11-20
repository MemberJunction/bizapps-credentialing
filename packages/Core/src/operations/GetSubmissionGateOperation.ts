import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { ApplicationStatus } from '../rules/ApplicationLifecycleRules.js';
import type { AttestationInput, GateItem } from '../rules/SubmissionGate.js';
import { CredentialingOperation } from './OperationKeys.js';

/** Input identifying the application whose submission gate is evaluated. */
export interface GetSubmissionGateInput {
    ApplicationID: string;
}

/** One document or attestation listed in the submission gate freeze summary. */
export interface GateDocumentItem {
    Kind: 'Document' | 'Attestation';
    RequirementID: string | null;
    RequirementName: string | null;
    Title: string;
    Detail: string;
    EvidenceDocumentID: string | null;
    DocumentAttestationID: string | null;
}

/** Application header fields returned alongside the submission gate. */
export interface GateApplicationSummary {
    ApplicationID: string;
    SubjectID: string;
    SubjectName: string;
    ProgramName: string;
    VersionLabel: string;
    OrganizationName: string;
    Status: ApplicationStatus;
    SubmittedAt: string | null;
}

/** Submission gate evaluation, attestation copy, and frozen/in-scope document summary. */
export interface GetSubmissionGateOutput {
    Items: GateItem[];
    Gaps: GateItem[];
    CanSubmit: boolean;
    Reason: string | null;
    RequiresAttestation: boolean;
    AttestationStatement: string;
    Application: GateApplicationSummary;
    Documents: GateDocumentItem[];
    RecordedAttestation: AttestationInput | null;
}

/**
 * Loads the submission gate evaluation for an application: eligibility, section completion,
 * required documents, optional governing-body attestation, and the documents that submission freezes.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.GetSubmissionGate)
export class GetSubmissionGateOperation extends BaseRemotableOperation<
    GetSubmissionGateInput,
    GetSubmissionGateOutput
> {
    public readonly OperationKey: string = CredentialingOperation.GetSubmissionGate;
}
