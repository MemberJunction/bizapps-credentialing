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
