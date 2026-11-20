/**
 * Stable keys of the credentialing remote operations — the registry key of each operation class and
 * the token sent on the wire. A key never changes once shipped: a browser bundle built against it
 * calls the server by it.
 *
 * Every write that spans more than one record is one of these operations. The browser cannot hold a
 * database transaction, so it asks the server to run the whole unit of work in one.
 */
export const CredentialingOperation = {
    CreateProgram: 'Credentialing.CreateProgram',
    CloneVersionToDraft: 'Credentialing.CloneVersionToDraft',
    ReorderVersionTree: 'Credentialing.ReorderVersionTree',
    CreateOrganization: 'Credentialing.CreateOrganization',
    CreateCommittee: 'Credentialing.CreateCommittee',
    InviteApplicant: 'Credentialing.InviteApplicant',
    ReissueInvitation: 'Credentialing.ReissueInvitation',
    GetMySubjects: 'Credentialing.GetMySubjects',
    GetApplicationWorkspace: 'Credentialing.GetApplicationWorkspace',
    SaveResponse: 'Credentialing.SaveResponse',
    ConfirmResponse: 'Credentialing.ConfirmResponse',
    ReopenResponse: 'Credentialing.ReopenResponse',
    WithdrawApplication: 'Credentialing.WithdrawApplication',
    AttestInLieu: 'Credentialing.AttestInLieu',
    ConfirmDocumentCurrent: 'Credentialing.ConfirmDocumentCurrent',
    GetDocumentLibrary: 'Credentialing.GetDocumentLibrary',
    RequeueReading: 'Credentialing.RequeueReading',
    SaveResponseSources: 'Credentialing.SaveResponseSources',
    RefreshPrefills: 'Credentialing.RefreshPrefills',
    GetSubmissionGate: 'Credentialing.GetSubmissionGate',
    SubmitApplication: 'Credentialing.SubmitApplication',
} as const;

/** One of the {@link CredentialingOperation} keys. */
export type CredentialingOperationKey = (typeof CredentialingOperation)[keyof typeof CredentialingOperation];

/** `ResultCode` of an operation refused by a rule; `ErrorMessage` carries the rule's sentence. */
export const OPERATION_REFUSED = 'REFUSED';

/** The role an operation that changes programs requires of its caller. */
export const CREDENTIALING_STAFF_ROLE = 'Credentialing Staff';

/** The external role of a subject's contact. */
export const CREDENTIALING_APPLICANT_ROLE = 'Credentialing Applicant';

/** The external role of a peer reviewer. */
export const CREDENTIALING_REVIEWER_ROLE = 'Credentialing Reviewer';

/** The external role of a committee member. */
export const CREDENTIALING_COMMITTEE_ROLE = 'Credentialing Committee';

/** The platform's restricted baseline role for magic-link accounts. */
export const MAGIC_LINK_BASELINE_ROLE = 'Magic Link Baseline';

/** The role organization setup requires of its caller. */
export const CREDENTIALING_ADMIN_ROLE = 'Credentialing Admin';

/** Shown when issuing the magic-link invite throws after committing the application. */
export const INVITATION_FAILED_NOTE = 'The applicant was added, but the invitation link could not be created. Use Send a new link.';

/** Fixed final sentence of `Explanation.How` on every AI-assisted standard response. */
export const APPLICANT_RESPONSIBILITY_SENTENCE = 'You are responsible for this answer once you confirm it.';

/** Refusal when a non-applicant tries to confirm an answer. */
export const ONLY_APPLICANT_CONFIRM_REASON = 'Only the applicant can confirm an answer.';

/** Refusal when a non-applicant tries to save an applicant's answer. */
export const ONLY_APPLICANT_EDIT_REASON = 'Only the applicant can edit an answer.';

/** Refusal when an invalid self-assessment value is supplied. */
export const INVALID_SELF_ASSESSMENT_REASON = 'Choose Met, Partially met or Not met.';

/** Refusal when attestation in lieu is asked for a requirement that does not allow restricted material. */
export const DOCUMENT_MUST_BE_UPLOADED_REASON = 'This document must be uploaded.';

/** Refusal when an attestation in lieu is sent with no statement. */
export const ATTESTATION_STATEMENT_REQUIRED_REASON = 'Write what you are attesting to.';

/** Refusal when "Still current" is asked for a document that a newer upload replaced. */
export const DOCUMENT_REPLACED_REASON = 'This document was replaced by a newer upload.';

/** Refusal when "Read again" is asked for a document the assistant has read, or cannot read. */
export const READING_NOT_REQUEUEABLE_REASON = 'Only a document the assistant could not read can be read again.';

/** Refusal when a non-applicant tries to submit an application. */
export const ONLY_APPLICANT_SUBMIT_REASON = 'Only the applicant can submit an application.';

/** Staff-facing note recorded when post-submission dispatch stops after MaxAttempts failures. */
export const SUBMISSION_DISPATCH_GAVE_UP_NOTE = 'Follow-up work for this submission could not be started. Tell your administrator.';
