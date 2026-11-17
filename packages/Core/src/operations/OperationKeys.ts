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
