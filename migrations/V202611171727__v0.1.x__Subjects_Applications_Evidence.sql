-- ============================================================
-- BizApps Credentialing: subjects, contacts, applications, standard responses,
-- evidence documents, document attestations, application documents, extractions,
-- response citations and response sources (v0.1.x)
--
-- Ten tables. An accrediting organization registers subjects; contacts sign in
-- to complete applications and responses, upload or attest to evidence documents,
-- and submit once ready. System columns, foreign-key indexes, views and stored
-- procedures are CodeGen's.
-- ============================================================

CREATE TABLE ${flyway:defaultSchema}.[Subject] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Subject] PRIMARY KEY CONSTRAINT [DF_Subject_ID] DEFAULT (NEWSEQUENTIALID()),
    [AccreditingOrganizationID] UNIQUEIDENTIFIER NOT NULL,
    [SubjectType] NVARCHAR(20) NOT NULL,
    [DisplayName] NVARCHAR(255) NOT NULL,
    [PrimaryEmail] NVARCHAR(255) NOT NULL,
    [Status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Subject_Status] DEFAULT (N'Active'),
    [PartyEntityID] UNIQUEIDENTIFIER NULL,
    [PartyRecordID] NVARCHAR(450) NULL,
    CONSTRAINT [FK_Subject_AccreditingOrganization] FOREIGN KEY ([AccreditingOrganizationID]) REFERENCES ${flyway:defaultSchema}.[AccreditingOrganization]([ID]),
    CONSTRAINT [FK_Subject_Entity] FOREIGN KEY ([PartyEntityID]) REFERENCES [${mjSchema}].[Entity]([ID]),
    CONSTRAINT [UQ_Subject_AccreditingOrganizationID_DisplayName] UNIQUE ([AccreditingOrganizationID], [DisplayName]),
    CONSTRAINT [CK_Subject_SubjectType] CHECK ([SubjectType] IN (N'Person', N'Organization')),
    CONSTRAINT [CK_Subject_Status] CHECK ([Status] IN (N'Active', N'Inactive'))
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'A person or organization being credentialed by an accrediting organization.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Subject';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The accrediting organization that owns this subject record. Cannot be changed after creation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Subject',
    @level2type = N'COLUMN', @level2name = N'AccreditingOrganizationID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether this subject is a person or an organization.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Subject',
    @level2type = N'COLUMN', @level2name = N'SubjectType';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The subject''s name shown on applications and certificates, unique within its accrediting organization.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Subject',
    @level2type = N'COLUMN', @level2name = N'DisplayName';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The primary contact email address for this subject.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Subject',
    @level2type = N'COLUMN', @level2name = N'PrimaryEmail';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether this subject is active or inactive.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Subject',
    @level2type = N'COLUMN', @level2name = N'Status';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The host system entity whose record represents this subject, when linked to a host record.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Subject',
    @level2type = N'COLUMN', @level2name = N'PartyEntityID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The primary key value of the host system party record referenced by PartyEntityID.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Subject',
    @level2type = N'COLUMN', @level2name = N'PartyRecordID';
GO

CREATE TABLE ${flyway:defaultSchema}.[SubjectContact] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_SubjectContact] PRIMARY KEY CONSTRAINT [DF_SubjectContact_ID] DEFAULT (NEWSEQUENTIALID()),
    [SubjectID] UNIQUEIDENTIFIER NOT NULL,
    [UserID] UNIQUEIDENTIFIER NOT NULL,
    [ContactRole] NVARCHAR(20) NOT NULL CONSTRAINT [DF_SubjectContact_ContactRole] DEFAULT (N'Primary'),
    [InvitedByUserID] UNIQUEIDENTIFIER NOT NULL,
    [LastInvitedAt] DATETIMEOFFSET NOT NULL,
    CONSTRAINT [FK_SubjectContact_Subject] FOREIGN KEY ([SubjectID]) REFERENCES ${flyway:defaultSchema}.[Subject]([ID]),
    CONSTRAINT [FK_SubjectContact_User] FOREIGN KEY ([UserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [FK_SubjectContact_InvitedByUser] FOREIGN KEY ([InvitedByUserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [UQ_SubjectContact_SubjectID_UserID] UNIQUE ([SubjectID], [UserID]),
    CONSTRAINT [CK_SubjectContact_ContactRole] CHECK ([ContactRole] IN (N'Primary', N'Staff'))
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'A user authorized to act for a credentialing subject on its applications and evidence.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'SubjectContact';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The credentialing subject this contact acts for.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'SubjectContact',
    @level2type = N'COLUMN', @level2name = N'SubjectID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The MemberJunction user account of this contact.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'SubjectContact',
    @level2type = N'COLUMN', @level2name = N'UserID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether this contact is the primary applicant contact or supporting staff.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'SubjectContact',
    @level2type = N'COLUMN', @level2name = N'ContactRole';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The staff user who most recently invited this contact.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'SubjectContact',
    @level2type = N'COLUMN', @level2name = N'InvitedByUserID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'When this contact was most recently invited.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'SubjectContact',
    @level2type = N'COLUMN', @level2name = N'LastInvitedAt';
GO

CREATE TABLE ${flyway:defaultSchema}.[Application] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Application] PRIMARY KEY CONSTRAINT [DF_Application_ID] DEFAULT (NEWSEQUENTIALID()),
    [SubjectID] UNIQUEIDENTIFIER NOT NULL,
    [ProgramVersionID] UNIQUEIDENTIFIER NOT NULL,
    [Status] NVARCHAR(30) NOT NULL CONSTRAINT [DF_Application_Status] DEFAULT (N'Draft'),
    [IsHistorical] BIT NOT NULL CONSTRAINT [DF_Application_IsHistorical] DEFAULT (0),
    [SubmittedAt] DATETIMEOFFSET NULL,
    [SubmittedByUserID] UNIQUEIDENTIFIER NULL,
    [SubmissionDispatchedAt] DATETIMEOFFSET NULL,
    [SubmissionDispatchClaimID] UNIQUEIDENTIFIER NULL,
    [SubmissionDispatchClaimedAt] DATETIMEOFFSET NULL,
    [SubmissionDispatchAttempts] INT NOT NULL CONSTRAINT [DF_Application_SubmissionDispatchAttempts] DEFAULT (0),
    [SubmissionDispatchNote] NVARCHAR(500) NULL,
    [SubjectSnapshot] NVARCHAR(MAX) NULL,
    [AttestationOfficerName] NVARCHAR(255) NULL,
    [AttestationOfficerRole] NVARCHAR(255) NULL,
    [AttestationApprovalDate] DATE NULL,
    [AttestationStatement] NVARCHAR(MAX) NULL,
    [AttestedByUserID] UNIQUEIDENTIFIER NULL,
    [AttestedAt] DATETIMEOFFSET NULL,
    [WithdrawnAt] DATETIMEOFFSET NULL,
    [WithdrawnByUserID] UNIQUEIDENTIFIER NULL,
    [WithdrawalReason] NVARCHAR(MAX) NULL,
    CONSTRAINT [FK_Application_Subject] FOREIGN KEY ([SubjectID]) REFERENCES ${flyway:defaultSchema}.[Subject]([ID]),
    CONSTRAINT [FK_Application_ProgramVersion] FOREIGN KEY ([ProgramVersionID]) REFERENCES ${flyway:defaultSchema}.[ProgramVersion]([ID]),
    CONSTRAINT [FK_Application_SubmittedByUser] FOREIGN KEY ([SubmittedByUserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [FK_Application_AttestedByUser] FOREIGN KEY ([AttestedByUserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [FK_Application_WithdrawnByUser] FOREIGN KEY ([WithdrawnByUserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [CK_Application_Status] CHECK ([Status] IN (N'Draft', N'Submitted', N'Screening', N'In Review', N'Info Requested', N'Committee', N'Executive Sign-Off', N'Decided', N'Closed', N'Withdrawn'))
);
GO

CREATE UNIQUE INDEX [UQ_Application_OneLive]
    ON ${flyway:defaultSchema}.[Application]([SubjectID], [ProgramVersionID])
    WHERE [Status] <> N'Decided' AND [Status] <> N'Closed' AND [Status] <> N'Withdrawn' AND [IsHistorical] = 0;
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'A subject''s application for a credential under a specific active program version.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The subject applying for the credential. Cannot be changed after creation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'SubjectID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The program version this application is judged against. Cannot be changed after creation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'ProgramVersionID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Current workflow stage of the application.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'Status';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether this row represents imported historical application data.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'IsHistorical';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Server-stamped timestamp when the application was submitted.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'SubmittedAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The contact user who submitted the application.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'SubmittedByUserID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Timestamp when all post-submission subscribers completed successfully.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'SubmissionDispatchedAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Identifier of the submission-dispatch attempt currently holding the claim.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'SubmissionDispatchClaimID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Timestamp when the current submission-dispatch claim was taken.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'SubmissionDispatchClaimedAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Number of submission-dispatch attempts made so far. Dispatch stops after 5.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'SubmissionDispatchAttempts';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Staff-facing explanation recorded when submission dispatch stops retrying.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'SubmissionDispatchNote';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'JSON snapshot of the subject''s display name, type, email and party reference captured at submission.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'SubjectSnapshot';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Name of the officer who signed the governing-body attestation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'AttestationOfficerName';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Title or role of the officer who signed the governing-body attestation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'AttestationOfficerRole';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Date the governing body approved the application.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'AttestationApprovalDate';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Exact attestation statement presented to and signed by the contact.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'AttestationStatement';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The contact user who recorded the attestation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'AttestedByUserID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Timestamp when the attestation was recorded.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'AttestedAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Timestamp when the application was withdrawn.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'WithdrawnAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The user who withdrew the application.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'WithdrawnByUserID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Reason recorded when the application was withdrawn.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Application',
    @level2type = N'COLUMN', @level2name = N'WithdrawalReason';
GO

CREATE TABLE ${flyway:defaultSchema}.[StandardResponse] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_StandardResponse] PRIMARY KEY CONSTRAINT [DF_StandardResponse_ID] DEFAULT (NEWSEQUENTIALID()),
    [ApplicationID] UNIQUEIDENTIFIER NOT NULL,
    [StandardID] UNIQUEIDENTIFIER NOT NULL,
    [SubjectID] UNIQUEIDENTIFIER NOT NULL,
    [ResponseText] NVARCHAR(MAX) NULL,
    [SelfAssessment] NVARCHAR(20) NULL,
    [Status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_StandardResponse_Status] DEFAULT (N'Empty'),
    [AuthorType] NVARCHAR(10) NOT NULL CONSTRAINT [DF_StandardResponse_AuthorType] DEFAULT (N'Human'),
    [LastEditedByUserID] UNIQUEIDENTIFIER NULL,
    [ConfirmedByUserID] UNIQUEIDENTIFIER NULL,
    [ConfirmedAt] DATETIMEOFFSET NULL,
    [SourceType] NVARCHAR(30) NULL,
    [SourceLabel] NVARCHAR(500) NULL,
    [SourceReference] NVARCHAR(100) NULL,
    [SourceRetrievedAt] DATETIMEOFFSET NULL,
    [SourceRawValue] NVARCHAR(MAX) NULL,
    [IsStale] BIT NOT NULL CONSTRAINT [DF_StandardResponse_IsStale] DEFAULT (0),
    [ReopenReason] NVARCHAR(MAX) NULL,
    CONSTRAINT [FK_StandardResponse_Application] FOREIGN KEY ([ApplicationID]) REFERENCES ${flyway:defaultSchema}.[Application]([ID]),
    CONSTRAINT [FK_StandardResponse_Standard] FOREIGN KEY ([StandardID]) REFERENCES ${flyway:defaultSchema}.[Standard]([ID]),
    CONSTRAINT [FK_StandardResponse_Subject] FOREIGN KEY ([SubjectID]) REFERENCES ${flyway:defaultSchema}.[Subject]([ID]),
    CONSTRAINT [FK_StandardResponse_LastEditedByUser] FOREIGN KEY ([LastEditedByUserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [FK_StandardResponse_ConfirmedByUser] FOREIGN KEY ([ConfirmedByUserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [UQ_StandardResponse_ApplicationID_StandardID] UNIQUE ([ApplicationID], [StandardID]),
    CONSTRAINT [CK_StandardResponse_SelfAssessment] CHECK ([SelfAssessment] IN (N'Met', N'Partially Met', N'Not Met')),
    CONSTRAINT [CK_StandardResponse_Status] CHECK ([Status] IN (N'Empty', N'Drafted', N'Prefilled', N'Located', N'Confirmed', N'Flagged')),
    CONSTRAINT [CK_StandardResponse_AuthorType] CHECK ([AuthorType] IN (N'Human', N'Agent')),
    CONSTRAINT [CK_StandardResponse_SourceType] CHECK ([SourceType] IN (N'Document Extraction'))
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'An applicant''s response to one standard within an application.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The application this response belongs to.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'ApplicationID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The standard being answered.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'StandardID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The subject of the application, server-set to match Application.SubjectID.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'SubjectID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The current narrative or drafted answer text.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'ResponseText';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The applicant''s self-assessment of whether the standard is met.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'SelfAssessment';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Workflow status of this response.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'Status';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether the current response text was written by a human or an automated reader.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'AuthorType';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The user who most recently edited this response.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'LastEditedByUserID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The subject contact who confirmed this response.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'ConfirmedByUserID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Timestamp when this response was confirmed.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'ConfirmedAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Kind of source that supplied a prefilled or located response.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'SourceType';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Human-readable label of the source shown in provenance, such as the document file name.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'SourceLabel';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Identifier of the source record, such as the extraction ID.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'SourceReference';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Timestamp when the prefill or located value was retrieved from its source.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'SourceRetrievedAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Original value resolved from the source, preserved if the applicant edits the text.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'SourceRawValue';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether the underlying source changed after this response was drafted.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'IsStale';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Staff explanation recorded when a confirmed response was reopened.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'StandardResponse',
    @level2type = N'COLUMN', @level2name = N'ReopenReason';
GO

CREATE TABLE ${flyway:defaultSchema}.[EvidenceDocument] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_EvidenceDocument] PRIMARY KEY CONSTRAINT [DF_EvidenceDocument_ID] DEFAULT (NEWSEQUENTIALID()),
    [SubjectID] UNIQUEIDENTIFIER NOT NULL,
    [DocumentRequirementID] UNIQUEIDENTIFIER NULL,
    [FileID] UNIQUEIDENTIFIER NOT NULL,
    [FileName] NVARCHAR(255) NOT NULL,
    [ContentType] NVARCHAR(150) NOT NULL,
    [SizeBytes] BIGINT NOT NULL,
    [ContentHash] CHAR(64) NOT NULL,
    [ExtractedText] NVARCHAR(MAX) NULL,
    [TextStatus] NVARCHAR(30) NOT NULL,
    [TextNote] NVARCHAR(500) NULL,
    [PageCount] INT NULL,
    [ReadingStatus] NVARCHAR(30) NOT NULL CONSTRAINT [DF_EvidenceDocument_ReadingStatus] DEFAULT (N'Pending'),
    [ReadingNote] NVARCHAR(500) NULL,
    [ReadingClaimID] UNIQUEIDENTIFIER NULL,
    [ReadingClaimedAt] DATETIMEOFFSET NULL,
    [ReadingAttempts] INT NOT NULL CONSTRAINT [DF_EvidenceDocument_ReadingAttempts] DEFAULT (0),
    [Status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_EvidenceDocument_Status] DEFAULT (N'Current'),
    [SupersedesDocumentID] UNIQUEIDENTIFIER NULL,
    [ConfirmedCurrentAt] DATETIMEOFFSET NULL,
    [UploadedByUserID] UNIQUEIDENTIFIER NOT NULL,
    [UploadedAt] DATETIMEOFFSET NOT NULL,
    CONSTRAINT [FK_EvidenceDocument_Subject] FOREIGN KEY ([SubjectID]) REFERENCES ${flyway:defaultSchema}.[Subject]([ID]),
    CONSTRAINT [FK_EvidenceDocument_DocumentRequirement] FOREIGN KEY ([DocumentRequirementID]) REFERENCES ${flyway:defaultSchema}.[DocumentRequirement]([ID]),
    CONSTRAINT [FK_EvidenceDocument_File] FOREIGN KEY ([FileID]) REFERENCES [${mjSchema}].[File]([ID]),
    CONSTRAINT [FK_EvidenceDocument_SupersedesDocument] FOREIGN KEY ([SupersedesDocumentID]) REFERENCES ${flyway:defaultSchema}.[EvidenceDocument]([ID]),
    CONSTRAINT [FK_EvidenceDocument_UploadedByUser] FOREIGN KEY ([UploadedByUserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [CK_EvidenceDocument_TextStatus] CHECK ([TextStatus] IN (N'Extracted', N'Truncated', N'Awaiting Recognition', N'Recognized', N'No Text Found', N'Could Not Read')),
    CONSTRAINT [CK_EvidenceDocument_ReadingStatus] CHECK ([ReadingStatus] IN (N'Pending', N'Running', N'Complete', N'Could Not Run', N'Failed', N'Not Applicable')),
    CONSTRAINT [CK_EvidenceDocument_Status] CHECK ([Status] IN (N'Current', N'Confirm Current', N'Superseded'))
);
GO

CREATE UNIQUE INDEX [UQ_EvidenceDocument_OneCurrentPerRequirement]
    ON ${flyway:defaultSchema}.[EvidenceDocument]([SubjectID], [DocumentRequirementID])
    WHERE [DocumentRequirementID] IS NOT NULL AND [Status] <> N'Superseded';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'An evidence file uploaded to a subject''s document library.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The subject that owns this document. Cannot be changed after creation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'SubjectID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The document requirement this upload fulfills, or NULL for a general upload.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'DocumentRequirementID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The underlying MemberJunction File record storing the uploaded bytes.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'FileID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Sanitized original file name as uploaded.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'FileName';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'MIME content type of the uploaded file.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'ContentType';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Size of the uploaded file in bytes.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'SizeBytes';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Lowercase hex SHA-256 digest of the uploaded file bytes.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'ContentHash';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Plain text extracted or recognized from the file. Written once and never modified afterward.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'ExtractedText';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Outcome of text extraction or recognition for this document.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'TextStatus';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'User-facing sentence explaining any text status other than Extracted.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'TextNote';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Page count of the document when known.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'PageCount';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Current state of background evidence reading for this document.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'ReadingStatus';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'User-facing note describing the outcome or failure of evidence reading.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'ReadingNote';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Identifier of the background worker claim currently processing this document.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'ReadingClaimID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Timestamp when the active reading claim was taken or last renewed.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'ReadingClaimedAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Number of failed or attempted reading runs. Failed reads retry up to 3 attempts.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'ReadingAttempts';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Currency status of this document in the subject''s library.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'Status';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The prior document version that this upload replaced.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'SupersedesDocumentID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Timestamp when a contact most recently confirmed this document is still current.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'ConfirmedCurrentAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The user who uploaded this document.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'UploadedByUserID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Timestamp when this document was uploaded.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'EvidenceDocument',
    @level2type = N'COLUMN', @level2name = N'UploadedAt';
GO

CREATE TABLE ${flyway:defaultSchema}.[DocumentAttestation] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_DocumentAttestation] PRIMARY KEY CONSTRAINT [DF_DocumentAttestation_ID] DEFAULT (NEWSEQUENTIALID()),
    [SubjectID] UNIQUEIDENTIFIER NOT NULL,
    [DocumentRequirementID] UNIQUEIDENTIFIER NOT NULL,
    [Statement] NVARCHAR(MAX) NOT NULL,
    [AttestedByUserID] UNIQUEIDENTIFIER NOT NULL,
    [AttestedAt] DATETIMEOFFSET NOT NULL,
    [IsSuperseded] BIT NOT NULL CONSTRAINT [DF_DocumentAttestation_IsSuperseded] DEFAULT (0),
    CONSTRAINT [FK_DocumentAttestation_Subject] FOREIGN KEY ([SubjectID]) REFERENCES ${flyway:defaultSchema}.[Subject]([ID]),
    CONSTRAINT [FK_DocumentAttestation_DocumentRequirement] FOREIGN KEY ([DocumentRequirementID]) REFERENCES ${flyway:defaultSchema}.[DocumentRequirement]([ID]),
    CONSTRAINT [FK_DocumentAttestation_AttestedByUser] FOREIGN KEY ([AttestedByUserID]) REFERENCES [${mjSchema}].[User]([ID])
);
GO

CREATE UNIQUE INDEX [UQ_DocumentAttestation_OneCurrent]
    ON ${flyway:defaultSchema}.[DocumentAttestation]([SubjectID], [DocumentRequirementID])
    WHERE [IsSuperseded] = 0;
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'An attestation recorded by a subject contact in lieu of uploading a restricted document.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentAttestation';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The subject this attestation is recorded for.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentAttestation',
    @level2type = N'COLUMN', @level2name = N'SubjectID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The document requirement satisfied by this attestation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentAttestation',
    @level2type = N'COLUMN', @level2name = N'DocumentRequirementID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The statement attested to by the contact.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentAttestation',
    @level2type = N'COLUMN', @level2name = N'Statement';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The user who recorded this attestation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentAttestation',
    @level2type = N'COLUMN', @level2name = N'AttestedByUserID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Timestamp when this attestation was recorded.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentAttestation',
    @level2type = N'COLUMN', @level2name = N'AttestedAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether a later attestation or upload replaced this record.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentAttestation',
    @level2type = N'COLUMN', @level2name = N'IsSuperseded';
GO

CREATE TABLE ${flyway:defaultSchema}.[ApplicationDocument] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_ApplicationDocument] PRIMARY KEY CONSTRAINT [DF_ApplicationDocument_ID] DEFAULT (NEWSEQUENTIALID()),
    [ApplicationID] UNIQUEIDENTIFIER NOT NULL,
    [SubjectID] UNIQUEIDENTIFIER NOT NULL,
    [EvidenceDocumentID] UNIQUEIDENTIFIER NULL,
    [DocumentAttestationID] UNIQUEIDENTIFIER NULL,
    [FrozenAt] DATETIMEOFFSET NOT NULL,
    CONSTRAINT [FK_ApplicationDocument_Application] FOREIGN KEY ([ApplicationID]) REFERENCES ${flyway:defaultSchema}.[Application]([ID]),
    CONSTRAINT [FK_ApplicationDocument_Subject] FOREIGN KEY ([SubjectID]) REFERENCES ${flyway:defaultSchema}.[Subject]([ID]),
    CONSTRAINT [FK_ApplicationDocument_EvidenceDocument] FOREIGN KEY ([EvidenceDocumentID]) REFERENCES ${flyway:defaultSchema}.[EvidenceDocument]([ID]),
    CONSTRAINT [FK_ApplicationDocument_DocumentAttestation] FOREIGN KEY ([DocumentAttestationID]) REFERENCES ${flyway:defaultSchema}.[DocumentAttestation]([ID]),
    CONSTRAINT [CK_ApplicationDocument_OneTarget] CHECK (([EvidenceDocumentID] IS NOT NULL AND [DocumentAttestationID] IS NULL) OR ([EvidenceDocumentID] IS NULL AND [DocumentAttestationID] IS NOT NULL))
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Frozen join linking a submitted application to the evidence documents and attestations in effect at submission.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ApplicationDocument';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The submitted application this frozen document link belongs to.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ApplicationDocument',
    @level2type = N'COLUMN', @level2name = N'ApplicationID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The subject of the application, server-set to match Application.SubjectID.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ApplicationDocument',
    @level2type = N'COLUMN', @level2name = N'SubjectID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The evidence document frozen into the application, when this entry references a file.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ApplicationDocument',
    @level2type = N'COLUMN', @level2name = N'EvidenceDocumentID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The document attestation frozen into the application, when this entry references an attestation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ApplicationDocument',
    @level2type = N'COLUMN', @level2name = N'DocumentAttestationID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Timestamp when this document link was frozen on submission.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ApplicationDocument',
    @level2type = N'COLUMN', @level2name = N'FrozenAt';
GO

CREATE TABLE ${flyway:defaultSchema}.[Extraction] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Extraction] PRIMARY KEY CONSTRAINT [DF_Extraction_ID] DEFAULT (NEWSEQUENTIALID()),
    [EvidenceDocumentID] UNIQUEIDENTIFIER NOT NULL,
    [StandardID] UNIQUEIDENTIFIER NOT NULL,
    [SubjectID] UNIQUEIDENTIFIER NOT NULL,
    [Value] NVARCHAR(MAX) NOT NULL,
    [Excerpt] NVARCHAR(MAX) NOT NULL,
    [StartOffset] INT NOT NULL,
    [EndOffset] INT NOT NULL,
    [PageReference] NVARCHAR(50) NULL,
    [HeadingPath] NVARCHAR(1000) NULL,
    [Confidence] DECIMAL(5,4) NOT NULL,
    [Reasoning] NVARCHAR(MAX) NULL,
    [Status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Extraction_Status] DEFAULT (N'Proposed'),
    [IsSuperseded] BIT NOT NULL CONSTRAINT [DF_Extraction_IsSuperseded] DEFAULT (0),
    [AIPromptRunID] UNIQUEIDENTIFIER NULL,
    CONSTRAINT [FK_Extraction_EvidenceDocument] FOREIGN KEY ([EvidenceDocumentID]) REFERENCES ${flyway:defaultSchema}.[EvidenceDocument]([ID]),
    CONSTRAINT [FK_Extraction_Standard] FOREIGN KEY ([StandardID]) REFERENCES ${flyway:defaultSchema}.[Standard]([ID]),
    CONSTRAINT [FK_Extraction_Subject] FOREIGN KEY ([SubjectID]) REFERENCES ${flyway:defaultSchema}.[Subject]([ID]),
    CONSTRAINT [FK_Extraction_AIPromptRun] FOREIGN KEY ([AIPromptRunID]) REFERENCES [${mjSchema}].[AIPromptRun]([ID]),
    CONSTRAINT [CK_Extraction_EndOffset] CHECK ([EndOffset] > [StartOffset]),
    CONSTRAINT [CK_Extraction_Confidence] CHECK ([Confidence] BETWEEN 0 AND 1),
    CONSTRAINT [CK_Extraction_Status] CHECK ([Status] IN (N'Proposed', N'Accepted', N'Rejected'))
);
GO

CREATE UNIQUE INDEX [UQ_Extraction_OneCurrent]
    ON ${flyway:defaultSchema}.[Extraction]([EvidenceDocumentID], [StandardID])
    WHERE [IsSuperseded] = 0;
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'An extracted answer and supporting excerpt read from one evidence document for one standard.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The evidence document this extraction was read from.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'EvidenceDocumentID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The standard this extraction addresses.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'StandardID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The subject of the evidence document, server-set.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'SubjectID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The drafted answer extracted for the standard.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'Value';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Verbatim quote from the document''s ExtractedText supporting this extraction.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'Excerpt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Zero-based character start offset of Excerpt within ExtractedText.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'StartOffset';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Exclusive character end offset of Excerpt within ExtractedText.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'EndOffset';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Page number or label where the excerpt appears, when known.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'PageReference';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Section heading path enclosing the excerpt, when known.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'HeadingPath';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Reader confidence score between 0 and 1.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'Confidence';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Explanation of how the excerpt supports the extracted value.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'Reasoning';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Review state of this extraction.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'Status';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether a newer reading superseded this extraction.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'IsSuperseded';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The MemberJunction AI prompt run that produced this extraction, or NULL for test readers.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Extraction',
    @level2type = N'COLUMN', @level2name = N'AIPromptRunID';
GO

CREATE TABLE ${flyway:defaultSchema}.[ResponseCitation] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_ResponseCitation] PRIMARY KEY CONSTRAINT [DF_ResponseCitation_ID] DEFAULT (NEWSEQUENTIALID()),
    [StandardResponseID] UNIQUEIDENTIFIER NOT NULL,
    [SubjectID] UNIQUEIDENTIFIER NOT NULL,
    [EvidenceDocumentID] UNIQUEIDENTIFIER NOT NULL,
    [ExtractionID] UNIQUEIDENTIFIER NULL,
    [SourceLabel] NVARCHAR(500) NOT NULL,
    [PageReference] NVARCHAR(50) NULL,
    [Excerpt] NVARCHAR(MAX) NOT NULL,
    [StartOffset] INT NOT NULL,
    [EndOffset] INT NOT NULL,
    CONSTRAINT [FK_ResponseCitation_StandardResponse] FOREIGN KEY ([StandardResponseID]) REFERENCES ${flyway:defaultSchema}.[StandardResponse]([ID]),
    CONSTRAINT [FK_ResponseCitation_Subject] FOREIGN KEY ([SubjectID]) REFERENCES ${flyway:defaultSchema}.[Subject]([ID]),
    CONSTRAINT [FK_ResponseCitation_EvidenceDocument] FOREIGN KEY ([EvidenceDocumentID]) REFERENCES ${flyway:defaultSchema}.[EvidenceDocument]([ID]),
    CONSTRAINT [FK_ResponseCitation_Extraction] FOREIGN KEY ([ExtractionID]) REFERENCES ${flyway:defaultSchema}.[Extraction]([ID])
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'A document citation attached to a standard response.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseCitation';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The standard response supported by this citation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseCitation',
    @level2type = N'COLUMN', @level2name = N'StandardResponseID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The subject of the application, server-set.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseCitation',
    @level2type = N'COLUMN', @level2name = N'SubjectID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The evidence document cited.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseCitation',
    @level2type = N'COLUMN', @level2name = N'EvidenceDocumentID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The extraction that supplied this citation, when created by document reading.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseCitation',
    @level2type = N'COLUMN', @level2name = N'ExtractionID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Display label of the cited source, such as the document file name.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseCitation',
    @level2type = N'COLUMN', @level2name = N'SourceLabel';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Page number or label where the cited excerpt appears, when known.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseCitation',
    @level2type = N'COLUMN', @level2name = N'PageReference';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Verbatim excerpt cited from the document.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseCitation',
    @level2type = N'COLUMN', @level2name = N'Excerpt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Zero-based character start offset of Excerpt within ExtractedText.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseCitation',
    @level2type = N'COLUMN', @level2name = N'StartOffset';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Exclusive character end offset of Excerpt within ExtractedText.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseCitation',
    @level2type = N'COLUMN', @level2name = N'EndOffset';
GO

CREATE TABLE ${flyway:defaultSchema}.[ResponseSource] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_ResponseSource] PRIMARY KEY CONSTRAINT [DF_ResponseSource_ID] DEFAULT (NEWSEQUENTIALID()),
    [StandardID] UNIQUEIDENTIFIER NOT NULL,
    [ProgramVersionID] UNIQUEIDENTIFIER NOT NULL,
    [SourceType] NVARCHAR(30) NOT NULL,
    [DocumentRequirementID] UNIQUEIDENTIFIER NULL,
    [Mode] NVARCHAR(20) NOT NULL CONSTRAINT [DF_ResponseSource_Mode] DEFAULT (N'Prefill Only'),
    [Rank] INT NOT NULL,
    [Sequence] INT NOT NULL CONSTRAINT [DF_ResponseSource_Sequence] DEFAULT (0),
    CONSTRAINT [FK_ResponseSource_Standard] FOREIGN KEY ([StandardID]) REFERENCES ${flyway:defaultSchema}.[Standard]([ID]),
    CONSTRAINT [FK_ResponseSource_ProgramVersion] FOREIGN KEY ([ProgramVersionID]) REFERENCES ${flyway:defaultSchema}.[ProgramVersion]([ID]),
    CONSTRAINT [FK_ResponseSource_DocumentRequirement] FOREIGN KEY ([DocumentRequirementID]) REFERENCES ${flyway:defaultSchema}.[DocumentRequirement]([ID]),
    CONSTRAINT [CK_ResponseSource_SourceType] CHECK ([SourceType] IN (N'Document Extraction')),
    CONSTRAINT [CK_ResponseSource_Mode] CHECK ([Mode] IN (N'Prefill Only', N'Verify Only', N'Both')),
    CONSTRAINT [CK_ResponseSource_Rank] CHECK ([Rank] >= 1)
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'An authoring-time source rule specifying where prefill or verification data for a standard comes from.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseSource';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The standard this response source serves.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseSource',
    @level2type = N'COLUMN', @level2name = N'StandardID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The program version of the standard, server-set to match Standard.ProgramVersionID.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseSource',
    @level2type = N'COLUMN', @level2name = N'ProgramVersionID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Kind of source used to prefill or verify the standard.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseSource',
    @level2type = N'COLUMN', @level2name = N'SourceType';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The document requirement read when SourceType is Document Extraction. Must belong to the same version.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseSource',
    @level2type = N'COLUMN', @level2name = N'DocumentRequirementID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether this source is used for prefill, verification, or both.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseSource',
    @level2type = N'COLUMN', @level2name = N'Mode';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Priority rank of this source among sources for the same standard, starting at 1.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseSource',
    @level2type = N'COLUMN', @level2name = N'Rank';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Declaration order of this source, used as tie-break within the same rank.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ResponseSource',
    @level2type = N'COLUMN', @level2name = N'Sequence';
GO

/* ============================================================================================
   ==== CODEGEN OUTPUT — DO NOT EDIT BELOW THIS LINE ====
   Generated by MemberJunction CodeGen (includeSchemas: ['__mj_BizAppsCredentialing']).
   Contains entity, field, value-list, relationship, and permission metadata, audit timestamp
   columns and triggers, FK indexes, base views, and CRUD stored procedures.
   ============================================================================================ */

/* SQL generated to create new entity MJ_BizApps_Credentialing: Response Citations */

      INSERT INTO [${mjSchema}].[Entity] (
         [ID],
         [Name],
         [DisplayName],
         [Description],
         [NameSuffix],
         [BaseTable],
         [BaseView],
         [SchemaName],
         [IncludeInAPI],
         [AllowUserSearchAPI],
         [AllowCaching],
         [TrackRecordChanges],
         [AuditRecordAccess],
         [AuditViewRuns],
         [AllowAllRowsAPI],
         [AllowCreateAPI],
         [AllowUpdateAPI],
         [AllowDeleteAPI],
         [UserViewMaxRows]
         , [__mj_CreatedAt]
         , [__mj_UpdatedAt]
      )
      VALUES (
         '183e220d-35d0-48cf-98e6-a48a90c2d3c8',
         'MJ_BizApps_Credentialing: Response Citations',
         'Response Citations',
         'A document citation attached to a standard response.',
         NULL,
         'ResponseCitation',
         'vwResponseCitations',
         '${flyway:defaultSchema}',
         1,
         1,
         0,
         1,
         0,
         0,
         0,
         1,
         1,
         1,
         1000
         , GETUTCDATE()
         , GETUTCDATE()
      );

/* SQL generated to add entity MJ_BizApps_Credentialing: Response Citations to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '183e220d-35d0-48cf-98e6-a48a90c2d3c8', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Response Citations for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('183e220d-35d0-48cf-98e6-a48a90c2d3c8' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('183e220d-35d0-48cf-98e6-a48a90c2d3c8' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Response Citations for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('183e220d-35d0-48cf-98e6-a48a90c2d3c8' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('183e220d-35d0-48cf-98e6-a48a90c2d3c8' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Response Sources */

      INSERT INTO [${mjSchema}].[Entity] (
         [ID],
         [Name],
         [DisplayName],
         [Description],
         [NameSuffix],
         [BaseTable],
         [BaseView],
         [SchemaName],
         [IncludeInAPI],
         [AllowUserSearchAPI],
         [AllowCaching],
         [TrackRecordChanges],
         [AuditRecordAccess],
         [AuditViewRuns],
         [AllowAllRowsAPI],
         [AllowCreateAPI],
         [AllowUpdateAPI],
         [AllowDeleteAPI],
         [UserViewMaxRows]
         , [__mj_CreatedAt]
         , [__mj_UpdatedAt]
      )
      VALUES (
         '587e835c-609b-4f52-b062-faba21bb962a',
         'MJ_BizApps_Credentialing: Response Sources',
         'Response Sources',
         'An authoring-time source rule specifying where prefill or verification data for a standard comes from.',
         NULL,
         'ResponseSource',
         'vwResponseSources',
         '${flyway:defaultSchema}',
         1,
         1,
         0,
         1,
         0,
         0,
         0,
         1,
         1,
         1,
         1000
         , GETUTCDATE()
         , GETUTCDATE()
      );

/* SQL generated to add entity MJ_BizApps_Credentialing: Response Sources to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '587e835c-609b-4f52-b062-faba21bb962a', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Response Sources for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('587e835c-609b-4f52-b062-faba21bb962a' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('587e835c-609b-4f52-b062-faba21bb962a' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Response Sources for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('587e835c-609b-4f52-b062-faba21bb962a' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('587e835c-609b-4f52-b062-faba21bb962a' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Subjects */

      INSERT INTO [${mjSchema}].[Entity] (
         [ID],
         [Name],
         [DisplayName],
         [Description],
         [NameSuffix],
         [BaseTable],
         [BaseView],
         [SchemaName],
         [IncludeInAPI],
         [AllowUserSearchAPI],
         [AllowCaching],
         [TrackRecordChanges],
         [AuditRecordAccess],
         [AuditViewRuns],
         [AllowAllRowsAPI],
         [AllowCreateAPI],
         [AllowUpdateAPI],
         [AllowDeleteAPI],
         [UserViewMaxRows]
         , [__mj_CreatedAt]
         , [__mj_UpdatedAt]
      )
      VALUES (
         '208290b3-a754-4c7a-94e7-e7279a8529f1',
         'MJ_BizApps_Credentialing: Subjects',
         'Subjects',
         'A person or organization being credentialed by an accrediting organization.',
         NULL,
         'Subject',
         'vwSubjects',
         '${flyway:defaultSchema}',
         1,
         1,
         0,
         1,
         0,
         0,
         0,
         1,
         1,
         1,
         1000
         , GETUTCDATE()
         , GETUTCDATE()
      );

/* SQL generated to add entity MJ_BizApps_Credentialing: Subjects to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '208290b3-a754-4c7a-94e7-e7279a8529f1', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Subjects for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('208290b3-a754-4c7a-94e7-e7279a8529f1' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('208290b3-a754-4c7a-94e7-e7279a8529f1' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Subjects for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('208290b3-a754-4c7a-94e7-e7279a8529f1' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('208290b3-a754-4c7a-94e7-e7279a8529f1' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Subject Contacts */

      INSERT INTO [${mjSchema}].[Entity] (
         [ID],
         [Name],
         [DisplayName],
         [Description],
         [NameSuffix],
         [BaseTable],
         [BaseView],
         [SchemaName],
         [IncludeInAPI],
         [AllowUserSearchAPI],
         [AllowCaching],
         [TrackRecordChanges],
         [AuditRecordAccess],
         [AuditViewRuns],
         [AllowAllRowsAPI],
         [AllowCreateAPI],
         [AllowUpdateAPI],
         [AllowDeleteAPI],
         [UserViewMaxRows]
         , [__mj_CreatedAt]
         , [__mj_UpdatedAt]
      )
      VALUES (
         '52713e19-8b12-4595-86a6-497b68738cb1',
         'MJ_BizApps_Credentialing: Subject Contacts',
         'Subject Contacts',
         'A user authorized to act for a credentialing subject on its applications and evidence.',
         NULL,
         'SubjectContact',
         'vwSubjectContacts',
         '${flyway:defaultSchema}',
         1,
         1,
         0,
         1,
         0,
         0,
         0,
         1,
         1,
         1,
         1000
         , GETUTCDATE()
         , GETUTCDATE()
      );

/* SQL generated to add entity MJ_BizApps_Credentialing: Subject Contacts to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '52713e19-8b12-4595-86a6-497b68738cb1', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Subject Contacts for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('52713e19-8b12-4595-86a6-497b68738cb1' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('52713e19-8b12-4595-86a6-497b68738cb1' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Subject Contacts for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('52713e19-8b12-4595-86a6-497b68738cb1' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('52713e19-8b12-4595-86a6-497b68738cb1' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Applications */

      INSERT INTO [${mjSchema}].[Entity] (
         [ID],
         [Name],
         [DisplayName],
         [Description],
         [NameSuffix],
         [BaseTable],
         [BaseView],
         [SchemaName],
         [IncludeInAPI],
         [AllowUserSearchAPI],
         [AllowCaching],
         [TrackRecordChanges],
         [AuditRecordAccess],
         [AuditViewRuns],
         [AllowAllRowsAPI],
         [AllowCreateAPI],
         [AllowUpdateAPI],
         [AllowDeleteAPI],
         [UserViewMaxRows]
         , [__mj_CreatedAt]
         , [__mj_UpdatedAt]
      )
      VALUES (
         '32c23034-191b-412a-98da-837f13525aaa',
         'MJ_BizApps_Credentialing: Applications',
         'Applications',
         'A subject''s application for a credential under a specific active program version.',
         NULL,
         'Application',
         'vwApplications',
         '${flyway:defaultSchema}',
         1,
         1,
         0,
         1,
         0,
         0,
         0,
         1,
         1,
         1,
         1000
         , GETUTCDATE()
         , GETUTCDATE()
      );

/* SQL generated to add entity MJ_BizApps_Credentialing: Applications to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '32c23034-191b-412a-98da-837f13525aaa', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Applications for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('32c23034-191b-412a-98da-837f13525aaa' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('32c23034-191b-412a-98da-837f13525aaa' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Applications for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('32c23034-191b-412a-98da-837f13525aaa' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('32c23034-191b-412a-98da-837f13525aaa' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Standard Responses */

      INSERT INTO [${mjSchema}].[Entity] (
         [ID],
         [Name],
         [DisplayName],
         [Description],
         [NameSuffix],
         [BaseTable],
         [BaseView],
         [SchemaName],
         [IncludeInAPI],
         [AllowUserSearchAPI],
         [AllowCaching],
         [TrackRecordChanges],
         [AuditRecordAccess],
         [AuditViewRuns],
         [AllowAllRowsAPI],
         [AllowCreateAPI],
         [AllowUpdateAPI],
         [AllowDeleteAPI],
         [UserViewMaxRows]
         , [__mj_CreatedAt]
         , [__mj_UpdatedAt]
      )
      VALUES (
         'a0473c42-29dc-4c4d-bc7f-438c5732fad6',
         'MJ_BizApps_Credentialing: Standard Responses',
         'Standard Responses',
         'An applicant''s response to one standard within an application.',
         NULL,
         'StandardResponse',
         'vwStandardResponses',
         '${flyway:defaultSchema}',
         1,
         1,
         0,
         1,
         0,
         0,
         0,
         1,
         1,
         1,
         1000
         , GETUTCDATE()
         , GETUTCDATE()
      );

/* SQL generated to add entity MJ_BizApps_Credentialing: Standard Responses to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', 'a0473c42-29dc-4c4d-bc7f-438c5732fad6', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Standard Responses for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('a0473c42-29dc-4c4d-bc7f-438c5732fad6' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('a0473c42-29dc-4c4d-bc7f-438c5732fad6' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Standard Responses for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('a0473c42-29dc-4c4d-bc7f-438c5732fad6' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('a0473c42-29dc-4c4d-bc7f-438c5732fad6' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Evidence Documents */

      INSERT INTO [${mjSchema}].[Entity] (
         [ID],
         [Name],
         [DisplayName],
         [Description],
         [NameSuffix],
         [BaseTable],
         [BaseView],
         [SchemaName],
         [IncludeInAPI],
         [AllowUserSearchAPI],
         [AllowCaching],
         [TrackRecordChanges],
         [AuditRecordAccess],
         [AuditViewRuns],
         [AllowAllRowsAPI],
         [AllowCreateAPI],
         [AllowUpdateAPI],
         [AllowDeleteAPI],
         [UserViewMaxRows]
         , [__mj_CreatedAt]
         , [__mj_UpdatedAt]
      )
      VALUES (
         '852e8212-4c5b-4a90-b446-e89eecd3db8d',
         'MJ_BizApps_Credentialing: Evidence Documents',
         'Evidence Documents',
         'An evidence file uploaded to a subject''s document library.',
         NULL,
         'EvidenceDocument',
         'vwEvidenceDocuments',
         '${flyway:defaultSchema}',
         1,
         1,
         0,
         1,
         0,
         0,
         0,
         1,
         1,
         1,
         1000
         , GETUTCDATE()
         , GETUTCDATE()
      );

/* SQL generated to add entity MJ_BizApps_Credentialing: Evidence Documents to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '852e8212-4c5b-4a90-b446-e89eecd3db8d', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Evidence Documents for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('852e8212-4c5b-4a90-b446-e89eecd3db8d' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('852e8212-4c5b-4a90-b446-e89eecd3db8d' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Evidence Documents for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('852e8212-4c5b-4a90-b446-e89eecd3db8d' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('852e8212-4c5b-4a90-b446-e89eecd3db8d' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Document Attestations */

      INSERT INTO [${mjSchema}].[Entity] (
         [ID],
         [Name],
         [DisplayName],
         [Description],
         [NameSuffix],
         [BaseTable],
         [BaseView],
         [SchemaName],
         [IncludeInAPI],
         [AllowUserSearchAPI],
         [AllowCaching],
         [TrackRecordChanges],
         [AuditRecordAccess],
         [AuditViewRuns],
         [AllowAllRowsAPI],
         [AllowCreateAPI],
         [AllowUpdateAPI],
         [AllowDeleteAPI],
         [UserViewMaxRows]
         , [__mj_CreatedAt]
         , [__mj_UpdatedAt]
      )
      VALUES (
         '504b3d47-e3bd-417b-b67b-38a041deb700',
         'MJ_BizApps_Credentialing: Document Attestations',
         'Document Attestations',
         'An attestation recorded by a subject contact in lieu of uploading a restricted document.',
         NULL,
         'DocumentAttestation',
         'vwDocumentAttestations',
         '${flyway:defaultSchema}',
         1,
         1,
         0,
         1,
         0,
         0,
         0,
         1,
         1,
         1,
         1000
         , GETUTCDATE()
         , GETUTCDATE()
      );

/* SQL generated to add entity MJ_BizApps_Credentialing: Document Attestations to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '504b3d47-e3bd-417b-b67b-38a041deb700', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Document Attestations for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('504b3d47-e3bd-417b-b67b-38a041deb700' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('504b3d47-e3bd-417b-b67b-38a041deb700' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Document Attestations for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('504b3d47-e3bd-417b-b67b-38a041deb700' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('504b3d47-e3bd-417b-b67b-38a041deb700' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Application Documents */

      INSERT INTO [${mjSchema}].[Entity] (
         [ID],
         [Name],
         [DisplayName],
         [Description],
         [NameSuffix],
         [BaseTable],
         [BaseView],
         [SchemaName],
         [IncludeInAPI],
         [AllowUserSearchAPI],
         [AllowCaching],
         [TrackRecordChanges],
         [AuditRecordAccess],
         [AuditViewRuns],
         [AllowAllRowsAPI],
         [AllowCreateAPI],
         [AllowUpdateAPI],
         [AllowDeleteAPI],
         [UserViewMaxRows]
         , [__mj_CreatedAt]
         , [__mj_UpdatedAt]
      )
      VALUES (
         'e3f6deb2-d124-478d-a88c-ae856162b461',
         'MJ_BizApps_Credentialing: Application Documents',
         'Application Documents',
         'Frozen join linking a submitted application to the evidence documents and attestations in effect at submission.',
         NULL,
         'ApplicationDocument',
         'vwApplicationDocuments',
         '${flyway:defaultSchema}',
         1,
         1,
         0,
         1,
         0,
         0,
         0,
         1,
         1,
         1,
         1000
         , GETUTCDATE()
         , GETUTCDATE()
      );

/* SQL generated to add entity MJ_BizApps_Credentialing: Application Documents to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', 'e3f6deb2-d124-478d-a88c-ae856162b461', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Application Documents for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('e3f6deb2-d124-478d-a88c-ae856162b461' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('e3f6deb2-d124-478d-a88c-ae856162b461' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Application Documents for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('e3f6deb2-d124-478d-a88c-ae856162b461' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('e3f6deb2-d124-478d-a88c-ae856162b461' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Extractions */

      INSERT INTO [${mjSchema}].[Entity] (
         [ID],
         [Name],
         [DisplayName],
         [Description],
         [NameSuffix],
         [BaseTable],
         [BaseView],
         [SchemaName],
         [IncludeInAPI],
         [AllowUserSearchAPI],
         [AllowCaching],
         [TrackRecordChanges],
         [AuditRecordAccess],
         [AuditViewRuns],
         [AllowAllRowsAPI],
         [AllowCreateAPI],
         [AllowUpdateAPI],
         [AllowDeleteAPI],
         [UserViewMaxRows]
         , [__mj_CreatedAt]
         , [__mj_UpdatedAt]
      )
      VALUES (
         '4af932aa-77ff-411e-ad94-e9b87ab25e3b',
         'MJ_BizApps_Credentialing: Extractions',
         'Extractions',
         'An extracted answer and supporting excerpt read from one evidence document for one standard.',
         NULL,
         'Extraction',
         'vwExtractions',
         '${flyway:defaultSchema}',
         1,
         1,
         0,
         1,
         0,
         0,
         0,
         1,
         1,
         1,
         1000
         , GETUTCDATE()
         , GETUTCDATE()
      );

/* SQL generated to add entity MJ_BizApps_Credentialing: Extractions to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '4af932aa-77ff-411e-ad94-e9b87ab25e3b', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Extractions for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('4af932aa-77ff-411e-ad94-e9b87ab25e3b' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('4af932aa-77ff-411e-ad94-e9b87ab25e3b' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Extractions for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('4af932aa-77ff-411e-ad94-e9b87ab25e3b' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('4af932aa-77ff-411e-ad94-e9b87ab25e3b' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.DocumentAttestation */
ALTER TABLE [${flyway:defaultSchema}].[DocumentAttestation] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.DocumentAttestation */
UPDATE [${flyway:defaultSchema}].[DocumentAttestation] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.DocumentAttestation */
ALTER TABLE [${flyway:defaultSchema}].[DocumentAttestation] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.DocumentAttestation */
ALTER TABLE [${flyway:defaultSchema}].[DocumentAttestation] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_DocumentAttestation___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.DocumentAttestation */
ALTER TABLE [${flyway:defaultSchema}].[DocumentAttestation] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.DocumentAttestation */
UPDATE [${flyway:defaultSchema}].[DocumentAttestation] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.DocumentAttestation */
ALTER TABLE [${flyway:defaultSchema}].[DocumentAttestation] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.DocumentAttestation */
ALTER TABLE [${flyway:defaultSchema}].[DocumentAttestation] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_DocumentAttestation___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.StandardResponse */
ALTER TABLE [${flyway:defaultSchema}].[StandardResponse] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.StandardResponse */
UPDATE [${flyway:defaultSchema}].[StandardResponse] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.StandardResponse */
ALTER TABLE [${flyway:defaultSchema}].[StandardResponse] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.StandardResponse */
ALTER TABLE [${flyway:defaultSchema}].[StandardResponse] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_StandardResponse___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.StandardResponse */
ALTER TABLE [${flyway:defaultSchema}].[StandardResponse] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.StandardResponse */
UPDATE [${flyway:defaultSchema}].[StandardResponse] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.StandardResponse */
ALTER TABLE [${flyway:defaultSchema}].[StandardResponse] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.StandardResponse */
ALTER TABLE [${flyway:defaultSchema}].[StandardResponse] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_StandardResponse___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.SubjectContact */
ALTER TABLE [${flyway:defaultSchema}].[SubjectContact] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.SubjectContact */
UPDATE [${flyway:defaultSchema}].[SubjectContact] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.SubjectContact */
ALTER TABLE [${flyway:defaultSchema}].[SubjectContact] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.SubjectContact */
ALTER TABLE [${flyway:defaultSchema}].[SubjectContact] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_SubjectContact___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.SubjectContact */
ALTER TABLE [${flyway:defaultSchema}].[SubjectContact] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.SubjectContact */
UPDATE [${flyway:defaultSchema}].[SubjectContact] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.SubjectContact */
ALTER TABLE [${flyway:defaultSchema}].[SubjectContact] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.SubjectContact */
ALTER TABLE [${flyway:defaultSchema}].[SubjectContact] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_SubjectContact___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Application */
ALTER TABLE [${flyway:defaultSchema}].[Application] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Application */
UPDATE [${flyway:defaultSchema}].[Application] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Application */
ALTER TABLE [${flyway:defaultSchema}].[Application] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Application */
ALTER TABLE [${flyway:defaultSchema}].[Application] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Application___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Application */
ALTER TABLE [${flyway:defaultSchema}].[Application] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Application */
UPDATE [${flyway:defaultSchema}].[Application] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Application */
ALTER TABLE [${flyway:defaultSchema}].[Application] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Application */
ALTER TABLE [${flyway:defaultSchema}].[Application] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Application___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ResponseCitation */
ALTER TABLE [${flyway:defaultSchema}].[ResponseCitation] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ResponseCitation */
UPDATE [${flyway:defaultSchema}].[ResponseCitation] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ResponseCitation */
ALTER TABLE [${flyway:defaultSchema}].[ResponseCitation] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ResponseCitation */
ALTER TABLE [${flyway:defaultSchema}].[ResponseCitation] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_ResponseCitation___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ResponseCitation */
ALTER TABLE [${flyway:defaultSchema}].[ResponseCitation] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ResponseCitation */
UPDATE [${flyway:defaultSchema}].[ResponseCitation] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ResponseCitation */
ALTER TABLE [${flyway:defaultSchema}].[ResponseCitation] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ResponseCitation */
ALTER TABLE [${flyway:defaultSchema}].[ResponseCitation] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_ResponseCitation___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ApplicationDocument */
ALTER TABLE [${flyway:defaultSchema}].[ApplicationDocument] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ApplicationDocument */
UPDATE [${flyway:defaultSchema}].[ApplicationDocument] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ApplicationDocument */
ALTER TABLE [${flyway:defaultSchema}].[ApplicationDocument] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ApplicationDocument */
ALTER TABLE [${flyway:defaultSchema}].[ApplicationDocument] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_ApplicationDocument___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ApplicationDocument */
ALTER TABLE [${flyway:defaultSchema}].[ApplicationDocument] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ApplicationDocument */
UPDATE [${flyway:defaultSchema}].[ApplicationDocument] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ApplicationDocument */
ALTER TABLE [${flyway:defaultSchema}].[ApplicationDocument] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ApplicationDocument */
ALTER TABLE [${flyway:defaultSchema}].[ApplicationDocument] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_ApplicationDocument___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Subject */
ALTER TABLE [${flyway:defaultSchema}].[Subject] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Subject */
UPDATE [${flyway:defaultSchema}].[Subject] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Subject */
ALTER TABLE [${flyway:defaultSchema}].[Subject] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Subject */
ALTER TABLE [${flyway:defaultSchema}].[Subject] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Subject___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Subject */
ALTER TABLE [${flyway:defaultSchema}].[Subject] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Subject */
UPDATE [${flyway:defaultSchema}].[Subject] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Subject */
ALTER TABLE [${flyway:defaultSchema}].[Subject] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Subject */
ALTER TABLE [${flyway:defaultSchema}].[Subject] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Subject___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.EvidenceDocument */
ALTER TABLE [${flyway:defaultSchema}].[EvidenceDocument] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.EvidenceDocument */
UPDATE [${flyway:defaultSchema}].[EvidenceDocument] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.EvidenceDocument */
ALTER TABLE [${flyway:defaultSchema}].[EvidenceDocument] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.EvidenceDocument */
ALTER TABLE [${flyway:defaultSchema}].[EvidenceDocument] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_EvidenceDocument___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.EvidenceDocument */
ALTER TABLE [${flyway:defaultSchema}].[EvidenceDocument] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.EvidenceDocument */
UPDATE [${flyway:defaultSchema}].[EvidenceDocument] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.EvidenceDocument */
ALTER TABLE [${flyway:defaultSchema}].[EvidenceDocument] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.EvidenceDocument */
ALTER TABLE [${flyway:defaultSchema}].[EvidenceDocument] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_EvidenceDocument___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Extraction */
ALTER TABLE [${flyway:defaultSchema}].[Extraction] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Extraction */
UPDATE [${flyway:defaultSchema}].[Extraction] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Extraction */
ALTER TABLE [${flyway:defaultSchema}].[Extraction] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Extraction */
ALTER TABLE [${flyway:defaultSchema}].[Extraction] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Extraction___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Extraction */
ALTER TABLE [${flyway:defaultSchema}].[Extraction] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Extraction */
UPDATE [${flyway:defaultSchema}].[Extraction] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Extraction */
ALTER TABLE [${flyway:defaultSchema}].[Extraction] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Extraction */
ALTER TABLE [${flyway:defaultSchema}].[Extraction] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Extraction___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ResponseSource */
ALTER TABLE [${flyway:defaultSchema}].[ResponseSource] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ResponseSource */
UPDATE [${flyway:defaultSchema}].[ResponseSource] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ResponseSource */
ALTER TABLE [${flyway:defaultSchema}].[ResponseSource] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ResponseSource */
ALTER TABLE [${flyway:defaultSchema}].[ResponseSource] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_ResponseSource___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ResponseSource */
ALTER TABLE [${flyway:defaultSchema}].[ResponseSource] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ResponseSource */
UPDATE [${flyway:defaultSchema}].[ResponseSource] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ResponseSource */
ALTER TABLE [${flyway:defaultSchema}].[ResponseSource] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ResponseSource */
ALTER TABLE [${flyway:defaultSchema}].[ResponseSource] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_ResponseSource___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to insert 142 new entity field(s) */

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2b3a7a31-5a7a-4270-819a-bda98101f57c' OR (EntityID = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND Name = 'ID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '2b3a7a31-5a7a-4270-819a-bda98101f57c',
            '504B3D47-E3BD-417B-B67B-38A041DEB700', -- Entity: MJ_BizApps_Credentialing: Document Attestations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700'),
            'ID',
            'ID',
            NULL,
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            'newsequentialid()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            1,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e6d995fc-1ac4-4270-879e-b05fd421abf2' OR (EntityID = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND Name = 'SubjectID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'e6d995fc-1ac4-4270-879e-b05fd421abf2',
            '504B3D47-E3BD-417B-B67B-38A041DEB700', -- Entity: MJ_BizApps_Credentialing: Document Attestations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700'),
            'SubjectID',
            'Subject ID',
            'The subject this attestation is recorded for.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '208290B3-A754-4C7A-94E7-E7279A8529F1',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '60f9e5b4-622f-4a51-a69e-64853dca0bbe' OR (EntityID = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND Name = 'DocumentRequirementID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '60f9e5b4-622f-4a51-a69e-64853dca0bbe',
            '504B3D47-E3BD-417B-B67B-38A041DEB700', -- Entity: MJ_BizApps_Credentialing: Document Attestations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700'),
            'DocumentRequirementID',
            'Document Requirement ID',
            'The document requirement satisfied by this attestation.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'abd5813a-9c20-4706-a5c1-49c2f6ec9bd9' OR (EntityID = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND Name = 'Statement')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'abd5813a-9c20-4706-a5c1-49c2f6ec9bd9',
            '504B3D47-E3BD-417B-B67B-38A041DEB700', -- Entity: MJ_BizApps_Credentialing: Document Attestations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700'),
            'Statement',
            'Statement',
            'The statement attested to by the contact.',
            'nvarchar',
            -1,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '69565046-0c17-4ab3-bfcc-8e46d589693a' OR (EntityID = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND Name = 'AttestedByUserID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '69565046-0c17-4ab3-bfcc-8e46d589693a',
            '504B3D47-E3BD-417B-B67B-38A041DEB700', -- Entity: MJ_BizApps_Credentialing: Document Attestations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700'),
            'AttestedByUserID',
            'Attested By User ID',
            'The user who recorded this attestation.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            'E1238F34-2837-EF11-86D4-6045BDEE16E6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e769b0d3-dcea-42b8-92b8-19469d78adf7' OR (EntityID = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND Name = 'AttestedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'e769b0d3-dcea-42b8-92b8-19469d78adf7',
            '504B3D47-E3BD-417B-B67B-38A041DEB700', -- Entity: MJ_BizApps_Credentialing: Document Attestations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700'),
            'AttestedAt',
            'Attested At',
            'Timestamp when this attestation was recorded.',
            'datetimeoffset',
            10,
            34,
            7,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5e7be04c-c85c-4d15-9c9e-4d260f6dcf7c' OR (EntityID = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND Name = 'IsSuperseded')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '5e7be04c-c85c-4d15-9c9e-4d260f6dcf7c',
            '504B3D47-E3BD-417B-B67B-38A041DEB700', -- Entity: MJ_BizApps_Credentialing: Document Attestations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700'),
            'IsSuperseded',
            'Is Superseded',
            'Whether a later attestation or upload replaced this record.',
            'bit',
            1,
            1,
            0,
            0,
            '(0)',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f1f77187-9acc-4ce0-98d8-64f70e5b1758' OR (EntityID = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND Name = '__mj_CreatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'f1f77187-9acc-4ce0-98d8-64f70e5b1758',
            '504B3D47-E3BD-417B-B67B-38A041DEB700', -- Entity: MJ_BizApps_Credentialing: Document Attestations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700'),
            '__mj_CreatedAt',
            'Created At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1a489f60-4464-4a2c-9ba5-493ccb4e2e0e' OR (EntityID = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND Name = '__mj_UpdatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '1a489f60-4464-4a2c-9ba5-493ccb4e2e0e',
            '504B3D47-E3BD-417B-B67B-38A041DEB700', -- Entity: MJ_BizApps_Credentialing: Document Attestations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700'),
            '__mj_UpdatedAt',
            'Updated At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '88f25d3f-78f9-4b13-ae8b-cab7d2e65876' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'ID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '88f25d3f-78f9-4b13-ae8b-cab7d2e65876',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'ID',
            'ID',
            NULL,
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            'newsequentialid()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            1,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8d59f26f-75e4-49cc-8822-4a58e246b81f' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'ApplicationID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8d59f26f-75e4-49cc-8822-4a58e246b81f',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'ApplicationID',
            'Application ID',
            'The application this response belongs to.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '32C23034-191B-412A-98DA-837F13525AAA',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '413df826-e45a-4316-8d04-dfab72df37a9' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'StandardID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '413df826-e45a-4316-8d04-dfab72df37a9',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'StandardID',
            'Standard ID',
            'The standard being answered.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '82E1DFB0-3B46-4F20-A613-1CD624A71720',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '079b3ff2-c0d7-486e-9f07-7ff5441a4157' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'SubjectID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '079b3ff2-c0d7-486e-9f07-7ff5441a4157',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'SubjectID',
            'Subject ID',
            'The subject of the application, server-set to match Application.SubjectID.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '208290B3-A754-4C7A-94E7-E7279A8529F1',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'b7ce63bf-c94f-4883-900b-800ca6b55b7e' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'ResponseText')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'b7ce63bf-c94f-4883-900b-800ca6b55b7e',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'ResponseText',
            'Response Text',
            'The current narrative or drafted answer text.',
            'nvarchar',
            -1,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '7ba83f44-2b89-41a9-82ee-02725cc0ccbf' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'SelfAssessment')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '7ba83f44-2b89-41a9-82ee-02725cc0ccbf',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'SelfAssessment',
            'Self Assessment',
            'The applicant''s self-assessment of whether the standard is met.',
            'nvarchar',
            40,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8f207e5f-e8fc-4bfa-81e8-bd0e466fcab5' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'Status')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8f207e5f-e8fc-4bfa-81e8-bd0e466fcab5',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'Status',
            'Status',
            'Workflow status of this response.',
            'nvarchar',
            40,
            0,
            0,
            0,
            'Empty',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'de27f7db-e4ee-42e4-8323-32cc52b19df1' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'AuthorType')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'de27f7db-e4ee-42e4-8323-32cc52b19df1',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'AuthorType',
            'Author Type',
            'Whether the current response text was written by a human or an automated reader.',
            'nvarchar',
            20,
            0,
            0,
            0,
            'Human',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'bc15e8ad-90a3-429b-b75f-2a0b734d54f4' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'LastEditedByUserID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'bc15e8ad-90a3-429b-b75f-2a0b734d54f4',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'LastEditedByUserID',
            'Last Edited By User ID',
            'The user who most recently edited this response.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            'E1238F34-2837-EF11-86D4-6045BDEE16E6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8aa9ef9c-2d0f-45b9-8609-bf549b77357b' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'ConfirmedByUserID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8aa9ef9c-2d0f-45b9-8609-bf549b77357b',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'ConfirmedByUserID',
            'Confirmed By User ID',
            'The subject contact who confirmed this response.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            'E1238F34-2837-EF11-86D4-6045BDEE16E6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c4641806-3874-49df-8263-2082c112beaa' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'ConfirmedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'c4641806-3874-49df-8263-2082c112beaa',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'ConfirmedAt',
            'Confirmed At',
            'Timestamp when this response was confirmed.',
            'datetimeoffset',
            10,
            34,
            7,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8f5b37f6-1dfb-4c74-ae58-2265377c0b59' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'SourceType')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8f5b37f6-1dfb-4c74-ae58-2265377c0b59',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'SourceType',
            'Source Type',
            'Kind of source that supplied a prefilled or located response.',
            'nvarchar',
            60,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0f976cee-62e0-45f7-8027-dccde2779517' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'SourceLabel')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '0f976cee-62e0-45f7-8027-dccde2779517',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'SourceLabel',
            'Source Label',
            'Human-readable label of the source shown in provenance, such as the document file name.',
            'nvarchar',
            1000,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '92b44ff4-735c-4485-8ee3-7c8221dd3c74' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'SourceReference')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '92b44ff4-735c-4485-8ee3-7c8221dd3c74',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'SourceReference',
            'Source Reference',
            'Identifier of the source record, such as the extraction ID.',
            'nvarchar',
            200,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0dc6e1db-ecc9-4351-9065-0d07c50b1a82' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'SourceRetrievedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '0dc6e1db-ecc9-4351-9065-0d07c50b1a82',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'SourceRetrievedAt',
            'Source Retrieved At',
            'Timestamp when the prefill or located value was retrieved from its source.',
            'datetimeoffset',
            10,
            34,
            7,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5a83f240-fca8-4e02-9b8d-64bd5b518b6b' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'SourceRawValue')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '5a83f240-fca8-4e02-9b8d-64bd5b518b6b',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'SourceRawValue',
            'Source Raw Value',
            'Original value resolved from the source, preserved if the applicant edits the text.',
            'nvarchar',
            -1,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8513a5da-8f7c-4500-bf5c-5517e27fd3f9' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'IsStale')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8513a5da-8f7c-4500-bf5c-5517e27fd3f9',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'IsStale',
            'Is Stale',
            'Whether the underlying source changed after this response was drafted.',
            'bit',
            1,
            1,
            0,
            0,
            '(0)',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '75cf88dc-0510-450a-b018-196c0fc761b4' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'ReopenReason')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '75cf88dc-0510-450a-b018-196c0fc761b4',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'ReopenReason',
            'Reopen Reason',
            'Staff explanation recorded when a confirmed response was reopened.',
            'nvarchar',
            -1,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c541fcd9-8b8e-43cd-8030-ffd2a05a7e80' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = '__mj_CreatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'c541fcd9-8b8e-43cd-8030-ffd2a05a7e80',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            '__mj_CreatedAt',
            'Created At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'dd1c328d-75d3-42be-a07f-5539e9e9ce76' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = '__mj_UpdatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'dd1c328d-75d3-42be-a07f-5539e9e9ce76',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            '__mj_UpdatedAt',
            'Updated At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'd0d2ad68-cd15-4fe5-ba4e-35687e2cb203' OR (EntityID = '52713E19-8B12-4595-86A6-497B68738CB1' AND Name = 'ID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'd0d2ad68-cd15-4fe5-ba4e-35687e2cb203',
            '52713E19-8B12-4595-86A6-497B68738CB1', -- Entity: MJ_BizApps_Credentialing: Subject Contacts
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '52713E19-8B12-4595-86A6-497B68738CB1'),
            'ID',
            'ID',
            NULL,
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            'newsequentialid()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            1,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8e2d5cfc-95d2-4dba-a2a7-95e3d890e5b7' OR (EntityID = '52713E19-8B12-4595-86A6-497B68738CB1' AND Name = 'SubjectID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8e2d5cfc-95d2-4dba-a2a7-95e3d890e5b7',
            '52713E19-8B12-4595-86A6-497B68738CB1', -- Entity: MJ_BizApps_Credentialing: Subject Contacts
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '52713E19-8B12-4595-86A6-497B68738CB1'),
            'SubjectID',
            'Subject ID',
            'The credentialing subject this contact acts for.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '208290B3-A754-4C7A-94E7-E7279A8529F1',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'd6ba3ece-f655-44b8-b7b6-aa35283bfb83' OR (EntityID = '52713E19-8B12-4595-86A6-497B68738CB1' AND Name = 'UserID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'd6ba3ece-f655-44b8-b7b6-aa35283bfb83',
            '52713E19-8B12-4595-86A6-497B68738CB1', -- Entity: MJ_BizApps_Credentialing: Subject Contacts
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '52713E19-8B12-4595-86A6-497B68738CB1'),
            'UserID',
            'User ID',
            'The MemberJunction user account of this contact.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            'E1238F34-2837-EF11-86D4-6045BDEE16E6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '639ec830-6932-43a6-ba94-556eca741f8b' OR (EntityID = '52713E19-8B12-4595-86A6-497B68738CB1' AND Name = 'ContactRole')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '639ec830-6932-43a6-ba94-556eca741f8b',
            '52713E19-8B12-4595-86A6-497B68738CB1', -- Entity: MJ_BizApps_Credentialing: Subject Contacts
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '52713E19-8B12-4595-86A6-497B68738CB1'),
            'ContactRole',
            'Contact Role',
            'Whether this contact is the primary applicant contact or supporting staff.',
            'nvarchar',
            40,
            0,
            0,
            0,
            'Primary',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'b9821520-d8c4-4bf2-b056-d240f59ff88a' OR (EntityID = '52713E19-8B12-4595-86A6-497B68738CB1' AND Name = 'InvitedByUserID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'b9821520-d8c4-4bf2-b056-d240f59ff88a',
            '52713E19-8B12-4595-86A6-497B68738CB1', -- Entity: MJ_BizApps_Credentialing: Subject Contacts
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '52713E19-8B12-4595-86A6-497B68738CB1'),
            'InvitedByUserID',
            'Invited By User ID',
            'The staff user who most recently invited this contact.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            'E1238F34-2837-EF11-86D4-6045BDEE16E6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e66c162a-9f88-49bb-99dd-7612f97eba09' OR (EntityID = '52713E19-8B12-4595-86A6-497B68738CB1' AND Name = 'LastInvitedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'e66c162a-9f88-49bb-99dd-7612f97eba09',
            '52713E19-8B12-4595-86A6-497B68738CB1', -- Entity: MJ_BizApps_Credentialing: Subject Contacts
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '52713E19-8B12-4595-86A6-497B68738CB1'),
            'LastInvitedAt',
            'Last Invited At',
            'When this contact was most recently invited.',
            'datetimeoffset',
            10,
            34,
            7,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '057919f1-925f-42d3-aa69-28d16cb265bc' OR (EntityID = '52713E19-8B12-4595-86A6-497B68738CB1' AND Name = '__mj_CreatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '057919f1-925f-42d3-aa69-28d16cb265bc',
            '52713E19-8B12-4595-86A6-497B68738CB1', -- Entity: MJ_BizApps_Credentialing: Subject Contacts
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '52713E19-8B12-4595-86A6-497B68738CB1'),
            '__mj_CreatedAt',
            'Created At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f51fb7e6-3060-4264-bf03-8e7b7598105b' OR (EntityID = '52713E19-8B12-4595-86A6-497B68738CB1' AND Name = '__mj_UpdatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'f51fb7e6-3060-4264-bf03-8e7b7598105b',
            '52713E19-8B12-4595-86A6-497B68738CB1', -- Entity: MJ_BizApps_Credentialing: Subject Contacts
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '52713E19-8B12-4595-86A6-497B68738CB1'),
            '__mj_UpdatedAt',
            'Updated At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '36c6e77f-d54d-4730-be9e-f7bf5b2ce91e' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'ID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '36c6e77f-d54d-4730-be9e-f7bf5b2ce91e',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'ID',
            'ID',
            NULL,
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            'newsequentialid()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            1,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c2e7e364-39f3-414e-a158-c9f14f77573b' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'SubjectID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'c2e7e364-39f3-414e-a158-c9f14f77573b',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'SubjectID',
            'Subject ID',
            'The subject applying for the credential. Cannot be changed after creation.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '208290B3-A754-4C7A-94E7-E7279A8529F1',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c7780057-7357-462d-a560-f36c2c1c247e' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'ProgramVersionID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'c7780057-7357-462d-a560-f36c2c1c247e',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'ProgramVersionID',
            'Program Version ID',
            'The program version this application is judged against. Cannot be changed after creation.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1f62a63d-b005-4ed3-aef2-b2ad46385f97' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'Status')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '1f62a63d-b005-4ed3-aef2-b2ad46385f97',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'Status',
            'Status',
            'Current workflow stage of the application.',
            'nvarchar',
            60,
            0,
            0,
            0,
            'Draft',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'dff7d91e-4695-4ab9-9f5f-45156607c3e7' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'IsHistorical')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'dff7d91e-4695-4ab9-9f5f-45156607c3e7',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'IsHistorical',
            'Is Historical',
            'Whether this row represents imported historical application data.',
            'bit',
            1,
            1,
            0,
            0,
            '(0)',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1381816a-1db5-4ade-b8ca-099f9b725844' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'SubmittedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '1381816a-1db5-4ade-b8ca-099f9b725844',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'SubmittedAt',
            'Submitted At',
            'Server-stamped timestamp when the application was submitted.',
            'datetimeoffset',
            10,
            34,
            7,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '6f6cba6b-6700-4715-bfa5-f1a9873ae02a' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'SubmittedByUserID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '6f6cba6b-6700-4715-bfa5-f1a9873ae02a',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'SubmittedByUserID',
            'Submitted By User ID',
            'The contact user who submitted the application.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            'E1238F34-2837-EF11-86D4-6045BDEE16E6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ee16ebe2-d008-4f64-ac2a-edd0fe93d5b6' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'SubmissionDispatchedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'ee16ebe2-d008-4f64-ac2a-edd0fe93d5b6',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'SubmissionDispatchedAt',
            'Submission Dispatched At',
            'Timestamp when all post-submission subscribers completed successfully.',
            'datetimeoffset',
            10,
            34,
            7,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '139a7122-05b2-44d2-a135-d774c0e6c94d' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'SubmissionDispatchClaimID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '139a7122-05b2-44d2-a135-d774c0e6c94d',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'SubmissionDispatchClaimID',
            'Submission Dispatch Claim ID',
            'Identifier of the submission-dispatch attempt currently holding the claim.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'bd8f44c3-96d7-4995-b993-09ac491f2953' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'SubmissionDispatchClaimedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'bd8f44c3-96d7-4995-b993-09ac491f2953',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'SubmissionDispatchClaimedAt',
            'Submission Dispatch Claimed At',
            'Timestamp when the current submission-dispatch claim was taken.',
            'datetimeoffset',
            10,
            34,
            7,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'fc007f35-eaed-444c-b644-19ad3fc65aec' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'SubmissionDispatchAttempts')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'fc007f35-eaed-444c-b644-19ad3fc65aec',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'SubmissionDispatchAttempts',
            'Submission Dispatch Attempts',
            'Number of submission-dispatch attempts made so far. Dispatch stops after 5.',
            'int',
            4,
            10,
            0,
            0,
            '(0)',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e76baa91-ffc3-4e72-b47b-ca974b8ea66a' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'SubmissionDispatchNote')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'e76baa91-ffc3-4e72-b47b-ca974b8ea66a',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'SubmissionDispatchNote',
            'Submission Dispatch Note',
            'Staff-facing explanation recorded when submission dispatch stops retrying.',
            'nvarchar',
            1000,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'd8cd33c2-7393-4c41-a5a5-cacab6f08ee8' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'SubjectSnapshot')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'd8cd33c2-7393-4c41-a5a5-cacab6f08ee8',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'SubjectSnapshot',
            'Subject Snapshot',
            'JSON snapshot of the subject''s display name, type, email and party reference captured at submission.',
            'nvarchar',
            -1,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c4cb5e12-820e-4ce5-b84b-5098de3291bb' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'AttestationOfficerName')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'c4cb5e12-820e-4ce5-b84b-5098de3291bb',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'AttestationOfficerName',
            'Attestation Officer Name',
            'Name of the officer who signed the governing-body attestation.',
            'nvarchar',
            510,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '435660e7-d212-40be-abc8-f4299553dcef' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'AttestationOfficerRole')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '435660e7-d212-40be-abc8-f4299553dcef',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'AttestationOfficerRole',
            'Attestation Officer Role',
            'Title or role of the officer who signed the governing-body attestation.',
            'nvarchar',
            510,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '4e9a6210-cf98-4844-9955-34dd14d9c224' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'AttestationApprovalDate')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '4e9a6210-cf98-4844-9955-34dd14d9c224',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'AttestationApprovalDate',
            'Attestation Approval Date',
            'Date the governing body approved the application.',
            'date',
            3,
            10,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '6ea6b77c-abbe-4fd9-94bf-d049eca3b508' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'AttestationStatement')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '6ea6b77c-abbe-4fd9-94bf-d049eca3b508',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'AttestationStatement',
            'Attestation Statement',
            'Exact attestation statement presented to and signed by the contact.',
            'nvarchar',
            -1,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8b66407a-ac4c-4735-b570-074a5c9d0bd7' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'AttestedByUserID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8b66407a-ac4c-4735-b570-074a5c9d0bd7',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'AttestedByUserID',
            'Attested By User ID',
            'The contact user who recorded the attestation.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            'E1238F34-2837-EF11-86D4-6045BDEE16E6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '580eec7e-dd7d-4514-92ab-7c6a71bcb67f' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'AttestedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '580eec7e-dd7d-4514-92ab-7c6a71bcb67f',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'AttestedAt',
            'Attested At',
            'Timestamp when the attestation was recorded.',
            'datetimeoffset',
            10,
            34,
            7,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '3a8560e3-5fae-4c6b-ab54-928e1782c2ae' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'WithdrawnAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '3a8560e3-5fae-4c6b-ab54-928e1782c2ae',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'WithdrawnAt',
            'Withdrawn At',
            'Timestamp when the application was withdrawn.',
            'datetimeoffset',
            10,
            34,
            7,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '23516f1d-e1c2-4341-8572-795123c50638' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'WithdrawnByUserID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '23516f1d-e1c2-4341-8572-795123c50638',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'WithdrawnByUserID',
            'Withdrawn By User ID',
            'The user who withdrew the application.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            'E1238F34-2837-EF11-86D4-6045BDEE16E6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '9e24de0f-0b86-47af-b265-8c93059c8d62' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'WithdrawalReason')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '9e24de0f-0b86-47af-b265-8c93059c8d62',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'WithdrawalReason',
            'Withdrawal Reason',
            'Reason recorded when the application was withdrawn.',
            'nvarchar',
            -1,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c605addf-a576-4638-be8d-0eebef9459e4' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = '__mj_CreatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'c605addf-a576-4638-be8d-0eebef9459e4',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            '__mj_CreatedAt',
            'Created At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'af188bc4-26b5-4085-8886-9696438bf258' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = '__mj_UpdatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'af188bc4-26b5-4085-8886-9696438bf258',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            '__mj_UpdatedAt',
            'Updated At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '44000d76-99f0-422f-9726-68d83baedc5f' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = 'ID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '44000d76-99f0-422f-9726-68d83baedc5f',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            'ID',
            'ID',
            NULL,
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            'newsequentialid()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            1,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8611cf73-a424-4a28-913b-611861490b4f' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = 'StandardResponseID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8611cf73-a424-4a28-913b-611861490b4f',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            'StandardResponseID',
            'Standard Response ID',
            'The standard response supported by this citation.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5a28c050-523a-4b4b-a523-4eb5f8c6e468' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = 'SubjectID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '5a28c050-523a-4b4b-a523-4eb5f8c6e468',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            'SubjectID',
            'Subject ID',
            'The subject of the application, server-set.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '208290B3-A754-4C7A-94E7-E7279A8529F1',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'd65a1e0e-e134-4896-ae2b-2c35380d11dc' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = 'EvidenceDocumentID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'd65a1e0e-e134-4896-ae2b-2c35380d11dc',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            'EvidenceDocumentID',
            'Evidence Document ID',
            'The evidence document cited.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '90058929-3b86-4cf4-bd32-cc5fd9b313cc' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = 'ExtractionID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '90058929-3b86-4cf4-bd32-cc5fd9b313cc',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            'ExtractionID',
            'Extraction ID',
            'The extraction that supplied this citation, when created by document reading.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ab0c69f0-8601-43ac-a6e0-273eb3fc717d' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = 'SourceLabel')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'ab0c69f0-8601-43ac-a6e0-273eb3fc717d',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            'SourceLabel',
            'Source Label',
            'Display label of the cited source, such as the document file name.',
            'nvarchar',
            1000,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5776e5ff-a4df-4440-aaac-a5cab96968cb' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = 'PageReference')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '5776e5ff-a4df-4440-aaac-a5cab96968cb',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            'PageReference',
            'Page Reference',
            'Page number or label where the cited excerpt appears, when known.',
            'nvarchar',
            100,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'fa183174-ffa1-4397-b9b8-532f3438f8f9' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = 'Excerpt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'fa183174-ffa1-4397-b9b8-532f3438f8f9',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            'Excerpt',
            'Excerpt',
            'Verbatim excerpt cited from the document.',
            'nvarchar',
            -1,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c92a354b-cff4-4b88-8963-cad852b6b3f2' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = 'StartOffset')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'c92a354b-cff4-4b88-8963-cad852b6b3f2',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            'StartOffset',
            'Start Offset',
            'Zero-based character start offset of Excerpt within ExtractedText.',
            'int',
            4,
            10,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ced6b28d-c2f0-4eeb-b519-ce376818dfa1' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = 'EndOffset')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'ced6b28d-c2f0-4eeb-b519-ce376818dfa1',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            'EndOffset',
            'End Offset',
            'Exclusive character end offset of Excerpt within ExtractedText.',
            'int',
            4,
            10,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '80a9c214-60a6-4917-8e13-962bc405443d' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = '__mj_CreatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '80a9c214-60a6-4917-8e13-962bc405443d',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            '__mj_CreatedAt',
            'Created At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'bdc77bee-1df1-4f1c-b34d-0f2d044fa593' OR (EntityID = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND Name = '__mj_UpdatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'bdc77bee-1df1-4f1c-b34d-0f2d044fa593',
            '183E220D-35D0-48CF-98E6-A48A90C2D3C8', -- Entity: MJ_BizApps_Credentialing: Response Citations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8'),
            '__mj_UpdatedAt',
            'Updated At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '14926f0f-0dfc-4239-9126-b6574fb22190' OR (EntityID = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND Name = 'ID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '14926f0f-0dfc-4239-9126-b6574fb22190',
            'E3F6DEB2-D124-478D-A88C-AE856162B461', -- Entity: MJ_BizApps_Credentialing: Application Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461'),
            'ID',
            'ID',
            NULL,
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            'newsequentialid()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            1,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '756d4f33-7a22-41d4-a8c7-bd7df46aec2c' OR (EntityID = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND Name = 'ApplicationID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '756d4f33-7a22-41d4-a8c7-bd7df46aec2c',
            'E3F6DEB2-D124-478D-A88C-AE856162B461', -- Entity: MJ_BizApps_Credentialing: Application Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461'),
            'ApplicationID',
            'Application ID',
            'The submitted application this frozen document link belongs to.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '32C23034-191B-412A-98DA-837F13525AAA',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e0d54223-5796-444f-b3ac-744d102fec81' OR (EntityID = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND Name = 'SubjectID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'e0d54223-5796-444f-b3ac-744d102fec81',
            'E3F6DEB2-D124-478D-A88C-AE856162B461', -- Entity: MJ_BizApps_Credentialing: Application Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461'),
            'SubjectID',
            'Subject ID',
            'The subject of the application, server-set to match Application.SubjectID.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '208290B3-A754-4C7A-94E7-E7279A8529F1',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'abc126bc-9fb0-47c3-b022-04e954ec558b' OR (EntityID = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND Name = 'EvidenceDocumentID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'abc126bc-9fb0-47c3-b022-04e954ec558b',
            'E3F6DEB2-D124-478D-A88C-AE856162B461', -- Entity: MJ_BizApps_Credentialing: Application Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461'),
            'EvidenceDocumentID',
            'Evidence Document ID',
            'The evidence document frozen into the application, when this entry references a file.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'fe21ce7d-5a5e-4a83-90b1-070a929cfcb8' OR (EntityID = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND Name = 'DocumentAttestationID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'fe21ce7d-5a5e-4a83-90b1-070a929cfcb8',
            'E3F6DEB2-D124-478D-A88C-AE856162B461', -- Entity: MJ_BizApps_Credentialing: Application Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461'),
            'DocumentAttestationID',
            'Document Attestation ID',
            'The document attestation frozen into the application, when this entry references an attestation.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            '504B3D47-E3BD-417B-B67B-38A041DEB700',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '874ec9b8-82b6-4372-807e-c589ab6209ab' OR (EntityID = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND Name = 'FrozenAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '874ec9b8-82b6-4372-807e-c589ab6209ab',
            'E3F6DEB2-D124-478D-A88C-AE856162B461', -- Entity: MJ_BizApps_Credentialing: Application Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461'),
            'FrozenAt',
            'Frozen At',
            'Timestamp when this document link was frozen on submission.',
            'datetimeoffset',
            10,
            34,
            7,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '6abdf841-ddff-4332-8650-624c5ad2aafe' OR (EntityID = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND Name = '__mj_CreatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '6abdf841-ddff-4332-8650-624c5ad2aafe',
            'E3F6DEB2-D124-478D-A88C-AE856162B461', -- Entity: MJ_BizApps_Credentialing: Application Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461'),
            '__mj_CreatedAt',
            'Created At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ac6bb07b-e664-44b9-a531-8b15de726faa' OR (EntityID = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND Name = '__mj_UpdatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'ac6bb07b-e664-44b9-a531-8b15de726faa',
            'E3F6DEB2-D124-478D-A88C-AE856162B461', -- Entity: MJ_BizApps_Credentialing: Application Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461'),
            '__mj_UpdatedAt',
            'Updated At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '149b5243-bd5b-4875-81fc-d70118820fad' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = 'ID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '149b5243-bd5b-4875-81fc-d70118820fad',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            'ID',
            'ID',
            NULL,
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            'newsequentialid()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            1,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'b3848598-6b34-448f-a964-f61e72cb8624' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = 'AccreditingOrganizationID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'b3848598-6b34-448f-a964-f61e72cb8624',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            'AccreditingOrganizationID',
            'Accrediting Organization ID',
            'The accrediting organization that owns this subject record. Cannot be changed after creation.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '44B21AEE-60D7-4E12-B174-4D3D1B2102BE',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8a898bed-46b0-451c-ac9b-fb44e4194606' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = 'SubjectType')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8a898bed-46b0-451c-ac9b-fb44e4194606',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            'SubjectType',
            'Subject Type',
            'Whether this subject is a person or an organization.',
            'nvarchar',
            40,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '7d57982c-b340-499c-96be-1d42e9cf0a9a' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = 'DisplayName')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '7d57982c-b340-499c-96be-1d42e9cf0a9a',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            'DisplayName',
            'Display Name',
            'The subject''s name shown on applications and certificates, unique within its accrediting organization.',
            'nvarchar',
            510,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            1,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c6faa400-3b51-49d4-89e9-b5b94947f142' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = 'PrimaryEmail')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'c6faa400-3b51-49d4-89e9-b5b94947f142',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            'PrimaryEmail',
            'Primary Email',
            'The primary contact email address for this subject.',
            'nvarchar',
            510,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f2671c5a-e062-4f5c-9ebe-1692f44f1ab3' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = 'Status')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'f2671c5a-e062-4f5c-9ebe-1692f44f1ab3',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            'Status',
            'Status',
            'Whether this subject is active or inactive.',
            'nvarchar',
            40,
            0,
            0,
            0,
            'Active',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8d1a798c-9986-4ffe-b27c-18fbca427c4c' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = 'PartyEntityID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8d1a798c-9986-4ffe-b27c-18fbca427c4c',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            'PartyEntityID',
            'Party Entity ID',
            'The host system entity whose record represents this subject, when linked to a host record.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            'E0238F34-2837-EF11-86D4-6045BDEE16E6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '017bf4aa-05b2-4f39-8c6f-6ba784ec2afb' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = 'PartyRecordID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '017bf4aa-05b2-4f39-8c6f-6ba784ec2afb',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            'PartyRecordID',
            'Party Record ID',
            'The primary key value of the host system party record referenced by PartyEntityID.',
            'nvarchar',
            900,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '22ea3204-d30c-4537-8e27-f2d211efe630' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = '__mj_CreatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '22ea3204-d30c-4537-8e27-f2d211efe630',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            '__mj_CreatedAt',
            'Created At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0c97e00f-2dcc-47b7-b5f5-74c4c7692e23' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = '__mj_UpdatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '0c97e00f-2dcc-47b7-b5f5-74c4c7692e23',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            '__mj_UpdatedAt',
            'Updated At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '7ff29a67-03e6-4c30-86ba-247bec5c7a31' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'ID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '7ff29a67-03e6-4c30-86ba-247bec5c7a31',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'ID',
            'ID',
            NULL,
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            'newsequentialid()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            1,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '143884da-cc48-4104-9680-6ecb7adb784f' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'SubjectID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '143884da-cc48-4104-9680-6ecb7adb784f',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'SubjectID',
            'Subject ID',
            'The subject that owns this document. Cannot be changed after creation.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '208290B3-A754-4C7A-94E7-E7279A8529F1',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '76367a30-fd2a-44bb-9783-b2a73138de2a' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'DocumentRequirementID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '76367a30-fd2a-44bb-9783-b2a73138de2a',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'DocumentRequirementID',
            'Document Requirement ID',
            'The document requirement this upload fulfills, or NULL for a general upload.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e8c301e1-869b-40a0-9bb6-f5199564719b' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'FileID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'e8c301e1-869b-40a0-9bb6-f5199564719b',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'FileID',
            'File ID',
            'The underlying MemberJunction File record storing the uploaded bytes.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '29248F34-2837-EF11-86D4-6045BDEE16E6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0eddb361-2f40-4293-a592-b83bb568dfe7' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'FileName')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '0eddb361-2f40-4293-a592-b83bb568dfe7',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'FileName',
            'File Name',
            'Sanitized original file name as uploaded.',
            'nvarchar',
            510,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '6f25ba45-2592-4990-a4d8-9afdaccac175' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'ContentType')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '6f25ba45-2592-4990-a4d8-9afdaccac175',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'ContentType',
            'Content Type',
            'MIME content type of the uploaded file.',
            'nvarchar',
            300,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2c1923ce-f42c-4366-9caa-c1f39f5fbd86' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'SizeBytes')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '2c1923ce-f42c-4366-9caa-c1f39f5fbd86',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'SizeBytes',
            'Size Bytes',
            'Size of the uploaded file in bytes.',
            'bigint',
            8,
            19,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '3c5f1184-0703-44a8-8d6a-b0b3f4e313da' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'ContentHash')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '3c5f1184-0703-44a8-8d6a-b0b3f4e313da',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'ContentHash',
            'Content Hash',
            'Lowercase hex SHA-256 digest of the uploaded file bytes.',
            'char',
            64,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '429f1c51-1d03-4088-ac72-3a9f895e2e0d' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'ExtractedText')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '429f1c51-1d03-4088-ac72-3a9f895e2e0d',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'ExtractedText',
            'Extracted Text',
            'Plain text extracted or recognized from the file. Written once and never modified afterward.',
            'nvarchar',
            -1,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '747d07c5-8656-4de4-9acb-a199e5419135' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'TextStatus')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '747d07c5-8656-4de4-9acb-a199e5419135',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'TextStatus',
            'Text Status',
            'Outcome of text extraction or recognition for this document.',
            'nvarchar',
            60,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '141bcfff-9801-497d-846f-7a8d9e219e1e' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'TextNote')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '141bcfff-9801-497d-846f-7a8d9e219e1e',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'TextNote',
            'Text Note',
            'User-facing sentence explaining any text status other than Extracted.',
            'nvarchar',
            1000,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '451fc54f-572c-458a-b4c5-d79430000fb0' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'PageCount')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '451fc54f-572c-458a-b4c5-d79430000fb0',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'PageCount',
            'Page Count',
            'Page count of the document when known.',
            'int',
            4,
            10,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '592d79d2-0570-46ff-a511-466345e0f70c' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'ReadingStatus')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '592d79d2-0570-46ff-a511-466345e0f70c',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'ReadingStatus',
            'Reading Status',
            'Current state of background evidence reading for this document.',
            'nvarchar',
            60,
            0,
            0,
            0,
            'Pending',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'a8400ce5-a894-47d4-97b0-7777b4e707ed' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'ReadingNote')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'a8400ce5-a894-47d4-97b0-7777b4e707ed',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'ReadingNote',
            'Reading Note',
            'User-facing note describing the outcome or failure of evidence reading.',
            'nvarchar',
            1000,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1719033c-2537-4348-be00-b066c170122f' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'ReadingClaimID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '1719033c-2537-4348-be00-b066c170122f',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'ReadingClaimID',
            'Reading Claim ID',
            'Identifier of the background worker claim currently processing this document.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'a51259a6-5397-42d9-95b8-f0a9cd1a7545' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'ReadingClaimedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'a51259a6-5397-42d9-95b8-f0a9cd1a7545',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'ReadingClaimedAt',
            'Reading Claimed At',
            'Timestamp when the active reading claim was taken or last renewed.',
            'datetimeoffset',
            10,
            34,
            7,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '7f962e95-8664-4b33-b807-cef91d703419' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'ReadingAttempts')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '7f962e95-8664-4b33-b807-cef91d703419',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'ReadingAttempts',
            'Reading Attempts',
            'Number of failed or attempted reading runs. Failed reads retry up to 3 attempts.',
            'int',
            4,
            10,
            0,
            0,
            '(0)',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '82e5a841-7b2a-4e76-a703-09bd690d340c' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'Status')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '82e5a841-7b2a-4e76-a703-09bd690d340c',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'Status',
            'Status',
            'Currency status of this document in the subject''s library.',
            'nvarchar',
            40,
            0,
            0,
            0,
            'Current',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '182750aa-4393-4423-aa15-634ed08fdc5a' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'SupersedesDocumentID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '182750aa-4393-4423-aa15-634ed08fdc5a',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'SupersedesDocumentID',
            'Supersedes Document ID',
            'The prior document version that this upload replaced.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '4f647c7f-8bce-4646-9a98-399beaeb0957' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'ConfirmedCurrentAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '4f647c7f-8bce-4646-9a98-399beaeb0957',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'ConfirmedCurrentAt',
            'Confirmed Current At',
            'Timestamp when a contact most recently confirmed this document is still current.',
            'datetimeoffset',
            10,
            34,
            7,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'a17f7640-4aa2-415d-af31-21bc97e1fe52' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'UploadedByUserID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'a17f7640-4aa2-415d-af31-21bc97e1fe52',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'UploadedByUserID',
            'Uploaded By User ID',
            'The user who uploaded this document.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            'E1238F34-2837-EF11-86D4-6045BDEE16E6',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'd0bfdf40-efe7-4a0c-824a-635dcef94123' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'UploadedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'd0bfdf40-efe7-4a0c-824a-635dcef94123',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'UploadedAt',
            'Uploaded At',
            'Timestamp when this document was uploaded.',
            'datetimeoffset',
            10,
            34,
            7,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '566cfa36-fa47-471b-a11b-5ce5a8a70412' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = '__mj_CreatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '566cfa36-fa47-471b-a11b-5ce5a8a70412',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            '__mj_CreatedAt',
            'Created At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0199cb4a-c8bc-47e8-b695-e92feb39118c' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = '__mj_UpdatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '0199cb4a-c8bc-47e8-b695-e92feb39118c',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            '__mj_UpdatedAt',
            'Updated At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5c836c24-038c-4fb8-90bc-b2763dfdd9e5' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'ID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '5c836c24-038c-4fb8-90bc-b2763dfdd9e5',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'ID',
            'ID',
            NULL,
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            'newsequentialid()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            1,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ca679830-583a-42ce-9393-747aabfdfeec' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'EvidenceDocumentID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'ca679830-583a-42ce-9393-747aabfdfeec',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'EvidenceDocumentID',
            'Evidence Document ID',
            'The evidence document this extraction was read from.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1fff1e8b-b189-4e53-ab55-9047ab5c2240' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'StandardID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '1fff1e8b-b189-4e53-ab55-9047ab5c2240',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'StandardID',
            'Standard ID',
            'The standard this extraction addresses.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '82E1DFB0-3B46-4F20-A613-1CD624A71720',
            'ID',
            0,
            0,
            1,
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '9ad1ba95-7d3e-44da-b9d2-2c32e3d2dff1' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'SubjectID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '9ad1ba95-7d3e-44da-b9d2-2c32e3d2dff1',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'SubjectID',
            'Subject ID',
            'The subject of the evidence document, server-set.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '208290B3-A754-4C7A-94E7-E7279A8529F1',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0cf15618-a76a-4910-a48b-eaa5009c41f9' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'Value')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '0cf15618-a76a-4910-a48b-eaa5009c41f9',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'Value',
            'Value',
            'The drafted answer extracted for the standard.',
            'nvarchar',
            -1,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8878c174-8306-4a4e-a714-2b4739e157ca' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'Excerpt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8878c174-8306-4a4e-a714-2b4739e157ca',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'Excerpt',
            'Excerpt',
            'Verbatim quote from the document''s ExtractedText supporting this extraction.',
            'nvarchar',
            -1,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5fffad0d-b12d-4b4b-8c8f-bbc024ef6157' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'StartOffset')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '5fffad0d-b12d-4b4b-8c8f-bbc024ef6157',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'StartOffset',
            'Start Offset',
            'Zero-based character start offset of Excerpt within ExtractedText.',
            'int',
            4,
            10,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f6be713a-5960-45a0-8122-ff674d291b65' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'EndOffset')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'f6be713a-5960-45a0-8122-ff674d291b65',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'EndOffset',
            'End Offset',
            'Exclusive character end offset of Excerpt within ExtractedText.',
            'int',
            4,
            10,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2161dc5c-7f59-4b94-b42f-2b60b48f881b' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'PageReference')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '2161dc5c-7f59-4b94-b42f-2b60b48f881b',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'PageReference',
            'Page Reference',
            'Page number or label where the excerpt appears, when known.',
            'nvarchar',
            100,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '187f4791-4d91-45f2-909e-b73fb6705e1a' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'HeadingPath')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '187f4791-4d91-45f2-909e-b73fb6705e1a',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'HeadingPath',
            'Heading Path',
            'Section heading path enclosing the excerpt, when known.',
            'nvarchar',
            2000,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '3d6eb780-b556-4c2e-86ec-5c66bfaf546e' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'Confidence')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '3d6eb780-b556-4c2e-86ec-5c66bfaf546e',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'Confidence',
            'Confidence',
            'Reader confidence score between 0 and 1.',
            'decimal',
            5,
            5,
            4,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '45e35412-201e-4bad-be23-2a22fbfbb035' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'Reasoning')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '45e35412-201e-4bad-be23-2a22fbfbb035',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'Reasoning',
            'Reasoning',
            'Explanation of how the excerpt supports the extracted value.',
            'nvarchar',
            -1,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ab2bd4b6-0c9a-49fb-b0e2-577d693e6767' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'Status')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'ab2bd4b6-0c9a-49fb-b0e2-577d693e6767',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'Status',
            'Status',
            'Review state of this extraction.',
            'nvarchar',
            40,
            0,
            0,
            0,
            'Proposed',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '303e6d9b-53bf-4239-bd6c-75771bf4e24b' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'IsSuperseded')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '303e6d9b-53bf-4239-bd6c-75771bf4e24b',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'IsSuperseded',
            'Is Superseded',
            'Whether a newer reading superseded this extraction.',
            'bit',
            1,
            1,
            0,
            0,
            '(0)',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8969fbc3-ef00-4d68-aa84-a8aee42504c7' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'AIPromptRunID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8969fbc3-ef00-4d68-aa84-a8aee42504c7',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'AIPromptRunID',
            'AI Prompt Run ID',
            'The MemberJunction AI prompt run that produced this extraction, or NULL for test readers.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            '7C1C98D0-3978-4CE8-8E3F-C90301E59767',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5ed266e6-8d65-4d29-bc08-9dcc5e129c69' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = '__mj_CreatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '5ed266e6-8d65-4d29-bc08-9dcc5e129c69',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            '__mj_CreatedAt',
            'Created At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '9080eac9-e0c1-471e-9ca9-0d6a6d3431c4' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = '__mj_UpdatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '9080eac9-e0c1-471e-9ca9-0d6a6d3431c4',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            '__mj_UpdatedAt',
            'Updated At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'eda5fe30-2cc7-4d7c-838f-9e960be2a74d' OR (EntityID = '587E835C-609B-4F52-B062-FABA21BB962A' AND Name = 'ID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'eda5fe30-2cc7-4d7c-838f-9e960be2a74d',
            '587E835C-609B-4F52-B062-FABA21BB962A', -- Entity: MJ_BizApps_Credentialing: Response Sources
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '587E835C-609B-4F52-B062-FABA21BB962A'),
            'ID',
            'ID',
            NULL,
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            'newsequentialid()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            1,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'a0ce5059-5238-421f-a0ef-906fa7de737b' OR (EntityID = '587E835C-609B-4F52-B062-FABA21BB962A' AND Name = 'StandardID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'a0ce5059-5238-421f-a0ef-906fa7de737b',
            '587E835C-609B-4F52-B062-FABA21BB962A', -- Entity: MJ_BizApps_Credentialing: Response Sources
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '587E835C-609B-4F52-B062-FABA21BB962A'),
            'StandardID',
            'Standard ID',
            'The standard this response source serves.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '82E1DFB0-3B46-4F20-A613-1CD624A71720',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '34ede2a1-8616-48c3-8e0f-0cf59c4d533f' OR (EntityID = '587E835C-609B-4F52-B062-FABA21BB962A' AND Name = 'ProgramVersionID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '34ede2a1-8616-48c3-8e0f-0cf59c4d533f',
            '587E835C-609B-4F52-B062-FABA21BB962A', -- Entity: MJ_BizApps_Credentialing: Response Sources
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '587E835C-609B-4F52-B062-FABA21BB962A'),
            'ProgramVersionID',
            'Program Version ID',
            'The program version of the standard, server-set to match Standard.ProgramVersionID.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'b931250f-1483-4308-88db-185cbaa6e1a5' OR (EntityID = '587E835C-609B-4F52-B062-FABA21BB962A' AND Name = 'SourceType')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'b931250f-1483-4308-88db-185cbaa6e1a5',
            '587E835C-609B-4F52-B062-FABA21BB962A', -- Entity: MJ_BizApps_Credentialing: Response Sources
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '587E835C-609B-4F52-B062-FABA21BB962A'),
            'SourceType',
            'Source Type',
            'Kind of source used to prefill or verify the standard.',
            'nvarchar',
            60,
            0,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2ffc677e-6100-41e9-9f48-3a34253af3dd' OR (EntityID = '587E835C-609B-4F52-B062-FABA21BB962A' AND Name = 'DocumentRequirementID')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '2ffc677e-6100-41e9-9f48-3a34253af3dd',
            '587E835C-609B-4F52-B062-FABA21BB962A', -- Entity: MJ_BizApps_Credentialing: Response Sources
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '587E835C-609B-4F52-B062-FABA21BB962A'),
            'DocumentRequirementID',
            'Document Requirement ID',
            'The document requirement read when SourceType is Document Extraction. Must belong to the same version.',
            'uniqueidentifier',
            16,
            0,
            0,
            1,
            NULL,
            0,
            1,
            0,
            0,
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41',
            'ID',
            0,
            0,
            1,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'db98b64f-1685-4c54-8514-c4761a1a7c17' OR (EntityID = '587E835C-609B-4F52-B062-FABA21BB962A' AND Name = 'Mode')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'db98b64f-1685-4c54-8514-c4761a1a7c17',
            '587E835C-609B-4F52-B062-FABA21BB962A', -- Entity: MJ_BizApps_Credentialing: Response Sources
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '587E835C-609B-4F52-B062-FABA21BB962A'),
            'Mode',
            'Mode',
            'Whether this source is used for prefill, verification, or both.',
            'nvarchar',
            40,
            0,
            0,
            0,
            'Prefill Only',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '66906063-abc5-4e31-86fa-fc265ed10452' OR (EntityID = '587E835C-609B-4F52-B062-FABA21BB962A' AND Name = 'Rank')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '66906063-abc5-4e31-86fa-fc265ed10452',
            '587E835C-609B-4F52-B062-FABA21BB962A', -- Entity: MJ_BizApps_Credentialing: Response Sources
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '587E835C-609B-4F52-B062-FABA21BB962A'),
            'Rank',
            'Rank',
            'Priority rank of this source among sources for the same standard, starting at 1.',
            'int',
            4,
            10,
            0,
            0,
            NULL,
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '4abbdaba-5ed7-4070-86d9-901432587a5c' OR (EntityID = '587E835C-609B-4F52-B062-FABA21BB962A' AND Name = 'Sequence')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '4abbdaba-5ed7-4070-86d9-901432587a5c',
            '587E835C-609B-4F52-B062-FABA21BB962A', -- Entity: MJ_BizApps_Credentialing: Response Sources
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '587E835C-609B-4F52-B062-FABA21BB962A'),
            'Sequence',
            'Sequence',
            'Declaration order of this source, used as tie-break within the same rank.',
            'int',
            4,
            10,
            0,
            0,
            '(0)',
            0,
            1,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f0432d65-5091-467e-b7ac-f2e0c7fba2c7' OR (EntityID = '587E835C-609B-4F52-B062-FABA21BB962A' AND Name = '__mj_CreatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'f0432d65-5091-467e-b7ac-f2e0c7fba2c7',
            '587E835C-609B-4F52-B062-FABA21BB962A', -- Entity: MJ_BizApps_Credentialing: Response Sources
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '587E835C-609B-4F52-B062-FABA21BB962A'),
            '__mj_CreatedAt',
            'Created At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '9222938c-275f-4d8d-9934-48b41edf3ba7' OR (EntityID = '587E835C-609B-4F52-B062-FABA21BB962A' AND Name = '__mj_UpdatedAt')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '9222938c-275f-4d8d-9934-48b41edf3ba7',
            '587E835C-609B-4F52-B062-FABA21BB962A', -- Entity: MJ_BizApps_Credentialing: Response Sources
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '587E835C-609B-4F52-B062-FABA21BB962A'),
            '__mj_UpdatedAt',
            'Updated At',
            NULL,
            'datetimeoffset',
            10,
            34,
            7,
            0,
            'getutcdate()',
            0,
            0,
            0,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

/* SQL text to insert entity field value with ID 3460cdb6-3b5f-4689-95cb-f7d659d928ba */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('3460cdb6-3b5f-4689-95cb-f7d659d928ba', '7BA83F44-2B89-41A9-82EE-02725CC0CCBF', 1, 'Met', 'Met', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 5c01275a-6142-4884-8d16-99987c819ced */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('5c01275a-6142-4884-8d16-99987c819ced', '7BA83F44-2B89-41A9-82EE-02725CC0CCBF', 2, 'Not Met', 'Not Met', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 1f16e583-b796-41d2-a3a7-51958117ea3f */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('1f16e583-b796-41d2-a3a7-51958117ea3f', '7BA83F44-2B89-41A9-82EE-02725CC0CCBF', 3, 'Partially Met', 'Partially Met', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 7BA83F44-2B89-41A9-82EE-02725CC0CCBF */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='7BA83F44-2B89-41A9-82EE-02725CC0CCBF';

/* SQL text to insert entity field value with ID 6daad741-9012-4a3b-a318-b1e0450752c1 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('6daad741-9012-4a3b-a318-b1e0450752c1', '8F207E5F-E8FC-4BFA-81E8-BD0E466FCAB5', 1, 'Confirmed', 'Confirmed', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 736630cd-2851-4d6a-b4c4-ff0e89b61255 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('736630cd-2851-4d6a-b4c4-ff0e89b61255', '8F207E5F-E8FC-4BFA-81E8-BD0E466FCAB5', 2, 'Drafted', 'Drafted', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID b4a3ca33-06ba-4c51-b774-ff781f1c06fc */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('b4a3ca33-06ba-4c51-b774-ff781f1c06fc', '8F207E5F-E8FC-4BFA-81E8-BD0E466FCAB5', 3, 'Empty', 'Empty', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 04d4f167-6efa-40ae-8062-8dd7293f4a6e */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('04d4f167-6efa-40ae-8062-8dd7293f4a6e', '8F207E5F-E8FC-4BFA-81E8-BD0E466FCAB5', 4, 'Flagged', 'Flagged', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 64d0fa62-aac6-4157-b269-124c57291b8f */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('64d0fa62-aac6-4157-b269-124c57291b8f', '8F207E5F-E8FC-4BFA-81E8-BD0E466FCAB5', 5, 'Located', 'Located', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID e04f208d-cab5-4d69-884b-301c1bdc2fcb */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('e04f208d-cab5-4d69-884b-301c1bdc2fcb', '8F207E5F-E8FC-4BFA-81E8-BD0E466FCAB5', 6, 'Prefilled', 'Prefilled', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 8F207E5F-E8FC-4BFA-81E8-BD0E466FCAB5 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='8F207E5F-E8FC-4BFA-81E8-BD0E466FCAB5';

/* SQL text to insert entity field value with ID 05b88ae3-147d-4824-b457-88732d08c311 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('05b88ae3-147d-4824-b457-88732d08c311', 'DE27F7DB-E4EE-42E4-8323-32CC52B19DF1', 1, 'Agent', 'Agent', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID e602a0ac-64e2-44dc-8d55-31d848d17bf8 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('e602a0ac-64e2-44dc-8d55-31d848d17bf8', 'DE27F7DB-E4EE-42E4-8323-32CC52B19DF1', 2, 'Human', 'Human', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID DE27F7DB-E4EE-42E4-8323-32CC52B19DF1 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='DE27F7DB-E4EE-42E4-8323-32CC52B19DF1';

/* SQL text to insert entity field value with ID eec7ba2f-8f74-4a3a-8469-fc8e46eeb939 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('eec7ba2f-8f74-4a3a-8469-fc8e46eeb939', '8F5B37F6-1DFB-4C74-AE58-2265377C0B59', 1, 'Document Extraction', 'Document Extraction', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 8F5B37F6-1DFB-4C74-AE58-2265377C0B59 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='8F5B37F6-1DFB-4C74-AE58-2265377C0B59';

/* SQL text to insert entity field value with ID b2fe1a05-9a17-4621-9c96-4ab932982c29 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('b2fe1a05-9a17-4621-9c96-4ab932982c29', '639EC830-6932-43A6-BA94-556ECA741F8B', 1, 'Primary', 'Primary', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID f4101c3d-c0af-426b-bd4e-59baa960c781 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('f4101c3d-c0af-426b-bd4e-59baa960c781', '639EC830-6932-43A6-BA94-556ECA741F8B', 2, 'Staff', 'Staff', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 639EC830-6932-43A6-BA94-556ECA741F8B */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='639EC830-6932-43A6-BA94-556ECA741F8B';

/* SQL text to insert entity field value with ID c385daf6-5f77-48f4-9baf-aede896ef142 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('c385daf6-5f77-48f4-9baf-aede896ef142', '1F62A63D-B005-4ED3-AEF2-B2AD46385F97', 1, 'Closed', 'Closed', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 80b04259-a112-4161-8a4b-6b47d7d0d6a1 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('80b04259-a112-4161-8a4b-6b47d7d0d6a1', '1F62A63D-B005-4ED3-AEF2-B2AD46385F97', 2, 'Committee', 'Committee', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID d07ab00d-7ef9-4e13-8a98-ff5170fb8d78 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('d07ab00d-7ef9-4e13-8a98-ff5170fb8d78', '1F62A63D-B005-4ED3-AEF2-B2AD46385F97', 3, 'Decided', 'Decided', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID d1a34436-4c91-454c-aeec-176748fda5dc */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('d1a34436-4c91-454c-aeec-176748fda5dc', '1F62A63D-B005-4ED3-AEF2-B2AD46385F97', 4, 'Draft', 'Draft', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 0d22b75e-1c75-49a6-9426-6f444bbe68da */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('0d22b75e-1c75-49a6-9426-6f444bbe68da', '1F62A63D-B005-4ED3-AEF2-B2AD46385F97', 5, 'Executive Sign-Off', 'Executive Sign-Off', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID f3304aa0-8976-4f0d-92c1-c7ca9e447791 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('f3304aa0-8976-4f0d-92c1-c7ca9e447791', '1F62A63D-B005-4ED3-AEF2-B2AD46385F97', 6, 'In Review', 'In Review', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 877b57be-6246-4292-bc0a-b03adef61b1c */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('877b57be-6246-4292-bc0a-b03adef61b1c', '1F62A63D-B005-4ED3-AEF2-B2AD46385F97', 7, 'Info Requested', 'Info Requested', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 943c265b-5a8f-4c18-a36e-bbc922d30355 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('943c265b-5a8f-4c18-a36e-bbc922d30355', '1F62A63D-B005-4ED3-AEF2-B2AD46385F97', 8, 'Screening', 'Screening', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID ed6e5afd-b698-418e-8197-3789751b56bc */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('ed6e5afd-b698-418e-8197-3789751b56bc', '1F62A63D-B005-4ED3-AEF2-B2AD46385F97', 9, 'Submitted', 'Submitted', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID d7f606c9-d9db-4233-af50-1b9e86cbccd3 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('d7f606c9-d9db-4233-af50-1b9e86cbccd3', '1F62A63D-B005-4ED3-AEF2-B2AD46385F97', 10, 'Withdrawn', 'Withdrawn', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 1F62A63D-B005-4ED3-AEF2-B2AD46385F97 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='1F62A63D-B005-4ED3-AEF2-B2AD46385F97';

/* SQL text to insert entity field value with ID 505471a0-a7b0-4147-86cb-42131bb9e00a */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('505471a0-a7b0-4147-86cb-42131bb9e00a', '8A898BED-46B0-451C-AC9B-FB44E4194606', 1, 'Organization', 'Organization', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID d7ad3dc6-29b1-4208-9d2f-353e924f49b7 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('d7ad3dc6-29b1-4208-9d2f-353e924f49b7', '8A898BED-46B0-451C-AC9B-FB44E4194606', 2, 'Person', 'Person', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 8A898BED-46B0-451C-AC9B-FB44E4194606 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='8A898BED-46B0-451C-AC9B-FB44E4194606';

/* SQL text to insert entity field value with ID 1225c0a1-21c8-4b47-b013-0fd757e3a125 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('1225c0a1-21c8-4b47-b013-0fd757e3a125', 'F2671C5A-E062-4F5C-9EBE-1692F44F1AB3', 1, 'Active', 'Active', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 58ac1310-04b4-46b1-a553-473db667182e */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('58ac1310-04b4-46b1-a553-473db667182e', 'F2671C5A-E062-4F5C-9EBE-1692F44F1AB3', 2, 'Inactive', 'Inactive', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID F2671C5A-E062-4F5C-9EBE-1692F44F1AB3 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='F2671C5A-E062-4F5C-9EBE-1692F44F1AB3';

/* SQL text to insert entity field value with ID f9020904-6078-43d2-8586-0c39e18088bb */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('f9020904-6078-43d2-8586-0c39e18088bb', '747D07C5-8656-4DE4-9ACB-A199E5419135', 1, 'Awaiting Recognition', 'Awaiting Recognition', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 88650075-72cc-4722-9a22-c83408b4acd0 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('88650075-72cc-4722-9a22-c83408b4acd0', '747D07C5-8656-4DE4-9ACB-A199E5419135', 2, 'Could Not Read', 'Could Not Read', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID e4e6bb96-4422-4c89-a664-b6baab6083d0 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('e4e6bb96-4422-4c89-a664-b6baab6083d0', '747D07C5-8656-4DE4-9ACB-A199E5419135', 3, 'Extracted', 'Extracted', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID cbdb86ed-9403-4ea4-bbf9-f84b75bc0a36 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('cbdb86ed-9403-4ea4-bbf9-f84b75bc0a36', '747D07C5-8656-4DE4-9ACB-A199E5419135', 4, 'No Text Found', 'No Text Found', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID aace78bb-43e2-43f8-8c6c-b3a4058b69c8 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('aace78bb-43e2-43f8-8c6c-b3a4058b69c8', '747D07C5-8656-4DE4-9ACB-A199E5419135', 5, 'Recognized', 'Recognized', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 7b21d667-7e04-4e4c-9768-77b2d4e815ee */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('7b21d667-7e04-4e4c-9768-77b2d4e815ee', '747D07C5-8656-4DE4-9ACB-A199E5419135', 6, 'Truncated', 'Truncated', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 747D07C5-8656-4DE4-9ACB-A199E5419135 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='747D07C5-8656-4DE4-9ACB-A199E5419135';

/* SQL text to insert entity field value with ID 7bb55817-8357-4718-88eb-ec858629e937 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('7bb55817-8357-4718-88eb-ec858629e937', '592D79D2-0570-46FF-A511-466345E0F70C', 1, 'Complete', 'Complete', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 2c654098-9ae7-41f8-9543-71bf90fc5439 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('2c654098-9ae7-41f8-9543-71bf90fc5439', '592D79D2-0570-46FF-A511-466345E0F70C', 2, 'Could Not Run', 'Could Not Run', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 7cbcaf85-7214-4c7e-b5d4-d02ffb5a5750 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('7cbcaf85-7214-4c7e-b5d4-d02ffb5a5750', '592D79D2-0570-46FF-A511-466345E0F70C', 3, 'Failed', 'Failed', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 25d0fa5e-b28d-4ee6-b15a-7c9c15213e36 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('25d0fa5e-b28d-4ee6-b15a-7c9c15213e36', '592D79D2-0570-46FF-A511-466345E0F70C', 4, 'Not Applicable', 'Not Applicable', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID e5df30b9-e1d0-4927-9f9b-64d944a605b2 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('e5df30b9-e1d0-4927-9f9b-64d944a605b2', '592D79D2-0570-46FF-A511-466345E0F70C', 5, 'Pending', 'Pending', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 78c487e1-1f3d-4068-8021-408ecbb99dda */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('78c487e1-1f3d-4068-8021-408ecbb99dda', '592D79D2-0570-46FF-A511-466345E0F70C', 6, 'Running', 'Running', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 592D79D2-0570-46FF-A511-466345E0F70C */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='592D79D2-0570-46FF-A511-466345E0F70C';

/* SQL text to insert entity field value with ID 3c47299d-8b67-43ad-ae52-cb4b966f812f */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('3c47299d-8b67-43ad-ae52-cb4b966f812f', '82E5A841-7B2A-4E76-A703-09BD690D340C', 1, 'Confirm Current', 'Confirm Current', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID a0d8c0cb-6e33-4a9d-b48e-b8dabb9c72b2 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('a0d8c0cb-6e33-4a9d-b48e-b8dabb9c72b2', '82E5A841-7B2A-4E76-A703-09BD690D340C', 2, 'Current', 'Current', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 113dc724-a7ad-48ba-8f27-8d0881f36007 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('113dc724-a7ad-48ba-8f27-8d0881f36007', '82E5A841-7B2A-4E76-A703-09BD690D340C', 3, 'Superseded', 'Superseded', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 82E5A841-7B2A-4E76-A703-09BD690D340C */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='82E5A841-7B2A-4E76-A703-09BD690D340C';

/* SQL text to insert entity field value with ID f86cedaa-e286-4bb7-b4e6-a3dcc49c37c5 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('f86cedaa-e286-4bb7-b4e6-a3dcc49c37c5', 'AB2BD4B6-0C9A-49FB-B0E2-577D693E6767', 1, 'Accepted', 'Accepted', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID aa7369c3-8ed6-4169-a74d-ee5fe817fdc6 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('aa7369c3-8ed6-4169-a74d-ee5fe817fdc6', 'AB2BD4B6-0C9A-49FB-B0E2-577D693E6767', 2, 'Proposed', 'Proposed', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID bd0d63b8-d30d-42db-bf57-1b31c954a8ac */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('bd0d63b8-d30d-42db-bf57-1b31c954a8ac', 'AB2BD4B6-0C9A-49FB-B0E2-577D693E6767', 3, 'Rejected', 'Rejected', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID AB2BD4B6-0C9A-49FB-B0E2-577D693E6767 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='AB2BD4B6-0C9A-49FB-B0E2-577D693E6767';

/* SQL text to insert entity field value with ID d8608ec9-f7da-443d-ba16-2197ff667349 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('d8608ec9-f7da-443d-ba16-2197ff667349', 'B931250F-1483-4308-88DB-185CBAA6E1A5', 1, 'Document Extraction', 'Document Extraction', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID B931250F-1483-4308-88DB-185CBAA6E1A5 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='B931250F-1483-4308-88DB-185CBAA6E1A5';

/* SQL text to insert entity field value with ID 2d36567d-c005-43a4-86ac-984ff4c32643 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('2d36567d-c005-43a4-86ac-984ff4c32643', 'DB98B64F-1685-4C54-8514-C4761A1A7C17', 1, 'Both', 'Both', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 15b660ad-5de8-4d79-b44d-3cfa9b8edf66 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('15b660ad-5de8-4d79-b44d-3cfa9b8edf66', 'DB98B64F-1685-4C54-8514-C4761A1A7C17', 2, 'Prefill Only', 'Prefill Only', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID ee1f5992-b847-4d8c-af7d-8bd9008df762 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('ee1f5992-b847-4d8c-af7d-8bd9008df762', 'DB98B64F-1685-4C54-8514-C4761A1A7C17', 3, 'Verify Only', 'Verify Only', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID DB98B64F-1685-4C54-8514-C4761A1A7C17 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='DB98B64F-1685-4C54-8514-C4761A1A7C17';

/* Deterministic search-flag hygiene — seed name fields */

         UPDATE [${mjSchema}].[EntityField]
         SET [IncludeInUserSearchAPI] = 1,
             [UserSearchPredicateAPI] = 'BeginsWith'
         WHERE [ID] IN (
            SELECT ranked.[ID] FROM (
               SELECT f.[ID],
                      ROW_NUMBER() OVER (
                         PARTITION BY f.[EntityID]
                         ORDER BY f.[Sequence], f.[Name]
                      ) AS rn
               FROM [${mjSchema}].[EntityField] f
               INNER JOIN [${mjSchema}].[Entity] e ON e.[ID] = f.[EntityID]
               WHERE LOWER(f.[Name]) IN ('name','title','firstname','lastname','middlename','displayname','fullname','label')
                 AND f.[AutoUpdateIncludeInUserSearchAPI] = 1
                 AND f.[IncludeInUserSearchAPI] = 0
                 AND ISNULL(f.[IsPrimaryKey], 0) = 0
                 AND ISNULL(f.[IsVirtual], 0) = 0
                 AND LOWER(f.[Type]) IN ('nvarchar','varchar','char','nchar')
                 AND ISNULL(f.[Length], 0) <> -1
                 AND e.[VirtualEntity] = 0
                 AND e.[AllowUserSearchAPI] = 1
                 AND ISNULL(e.[FullTextSearchEnabled], 0) = 0
                 AND NOT ((e.[Name] = 'Logs' OR e.[Name] LIKE '% Logs') OR (e.[Name] = 'Log' OR e.[Name] LIKE '% Log') OR (e.[Name] = 'Runs' OR e.[Name] LIKE '% Runs') OR (e.[Name] = 'Run' OR e.[Name] LIKE '% Run') OR (e.[Name] = 'Run History' OR e.[Name] LIKE '% Run History') OR (e.[Name] = 'Run Steps' OR e.[Name] LIKE '% Run Steps') OR (e.[Name] = 'Run Messages' OR e.[Name] LIKE '% Run Messages') OR (e.[Name] = 'Execution Logs' OR e.[Name] LIKE '% Execution Logs') OR (e.[Name] = 'Details' OR e.[Name] LIKE '% Details') OR (e.[Name] = 'Detail' OR e.[Name] LIKE '% Detail') OR (e.[Name] = 'Lines' OR e.[Name] LIKE '% Lines') OR (e.[Name] = 'Line' OR e.[Name] LIKE '% Line') OR (e.[Name] = 'Items' OR e.[Name] LIKE '% Items') OR (e.[Name] = 'Item' OR e.[Name] LIKE '% Item') OR (e.[Name] = 'Steps' OR e.[Name] LIKE '% Steps') OR (e.[Name] = 'Step' OR e.[Name] LIKE '% Step') OR (e.[Name] = 'Params' OR e.[Name] LIKE '% Params') OR (e.[Name] = 'Param' OR e.[Name] LIKE '% Param') OR (e.[Name] = 'Mappings' OR e.[Name] LIKE '% Mappings') OR (e.[Name] = 'Mapping' OR e.[Name] LIKE '% Mapping') OR (e.[Name] = 'Audit' OR e.[Name] LIKE 'Audit %' OR e.[Name] LIKE '% Audit' OR e.[Name] LIKE '% Audit %') OR (e.[Name] = 'Record Change' OR e.[Name] LIKE 'Record Change %' OR e.[Name] LIKE '% Record Change' OR e.[Name] LIKE '% Record Change %'))
                 AND e.[SchemaName] NOT IN ('sys','staging','dbo','${mjSchema}','__mj_BizAppsCommon','__mj_BizAppsTasks','__mj_BizAppsCommittees')
                 AND NOT EXISTS (
               SELECT 1 FROM [${mjSchema}].[EntityField] f2
               WHERE f2.[EntityID] = e.[ID]
                 AND f2.[IncludeInUserSearchAPI] = 1
            )
            ) ranked
            WHERE ranked.rn <= 3
         );

/* Deterministic search-flag hygiene — clear AllowUserSearchAPI */

         UPDATE [${mjSchema}].[Entity]
         SET [AllowUserSearchAPI] = 0
         WHERE [ID] IN (
            SELECT e.[ID]
            FROM [${mjSchema}].[Entity] e
            WHERE e.[AllowUserSearchAPI] = 1
              AND e.[AutoUpdateAllowUserSearchAPI] = 1
              AND e.[VirtualEntity] = 0
              AND ISNULL(e.[FullTextSearchEnabled], 0) = 0
              AND e.[SchemaName] NOT IN ('sys','staging','dbo','${mjSchema}','__mj_BizAppsCommon','__mj_BizAppsTasks','__mj_BizAppsCommittees')
              AND NOT EXISTS (
               SELECT 1 FROM [${mjSchema}].[EntityField] f2
               WHERE f2.[EntityID] = e.[ID]
                 AND f2.[IncludeInUserSearchAPI] = 1
            )
         );


/* Create Entity Relationship: MJ_BizApps_Credentialing: Standards -> MJ_BizApps_Credentialing: Standard Responses (One To Many via StandardID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'ad642a8f-95ec-482a-97d3-286553067601' OR ([EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND [RelatedEntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND [RelatedEntityJoinField] = 'StandardID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('ad642a8f-95ec-482a-97d3-286553067601', '82E1DFB0-3B46-4F20-A613-1CD624A71720', 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', 'StandardID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Standards -> MJ_BizApps_Credentialing: Extractions (One To Many via StandardID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '2140d97b-eb45-4114-be85-0f419b423021' OR ([EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND [RelatedEntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND [RelatedEntityJoinField] = 'StandardID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('2140d97b-eb45-4114-be85-0f419b423021', '82E1DFB0-3B46-4F20-A613-1CD624A71720', '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', 'StandardID', 'One To Many', 1, 1, 2, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Standards -> MJ_BizApps_Credentialing: Response Sources (One To Many via StandardID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'd8f355e1-022b-457b-8d4d-958fba99c036' OR ([EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND [RelatedEntityID] = '587E835C-609B-4F52-B062-FABA21BB962A' AND [RelatedEntityJoinField] = 'StandardID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('d8f355e1-022b-457b-8d4d-958fba99c036', '82E1DFB0-3B46-4F20-A613-1CD624A71720', '587E835C-609B-4F52-B062-FABA21BB962A', 'StandardID', 'One To Many', 1, 1, 3, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Document Attestations -> MJ_BizApps_Credentialing: Application Documents (One To Many via DocumentAttestationID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '4e4bf12f-fbe7-41df-8066-cf0eb91bcd68' OR ([EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND [RelatedEntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND [RelatedEntityJoinField] = 'DocumentAttestationID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('4e4bf12f-fbe7-41df-8066-cf0eb91bcd68', '504B3D47-E3BD-417B-B67B-38A041DEB700', 'E3F6DEB2-D124-478D-A88C-AE856162B461', 'DocumentAttestationID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ_BizApps_Credentialing: Standard Responses -> MJ_BizApps_Credentialing: Response Citations (One To Many via StandardResponseID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '5f78226c-bd6f-46ae-ae3c-d974622d3c27' OR ([EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND [RelatedEntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND [RelatedEntityJoinField] = 'StandardResponseID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('5f78226c-bd6f-46ae-ae3c-d974622d3c27', 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', '183E220D-35D0-48CF-98E6-A48A90C2D3C8', 'StandardResponseID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Accrediting Organizations -> MJ_BizApps_Credentialing: Subjects (One To Many via AccreditingOrganizationID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '9438aeaa-3315-4e63-9145-187bc1086886' OR ([EntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND [RelatedEntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND [RelatedEntityJoinField] = 'AccreditingOrganizationID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('9438aeaa-3315-4e63-9145-187bc1086886', '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', '208290B3-A754-4C7A-94E7-E7279A8529F1', 'AccreditingOrganizationID', 'One To Many', 1, 1, 3, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ: Entities -> MJ_BizApps_Credentialing: Subjects (One To Many via PartyEntityID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '11868370-5cda-4339-8ec4-214d24454dfb' OR ([EntityID] = 'E0238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND [RelatedEntityJoinField] = 'PartyEntityID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('11868370-5cda-4339-8ec4-214d24454dfb', 'E0238F34-2837-EF11-86D4-6045BDEE16E6', '208290B3-A754-4C7A-94E7-E7279A8529F1', 'PartyEntityID', 'One To Many', 1, 1, 99, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Users -> MJ_BizApps_Credentialing: Document Attestations (One To Many via AttestedByUserID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '0d7c6b44-af78-4d4c-902c-8a781a08a23e' OR ([EntityID] = 'E1238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND [RelatedEntityJoinField] = 'AttestedByUserID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('0d7c6b44-af78-4d4c-902c-8a781a08a23e', 'E1238F34-2837-EF11-86D4-6045BDEE16E6', '504B3D47-E3BD-417B-B67B-38A041DEB700', 'AttestedByUserID', 'One To Many', 1, 1, 137, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Users -> MJ_BizApps_Credentialing: Standard Responses (One To Many via LastEditedByUserID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'dc8a74fd-f0ad-4ef1-9acf-6aedde03b3e7' OR ([EntityID] = 'E1238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND [RelatedEntityJoinField] = 'LastEditedByUserID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('dc8a74fd-f0ad-4ef1-9acf-6aedde03b3e7', 'E1238F34-2837-EF11-86D4-6045BDEE16E6', 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', 'LastEditedByUserID', 'One To Many', 1, 1, 138, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Users -> MJ_BizApps_Credentialing: Standard Responses (One To Many via ConfirmedByUserID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '8ee46cba-cbe6-4d46-ba57-803f0b5cad59' OR ([EntityID] = 'E1238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND [RelatedEntityJoinField] = 'ConfirmedByUserID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('8ee46cba-cbe6-4d46-ba57-803f0b5cad59', 'E1238F34-2837-EF11-86D4-6045BDEE16E6', 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', 'ConfirmedByUserID', 'One To Many', 1, 1, 139, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Users -> MJ_BizApps_Credentialing: Subject Contacts (One To Many via UserID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '4457553a-8b56-4e90-996e-f72f6718ffef' OR ([EntityID] = 'E1238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = '52713E19-8B12-4595-86A6-497B68738CB1' AND [RelatedEntityJoinField] = 'UserID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('4457553a-8b56-4e90-996e-f72f6718ffef', 'E1238F34-2837-EF11-86D4-6045BDEE16E6', '52713E19-8B12-4595-86A6-497B68738CB1', 'UserID', 'One To Many', 1, 1, 140, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Users -> MJ_BizApps_Credentialing: Subject Contacts (One To Many via InvitedByUserID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '5d0857f0-aba7-4bf2-997e-d4e17b683d92' OR ([EntityID] = 'E1238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = '52713E19-8B12-4595-86A6-497B68738CB1' AND [RelatedEntityJoinField] = 'InvitedByUserID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('5d0857f0-aba7-4bf2-997e-d4e17b683d92', 'E1238F34-2837-EF11-86D4-6045BDEE16E6', '52713E19-8B12-4595-86A6-497B68738CB1', 'InvitedByUserID', 'One To Many', 1, 1, 141, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ: Users -> MJ_BizApps_Credentialing: Applications (One To Many via SubmittedByUserID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '628cb61e-3d5d-4e04-b881-3757b92e183e' OR ([EntityID] = 'E1238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = '32C23034-191B-412A-98DA-837F13525AAA' AND [RelatedEntityJoinField] = 'SubmittedByUserID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('628cb61e-3d5d-4e04-b881-3757b92e183e', 'E1238F34-2837-EF11-86D4-6045BDEE16E6', '32C23034-191B-412A-98DA-837F13525AAA', 'SubmittedByUserID', 'One To Many', 1, 1, 142, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Users -> MJ_BizApps_Credentialing: Applications (One To Many via AttestedByUserID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '2cc0212c-38f1-4fa7-83aa-3d83fbcb4145' OR ([EntityID] = 'E1238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = '32C23034-191B-412A-98DA-837F13525AAA' AND [RelatedEntityJoinField] = 'AttestedByUserID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('2cc0212c-38f1-4fa7-83aa-3d83fbcb4145', 'E1238F34-2837-EF11-86D4-6045BDEE16E6', '32C23034-191B-412A-98DA-837F13525AAA', 'AttestedByUserID', 'One To Many', 1, 1, 143, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Users -> MJ_BizApps_Credentialing: Applications (One To Many via WithdrawnByUserID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '6f934bef-318f-47ab-ae90-52fc9894194c' OR ([EntityID] = 'E1238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = '32C23034-191B-412A-98DA-837F13525AAA' AND [RelatedEntityJoinField] = 'WithdrawnByUserID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('6f934bef-318f-47ab-ae90-52fc9894194c', 'E1238F34-2837-EF11-86D4-6045BDEE16E6', '32C23034-191B-412A-98DA-837F13525AAA', 'WithdrawnByUserID', 'One To Many', 1, 1, 144, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Users -> MJ_BizApps_Credentialing: Evidence Documents (One To Many via UploadedByUserID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '46de224f-0cbf-44b3-97f0-f82cc418be6d' OR ([EntityID] = 'E1238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND [RelatedEntityJoinField] = 'UploadedByUserID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('46de224f-0cbf-44b3-97f0-f82cc418be6d', 'E1238F34-2837-EF11-86D4-6045BDEE16E6', '852E8212-4C5B-4A90-B446-E89EECD3DB8D', 'UploadedByUserID', 'One To Many', 1, 1, 145, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Files -> MJ_BizApps_Credentialing: Evidence Documents (One To Many via FileID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'a09173aa-ab8e-40d5-8120-841d3e32c269' OR ([EntityID] = '29248F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND [RelatedEntityJoinField] = 'FileID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('a09173aa-ab8e-40d5-8120-841d3e32c269', '29248F34-2837-EF11-86D4-6045BDEE16E6', '852E8212-4C5B-4A90-B446-E89EECD3DB8D', 'FileID', 'One To Many', 1, 1, 13, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Document Requirements -> MJ_BizApps_Credentialing: Document Attestations (One To Many via DocumentRequirementID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'bf734a4d-2a21-4b4b-ad52-29ea95ea2bc9' OR ([EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND [RelatedEntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND [RelatedEntityJoinField] = 'DocumentRequirementID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('bf734a4d-2a21-4b4b-ad52-29ea95ea2bc9', 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', '504B3D47-E3BD-417B-B67B-38A041DEB700', 'DocumentRequirementID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ_BizApps_Credentialing: Document Requirements -> MJ_BizApps_Credentialing: Evidence Documents (One To Many via DocumentRequirementID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '86a4846a-7c1f-452d-9ac2-1daf5b0bf1d3' OR ([EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND [RelatedEntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND [RelatedEntityJoinField] = 'DocumentRequirementID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('86a4846a-7c1f-452d-9ac2-1daf5b0bf1d3', 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', '852E8212-4C5B-4A90-B446-E89EECD3DB8D', 'DocumentRequirementID', 'One To Many', 1, 1, 2, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Document Requirements -> MJ_BizApps_Credentialing: Response Sources (One To Many via DocumentRequirementID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'd26d0232-dbce-42e8-bb3e-66451dae6d7c' OR ([EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND [RelatedEntityID] = '587E835C-609B-4F52-B062-FABA21BB962A' AND [RelatedEntityJoinField] = 'DocumentRequirementID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('d26d0232-dbce-42e8-bb3e-66451dae6d7c', 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', '587E835C-609B-4F52-B062-FABA21BB962A', 'DocumentRequirementID', 'One To Many', 1, 1, 3, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Applications -> MJ_BizApps_Credentialing: Standard Responses (One To Many via ApplicationID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '6495506a-d4c0-41c4-b140-06ce02ce8a6b' OR ([EntityID] = '32C23034-191B-412A-98DA-837F13525AAA' AND [RelatedEntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND [RelatedEntityJoinField] = 'ApplicationID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('6495506a-d4c0-41c4-b140-06ce02ce8a6b', '32C23034-191B-412A-98DA-837F13525AAA', 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', 'ApplicationID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Applications -> MJ_BizApps_Credentialing: Application Documents (One To Many via ApplicationID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '33bb555c-22d7-4b10-9edc-2808d31f370e' OR ([EntityID] = '32C23034-191B-412A-98DA-837F13525AAA' AND [RelatedEntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND [RelatedEntityJoinField] = 'ApplicationID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('33bb555c-22d7-4b10-9edc-2808d31f370e', '32C23034-191B-412A-98DA-837F13525AAA', 'E3F6DEB2-D124-478D-A88C-AE856162B461', 'ApplicationID', 'One To Many', 1, 1, 2, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ_BizApps_Credentialing: Program Versions -> MJ_BizApps_Credentialing: Applications (One To Many via ProgramVersionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'ec0fa53b-68ae-4bcb-b64c-70d8b343eb3f' OR ([EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND [RelatedEntityID] = '32C23034-191B-412A-98DA-837F13525AAA' AND [RelatedEntityJoinField] = 'ProgramVersionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('ec0fa53b-68ae-4bcb-b64c-70d8b343eb3f', '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', '32C23034-191B-412A-98DA-837F13525AAA', 'ProgramVersionID', 'One To Many', 1, 1, 5, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ_BizApps_Credentialing: Program Versions -> MJ_BizApps_Credentialing: Response Sources (One To Many via ProgramVersionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'e17d44af-b972-4272-af48-0646b74c0333' OR ([EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND [RelatedEntityID] = '587E835C-609B-4F52-B062-FABA21BB962A' AND [RelatedEntityJoinField] = 'ProgramVersionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('e17d44af-b972-4272-af48-0646b74c0333', '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', '587E835C-609B-4F52-B062-FABA21BB962A', 'ProgramVersionID', 'One To Many', 1, 1, 6, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: AI Prompt Runs -> MJ_BizApps_Credentialing: Extractions (One To Many via AIPromptRunID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'fb293965-002b-44a3-ac9f-7737e5813fcf' OR ([EntityID] = '7C1C98D0-3978-4CE8-8E3F-C90301E59767' AND [RelatedEntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND [RelatedEntityJoinField] = 'AIPromptRunID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('fb293965-002b-44a3-ac9f-7737e5813fcf', '7C1C98D0-3978-4CE8-8E3F-C90301E59767', '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', 'AIPromptRunID', 'One To Many', 1, 1, 11, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Subjects -> MJ_BizApps_Credentialing: Document Attestations (One To Many via SubjectID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '81dca512-4d3d-4b6f-b032-6a39f119a7ec' OR ([EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND [RelatedEntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND [RelatedEntityJoinField] = 'SubjectID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('81dca512-4d3d-4b6f-b032-6a39f119a7ec', '208290B3-A754-4C7A-94E7-E7279A8529F1', '504B3D47-E3BD-417B-B67B-38A041DEB700', 'SubjectID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Subjects -> MJ_BizApps_Credentialing: Standard Responses (One To Many via SubjectID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '426ce42a-77e7-4bed-9e24-2d903e0ded1d' OR ([EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND [RelatedEntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND [RelatedEntityJoinField] = 'SubjectID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('426ce42a-77e7-4bed-9e24-2d903e0ded1d', '208290B3-A754-4C7A-94E7-E7279A8529F1', 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', 'SubjectID', 'One To Many', 1, 1, 2, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ_BizApps_Credentialing: Subjects -> MJ_BizApps_Credentialing: Subject Contacts (One To Many via SubjectID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '59cb501d-df85-4dc8-8826-1f7c4917ed84' OR ([EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND [RelatedEntityID] = '52713E19-8B12-4595-86A6-497B68738CB1' AND [RelatedEntityJoinField] = 'SubjectID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('59cb501d-df85-4dc8-8826-1f7c4917ed84', '208290B3-A754-4C7A-94E7-E7279A8529F1', '52713E19-8B12-4595-86A6-497B68738CB1', 'SubjectID', 'One To Many', 1, 1, 3, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Subjects -> MJ_BizApps_Credentialing: Applications (One To Many via SubjectID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '2e8b4d7d-0082-4fd4-99ff-06927a26d7d1' OR ([EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND [RelatedEntityID] = '32C23034-191B-412A-98DA-837F13525AAA' AND [RelatedEntityJoinField] = 'SubjectID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('2e8b4d7d-0082-4fd4-99ff-06927a26d7d1', '208290B3-A754-4C7A-94E7-E7279A8529F1', '32C23034-191B-412A-98DA-837F13525AAA', 'SubjectID', 'One To Many', 1, 1, 4, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Subjects -> MJ_BizApps_Credentialing: Response Citations (One To Many via SubjectID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'befab9dd-2fd4-4d96-9c1d-8c67df953df9' OR ([EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND [RelatedEntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND [RelatedEntityJoinField] = 'SubjectID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('befab9dd-2fd4-4d96-9c1d-8c67df953df9', '208290B3-A754-4C7A-94E7-E7279A8529F1', '183E220D-35D0-48CF-98E6-A48A90C2D3C8', 'SubjectID', 'One To Many', 1, 1, 5, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Subjects -> MJ_BizApps_Credentialing: Application Documents (One To Many via SubjectID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '6c84f606-8486-4e64-85cf-48b99f4c1c3b' OR ([EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND [RelatedEntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND [RelatedEntityJoinField] = 'SubjectID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('6c84f606-8486-4e64-85cf-48b99f4c1c3b', '208290B3-A754-4C7A-94E7-E7279A8529F1', 'E3F6DEB2-D124-478D-A88C-AE856162B461', 'SubjectID', 'One To Many', 1, 1, 6, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Subjects -> MJ_BizApps_Credentialing: Evidence Documents (One To Many via SubjectID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'f0a3ea15-3bfe-43db-80d7-b51cb659c9c5' OR ([EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND [RelatedEntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND [RelatedEntityJoinField] = 'SubjectID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('f0a3ea15-3bfe-43db-80d7-b51cb659c9c5', '208290B3-A754-4C7A-94E7-E7279A8529F1', '852E8212-4C5B-4A90-B446-E89EECD3DB8D', 'SubjectID', 'One To Many', 1, 1, 7, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ_BizApps_Credentialing: Subjects -> MJ_BizApps_Credentialing: Extractions (One To Many via SubjectID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'a7ab07a5-05aa-4362-b26e-d86f8ddd48ee' OR ([EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND [RelatedEntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND [RelatedEntityJoinField] = 'SubjectID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('a7ab07a5-05aa-4362-b26e-d86f8ddd48ee', '208290B3-A754-4C7A-94E7-E7279A8529F1', '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', 'SubjectID', 'One To Many', 1, 1, 8, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Evidence Documents -> MJ_BizApps_Credentialing: Response Citations (One To Many via EvidenceDocumentID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '4794a098-d0d2-450a-aa8b-7612e37eb2cd' OR ([EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND [RelatedEntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND [RelatedEntityJoinField] = 'EvidenceDocumentID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('4794a098-d0d2-450a-aa8b-7612e37eb2cd', '852E8212-4C5B-4A90-B446-E89EECD3DB8D', '183E220D-35D0-48CF-98E6-A48A90C2D3C8', 'EvidenceDocumentID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Evidence Documents -> MJ_BizApps_Credentialing: Application Documents (One To Many via EvidenceDocumentID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '2c2fa7b1-36ab-44ce-a3af-8b8384c25405' OR ([EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND [RelatedEntityID] = 'E3F6DEB2-D124-478D-A88C-AE856162B461' AND [RelatedEntityJoinField] = 'EvidenceDocumentID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('2c2fa7b1-36ab-44ce-a3af-8b8384c25405', '852E8212-4C5B-4A90-B446-E89EECD3DB8D', 'E3F6DEB2-D124-478D-A88C-AE856162B461', 'EvidenceDocumentID', 'One To Many', 1, 1, 2, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Evidence Documents -> MJ_BizApps_Credentialing: Evidence Documents (One To Many via SupersedesDocumentID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '4069dfd4-23b3-4697-8108-e8f9628fbee1' OR ([EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND [RelatedEntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND [RelatedEntityJoinField] = 'SupersedesDocumentID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('4069dfd4-23b3-4697-8108-e8f9628fbee1', '852E8212-4C5B-4A90-B446-E89EECD3DB8D', '852E8212-4C5B-4A90-B446-E89EECD3DB8D', 'SupersedesDocumentID', 'One To Many', 1, 1, 3, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Evidence Documents -> MJ_BizApps_Credentialing: Extractions (One To Many via EvidenceDocumentID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '743e5e40-a37b-4dc2-bdf4-55f541fe2d63' OR ([EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND [RelatedEntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND [RelatedEntityJoinField] = 'EvidenceDocumentID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('743e5e40-a37b-4dc2-bdf4-55f541fe2d63', '852E8212-4C5B-4A90-B446-E89EECD3DB8D', '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', 'EvidenceDocumentID', 'One To Many', 1, 1, 4, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ_BizApps_Credentialing: Extractions -> MJ_BizApps_Credentialing: Response Citations (One To Many via ExtractionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '70b6feb2-7baa-4417-a9bc-b9f6fddb7387' OR ([EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND [RelatedEntityID] = '183E220D-35D0-48CF-98E6-A48A90C2D3C8' AND [RelatedEntityJoinField] = 'ExtractionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('70b6feb2-7baa-4417-a9bc-b9f6fddb7387', '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', '183E220D-35D0-48CF-98E6-A48A90C2D3C8', 'ExtractionID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;

/* Index for Foreign Keys for ApplicationDocument */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Application Documents
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key ApplicationID in table ApplicationDocument
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ApplicationDocument_ApplicationID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ApplicationDocument]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ApplicationDocument_ApplicationID ON [${flyway:defaultSchema}].[ApplicationDocument] ([ApplicationID]);

-- Index for foreign key SubjectID in table ApplicationDocument
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ApplicationDocument_SubjectID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ApplicationDocument]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ApplicationDocument_SubjectID ON [${flyway:defaultSchema}].[ApplicationDocument] ([SubjectID]);

-- Index for foreign key EvidenceDocumentID in table ApplicationDocument
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ApplicationDocument_EvidenceDocumentID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ApplicationDocument]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ApplicationDocument_EvidenceDocumentID ON [${flyway:defaultSchema}].[ApplicationDocument] ([EvidenceDocumentID]);

-- Index for foreign key DocumentAttestationID in table ApplicationDocument
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ApplicationDocument_DocumentAttestationID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ApplicationDocument]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ApplicationDocument_DocumentAttestationID ON [${flyway:defaultSchema}].[ApplicationDocument] ([DocumentAttestationID]);

/* Index for Foreign Keys for Application */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Applications
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key SubjectID in table Application
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Application_SubjectID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Application]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Application_SubjectID ON [${flyway:defaultSchema}].[Application] ([SubjectID]);

-- Index for foreign key ProgramVersionID in table Application
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Application_ProgramVersionID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Application]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Application_ProgramVersionID ON [${flyway:defaultSchema}].[Application] ([ProgramVersionID]);

-- Index for foreign key SubmittedByUserID in table Application
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Application_SubmittedByUserID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Application]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Application_SubmittedByUserID ON [${flyway:defaultSchema}].[Application] ([SubmittedByUserID]);

-- Index for foreign key AttestedByUserID in table Application
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Application_AttestedByUserID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Application]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Application_AttestedByUserID ON [${flyway:defaultSchema}].[Application] ([AttestedByUserID]);

-- Index for foreign key WithdrawnByUserID in table Application
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Application_WithdrawnByUserID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Application]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Application_WithdrawnByUserID ON [${flyway:defaultSchema}].[Application] ([WithdrawnByUserID]);

/* SQL text to update entity field related entity name field map for entity field ID 6F6CBA6B-6700-4715-BFA5-F1A9873AE02A */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='6F6CBA6B-6700-4715-BFA5-F1A9873AE02A', @RelatedEntityNameFieldMap='SubmittedByUser';

/* Index for Foreign Keys for DocumentAttestation */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Attestations
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key SubjectID in table DocumentAttestation
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_DocumentAttestation_SubjectID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[DocumentAttestation]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_DocumentAttestation_SubjectID ON [${flyway:defaultSchema}].[DocumentAttestation] ([SubjectID]);

-- Index for foreign key DocumentRequirementID in table DocumentAttestation
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_DocumentAttestation_DocumentRequirementID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[DocumentAttestation]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_DocumentAttestation_DocumentRequirementID ON [${flyway:defaultSchema}].[DocumentAttestation] ([DocumentRequirementID]);

-- Index for foreign key AttestedByUserID in table DocumentAttestation
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_DocumentAttestation_AttestedByUserID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[DocumentAttestation]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_DocumentAttestation_AttestedByUserID ON [${flyway:defaultSchema}].[DocumentAttestation] ([AttestedByUserID]);

/* SQL text to update entity field related entity name field map for entity field ID 60F9E5B4-622F-4A51-A69E-64853DCA0BBE */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='60F9E5B4-622F-4A51-A69E-64853DCA0BBE', @RelatedEntityNameFieldMap='DocumentRequirement';

/* Index for Foreign Keys for EvidenceDocument */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Evidence Documents
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key SubjectID in table EvidenceDocument
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_EvidenceDocument_SubjectID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[EvidenceDocument]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_EvidenceDocument_SubjectID ON [${flyway:defaultSchema}].[EvidenceDocument] ([SubjectID]);

-- Index for foreign key DocumentRequirementID in table EvidenceDocument
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_EvidenceDocument_DocumentRequirementID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[EvidenceDocument]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_EvidenceDocument_DocumentRequirementID ON [${flyway:defaultSchema}].[EvidenceDocument] ([DocumentRequirementID]);

-- Index for foreign key FileID in table EvidenceDocument
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_EvidenceDocument_FileID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[EvidenceDocument]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_EvidenceDocument_FileID ON [${flyway:defaultSchema}].[EvidenceDocument] ([FileID]);

-- Index for foreign key SupersedesDocumentID in table EvidenceDocument
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_EvidenceDocument_SupersedesDocumentID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[EvidenceDocument]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_EvidenceDocument_SupersedesDocumentID ON [${flyway:defaultSchema}].[EvidenceDocument] ([SupersedesDocumentID]);

-- Index for foreign key UploadedByUserID in table EvidenceDocument
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_EvidenceDocument_UploadedByUserID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[EvidenceDocument]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_EvidenceDocument_UploadedByUserID ON [${flyway:defaultSchema}].[EvidenceDocument] ([UploadedByUserID]);

/* SQL text to update entity field related entity name field map for entity field ID 76367A30-FD2A-44BB-9783-B2A73138DE2A */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='76367A30-FD2A-44BB-9783-B2A73138DE2A', @RelatedEntityNameFieldMap='DocumentRequirement';

/* Index for Foreign Keys for Extraction */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Extractions
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key EvidenceDocumentID in table Extraction
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Extraction_EvidenceDocumentID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Extraction]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Extraction_EvidenceDocumentID ON [${flyway:defaultSchema}].[Extraction] ([EvidenceDocumentID]);

-- Index for foreign key StandardID in table Extraction
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Extraction_StandardID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Extraction]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Extraction_StandardID ON [${flyway:defaultSchema}].[Extraction] ([StandardID]);

-- Index for foreign key SubjectID in table Extraction
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Extraction_SubjectID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Extraction]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Extraction_SubjectID ON [${flyway:defaultSchema}].[Extraction] ([SubjectID]);

-- Index for foreign key AIPromptRunID in table Extraction
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Extraction_AIPromptRunID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Extraction]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Extraction_AIPromptRunID ON [${flyway:defaultSchema}].[Extraction] ([AIPromptRunID]);

/* SQL text to update entity field related entity name field map for entity field ID 8969FBC3-EF00-4D68-AA84-A8AEE42504C7 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='8969FBC3-EF00-4D68-AA84-A8AEE42504C7', @RelatedEntityNameFieldMap='AIPromptRun';

/* Base View SQL for MJ_BizApps_Credentialing: Application Documents */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Application Documents
-- Item: vwApplicationDocuments
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Application Documents
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  ApplicationDocument
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwApplicationDocuments]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwApplicationDocuments];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwApplicationDocuments]
AS
SELECT
    a.*
FROM
    [${flyway:defaultSchema}].[ApplicationDocument] AS a
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwApplicationDocuments] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Application Documents */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Application Documents
-- Item: Permissions for vwApplicationDocuments
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwApplicationDocuments] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Application Documents */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Application Documents
-- Item: spCreateApplicationDocument
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR ApplicationDocument
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateApplicationDocument]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateApplicationDocument];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateApplicationDocument]
    @ID uniqueidentifier = NULL,
    @ApplicationID uniqueidentifier,
    @SubjectID uniqueidentifier,
    @EvidenceDocumentID_Clear bit = 0,
    @EvidenceDocumentID uniqueidentifier = NULL,
    @DocumentAttestationID_Clear bit = 0,
    @DocumentAttestationID uniqueidentifier = NULL,
    @FrozenAt datetimeoffset
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[ApplicationDocument]
            (
                [ID],
                [ApplicationID],
                [SubjectID],
                [EvidenceDocumentID],
                [DocumentAttestationID],
                [FrozenAt]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @ApplicationID,
                @SubjectID,
                CASE WHEN @EvidenceDocumentID_Clear = 1 THEN NULL ELSE ISNULL(@EvidenceDocumentID, NULL) END,
                CASE WHEN @DocumentAttestationID_Clear = 1 THEN NULL ELSE ISNULL(@DocumentAttestationID, NULL) END,
                @FrozenAt
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[ApplicationDocument]
            (
                [ApplicationID],
                [SubjectID],
                [EvidenceDocumentID],
                [DocumentAttestationID],
                [FrozenAt]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ApplicationID,
                @SubjectID,
                CASE WHEN @EvidenceDocumentID_Clear = 1 THEN NULL ELSE ISNULL(@EvidenceDocumentID, NULL) END,
                CASE WHEN @DocumentAttestationID_Clear = 1 THEN NULL ELSE ISNULL(@DocumentAttestationID, NULL) END,
                @FrozenAt
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwApplicationDocuments] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateApplicationDocument] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Application Documents */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateApplicationDocument] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Application Documents */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Application Documents
-- Item: spUpdateApplicationDocument
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR ApplicationDocument
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateApplicationDocument]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateApplicationDocument];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateApplicationDocument]
    @ID uniqueidentifier,
    @ApplicationID uniqueidentifier = NULL,
    @SubjectID uniqueidentifier = NULL,
    @EvidenceDocumentID_Clear bit = 0,
    @EvidenceDocumentID uniqueidentifier = NULL,
    @DocumentAttestationID_Clear bit = 0,
    @DocumentAttestationID uniqueidentifier = NULL,
    @FrozenAt datetimeoffset = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[ApplicationDocument]
    SET
        [ApplicationID] = ISNULL(@ApplicationID, [ApplicationID]),
        [SubjectID] = ISNULL(@SubjectID, [SubjectID]),
        [EvidenceDocumentID] = CASE WHEN @EvidenceDocumentID_Clear = 1 THEN NULL ELSE ISNULL(@EvidenceDocumentID, [EvidenceDocumentID]) END,
        [DocumentAttestationID] = CASE WHEN @DocumentAttestationID_Clear = 1 THEN NULL ELSE ISNULL(@DocumentAttestationID, [DocumentAttestationID]) END,
        [FrozenAt] = ISNULL(@FrozenAt, [FrozenAt])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwApplicationDocuments] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwApplicationDocuments]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateApplicationDocument] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the ApplicationDocument table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateApplicationDocument]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateApplicationDocument];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateApplicationDocument
ON [${flyway:defaultSchema}].[ApplicationDocument]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[ApplicationDocument]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[ApplicationDocument] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Application Documents */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateApplicationDocument] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Application Documents */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Application Documents
-- Item: spDeleteApplicationDocument
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR ApplicationDocument
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteApplicationDocument]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteApplicationDocument];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteApplicationDocument]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[ApplicationDocument]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteApplicationDocument] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Application Documents */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteApplicationDocument] TO [cdp_Developer], [cdp_Integration];

/* SQL text to update entity field related entity name field map for entity field ID 8B66407A-AC4C-4735-B570-074A5C9D0BD7 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='8B66407A-AC4C-4735-B570-074A5C9D0BD7', @RelatedEntityNameFieldMap='AttestedByUser';

/* SQL text to update entity field related entity name field map for entity field ID 69565046-0C17-4AB3-BFCC-8E46D589693A */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='69565046-0C17-4AB3-BFCC-8E46D589693A', @RelatedEntityNameFieldMap='AttestedByUser';

/* SQL text to update entity field related entity name field map for entity field ID E8C301E1-869B-40A0-9BB6-F5199564719B */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='E8C301E1-869B-40A0-9BB6-F5199564719B', @RelatedEntityNameFieldMap='File';

/* Base View SQL for MJ_BizApps_Credentialing: Extractions */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Extractions
-- Item: vwExtractions
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Extractions
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  Extraction
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwExtractions]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwExtractions];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwExtractions]
AS
SELECT
    e.*,
    MJAIPromptRun_AIPromptRunID.[RunName] AS [AIPromptRun]
FROM
    [${flyway:defaultSchema}].[Extraction] AS e
LEFT OUTER JOIN
    [${mjSchema}].[AIPromptRun] AS MJAIPromptRun_AIPromptRunID
  ON
    [e].[AIPromptRunID] = MJAIPromptRun_AIPromptRunID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwExtractions] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Extractions */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Extractions
-- Item: Permissions for vwExtractions
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwExtractions] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Extractions */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Extractions
-- Item: spCreateExtraction
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR Extraction
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateExtraction]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateExtraction];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateExtraction]
    @ID uniqueidentifier = NULL,
    @EvidenceDocumentID uniqueidentifier,
    @StandardID uniqueidentifier,
    @SubjectID uniqueidentifier,
    @Value nvarchar(MAX),
    @Excerpt nvarchar(MAX),
    @StartOffset int,
    @EndOffset int,
    @PageReference_Clear bit = 0,
    @PageReference nvarchar(50) = NULL,
    @HeadingPath_Clear bit = 0,
    @HeadingPath nvarchar(1000) = NULL,
    @Confidence decimal(5, 4),
    @Reasoning_Clear bit = 0,
    @Reasoning nvarchar(MAX) = NULL,
    @Status nvarchar(20) = NULL,
    @IsSuperseded bit = NULL,
    @AIPromptRunID_Clear bit = 0,
    @AIPromptRunID uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[Extraction]
            (
                [ID],
                [EvidenceDocumentID],
                [StandardID],
                [SubjectID],
                [Value],
                [Excerpt],
                [StartOffset],
                [EndOffset],
                [PageReference],
                [HeadingPath],
                [Confidence],
                [Reasoning],
                [Status],
                [IsSuperseded],
                [AIPromptRunID]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @EvidenceDocumentID,
                @StandardID,
                @SubjectID,
                @Value,
                @Excerpt,
                @StartOffset,
                @EndOffset,
                CASE WHEN @PageReference_Clear = 1 THEN NULL ELSE ISNULL(@PageReference, NULL) END,
                CASE WHEN @HeadingPath_Clear = 1 THEN NULL ELSE ISNULL(@HeadingPath, NULL) END,
                @Confidence,
                CASE WHEN @Reasoning_Clear = 1 THEN NULL ELSE ISNULL(@Reasoning, NULL) END,
                ISNULL(@Status, 'Proposed'),
                ISNULL(@IsSuperseded, 0),
                CASE WHEN @AIPromptRunID_Clear = 1 THEN NULL ELSE ISNULL(@AIPromptRunID, NULL) END
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[Extraction]
            (
                [EvidenceDocumentID],
                [StandardID],
                [SubjectID],
                [Value],
                [Excerpt],
                [StartOffset],
                [EndOffset],
                [PageReference],
                [HeadingPath],
                [Confidence],
                [Reasoning],
                [Status],
                [IsSuperseded],
                [AIPromptRunID]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @EvidenceDocumentID,
                @StandardID,
                @SubjectID,
                @Value,
                @Excerpt,
                @StartOffset,
                @EndOffset,
                CASE WHEN @PageReference_Clear = 1 THEN NULL ELSE ISNULL(@PageReference, NULL) END,
                CASE WHEN @HeadingPath_Clear = 1 THEN NULL ELSE ISNULL(@HeadingPath, NULL) END,
                @Confidence,
                CASE WHEN @Reasoning_Clear = 1 THEN NULL ELSE ISNULL(@Reasoning, NULL) END,
                ISNULL(@Status, 'Proposed'),
                ISNULL(@IsSuperseded, 0),
                CASE WHEN @AIPromptRunID_Clear = 1 THEN NULL ELSE ISNULL(@AIPromptRunID, NULL) END
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwExtractions] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateExtraction] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Extractions */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateExtraction] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Extractions */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Extractions
-- Item: spUpdateExtraction
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR Extraction
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateExtraction]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateExtraction];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateExtraction]
    @ID uniqueidentifier,
    @EvidenceDocumentID uniqueidentifier = NULL,
    @StandardID uniqueidentifier = NULL,
    @SubjectID uniqueidentifier = NULL,
    @Value nvarchar(MAX) = NULL,
    @Excerpt nvarchar(MAX) = NULL,
    @StartOffset int = NULL,
    @EndOffset int = NULL,
    @PageReference_Clear bit = 0,
    @PageReference nvarchar(50) = NULL,
    @HeadingPath_Clear bit = 0,
    @HeadingPath nvarchar(1000) = NULL,
    @Confidence decimal(5, 4) = NULL,
    @Reasoning_Clear bit = 0,
    @Reasoning nvarchar(MAX) = NULL,
    @Status nvarchar(20) = NULL,
    @IsSuperseded bit = NULL,
    @AIPromptRunID_Clear bit = 0,
    @AIPromptRunID uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Extraction]
    SET
        [EvidenceDocumentID] = ISNULL(@EvidenceDocumentID, [EvidenceDocumentID]),
        [StandardID] = ISNULL(@StandardID, [StandardID]),
        [SubjectID] = ISNULL(@SubjectID, [SubjectID]),
        [Value] = ISNULL(@Value, [Value]),
        [Excerpt] = ISNULL(@Excerpt, [Excerpt]),
        [StartOffset] = ISNULL(@StartOffset, [StartOffset]),
        [EndOffset] = ISNULL(@EndOffset, [EndOffset]),
        [PageReference] = CASE WHEN @PageReference_Clear = 1 THEN NULL ELSE ISNULL(@PageReference, [PageReference]) END,
        [HeadingPath] = CASE WHEN @HeadingPath_Clear = 1 THEN NULL ELSE ISNULL(@HeadingPath, [HeadingPath]) END,
        [Confidence] = ISNULL(@Confidence, [Confidence]),
        [Reasoning] = CASE WHEN @Reasoning_Clear = 1 THEN NULL ELSE ISNULL(@Reasoning, [Reasoning]) END,
        [Status] = ISNULL(@Status, [Status]),
        [IsSuperseded] = ISNULL(@IsSuperseded, [IsSuperseded]),
        [AIPromptRunID] = CASE WHEN @AIPromptRunID_Clear = 1 THEN NULL ELSE ISNULL(@AIPromptRunID, [AIPromptRunID]) END
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwExtractions] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwExtractions]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateExtraction] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the Extraction table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateExtraction]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateExtraction];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateExtraction
ON [${flyway:defaultSchema}].[Extraction]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Extraction]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[Extraction] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Extractions */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateExtraction] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Extractions */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Extractions
-- Item: spDeleteExtraction
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR Extraction
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteExtraction]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteExtraction];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteExtraction]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[Extraction]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteExtraction] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Extractions */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteExtraction] TO [cdp_Developer], [cdp_Integration];

/* SQL text to update entity field related entity name field map for entity field ID 23516F1D-E1C2-4341-8572-795123C50638 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='23516F1D-E1C2-4341-8572-795123C50638', @RelatedEntityNameFieldMap='WithdrawnByUser';

/* Base View SQL for MJ_BizApps_Credentialing: Document Attestations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Attestations
-- Item: vwDocumentAttestations
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Document Attestations
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  DocumentAttestation
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwDocumentAttestations]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwDocumentAttestations];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwDocumentAttestations]
AS
SELECT
    d.*,
    mjBizAppsCredentialingDocumentRequirement_DocumentRequirementID.[Name] AS [DocumentRequirement],
    MJUser_AttestedByUserID.[Name] AS [AttestedByUser]
FROM
    [${flyway:defaultSchema}].[DocumentAttestation] AS d
INNER JOIN
    [${flyway:defaultSchema}].[DocumentRequirement] AS mjBizAppsCredentialingDocumentRequirement_DocumentRequirementID
  ON
    [d].[DocumentRequirementID] = mjBizAppsCredentialingDocumentRequirement_DocumentRequirementID.[ID]
INNER JOIN
    [${mjSchema}].[User] AS MJUser_AttestedByUserID
  ON
    [d].[AttestedByUserID] = MJUser_AttestedByUserID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwDocumentAttestations] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Document Attestations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Attestations
-- Item: Permissions for vwDocumentAttestations
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwDocumentAttestations] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Document Attestations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Attestations
-- Item: spCreateDocumentAttestation
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR DocumentAttestation
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateDocumentAttestation]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateDocumentAttestation];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateDocumentAttestation]
    @ID uniqueidentifier = NULL,
    @SubjectID uniqueidentifier,
    @DocumentRequirementID uniqueidentifier,
    @Statement nvarchar(MAX),
    @AttestedByUserID uniqueidentifier,
    @AttestedAt datetimeoffset,
    @IsSuperseded bit = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[DocumentAttestation]
            (
                [ID],
                [SubjectID],
                [DocumentRequirementID],
                [Statement],
                [AttestedByUserID],
                [AttestedAt],
                [IsSuperseded]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @SubjectID,
                @DocumentRequirementID,
                @Statement,
                @AttestedByUserID,
                @AttestedAt,
                ISNULL(@IsSuperseded, 0)
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[DocumentAttestation]
            (
                [SubjectID],
                [DocumentRequirementID],
                [Statement],
                [AttestedByUserID],
                [AttestedAt],
                [IsSuperseded]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @SubjectID,
                @DocumentRequirementID,
                @Statement,
                @AttestedByUserID,
                @AttestedAt,
                ISNULL(@IsSuperseded, 0)
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwDocumentAttestations] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateDocumentAttestation] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Document Attestations */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateDocumentAttestation] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Document Attestations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Attestations
-- Item: spUpdateDocumentAttestation
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR DocumentAttestation
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateDocumentAttestation]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateDocumentAttestation];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateDocumentAttestation]
    @ID uniqueidentifier,
    @SubjectID uniqueidentifier = NULL,
    @DocumentRequirementID uniqueidentifier = NULL,
    @Statement nvarchar(MAX) = NULL,
    @AttestedByUserID uniqueidentifier = NULL,
    @AttestedAt datetimeoffset = NULL,
    @IsSuperseded bit = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[DocumentAttestation]
    SET
        [SubjectID] = ISNULL(@SubjectID, [SubjectID]),
        [DocumentRequirementID] = ISNULL(@DocumentRequirementID, [DocumentRequirementID]),
        [Statement] = ISNULL(@Statement, [Statement]),
        [AttestedByUserID] = ISNULL(@AttestedByUserID, [AttestedByUserID]),
        [AttestedAt] = ISNULL(@AttestedAt, [AttestedAt]),
        [IsSuperseded] = ISNULL(@IsSuperseded, [IsSuperseded])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwDocumentAttestations] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwDocumentAttestations]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateDocumentAttestation] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the DocumentAttestation table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateDocumentAttestation]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateDocumentAttestation];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateDocumentAttestation
ON [${flyway:defaultSchema}].[DocumentAttestation]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[DocumentAttestation]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[DocumentAttestation] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Document Attestations */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateDocumentAttestation] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Document Attestations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Attestations
-- Item: spDeleteDocumentAttestation
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR DocumentAttestation
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteDocumentAttestation]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteDocumentAttestation];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteDocumentAttestation]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[DocumentAttestation]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteDocumentAttestation] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Document Attestations */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteDocumentAttestation] TO [cdp_Developer], [cdp_Integration];

/* SQL text to update entity field related entity name field map for entity field ID A17F7640-4AA2-415D-AF31-21BC97E1FE52 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='A17F7640-4AA2-415D-AF31-21BC97E1FE52', @RelatedEntityNameFieldMap='UploadedByUser';

/* Base View SQL for MJ_BizApps_Credentialing: Applications */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Applications
-- Item: vwApplications
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Applications
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  Application
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwApplications]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwApplications];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwApplications]
AS
SELECT
    a.*,
    MJUser_SubmittedByUserID.[Name] AS [SubmittedByUser],
    MJUser_AttestedByUserID.[Name] AS [AttestedByUser],
    MJUser_WithdrawnByUserID.[Name] AS [WithdrawnByUser]
FROM
    [${flyway:defaultSchema}].[Application] AS a
LEFT OUTER JOIN
    [${mjSchema}].[User] AS MJUser_SubmittedByUserID
  ON
    [a].[SubmittedByUserID] = MJUser_SubmittedByUserID.[ID]
LEFT OUTER JOIN
    [${mjSchema}].[User] AS MJUser_AttestedByUserID
  ON
    [a].[AttestedByUserID] = MJUser_AttestedByUserID.[ID]
LEFT OUTER JOIN
    [${mjSchema}].[User] AS MJUser_WithdrawnByUserID
  ON
    [a].[WithdrawnByUserID] = MJUser_WithdrawnByUserID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwApplications] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Applications */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Applications
-- Item: Permissions for vwApplications
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwApplications] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Applications */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Applications
-- Item: spCreateApplication
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR Application
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateApplication]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateApplication];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateApplication]
    @ID uniqueidentifier = NULL,
    @SubjectID uniqueidentifier,
    @ProgramVersionID uniqueidentifier,
    @Status nvarchar(30) = NULL,
    @IsHistorical bit = NULL,
    @SubmittedAt_Clear bit = 0,
    @SubmittedAt datetimeoffset = NULL,
    @SubmittedByUserID_Clear bit = 0,
    @SubmittedByUserID uniqueidentifier = NULL,
    @SubmissionDispatchedAt_Clear bit = 0,
    @SubmissionDispatchedAt datetimeoffset = NULL,
    @SubmissionDispatchClaimID_Clear bit = 0,
    @SubmissionDispatchClaimID uniqueidentifier = NULL,
    @SubmissionDispatchClaimedAt_Clear bit = 0,
    @SubmissionDispatchClaimedAt datetimeoffset = NULL,
    @SubmissionDispatchAttempts int = NULL,
    @SubmissionDispatchNote_Clear bit = 0,
    @SubmissionDispatchNote nvarchar(500) = NULL,
    @SubjectSnapshot_Clear bit = 0,
    @SubjectSnapshot nvarchar(MAX) = NULL,
    @AttestationOfficerName_Clear bit = 0,
    @AttestationOfficerName nvarchar(255) = NULL,
    @AttestationOfficerRole_Clear bit = 0,
    @AttestationOfficerRole nvarchar(255) = NULL,
    @AttestationApprovalDate_Clear bit = 0,
    @AttestationApprovalDate date = NULL,
    @AttestationStatement_Clear bit = 0,
    @AttestationStatement nvarchar(MAX) = NULL,
    @AttestedByUserID_Clear bit = 0,
    @AttestedByUserID uniqueidentifier = NULL,
    @AttestedAt_Clear bit = 0,
    @AttestedAt datetimeoffset = NULL,
    @WithdrawnAt_Clear bit = 0,
    @WithdrawnAt datetimeoffset = NULL,
    @WithdrawnByUserID_Clear bit = 0,
    @WithdrawnByUserID uniqueidentifier = NULL,
    @WithdrawalReason_Clear bit = 0,
    @WithdrawalReason nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[Application]
            (
                [ID],
                [SubjectID],
                [ProgramVersionID],
                [Status],
                [IsHistorical],
                [SubmittedAt],
                [SubmittedByUserID],
                [SubmissionDispatchedAt],
                [SubmissionDispatchClaimID],
                [SubmissionDispatchClaimedAt],
                [SubmissionDispatchAttempts],
                [SubmissionDispatchNote],
                [SubjectSnapshot],
                [AttestationOfficerName],
                [AttestationOfficerRole],
                [AttestationApprovalDate],
                [AttestationStatement],
                [AttestedByUserID],
                [AttestedAt],
                [WithdrawnAt],
                [WithdrawnByUserID],
                [WithdrawalReason]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @SubjectID,
                @ProgramVersionID,
                ISNULL(@Status, 'Draft'),
                ISNULL(@IsHistorical, 0),
                CASE WHEN @SubmittedAt_Clear = 1 THEN NULL ELSE ISNULL(@SubmittedAt, NULL) END,
                CASE WHEN @SubmittedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@SubmittedByUserID, NULL) END,
                CASE WHEN @SubmissionDispatchedAt_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchedAt, NULL) END,
                CASE WHEN @SubmissionDispatchClaimID_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchClaimID, NULL) END,
                CASE WHEN @SubmissionDispatchClaimedAt_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchClaimedAt, NULL) END,
                ISNULL(@SubmissionDispatchAttempts, 0),
                CASE WHEN @SubmissionDispatchNote_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchNote, NULL) END,
                CASE WHEN @SubjectSnapshot_Clear = 1 THEN NULL ELSE ISNULL(@SubjectSnapshot, NULL) END,
                CASE WHEN @AttestationOfficerName_Clear = 1 THEN NULL ELSE ISNULL(@AttestationOfficerName, NULL) END,
                CASE WHEN @AttestationOfficerRole_Clear = 1 THEN NULL ELSE ISNULL(@AttestationOfficerRole, NULL) END,
                CASE WHEN @AttestationApprovalDate_Clear = 1 THEN NULL ELSE ISNULL(@AttestationApprovalDate, NULL) END,
                CASE WHEN @AttestationStatement_Clear = 1 THEN NULL ELSE ISNULL(@AttestationStatement, NULL) END,
                CASE WHEN @AttestedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@AttestedByUserID, NULL) END,
                CASE WHEN @AttestedAt_Clear = 1 THEN NULL ELSE ISNULL(@AttestedAt, NULL) END,
                CASE WHEN @WithdrawnAt_Clear = 1 THEN NULL ELSE ISNULL(@WithdrawnAt, NULL) END,
                CASE WHEN @WithdrawnByUserID_Clear = 1 THEN NULL ELSE ISNULL(@WithdrawnByUserID, NULL) END,
                CASE WHEN @WithdrawalReason_Clear = 1 THEN NULL ELSE ISNULL(@WithdrawalReason, NULL) END
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[Application]
            (
                [SubjectID],
                [ProgramVersionID],
                [Status],
                [IsHistorical],
                [SubmittedAt],
                [SubmittedByUserID],
                [SubmissionDispatchedAt],
                [SubmissionDispatchClaimID],
                [SubmissionDispatchClaimedAt],
                [SubmissionDispatchAttempts],
                [SubmissionDispatchNote],
                [SubjectSnapshot],
                [AttestationOfficerName],
                [AttestationOfficerRole],
                [AttestationApprovalDate],
                [AttestationStatement],
                [AttestedByUserID],
                [AttestedAt],
                [WithdrawnAt],
                [WithdrawnByUserID],
                [WithdrawalReason]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @SubjectID,
                @ProgramVersionID,
                ISNULL(@Status, 'Draft'),
                ISNULL(@IsHistorical, 0),
                CASE WHEN @SubmittedAt_Clear = 1 THEN NULL ELSE ISNULL(@SubmittedAt, NULL) END,
                CASE WHEN @SubmittedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@SubmittedByUserID, NULL) END,
                CASE WHEN @SubmissionDispatchedAt_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchedAt, NULL) END,
                CASE WHEN @SubmissionDispatchClaimID_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchClaimID, NULL) END,
                CASE WHEN @SubmissionDispatchClaimedAt_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchClaimedAt, NULL) END,
                ISNULL(@SubmissionDispatchAttempts, 0),
                CASE WHEN @SubmissionDispatchNote_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchNote, NULL) END,
                CASE WHEN @SubjectSnapshot_Clear = 1 THEN NULL ELSE ISNULL(@SubjectSnapshot, NULL) END,
                CASE WHEN @AttestationOfficerName_Clear = 1 THEN NULL ELSE ISNULL(@AttestationOfficerName, NULL) END,
                CASE WHEN @AttestationOfficerRole_Clear = 1 THEN NULL ELSE ISNULL(@AttestationOfficerRole, NULL) END,
                CASE WHEN @AttestationApprovalDate_Clear = 1 THEN NULL ELSE ISNULL(@AttestationApprovalDate, NULL) END,
                CASE WHEN @AttestationStatement_Clear = 1 THEN NULL ELSE ISNULL(@AttestationStatement, NULL) END,
                CASE WHEN @AttestedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@AttestedByUserID, NULL) END,
                CASE WHEN @AttestedAt_Clear = 1 THEN NULL ELSE ISNULL(@AttestedAt, NULL) END,
                CASE WHEN @WithdrawnAt_Clear = 1 THEN NULL ELSE ISNULL(@WithdrawnAt, NULL) END,
                CASE WHEN @WithdrawnByUserID_Clear = 1 THEN NULL ELSE ISNULL(@WithdrawnByUserID, NULL) END,
                CASE WHEN @WithdrawalReason_Clear = 1 THEN NULL ELSE ISNULL(@WithdrawalReason, NULL) END
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwApplications] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateApplication] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Applications */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateApplication] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Applications */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Applications
-- Item: spUpdateApplication
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR Application
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateApplication]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateApplication];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateApplication]
    @ID uniqueidentifier,
    @SubjectID uniqueidentifier = NULL,
    @ProgramVersionID uniqueidentifier = NULL,
    @Status nvarchar(30) = NULL,
    @IsHistorical bit = NULL,
    @SubmittedAt_Clear bit = 0,
    @SubmittedAt datetimeoffset = NULL,
    @SubmittedByUserID_Clear bit = 0,
    @SubmittedByUserID uniqueidentifier = NULL,
    @SubmissionDispatchedAt_Clear bit = 0,
    @SubmissionDispatchedAt datetimeoffset = NULL,
    @SubmissionDispatchClaimID_Clear bit = 0,
    @SubmissionDispatchClaimID uniqueidentifier = NULL,
    @SubmissionDispatchClaimedAt_Clear bit = 0,
    @SubmissionDispatchClaimedAt datetimeoffset = NULL,
    @SubmissionDispatchAttempts int = NULL,
    @SubmissionDispatchNote_Clear bit = 0,
    @SubmissionDispatchNote nvarchar(500) = NULL,
    @SubjectSnapshot_Clear bit = 0,
    @SubjectSnapshot nvarchar(MAX) = NULL,
    @AttestationOfficerName_Clear bit = 0,
    @AttestationOfficerName nvarchar(255) = NULL,
    @AttestationOfficerRole_Clear bit = 0,
    @AttestationOfficerRole nvarchar(255) = NULL,
    @AttestationApprovalDate_Clear bit = 0,
    @AttestationApprovalDate date = NULL,
    @AttestationStatement_Clear bit = 0,
    @AttestationStatement nvarchar(MAX) = NULL,
    @AttestedByUserID_Clear bit = 0,
    @AttestedByUserID uniqueidentifier = NULL,
    @AttestedAt_Clear bit = 0,
    @AttestedAt datetimeoffset = NULL,
    @WithdrawnAt_Clear bit = 0,
    @WithdrawnAt datetimeoffset = NULL,
    @WithdrawnByUserID_Clear bit = 0,
    @WithdrawnByUserID uniqueidentifier = NULL,
    @WithdrawalReason_Clear bit = 0,
    @WithdrawalReason nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Application]
    SET
        [SubjectID] = ISNULL(@SubjectID, [SubjectID]),
        [ProgramVersionID] = ISNULL(@ProgramVersionID, [ProgramVersionID]),
        [Status] = ISNULL(@Status, [Status]),
        [IsHistorical] = ISNULL(@IsHistorical, [IsHistorical]),
        [SubmittedAt] = CASE WHEN @SubmittedAt_Clear = 1 THEN NULL ELSE ISNULL(@SubmittedAt, [SubmittedAt]) END,
        [SubmittedByUserID] = CASE WHEN @SubmittedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@SubmittedByUserID, [SubmittedByUserID]) END,
        [SubmissionDispatchedAt] = CASE WHEN @SubmissionDispatchedAt_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchedAt, [SubmissionDispatchedAt]) END,
        [SubmissionDispatchClaimID] = CASE WHEN @SubmissionDispatchClaimID_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchClaimID, [SubmissionDispatchClaimID]) END,
        [SubmissionDispatchClaimedAt] = CASE WHEN @SubmissionDispatchClaimedAt_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchClaimedAt, [SubmissionDispatchClaimedAt]) END,
        [SubmissionDispatchAttempts] = ISNULL(@SubmissionDispatchAttempts, [SubmissionDispatchAttempts]),
        [SubmissionDispatchNote] = CASE WHEN @SubmissionDispatchNote_Clear = 1 THEN NULL ELSE ISNULL(@SubmissionDispatchNote, [SubmissionDispatchNote]) END,
        [SubjectSnapshot] = CASE WHEN @SubjectSnapshot_Clear = 1 THEN NULL ELSE ISNULL(@SubjectSnapshot, [SubjectSnapshot]) END,
        [AttestationOfficerName] = CASE WHEN @AttestationOfficerName_Clear = 1 THEN NULL ELSE ISNULL(@AttestationOfficerName, [AttestationOfficerName]) END,
        [AttestationOfficerRole] = CASE WHEN @AttestationOfficerRole_Clear = 1 THEN NULL ELSE ISNULL(@AttestationOfficerRole, [AttestationOfficerRole]) END,
        [AttestationApprovalDate] = CASE WHEN @AttestationApprovalDate_Clear = 1 THEN NULL ELSE ISNULL(@AttestationApprovalDate, [AttestationApprovalDate]) END,
        [AttestationStatement] = CASE WHEN @AttestationStatement_Clear = 1 THEN NULL ELSE ISNULL(@AttestationStatement, [AttestationStatement]) END,
        [AttestedByUserID] = CASE WHEN @AttestedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@AttestedByUserID, [AttestedByUserID]) END,
        [AttestedAt] = CASE WHEN @AttestedAt_Clear = 1 THEN NULL ELSE ISNULL(@AttestedAt, [AttestedAt]) END,
        [WithdrawnAt] = CASE WHEN @WithdrawnAt_Clear = 1 THEN NULL ELSE ISNULL(@WithdrawnAt, [WithdrawnAt]) END,
        [WithdrawnByUserID] = CASE WHEN @WithdrawnByUserID_Clear = 1 THEN NULL ELSE ISNULL(@WithdrawnByUserID, [WithdrawnByUserID]) END,
        [WithdrawalReason] = CASE WHEN @WithdrawalReason_Clear = 1 THEN NULL ELSE ISNULL(@WithdrawalReason, [WithdrawalReason]) END
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwApplications] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwApplications]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateApplication] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the Application table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateApplication]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateApplication];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateApplication
ON [${flyway:defaultSchema}].[Application]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Application]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[Application] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Applications */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateApplication] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Applications */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Applications
-- Item: spDeleteApplication
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR Application
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteApplication]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteApplication];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteApplication]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[Application]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteApplication] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Applications */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteApplication] TO [cdp_Developer], [cdp_Integration];

/* Base View SQL for MJ_BizApps_Credentialing: Evidence Documents */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Evidence Documents
-- Item: vwEvidenceDocuments
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Evidence Documents
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  EvidenceDocument
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwEvidenceDocuments]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwEvidenceDocuments];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwEvidenceDocuments]
AS
SELECT
    e.*,
    mjBizAppsCredentialingDocumentRequirement_DocumentRequirementID.[Name] AS [DocumentRequirement],
    MJFile_FileID.[Name] AS [File],
    MJUser_UploadedByUserID.[Name] AS [UploadedByUser]
FROM
    [${flyway:defaultSchema}].[EvidenceDocument] AS e
LEFT OUTER JOIN
    [${flyway:defaultSchema}].[DocumentRequirement] AS mjBizAppsCredentialingDocumentRequirement_DocumentRequirementID
  ON
    [e].[DocumentRequirementID] = mjBizAppsCredentialingDocumentRequirement_DocumentRequirementID.[ID]
INNER JOIN
    [${mjSchema}].[File] AS MJFile_FileID
  ON
    [e].[FileID] = MJFile_FileID.[ID]
INNER JOIN
    [${mjSchema}].[User] AS MJUser_UploadedByUserID
  ON
    [e].[UploadedByUserID] = MJUser_UploadedByUserID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwEvidenceDocuments] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Evidence Documents */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Evidence Documents
-- Item: Permissions for vwEvidenceDocuments
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwEvidenceDocuments] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Evidence Documents */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Evidence Documents
-- Item: spCreateEvidenceDocument
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR EvidenceDocument
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateEvidenceDocument]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateEvidenceDocument];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateEvidenceDocument]
    @ID uniqueidentifier = NULL,
    @SubjectID uniqueidentifier,
    @DocumentRequirementID_Clear bit = 0,
    @DocumentRequirementID uniqueidentifier = NULL,
    @FileID uniqueidentifier,
    @FileName nvarchar(255),
    @ContentType nvarchar(150),
    @SizeBytes bigint,
    @ContentHash char(64),
    @ExtractedText_Clear bit = 0,
    @ExtractedText nvarchar(MAX) = NULL,
    @TextStatus nvarchar(30),
    @TextNote_Clear bit = 0,
    @TextNote nvarchar(500) = NULL,
    @PageCount_Clear bit = 0,
    @PageCount int = NULL,
    @ReadingStatus nvarchar(30) = NULL,
    @ReadingNote_Clear bit = 0,
    @ReadingNote nvarchar(500) = NULL,
    @ReadingClaimID_Clear bit = 0,
    @ReadingClaimID uniqueidentifier = NULL,
    @ReadingClaimedAt_Clear bit = 0,
    @ReadingClaimedAt datetimeoffset = NULL,
    @ReadingAttempts int = NULL,
    @Status nvarchar(20) = NULL,
    @SupersedesDocumentID_Clear bit = 0,
    @SupersedesDocumentID uniqueidentifier = NULL,
    @ConfirmedCurrentAt_Clear bit = 0,
    @ConfirmedCurrentAt datetimeoffset = NULL,
    @UploadedByUserID uniqueidentifier,
    @UploadedAt datetimeoffset
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[EvidenceDocument]
            (
                [ID],
                [SubjectID],
                [DocumentRequirementID],
                [FileID],
                [FileName],
                [ContentType],
                [SizeBytes],
                [ContentHash],
                [ExtractedText],
                [TextStatus],
                [TextNote],
                [PageCount],
                [ReadingStatus],
                [ReadingNote],
                [ReadingClaimID],
                [ReadingClaimedAt],
                [ReadingAttempts],
                [Status],
                [SupersedesDocumentID],
                [ConfirmedCurrentAt],
                [UploadedByUserID],
                [UploadedAt]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @SubjectID,
                CASE WHEN @DocumentRequirementID_Clear = 1 THEN NULL ELSE ISNULL(@DocumentRequirementID, NULL) END,
                @FileID,
                @FileName,
                @ContentType,
                @SizeBytes,
                @ContentHash,
                CASE WHEN @ExtractedText_Clear = 1 THEN NULL ELSE ISNULL(@ExtractedText, NULL) END,
                @TextStatus,
                CASE WHEN @TextNote_Clear = 1 THEN NULL ELSE ISNULL(@TextNote, NULL) END,
                CASE WHEN @PageCount_Clear = 1 THEN NULL ELSE ISNULL(@PageCount, NULL) END,
                ISNULL(@ReadingStatus, 'Pending'),
                CASE WHEN @ReadingNote_Clear = 1 THEN NULL ELSE ISNULL(@ReadingNote, NULL) END,
                CASE WHEN @ReadingClaimID_Clear = 1 THEN NULL ELSE ISNULL(@ReadingClaimID, NULL) END,
                CASE WHEN @ReadingClaimedAt_Clear = 1 THEN NULL ELSE ISNULL(@ReadingClaimedAt, NULL) END,
                ISNULL(@ReadingAttempts, 0),
                ISNULL(@Status, 'Current'),
                CASE WHEN @SupersedesDocumentID_Clear = 1 THEN NULL ELSE ISNULL(@SupersedesDocumentID, NULL) END,
                CASE WHEN @ConfirmedCurrentAt_Clear = 1 THEN NULL ELSE ISNULL(@ConfirmedCurrentAt, NULL) END,
                @UploadedByUserID,
                @UploadedAt
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[EvidenceDocument]
            (
                [SubjectID],
                [DocumentRequirementID],
                [FileID],
                [FileName],
                [ContentType],
                [SizeBytes],
                [ContentHash],
                [ExtractedText],
                [TextStatus],
                [TextNote],
                [PageCount],
                [ReadingStatus],
                [ReadingNote],
                [ReadingClaimID],
                [ReadingClaimedAt],
                [ReadingAttempts],
                [Status],
                [SupersedesDocumentID],
                [ConfirmedCurrentAt],
                [UploadedByUserID],
                [UploadedAt]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @SubjectID,
                CASE WHEN @DocumentRequirementID_Clear = 1 THEN NULL ELSE ISNULL(@DocumentRequirementID, NULL) END,
                @FileID,
                @FileName,
                @ContentType,
                @SizeBytes,
                @ContentHash,
                CASE WHEN @ExtractedText_Clear = 1 THEN NULL ELSE ISNULL(@ExtractedText, NULL) END,
                @TextStatus,
                CASE WHEN @TextNote_Clear = 1 THEN NULL ELSE ISNULL(@TextNote, NULL) END,
                CASE WHEN @PageCount_Clear = 1 THEN NULL ELSE ISNULL(@PageCount, NULL) END,
                ISNULL(@ReadingStatus, 'Pending'),
                CASE WHEN @ReadingNote_Clear = 1 THEN NULL ELSE ISNULL(@ReadingNote, NULL) END,
                CASE WHEN @ReadingClaimID_Clear = 1 THEN NULL ELSE ISNULL(@ReadingClaimID, NULL) END,
                CASE WHEN @ReadingClaimedAt_Clear = 1 THEN NULL ELSE ISNULL(@ReadingClaimedAt, NULL) END,
                ISNULL(@ReadingAttempts, 0),
                ISNULL(@Status, 'Current'),
                CASE WHEN @SupersedesDocumentID_Clear = 1 THEN NULL ELSE ISNULL(@SupersedesDocumentID, NULL) END,
                CASE WHEN @ConfirmedCurrentAt_Clear = 1 THEN NULL ELSE ISNULL(@ConfirmedCurrentAt, NULL) END,
                @UploadedByUserID,
                @UploadedAt
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwEvidenceDocuments] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateEvidenceDocument] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Evidence Documents */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateEvidenceDocument] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Evidence Documents */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Evidence Documents
-- Item: spUpdateEvidenceDocument
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR EvidenceDocument
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateEvidenceDocument]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateEvidenceDocument];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateEvidenceDocument]
    @ID uniqueidentifier,
    @SubjectID uniqueidentifier = NULL,
    @DocumentRequirementID_Clear bit = 0,
    @DocumentRequirementID uniqueidentifier = NULL,
    @FileID uniqueidentifier = NULL,
    @FileName nvarchar(255) = NULL,
    @ContentType nvarchar(150) = NULL,
    @SizeBytes bigint = NULL,
    @ContentHash char(64) = NULL,
    @ExtractedText_Clear bit = 0,
    @ExtractedText nvarchar(MAX) = NULL,
    @TextStatus nvarchar(30) = NULL,
    @TextNote_Clear bit = 0,
    @TextNote nvarchar(500) = NULL,
    @PageCount_Clear bit = 0,
    @PageCount int = NULL,
    @ReadingStatus nvarchar(30) = NULL,
    @ReadingNote_Clear bit = 0,
    @ReadingNote nvarchar(500) = NULL,
    @ReadingClaimID_Clear bit = 0,
    @ReadingClaimID uniqueidentifier = NULL,
    @ReadingClaimedAt_Clear bit = 0,
    @ReadingClaimedAt datetimeoffset = NULL,
    @ReadingAttempts int = NULL,
    @Status nvarchar(20) = NULL,
    @SupersedesDocumentID_Clear bit = 0,
    @SupersedesDocumentID uniqueidentifier = NULL,
    @ConfirmedCurrentAt_Clear bit = 0,
    @ConfirmedCurrentAt datetimeoffset = NULL,
    @UploadedByUserID uniqueidentifier = NULL,
    @UploadedAt datetimeoffset = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[EvidenceDocument]
    SET
        [SubjectID] = ISNULL(@SubjectID, [SubjectID]),
        [DocumentRequirementID] = CASE WHEN @DocumentRequirementID_Clear = 1 THEN NULL ELSE ISNULL(@DocumentRequirementID, [DocumentRequirementID]) END,
        [FileID] = ISNULL(@FileID, [FileID]),
        [FileName] = ISNULL(@FileName, [FileName]),
        [ContentType] = ISNULL(@ContentType, [ContentType]),
        [SizeBytes] = ISNULL(@SizeBytes, [SizeBytes]),
        [ContentHash] = ISNULL(@ContentHash, [ContentHash]),
        [ExtractedText] = CASE WHEN @ExtractedText_Clear = 1 THEN NULL ELSE ISNULL(@ExtractedText, [ExtractedText]) END,
        [TextStatus] = ISNULL(@TextStatus, [TextStatus]),
        [TextNote] = CASE WHEN @TextNote_Clear = 1 THEN NULL ELSE ISNULL(@TextNote, [TextNote]) END,
        [PageCount] = CASE WHEN @PageCount_Clear = 1 THEN NULL ELSE ISNULL(@PageCount, [PageCount]) END,
        [ReadingStatus] = ISNULL(@ReadingStatus, [ReadingStatus]),
        [ReadingNote] = CASE WHEN @ReadingNote_Clear = 1 THEN NULL ELSE ISNULL(@ReadingNote, [ReadingNote]) END,
        [ReadingClaimID] = CASE WHEN @ReadingClaimID_Clear = 1 THEN NULL ELSE ISNULL(@ReadingClaimID, [ReadingClaimID]) END,
        [ReadingClaimedAt] = CASE WHEN @ReadingClaimedAt_Clear = 1 THEN NULL ELSE ISNULL(@ReadingClaimedAt, [ReadingClaimedAt]) END,
        [ReadingAttempts] = ISNULL(@ReadingAttempts, [ReadingAttempts]),
        [Status] = ISNULL(@Status, [Status]),
        [SupersedesDocumentID] = CASE WHEN @SupersedesDocumentID_Clear = 1 THEN NULL ELSE ISNULL(@SupersedesDocumentID, [SupersedesDocumentID]) END,
        [ConfirmedCurrentAt] = CASE WHEN @ConfirmedCurrentAt_Clear = 1 THEN NULL ELSE ISNULL(@ConfirmedCurrentAt, [ConfirmedCurrentAt]) END,
        [UploadedByUserID] = ISNULL(@UploadedByUserID, [UploadedByUserID]),
        [UploadedAt] = ISNULL(@UploadedAt, [UploadedAt])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwEvidenceDocuments] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwEvidenceDocuments]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateEvidenceDocument] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the EvidenceDocument table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateEvidenceDocument]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateEvidenceDocument];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateEvidenceDocument
ON [${flyway:defaultSchema}].[EvidenceDocument]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[EvidenceDocument]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[EvidenceDocument] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Evidence Documents */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateEvidenceDocument] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Evidence Documents */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Evidence Documents
-- Item: spDeleteEvidenceDocument
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR EvidenceDocument
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteEvidenceDocument]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteEvidenceDocument];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteEvidenceDocument]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[EvidenceDocument]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteEvidenceDocument] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Evidence Documents */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteEvidenceDocument] TO [cdp_Developer], [cdp_Integration];

/* Index for Foreign Keys for ResponseCitation */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Citations
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key StandardResponseID in table ResponseCitation
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ResponseCitation_StandardResponseID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ResponseCitation]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ResponseCitation_StandardResponseID ON [${flyway:defaultSchema}].[ResponseCitation] ([StandardResponseID]);

-- Index for foreign key SubjectID in table ResponseCitation
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ResponseCitation_SubjectID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ResponseCitation]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ResponseCitation_SubjectID ON [${flyway:defaultSchema}].[ResponseCitation] ([SubjectID]);

-- Index for foreign key EvidenceDocumentID in table ResponseCitation
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ResponseCitation_EvidenceDocumentID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ResponseCitation]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ResponseCitation_EvidenceDocumentID ON [${flyway:defaultSchema}].[ResponseCitation] ([EvidenceDocumentID]);

-- Index for foreign key ExtractionID in table ResponseCitation
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ResponseCitation_ExtractionID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ResponseCitation]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ResponseCitation_ExtractionID ON [${flyway:defaultSchema}].[ResponseCitation] ([ExtractionID]);

/* Index for Foreign Keys for ResponseSource */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Sources
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key StandardID in table ResponseSource
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ResponseSource_StandardID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ResponseSource]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ResponseSource_StandardID ON [${flyway:defaultSchema}].[ResponseSource] ([StandardID]);

-- Index for foreign key ProgramVersionID in table ResponseSource
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ResponseSource_ProgramVersionID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ResponseSource]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ResponseSource_ProgramVersionID ON [${flyway:defaultSchema}].[ResponseSource] ([ProgramVersionID]);

-- Index for foreign key DocumentRequirementID in table ResponseSource
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ResponseSource_DocumentRequirementID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ResponseSource]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ResponseSource_DocumentRequirementID ON [${flyway:defaultSchema}].[ResponseSource] ([DocumentRequirementID]);

/* SQL text to update entity field related entity name field map for entity field ID 2FFC677E-6100-41E9-9F48-3A34253AF3DD */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='2FFC677E-6100-41E9-9F48-3A34253AF3DD', @RelatedEntityNameFieldMap='DocumentRequirement';

/* Index for Foreign Keys for StandardResponse */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standard Responses
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key ApplicationID in table StandardResponse
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_StandardResponse_ApplicationID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[StandardResponse]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_StandardResponse_ApplicationID ON [${flyway:defaultSchema}].[StandardResponse] ([ApplicationID]);

-- Index for foreign key StandardID in table StandardResponse
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_StandardResponse_StandardID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[StandardResponse]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_StandardResponse_StandardID ON [${flyway:defaultSchema}].[StandardResponse] ([StandardID]);

-- Index for foreign key SubjectID in table StandardResponse
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_StandardResponse_SubjectID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[StandardResponse]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_StandardResponse_SubjectID ON [${flyway:defaultSchema}].[StandardResponse] ([SubjectID]);

-- Index for foreign key LastEditedByUserID in table StandardResponse
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_StandardResponse_LastEditedByUserID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[StandardResponse]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_StandardResponse_LastEditedByUserID ON [${flyway:defaultSchema}].[StandardResponse] ([LastEditedByUserID]);

-- Index for foreign key ConfirmedByUserID in table StandardResponse
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_StandardResponse_ConfirmedByUserID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[StandardResponse]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_StandardResponse_ConfirmedByUserID ON [${flyway:defaultSchema}].[StandardResponse] ([ConfirmedByUserID]);

/* SQL text to update entity field related entity name field map for entity field ID BC15E8AD-90A3-429B-B75F-2A0B734D54F4 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='BC15E8AD-90A3-429B-B75F-2A0B734D54F4', @RelatedEntityNameFieldMap='LastEditedByUser';

/* Index for Foreign Keys for SubjectContact */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subject Contacts
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key SubjectID in table SubjectContact
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_SubjectContact_SubjectID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[SubjectContact]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_SubjectContact_SubjectID ON [${flyway:defaultSchema}].[SubjectContact] ([SubjectID]);

-- Index for foreign key UserID in table SubjectContact
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_SubjectContact_UserID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[SubjectContact]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_SubjectContact_UserID ON [${flyway:defaultSchema}].[SubjectContact] ([UserID]);

-- Index for foreign key InvitedByUserID in table SubjectContact
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_SubjectContact_InvitedByUserID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[SubjectContact]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_SubjectContact_InvitedByUserID ON [${flyway:defaultSchema}].[SubjectContact] ([InvitedByUserID]);

/* SQL text to update entity field related entity name field map for entity field ID D6BA3ECE-F655-44B8-B7B6-AA35283BFB83 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='D6BA3ECE-F655-44B8-B7B6-AA35283BFB83', @RelatedEntityNameFieldMap='User';

/* Base View SQL for MJ_BizApps_Credentialing: Response Citations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Citations
-- Item: vwResponseCitations
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Response Citations
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  ResponseCitation
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwResponseCitations]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwResponseCitations];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwResponseCitations]
AS
SELECT
    r.*
FROM
    [${flyway:defaultSchema}].[ResponseCitation] AS r
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwResponseCitations] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Response Citations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Citations
-- Item: Permissions for vwResponseCitations
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwResponseCitations] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Response Citations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Citations
-- Item: spCreateResponseCitation
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR ResponseCitation
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateResponseCitation]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateResponseCitation];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateResponseCitation]
    @ID uniqueidentifier = NULL,
    @StandardResponseID uniqueidentifier,
    @SubjectID uniqueidentifier,
    @EvidenceDocumentID uniqueidentifier,
    @ExtractionID_Clear bit = 0,
    @ExtractionID uniqueidentifier = NULL,
    @SourceLabel nvarchar(500),
    @PageReference_Clear bit = 0,
    @PageReference nvarchar(50) = NULL,
    @Excerpt nvarchar(MAX),
    @StartOffset int,
    @EndOffset int
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[ResponseCitation]
            (
                [ID],
                [StandardResponseID],
                [SubjectID],
                [EvidenceDocumentID],
                [ExtractionID],
                [SourceLabel],
                [PageReference],
                [Excerpt],
                [StartOffset],
                [EndOffset]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @StandardResponseID,
                @SubjectID,
                @EvidenceDocumentID,
                CASE WHEN @ExtractionID_Clear = 1 THEN NULL ELSE ISNULL(@ExtractionID, NULL) END,
                @SourceLabel,
                CASE WHEN @PageReference_Clear = 1 THEN NULL ELSE ISNULL(@PageReference, NULL) END,
                @Excerpt,
                @StartOffset,
                @EndOffset
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[ResponseCitation]
            (
                [StandardResponseID],
                [SubjectID],
                [EvidenceDocumentID],
                [ExtractionID],
                [SourceLabel],
                [PageReference],
                [Excerpt],
                [StartOffset],
                [EndOffset]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @StandardResponseID,
                @SubjectID,
                @EvidenceDocumentID,
                CASE WHEN @ExtractionID_Clear = 1 THEN NULL ELSE ISNULL(@ExtractionID, NULL) END,
                @SourceLabel,
                CASE WHEN @PageReference_Clear = 1 THEN NULL ELSE ISNULL(@PageReference, NULL) END,
                @Excerpt,
                @StartOffset,
                @EndOffset
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwResponseCitations] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateResponseCitation] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Response Citations */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateResponseCitation] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Response Citations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Citations
-- Item: spUpdateResponseCitation
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR ResponseCitation
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateResponseCitation]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateResponseCitation];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateResponseCitation]
    @ID uniqueidentifier,
    @StandardResponseID uniqueidentifier = NULL,
    @SubjectID uniqueidentifier = NULL,
    @EvidenceDocumentID uniqueidentifier = NULL,
    @ExtractionID_Clear bit = 0,
    @ExtractionID uniqueidentifier = NULL,
    @SourceLabel nvarchar(500) = NULL,
    @PageReference_Clear bit = 0,
    @PageReference nvarchar(50) = NULL,
    @Excerpt nvarchar(MAX) = NULL,
    @StartOffset int = NULL,
    @EndOffset int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[ResponseCitation]
    SET
        [StandardResponseID] = ISNULL(@StandardResponseID, [StandardResponseID]),
        [SubjectID] = ISNULL(@SubjectID, [SubjectID]),
        [EvidenceDocumentID] = ISNULL(@EvidenceDocumentID, [EvidenceDocumentID]),
        [ExtractionID] = CASE WHEN @ExtractionID_Clear = 1 THEN NULL ELSE ISNULL(@ExtractionID, [ExtractionID]) END,
        [SourceLabel] = ISNULL(@SourceLabel, [SourceLabel]),
        [PageReference] = CASE WHEN @PageReference_Clear = 1 THEN NULL ELSE ISNULL(@PageReference, [PageReference]) END,
        [Excerpt] = ISNULL(@Excerpt, [Excerpt]),
        [StartOffset] = ISNULL(@StartOffset, [StartOffset]),
        [EndOffset] = ISNULL(@EndOffset, [EndOffset])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwResponseCitations] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwResponseCitations]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateResponseCitation] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the ResponseCitation table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateResponseCitation]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateResponseCitation];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateResponseCitation
ON [${flyway:defaultSchema}].[ResponseCitation]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[ResponseCitation]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[ResponseCitation] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Response Citations */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateResponseCitation] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Response Citations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Citations
-- Item: spDeleteResponseCitation
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR ResponseCitation
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteResponseCitation]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteResponseCitation];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteResponseCitation]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[ResponseCitation]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteResponseCitation] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Response Citations */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteResponseCitation] TO [cdp_Developer], [cdp_Integration];

/* Base View SQL for MJ_BizApps_Credentialing: Response Sources */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Sources
-- Item: vwResponseSources
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Response Sources
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  ResponseSource
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwResponseSources]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwResponseSources];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwResponseSources]
AS
SELECT
    r.*,
    mjBizAppsCredentialingDocumentRequirement_DocumentRequirementID.[Name] AS [DocumentRequirement]
FROM
    [${flyway:defaultSchema}].[ResponseSource] AS r
LEFT OUTER JOIN
    [${flyway:defaultSchema}].[DocumentRequirement] AS mjBizAppsCredentialingDocumentRequirement_DocumentRequirementID
  ON
    [r].[DocumentRequirementID] = mjBizAppsCredentialingDocumentRequirement_DocumentRequirementID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwResponseSources] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Response Sources */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Sources
-- Item: Permissions for vwResponseSources
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwResponseSources] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Response Sources */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Sources
-- Item: spCreateResponseSource
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR ResponseSource
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateResponseSource]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateResponseSource];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateResponseSource]
    @ID uniqueidentifier = NULL,
    @StandardID uniqueidentifier,
    @ProgramVersionID uniqueidentifier,
    @SourceType nvarchar(30),
    @DocumentRequirementID_Clear bit = 0,
    @DocumentRequirementID uniqueidentifier = NULL,
    @Mode nvarchar(20) = NULL,
    @Rank int,
    @Sequence int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[ResponseSource]
            (
                [ID],
                [StandardID],
                [ProgramVersionID],
                [SourceType],
                [DocumentRequirementID],
                [Mode],
                [Rank],
                [Sequence]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @StandardID,
                @ProgramVersionID,
                @SourceType,
                CASE WHEN @DocumentRequirementID_Clear = 1 THEN NULL ELSE ISNULL(@DocumentRequirementID, NULL) END,
                ISNULL(@Mode, 'Prefill Only'),
                @Rank,
                ISNULL(@Sequence, 0)
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[ResponseSource]
            (
                [StandardID],
                [ProgramVersionID],
                [SourceType],
                [DocumentRequirementID],
                [Mode],
                [Rank],
                [Sequence]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @StandardID,
                @ProgramVersionID,
                @SourceType,
                CASE WHEN @DocumentRequirementID_Clear = 1 THEN NULL ELSE ISNULL(@DocumentRequirementID, NULL) END,
                ISNULL(@Mode, 'Prefill Only'),
                @Rank,
                ISNULL(@Sequence, 0)
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwResponseSources] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateResponseSource] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Response Sources */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateResponseSource] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Response Sources */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Sources
-- Item: spUpdateResponseSource
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR ResponseSource
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateResponseSource]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateResponseSource];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateResponseSource]
    @ID uniqueidentifier,
    @StandardID uniqueidentifier = NULL,
    @ProgramVersionID uniqueidentifier = NULL,
    @SourceType nvarchar(30) = NULL,
    @DocumentRequirementID_Clear bit = 0,
    @DocumentRequirementID uniqueidentifier = NULL,
    @Mode nvarchar(20) = NULL,
    @Rank int = NULL,
    @Sequence int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[ResponseSource]
    SET
        [StandardID] = ISNULL(@StandardID, [StandardID]),
        [ProgramVersionID] = ISNULL(@ProgramVersionID, [ProgramVersionID]),
        [SourceType] = ISNULL(@SourceType, [SourceType]),
        [DocumentRequirementID] = CASE WHEN @DocumentRequirementID_Clear = 1 THEN NULL ELSE ISNULL(@DocumentRequirementID, [DocumentRequirementID]) END,
        [Mode] = ISNULL(@Mode, [Mode]),
        [Rank] = ISNULL(@Rank, [Rank]),
        [Sequence] = ISNULL(@Sequence, [Sequence])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwResponseSources] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwResponseSources]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateResponseSource] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the ResponseSource table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateResponseSource]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateResponseSource];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateResponseSource
ON [${flyway:defaultSchema}].[ResponseSource]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[ResponseSource]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[ResponseSource] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Response Sources */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateResponseSource] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Response Sources */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Response Sources
-- Item: spDeleteResponseSource
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR ResponseSource
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteResponseSource]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteResponseSource];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteResponseSource]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[ResponseSource]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteResponseSource] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Response Sources */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteResponseSource] TO [cdp_Developer], [cdp_Integration];

/* SQL text to update entity field related entity name field map for entity field ID 8AA9EF9C-2D0F-45B9-8609-BF549B77357B */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='8AA9EF9C-2D0F-45B9-8609-BF549B77357B', @RelatedEntityNameFieldMap='ConfirmedByUser';

/* SQL text to update entity field related entity name field map for entity field ID B9821520-D8C4-4BF2-B056-D240F59FF88A */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='B9821520-D8C4-4BF2-B056-D240F59FF88A', @RelatedEntityNameFieldMap='InvitedByUser';

/* Base View SQL for MJ_BizApps_Credentialing: Subject Contacts */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subject Contacts
-- Item: vwSubjectContacts
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Subject Contacts
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  SubjectContact
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwSubjectContacts]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwSubjectContacts];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwSubjectContacts]
AS
SELECT
    s.*,
    MJUser_UserID.[Name] AS [User],
    MJUser_InvitedByUserID.[Name] AS [InvitedByUser]
FROM
    [${flyway:defaultSchema}].[SubjectContact] AS s
INNER JOIN
    [${mjSchema}].[User] AS MJUser_UserID
  ON
    [s].[UserID] = MJUser_UserID.[ID]
INNER JOIN
    [${mjSchema}].[User] AS MJUser_InvitedByUserID
  ON
    [s].[InvitedByUserID] = MJUser_InvitedByUserID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwSubjectContacts] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Subject Contacts */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subject Contacts
-- Item: Permissions for vwSubjectContacts
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwSubjectContacts] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Subject Contacts */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subject Contacts
-- Item: spCreateSubjectContact
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR SubjectContact
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateSubjectContact]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateSubjectContact];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateSubjectContact]
    @ID uniqueidentifier = NULL,
    @SubjectID uniqueidentifier,
    @UserID uniqueidentifier,
    @ContactRole nvarchar(20) = NULL,
    @InvitedByUserID uniqueidentifier,
    @LastInvitedAt datetimeoffset
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[SubjectContact]
            (
                [ID],
                [SubjectID],
                [UserID],
                [ContactRole],
                [InvitedByUserID],
                [LastInvitedAt]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @SubjectID,
                @UserID,
                ISNULL(@ContactRole, 'Primary'),
                @InvitedByUserID,
                @LastInvitedAt
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[SubjectContact]
            (
                [SubjectID],
                [UserID],
                [ContactRole],
                [InvitedByUserID],
                [LastInvitedAt]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @SubjectID,
                @UserID,
                ISNULL(@ContactRole, 'Primary'),
                @InvitedByUserID,
                @LastInvitedAt
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwSubjectContacts] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateSubjectContact] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Subject Contacts */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateSubjectContact] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Subject Contacts */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subject Contacts
-- Item: spUpdateSubjectContact
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR SubjectContact
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateSubjectContact]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateSubjectContact];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateSubjectContact]
    @ID uniqueidentifier,
    @SubjectID uniqueidentifier = NULL,
    @UserID uniqueidentifier = NULL,
    @ContactRole nvarchar(20) = NULL,
    @InvitedByUserID uniqueidentifier = NULL,
    @LastInvitedAt datetimeoffset = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[SubjectContact]
    SET
        [SubjectID] = ISNULL(@SubjectID, [SubjectID]),
        [UserID] = ISNULL(@UserID, [UserID]),
        [ContactRole] = ISNULL(@ContactRole, [ContactRole]),
        [InvitedByUserID] = ISNULL(@InvitedByUserID, [InvitedByUserID]),
        [LastInvitedAt] = ISNULL(@LastInvitedAt, [LastInvitedAt])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwSubjectContacts] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwSubjectContacts]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateSubjectContact] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the SubjectContact table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateSubjectContact]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateSubjectContact];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateSubjectContact
ON [${flyway:defaultSchema}].[SubjectContact]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[SubjectContact]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[SubjectContact] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Subject Contacts */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateSubjectContact] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Subject Contacts */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subject Contacts
-- Item: spDeleteSubjectContact
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR SubjectContact
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteSubjectContact]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteSubjectContact];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteSubjectContact]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[SubjectContact]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteSubjectContact] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Subject Contacts */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteSubjectContact] TO [cdp_Developer], [cdp_Integration];

/* Base View SQL for MJ_BizApps_Credentialing: Standard Responses */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standard Responses
-- Item: vwStandardResponses
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Standard Responses
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  StandardResponse
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwStandardResponses]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwStandardResponses];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwStandardResponses]
AS
SELECT
    s.*,
    MJUser_LastEditedByUserID.[Name] AS [LastEditedByUser],
    MJUser_ConfirmedByUserID.[Name] AS [ConfirmedByUser]
FROM
    [${flyway:defaultSchema}].[StandardResponse] AS s
LEFT OUTER JOIN
    [${mjSchema}].[User] AS MJUser_LastEditedByUserID
  ON
    [s].[LastEditedByUserID] = MJUser_LastEditedByUserID.[ID]
LEFT OUTER JOIN
    [${mjSchema}].[User] AS MJUser_ConfirmedByUserID
  ON
    [s].[ConfirmedByUserID] = MJUser_ConfirmedByUserID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwStandardResponses] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Standard Responses */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standard Responses
-- Item: Permissions for vwStandardResponses
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwStandardResponses] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Standard Responses */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standard Responses
-- Item: spCreateStandardResponse
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR StandardResponse
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateStandardResponse]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateStandardResponse];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateStandardResponse]
    @ID uniqueidentifier = NULL,
    @ApplicationID uniqueidentifier,
    @StandardID uniqueidentifier,
    @SubjectID uniqueidentifier,
    @ResponseText_Clear bit = 0,
    @ResponseText nvarchar(MAX) = NULL,
    @SelfAssessment_Clear bit = 0,
    @SelfAssessment nvarchar(20) = NULL,
    @Status nvarchar(20) = NULL,
    @AuthorType nvarchar(10) = NULL,
    @LastEditedByUserID_Clear bit = 0,
    @LastEditedByUserID uniqueidentifier = NULL,
    @ConfirmedByUserID_Clear bit = 0,
    @ConfirmedByUserID uniqueidentifier = NULL,
    @ConfirmedAt_Clear bit = 0,
    @ConfirmedAt datetimeoffset = NULL,
    @SourceType_Clear bit = 0,
    @SourceType nvarchar(30) = NULL,
    @SourceLabel_Clear bit = 0,
    @SourceLabel nvarchar(500) = NULL,
    @SourceReference_Clear bit = 0,
    @SourceReference nvarchar(100) = NULL,
    @SourceRetrievedAt_Clear bit = 0,
    @SourceRetrievedAt datetimeoffset = NULL,
    @SourceRawValue_Clear bit = 0,
    @SourceRawValue nvarchar(MAX) = NULL,
    @IsStale bit = NULL,
    @ReopenReason_Clear bit = 0,
    @ReopenReason nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[StandardResponse]
            (
                [ID],
                [ApplicationID],
                [StandardID],
                [SubjectID],
                [ResponseText],
                [SelfAssessment],
                [Status],
                [AuthorType],
                [LastEditedByUserID],
                [ConfirmedByUserID],
                [ConfirmedAt],
                [SourceType],
                [SourceLabel],
                [SourceReference],
                [SourceRetrievedAt],
                [SourceRawValue],
                [IsStale],
                [ReopenReason]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @ApplicationID,
                @StandardID,
                @SubjectID,
                CASE WHEN @ResponseText_Clear = 1 THEN NULL ELSE ISNULL(@ResponseText, NULL) END,
                CASE WHEN @SelfAssessment_Clear = 1 THEN NULL ELSE ISNULL(@SelfAssessment, NULL) END,
                ISNULL(@Status, 'Empty'),
                ISNULL(@AuthorType, 'Human'),
                CASE WHEN @LastEditedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@LastEditedByUserID, NULL) END,
                CASE WHEN @ConfirmedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@ConfirmedByUserID, NULL) END,
                CASE WHEN @ConfirmedAt_Clear = 1 THEN NULL ELSE ISNULL(@ConfirmedAt, NULL) END,
                CASE WHEN @SourceType_Clear = 1 THEN NULL ELSE ISNULL(@SourceType, NULL) END,
                CASE WHEN @SourceLabel_Clear = 1 THEN NULL ELSE ISNULL(@SourceLabel, NULL) END,
                CASE WHEN @SourceReference_Clear = 1 THEN NULL ELSE ISNULL(@SourceReference, NULL) END,
                CASE WHEN @SourceRetrievedAt_Clear = 1 THEN NULL ELSE ISNULL(@SourceRetrievedAt, NULL) END,
                CASE WHEN @SourceRawValue_Clear = 1 THEN NULL ELSE ISNULL(@SourceRawValue, NULL) END,
                ISNULL(@IsStale, 0),
                CASE WHEN @ReopenReason_Clear = 1 THEN NULL ELSE ISNULL(@ReopenReason, NULL) END
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[StandardResponse]
            (
                [ApplicationID],
                [StandardID],
                [SubjectID],
                [ResponseText],
                [SelfAssessment],
                [Status],
                [AuthorType],
                [LastEditedByUserID],
                [ConfirmedByUserID],
                [ConfirmedAt],
                [SourceType],
                [SourceLabel],
                [SourceReference],
                [SourceRetrievedAt],
                [SourceRawValue],
                [IsStale],
                [ReopenReason]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ApplicationID,
                @StandardID,
                @SubjectID,
                CASE WHEN @ResponseText_Clear = 1 THEN NULL ELSE ISNULL(@ResponseText, NULL) END,
                CASE WHEN @SelfAssessment_Clear = 1 THEN NULL ELSE ISNULL(@SelfAssessment, NULL) END,
                ISNULL(@Status, 'Empty'),
                ISNULL(@AuthorType, 'Human'),
                CASE WHEN @LastEditedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@LastEditedByUserID, NULL) END,
                CASE WHEN @ConfirmedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@ConfirmedByUserID, NULL) END,
                CASE WHEN @ConfirmedAt_Clear = 1 THEN NULL ELSE ISNULL(@ConfirmedAt, NULL) END,
                CASE WHEN @SourceType_Clear = 1 THEN NULL ELSE ISNULL(@SourceType, NULL) END,
                CASE WHEN @SourceLabel_Clear = 1 THEN NULL ELSE ISNULL(@SourceLabel, NULL) END,
                CASE WHEN @SourceReference_Clear = 1 THEN NULL ELSE ISNULL(@SourceReference, NULL) END,
                CASE WHEN @SourceRetrievedAt_Clear = 1 THEN NULL ELSE ISNULL(@SourceRetrievedAt, NULL) END,
                CASE WHEN @SourceRawValue_Clear = 1 THEN NULL ELSE ISNULL(@SourceRawValue, NULL) END,
                ISNULL(@IsStale, 0),
                CASE WHEN @ReopenReason_Clear = 1 THEN NULL ELSE ISNULL(@ReopenReason, NULL) END
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwStandardResponses] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateStandardResponse] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Standard Responses */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateStandardResponse] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Standard Responses */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standard Responses
-- Item: spUpdateStandardResponse
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR StandardResponse
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateStandardResponse]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateStandardResponse];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateStandardResponse]
    @ID uniqueidentifier,
    @ApplicationID uniqueidentifier = NULL,
    @StandardID uniqueidentifier = NULL,
    @SubjectID uniqueidentifier = NULL,
    @ResponseText_Clear bit = 0,
    @ResponseText nvarchar(MAX) = NULL,
    @SelfAssessment_Clear bit = 0,
    @SelfAssessment nvarchar(20) = NULL,
    @Status nvarchar(20) = NULL,
    @AuthorType nvarchar(10) = NULL,
    @LastEditedByUserID_Clear bit = 0,
    @LastEditedByUserID uniqueidentifier = NULL,
    @ConfirmedByUserID_Clear bit = 0,
    @ConfirmedByUserID uniqueidentifier = NULL,
    @ConfirmedAt_Clear bit = 0,
    @ConfirmedAt datetimeoffset = NULL,
    @SourceType_Clear bit = 0,
    @SourceType nvarchar(30) = NULL,
    @SourceLabel_Clear bit = 0,
    @SourceLabel nvarchar(500) = NULL,
    @SourceReference_Clear bit = 0,
    @SourceReference nvarchar(100) = NULL,
    @SourceRetrievedAt_Clear bit = 0,
    @SourceRetrievedAt datetimeoffset = NULL,
    @SourceRawValue_Clear bit = 0,
    @SourceRawValue nvarchar(MAX) = NULL,
    @IsStale bit = NULL,
    @ReopenReason_Clear bit = 0,
    @ReopenReason nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[StandardResponse]
    SET
        [ApplicationID] = ISNULL(@ApplicationID, [ApplicationID]),
        [StandardID] = ISNULL(@StandardID, [StandardID]),
        [SubjectID] = ISNULL(@SubjectID, [SubjectID]),
        [ResponseText] = CASE WHEN @ResponseText_Clear = 1 THEN NULL ELSE ISNULL(@ResponseText, [ResponseText]) END,
        [SelfAssessment] = CASE WHEN @SelfAssessment_Clear = 1 THEN NULL ELSE ISNULL(@SelfAssessment, [SelfAssessment]) END,
        [Status] = ISNULL(@Status, [Status]),
        [AuthorType] = ISNULL(@AuthorType, [AuthorType]),
        [LastEditedByUserID] = CASE WHEN @LastEditedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@LastEditedByUserID, [LastEditedByUserID]) END,
        [ConfirmedByUserID] = CASE WHEN @ConfirmedByUserID_Clear = 1 THEN NULL ELSE ISNULL(@ConfirmedByUserID, [ConfirmedByUserID]) END,
        [ConfirmedAt] = CASE WHEN @ConfirmedAt_Clear = 1 THEN NULL ELSE ISNULL(@ConfirmedAt, [ConfirmedAt]) END,
        [SourceType] = CASE WHEN @SourceType_Clear = 1 THEN NULL ELSE ISNULL(@SourceType, [SourceType]) END,
        [SourceLabel] = CASE WHEN @SourceLabel_Clear = 1 THEN NULL ELSE ISNULL(@SourceLabel, [SourceLabel]) END,
        [SourceReference] = CASE WHEN @SourceReference_Clear = 1 THEN NULL ELSE ISNULL(@SourceReference, [SourceReference]) END,
        [SourceRetrievedAt] = CASE WHEN @SourceRetrievedAt_Clear = 1 THEN NULL ELSE ISNULL(@SourceRetrievedAt, [SourceRetrievedAt]) END,
        [SourceRawValue] = CASE WHEN @SourceRawValue_Clear = 1 THEN NULL ELSE ISNULL(@SourceRawValue, [SourceRawValue]) END,
        [IsStale] = ISNULL(@IsStale, [IsStale]),
        [ReopenReason] = CASE WHEN @ReopenReason_Clear = 1 THEN NULL ELSE ISNULL(@ReopenReason, [ReopenReason]) END
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwStandardResponses] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwStandardResponses]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateStandardResponse] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the StandardResponse table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateStandardResponse]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateStandardResponse];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateStandardResponse
ON [${flyway:defaultSchema}].[StandardResponse]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[StandardResponse]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[StandardResponse] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Standard Responses */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateStandardResponse] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Standard Responses */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standard Responses
-- Item: spDeleteStandardResponse
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR StandardResponse
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteStandardResponse]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteStandardResponse];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteStandardResponse]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[StandardResponse]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteStandardResponse] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Standard Responses */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteStandardResponse] TO [cdp_Developer], [cdp_Integration];

/* Index for Foreign Keys for Subject */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subjects
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key AccreditingOrganizationID in table Subject
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Subject_AccreditingOrganizationID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Subject]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Subject_AccreditingOrganizationID ON [${flyway:defaultSchema}].[Subject] ([AccreditingOrganizationID]);

-- Index for foreign key PartyEntityID in table Subject
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Subject_PartyEntityID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Subject]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Subject_PartyEntityID ON [${flyway:defaultSchema}].[Subject] ([PartyEntityID]);

/* SQL text to update entity field related entity name field map for entity field ID B3848598-6B34-448F-A964-F61E72CB8624 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='B3848598-6B34-448F-A964-F61E72CB8624', @RelatedEntityNameFieldMap='AccreditingOrganization';

/* SQL text to update entity field related entity name field map for entity field ID 8D1A798C-9986-4FFE-B27C-18FBCA427C4C */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='8D1A798C-9986-4FFE-B27C-18FBCA427C4C', @RelatedEntityNameFieldMap='PartyEntity';

/* Base View SQL for MJ_BizApps_Credentialing: Subjects */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subjects
-- Item: vwSubjects
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Subjects
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  Subject
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwSubjects]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwSubjects];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwSubjects]
AS
SELECT
    s.*,
    mjBizAppsCredentialingAccreditingOrganization_AccreditingOrganizationID.[Name] AS [AccreditingOrganization],
    MJEntity_PartyEntityID.[Name] AS [PartyEntity]
FROM
    [${flyway:defaultSchema}].[Subject] AS s
INNER JOIN
    [${flyway:defaultSchema}].[AccreditingOrganization] AS mjBizAppsCredentialingAccreditingOrganization_AccreditingOrganizationID
  ON
    [s].[AccreditingOrganizationID] = mjBizAppsCredentialingAccreditingOrganization_AccreditingOrganizationID.[ID]
LEFT OUTER JOIN
    [${mjSchema}].[Entity] AS MJEntity_PartyEntityID
  ON
    [s].[PartyEntityID] = MJEntity_PartyEntityID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwSubjects] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Subjects */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subjects
-- Item: Permissions for vwSubjects
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwSubjects] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Subjects */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subjects
-- Item: spCreateSubject
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR Subject
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateSubject]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateSubject];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateSubject]
    @ID uniqueidentifier = NULL,
    @AccreditingOrganizationID uniqueidentifier,
    @SubjectType nvarchar(20),
    @DisplayName nvarchar(255),
    @PrimaryEmail nvarchar(255),
    @Status nvarchar(20) = NULL,
    @PartyEntityID_Clear bit = 0,
    @PartyEntityID uniqueidentifier = NULL,
    @PartyRecordID_Clear bit = 0,
    @PartyRecordID nvarchar(450) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[Subject]
            (
                [ID],
                [AccreditingOrganizationID],
                [SubjectType],
                [DisplayName],
                [PrimaryEmail],
                [Status],
                [PartyEntityID],
                [PartyRecordID]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @AccreditingOrganizationID,
                @SubjectType,
                @DisplayName,
                @PrimaryEmail,
                ISNULL(@Status, 'Active'),
                CASE WHEN @PartyEntityID_Clear = 1 THEN NULL ELSE ISNULL(@PartyEntityID, NULL) END,
                CASE WHEN @PartyRecordID_Clear = 1 THEN NULL ELSE ISNULL(@PartyRecordID, NULL) END
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[Subject]
            (
                [AccreditingOrganizationID],
                [SubjectType],
                [DisplayName],
                [PrimaryEmail],
                [Status],
                [PartyEntityID],
                [PartyRecordID]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @AccreditingOrganizationID,
                @SubjectType,
                @DisplayName,
                @PrimaryEmail,
                ISNULL(@Status, 'Active'),
                CASE WHEN @PartyEntityID_Clear = 1 THEN NULL ELSE ISNULL(@PartyEntityID, NULL) END,
                CASE WHEN @PartyRecordID_Clear = 1 THEN NULL ELSE ISNULL(@PartyRecordID, NULL) END
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwSubjects] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateSubject] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Subjects */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateSubject] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Subjects */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subjects
-- Item: spUpdateSubject
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR Subject
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateSubject]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateSubject];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateSubject]
    @ID uniqueidentifier,
    @AccreditingOrganizationID uniqueidentifier = NULL,
    @SubjectType nvarchar(20) = NULL,
    @DisplayName nvarchar(255) = NULL,
    @PrimaryEmail nvarchar(255) = NULL,
    @Status nvarchar(20) = NULL,
    @PartyEntityID_Clear bit = 0,
    @PartyEntityID uniqueidentifier = NULL,
    @PartyRecordID_Clear bit = 0,
    @PartyRecordID nvarchar(450) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Subject]
    SET
        [AccreditingOrganizationID] = ISNULL(@AccreditingOrganizationID, [AccreditingOrganizationID]),
        [SubjectType] = ISNULL(@SubjectType, [SubjectType]),
        [DisplayName] = ISNULL(@DisplayName, [DisplayName]),
        [PrimaryEmail] = ISNULL(@PrimaryEmail, [PrimaryEmail]),
        [Status] = ISNULL(@Status, [Status]),
        [PartyEntityID] = CASE WHEN @PartyEntityID_Clear = 1 THEN NULL ELSE ISNULL(@PartyEntityID, [PartyEntityID]) END,
        [PartyRecordID] = CASE WHEN @PartyRecordID_Clear = 1 THEN NULL ELSE ISNULL(@PartyRecordID, [PartyRecordID]) END
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwSubjects] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwSubjects]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateSubject] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the Subject table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateSubject]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateSubject];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateSubject
ON [${flyway:defaultSchema}].[Subject]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Subject]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[Subject] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Subjects */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateSubject] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Subjects */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Subjects
-- Item: spDeleteSubject
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR Subject
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteSubject]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteSubject];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteSubject]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[Subject]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteSubject] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Subjects */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteSubject] TO [cdp_Developer], [cdp_Integration];

/* SQL text to insert 16 new entity field(s) */

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '7e04cd47-6c97-414b-8b9f-29286a7069a0' OR (EntityID = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND Name = 'DocumentRequirement')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '7e04cd47-6c97-414b-8b9f-29286a7069a0',
            '504B3D47-E3BD-417B-B67B-38A041DEB700', -- Entity: MJ_BizApps_Credentialing: Document Attestations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700'),
            'DocumentRequirement',
            'Document Requirement',
            NULL,
            'nvarchar',
            510,
            0,
            0,
            0,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'b6c01a99-1cc8-45f2-844c-0f661f94b5cb' OR (EntityID = '504B3D47-E3BD-417B-B67B-38A041DEB700' AND Name = 'AttestedByUser')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'b6c01a99-1cc8-45f2-844c-0f661f94b5cb',
            '504B3D47-E3BD-417B-B67B-38A041DEB700', -- Entity: MJ_BizApps_Credentialing: Document Attestations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '504B3D47-E3BD-417B-B67B-38A041DEB700'),
            'AttestedByUser',
            'Attested By User',
            NULL,
            'nvarchar',
            200,
            0,
            0,
            0,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c47bcf77-fd67-405c-8968-806104fdc777' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'LastEditedByUser')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'c47bcf77-fd67-405c-8968-806104fdc777',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'LastEditedByUser',
            'Last Edited By User',
            NULL,
            'nvarchar',
            200,
            0,
            0,
            1,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1ac6128a-dcf4-479e-b18c-18df06a15b2f' OR (EntityID = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6' AND Name = 'ConfirmedByUser')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '1ac6128a-dcf4-479e-b18c-18df06a15b2f',
            'A0473C42-29DC-4C4D-BC7F-438C5732FAD6', -- Entity: MJ_BizApps_Credentialing: Standard Responses
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'A0473C42-29DC-4C4D-BC7F-438C5732FAD6'),
            'ConfirmedByUser',
            'Confirmed By User',
            NULL,
            'nvarchar',
            200,
            0,
            0,
            1,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'a954d8a7-2241-4f96-99f3-d3ab32c28055' OR (EntityID = '52713E19-8B12-4595-86A6-497B68738CB1' AND Name = 'User')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'a954d8a7-2241-4f96-99f3-d3ab32c28055',
            '52713E19-8B12-4595-86A6-497B68738CB1', -- Entity: MJ_BizApps_Credentialing: Subject Contacts
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '52713E19-8B12-4595-86A6-497B68738CB1'),
            'User',
            'User',
            NULL,
            'nvarchar',
            200,
            0,
            0,
            0,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'a7380883-e059-4081-8373-128989c63c15' OR (EntityID = '52713E19-8B12-4595-86A6-497B68738CB1' AND Name = 'InvitedByUser')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'a7380883-e059-4081-8373-128989c63c15',
            '52713E19-8B12-4595-86A6-497B68738CB1', -- Entity: MJ_BizApps_Credentialing: Subject Contacts
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '52713E19-8B12-4595-86A6-497B68738CB1'),
            'InvitedByUser',
            'Invited By User',
            NULL,
            'nvarchar',
            200,
            0,
            0,
            0,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f5c9b82e-5b85-4bad-bdec-fae31f85f5e1' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'SubmittedByUser')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'f5c9b82e-5b85-4bad-bdec-fae31f85f5e1',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'SubmittedByUser',
            'Submitted By User',
            NULL,
            'nvarchar',
            200,
            0,
            0,
            1,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e09e2deb-7929-46f7-aecc-268620f1d2cb' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'AttestedByUser')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'e09e2deb-7929-46f7-aecc-268620f1d2cb',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'AttestedByUser',
            'Attested By User',
            NULL,
            'nvarchar',
            200,
            0,
            0,
            1,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5b58f456-486e-4f1c-ba14-887250badbf0' OR (EntityID = '32C23034-191B-412A-98DA-837F13525AAA' AND Name = 'WithdrawnByUser')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '5b58f456-486e-4f1c-ba14-887250badbf0',
            '32C23034-191B-412A-98DA-837F13525AAA', -- Entity: MJ_BizApps_Credentialing: Applications
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '32C23034-191B-412A-98DA-837F13525AAA'),
            'WithdrawnByUser',
            'Withdrawn By User',
            NULL,
            'nvarchar',
            200,
            0,
            0,
            1,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '55ea2025-d6bc-423a-84f9-09264ec0bfcb' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = 'AccreditingOrganization')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '55ea2025-d6bc-423a-84f9-09264ec0bfcb',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            'AccreditingOrganization',
            'Accrediting Organization',
            NULL,
            'nvarchar',
            510,
            0,
            0,
            0,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8bc2e707-6aa6-4296-acea-b285433c736e' OR (EntityID = '208290B3-A754-4C7A-94E7-E7279A8529F1' AND Name = 'PartyEntity')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '8bc2e707-6aa6-4296-acea-b285433c736e',
            '208290B3-A754-4C7A-94E7-E7279A8529F1', -- Entity: MJ_BizApps_Credentialing: Subjects
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '208290B3-A754-4C7A-94E7-E7279A8529F1'),
            'PartyEntity',
            'Party Entity',
            NULL,
            'nvarchar',
            510,
            0,
            0,
            1,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'd4728376-53a1-4a5a-b686-e9452299c110' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'DocumentRequirement')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'd4728376-53a1-4a5a-b686-e9452299c110',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'DocumentRequirement',
            'Document Requirement',
            NULL,
            'nvarchar',
            510,
            0,
            0,
            1,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'cb090dc2-27e9-4a58-8ab3-ffb049f5d7fe' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'File')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'cb090dc2-27e9-4a58-8ab3-ffb049f5d7fe',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'File',
            'File',
            NULL,
            'nvarchar',
            1000,
            0,
            0,
            0,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '3ba706ba-f9e5-4ba0-abe8-6985f7679680' OR (EntityID = '852E8212-4C5B-4A90-B446-E89EECD3DB8D' AND Name = 'UploadedByUser')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '3ba706ba-f9e5-4ba0-abe8-6985f7679680',
            '852E8212-4C5B-4A90-B446-E89EECD3DB8D', -- Entity: MJ_BizApps_Credentialing: Evidence Documents
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '852E8212-4C5B-4A90-B446-E89EECD3DB8D'),
            'UploadedByUser',
            'Uploaded By User',
            NULL,
            'nvarchar',
            200,
            0,
            0,
            0,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c4f9eea5-5030-4f30-b8af-3ecb6c1390df' OR (EntityID = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B' AND Name = 'AIPromptRun')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            'c4f9eea5-5030-4f30-b8af-3ecb6c1390df',
            '4AF932AA-77FF-411E-AD94-E9B87AB25E3B', -- Entity: MJ_BizApps_Credentialing: Extractions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4AF932AA-77FF-411E-AD94-E9B87AB25E3B'),
            'AIPromptRun',
            'AI Prompt Run',
            NULL,
            'nvarchar',
            510,
            0,
            0,
            1,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '324de9c0-4438-4b9f-a58f-a5be5933580a' OR (EntityID = '587E835C-609B-4F52-B062-FABA21BB962A' AND Name = 'DocumentRequirement')) BEGIN
         INSERT INTO [${mjSchema}].[EntityField]
         (
            [ID],
            [EntityID],
            [Sequence],
            [Name],
            [DisplayName],
            [Description],
            [Type],
            [Length],
            [Precision],
            [Scale],
            [AllowsNull],
            [DefaultValue],
            [AutoIncrement],
            [AllowUpdateAPI],
            [IsVirtual],
            [IsComputed],
            [RelatedEntityID],
            [RelatedEntityFieldName],
            [IsNameField],
            [IncludeInUserSearchAPI],
            [IncludeRelatedEntityNameFieldInBaseView],
            [DefaultInView],
            [IsPrimaryKey],
            [IsUnique],
            [RelatedEntityDisplayType],
            [__mj_CreatedAt],
            [__mj_UpdatedAt]
         )
         VALUES
         (
            '324de9c0-4438-4b9f-a58f-a5be5933580a',
            '587E835C-609B-4F52-B062-FABA21BB962A', -- Entity: MJ_BizApps_Credentialing: Response Sources
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '587E835C-609B-4F52-B062-FABA21BB962A'),
            'DocumentRequirement',
            'Document Requirement',
            NULL,
            'nvarchar',
            510,
            0,
            0,
            1,
            NULL,
            0,
            0,
            1,
            0,
            NULL,
            NULL,
            0,
            0,
            0,
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;
