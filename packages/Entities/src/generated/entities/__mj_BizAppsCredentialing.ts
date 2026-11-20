import { BaseEntity, EntitySaveOptions, EntityDeleteOptions, CompositeKey, ValidationResult, ValidationErrorInfo, ValidationErrorType, Metadata, ProviderType, DatabaseProviderBase, RunView } from "@memberjunction/core";
import { RegisterClass } from "@memberjunction/global";
import { z } from "zod";

     
 
/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Accrediting Organizations
 */
export const mjBizAppsCredentialingAccreditingOrganizationSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    OrganizationID: z.string().describe(`
        * * Field Name: OrganizationID
        * * Display Name: Organization ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Common: Organizations (vwOrganizations.ID)
        * * Description: The BizApps Common organization record for this accrediting body.`),
    Name: z.string().describe(`
        * * Field Name: Name
        * * Display Name: Name
        * * SQL Data Type: nvarchar(255)
        * * Description: The name of the accrediting body as shown on letters and certificates.`),
    Description: z.string().nullable().describe(`
        * * Field Name: Description
        * * Display Name: Description
        * * SQL Data Type: nvarchar(MAX)
        * * Description: What this accrediting body does and whom it accredits.`),
    Status: z.union([z.literal('Active'), z.literal('Inactive')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Active
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Inactive
        * * Description: Whether the accrediting body is in use. An inactive body keeps its history but takes no new work.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    Organization: z.string().describe(`
        * * Field Name: Organization
        * * Display Name: Organization
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCredentialingAccreditingOrganizationEntityType = z.infer<typeof mjBizAppsCredentialingAccreditingOrganizationSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Application Documents
 */
export const mjBizAppsCredentialingApplicationDocumentSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    ApplicationID: z.string().describe(`
        * * Field Name: ApplicationID
        * * Display Name: Application ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Applications (vwApplications.ID)
        * * Description: The submitted application this frozen document link belongs to.`),
    SubjectID: z.string().describe(`
        * * Field Name: SubjectID
        * * Display Name: Subject ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
        * * Description: The subject of the application, server-set to match Application.SubjectID.`),
    EvidenceDocumentID: z.string().nullable().describe(`
        * * Field Name: EvidenceDocumentID
        * * Display Name: Evidence Document ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Evidence Documents (vwEvidenceDocuments.ID)
        * * Description: The evidence document frozen into the application, when this entry references a file.`),
    DocumentAttestationID: z.string().nullable().describe(`
        * * Field Name: DocumentAttestationID
        * * Display Name: Document Attestation ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Document Attestations (vwDocumentAttestations.ID)
        * * Description: The document attestation frozen into the application, when this entry references an attestation.`),
    FrozenAt: z.date().describe(`
        * * Field Name: FrozenAt
        * * Display Name: Frozen At
        * * SQL Data Type: datetimeoffset
        * * Description: Timestamp when this document link was frozen on submission.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
});

export type mjBizAppsCredentialingApplicationDocumentEntityType = z.infer<typeof mjBizAppsCredentialingApplicationDocumentSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Applications
 */
export const mjBizAppsCredentialingApplicationSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    SubjectID: z.string().describe(`
        * * Field Name: SubjectID
        * * Display Name: Subject ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
        * * Description: The subject applying for the credential. Cannot be changed after creation.`),
    ProgramVersionID: z.string().describe(`
        * * Field Name: ProgramVersionID
        * * Display Name: Program Version ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
        * * Description: The program version this application is judged against. Cannot be changed after creation.`),
    Status: z.union([z.literal('Closed'), z.literal('Committee'), z.literal('Decided'), z.literal('Draft'), z.literal('Executive Sign-Off'), z.literal('In Review'), z.literal('Info Requested'), z.literal('Screening'), z.literal('Submitted'), z.literal('Withdrawn')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Draft
    * * Value List Type: List
    * * Possible Values 
    *   * Closed
    *   * Committee
    *   * Decided
    *   * Draft
    *   * Executive Sign-Off
    *   * In Review
    *   * Info Requested
    *   * Screening
    *   * Submitted
    *   * Withdrawn
        * * Description: Current workflow stage of the application.`),
    IsHistorical: z.boolean().describe(`
        * * Field Name: IsHistorical
        * * Display Name: Is Historical
        * * SQL Data Type: bit
        * * Default Value: 0
        * * Description: Whether this row represents imported historical application data.`),
    SubmittedAt: z.date().nullable().describe(`
        * * Field Name: SubmittedAt
        * * Display Name: Submitted At
        * * SQL Data Type: datetimeoffset
        * * Description: Server-stamped timestamp when the application was submitted.`),
    SubmittedByUserID: z.string().nullable().describe(`
        * * Field Name: SubmittedByUserID
        * * Display Name: Submitted By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
        * * Description: The contact user who submitted the application.`),
    SubmissionDispatchedAt: z.date().nullable().describe(`
        * * Field Name: SubmissionDispatchedAt
        * * Display Name: Submission Dispatched At
        * * SQL Data Type: datetimeoffset
        * * Description: Timestamp when all post-submission subscribers completed successfully.`),
    SubmissionDispatchClaimID: z.string().nullable().describe(`
        * * Field Name: SubmissionDispatchClaimID
        * * Display Name: Submission Dispatch Claim ID
        * * SQL Data Type: uniqueidentifier
        * * Description: Identifier of the submission-dispatch attempt currently holding the claim.`),
    SubmissionDispatchClaimedAt: z.date().nullable().describe(`
        * * Field Name: SubmissionDispatchClaimedAt
        * * Display Name: Submission Dispatch Claimed At
        * * SQL Data Type: datetimeoffset
        * * Description: Timestamp when the current submission-dispatch claim was taken.`),
    SubmissionDispatchAttempts: z.number().describe(`
        * * Field Name: SubmissionDispatchAttempts
        * * Display Name: Submission Dispatch Attempts
        * * SQL Data Type: int
        * * Default Value: 0
        * * Description: Number of submission-dispatch attempts made so far. Dispatch stops after 5.`),
    SubmissionDispatchNote: z.string().nullable().describe(`
        * * Field Name: SubmissionDispatchNote
        * * Display Name: Submission Dispatch Note
        * * SQL Data Type: nvarchar(500)
        * * Description: Staff-facing explanation recorded when submission dispatch stops retrying.`),
    SubjectSnapshot: z.string().nullable().describe(`
        * * Field Name: SubjectSnapshot
        * * Display Name: Subject Snapshot
        * * SQL Data Type: nvarchar(MAX)
        * * Description: JSON snapshot of the subject's display name, type, email and party reference captured at submission.`),
    AttestationOfficerName: z.string().nullable().describe(`
        * * Field Name: AttestationOfficerName
        * * Display Name: Attestation Officer Name
        * * SQL Data Type: nvarchar(255)
        * * Description: Name of the officer who signed the governing-body attestation.`),
    AttestationOfficerRole: z.string().nullable().describe(`
        * * Field Name: AttestationOfficerRole
        * * Display Name: Attestation Officer Role
        * * SQL Data Type: nvarchar(255)
        * * Description: Title or role of the officer who signed the governing-body attestation.`),
    AttestationApprovalDate: z.date().nullable().describe(`
        * * Field Name: AttestationApprovalDate
        * * Display Name: Attestation Approval Date
        * * SQL Data Type: date
        * * Description: Date the governing body approved the application.`),
    AttestationStatement: z.string().nullable().describe(`
        * * Field Name: AttestationStatement
        * * Display Name: Attestation Statement
        * * SQL Data Type: nvarchar(MAX)
        * * Description: Exact attestation statement presented to and signed by the contact.`),
    AttestedByUserID: z.string().nullable().describe(`
        * * Field Name: AttestedByUserID
        * * Display Name: Attested By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
        * * Description: The contact user who recorded the attestation.`),
    AttestedAt: z.date().nullable().describe(`
        * * Field Name: AttestedAt
        * * Display Name: Attested At
        * * SQL Data Type: datetimeoffset
        * * Description: Timestamp when the attestation was recorded.`),
    WithdrawnAt: z.date().nullable().describe(`
        * * Field Name: WithdrawnAt
        * * Display Name: Withdrawn At
        * * SQL Data Type: datetimeoffset
        * * Description: Timestamp when the application was withdrawn.`),
    WithdrawnByUserID: z.string().nullable().describe(`
        * * Field Name: WithdrawnByUserID
        * * Display Name: Withdrawn By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
        * * Description: The user who withdrew the application.`),
    WithdrawalReason: z.string().nullable().describe(`
        * * Field Name: WithdrawalReason
        * * Display Name: Withdrawal Reason
        * * SQL Data Type: nvarchar(MAX)
        * * Description: Reason recorded when the application was withdrawn.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    SubmittedByUser: z.string().nullable().describe(`
        * * Field Name: SubmittedByUser
        * * Display Name: Submitted By User
        * * SQL Data Type: nvarchar(100)`),
    AttestedByUser: z.string().nullable().describe(`
        * * Field Name: AttestedByUser
        * * Display Name: Attested By User
        * * SQL Data Type: nvarchar(100)`),
    WithdrawnByUser: z.string().nullable().describe(`
        * * Field Name: WithdrawnByUser
        * * Display Name: Withdrawn By User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCredentialingApplicationEntityType = z.infer<typeof mjBizAppsCredentialingApplicationSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Document Attestations
 */
export const mjBizAppsCredentialingDocumentAttestationSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    SubjectID: z.string().describe(`
        * * Field Name: SubjectID
        * * Display Name: Subject ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
        * * Description: The subject this attestation is recorded for.`),
    DocumentRequirementID: z.string().describe(`
        * * Field Name: DocumentRequirementID
        * * Display Name: Document Requirement ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Document Requirements (vwDocumentRequirements.ID)
        * * Description: The document requirement satisfied by this attestation.`),
    Statement: z.string().describe(`
        * * Field Name: Statement
        * * Display Name: Statement
        * * SQL Data Type: nvarchar(MAX)
        * * Description: The statement attested to by the contact.`),
    AttestedByUserID: z.string().describe(`
        * * Field Name: AttestedByUserID
        * * Display Name: Attested By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
        * * Description: The user who recorded this attestation.`),
    AttestedAt: z.date().describe(`
        * * Field Name: AttestedAt
        * * Display Name: Attested At
        * * SQL Data Type: datetimeoffset
        * * Description: Timestamp when this attestation was recorded.`),
    IsSuperseded: z.boolean().describe(`
        * * Field Name: IsSuperseded
        * * Display Name: Is Superseded
        * * SQL Data Type: bit
        * * Default Value: 0
        * * Description: Whether a later attestation or upload replaced this record.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    DocumentRequirement: z.string().describe(`
        * * Field Name: DocumentRequirement
        * * Display Name: Document Requirement
        * * SQL Data Type: nvarchar(255)`),
    AttestedByUser: z.string().describe(`
        * * Field Name: AttestedByUser
        * * Display Name: Attested By User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCredentialingDocumentAttestationEntityType = z.infer<typeof mjBizAppsCredentialingDocumentAttestationSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Document Requirements
 */
export const mjBizAppsCredentialingDocumentRequirementSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    ProgramVersionID: z.string().describe(`
        * * Field Name: ProgramVersionID
        * * Display Name: Program Version ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
        * * Description: The program version this document requirement belongs to.`),
    Name: z.string().describe(`
        * * Field Name: Name
        * * Display Name: Name
        * * SQL Data Type: nvarchar(255)
        * * Description: The name of the document, for example "Bylaws", unique within its version.`),
    Description: z.string().nullable().describe(`
        * * Field Name: Description
        * * Display Name: Description
        * * SQL Data Type: nvarchar(MAX)
        * * Description: What the document is and what it should contain.`),
    IsRequired: z.boolean().describe(`
        * * Field Name: IsRequired
        * * Display Name: Is Required
        * * SQL Data Type: bit
        * * Default Value: 1
        * * Description: Whether an application is incomplete without this document.`),
    SensitivityPolicy: z.union([z.literal('Normal'), z.literal('Restricted Allowed')]).describe(`
        * * Field Name: SensitivityPolicy
        * * Display Name: Sensitivity Policy
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Normal
    * * Value List Type: List
    * * Possible Values 
    *   * Normal
    *   * Restricted Allowed
        * * Description: Whether the applicant may mark this document restricted, so that it is handled outside the system.`),
    Sequence: z.number().describe(`
        * * Field Name: Sequence
        * * Display Name: Sequence
        * * SQL Data Type: int
        * * Default Value: 0
        * * Description: The position of the document in the list, lowest first.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
});

export type mjBizAppsCredentialingDocumentRequirementEntityType = z.infer<typeof mjBizAppsCredentialingDocumentRequirementSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Evidence Documents
 */
export const mjBizAppsCredentialingEvidenceDocumentSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    SubjectID: z.string().describe(`
        * * Field Name: SubjectID
        * * Display Name: Subject ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
        * * Description: The subject that owns this document. Cannot be changed after creation.`),
    DocumentRequirementID: z.string().nullable().describe(`
        * * Field Name: DocumentRequirementID
        * * Display Name: Document Requirement ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Document Requirements (vwDocumentRequirements.ID)
        * * Description: The document requirement this upload fulfills, or NULL for a general upload.`),
    FileID: z.string().describe(`
        * * Field Name: FileID
        * * Display Name: File ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Files (vwFiles.ID)
        * * Description: The underlying MemberJunction File record storing the uploaded bytes.`),
    FileName: z.string().describe(`
        * * Field Name: FileName
        * * Display Name: File Name
        * * SQL Data Type: nvarchar(255)
        * * Description: Sanitized original file name as uploaded.`),
    ContentType: z.string().describe(`
        * * Field Name: ContentType
        * * Display Name: Content Type
        * * SQL Data Type: nvarchar(150)
        * * Description: MIME content type of the uploaded file.`),
    SizeBytes: z.number().describe(`
        * * Field Name: SizeBytes
        * * Display Name: Size Bytes
        * * SQL Data Type: bigint
        * * Description: Size of the uploaded file in bytes.`),
    ContentHash: z.string().describe(`
        * * Field Name: ContentHash
        * * Display Name: Content Hash
        * * SQL Data Type: char(64)
        * * Description: Lowercase hex SHA-256 digest of the uploaded file bytes.`),
    ExtractedText: z.string().nullable().describe(`
        * * Field Name: ExtractedText
        * * Display Name: Extracted Text
        * * SQL Data Type: nvarchar(MAX)
        * * Description: Plain text extracted or recognized from the file. Written once and never modified afterward.`),
    TextStatus: z.union([z.literal('Awaiting Recognition'), z.literal('Could Not Read'), z.literal('Extracted'), z.literal('No Text Found'), z.literal('Recognized'), z.literal('Truncated')]).describe(`
        * * Field Name: TextStatus
        * * Display Name: Text Status
        * * SQL Data Type: nvarchar(30)
    * * Value List Type: List
    * * Possible Values 
    *   * Awaiting Recognition
    *   * Could Not Read
    *   * Extracted
    *   * No Text Found
    *   * Recognized
    *   * Truncated
        * * Description: Outcome of text extraction or recognition for this document.`),
    TextNote: z.string().nullable().describe(`
        * * Field Name: TextNote
        * * Display Name: Text Note
        * * SQL Data Type: nvarchar(500)
        * * Description: User-facing sentence explaining any text status other than Extracted.`),
    PageCount: z.number().nullable().describe(`
        * * Field Name: PageCount
        * * Display Name: Page Count
        * * SQL Data Type: int
        * * Description: Page count of the document when known.`),
    ReadingStatus: z.union([z.literal('Complete'), z.literal('Could Not Run'), z.literal('Failed'), z.literal('Not Applicable'), z.literal('Pending'), z.literal('Running')]).describe(`
        * * Field Name: ReadingStatus
        * * Display Name: Reading Status
        * * SQL Data Type: nvarchar(30)
        * * Default Value: Pending
    * * Value List Type: List
    * * Possible Values 
    *   * Complete
    *   * Could Not Run
    *   * Failed
    *   * Not Applicable
    *   * Pending
    *   * Running
        * * Description: Current state of background evidence reading for this document.`),
    ReadingNote: z.string().nullable().describe(`
        * * Field Name: ReadingNote
        * * Display Name: Reading Note
        * * SQL Data Type: nvarchar(500)
        * * Description: User-facing note describing the outcome or failure of evidence reading.`),
    ReadingClaimID: z.string().nullable().describe(`
        * * Field Name: ReadingClaimID
        * * Display Name: Reading Claim ID
        * * SQL Data Type: uniqueidentifier
        * * Description: Identifier of the background worker claim currently processing this document.`),
    ReadingClaimedAt: z.date().nullable().describe(`
        * * Field Name: ReadingClaimedAt
        * * Display Name: Reading Claimed At
        * * SQL Data Type: datetimeoffset
        * * Description: Timestamp when the active reading claim was taken or last renewed.`),
    ReadingAttempts: z.number().describe(`
        * * Field Name: ReadingAttempts
        * * Display Name: Reading Attempts
        * * SQL Data Type: int
        * * Default Value: 0
        * * Description: Number of failed or attempted reading runs. Failed reads retry up to 3 attempts.`),
    Status: z.union([z.literal('Confirm Current'), z.literal('Current'), z.literal('Superseded')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Current
    * * Value List Type: List
    * * Possible Values 
    *   * Confirm Current
    *   * Current
    *   * Superseded
        * * Description: Currency status of this document in the subject's library.`),
    SupersedesDocumentID: z.string().nullable().describe(`
        * * Field Name: SupersedesDocumentID
        * * Display Name: Supersedes Document ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Evidence Documents (vwEvidenceDocuments.ID)
        * * Description: The prior document version that this upload replaced.`),
    ConfirmedCurrentAt: z.date().nullable().describe(`
        * * Field Name: ConfirmedCurrentAt
        * * Display Name: Confirmed Current At
        * * SQL Data Type: datetimeoffset
        * * Description: Timestamp when a contact most recently confirmed this document is still current.`),
    UploadedByUserID: z.string().describe(`
        * * Field Name: UploadedByUserID
        * * Display Name: Uploaded By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
        * * Description: The user who uploaded this document.`),
    UploadedAt: z.date().describe(`
        * * Field Name: UploadedAt
        * * Display Name: Uploaded At
        * * SQL Data Type: datetimeoffset
        * * Description: Timestamp when this document was uploaded.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    DocumentRequirement: z.string().nullable().describe(`
        * * Field Name: DocumentRequirement
        * * Display Name: Document Requirement
        * * SQL Data Type: nvarchar(255)`),
    File: z.string().describe(`
        * * Field Name: File
        * * Display Name: File
        * * SQL Data Type: nvarchar(500)`),
    UploadedByUser: z.string().describe(`
        * * Field Name: UploadedByUser
        * * Display Name: Uploaded By User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCredentialingEvidenceDocumentEntityType = z.infer<typeof mjBizAppsCredentialingEvidenceDocumentSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Extractions
 */
export const mjBizAppsCredentialingExtractionSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    EvidenceDocumentID: z.string().describe(`
        * * Field Name: EvidenceDocumentID
        * * Display Name: Evidence Document ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Evidence Documents (vwEvidenceDocuments.ID)
        * * Description: The evidence document this extraction was read from.`),
    StandardID: z.string().describe(`
        * * Field Name: StandardID
        * * Display Name: Standard ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Standards (vwStandards.ID)
        * * Description: The standard this extraction addresses.`),
    SubjectID: z.string().describe(`
        * * Field Name: SubjectID
        * * Display Name: Subject ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
        * * Description: The subject of the evidence document, server-set.`),
    Value: z.string().describe(`
        * * Field Name: Value
        * * Display Name: Value
        * * SQL Data Type: nvarchar(MAX)
        * * Description: The drafted answer extracted for the standard.`),
    Excerpt: z.string().describe(`
        * * Field Name: Excerpt
        * * Display Name: Excerpt
        * * SQL Data Type: nvarchar(MAX)
        * * Description: Verbatim quote from the document's ExtractedText supporting this extraction.`),
    StartOffset: z.number().describe(`
        * * Field Name: StartOffset
        * * Display Name: Start Offset
        * * SQL Data Type: int
        * * Description: Zero-based character start offset of Excerpt within ExtractedText.`),
    EndOffset: z.number().describe(`
        * * Field Name: EndOffset
        * * Display Name: End Offset
        * * SQL Data Type: int
        * * Description: Exclusive character end offset of Excerpt within ExtractedText.`),
    PageReference: z.string().nullable().describe(`
        * * Field Name: PageReference
        * * Display Name: Page Reference
        * * SQL Data Type: nvarchar(50)
        * * Description: Page number or label where the excerpt appears, when known.`),
    HeadingPath: z.string().nullable().describe(`
        * * Field Name: HeadingPath
        * * Display Name: Heading Path
        * * SQL Data Type: nvarchar(1000)
        * * Description: Section heading path enclosing the excerpt, when known.`),
    Confidence: z.number().describe(`
        * * Field Name: Confidence
        * * Display Name: Confidence
        * * SQL Data Type: decimal(5, 4)
        * * Description: Reader confidence score between 0 and 1.`),
    Reasoning: z.string().nullable().describe(`
        * * Field Name: Reasoning
        * * Display Name: Reasoning
        * * SQL Data Type: nvarchar(MAX)
        * * Description: Explanation of how the excerpt supports the extracted value.`),
    Status: z.union([z.literal('Accepted'), z.literal('Proposed'), z.literal('Rejected')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Proposed
    * * Value List Type: List
    * * Possible Values 
    *   * Accepted
    *   * Proposed
    *   * Rejected
        * * Description: Review state of this extraction.`),
    IsSuperseded: z.boolean().describe(`
        * * Field Name: IsSuperseded
        * * Display Name: Is Superseded
        * * SQL Data Type: bit
        * * Default Value: 0
        * * Description: Whether a newer reading superseded this extraction.`),
    AIPromptRunID: z.string().nullable().describe(`
        * * Field Name: AIPromptRunID
        * * Display Name: AI Prompt Run ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: AI Prompt Runs (vwAIPromptRuns.ID)
        * * Description: The MemberJunction AI prompt run that produced this extraction, or NULL for test readers.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    AIPromptRun: z.string().nullable().describe(`
        * * Field Name: AIPromptRun
        * * Display Name: AI Prompt Run
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCredentialingExtractionEntityType = z.infer<typeof mjBizAppsCredentialingExtractionSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Organization Memberships
 */
export const mjBizAppsCredentialingOrganizationMembershipSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    AccreditingOrganizationID: z.string().describe(`
        * * Field Name: AccreditingOrganizationID
        * * Display Name: Accrediting Organization ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Accrediting Organizations (vwAccreditingOrganizations.ID)
        * * Description: The accrediting organization the person belongs to.`),
    UserID: z.string().describe(`
        * * Field Name: UserID
        * * Display Name: User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
        * * Description: The user who is a staff member of the organization.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    AccreditingOrganization: z.string().describe(`
        * * Field Name: AccreditingOrganization
        * * Display Name: Accrediting Organization
        * * SQL Data Type: nvarchar(255)`),
    User: z.string().describe(`
        * * Field Name: User
        * * Display Name: User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCredentialingOrganizationMembershipEntityType = z.infer<typeof mjBizAppsCredentialingOrganizationMembershipSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Program Versions
 */
export const mjBizAppsCredentialingProgramVersionSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    ProgramID: z.string().describe(`
        * * Field Name: ProgramID
        * * Display Name: Program ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Programs (vwPrograms.ID)
        * * Description: The program this version belongs to.`),
    Label: z.string().describe(`
        * * Field Name: Label
        * * Display Name: Label
        * * SQL Data Type: nvarchar(50)
        * * Description: The name of the version, for example "2027", unique within its program.`),
    Status: z.union([z.literal('Active'), z.literal('Draft'), z.literal('Retired')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Draft
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Draft
    *   * Retired
        * * Description: Where the version is in its life. A Draft can be edited, an Active version is frozen and accepts applications, a Retired version accepts none.`),
    ActivatedAt: z.date().nullable().describe(`
        * * Field Name: ActivatedAt
        * * Display Name: Activated At
        * * SQL Data Type: datetimeoffset
        * * Description: When the version was activated.`),
    RetiredAt: z.date().nullable().describe(`
        * * Field Name: RetiredAt
        * * Display Name: Retired At
        * * SQL Data Type: datetimeoffset
        * * Description: When the version was retired.`),
    ClonedFromVersionID: z.string().nullable().describe(`
        * * Field Name: ClonedFromVersionID
        * * Display Name: Cloned From Version ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
        * * Description: The version this one was copied from, when it was started with "Edit in draft".`),
    CommitteeID: z.string().nullable().describe(`
        * * Field Name: CommitteeID
        * * Display Name: Committee ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: Committees: Committees (vwCommittees.ID)
        * * Description: The committee that decides applications to this version. Required before the version can be activated.`),
    PeerReviewerCount: z.number().describe(`
        * * Field Name: PeerReviewerCount
        * * Display Name: Peer Reviewer Count
        * * SQL Data Type: int
        * * Default Value: 2
        * * Description: How many peer reviewers are assigned to each application. Fixed once the version is active.`),
    PassiveApprovalWindowDays: z.number().describe(`
        * * Field Name: PassiveApprovalWindowDays
        * * Display Name: Passive Approval Window Days
        * * SQL Data Type: int
        * * Default Value: 14
        * * Description: How many days committee members have to object before a recommendation stands. Fixed once the version is active.`),
    RequiresScreening: z.boolean().describe(`
        * * Field Name: RequiresScreening
        * * Display Name: Requires Screening
        * * SQL Data Type: bit
        * * Default Value: 0
        * * Description: Whether staff screen an application for completeness before review begins. Fixed once the version is active.`),
    RequiresExecutiveApproval: z.boolean().describe(`
        * * Field Name: RequiresExecutiveApproval
        * * Display Name: Requires Executive Approval
        * * SQL Data Type: bit
        * * Default Value: 1
        * * Description: Whether an executive must approve the decision before it is issued. Fixed once the version is active.`),
    RequiresGoverningBodyAttestation: z.boolean().describe(`
        * * Field Name: RequiresGoverningBodyAttestation
        * * Display Name: Requires Governing Body Attestation
        * * SQL Data Type: bit
        * * Default Value: 0
        * * Description: Whether the applicant's governing body must attest to the application. Fixed once the version is active.`),
    MinimumAgreeRate: z.number().describe(`
        * * Field Name: MinimumAgreeRate
        * * Display Name: Minimum Agree Rate
        * * SQL Data Type: decimal(5, 4)
        * * Default Value: 0.9000
        * * Description: The share of reviewer reactions that must agree with AI findings before a standard may be promoted to a more automated evaluation mode, from 0 to 1. Fixed once the version is active.`),
    MinimumObservations: z.number().describe(`
        * * Field Name: MinimumObservations
        * * Display Name: Minimum Observations
        * * SQL Data Type: int
        * * Default Value: 30
        * * Description: How many reviewed findings a standard needs before it may be promoted. Fixed once the version is active.`),
    MinimumReviewers: z.number().describe(`
        * * Field Name: MinimumReviewers
        * * Display Name: Minimum Reviewers
        * * SQL Data Type: int
        * * Default Value: 3
        * * Description: How many different reviewers must have reacted to a standard's findings before it may be promoted. Fixed once the version is active.`),
    MinimumReplayFloor: z.number().describe(`
        * * Field Name: MinimumReplayFloor
        * * Display Name: Minimum Replay Floor
        * * SQL Data Type: decimal(5, 4)
        * * Default Value: 0.8500
        * * Description: The lowest agreement rate on replayed past decisions that still allows promotion, from 0 to 1. Fixed once the version is active.`),
    AgentObservationsVisibleToReviewers: z.boolean().describe(`
        * * Field Name: AgentObservationsVisibleToReviewers
        * * Display Name: Agent Observations Visible To Reviewers
        * * SQL Data Type: bit
        * * Default Value: 0
        * * Description: Whether reviewers see AI observations. Can be changed while the version is active.`),
    PromotionEnabled: z.boolean().describe(`
        * * Field Name: PromotionEnabled
        * * Display Name: Promotion Enabled
        * * SQL Data Type: bit
        * * Default Value: 0
        * * Description: Whether standards in this version may be promoted to more automated evaluation modes. Can be changed while the version is active.`),
    AutoCarryForwardOnRenewal: z.boolean().describe(`
        * * Field Name: AutoCarryForwardOnRenewal
        * * Display Name: Auto Carry Forward On Renewal
        * * SQL Data Type: bit
        * * Default Value: 1
        * * Description: Whether a renewal application starts with the answers from the previous one. Can be changed while the version is active.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    Program: z.string().describe(`
        * * Field Name: Program
        * * Display Name: Program
        * * SQL Data Type: nvarchar(255)`),
    Committee: z.string().nullable().describe(`
        * * Field Name: Committee
        * * Display Name: Committee
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCredentialingProgramVersionEntityType = z.infer<typeof mjBizAppsCredentialingProgramVersionSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Programs
 */
export const mjBizAppsCredentialingProgramSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    AccreditingOrganizationID: z.string().describe(`
        * * Field Name: AccreditingOrganizationID
        * * Display Name: Accrediting Organization ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Accrediting Organizations (vwAccreditingOrganizations.ID)
        * * Description: The accrediting organization that owns this program. It cannot be changed after the program is created.`),
    Name: z.string().describe(`
        * * Field Name: Name
        * * Display Name: Name
        * * SQL Data Type: nvarchar(255)
        * * Description: The name of the program, unique within its organization.`),
    Description: z.string().nullable().describe(`
        * * Field Name: Description
        * * Display Name: Description
        * * SQL Data Type: nvarchar(MAX)
        * * Description: What the program recognizes and who it is for.`),
    ProgramType: z.union([z.literal('Accreditation'), z.literal('Certification'), z.literal('License'), z.literal('Recognition')]).describe(`
        * * Field Name: ProgramType
        * * Display Name: Program Type
        * * SQL Data Type: nvarchar(20)
    * * Value List Type: List
    * * Possible Values 
    *   * Accreditation
    *   * Certification
    *   * License
    *   * Recognition
        * * Description: The kind of credential the program awards.`),
    SubjectType: z.union([z.literal('Organization'), z.literal('Person')]).describe(`
        * * Field Name: SubjectType
        * * Display Name: Subject Type
        * * SQL Data Type: nvarchar(20)
    * * Value List Type: List
    * * Possible Values 
    *   * Organization
    *   * Person
        * * Description: Whether the program credentials people or organizations.`),
    SubjectNoun: z.string().describe(`
        * * Field Name: SubjectNoun
        * * Display Name: Subject Noun
        * * SQL Data Type: nvarchar(100)
        * * Description: The word used on screen for what is credentialed, for example "facility" or "professional".`),
    CredentialPrefix: z.string().describe(`
        * * Field Name: CredentialPrefix
        * * Display Name: Credential Prefix
        * * SQL Data Type: nvarchar(20)
        * * Description: The prefix of credential numbers issued by this program, unique within its organization.`),
    HostEntityID: z.string().nullable().describe(`
        * * Field Name: HostEntityID
        * * Display Name: Host Entity ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Entities (vwEntities.ID)
        * * Description: The host system entity whose records are the subjects of this program, when subjects come from the host.`),
    Status: z.union([z.literal('Active'), z.literal('Retired')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Active
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Retired
        * * Description: Whether the program is offered. A retired program keeps its history but accepts no new applications.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    AccreditingOrganization: z.string().describe(`
        * * Field Name: AccreditingOrganization
        * * Display Name: Accrediting Organization
        * * SQL Data Type: nvarchar(255)`),
    HostEntity: z.string().nullable().describe(`
        * * Field Name: HostEntity
        * * Display Name: Host Entity
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCredentialingProgramEntityType = z.infer<typeof mjBizAppsCredentialingProgramSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Response Citations
 */
export const mjBizAppsCredentialingResponseCitationSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    StandardResponseID: z.string().describe(`
        * * Field Name: StandardResponseID
        * * Display Name: Standard Response ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Standard Responses (vwStandardResponses.ID)
        * * Description: The standard response supported by this citation.`),
    SubjectID: z.string().describe(`
        * * Field Name: SubjectID
        * * Display Name: Subject ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
        * * Description: The subject of the application, server-set.`),
    EvidenceDocumentID: z.string().describe(`
        * * Field Name: EvidenceDocumentID
        * * Display Name: Evidence Document ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Evidence Documents (vwEvidenceDocuments.ID)
        * * Description: The evidence document cited.`),
    ExtractionID: z.string().nullable().describe(`
        * * Field Name: ExtractionID
        * * Display Name: Extraction ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Extractions (vwExtractions.ID)
        * * Description: The extraction that supplied this citation, when created by document reading.`),
    SourceLabel: z.string().describe(`
        * * Field Name: SourceLabel
        * * Display Name: Source Label
        * * SQL Data Type: nvarchar(500)
        * * Description: Display label of the cited source, such as the document file name.`),
    PageReference: z.string().nullable().describe(`
        * * Field Name: PageReference
        * * Display Name: Page Reference
        * * SQL Data Type: nvarchar(50)
        * * Description: Page number or label where the cited excerpt appears, when known.`),
    Excerpt: z.string().describe(`
        * * Field Name: Excerpt
        * * Display Name: Excerpt
        * * SQL Data Type: nvarchar(MAX)
        * * Description: Verbatim excerpt cited from the document.`),
    StartOffset: z.number().describe(`
        * * Field Name: StartOffset
        * * Display Name: Start Offset
        * * SQL Data Type: int
        * * Description: Zero-based character start offset of Excerpt within ExtractedText.`),
    EndOffset: z.number().describe(`
        * * Field Name: EndOffset
        * * Display Name: End Offset
        * * SQL Data Type: int
        * * Description: Exclusive character end offset of Excerpt within ExtractedText.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
});

export type mjBizAppsCredentialingResponseCitationEntityType = z.infer<typeof mjBizAppsCredentialingResponseCitationSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Response Sources
 */
export const mjBizAppsCredentialingResponseSourceSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    StandardID: z.string().describe(`
        * * Field Name: StandardID
        * * Display Name: Standard ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Standards (vwStandards.ID)
        * * Description: The standard this response source serves.`),
    ProgramVersionID: z.string().describe(`
        * * Field Name: ProgramVersionID
        * * Display Name: Program Version ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
        * * Description: The program version of the standard, server-set to match Standard.ProgramVersionID.`),
    SourceType: z.literal('Document Extraction').describe(`
        * * Field Name: SourceType
        * * Display Name: Source Type
        * * SQL Data Type: nvarchar(30)
    * * Value List Type: List
    * * Possible Values 
    *   * Document Extraction
        * * Description: Kind of source used to prefill or verify the standard.`),
    DocumentRequirementID: z.string().nullable().describe(`
        * * Field Name: DocumentRequirementID
        * * Display Name: Document Requirement ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Document Requirements (vwDocumentRequirements.ID)
        * * Description: The document requirement read when SourceType is Document Extraction. Must belong to the same version.`),
    Mode: z.union([z.literal('Both'), z.literal('Prefill Only'), z.literal('Verify Only')]).describe(`
        * * Field Name: Mode
        * * Display Name: Mode
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Prefill Only
    * * Value List Type: List
    * * Possible Values 
    *   * Both
    *   * Prefill Only
    *   * Verify Only
        * * Description: Whether this source is used for prefill, verification, or both.`),
    Rank: z.number().describe(`
        * * Field Name: Rank
        * * Display Name: Rank
        * * SQL Data Type: int
        * * Description: Priority rank of this source among sources for the same standard, starting at 1.`),
    Sequence: z.number().describe(`
        * * Field Name: Sequence
        * * Display Name: Sequence
        * * SQL Data Type: int
        * * Default Value: 0
        * * Description: Declaration order of this source, used as tie-break within the same rank.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    DocumentRequirement: z.string().nullable().describe(`
        * * Field Name: DocumentRequirement
        * * Display Name: Document Requirement
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCredentialingResponseSourceEntityType = z.infer<typeof mjBizAppsCredentialingResponseSourceSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Sections
 */
export const mjBizAppsCredentialingSectionSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    ProgramVersionID: z.string().describe(`
        * * Field Name: ProgramVersionID
        * * Display Name: Program Version ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
        * * Description: The program version this section belongs to.`),
    Number: z.string().describe(`
        * * Field Name: Number
        * * Display Name: Number
        * * SQL Data Type: nvarchar(20)
        * * Description: The section number shown to applicants and reviewers, unique within its version.`),
    Name: z.string().describe(`
        * * Field Name: Name
        * * Display Name: Name
        * * SQL Data Type: nvarchar(255)
        * * Description: The title of the section.`),
    Description: z.string().nullable().describe(`
        * * Field Name: Description
        * * Display Name: Description
        * * SQL Data Type: nvarchar(MAX)
        * * Description: What the standards in this section cover.`),
    Sequence: z.number().describe(`
        * * Field Name: Sequence
        * * Display Name: Sequence
        * * SQL Data Type: int
        * * Default Value: 0
        * * Description: The position of the section within its version, lowest first.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
});

export type mjBizAppsCredentialingSectionEntityType = z.infer<typeof mjBizAppsCredentialingSectionSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Standard Responses
 */
export const mjBizAppsCredentialingStandardResponseSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    ApplicationID: z.string().describe(`
        * * Field Name: ApplicationID
        * * Display Name: Application ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Applications (vwApplications.ID)
        * * Description: The application this response belongs to.`),
    StandardID: z.string().describe(`
        * * Field Name: StandardID
        * * Display Name: Standard ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Standards (vwStandards.ID)
        * * Description: The standard being answered.`),
    SubjectID: z.string().describe(`
        * * Field Name: SubjectID
        * * Display Name: Subject ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
        * * Description: The subject of the application, server-set to match Application.SubjectID.`),
    ResponseText: z.string().nullable().describe(`
        * * Field Name: ResponseText
        * * Display Name: Response Text
        * * SQL Data Type: nvarchar(MAX)
        * * Description: The current narrative or drafted answer text.`),
    SelfAssessment: z.union([z.literal('Met'), z.literal('Not Met'), z.literal('Partially Met')]).nullable().describe(`
        * * Field Name: SelfAssessment
        * * Display Name: Self Assessment
        * * SQL Data Type: nvarchar(20)
    * * Value List Type: List
    * * Possible Values 
    *   * Met
    *   * Not Met
    *   * Partially Met
        * * Description: The applicant's self-assessment of whether the standard is met.`),
    Status: z.union([z.literal('Confirmed'), z.literal('Drafted'), z.literal('Empty'), z.literal('Flagged'), z.literal('Located'), z.literal('Prefilled')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Empty
    * * Value List Type: List
    * * Possible Values 
    *   * Confirmed
    *   * Drafted
    *   * Empty
    *   * Flagged
    *   * Located
    *   * Prefilled
        * * Description: Workflow status of this response.`),
    AuthorType: z.union([z.literal('Agent'), z.literal('Human')]).describe(`
        * * Field Name: AuthorType
        * * Display Name: Author Type
        * * SQL Data Type: nvarchar(10)
        * * Default Value: Human
    * * Value List Type: List
    * * Possible Values 
    *   * Agent
    *   * Human
        * * Description: Whether the current response text was written by a human or an automated reader.`),
    LastEditedByUserID: z.string().nullable().describe(`
        * * Field Name: LastEditedByUserID
        * * Display Name: Last Edited By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
        * * Description: The user who most recently edited this response.`),
    ConfirmedByUserID: z.string().nullable().describe(`
        * * Field Name: ConfirmedByUserID
        * * Display Name: Confirmed By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
        * * Description: The subject contact who confirmed this response.`),
    ConfirmedAt: z.date().nullable().describe(`
        * * Field Name: ConfirmedAt
        * * Display Name: Confirmed At
        * * SQL Data Type: datetimeoffset
        * * Description: Timestamp when this response was confirmed.`),
    SourceType: z.literal('Document Extraction').nullable().describe(`
        * * Field Name: SourceType
        * * Display Name: Source Type
        * * SQL Data Type: nvarchar(30)
    * * Value List Type: List
    * * Possible Values 
    *   * Document Extraction
        * * Description: Kind of source that supplied a prefilled or located response.`),
    SourceLabel: z.string().nullable().describe(`
        * * Field Name: SourceLabel
        * * Display Name: Source Label
        * * SQL Data Type: nvarchar(500)
        * * Description: Human-readable label of the source shown in provenance, such as the document file name.`),
    SourceReference: z.string().nullable().describe(`
        * * Field Name: SourceReference
        * * Display Name: Source Reference
        * * SQL Data Type: nvarchar(100)
        * * Description: Identifier of the source record, such as the extraction ID.`),
    SourceRetrievedAt: z.date().nullable().describe(`
        * * Field Name: SourceRetrievedAt
        * * Display Name: Source Retrieved At
        * * SQL Data Type: datetimeoffset
        * * Description: Timestamp when the prefill or located value was retrieved from its source.`),
    SourceRawValue: z.string().nullable().describe(`
        * * Field Name: SourceRawValue
        * * Display Name: Source Raw Value
        * * SQL Data Type: nvarchar(MAX)
        * * Description: Original value resolved from the source, preserved if the applicant edits the text.`),
    IsStale: z.boolean().describe(`
        * * Field Name: IsStale
        * * Display Name: Is Stale
        * * SQL Data Type: bit
        * * Default Value: 0
        * * Description: Whether the underlying source changed after this response was drafted.`),
    ReopenReason: z.string().nullable().describe(`
        * * Field Name: ReopenReason
        * * Display Name: Reopen Reason
        * * SQL Data Type: nvarchar(MAX)
        * * Description: Staff explanation recorded when a confirmed response was reopened.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    LastEditedByUser: z.string().nullable().describe(`
        * * Field Name: LastEditedByUser
        * * Display Name: Last Edited By User
        * * SQL Data Type: nvarchar(100)`),
    ConfirmedByUser: z.string().nullable().describe(`
        * * Field Name: ConfirmedByUser
        * * Display Name: Confirmed By User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCredentialingStandardResponseEntityType = z.infer<typeof mjBizAppsCredentialingStandardResponseSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Standards
 */
export const mjBizAppsCredentialingStandardSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    SectionID: z.string().describe(`
        * * Field Name: SectionID
        * * Display Name: Section ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Sections (vwSections.ID)
        * * Description: The section this standard belongs to. It cannot be changed after the standard is created.`),
    ProgramVersionID: z.string().describe(`
        * * Field Name: ProgramVersionID
        * * Display Name: Program Version ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
        * * Description: The program version this standard belongs to. Always the version of its section.`),
    Code: z.string().describe(`
        * * Field Name: Code
        * * Display Name: Code
        * * SQL Data Type: nvarchar(50)
        * * Description: The standard's code, for example "1.2", unique within its version and stored without surrounding spaces.`),
    Statement: z.string().describe(`
        * * Field Name: Statement
        * * Display Name: Statement
        * * SQL Data Type: nvarchar(MAX)
        * * Description: The text of the requirement.`),
    Guidance: z.string().nullable().describe(`
        * * Field Name: Guidance
        * * Display Name: Guidance
        * * SQL Data Type: nvarchar(MAX)
        * * Description: Advice to applicants and reviewers on how the requirement is met and judged.`),
    ResponseType: z.union([z.literal('Attestation'), z.literal('Composite'), z.literal('Evidence'), z.literal('Narrative')]).describe(`
        * * Field Name: ResponseType
        * * Display Name: Response Type
        * * SQL Data Type: nvarchar(20)
    * * Value List Type: List
    * * Possible Values 
    *   * Attestation
    *   * Composite
    *   * Evidence
    *   * Narrative
        * * Description: What an applicant gives in answer: a yes or no attestation, a written narrative, supporting evidence, or a combination.`),
    IntakeMode: z.union([z.literal('Locate'), z.literal('Manual'), z.literal('Prefill')]).describe(`
        * * Field Name: IntakeMode
        * * Display Name: Intake Mode
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Manual
    * * Value List Type: List
    * * Possible Values 
    *   * Locate
    *   * Manual
    *   * Prefill
        * * Description: How the answer is gathered: typed by the applicant, located in their uploaded documents, or drafted for them to confirm.`),
    EvaluationMode: z.union([z.literal('AI Assisted'), z.literal('AI Automated'), z.literal('Human Only')]).describe(`
        * * Field Name: EvaluationMode
        * * Display Name: Evaluation Mode
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Human Only
    * * Value List Type: List
    * * Possible Values 
    *   * AI Assisted
    *   * AI Automated
    *   * Human Only
        * * Description: How far AI takes part in judging the answer. It is never edited directly; it changes only through evidence-gated promotion.`),
    IsInterpretive: z.boolean().describe(`
        * * Field Name: IsInterpretive
        * * Display Name: Is Interpretive
        * * SQL Data Type: bit
        * * Default Value: 0
        * * Description: Whether meeting the standard is a matter of judgment. An interpretive standard is always reviewed by people.`),
    IsEligibility: z.boolean().describe(`
        * * Field Name: IsEligibility
        * * Display Name: Is Eligibility
        * * SQL Data Type: bit
        * * Default Value: 0
        * * Description: Whether the standard decides if an applicant may apply at all.`),
    IsNewForVersion: z.boolean().describe(`
        * * Field Name: IsNewForVersion
        * * Display Name: Is New For Version
        * * SQL Data Type: bit
        * * Default Value: 0
        * * Description: Whether the standard was added in this version and so has no answer to carry forward from an earlier one.`),
    EvidenceHint: z.string().nullable().describe(`
        * * Field Name: EvidenceHint
        * * Display Name: Evidence Hint
        * * SQL Data Type: nvarchar(MAX)
        * * Description: Where the supporting evidence is usually found, for example the name of a document.`),
    LineageKey: z.string().describe(`
        * * Field Name: LineageKey
        * * Display Name: Lineage Key
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newid()
        * * Description: Identifies the same requirement across versions of a program. A copy of a standard in a later version keeps this value.`),
    Sequence: z.number().describe(`
        * * Field Name: Sequence
        * * Display Name: Sequence
        * * SQL Data Type: int
        * * Default Value: 0
        * * Description: The position of the standard within its section, lowest first.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    Section: z.string().describe(`
        * * Field Name: Section
        * * Display Name: Section
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCredentialingStandardEntityType = z.infer<typeof mjBizAppsCredentialingStandardSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Subject Contacts
 */
export const mjBizAppsCredentialingSubjectContactSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    SubjectID: z.string().describe(`
        * * Field Name: SubjectID
        * * Display Name: Subject ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
        * * Description: The credentialing subject this contact acts for.`),
    UserID: z.string().describe(`
        * * Field Name: UserID
        * * Display Name: User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
        * * Description: The MemberJunction user account of this contact.`),
    ContactRole: z.union([z.literal('Primary'), z.literal('Staff')]).describe(`
        * * Field Name: ContactRole
        * * Display Name: Contact Role
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Primary
    * * Value List Type: List
    * * Possible Values 
    *   * Primary
    *   * Staff
        * * Description: Whether this contact is the primary applicant contact or supporting staff.`),
    InvitedByUserID: z.string().describe(`
        * * Field Name: InvitedByUserID
        * * Display Name: Invited By User ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
        * * Description: The staff user who most recently invited this contact.`),
    LastInvitedAt: z.date().describe(`
        * * Field Name: LastInvitedAt
        * * Display Name: Last Invited At
        * * SQL Data Type: datetimeoffset
        * * Description: When this contact was most recently invited.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    User: z.string().describe(`
        * * Field Name: User
        * * Display Name: User
        * * SQL Data Type: nvarchar(100)`),
    InvitedByUser: z.string().describe(`
        * * Field Name: InvitedByUser
        * * Display Name: Invited By User
        * * SQL Data Type: nvarchar(100)`),
});

export type mjBizAppsCredentialingSubjectContactEntityType = z.infer<typeof mjBizAppsCredentialingSubjectContactSchema>;

/**
 * zod schema definition for the entity MJ_BizApps_Credentialing: Subjects
 */
export const mjBizAppsCredentialingSubjectSchema = z.object({
    ID: z.string().describe(`
        * * Field Name: ID
        * * Display Name: ID
        * * SQL Data Type: uniqueidentifier
        * * Default Value: newsequentialid()`),
    AccreditingOrganizationID: z.string().describe(`
        * * Field Name: AccreditingOrganizationID
        * * Display Name: Accrediting Organization ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Accrediting Organizations (vwAccreditingOrganizations.ID)
        * * Description: The accrediting organization that owns this subject record. Cannot be changed after creation.`),
    SubjectType: z.union([z.literal('Organization'), z.literal('Person')]).describe(`
        * * Field Name: SubjectType
        * * Display Name: Subject Type
        * * SQL Data Type: nvarchar(20)
    * * Value List Type: List
    * * Possible Values 
    *   * Organization
    *   * Person
        * * Description: Whether this subject is a person or an organization.`),
    DisplayName: z.string().describe(`
        * * Field Name: DisplayName
        * * Display Name: Display Name
        * * SQL Data Type: nvarchar(255)
        * * Description: The subject's name shown on applications and certificates, unique within its accrediting organization.`),
    PrimaryEmail: z.string().describe(`
        * * Field Name: PrimaryEmail
        * * Display Name: Primary Email
        * * SQL Data Type: nvarchar(255)
        * * Description: The primary contact email address for this subject.`),
    Status: z.union([z.literal('Active'), z.literal('Inactive')]).describe(`
        * * Field Name: Status
        * * Display Name: Status
        * * SQL Data Type: nvarchar(20)
        * * Default Value: Active
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Inactive
        * * Description: Whether this subject is active or inactive.`),
    PartyEntityID: z.string().nullable().describe(`
        * * Field Name: PartyEntityID
        * * Display Name: Party Entity ID
        * * SQL Data Type: uniqueidentifier
        * * Related Entity/Foreign Key: MJ: Entities (vwEntities.ID)
        * * Description: The host system entity whose record represents this subject, when linked to a host record.`),
    PartyRecordID: z.string().nullable().describe(`
        * * Field Name: PartyRecordID
        * * Display Name: Party Record ID
        * * SQL Data Type: nvarchar(450)
        * * Description: The primary key value of the host system party record referenced by PartyEntityID.`),
    __mj_CreatedAt: z.date().describe(`
        * * Field Name: __mj_CreatedAt
        * * Display Name: Created At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    __mj_UpdatedAt: z.date().describe(`
        * * Field Name: __mj_UpdatedAt
        * * Display Name: Updated At
        * * SQL Data Type: datetimeoffset
        * * Default Value: getutcdate()`),
    AccreditingOrganization: z.string().describe(`
        * * Field Name: AccreditingOrganization
        * * Display Name: Accrediting Organization
        * * SQL Data Type: nvarchar(255)`),
    PartyEntity: z.string().nullable().describe(`
        * * Field Name: PartyEntity
        * * Display Name: Party Entity
        * * SQL Data Type: nvarchar(255)`),
});

export type mjBizAppsCredentialingSubjectEntityType = z.infer<typeof mjBizAppsCredentialingSubjectSchema>;
 
 

/**
 * MJ_BizApps_Credentialing: Accrediting Organizations - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: AccreditingOrganization
 * * Base View: vwAccreditingOrganizations
 * * @description An accrediting body: the organization that owns credentialing programs and decides applications to them.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Accrediting Organizations')
export class mjBizAppsCredentialingAccreditingOrganizationEntity extends BaseEntity<mjBizAppsCredentialingAccreditingOrganizationEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Accrediting Organizations record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Accrediting Organizations record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingAccreditingOrganizationEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: OrganizationID
    * * Display Name: Organization ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Common: Organizations (vwOrganizations.ID)
    * * Description: The BizApps Common organization record for this accrediting body.
    */
    get OrganizationID(): string {
        return this.Get('OrganizationID');
    }
    set OrganizationID(value: string) {
        this.Set('OrganizationID', value);
    }

    /**
    * * Field Name: Name
    * * Display Name: Name
    * * SQL Data Type: nvarchar(255)
    * * Description: The name of the accrediting body as shown on letters and certificates.
    */
    get Name(): string {
        return this.Get('Name');
    }
    set Name(value: string) {
        this.Set('Name', value);
    }

    /**
    * * Field Name: Description
    * * Display Name: Description
    * * SQL Data Type: nvarchar(MAX)
    * * Description: What this accrediting body does and whom it accredits.
    */
    get Description(): string | null {
        return this.Get('Description');
    }
    set Description(value: string | null) {
        this.Set('Description', value);
    }

    /**
    * * Field Name: Status
    * * Display Name: Status
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Active
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Inactive
    * * Description: Whether the accrediting body is in use. An inactive body keeps its history but takes no new work.
    */
    get Status(): 'Active' | 'Inactive' {
        return this.Get('Status');
    }
    set Status(value: 'Active' | 'Inactive') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: Organization
    * * Display Name: Organization
    * * SQL Data Type: nvarchar(255)
    */
    get Organization(): string {
        return this.Get('Organization');
    }
}


/**
 * MJ_BizApps_Credentialing: Application Documents - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: ApplicationDocument
 * * Base View: vwApplicationDocuments
 * * @description Frozen join linking a submitted application to the evidence documents and attestations in effect at submission.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Application Documents')
export class mjBizAppsCredentialingApplicationDocumentEntity extends BaseEntity<mjBizAppsCredentialingApplicationDocumentEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Application Documents record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Application Documents record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingApplicationDocumentEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: ApplicationID
    * * Display Name: Application ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Applications (vwApplications.ID)
    * * Description: The submitted application this frozen document link belongs to.
    */
    get ApplicationID(): string {
        return this.Get('ApplicationID');
    }
    set ApplicationID(value: string) {
        this.Set('ApplicationID', value);
    }

    /**
    * * Field Name: SubjectID
    * * Display Name: Subject ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
    * * Description: The subject of the application, server-set to match Application.SubjectID.
    */
    get SubjectID(): string {
        return this.Get('SubjectID');
    }
    set SubjectID(value: string) {
        this.Set('SubjectID', value);
    }

    /**
    * * Field Name: EvidenceDocumentID
    * * Display Name: Evidence Document ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Evidence Documents (vwEvidenceDocuments.ID)
    * * Description: The evidence document frozen into the application, when this entry references a file.
    */
    get EvidenceDocumentID(): string | null {
        return this.Get('EvidenceDocumentID');
    }
    set EvidenceDocumentID(value: string | null) {
        this.Set('EvidenceDocumentID', value);
    }

    /**
    * * Field Name: DocumentAttestationID
    * * Display Name: Document Attestation ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Document Attestations (vwDocumentAttestations.ID)
    * * Description: The document attestation frozen into the application, when this entry references an attestation.
    */
    get DocumentAttestationID(): string | null {
        return this.Get('DocumentAttestationID');
    }
    set DocumentAttestationID(value: string | null) {
        this.Set('DocumentAttestationID', value);
    }

    /**
    * * Field Name: FrozenAt
    * * Display Name: Frozen At
    * * SQL Data Type: datetimeoffset
    * * Description: Timestamp when this document link was frozen on submission.
    */
    get FrozenAt(): Date {
        return this.Get('FrozenAt');
    }
    set FrozenAt(value: Date) {
        this.Set('FrozenAt', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }
}


/**
 * MJ_BizApps_Credentialing: Applications - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: Application
 * * Base View: vwApplications
 * * @description A subject's application for a credential under a specific active program version.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Applications')
export class mjBizAppsCredentialingApplicationEntity extends BaseEntity<mjBizAppsCredentialingApplicationEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Applications record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Applications record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingApplicationEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: SubjectID
    * * Display Name: Subject ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
    * * Description: The subject applying for the credential. Cannot be changed after creation.
    */
    get SubjectID(): string {
        return this.Get('SubjectID');
    }
    set SubjectID(value: string) {
        this.Set('SubjectID', value);
    }

    /**
    * * Field Name: ProgramVersionID
    * * Display Name: Program Version ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
    * * Description: The program version this application is judged against. Cannot be changed after creation.
    */
    get ProgramVersionID(): string {
        return this.Get('ProgramVersionID');
    }
    set ProgramVersionID(value: string) {
        this.Set('ProgramVersionID', value);
    }

    /**
    * * Field Name: Status
    * * Display Name: Status
    * * SQL Data Type: nvarchar(30)
    * * Default Value: Draft
    * * Value List Type: List
    * * Possible Values 
    *   * Closed
    *   * Committee
    *   * Decided
    *   * Draft
    *   * Executive Sign-Off
    *   * In Review
    *   * Info Requested
    *   * Screening
    *   * Submitted
    *   * Withdrawn
    * * Description: Current workflow stage of the application.
    */
    get Status(): 'Closed' | 'Committee' | 'Decided' | 'Draft' | 'Executive Sign-Off' | 'In Review' | 'Info Requested' | 'Screening' | 'Submitted' | 'Withdrawn' {
        return this.Get('Status');
    }
    set Status(value: 'Closed' | 'Committee' | 'Decided' | 'Draft' | 'Executive Sign-Off' | 'In Review' | 'Info Requested' | 'Screening' | 'Submitted' | 'Withdrawn') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: IsHistorical
    * * Display Name: Is Historical
    * * SQL Data Type: bit
    * * Default Value: 0
    * * Description: Whether this row represents imported historical application data.
    */
    get IsHistorical(): boolean {
        return this.Get('IsHistorical');
    }
    set IsHistorical(value: boolean) {
        this.Set('IsHistorical', value);
    }

    /**
    * * Field Name: SubmittedAt
    * * Display Name: Submitted At
    * * SQL Data Type: datetimeoffset
    * * Description: Server-stamped timestamp when the application was submitted.
    */
    get SubmittedAt(): Date | null {
        return this.Get('SubmittedAt');
    }
    set SubmittedAt(value: Date | null) {
        this.Set('SubmittedAt', value);
    }

    /**
    * * Field Name: SubmittedByUserID
    * * Display Name: Submitted By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    * * Description: The contact user who submitted the application.
    */
    get SubmittedByUserID(): string | null {
        return this.Get('SubmittedByUserID');
    }
    set SubmittedByUserID(value: string | null) {
        this.Set('SubmittedByUserID', value);
    }

    /**
    * * Field Name: SubmissionDispatchedAt
    * * Display Name: Submission Dispatched At
    * * SQL Data Type: datetimeoffset
    * * Description: Timestamp when all post-submission subscribers completed successfully.
    */
    get SubmissionDispatchedAt(): Date | null {
        return this.Get('SubmissionDispatchedAt');
    }
    set SubmissionDispatchedAt(value: Date | null) {
        this.Set('SubmissionDispatchedAt', value);
    }

    /**
    * * Field Name: SubmissionDispatchClaimID
    * * Display Name: Submission Dispatch Claim ID
    * * SQL Data Type: uniqueidentifier
    * * Description: Identifier of the submission-dispatch attempt currently holding the claim.
    */
    get SubmissionDispatchClaimID(): string | null {
        return this.Get('SubmissionDispatchClaimID');
    }
    set SubmissionDispatchClaimID(value: string | null) {
        this.Set('SubmissionDispatchClaimID', value);
    }

    /**
    * * Field Name: SubmissionDispatchClaimedAt
    * * Display Name: Submission Dispatch Claimed At
    * * SQL Data Type: datetimeoffset
    * * Description: Timestamp when the current submission-dispatch claim was taken.
    */
    get SubmissionDispatchClaimedAt(): Date | null {
        return this.Get('SubmissionDispatchClaimedAt');
    }
    set SubmissionDispatchClaimedAt(value: Date | null) {
        this.Set('SubmissionDispatchClaimedAt', value);
    }

    /**
    * * Field Name: SubmissionDispatchAttempts
    * * Display Name: Submission Dispatch Attempts
    * * SQL Data Type: int
    * * Default Value: 0
    * * Description: Number of submission-dispatch attempts made so far. Dispatch stops after 5.
    */
    get SubmissionDispatchAttempts(): number {
        return this.Get('SubmissionDispatchAttempts');
    }
    set SubmissionDispatchAttempts(value: number) {
        this.Set('SubmissionDispatchAttempts', value);
    }

    /**
    * * Field Name: SubmissionDispatchNote
    * * Display Name: Submission Dispatch Note
    * * SQL Data Type: nvarchar(500)
    * * Description: Staff-facing explanation recorded when submission dispatch stops retrying.
    */
    get SubmissionDispatchNote(): string | null {
        return this.Get('SubmissionDispatchNote');
    }
    set SubmissionDispatchNote(value: string | null) {
        this.Set('SubmissionDispatchNote', value);
    }

    /**
    * * Field Name: SubjectSnapshot
    * * Display Name: Subject Snapshot
    * * SQL Data Type: nvarchar(MAX)
    * * Description: JSON snapshot of the subject's display name, type, email and party reference captured at submission.
    */
    get SubjectSnapshot(): string | null {
        return this.Get('SubjectSnapshot');
    }
    set SubjectSnapshot(value: string | null) {
        this.Set('SubjectSnapshot', value);
    }

    /**
    * * Field Name: AttestationOfficerName
    * * Display Name: Attestation Officer Name
    * * SQL Data Type: nvarchar(255)
    * * Description: Name of the officer who signed the governing-body attestation.
    */
    get AttestationOfficerName(): string | null {
        return this.Get('AttestationOfficerName');
    }
    set AttestationOfficerName(value: string | null) {
        this.Set('AttestationOfficerName', value);
    }

    /**
    * * Field Name: AttestationOfficerRole
    * * Display Name: Attestation Officer Role
    * * SQL Data Type: nvarchar(255)
    * * Description: Title or role of the officer who signed the governing-body attestation.
    */
    get AttestationOfficerRole(): string | null {
        return this.Get('AttestationOfficerRole');
    }
    set AttestationOfficerRole(value: string | null) {
        this.Set('AttestationOfficerRole', value);
    }

    /**
    * * Field Name: AttestationApprovalDate
    * * Display Name: Attestation Approval Date
    * * SQL Data Type: date
    * * Description: Date the governing body approved the application.
    */
    get AttestationApprovalDate(): Date | null {
        return this.Get('AttestationApprovalDate');
    }
    set AttestationApprovalDate(value: Date | null) {
        this.Set('AttestationApprovalDate', value);
    }

    /**
    * * Field Name: AttestationStatement
    * * Display Name: Attestation Statement
    * * SQL Data Type: nvarchar(MAX)
    * * Description: Exact attestation statement presented to and signed by the contact.
    */
    get AttestationStatement(): string | null {
        return this.Get('AttestationStatement');
    }
    set AttestationStatement(value: string | null) {
        this.Set('AttestationStatement', value);
    }

    /**
    * * Field Name: AttestedByUserID
    * * Display Name: Attested By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    * * Description: The contact user who recorded the attestation.
    */
    get AttestedByUserID(): string | null {
        return this.Get('AttestedByUserID');
    }
    set AttestedByUserID(value: string | null) {
        this.Set('AttestedByUserID', value);
    }

    /**
    * * Field Name: AttestedAt
    * * Display Name: Attested At
    * * SQL Data Type: datetimeoffset
    * * Description: Timestamp when the attestation was recorded.
    */
    get AttestedAt(): Date | null {
        return this.Get('AttestedAt');
    }
    set AttestedAt(value: Date | null) {
        this.Set('AttestedAt', value);
    }

    /**
    * * Field Name: WithdrawnAt
    * * Display Name: Withdrawn At
    * * SQL Data Type: datetimeoffset
    * * Description: Timestamp when the application was withdrawn.
    */
    get WithdrawnAt(): Date | null {
        return this.Get('WithdrawnAt');
    }
    set WithdrawnAt(value: Date | null) {
        this.Set('WithdrawnAt', value);
    }

    /**
    * * Field Name: WithdrawnByUserID
    * * Display Name: Withdrawn By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    * * Description: The user who withdrew the application.
    */
    get WithdrawnByUserID(): string | null {
        return this.Get('WithdrawnByUserID');
    }
    set WithdrawnByUserID(value: string | null) {
        this.Set('WithdrawnByUserID', value);
    }

    /**
    * * Field Name: WithdrawalReason
    * * Display Name: Withdrawal Reason
    * * SQL Data Type: nvarchar(MAX)
    * * Description: Reason recorded when the application was withdrawn.
    */
    get WithdrawalReason(): string | null {
        return this.Get('WithdrawalReason');
    }
    set WithdrawalReason(value: string | null) {
        this.Set('WithdrawalReason', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: SubmittedByUser
    * * Display Name: Submitted By User
    * * SQL Data Type: nvarchar(100)
    */
    get SubmittedByUser(): string | null {
        return this.Get('SubmittedByUser');
    }

    /**
    * * Field Name: AttestedByUser
    * * Display Name: Attested By User
    * * SQL Data Type: nvarchar(100)
    */
    get AttestedByUser(): string | null {
        return this.Get('AttestedByUser');
    }

    /**
    * * Field Name: WithdrawnByUser
    * * Display Name: Withdrawn By User
    * * SQL Data Type: nvarchar(100)
    */
    get WithdrawnByUser(): string | null {
        return this.Get('WithdrawnByUser');
    }
}


/**
 * MJ_BizApps_Credentialing: Document Attestations - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: DocumentAttestation
 * * Base View: vwDocumentAttestations
 * * @description An attestation recorded by a subject contact in lieu of uploading a restricted document.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Document Attestations')
export class mjBizAppsCredentialingDocumentAttestationEntity extends BaseEntity<mjBizAppsCredentialingDocumentAttestationEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Document Attestations record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Document Attestations record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingDocumentAttestationEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: SubjectID
    * * Display Name: Subject ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
    * * Description: The subject this attestation is recorded for.
    */
    get SubjectID(): string {
        return this.Get('SubjectID');
    }
    set SubjectID(value: string) {
        this.Set('SubjectID', value);
    }

    /**
    * * Field Name: DocumentRequirementID
    * * Display Name: Document Requirement ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Document Requirements (vwDocumentRequirements.ID)
    * * Description: The document requirement satisfied by this attestation.
    */
    get DocumentRequirementID(): string {
        return this.Get('DocumentRequirementID');
    }
    set DocumentRequirementID(value: string) {
        this.Set('DocumentRequirementID', value);
    }

    /**
    * * Field Name: Statement
    * * Display Name: Statement
    * * SQL Data Type: nvarchar(MAX)
    * * Description: The statement attested to by the contact.
    */
    get Statement(): string {
        return this.Get('Statement');
    }
    set Statement(value: string) {
        this.Set('Statement', value);
    }

    /**
    * * Field Name: AttestedByUserID
    * * Display Name: Attested By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    * * Description: The user who recorded this attestation.
    */
    get AttestedByUserID(): string {
        return this.Get('AttestedByUserID');
    }
    set AttestedByUserID(value: string) {
        this.Set('AttestedByUserID', value);
    }

    /**
    * * Field Name: AttestedAt
    * * Display Name: Attested At
    * * SQL Data Type: datetimeoffset
    * * Description: Timestamp when this attestation was recorded.
    */
    get AttestedAt(): Date {
        return this.Get('AttestedAt');
    }
    set AttestedAt(value: Date) {
        this.Set('AttestedAt', value);
    }

    /**
    * * Field Name: IsSuperseded
    * * Display Name: Is Superseded
    * * SQL Data Type: bit
    * * Default Value: 0
    * * Description: Whether a later attestation or upload replaced this record.
    */
    get IsSuperseded(): boolean {
        return this.Get('IsSuperseded');
    }
    set IsSuperseded(value: boolean) {
        this.Set('IsSuperseded', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: DocumentRequirement
    * * Display Name: Document Requirement
    * * SQL Data Type: nvarchar(255)
    */
    get DocumentRequirement(): string {
        return this.Get('DocumentRequirement');
    }

    /**
    * * Field Name: AttestedByUser
    * * Display Name: Attested By User
    * * SQL Data Type: nvarchar(100)
    */
    get AttestedByUser(): string {
        return this.Get('AttestedByUser');
    }
}


/**
 * MJ_BizApps_Credentialing: Document Requirements - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: DocumentRequirement
 * * Base View: vwDocumentRequirements
 * * @description A document every applicant to a program version is asked to supply.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Document Requirements')
export class mjBizAppsCredentialingDocumentRequirementEntity extends BaseEntity<mjBizAppsCredentialingDocumentRequirementEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Document Requirements record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Document Requirements record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingDocumentRequirementEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: ProgramVersionID
    * * Display Name: Program Version ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
    * * Description: The program version this document requirement belongs to.
    */
    get ProgramVersionID(): string {
        return this.Get('ProgramVersionID');
    }
    set ProgramVersionID(value: string) {
        this.Set('ProgramVersionID', value);
    }

    /**
    * * Field Name: Name
    * * Display Name: Name
    * * SQL Data Type: nvarchar(255)
    * * Description: The name of the document, for example "Bylaws", unique within its version.
    */
    get Name(): string {
        return this.Get('Name');
    }
    set Name(value: string) {
        this.Set('Name', value);
    }

    /**
    * * Field Name: Description
    * * Display Name: Description
    * * SQL Data Type: nvarchar(MAX)
    * * Description: What the document is and what it should contain.
    */
    get Description(): string | null {
        return this.Get('Description');
    }
    set Description(value: string | null) {
        this.Set('Description', value);
    }

    /**
    * * Field Name: IsRequired
    * * Display Name: Is Required
    * * SQL Data Type: bit
    * * Default Value: 1
    * * Description: Whether an application is incomplete without this document.
    */
    get IsRequired(): boolean {
        return this.Get('IsRequired');
    }
    set IsRequired(value: boolean) {
        this.Set('IsRequired', value);
    }

    /**
    * * Field Name: SensitivityPolicy
    * * Display Name: Sensitivity Policy
    * * SQL Data Type: nvarchar(30)
    * * Default Value: Normal
    * * Value List Type: List
    * * Possible Values 
    *   * Normal
    *   * Restricted Allowed
    * * Description: Whether the applicant may mark this document restricted, so that it is handled outside the system.
    */
    get SensitivityPolicy(): 'Normal' | 'Restricted Allowed' {
        return this.Get('SensitivityPolicy');
    }
    set SensitivityPolicy(value: 'Normal' | 'Restricted Allowed') {
        this.Set('SensitivityPolicy', value);
    }

    /**
    * * Field Name: Sequence
    * * Display Name: Sequence
    * * SQL Data Type: int
    * * Default Value: 0
    * * Description: The position of the document in the list, lowest first.
    */
    get Sequence(): number {
        return this.Get('Sequence');
    }
    set Sequence(value: number) {
        this.Set('Sequence', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }
}


/**
 * MJ_BizApps_Credentialing: Evidence Documents - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: EvidenceDocument
 * * Base View: vwEvidenceDocuments
 * * @description An evidence file uploaded to a subject's document library.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Evidence Documents')
export class mjBizAppsCredentialingEvidenceDocumentEntity extends BaseEntity<mjBizAppsCredentialingEvidenceDocumentEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Evidence Documents record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Evidence Documents record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingEvidenceDocumentEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: SubjectID
    * * Display Name: Subject ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
    * * Description: The subject that owns this document. Cannot be changed after creation.
    */
    get SubjectID(): string {
        return this.Get('SubjectID');
    }
    set SubjectID(value: string) {
        this.Set('SubjectID', value);
    }

    /**
    * * Field Name: DocumentRequirementID
    * * Display Name: Document Requirement ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Document Requirements (vwDocumentRequirements.ID)
    * * Description: The document requirement this upload fulfills, or NULL for a general upload.
    */
    get DocumentRequirementID(): string | null {
        return this.Get('DocumentRequirementID');
    }
    set DocumentRequirementID(value: string | null) {
        this.Set('DocumentRequirementID', value);
    }

    /**
    * * Field Name: FileID
    * * Display Name: File ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Files (vwFiles.ID)
    * * Description: The underlying MemberJunction File record storing the uploaded bytes.
    */
    get FileID(): string {
        return this.Get('FileID');
    }
    set FileID(value: string) {
        this.Set('FileID', value);
    }

    /**
    * * Field Name: FileName
    * * Display Name: File Name
    * * SQL Data Type: nvarchar(255)
    * * Description: Sanitized original file name as uploaded.
    */
    get FileName(): string {
        return this.Get('FileName');
    }
    set FileName(value: string) {
        this.Set('FileName', value);
    }

    /**
    * * Field Name: ContentType
    * * Display Name: Content Type
    * * SQL Data Type: nvarchar(150)
    * * Description: MIME content type of the uploaded file.
    */
    get ContentType(): string {
        return this.Get('ContentType');
    }
    set ContentType(value: string) {
        this.Set('ContentType', value);
    }

    /**
    * * Field Name: SizeBytes
    * * Display Name: Size Bytes
    * * SQL Data Type: bigint
    * * Description: Size of the uploaded file in bytes.
    */
    get SizeBytes(): number {
        return this.Get('SizeBytes');
    }
    set SizeBytes(value: number) {
        this.Set('SizeBytes', value);
    }

    /**
    * * Field Name: ContentHash
    * * Display Name: Content Hash
    * * SQL Data Type: char(64)
    * * Description: Lowercase hex SHA-256 digest of the uploaded file bytes.
    */
    get ContentHash(): string {
        return this.Get('ContentHash');
    }
    set ContentHash(value: string) {
        this.Set('ContentHash', value);
    }

    /**
    * * Field Name: ExtractedText
    * * Display Name: Extracted Text
    * * SQL Data Type: nvarchar(MAX)
    * * Description: Plain text extracted or recognized from the file. Written once and never modified afterward.
    */
    get ExtractedText(): string | null {
        return this.Get('ExtractedText');
    }
    set ExtractedText(value: string | null) {
        this.Set('ExtractedText', value);
    }

    /**
    * * Field Name: TextStatus
    * * Display Name: Text Status
    * * SQL Data Type: nvarchar(30)
    * * Value List Type: List
    * * Possible Values 
    *   * Awaiting Recognition
    *   * Could Not Read
    *   * Extracted
    *   * No Text Found
    *   * Recognized
    *   * Truncated
    * * Description: Outcome of text extraction or recognition for this document.
    */
    get TextStatus(): 'Awaiting Recognition' | 'Could Not Read' | 'Extracted' | 'No Text Found' | 'Recognized' | 'Truncated' {
        return this.Get('TextStatus');
    }
    set TextStatus(value: 'Awaiting Recognition' | 'Could Not Read' | 'Extracted' | 'No Text Found' | 'Recognized' | 'Truncated') {
        this.Set('TextStatus', value);
    }

    /**
    * * Field Name: TextNote
    * * Display Name: Text Note
    * * SQL Data Type: nvarchar(500)
    * * Description: User-facing sentence explaining any text status other than Extracted.
    */
    get TextNote(): string | null {
        return this.Get('TextNote');
    }
    set TextNote(value: string | null) {
        this.Set('TextNote', value);
    }

    /**
    * * Field Name: PageCount
    * * Display Name: Page Count
    * * SQL Data Type: int
    * * Description: Page count of the document when known.
    */
    get PageCount(): number | null {
        return this.Get('PageCount');
    }
    set PageCount(value: number | null) {
        this.Set('PageCount', value);
    }

    /**
    * * Field Name: ReadingStatus
    * * Display Name: Reading Status
    * * SQL Data Type: nvarchar(30)
    * * Default Value: Pending
    * * Value List Type: List
    * * Possible Values 
    *   * Complete
    *   * Could Not Run
    *   * Failed
    *   * Not Applicable
    *   * Pending
    *   * Running
    * * Description: Current state of background evidence reading for this document.
    */
    get ReadingStatus(): 'Complete' | 'Could Not Run' | 'Failed' | 'Not Applicable' | 'Pending' | 'Running' {
        return this.Get('ReadingStatus');
    }
    set ReadingStatus(value: 'Complete' | 'Could Not Run' | 'Failed' | 'Not Applicable' | 'Pending' | 'Running') {
        this.Set('ReadingStatus', value);
    }

    /**
    * * Field Name: ReadingNote
    * * Display Name: Reading Note
    * * SQL Data Type: nvarchar(500)
    * * Description: User-facing note describing the outcome or failure of evidence reading.
    */
    get ReadingNote(): string | null {
        return this.Get('ReadingNote');
    }
    set ReadingNote(value: string | null) {
        this.Set('ReadingNote', value);
    }

    /**
    * * Field Name: ReadingClaimID
    * * Display Name: Reading Claim ID
    * * SQL Data Type: uniqueidentifier
    * * Description: Identifier of the background worker claim currently processing this document.
    */
    get ReadingClaimID(): string | null {
        return this.Get('ReadingClaimID');
    }
    set ReadingClaimID(value: string | null) {
        this.Set('ReadingClaimID', value);
    }

    /**
    * * Field Name: ReadingClaimedAt
    * * Display Name: Reading Claimed At
    * * SQL Data Type: datetimeoffset
    * * Description: Timestamp when the active reading claim was taken or last renewed.
    */
    get ReadingClaimedAt(): Date | null {
        return this.Get('ReadingClaimedAt');
    }
    set ReadingClaimedAt(value: Date | null) {
        this.Set('ReadingClaimedAt', value);
    }

    /**
    * * Field Name: ReadingAttempts
    * * Display Name: Reading Attempts
    * * SQL Data Type: int
    * * Default Value: 0
    * * Description: Number of failed or attempted reading runs. Failed reads retry up to 3 attempts.
    */
    get ReadingAttempts(): number {
        return this.Get('ReadingAttempts');
    }
    set ReadingAttempts(value: number) {
        this.Set('ReadingAttempts', value);
    }

    /**
    * * Field Name: Status
    * * Display Name: Status
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Current
    * * Value List Type: List
    * * Possible Values 
    *   * Confirm Current
    *   * Current
    *   * Superseded
    * * Description: Currency status of this document in the subject's library.
    */
    get Status(): 'Confirm Current' | 'Current' | 'Superseded' {
        return this.Get('Status');
    }
    set Status(value: 'Confirm Current' | 'Current' | 'Superseded') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: SupersedesDocumentID
    * * Display Name: Supersedes Document ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Evidence Documents (vwEvidenceDocuments.ID)
    * * Description: The prior document version that this upload replaced.
    */
    get SupersedesDocumentID(): string | null {
        return this.Get('SupersedesDocumentID');
    }
    set SupersedesDocumentID(value: string | null) {
        this.Set('SupersedesDocumentID', value);
    }

    /**
    * * Field Name: ConfirmedCurrentAt
    * * Display Name: Confirmed Current At
    * * SQL Data Type: datetimeoffset
    * * Description: Timestamp when a contact most recently confirmed this document is still current.
    */
    get ConfirmedCurrentAt(): Date | null {
        return this.Get('ConfirmedCurrentAt');
    }
    set ConfirmedCurrentAt(value: Date | null) {
        this.Set('ConfirmedCurrentAt', value);
    }

    /**
    * * Field Name: UploadedByUserID
    * * Display Name: Uploaded By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    * * Description: The user who uploaded this document.
    */
    get UploadedByUserID(): string {
        return this.Get('UploadedByUserID');
    }
    set UploadedByUserID(value: string) {
        this.Set('UploadedByUserID', value);
    }

    /**
    * * Field Name: UploadedAt
    * * Display Name: Uploaded At
    * * SQL Data Type: datetimeoffset
    * * Description: Timestamp when this document was uploaded.
    */
    get UploadedAt(): Date {
        return this.Get('UploadedAt');
    }
    set UploadedAt(value: Date) {
        this.Set('UploadedAt', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: DocumentRequirement
    * * Display Name: Document Requirement
    * * SQL Data Type: nvarchar(255)
    */
    get DocumentRequirement(): string | null {
        return this.Get('DocumentRequirement');
    }

    /**
    * * Field Name: File
    * * Display Name: File
    * * SQL Data Type: nvarchar(500)
    */
    get File(): string {
        return this.Get('File');
    }

    /**
    * * Field Name: UploadedByUser
    * * Display Name: Uploaded By User
    * * SQL Data Type: nvarchar(100)
    */
    get UploadedByUser(): string {
        return this.Get('UploadedByUser');
    }
}


/**
 * MJ_BizApps_Credentialing: Extractions - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: Extraction
 * * Base View: vwExtractions
 * * @description An extracted answer and supporting excerpt read from one evidence document for one standard.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Extractions')
export class mjBizAppsCredentialingExtractionEntity extends BaseEntity<mjBizAppsCredentialingExtractionEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Extractions record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Extractions record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingExtractionEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: EvidenceDocumentID
    * * Display Name: Evidence Document ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Evidence Documents (vwEvidenceDocuments.ID)
    * * Description: The evidence document this extraction was read from.
    */
    get EvidenceDocumentID(): string {
        return this.Get('EvidenceDocumentID');
    }
    set EvidenceDocumentID(value: string) {
        this.Set('EvidenceDocumentID', value);
    }

    /**
    * * Field Name: StandardID
    * * Display Name: Standard ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Standards (vwStandards.ID)
    * * Description: The standard this extraction addresses.
    */
    get StandardID(): string {
        return this.Get('StandardID');
    }
    set StandardID(value: string) {
        this.Set('StandardID', value);
    }

    /**
    * * Field Name: SubjectID
    * * Display Name: Subject ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
    * * Description: The subject of the evidence document, server-set.
    */
    get SubjectID(): string {
        return this.Get('SubjectID');
    }
    set SubjectID(value: string) {
        this.Set('SubjectID', value);
    }

    /**
    * * Field Name: Value
    * * Display Name: Value
    * * SQL Data Type: nvarchar(MAX)
    * * Description: The drafted answer extracted for the standard.
    */
    get Value(): string {
        return this.Get('Value');
    }
    set Value(value: string) {
        this.Set('Value', value);
    }

    /**
    * * Field Name: Excerpt
    * * Display Name: Excerpt
    * * SQL Data Type: nvarchar(MAX)
    * * Description: Verbatim quote from the document's ExtractedText supporting this extraction.
    */
    get Excerpt(): string {
        return this.Get('Excerpt');
    }
    set Excerpt(value: string) {
        this.Set('Excerpt', value);
    }

    /**
    * * Field Name: StartOffset
    * * Display Name: Start Offset
    * * SQL Data Type: int
    * * Description: Zero-based character start offset of Excerpt within ExtractedText.
    */
    get StartOffset(): number {
        return this.Get('StartOffset');
    }
    set StartOffset(value: number) {
        this.Set('StartOffset', value);
    }

    /**
    * * Field Name: EndOffset
    * * Display Name: End Offset
    * * SQL Data Type: int
    * * Description: Exclusive character end offset of Excerpt within ExtractedText.
    */
    get EndOffset(): number {
        return this.Get('EndOffset');
    }
    set EndOffset(value: number) {
        this.Set('EndOffset', value);
    }

    /**
    * * Field Name: PageReference
    * * Display Name: Page Reference
    * * SQL Data Type: nvarchar(50)
    * * Description: Page number or label where the excerpt appears, when known.
    */
    get PageReference(): string | null {
        return this.Get('PageReference');
    }
    set PageReference(value: string | null) {
        this.Set('PageReference', value);
    }

    /**
    * * Field Name: HeadingPath
    * * Display Name: Heading Path
    * * SQL Data Type: nvarchar(1000)
    * * Description: Section heading path enclosing the excerpt, when known.
    */
    get HeadingPath(): string | null {
        return this.Get('HeadingPath');
    }
    set HeadingPath(value: string | null) {
        this.Set('HeadingPath', value);
    }

    /**
    * * Field Name: Confidence
    * * Display Name: Confidence
    * * SQL Data Type: decimal(5, 4)
    * * Description: Reader confidence score between 0 and 1.
    */
    get Confidence(): number {
        return this.Get('Confidence');
    }
    set Confidence(value: number) {
        this.Set('Confidence', value);
    }

    /**
    * * Field Name: Reasoning
    * * Display Name: Reasoning
    * * SQL Data Type: nvarchar(MAX)
    * * Description: Explanation of how the excerpt supports the extracted value.
    */
    get Reasoning(): string | null {
        return this.Get('Reasoning');
    }
    set Reasoning(value: string | null) {
        this.Set('Reasoning', value);
    }

    /**
    * * Field Name: Status
    * * Display Name: Status
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Proposed
    * * Value List Type: List
    * * Possible Values 
    *   * Accepted
    *   * Proposed
    *   * Rejected
    * * Description: Review state of this extraction.
    */
    get Status(): 'Accepted' | 'Proposed' | 'Rejected' {
        return this.Get('Status');
    }
    set Status(value: 'Accepted' | 'Proposed' | 'Rejected') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: IsSuperseded
    * * Display Name: Is Superseded
    * * SQL Data Type: bit
    * * Default Value: 0
    * * Description: Whether a newer reading superseded this extraction.
    */
    get IsSuperseded(): boolean {
        return this.Get('IsSuperseded');
    }
    set IsSuperseded(value: boolean) {
        this.Set('IsSuperseded', value);
    }

    /**
    * * Field Name: AIPromptRunID
    * * Display Name: AI Prompt Run ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: AI Prompt Runs (vwAIPromptRuns.ID)
    * * Description: The MemberJunction AI prompt run that produced this extraction, or NULL for test readers.
    */
    get AIPromptRunID(): string | null {
        return this.Get('AIPromptRunID');
    }
    set AIPromptRunID(value: string | null) {
        this.Set('AIPromptRunID', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: AIPromptRun
    * * Display Name: AI Prompt Run
    * * SQL Data Type: nvarchar(255)
    */
    get AIPromptRun(): string | null {
        return this.Get('AIPromptRun');
    }
}


/**
 * MJ_BizApps_Credentialing: Organization Memberships - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: OrganizationMembership
 * * Base View: vwOrganizationMemberships
 * * @description A staff member's membership of an accrediting organization. It is what lets that person see and author the organization's programs.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Organization Memberships')
export class mjBizAppsCredentialingOrganizationMembershipEntity extends BaseEntity<mjBizAppsCredentialingOrganizationMembershipEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Organization Memberships record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Organization Memberships record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingOrganizationMembershipEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: AccreditingOrganizationID
    * * Display Name: Accrediting Organization ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Accrediting Organizations (vwAccreditingOrganizations.ID)
    * * Description: The accrediting organization the person belongs to.
    */
    get AccreditingOrganizationID(): string {
        return this.Get('AccreditingOrganizationID');
    }
    set AccreditingOrganizationID(value: string) {
        this.Set('AccreditingOrganizationID', value);
    }

    /**
    * * Field Name: UserID
    * * Display Name: User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    * * Description: The user who is a staff member of the organization.
    */
    get UserID(): string {
        return this.Get('UserID');
    }
    set UserID(value: string) {
        this.Set('UserID', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: AccreditingOrganization
    * * Display Name: Accrediting Organization
    * * SQL Data Type: nvarchar(255)
    */
    get AccreditingOrganization(): string {
        return this.Get('AccreditingOrganization');
    }

    /**
    * * Field Name: User
    * * Display Name: User
    * * SQL Data Type: nvarchar(100)
    */
    get User(): string {
        return this.Get('User');
    }
}


/**
 * MJ_BizApps_Credentialing: Program Versions - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: ProgramVersion
 * * Base View: vwProgramVersions
 * * @description One edition of a program's standards and review settings. Applications are bound to the version that was active when they started.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Program Versions')
export class mjBizAppsCredentialingProgramVersionEntity extends BaseEntity<mjBizAppsCredentialingProgramVersionEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Program Versions record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Program Versions record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingProgramVersionEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: ProgramID
    * * Display Name: Program ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Programs (vwPrograms.ID)
    * * Description: The program this version belongs to.
    */
    get ProgramID(): string {
        return this.Get('ProgramID');
    }
    set ProgramID(value: string) {
        this.Set('ProgramID', value);
    }

    /**
    * * Field Name: Label
    * * Display Name: Label
    * * SQL Data Type: nvarchar(50)
    * * Description: The name of the version, for example "2027", unique within its program.
    */
    get Label(): string {
        return this.Get('Label');
    }
    set Label(value: string) {
        this.Set('Label', value);
    }

    /**
    * * Field Name: Status
    * * Display Name: Status
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Draft
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Draft
    *   * Retired
    * * Description: Where the version is in its life. A Draft can be edited, an Active version is frozen and accepts applications, a Retired version accepts none.
    */
    get Status(): 'Active' | 'Draft' | 'Retired' {
        return this.Get('Status');
    }
    set Status(value: 'Active' | 'Draft' | 'Retired') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: ActivatedAt
    * * Display Name: Activated At
    * * SQL Data Type: datetimeoffset
    * * Description: When the version was activated.
    */
    get ActivatedAt(): Date | null {
        return this.Get('ActivatedAt');
    }
    set ActivatedAt(value: Date | null) {
        this.Set('ActivatedAt', value);
    }

    /**
    * * Field Name: RetiredAt
    * * Display Name: Retired At
    * * SQL Data Type: datetimeoffset
    * * Description: When the version was retired.
    */
    get RetiredAt(): Date | null {
        return this.Get('RetiredAt');
    }
    set RetiredAt(value: Date | null) {
        this.Set('RetiredAt', value);
    }

    /**
    * * Field Name: ClonedFromVersionID
    * * Display Name: Cloned From Version ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
    * * Description: The version this one was copied from, when it was started with "Edit in draft".
    */
    get ClonedFromVersionID(): string | null {
        return this.Get('ClonedFromVersionID');
    }
    set ClonedFromVersionID(value: string | null) {
        this.Set('ClonedFromVersionID', value);
    }

    /**
    * * Field Name: CommitteeID
    * * Display Name: Committee ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: Committees: Committees (vwCommittees.ID)
    * * Description: The committee that decides applications to this version. Required before the version can be activated.
    */
    get CommitteeID(): string | null {
        return this.Get('CommitteeID');
    }
    set CommitteeID(value: string | null) {
        this.Set('CommitteeID', value);
    }

    /**
    * * Field Name: PeerReviewerCount
    * * Display Name: Peer Reviewer Count
    * * SQL Data Type: int
    * * Default Value: 2
    * * Description: How many peer reviewers are assigned to each application. Fixed once the version is active.
    */
    get PeerReviewerCount(): number {
        return this.Get('PeerReviewerCount');
    }
    set PeerReviewerCount(value: number) {
        this.Set('PeerReviewerCount', value);
    }

    /**
    * * Field Name: PassiveApprovalWindowDays
    * * Display Name: Passive Approval Window Days
    * * SQL Data Type: int
    * * Default Value: 14
    * * Description: How many days committee members have to object before a recommendation stands. Fixed once the version is active.
    */
    get PassiveApprovalWindowDays(): number {
        return this.Get('PassiveApprovalWindowDays');
    }
    set PassiveApprovalWindowDays(value: number) {
        this.Set('PassiveApprovalWindowDays', value);
    }

    /**
    * * Field Name: RequiresScreening
    * * Display Name: Requires Screening
    * * SQL Data Type: bit
    * * Default Value: 0
    * * Description: Whether staff screen an application for completeness before review begins. Fixed once the version is active.
    */
    get RequiresScreening(): boolean {
        return this.Get('RequiresScreening');
    }
    set RequiresScreening(value: boolean) {
        this.Set('RequiresScreening', value);
    }

    /**
    * * Field Name: RequiresExecutiveApproval
    * * Display Name: Requires Executive Approval
    * * SQL Data Type: bit
    * * Default Value: 1
    * * Description: Whether an executive must approve the decision before it is issued. Fixed once the version is active.
    */
    get RequiresExecutiveApproval(): boolean {
        return this.Get('RequiresExecutiveApproval');
    }
    set RequiresExecutiveApproval(value: boolean) {
        this.Set('RequiresExecutiveApproval', value);
    }

    /**
    * * Field Name: RequiresGoverningBodyAttestation
    * * Display Name: Requires Governing Body Attestation
    * * SQL Data Type: bit
    * * Default Value: 0
    * * Description: Whether the applicant's governing body must attest to the application. Fixed once the version is active.
    */
    get RequiresGoverningBodyAttestation(): boolean {
        return this.Get('RequiresGoverningBodyAttestation');
    }
    set RequiresGoverningBodyAttestation(value: boolean) {
        this.Set('RequiresGoverningBodyAttestation', value);
    }

    /**
    * * Field Name: MinimumAgreeRate
    * * Display Name: Minimum Agree Rate
    * * SQL Data Type: decimal(5, 4)
    * * Default Value: 0.9000
    * * Description: The share of reviewer reactions that must agree with AI findings before a standard may be promoted to a more automated evaluation mode, from 0 to 1. Fixed once the version is active.
    */
    get MinimumAgreeRate(): number {
        return this.Get('MinimumAgreeRate');
    }
    set MinimumAgreeRate(value: number) {
        this.Set('MinimumAgreeRate', value);
    }

    /**
    * * Field Name: MinimumObservations
    * * Display Name: Minimum Observations
    * * SQL Data Type: int
    * * Default Value: 30
    * * Description: How many reviewed findings a standard needs before it may be promoted. Fixed once the version is active.
    */
    get MinimumObservations(): number {
        return this.Get('MinimumObservations');
    }
    set MinimumObservations(value: number) {
        this.Set('MinimumObservations', value);
    }

    /**
    * * Field Name: MinimumReviewers
    * * Display Name: Minimum Reviewers
    * * SQL Data Type: int
    * * Default Value: 3
    * * Description: How many different reviewers must have reacted to a standard's findings before it may be promoted. Fixed once the version is active.
    */
    get MinimumReviewers(): number {
        return this.Get('MinimumReviewers');
    }
    set MinimumReviewers(value: number) {
        this.Set('MinimumReviewers', value);
    }

    /**
    * * Field Name: MinimumReplayFloor
    * * Display Name: Minimum Replay Floor
    * * SQL Data Type: decimal(5, 4)
    * * Default Value: 0.8500
    * * Description: The lowest agreement rate on replayed past decisions that still allows promotion, from 0 to 1. Fixed once the version is active.
    */
    get MinimumReplayFloor(): number {
        return this.Get('MinimumReplayFloor');
    }
    set MinimumReplayFloor(value: number) {
        this.Set('MinimumReplayFloor', value);
    }

    /**
    * * Field Name: AgentObservationsVisibleToReviewers
    * * Display Name: Agent Observations Visible To Reviewers
    * * SQL Data Type: bit
    * * Default Value: 0
    * * Description: Whether reviewers see AI observations. Can be changed while the version is active.
    */
    get AgentObservationsVisibleToReviewers(): boolean {
        return this.Get('AgentObservationsVisibleToReviewers');
    }
    set AgentObservationsVisibleToReviewers(value: boolean) {
        this.Set('AgentObservationsVisibleToReviewers', value);
    }

    /**
    * * Field Name: PromotionEnabled
    * * Display Name: Promotion Enabled
    * * SQL Data Type: bit
    * * Default Value: 0
    * * Description: Whether standards in this version may be promoted to more automated evaluation modes. Can be changed while the version is active.
    */
    get PromotionEnabled(): boolean {
        return this.Get('PromotionEnabled');
    }
    set PromotionEnabled(value: boolean) {
        this.Set('PromotionEnabled', value);
    }

    /**
    * * Field Name: AutoCarryForwardOnRenewal
    * * Display Name: Auto Carry Forward On Renewal
    * * SQL Data Type: bit
    * * Default Value: 1
    * * Description: Whether a renewal application starts with the answers from the previous one. Can be changed while the version is active.
    */
    get AutoCarryForwardOnRenewal(): boolean {
        return this.Get('AutoCarryForwardOnRenewal');
    }
    set AutoCarryForwardOnRenewal(value: boolean) {
        this.Set('AutoCarryForwardOnRenewal', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: Program
    * * Display Name: Program
    * * SQL Data Type: nvarchar(255)
    */
    get Program(): string {
        return this.Get('Program');
    }

    /**
    * * Field Name: Committee
    * * Display Name: Committee
    * * SQL Data Type: nvarchar(255)
    */
    get Committee(): string | null {
        return this.Get('Committee');
    }
}


/**
 * MJ_BizApps_Credentialing: Programs - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: Program
 * * Base View: vwPrograms
 * * @description A credentialing program: one credential an accrediting organization offers, such as a certification or an accreditation.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Programs')
export class mjBizAppsCredentialingProgramEntity extends BaseEntity<mjBizAppsCredentialingProgramEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Programs record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Programs record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingProgramEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: AccreditingOrganizationID
    * * Display Name: Accrediting Organization ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Accrediting Organizations (vwAccreditingOrganizations.ID)
    * * Description: The accrediting organization that owns this program. It cannot be changed after the program is created.
    */
    get AccreditingOrganizationID(): string {
        return this.Get('AccreditingOrganizationID');
    }
    set AccreditingOrganizationID(value: string) {
        this.Set('AccreditingOrganizationID', value);
    }

    /**
    * * Field Name: Name
    * * Display Name: Name
    * * SQL Data Type: nvarchar(255)
    * * Description: The name of the program, unique within its organization.
    */
    get Name(): string {
        return this.Get('Name');
    }
    set Name(value: string) {
        this.Set('Name', value);
    }

    /**
    * * Field Name: Description
    * * Display Name: Description
    * * SQL Data Type: nvarchar(MAX)
    * * Description: What the program recognizes and who it is for.
    */
    get Description(): string | null {
        return this.Get('Description');
    }
    set Description(value: string | null) {
        this.Set('Description', value);
    }

    /**
    * * Field Name: ProgramType
    * * Display Name: Program Type
    * * SQL Data Type: nvarchar(20)
    * * Value List Type: List
    * * Possible Values 
    *   * Accreditation
    *   * Certification
    *   * License
    *   * Recognition
    * * Description: The kind of credential the program awards.
    */
    get ProgramType(): 'Accreditation' | 'Certification' | 'License' | 'Recognition' {
        return this.Get('ProgramType');
    }
    set ProgramType(value: 'Accreditation' | 'Certification' | 'License' | 'Recognition') {
        this.Set('ProgramType', value);
    }

    /**
    * * Field Name: SubjectType
    * * Display Name: Subject Type
    * * SQL Data Type: nvarchar(20)
    * * Value List Type: List
    * * Possible Values 
    *   * Organization
    *   * Person
    * * Description: Whether the program credentials people or organizations.
    */
    get SubjectType(): 'Organization' | 'Person' {
        return this.Get('SubjectType');
    }
    set SubjectType(value: 'Organization' | 'Person') {
        this.Set('SubjectType', value);
    }

    /**
    * * Field Name: SubjectNoun
    * * Display Name: Subject Noun
    * * SQL Data Type: nvarchar(100)
    * * Description: The word used on screen for what is credentialed, for example "facility" or "professional".
    */
    get SubjectNoun(): string {
        return this.Get('SubjectNoun');
    }
    set SubjectNoun(value: string) {
        this.Set('SubjectNoun', value);
    }

    /**
    * * Field Name: CredentialPrefix
    * * Display Name: Credential Prefix
    * * SQL Data Type: nvarchar(20)
    * * Description: The prefix of credential numbers issued by this program, unique within its organization.
    */
    get CredentialPrefix(): string {
        return this.Get('CredentialPrefix');
    }
    set CredentialPrefix(value: string) {
        this.Set('CredentialPrefix', value);
    }

    /**
    * * Field Name: HostEntityID
    * * Display Name: Host Entity ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Entities (vwEntities.ID)
    * * Description: The host system entity whose records are the subjects of this program, when subjects come from the host.
    */
    get HostEntityID(): string | null {
        return this.Get('HostEntityID');
    }
    set HostEntityID(value: string | null) {
        this.Set('HostEntityID', value);
    }

    /**
    * * Field Name: Status
    * * Display Name: Status
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Active
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Retired
    * * Description: Whether the program is offered. A retired program keeps its history but accepts no new applications.
    */
    get Status(): 'Active' | 'Retired' {
        return this.Get('Status');
    }
    set Status(value: 'Active' | 'Retired') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: AccreditingOrganization
    * * Display Name: Accrediting Organization
    * * SQL Data Type: nvarchar(255)
    */
    get AccreditingOrganization(): string {
        return this.Get('AccreditingOrganization');
    }

    /**
    * * Field Name: HostEntity
    * * Display Name: Host Entity
    * * SQL Data Type: nvarchar(255)
    */
    get HostEntity(): string | null {
        return this.Get('HostEntity');
    }
}


/**
 * MJ_BizApps_Credentialing: Response Citations - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: ResponseCitation
 * * Base View: vwResponseCitations
 * * @description A document citation attached to a standard response.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Response Citations')
export class mjBizAppsCredentialingResponseCitationEntity extends BaseEntity<mjBizAppsCredentialingResponseCitationEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Response Citations record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Response Citations record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingResponseCitationEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: StandardResponseID
    * * Display Name: Standard Response ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Standard Responses (vwStandardResponses.ID)
    * * Description: The standard response supported by this citation.
    */
    get StandardResponseID(): string {
        return this.Get('StandardResponseID');
    }
    set StandardResponseID(value: string) {
        this.Set('StandardResponseID', value);
    }

    /**
    * * Field Name: SubjectID
    * * Display Name: Subject ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
    * * Description: The subject of the application, server-set.
    */
    get SubjectID(): string {
        return this.Get('SubjectID');
    }
    set SubjectID(value: string) {
        this.Set('SubjectID', value);
    }

    /**
    * * Field Name: EvidenceDocumentID
    * * Display Name: Evidence Document ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Evidence Documents (vwEvidenceDocuments.ID)
    * * Description: The evidence document cited.
    */
    get EvidenceDocumentID(): string {
        return this.Get('EvidenceDocumentID');
    }
    set EvidenceDocumentID(value: string) {
        this.Set('EvidenceDocumentID', value);
    }

    /**
    * * Field Name: ExtractionID
    * * Display Name: Extraction ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Extractions (vwExtractions.ID)
    * * Description: The extraction that supplied this citation, when created by document reading.
    */
    get ExtractionID(): string | null {
        return this.Get('ExtractionID');
    }
    set ExtractionID(value: string | null) {
        this.Set('ExtractionID', value);
    }

    /**
    * * Field Name: SourceLabel
    * * Display Name: Source Label
    * * SQL Data Type: nvarchar(500)
    * * Description: Display label of the cited source, such as the document file name.
    */
    get SourceLabel(): string {
        return this.Get('SourceLabel');
    }
    set SourceLabel(value: string) {
        this.Set('SourceLabel', value);
    }

    /**
    * * Field Name: PageReference
    * * Display Name: Page Reference
    * * SQL Data Type: nvarchar(50)
    * * Description: Page number or label where the cited excerpt appears, when known.
    */
    get PageReference(): string | null {
        return this.Get('PageReference');
    }
    set PageReference(value: string | null) {
        this.Set('PageReference', value);
    }

    /**
    * * Field Name: Excerpt
    * * Display Name: Excerpt
    * * SQL Data Type: nvarchar(MAX)
    * * Description: Verbatim excerpt cited from the document.
    */
    get Excerpt(): string {
        return this.Get('Excerpt');
    }
    set Excerpt(value: string) {
        this.Set('Excerpt', value);
    }

    /**
    * * Field Name: StartOffset
    * * Display Name: Start Offset
    * * SQL Data Type: int
    * * Description: Zero-based character start offset of Excerpt within ExtractedText.
    */
    get StartOffset(): number {
        return this.Get('StartOffset');
    }
    set StartOffset(value: number) {
        this.Set('StartOffset', value);
    }

    /**
    * * Field Name: EndOffset
    * * Display Name: End Offset
    * * SQL Data Type: int
    * * Description: Exclusive character end offset of Excerpt within ExtractedText.
    */
    get EndOffset(): number {
        return this.Get('EndOffset');
    }
    set EndOffset(value: number) {
        this.Set('EndOffset', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }
}


/**
 * MJ_BizApps_Credentialing: Response Sources - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: ResponseSource
 * * Base View: vwResponseSources
 * * @description An authoring-time source rule specifying where prefill or verification data for a standard comes from.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Response Sources')
export class mjBizAppsCredentialingResponseSourceEntity extends BaseEntity<mjBizAppsCredentialingResponseSourceEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Response Sources record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Response Sources record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingResponseSourceEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: StandardID
    * * Display Name: Standard ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Standards (vwStandards.ID)
    * * Description: The standard this response source serves.
    */
    get StandardID(): string {
        return this.Get('StandardID');
    }
    set StandardID(value: string) {
        this.Set('StandardID', value);
    }

    /**
    * * Field Name: ProgramVersionID
    * * Display Name: Program Version ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
    * * Description: The program version of the standard, server-set to match Standard.ProgramVersionID.
    */
    get ProgramVersionID(): string {
        return this.Get('ProgramVersionID');
    }
    set ProgramVersionID(value: string) {
        this.Set('ProgramVersionID', value);
    }

    /**
    * * Field Name: SourceType
    * * Display Name: Source Type
    * * SQL Data Type: nvarchar(30)
    * * Value List Type: List
    * * Possible Values 
    *   * Document Extraction
    * * Description: Kind of source used to prefill or verify the standard.
    */
    get SourceType(): 'Document Extraction' {
        return this.Get('SourceType');
    }
    set SourceType(value: 'Document Extraction') {
        this.Set('SourceType', value);
    }

    /**
    * * Field Name: DocumentRequirementID
    * * Display Name: Document Requirement ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Document Requirements (vwDocumentRequirements.ID)
    * * Description: The document requirement read when SourceType is Document Extraction. Must belong to the same version.
    */
    get DocumentRequirementID(): string | null {
        return this.Get('DocumentRequirementID');
    }
    set DocumentRequirementID(value: string | null) {
        this.Set('DocumentRequirementID', value);
    }

    /**
    * * Field Name: Mode
    * * Display Name: Mode
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Prefill Only
    * * Value List Type: List
    * * Possible Values 
    *   * Both
    *   * Prefill Only
    *   * Verify Only
    * * Description: Whether this source is used for prefill, verification, or both.
    */
    get Mode(): 'Both' | 'Prefill Only' | 'Verify Only' {
        return this.Get('Mode');
    }
    set Mode(value: 'Both' | 'Prefill Only' | 'Verify Only') {
        this.Set('Mode', value);
    }

    /**
    * * Field Name: Rank
    * * Display Name: Rank
    * * SQL Data Type: int
    * * Description: Priority rank of this source among sources for the same standard, starting at 1.
    */
    get Rank(): number {
        return this.Get('Rank');
    }
    set Rank(value: number) {
        this.Set('Rank', value);
    }

    /**
    * * Field Name: Sequence
    * * Display Name: Sequence
    * * SQL Data Type: int
    * * Default Value: 0
    * * Description: Declaration order of this source, used as tie-break within the same rank.
    */
    get Sequence(): number {
        return this.Get('Sequence');
    }
    set Sequence(value: number) {
        this.Set('Sequence', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: DocumentRequirement
    * * Display Name: Document Requirement
    * * SQL Data Type: nvarchar(255)
    */
    get DocumentRequirement(): string | null {
        return this.Get('DocumentRequirement');
    }
}


/**
 * MJ_BizApps_Credentialing: Sections - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: Section
 * * Base View: vwSections
 * * @description A numbered group of standards within a program version.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Sections')
export class mjBizAppsCredentialingSectionEntity extends BaseEntity<mjBizAppsCredentialingSectionEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Sections record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Sections record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingSectionEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: ProgramVersionID
    * * Display Name: Program Version ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
    * * Description: The program version this section belongs to.
    */
    get ProgramVersionID(): string {
        return this.Get('ProgramVersionID');
    }
    set ProgramVersionID(value: string) {
        this.Set('ProgramVersionID', value);
    }

    /**
    * * Field Name: Number
    * * Display Name: Number
    * * SQL Data Type: nvarchar(20)
    * * Description: The section number shown to applicants and reviewers, unique within its version.
    */
    get Number(): string {
        return this.Get('Number');
    }
    set Number(value: string) {
        this.Set('Number', value);
    }

    /**
    * * Field Name: Name
    * * Display Name: Name
    * * SQL Data Type: nvarchar(255)
    * * Description: The title of the section.
    */
    get Name(): string {
        return this.Get('Name');
    }
    set Name(value: string) {
        this.Set('Name', value);
    }

    /**
    * * Field Name: Description
    * * Display Name: Description
    * * SQL Data Type: nvarchar(MAX)
    * * Description: What the standards in this section cover.
    */
    get Description(): string | null {
        return this.Get('Description');
    }
    set Description(value: string | null) {
        this.Set('Description', value);
    }

    /**
    * * Field Name: Sequence
    * * Display Name: Sequence
    * * SQL Data Type: int
    * * Default Value: 0
    * * Description: The position of the section within its version, lowest first.
    */
    get Sequence(): number {
        return this.Get('Sequence');
    }
    set Sequence(value: number) {
        this.Set('Sequence', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }
}


/**
 * MJ_BizApps_Credentialing: Standard Responses - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: StandardResponse
 * * Base View: vwStandardResponses
 * * @description An applicant's response to one standard within an application.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Standard Responses')
export class mjBizAppsCredentialingStandardResponseEntity extends BaseEntity<mjBizAppsCredentialingStandardResponseEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Standard Responses record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Standard Responses record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingStandardResponseEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: ApplicationID
    * * Display Name: Application ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Applications (vwApplications.ID)
    * * Description: The application this response belongs to.
    */
    get ApplicationID(): string {
        return this.Get('ApplicationID');
    }
    set ApplicationID(value: string) {
        this.Set('ApplicationID', value);
    }

    /**
    * * Field Name: StandardID
    * * Display Name: Standard ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Standards (vwStandards.ID)
    * * Description: The standard being answered.
    */
    get StandardID(): string {
        return this.Get('StandardID');
    }
    set StandardID(value: string) {
        this.Set('StandardID', value);
    }

    /**
    * * Field Name: SubjectID
    * * Display Name: Subject ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
    * * Description: The subject of the application, server-set to match Application.SubjectID.
    */
    get SubjectID(): string {
        return this.Get('SubjectID');
    }
    set SubjectID(value: string) {
        this.Set('SubjectID', value);
    }

    /**
    * * Field Name: ResponseText
    * * Display Name: Response Text
    * * SQL Data Type: nvarchar(MAX)
    * * Description: The current narrative or drafted answer text.
    */
    get ResponseText(): string | null {
        return this.Get('ResponseText');
    }
    set ResponseText(value: string | null) {
        this.Set('ResponseText', value);
    }

    /**
    * * Field Name: SelfAssessment
    * * Display Name: Self Assessment
    * * SQL Data Type: nvarchar(20)
    * * Value List Type: List
    * * Possible Values 
    *   * Met
    *   * Not Met
    *   * Partially Met
    * * Description: The applicant's self-assessment of whether the standard is met.
    */
    get SelfAssessment(): 'Met' | 'Not Met' | 'Partially Met' | null {
        return this.Get('SelfAssessment');
    }
    set SelfAssessment(value: 'Met' | 'Not Met' | 'Partially Met' | null) {
        this.Set('SelfAssessment', value);
    }

    /**
    * * Field Name: Status
    * * Display Name: Status
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Empty
    * * Value List Type: List
    * * Possible Values 
    *   * Confirmed
    *   * Drafted
    *   * Empty
    *   * Flagged
    *   * Located
    *   * Prefilled
    * * Description: Workflow status of this response.
    */
    get Status(): 'Confirmed' | 'Drafted' | 'Empty' | 'Flagged' | 'Located' | 'Prefilled' {
        return this.Get('Status');
    }
    set Status(value: 'Confirmed' | 'Drafted' | 'Empty' | 'Flagged' | 'Located' | 'Prefilled') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: AuthorType
    * * Display Name: Author Type
    * * SQL Data Type: nvarchar(10)
    * * Default Value: Human
    * * Value List Type: List
    * * Possible Values 
    *   * Agent
    *   * Human
    * * Description: Whether the current response text was written by a human or an automated reader.
    */
    get AuthorType(): 'Agent' | 'Human' {
        return this.Get('AuthorType');
    }
    set AuthorType(value: 'Agent' | 'Human') {
        this.Set('AuthorType', value);
    }

    /**
    * * Field Name: LastEditedByUserID
    * * Display Name: Last Edited By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    * * Description: The user who most recently edited this response.
    */
    get LastEditedByUserID(): string | null {
        return this.Get('LastEditedByUserID');
    }
    set LastEditedByUserID(value: string | null) {
        this.Set('LastEditedByUserID', value);
    }

    /**
    * * Field Name: ConfirmedByUserID
    * * Display Name: Confirmed By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    * * Description: The subject contact who confirmed this response.
    */
    get ConfirmedByUserID(): string | null {
        return this.Get('ConfirmedByUserID');
    }
    set ConfirmedByUserID(value: string | null) {
        this.Set('ConfirmedByUserID', value);
    }

    /**
    * * Field Name: ConfirmedAt
    * * Display Name: Confirmed At
    * * SQL Data Type: datetimeoffset
    * * Description: Timestamp when this response was confirmed.
    */
    get ConfirmedAt(): Date | null {
        return this.Get('ConfirmedAt');
    }
    set ConfirmedAt(value: Date | null) {
        this.Set('ConfirmedAt', value);
    }

    /**
    * * Field Name: SourceType
    * * Display Name: Source Type
    * * SQL Data Type: nvarchar(30)
    * * Value List Type: List
    * * Possible Values 
    *   * Document Extraction
    * * Description: Kind of source that supplied a prefilled or located response.
    */
    get SourceType(): 'Document Extraction' | null {
        return this.Get('SourceType');
    }
    set SourceType(value: 'Document Extraction' | null) {
        this.Set('SourceType', value);
    }

    /**
    * * Field Name: SourceLabel
    * * Display Name: Source Label
    * * SQL Data Type: nvarchar(500)
    * * Description: Human-readable label of the source shown in provenance, such as the document file name.
    */
    get SourceLabel(): string | null {
        return this.Get('SourceLabel');
    }
    set SourceLabel(value: string | null) {
        this.Set('SourceLabel', value);
    }

    /**
    * * Field Name: SourceReference
    * * Display Name: Source Reference
    * * SQL Data Type: nvarchar(100)
    * * Description: Identifier of the source record, such as the extraction ID.
    */
    get SourceReference(): string | null {
        return this.Get('SourceReference');
    }
    set SourceReference(value: string | null) {
        this.Set('SourceReference', value);
    }

    /**
    * * Field Name: SourceRetrievedAt
    * * Display Name: Source Retrieved At
    * * SQL Data Type: datetimeoffset
    * * Description: Timestamp when the prefill or located value was retrieved from its source.
    */
    get SourceRetrievedAt(): Date | null {
        return this.Get('SourceRetrievedAt');
    }
    set SourceRetrievedAt(value: Date | null) {
        this.Set('SourceRetrievedAt', value);
    }

    /**
    * * Field Name: SourceRawValue
    * * Display Name: Source Raw Value
    * * SQL Data Type: nvarchar(MAX)
    * * Description: Original value resolved from the source, preserved if the applicant edits the text.
    */
    get SourceRawValue(): string | null {
        return this.Get('SourceRawValue');
    }
    set SourceRawValue(value: string | null) {
        this.Set('SourceRawValue', value);
    }

    /**
    * * Field Name: IsStale
    * * Display Name: Is Stale
    * * SQL Data Type: bit
    * * Default Value: 0
    * * Description: Whether the underlying source changed after this response was drafted.
    */
    get IsStale(): boolean {
        return this.Get('IsStale');
    }
    set IsStale(value: boolean) {
        this.Set('IsStale', value);
    }

    /**
    * * Field Name: ReopenReason
    * * Display Name: Reopen Reason
    * * SQL Data Type: nvarchar(MAX)
    * * Description: Staff explanation recorded when a confirmed response was reopened.
    */
    get ReopenReason(): string | null {
        return this.Get('ReopenReason');
    }
    set ReopenReason(value: string | null) {
        this.Set('ReopenReason', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: LastEditedByUser
    * * Display Name: Last Edited By User
    * * SQL Data Type: nvarchar(100)
    */
    get LastEditedByUser(): string | null {
        return this.Get('LastEditedByUser');
    }

    /**
    * * Field Name: ConfirmedByUser
    * * Display Name: Confirmed By User
    * * SQL Data Type: nvarchar(100)
    */
    get ConfirmedByUser(): string | null {
        return this.Get('ConfirmedByUser');
    }
}


/**
 * MJ_BizApps_Credentialing: Standards - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: Standard
 * * Base View: vwStandards
 * * @description One requirement an applicant must meet, within a section of a program version.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Standards')
export class mjBizAppsCredentialingStandardEntity extends BaseEntity<mjBizAppsCredentialingStandardEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Standards record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Standards record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingStandardEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: SectionID
    * * Display Name: Section ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Sections (vwSections.ID)
    * * Description: The section this standard belongs to. It cannot be changed after the standard is created.
    */
    get SectionID(): string {
        return this.Get('SectionID');
    }
    set SectionID(value: string) {
        this.Set('SectionID', value);
    }

    /**
    * * Field Name: ProgramVersionID
    * * Display Name: Program Version ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Program Versions (vwProgramVersions.ID)
    * * Description: The program version this standard belongs to. Always the version of its section.
    */
    get ProgramVersionID(): string {
        return this.Get('ProgramVersionID');
    }
    set ProgramVersionID(value: string) {
        this.Set('ProgramVersionID', value);
    }

    /**
    * * Field Name: Code
    * * Display Name: Code
    * * SQL Data Type: nvarchar(50)
    * * Description: The standard's code, for example "1.2", unique within its version and stored without surrounding spaces.
    */
    get Code(): string {
        return this.Get('Code');
    }
    set Code(value: string) {
        this.Set('Code', value);
    }

    /**
    * * Field Name: Statement
    * * Display Name: Statement
    * * SQL Data Type: nvarchar(MAX)
    * * Description: The text of the requirement.
    */
    get Statement(): string {
        return this.Get('Statement');
    }
    set Statement(value: string) {
        this.Set('Statement', value);
    }

    /**
    * * Field Name: Guidance
    * * Display Name: Guidance
    * * SQL Data Type: nvarchar(MAX)
    * * Description: Advice to applicants and reviewers on how the requirement is met and judged.
    */
    get Guidance(): string | null {
        return this.Get('Guidance');
    }
    set Guidance(value: string | null) {
        this.Set('Guidance', value);
    }

    /**
    * * Field Name: ResponseType
    * * Display Name: Response Type
    * * SQL Data Type: nvarchar(20)
    * * Value List Type: List
    * * Possible Values 
    *   * Attestation
    *   * Composite
    *   * Evidence
    *   * Narrative
    * * Description: What an applicant gives in answer: a yes or no attestation, a written narrative, supporting evidence, or a combination.
    */
    get ResponseType(): 'Attestation' | 'Composite' | 'Evidence' | 'Narrative' {
        return this.Get('ResponseType');
    }
    set ResponseType(value: 'Attestation' | 'Composite' | 'Evidence' | 'Narrative') {
        this.Set('ResponseType', value);
    }

    /**
    * * Field Name: IntakeMode
    * * Display Name: Intake Mode
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Manual
    * * Value List Type: List
    * * Possible Values 
    *   * Locate
    *   * Manual
    *   * Prefill
    * * Description: How the answer is gathered: typed by the applicant, located in their uploaded documents, or drafted for them to confirm.
    */
    get IntakeMode(): 'Locate' | 'Manual' | 'Prefill' {
        return this.Get('IntakeMode');
    }
    set IntakeMode(value: 'Locate' | 'Manual' | 'Prefill') {
        this.Set('IntakeMode', value);
    }

    /**
    * * Field Name: EvaluationMode
    * * Display Name: Evaluation Mode
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Human Only
    * * Value List Type: List
    * * Possible Values 
    *   * AI Assisted
    *   * AI Automated
    *   * Human Only
    * * Description: How far AI takes part in judging the answer. It is never edited directly; it changes only through evidence-gated promotion.
    */
    get EvaluationMode(): 'AI Assisted' | 'AI Automated' | 'Human Only' {
        return this.Get('EvaluationMode');
    }
    set EvaluationMode(value: 'AI Assisted' | 'AI Automated' | 'Human Only') {
        this.Set('EvaluationMode', value);
    }

    /**
    * * Field Name: IsInterpretive
    * * Display Name: Is Interpretive
    * * SQL Data Type: bit
    * * Default Value: 0
    * * Description: Whether meeting the standard is a matter of judgment. An interpretive standard is always reviewed by people.
    */
    get IsInterpretive(): boolean {
        return this.Get('IsInterpretive');
    }
    set IsInterpretive(value: boolean) {
        this.Set('IsInterpretive', value);
    }

    /**
    * * Field Name: IsEligibility
    * * Display Name: Is Eligibility
    * * SQL Data Type: bit
    * * Default Value: 0
    * * Description: Whether the standard decides if an applicant may apply at all.
    */
    get IsEligibility(): boolean {
        return this.Get('IsEligibility');
    }
    set IsEligibility(value: boolean) {
        this.Set('IsEligibility', value);
    }

    /**
    * * Field Name: IsNewForVersion
    * * Display Name: Is New For Version
    * * SQL Data Type: bit
    * * Default Value: 0
    * * Description: Whether the standard was added in this version and so has no answer to carry forward from an earlier one.
    */
    get IsNewForVersion(): boolean {
        return this.Get('IsNewForVersion');
    }
    set IsNewForVersion(value: boolean) {
        this.Set('IsNewForVersion', value);
    }

    /**
    * * Field Name: EvidenceHint
    * * Display Name: Evidence Hint
    * * SQL Data Type: nvarchar(MAX)
    * * Description: Where the supporting evidence is usually found, for example the name of a document.
    */
    get EvidenceHint(): string | null {
        return this.Get('EvidenceHint');
    }
    set EvidenceHint(value: string | null) {
        this.Set('EvidenceHint', value);
    }

    /**
    * * Field Name: LineageKey
    * * Display Name: Lineage Key
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newid()
    * * Description: Identifies the same requirement across versions of a program. A copy of a standard in a later version keeps this value.
    */
    get LineageKey(): string {
        return this.Get('LineageKey');
    }
    set LineageKey(value: string) {
        this.Set('LineageKey', value);
    }

    /**
    * * Field Name: Sequence
    * * Display Name: Sequence
    * * SQL Data Type: int
    * * Default Value: 0
    * * Description: The position of the standard within its section, lowest first.
    */
    get Sequence(): number {
        return this.Get('Sequence');
    }
    set Sequence(value: number) {
        this.Set('Sequence', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: Section
    * * Display Name: Section
    * * SQL Data Type: nvarchar(255)
    */
    get Section(): string {
        return this.Get('Section');
    }
}


/**
 * MJ_BizApps_Credentialing: Subject Contacts - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: SubjectContact
 * * Base View: vwSubjectContacts
 * * @description A user authorized to act for a credentialing subject on its applications and evidence.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Subject Contacts')
export class mjBizAppsCredentialingSubjectContactEntity extends BaseEntity<mjBizAppsCredentialingSubjectContactEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Subject Contacts record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Subject Contacts record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingSubjectContactEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: SubjectID
    * * Display Name: Subject ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Subjects (vwSubjects.ID)
    * * Description: The credentialing subject this contact acts for.
    */
    get SubjectID(): string {
        return this.Get('SubjectID');
    }
    set SubjectID(value: string) {
        this.Set('SubjectID', value);
    }

    /**
    * * Field Name: UserID
    * * Display Name: User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    * * Description: The MemberJunction user account of this contact.
    */
    get UserID(): string {
        return this.Get('UserID');
    }
    set UserID(value: string) {
        this.Set('UserID', value);
    }

    /**
    * * Field Name: ContactRole
    * * Display Name: Contact Role
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Primary
    * * Value List Type: List
    * * Possible Values 
    *   * Primary
    *   * Staff
    * * Description: Whether this contact is the primary applicant contact or supporting staff.
    */
    get ContactRole(): 'Primary' | 'Staff' {
        return this.Get('ContactRole');
    }
    set ContactRole(value: 'Primary' | 'Staff') {
        this.Set('ContactRole', value);
    }

    /**
    * * Field Name: InvitedByUserID
    * * Display Name: Invited By User ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Users (vwUsers.ID)
    * * Description: The staff user who most recently invited this contact.
    */
    get InvitedByUserID(): string {
        return this.Get('InvitedByUserID');
    }
    set InvitedByUserID(value: string) {
        this.Set('InvitedByUserID', value);
    }

    /**
    * * Field Name: LastInvitedAt
    * * Display Name: Last Invited At
    * * SQL Data Type: datetimeoffset
    * * Description: When this contact was most recently invited.
    */
    get LastInvitedAt(): Date {
        return this.Get('LastInvitedAt');
    }
    set LastInvitedAt(value: Date) {
        this.Set('LastInvitedAt', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: User
    * * Display Name: User
    * * SQL Data Type: nvarchar(100)
    */
    get User(): string {
        return this.Get('User');
    }

    /**
    * * Field Name: InvitedByUser
    * * Display Name: Invited By User
    * * SQL Data Type: nvarchar(100)
    */
    get InvitedByUser(): string {
        return this.Get('InvitedByUser');
    }
}


/**
 * MJ_BizApps_Credentialing: Subjects - strongly typed entity sub-class
 * * Schema: __mj_BizAppsCredentialing
 * * Base Table: Subject
 * * Base View: vwSubjects
 * * @description A person or organization being credentialed by an accrediting organization.
 * * Primary Key: ID
 * @extends {BaseEntity}
 * @class
 * @public
 */
@RegisterClass(BaseEntity, 'MJ_BizApps_Credentialing: Subjects')
export class mjBizAppsCredentialingSubjectEntity extends BaseEntity<mjBizAppsCredentialingSubjectEntityType> {
    /**
    * Loads the MJ_BizApps_Credentialing: Subjects record from the database
    * @param ID: string - primary key value to load the MJ_BizApps_Credentialing: Subjects record.
    * @param EntityRelationshipsToLoad - (optional) the relationships to load
    * @returns {Promise<boolean>} - true if successful, false otherwise
    * @public
    * @async
    * @memberof mjBizAppsCredentialingSubjectEntity
    * @method
    * @override
    */
    public async Load(ID: string, EntityRelationshipsToLoad?: string[]) : Promise<boolean> {
        const compositeKey: CompositeKey = new CompositeKey();
        compositeKey.KeyValuePairs.push({ FieldName: 'ID', Value: ID });
        return await super.InnerLoad(compositeKey, EntityRelationshipsToLoad);
    }

    /**
    * * Field Name: ID
    * * Display Name: ID
    * * SQL Data Type: uniqueidentifier
    * * Default Value: newsequentialid()
    */
    get ID(): string {
        return this.Get('ID');
    }
    set ID(value: string) {
        this.Set('ID', value);
    }

    /**
    * * Field Name: AccreditingOrganizationID
    * * Display Name: Accrediting Organization ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ_BizApps_Credentialing: Accrediting Organizations (vwAccreditingOrganizations.ID)
    * * Description: The accrediting organization that owns this subject record. Cannot be changed after creation.
    */
    get AccreditingOrganizationID(): string {
        return this.Get('AccreditingOrganizationID');
    }
    set AccreditingOrganizationID(value: string) {
        this.Set('AccreditingOrganizationID', value);
    }

    /**
    * * Field Name: SubjectType
    * * Display Name: Subject Type
    * * SQL Data Type: nvarchar(20)
    * * Value List Type: List
    * * Possible Values 
    *   * Organization
    *   * Person
    * * Description: Whether this subject is a person or an organization.
    */
    get SubjectType(): 'Organization' | 'Person' {
        return this.Get('SubjectType');
    }
    set SubjectType(value: 'Organization' | 'Person') {
        this.Set('SubjectType', value);
    }

    /**
    * * Field Name: DisplayName
    * * Display Name: Display Name
    * * SQL Data Type: nvarchar(255)
    * * Description: The subject's name shown on applications and certificates, unique within its accrediting organization.
    */
    get DisplayName(): string {
        return this.Get('DisplayName');
    }
    set DisplayName(value: string) {
        this.Set('DisplayName', value);
    }

    /**
    * * Field Name: PrimaryEmail
    * * Display Name: Primary Email
    * * SQL Data Type: nvarchar(255)
    * * Description: The primary contact email address for this subject.
    */
    get PrimaryEmail(): string {
        return this.Get('PrimaryEmail');
    }
    set PrimaryEmail(value: string) {
        this.Set('PrimaryEmail', value);
    }

    /**
    * * Field Name: Status
    * * Display Name: Status
    * * SQL Data Type: nvarchar(20)
    * * Default Value: Active
    * * Value List Type: List
    * * Possible Values 
    *   * Active
    *   * Inactive
    * * Description: Whether this subject is active or inactive.
    */
    get Status(): 'Active' | 'Inactive' {
        return this.Get('Status');
    }
    set Status(value: 'Active' | 'Inactive') {
        this.Set('Status', value);
    }

    /**
    * * Field Name: PartyEntityID
    * * Display Name: Party Entity ID
    * * SQL Data Type: uniqueidentifier
    * * Related Entity/Foreign Key: MJ: Entities (vwEntities.ID)
    * * Description: The host system entity whose record represents this subject, when linked to a host record.
    */
    get PartyEntityID(): string | null {
        return this.Get('PartyEntityID');
    }
    set PartyEntityID(value: string | null) {
        this.Set('PartyEntityID', value);
    }

    /**
    * * Field Name: PartyRecordID
    * * Display Name: Party Record ID
    * * SQL Data Type: nvarchar(450)
    * * Description: The primary key value of the host system party record referenced by PartyEntityID.
    */
    get PartyRecordID(): string | null {
        return this.Get('PartyRecordID');
    }
    set PartyRecordID(value: string | null) {
        this.Set('PartyRecordID', value);
    }

    /**
    * * Field Name: __mj_CreatedAt
    * * Display Name: Created At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_CreatedAt(): Date {
        return this.Get('__mj_CreatedAt');
    }

    /**
    * * Field Name: __mj_UpdatedAt
    * * Display Name: Updated At
    * * SQL Data Type: datetimeoffset
    * * Default Value: getutcdate()
    */
    get __mj_UpdatedAt(): Date {
        return this.Get('__mj_UpdatedAt');
    }

    /**
    * * Field Name: AccreditingOrganization
    * * Display Name: Accrediting Organization
    * * SQL Data Type: nvarchar(255)
    */
    get AccreditingOrganization(): string {
        return this.Get('AccreditingOrganization');
    }

    /**
    * * Field Name: PartyEntity
    * * Display Name: Party Entity
    * * SQL Data Type: nvarchar(255)
    */
    get PartyEntity(): string | null {
        return this.Get('PartyEntity');
    }
}
