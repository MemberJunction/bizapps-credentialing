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
} as const;

/** One of the {@link CredentialingOperation} keys. */
export type CredentialingOperationKey = (typeof CredentialingOperation)[keyof typeof CredentialingOperation];

/** `ResultCode` of an operation refused by a rule; `ErrorMessage` carries the rule's sentence. */
export const OPERATION_REFUSED = 'REFUSED';

/** The role an operation that changes programs requires of its caller. */
export const CREDENTIALING_STAFF_ROLE = 'Credentialing Staff';

/** The external role of a subject's contact. */
export const CREDENTIALING_APPLICANT_ROLE = 'Credentialing Applicant';

/** The role organization setup requires of its caller. */
export const CREDENTIALING_ADMIN_ROLE = 'Credentialing Admin';
