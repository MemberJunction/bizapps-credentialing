-- ============================================================
-- BizApps Credentialing: accrediting organizations, programs, program versions,
-- sections, standards and document requirements (v0.1.x)
--
-- Seven tables. An accrediting organization owns programs; a program has versions;
-- a version holds sections of standards and a list of required documents.
-- System columns, foreign-key indexes, views and stored procedures are CodeGen's.
-- ============================================================

CREATE TABLE ${flyway:defaultSchema}.[AccreditingOrganization] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_AccreditingOrganization] PRIMARY KEY CONSTRAINT [DF_AccreditingOrganization_ID] DEFAULT (NEWSEQUENTIALID()),
    [OrganizationID] UNIQUEIDENTIFIER NOT NULL,
    [Name] NVARCHAR(255) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [Status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_AccreditingOrganization_Status] DEFAULT (N'Active'),
    CONSTRAINT [FK_AccreditingOrganization_Organization] FOREIGN KEY ([OrganizationID]) REFERENCES [__mj_BizAppsCommon].[Organization]([ID]),
    CONSTRAINT [UQ_AccreditingOrganization_OrganizationID] UNIQUE ([OrganizationID]),
    CONSTRAINT [UQ_AccreditingOrganization_Name] UNIQUE ([Name]),
    CONSTRAINT [CK_AccreditingOrganization_Status] CHECK ([Status] IN (N'Active', N'Inactive'))
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'An accrediting body: the organization that owns credentialing programs and decides applications to them.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'AccreditingOrganization';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The BizApps Common organization record for this accrediting body.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'AccreditingOrganization',
    @level2type = N'COLUMN', @level2name = N'OrganizationID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The name of the accrediting body as shown on letters and certificates.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'AccreditingOrganization',
    @level2type = N'COLUMN', @level2name = N'Name';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'What this accrediting body does and whom it accredits.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'AccreditingOrganization',
    @level2type = N'COLUMN', @level2name = N'Description';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether the accrediting body is in use. An inactive body keeps its history but takes no new work.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'AccreditingOrganization',
    @level2type = N'COLUMN', @level2name = N'Status';
GO

CREATE TABLE ${flyway:defaultSchema}.[OrganizationMembership] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_OrganizationMembership] PRIMARY KEY CONSTRAINT [DF_OrganizationMembership_ID] DEFAULT (NEWSEQUENTIALID()),
    [AccreditingOrganizationID] UNIQUEIDENTIFIER NOT NULL,
    [UserID] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [FK_OrganizationMembership_AccreditingOrganization] FOREIGN KEY ([AccreditingOrganizationID]) REFERENCES ${flyway:defaultSchema}.[AccreditingOrganization]([ID]),
    CONSTRAINT [FK_OrganizationMembership_User] FOREIGN KEY ([UserID]) REFERENCES [${mjSchema}].[User]([ID]),
    CONSTRAINT [UQ_OrganizationMembership_AccreditingOrganizationID_UserID] UNIQUE ([AccreditingOrganizationID], [UserID])
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'A staff member''s membership of an accrediting organization. It is what lets that person see and author the organization''s programs.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'OrganizationMembership';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The accrediting organization the person belongs to.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'OrganizationMembership',
    @level2type = N'COLUMN', @level2name = N'AccreditingOrganizationID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The user who is a staff member of the organization.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'OrganizationMembership',
    @level2type = N'COLUMN', @level2name = N'UserID';
GO

CREATE TABLE ${flyway:defaultSchema}.[Program] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Program] PRIMARY KEY CONSTRAINT [DF_Program_ID] DEFAULT (NEWSEQUENTIALID()),
    [AccreditingOrganizationID] UNIQUEIDENTIFIER NOT NULL,
    [Name] NVARCHAR(255) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [ProgramType] NVARCHAR(20) NOT NULL,
    [SubjectType] NVARCHAR(20) NOT NULL,
    [SubjectNoun] NVARCHAR(100) NOT NULL,
    [CredentialPrefix] NVARCHAR(20) NOT NULL,
    [HostEntityID] UNIQUEIDENTIFIER NULL,
    [Status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Program_Status] DEFAULT (N'Active'),
    CONSTRAINT [FK_Program_AccreditingOrganization] FOREIGN KEY ([AccreditingOrganizationID]) REFERENCES ${flyway:defaultSchema}.[AccreditingOrganization]([ID]),
    CONSTRAINT [FK_Program_Entity] FOREIGN KEY ([HostEntityID]) REFERENCES [${mjSchema}].[Entity]([ID]),
    CONSTRAINT [UQ_Program_AccreditingOrganizationID_Name] UNIQUE ([AccreditingOrganizationID], [Name]),
    CONSTRAINT [UQ_Program_AccreditingOrganizationID_CredentialPrefix] UNIQUE ([AccreditingOrganizationID], [CredentialPrefix]),
    CONSTRAINT [CK_Program_ProgramType] CHECK ([ProgramType] IN (N'Certification', N'Recognition', N'Accreditation', N'License')),
    CONSTRAINT [CK_Program_SubjectType] CHECK ([SubjectType] IN (N'Person', N'Organization')),
    CONSTRAINT [CK_Program_Status] CHECK ([Status] IN (N'Active', N'Retired'))
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'A credentialing program: one credential an accrediting organization offers, such as a certification or an accreditation.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Program';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The accrediting organization that owns this program. It cannot be changed after the program is created.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Program',
    @level2type = N'COLUMN', @level2name = N'AccreditingOrganizationID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The name of the program, unique within its organization.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Program',
    @level2type = N'COLUMN', @level2name = N'Name';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'What the program recognizes and who it is for.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Program',
    @level2type = N'COLUMN', @level2name = N'Description';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The kind of credential the program awards.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Program',
    @level2type = N'COLUMN', @level2name = N'ProgramType';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether the program credentials people or organizations.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Program',
    @level2type = N'COLUMN', @level2name = N'SubjectType';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The word used on screen for what is credentialed, for example "facility" or "professional".',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Program',
    @level2type = N'COLUMN', @level2name = N'SubjectNoun';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The prefix of credential numbers issued by this program, unique within its organization.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Program',
    @level2type = N'COLUMN', @level2name = N'CredentialPrefix';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The host system entity whose records are the subjects of this program, when subjects come from the host.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Program',
    @level2type = N'COLUMN', @level2name = N'HostEntityID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether the program is offered. A retired program keeps its history but accepts no new applications.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Program',
    @level2type = N'COLUMN', @level2name = N'Status';
GO

CREATE TABLE ${flyway:defaultSchema}.[ProgramVersion] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_ProgramVersion] PRIMARY KEY CONSTRAINT [DF_ProgramVersion_ID] DEFAULT (NEWSEQUENTIALID()),
    [ProgramID] UNIQUEIDENTIFIER NOT NULL,
    [Label] NVARCHAR(50) NOT NULL,
    [Status] NVARCHAR(20) NOT NULL CONSTRAINT [DF_ProgramVersion_Status] DEFAULT (N'Draft'),
    [ActivatedAt] DATETIMEOFFSET NULL,
    [RetiredAt] DATETIMEOFFSET NULL,
    [ClonedFromVersionID] UNIQUEIDENTIFIER NULL,
    [CommitteeID] UNIQUEIDENTIFIER NULL,
    [PeerReviewerCount] INT NOT NULL CONSTRAINT [DF_ProgramVersion_PeerReviewerCount] DEFAULT (2),
    [PassiveApprovalWindowDays] INT NOT NULL CONSTRAINT [DF_ProgramVersion_PassiveApprovalWindowDays] DEFAULT (14),
    [RequiresScreening] BIT NOT NULL CONSTRAINT [DF_ProgramVersion_RequiresScreening] DEFAULT (0),
    [RequiresExecutiveApproval] BIT NOT NULL CONSTRAINT [DF_ProgramVersion_RequiresExecutiveApproval] DEFAULT (1),
    [RequiresGoverningBodyAttestation] BIT NOT NULL CONSTRAINT [DF_ProgramVersion_RequiresGoverningBodyAttestation] DEFAULT (0),
    [MinimumAgreeRate] DECIMAL(5,4) NOT NULL CONSTRAINT [DF_ProgramVersion_MinimumAgreeRate] DEFAULT (0.9000),
    [MinimumObservations] INT NOT NULL CONSTRAINT [DF_ProgramVersion_MinimumObservations] DEFAULT (30),
    [MinimumReviewers] INT NOT NULL CONSTRAINT [DF_ProgramVersion_MinimumReviewers] DEFAULT (3),
    [MinimumReplayFloor] DECIMAL(5,4) NOT NULL CONSTRAINT [DF_ProgramVersion_MinimumReplayFloor] DEFAULT (0.8500),
    [AgentObservationsVisibleToReviewers] BIT NOT NULL CONSTRAINT [DF_ProgramVersion_AgentObservationsVisibleToReviewers] DEFAULT (0),
    [PromotionEnabled] BIT NOT NULL CONSTRAINT [DF_ProgramVersion_PromotionEnabled] DEFAULT (0),
    [AutoCarryForwardOnRenewal] BIT NOT NULL CONSTRAINT [DF_ProgramVersion_AutoCarryForwardOnRenewal] DEFAULT (1),
    CONSTRAINT [FK_ProgramVersion_Program] FOREIGN KEY ([ProgramID]) REFERENCES ${flyway:defaultSchema}.[Program]([ID]),
    CONSTRAINT [FK_ProgramVersion_ProgramVersion] FOREIGN KEY ([ClonedFromVersionID]) REFERENCES ${flyway:defaultSchema}.[ProgramVersion]([ID]),
    CONSTRAINT [FK_ProgramVersion_Committee] FOREIGN KEY ([CommitteeID]) REFERENCES [__mj_BizAppsCommittees].[Committee]([ID]),
    CONSTRAINT [UQ_ProgramVersion_ProgramID_Label] UNIQUE ([ProgramID], [Label]),
    CONSTRAINT [CK_ProgramVersion_Status] CHECK ([Status] IN (N'Draft', N'Active', N'Retired')),
    CONSTRAINT [CK_ProgramVersion_PeerReviewerCount] CHECK ([PeerReviewerCount] >= 0),
    CONSTRAINT [CK_ProgramVersion_PassiveApprovalWindowDays] CHECK ([PassiveApprovalWindowDays] >= 1),
    CONSTRAINT [CK_ProgramVersion_MinimumAgreeRate] CHECK ([MinimumAgreeRate] BETWEEN 0 AND 1),
    CONSTRAINT [CK_ProgramVersion_MinimumObservations] CHECK ([MinimumObservations] >= 1),
    CONSTRAINT [CK_ProgramVersion_MinimumReviewers] CHECK ([MinimumReviewers] >= 1),
    CONSTRAINT [CK_ProgramVersion_MinimumReplayFloor] CHECK ([MinimumReplayFloor] BETWEEN 0 AND 1)
);
GO

-- One Draft version per program. A business rule, not a foreign-key index.
CREATE UNIQUE INDEX [UQ_ProgramVersion_OneDraft] ON ${flyway:defaultSchema}.[ProgramVersion]([ProgramID]) WHERE [Status] = N'Draft';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'One edition of a program''s standards and review settings. Applications are bound to the version that was active when they started.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The program this version belongs to.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'ProgramID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The name of the version, for example "2027", unique within its program.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'Label';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Where the version is in its life. A Draft can be edited, an Active version is frozen and accepts applications, a Retired version accepts none.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'Status';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'When the version was activated.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'ActivatedAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'When the version was retired.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'RetiredAt';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The version this one was copied from, when it was started with "Edit in draft".',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'ClonedFromVersionID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The committee that decides applications to this version. Required before the version can be activated.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'CommitteeID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'How many peer reviewers are assigned to each application. Fixed once the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'PeerReviewerCount';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'How many days committee members have to object before a recommendation stands. Fixed once the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'PassiveApprovalWindowDays';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether staff screen an application for completeness before review begins. Fixed once the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'RequiresScreening';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether an executive must approve the decision before it is issued. Fixed once the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'RequiresExecutiveApproval';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether the applicant''s governing body must attest to the application. Fixed once the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'RequiresGoverningBodyAttestation';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The share of reviewer reactions that must agree with AI findings before a standard may be promoted to a more automated evaluation mode, from 0 to 1. Fixed once the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'MinimumAgreeRate';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'How many reviewed findings a standard needs before it may be promoted. Fixed once the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'MinimumObservations';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'How many different reviewers must have reacted to a standard''s findings before it may be promoted. Fixed once the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'MinimumReviewers';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The lowest agreement rate on replayed past decisions that still allows promotion, from 0 to 1. Fixed once the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'MinimumReplayFloor';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether reviewers see AI observations. Can be changed while the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'AgentObservationsVisibleToReviewers';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether standards in this version may be promoted to more automated evaluation modes. Can be changed while the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'PromotionEnabled';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether a renewal application starts with the answers from the previous one. Can be changed while the version is active.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'ProgramVersion',
    @level2type = N'COLUMN', @level2name = N'AutoCarryForwardOnRenewal';
GO

CREATE TABLE ${flyway:defaultSchema}.[Section] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Section] PRIMARY KEY CONSTRAINT [DF_Section_ID] DEFAULT (NEWSEQUENTIALID()),
    [ProgramVersionID] UNIQUEIDENTIFIER NOT NULL,
    [Number] NVARCHAR(20) NOT NULL,
    [Name] NVARCHAR(255) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [Sequence] INT NOT NULL CONSTRAINT [DF_Section_Sequence] DEFAULT (0),
    CONSTRAINT [FK_Section_ProgramVersion] FOREIGN KEY ([ProgramVersionID]) REFERENCES ${flyway:defaultSchema}.[ProgramVersion]([ID]),
    CONSTRAINT [UQ_Section_ProgramVersionID_Number] UNIQUE ([ProgramVersionID], [Number])
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'A numbered group of standards within a program version.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Section';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The program version this section belongs to.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Section',
    @level2type = N'COLUMN', @level2name = N'ProgramVersionID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The section number shown to applicants and reviewers, unique within its version.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Section',
    @level2type = N'COLUMN', @level2name = N'Number';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The title of the section.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Section',
    @level2type = N'COLUMN', @level2name = N'Name';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'What the standards in this section cover.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Section',
    @level2type = N'COLUMN', @level2name = N'Description';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The position of the section within its version, lowest first.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Section',
    @level2type = N'COLUMN', @level2name = N'Sequence';
GO

CREATE TABLE ${flyway:defaultSchema}.[Standard] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_Standard] PRIMARY KEY CONSTRAINT [DF_Standard_ID] DEFAULT (NEWSEQUENTIALID()),
    [SectionID] UNIQUEIDENTIFIER NOT NULL,
    [ProgramVersionID] UNIQUEIDENTIFIER NOT NULL,
    [Code] NVARCHAR(50) NOT NULL,
    [Statement] NVARCHAR(MAX) NOT NULL,
    [Guidance] NVARCHAR(MAX) NULL,
    [ResponseType] NVARCHAR(20) NOT NULL,
    [IntakeMode] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Standard_IntakeMode] DEFAULT (N'Manual'),
    [EvaluationMode] NVARCHAR(20) NOT NULL CONSTRAINT [DF_Standard_EvaluationMode] DEFAULT (N'Human Only'),
    [IsInterpretive] BIT NOT NULL CONSTRAINT [DF_Standard_IsInterpretive] DEFAULT (0),
    [IsEligibility] BIT NOT NULL CONSTRAINT [DF_Standard_IsEligibility] DEFAULT (0),
    [IsNewForVersion] BIT NOT NULL CONSTRAINT [DF_Standard_IsNewForVersion] DEFAULT (0),
    [EvidenceHint] NVARCHAR(MAX) NULL,
    [LineageKey] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_Standard_LineageKey] DEFAULT (NEWID()),
    [Sequence] INT NOT NULL CONSTRAINT [DF_Standard_Sequence] DEFAULT (0),
    CONSTRAINT [FK_Standard_Section] FOREIGN KEY ([SectionID]) REFERENCES ${flyway:defaultSchema}.[Section]([ID]),
    CONSTRAINT [FK_Standard_ProgramVersion] FOREIGN KEY ([ProgramVersionID]) REFERENCES ${flyway:defaultSchema}.[ProgramVersion]([ID]),
    CONSTRAINT [UQ_Standard_ProgramVersionID_Code] UNIQUE ([ProgramVersionID], [Code]),
    CONSTRAINT [UQ_Standard_ProgramVersionID_LineageKey] UNIQUE ([ProgramVersionID], [LineageKey]),
    CONSTRAINT [CK_Standard_ResponseType] CHECK ([ResponseType] IN (N'Attestation', N'Narrative', N'Evidence', N'Composite')),
    CONSTRAINT [CK_Standard_IntakeMode] CHECK ([IntakeMode] IN (N'Manual', N'Locate', N'Prefill')),
    CONSTRAINT [CK_Standard_EvaluationMode] CHECK ([EvaluationMode] IN (N'Human Only', N'AI Assisted', N'AI Automated'))
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'One requirement an applicant must meet, within a section of a program version.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The section this standard belongs to. It cannot be changed after the standard is created.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'SectionID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The program version this standard belongs to. Always the version of its section.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'ProgramVersionID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The standard''s code, for example "1.2", unique within its version and stored without surrounding spaces.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'Code';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The text of the requirement.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'Statement';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Advice to applicants and reviewers on how the requirement is met and judged.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'Guidance';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'What an applicant gives in answer: a yes or no attestation, a written narrative, supporting evidence, or a combination.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'ResponseType';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'How the answer is gathered: typed by the applicant, located in their uploaded documents, or drafted for them to confirm.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'IntakeMode';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'How far AI takes part in judging the answer. It is never edited directly; it changes only through evidence-gated promotion.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'EvaluationMode';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether meeting the standard is a matter of judgment. An interpretive standard is always reviewed by people.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'IsInterpretive';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether the standard decides if an applicant may apply at all.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'IsEligibility';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether the standard was added in this version and so has no answer to carry forward from an earlier one.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'IsNewForVersion';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Where the supporting evidence is usually found, for example the name of a document.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'EvidenceHint';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Identifies the same requirement across versions of a program. A copy of a standard in a later version keeps this value.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'LineageKey';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The position of the standard within its section, lowest first.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'Standard',
    @level2type = N'COLUMN', @level2name = N'Sequence';
GO

CREATE TABLE ${flyway:defaultSchema}.[DocumentRequirement] (
    [ID] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [PK_DocumentRequirement] PRIMARY KEY CONSTRAINT [DF_DocumentRequirement_ID] DEFAULT (NEWSEQUENTIALID()),
    [ProgramVersionID] UNIQUEIDENTIFIER NOT NULL,
    [Name] NVARCHAR(255) NOT NULL,
    [Description] NVARCHAR(MAX) NULL,
    [IsRequired] BIT NOT NULL CONSTRAINT [DF_DocumentRequirement_IsRequired] DEFAULT (1),
    [SensitivityPolicy] NVARCHAR(30) NOT NULL CONSTRAINT [DF_DocumentRequirement_SensitivityPolicy] DEFAULT (N'Normal'),
    [Sequence] INT NOT NULL CONSTRAINT [DF_DocumentRequirement_Sequence] DEFAULT (0),
    CONSTRAINT [FK_DocumentRequirement_ProgramVersion] FOREIGN KEY ([ProgramVersionID]) REFERENCES ${flyway:defaultSchema}.[ProgramVersion]([ID]),
    CONSTRAINT [UQ_DocumentRequirement_ProgramVersionID_Name] UNIQUE ([ProgramVersionID], [Name]),
    CONSTRAINT [CK_DocumentRequirement_SensitivityPolicy] CHECK ([SensitivityPolicy] IN (N'Normal', N'Restricted Allowed'))
);
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'A document every applicant to a program version is asked to supply.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentRequirement';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The program version this document requirement belongs to.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentRequirement',
    @level2type = N'COLUMN', @level2name = N'ProgramVersionID';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The name of the document, for example "Bylaws", unique within its version.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentRequirement',
    @level2type = N'COLUMN', @level2name = N'Name';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'What the document is and what it should contain.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentRequirement',
    @level2type = N'COLUMN', @level2name = N'Description';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether an application is incomplete without this document.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentRequirement',
    @level2type = N'COLUMN', @level2name = N'IsRequired';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'Whether the applicant may mark this document restricted, so that it is handled outside the system.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentRequirement',
    @level2type = N'COLUMN', @level2name = N'SensitivityPolicy';
GO

EXEC sp_addextendedproperty @name = N'MS_Description', @value = N'The position of the document in the list, lowest first.',
    @level0type = N'SCHEMA', @level0name = N'${flyway:defaultSchema}',
    @level1type = N'TABLE',  @level1name = N'DocumentRequirement',
    @level2type = N'COLUMN', @level2name = N'Sequence';
GO

/* ============================================================================================
   ==== CODEGEN OUTPUT — DO NOT EDIT BELOW THIS LINE ====
   Generated by MemberJunction CodeGen (includeSchemas: ['__mj_BizAppsCredentialing']).
   Contains entity, field, value-list, relationship, and permission metadata, audit timestamp
   columns and triggers, FK indexes, base views, and CRUD stored procedures.
   ============================================================================================ */

/* SQL generated to create new entity MJ_BizApps_Credentialing: Sections */

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
         'b53a723d-e733-4b5f-aaff-91feec2911df',
         'MJ_BizApps_Credentialing: Sections',
         'Sections',
         'A numbered group of standards within a program version.',
         NULL,
         'Section',
         'vwSections',
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

/* SQL generated to create new application ${flyway:defaultSchema} */
IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[Application] WHERE [ID] = '033b686a-9c78-434b-9be9-8cc7798ad299'
   )
   BEGIN
      INSERT INTO [${mjSchema}].[Application] ([ID], [Name], [Description], [SchemaAutoAddNewEntities], [Path], [AutoUpdatePath], [DefaultForNewUser])
                       VALUES ('033b686a-9c78-434b-9be9-8cc7798ad299', '${flyway:defaultSchema}', 'Generated for schema', '${flyway:defaultSchema}', 'mjbizappscredentialing', 1, 0)
   END;

/* Adding role Developer to application ${flyway:defaultSchema} */
IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[ApplicationRole] WHERE [ApplicationID] = '033b686a-9c78-434b-9be9-8cc7798ad299' AND [RoleID] = 'DEAFCCEC-6A37-EF11-86D4-000D3A4E707E'
   )
   BEGIN
      INSERT INTO [${mjSchema}].[ApplicationRole]
                                 ([ApplicationID], [RoleID], [CanAccess], [CanAdmin]) VALUES
                                 ('033b686a-9c78-434b-9be9-8cc7798ad299', 'DEAFCCEC-6A37-EF11-86D4-000D3A4E707E', 1, 1)
   END;

/* Adding role Integration to application ${flyway:defaultSchema} */
IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[ApplicationRole] WHERE [ApplicationID] = '033b686a-9c78-434b-9be9-8cc7798ad299' AND [RoleID] = 'DFAFCCEC-6A37-EF11-86D4-000D3A4E707E'
   )
   BEGIN
      INSERT INTO [${mjSchema}].[ApplicationRole]
                                 ([ApplicationID], [RoleID], [CanAccess], [CanAdmin]) VALUES
                                 ('033b686a-9c78-434b-9be9-8cc7798ad299', 'DFAFCCEC-6A37-EF11-86D4-000D3A4E707E', 1, 0)
   END;

/* SQL generated to add entity MJ_BizApps_Credentialing: Sections to application ID: '033b686a-9c78-434b-9be9-8cc7798ad299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033b686a-9c78-434b-9be9-8cc7798ad299', 'b53a723d-e733-4b5f-aaff-91feec2911df', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033b686a-9c78-434b-9be9-8cc7798ad299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Sections for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('b53a723d-e733-4b5f-aaff-91feec2911df' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('b53a723d-e733-4b5f-aaff-91feec2911df' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Sections for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('b53a723d-e733-4b5f-aaff-91feec2911df' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('b53a723d-e733-4b5f-aaff-91feec2911df' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Standards */

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
         '82e1dfb0-3b46-4f20-a613-1cd624a71720',
         'MJ_BizApps_Credentialing: Standards',
         'Standards',
         'One requirement an applicant must meet, within a section of a program version.',
         NULL,
         'Standard',
         'vwStandards',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Standards to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '82e1dfb0-3b46-4f20-a613-1cd624a71720', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Standards for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('82e1dfb0-3b46-4f20-a613-1cd624a71720' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('82e1dfb0-3b46-4f20-a613-1cd624a71720' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Standards for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('82e1dfb0-3b46-4f20-a613-1cd624a71720' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('82e1dfb0-3b46-4f20-a613-1cd624a71720' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Document Requirements */

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
         'b648a7d7-d7c8-47cb-bc10-7a9d326d9e41',
         'MJ_BizApps_Credentialing: Document Requirements',
         'Document Requirements',
         'A document every applicant to a program version is asked to supply.',
         NULL,
         'DocumentRequirement',
         'vwDocumentRequirements',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Document Requirements to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', 'b648a7d7-d7c8-47cb-bc10-7a9d326d9e41', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Document Requirements for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('b648a7d7-d7c8-47cb-bc10-7a9d326d9e41' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('b648a7d7-d7c8-47cb-bc10-7a9d326d9e41' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Document Requirements for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('b648a7d7-d7c8-47cb-bc10-7a9d326d9e41' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('b648a7d7-d7c8-47cb-bc10-7a9d326d9e41' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Accrediting Organizations */

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
         '44b21aee-60d7-4e12-b174-4d3d1b2102be',
         'MJ_BizApps_Credentialing: Accrediting Organizations',
         'Accrediting Organizations',
         'An accrediting body: the organization that owns credentialing programs and decides applications to them.',
         NULL,
         'AccreditingOrganization',
         'vwAccreditingOrganizations',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Accrediting Organizations to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '44b21aee-60d7-4e12-b174-4d3d1b2102be', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Accrediting Organizations for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('44b21aee-60d7-4e12-b174-4d3d1b2102be' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('44b21aee-60d7-4e12-b174-4d3d1b2102be' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Accrediting Organizations for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('44b21aee-60d7-4e12-b174-4d3d1b2102be' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('44b21aee-60d7-4e12-b174-4d3d1b2102be' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Organization Memberships */

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
         '446c13ac-e489-40f7-b9dc-7c0d5cbaaef7',
         'MJ_BizApps_Credentialing: Organization Memberships',
         'Organization Memberships',
         'A staff member''s membership of an accrediting organization. It is what lets that person see and author the organization''s programs.',
         NULL,
         'OrganizationMembership',
         'vwOrganizationMemberships',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Organization Memberships to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '446c13ac-e489-40f7-b9dc-7c0d5cbaaef7', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Organization Memberships for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('446c13ac-e489-40f7-b9dc-7c0d5cbaaef7' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('446c13ac-e489-40f7-b9dc-7c0d5cbaaef7' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Organization Memberships for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('446c13ac-e489-40f7-b9dc-7c0d5cbaaef7' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('446c13ac-e489-40f7-b9dc-7c0d5cbaaef7' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Programs */

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
         'c57cd8ec-7a87-4b99-aaf3-9b71df863571',
         'MJ_BizApps_Credentialing: Programs',
         'Programs',
         'A credentialing program: one credential an accrediting organization offers, such as a certification or an accreditation.',
         NULL,
         'Program',
         'vwPrograms',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Programs to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', 'c57cd8ec-7a87-4b99-aaf3-9b71df863571', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Programs for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('c57cd8ec-7a87-4b99-aaf3-9b71df863571' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('c57cd8ec-7a87-4b99-aaf3-9b71df863571' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Programs for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('c57cd8ec-7a87-4b99-aaf3-9b71df863571' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('c57cd8ec-7a87-4b99-aaf3-9b71df863571' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to create new entity MJ_BizApps_Credentialing: Program Versions */

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
         '169f7db5-6191-4daa-9dd2-bc5bf2015dbf',
         'MJ_BizApps_Credentialing: Program Versions',
         'Program Versions',
         'One edition of a program''s standards and review settings. Applications are bound to the version that was active when they started.',
         NULL,
         'ProgramVersion',
         'vwProgramVersions',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Program Versions to application ID: '033B686A-9C78-434B-9BE9-8CC7798AD299' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('033B686A-9C78-434B-9BE9-8CC7798AD299', '169f7db5-6191-4daa-9dd2-bc5bf2015dbf', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '033B686A-9C78-434B-9BE9-8CC7798AD299'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Program Versions for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('169f7db5-6191-4daa-9dd2-bc5bf2015dbf' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('169f7db5-6191-4daa-9dd2-bc5bf2015dbf' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Program Versions for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('169f7db5-6191-4daa-9dd2-bc5bf2015dbf' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('169f7db5-6191-4daa-9dd2-bc5bf2015dbf' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Standard */
ALTER TABLE [${flyway:defaultSchema}].[Standard] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Standard */
UPDATE [${flyway:defaultSchema}].[Standard] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Standard */
ALTER TABLE [${flyway:defaultSchema}].[Standard] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Standard */
ALTER TABLE [${flyway:defaultSchema}].[Standard] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Standard___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Standard */
ALTER TABLE [${flyway:defaultSchema}].[Standard] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Standard */
UPDATE [${flyway:defaultSchema}].[Standard] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Standard */
ALTER TABLE [${flyway:defaultSchema}].[Standard] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Standard */
ALTER TABLE [${flyway:defaultSchema}].[Standard] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Standard___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.AccreditingOrganization */
ALTER TABLE [${flyway:defaultSchema}].[AccreditingOrganization] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.AccreditingOrganization */
UPDATE [${flyway:defaultSchema}].[AccreditingOrganization] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.AccreditingOrganization */
ALTER TABLE [${flyway:defaultSchema}].[AccreditingOrganization] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.AccreditingOrganization */
ALTER TABLE [${flyway:defaultSchema}].[AccreditingOrganization] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_AccreditingOrganization___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.AccreditingOrganization */
ALTER TABLE [${flyway:defaultSchema}].[AccreditingOrganization] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.AccreditingOrganization */
UPDATE [${flyway:defaultSchema}].[AccreditingOrganization] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.AccreditingOrganization */
ALTER TABLE [${flyway:defaultSchema}].[AccreditingOrganization] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.AccreditingOrganization */
ALTER TABLE [${flyway:defaultSchema}].[AccreditingOrganization] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_AccreditingOrganization___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.DocumentRequirement */
ALTER TABLE [${flyway:defaultSchema}].[DocumentRequirement] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.DocumentRequirement */
UPDATE [${flyway:defaultSchema}].[DocumentRequirement] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.DocumentRequirement */
ALTER TABLE [${flyway:defaultSchema}].[DocumentRequirement] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.DocumentRequirement */
ALTER TABLE [${flyway:defaultSchema}].[DocumentRequirement] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_DocumentRequirement___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.DocumentRequirement */
ALTER TABLE [${flyway:defaultSchema}].[DocumentRequirement] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.DocumentRequirement */
UPDATE [${flyway:defaultSchema}].[DocumentRequirement] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.DocumentRequirement */
ALTER TABLE [${flyway:defaultSchema}].[DocumentRequirement] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.DocumentRequirement */
ALTER TABLE [${flyway:defaultSchema}].[DocumentRequirement] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_DocumentRequirement___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.OrganizationMembership */
ALTER TABLE [${flyway:defaultSchema}].[OrganizationMembership] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.OrganizationMembership */
UPDATE [${flyway:defaultSchema}].[OrganizationMembership] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.OrganizationMembership */
ALTER TABLE [${flyway:defaultSchema}].[OrganizationMembership] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.OrganizationMembership */
ALTER TABLE [${flyway:defaultSchema}].[OrganizationMembership] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_OrganizationMembership___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.OrganizationMembership */
ALTER TABLE [${flyway:defaultSchema}].[OrganizationMembership] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.OrganizationMembership */
UPDATE [${flyway:defaultSchema}].[OrganizationMembership] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.OrganizationMembership */
ALTER TABLE [${flyway:defaultSchema}].[OrganizationMembership] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.OrganizationMembership */
ALTER TABLE [${flyway:defaultSchema}].[OrganizationMembership] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_OrganizationMembership___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Section */
ALTER TABLE [${flyway:defaultSchema}].[Section] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Section */
UPDATE [${flyway:defaultSchema}].[Section] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Section */
ALTER TABLE [${flyway:defaultSchema}].[Section] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Section */
ALTER TABLE [${flyway:defaultSchema}].[Section] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Section___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Section */
ALTER TABLE [${flyway:defaultSchema}].[Section] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Section */
UPDATE [${flyway:defaultSchema}].[Section] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Section */
ALTER TABLE [${flyway:defaultSchema}].[Section] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Section */
ALTER TABLE [${flyway:defaultSchema}].[Section] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Section___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Program */
ALTER TABLE [${flyway:defaultSchema}].[Program] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Program */
UPDATE [${flyway:defaultSchema}].[Program] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Program */
ALTER TABLE [${flyway:defaultSchema}].[Program] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.Program */
ALTER TABLE [${flyway:defaultSchema}].[Program] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Program___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Program */
ALTER TABLE [${flyway:defaultSchema}].[Program] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Program */
UPDATE [${flyway:defaultSchema}].[Program] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Program */
ALTER TABLE [${flyway:defaultSchema}].[Program] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.Program */
ALTER TABLE [${flyway:defaultSchema}].[Program] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_Program___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ProgramVersion */
ALTER TABLE [${flyway:defaultSchema}].[ProgramVersion] ADD [__mj_CreatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ProgramVersion */
UPDATE [${flyway:defaultSchema}].[ProgramVersion] SET [__mj_CreatedAt] = GETUTCDATE() WHERE [__mj_CreatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ProgramVersion */
ALTER TABLE [${flyway:defaultSchema}].[ProgramVersion] ALTER COLUMN [__mj_CreatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_CreatedAt to entity ${flyway:defaultSchema}.ProgramVersion */
ALTER TABLE [${flyway:defaultSchema}].[ProgramVersion] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_ProgramVersion___mj_CreatedAt] DEFAULT GETUTCDATE() FOR [__mj_CreatedAt];
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ProgramVersion */
ALTER TABLE [${flyway:defaultSchema}].[ProgramVersion] ADD [__mj_UpdatedAt] DATETIMEOFFSET NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ProgramVersion */
UPDATE [${flyway:defaultSchema}].[ProgramVersion] SET [__mj_UpdatedAt] = GETUTCDATE() WHERE [__mj_UpdatedAt] IS NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ProgramVersion */
ALTER TABLE [${flyway:defaultSchema}].[ProgramVersion] ALTER COLUMN [__mj_UpdatedAt] DATETIMEOFFSET NOT NULL;
GO

/* SQL text to add special date field __mj_UpdatedAt to entity ${flyway:defaultSchema}.ProgramVersion */
ALTER TABLE [${flyway:defaultSchema}].[ProgramVersion] ADD CONSTRAINT [DF___mj_BizAppsCredentialing_ProgramVersion___mj_UpdatedAt] DEFAULT GETUTCDATE() FOR [__mj_UpdatedAt];
GO

/* SQL text to insert 80 new entity field(s) */

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f1fcb145-c1f3-4ef6-af1f-c4a00a526710' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'ID')) BEGIN
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
            'f1fcb145-c1f3-4ef6-af1f-c4a00a526710',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '29fa314f-f836-43c5-94f7-4fa0319667d0' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'SectionID')) BEGIN
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
            '29fa314f-f836-43c5-94f7-4fa0319667d0',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'SectionID',
            'Section ID',
            'The section this standard belongs to. It cannot be changed after the standard is created.',
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
            'B53A723D-E733-4B5F-AAFF-91FEEC2911DF',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '3d807cb4-8f24-4c74-b00e-cc074c44c00b' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'ProgramVersionID')) BEGIN
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
            '3d807cb4-8f24-4c74-b00e-cc074c44c00b',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'ProgramVersionID',
            'Program Version ID',
            'The program version this standard belongs to. Always the version of its section.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '3a0cb02c-00c1-4713-ba26-22a8b03819ab' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'Code')) BEGIN
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
            '3a0cb02c-00c1-4713-ba26-22a8b03819ab',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'Code',
            'Code',
            'The standard''s code, for example "1.2", unique within its version and stored without surrounding spaces.',
            'nvarchar',
            100,
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'dbddbebe-0ddb-49ac-93c9-74afe4300ede' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'Statement')) BEGIN
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
            'dbddbebe-0ddb-49ac-93c9-74afe4300ede',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'Statement',
            'Statement',
            'The text of the requirement.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '04f478d1-3e5b-4c4d-bf3c-b7801bfbb816' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'Guidance')) BEGIN
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
            '04f478d1-3e5b-4c4d-bf3c-b7801bfbb816',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'Guidance',
            'Guidance',
            'Advice to applicants and reviewers on how the requirement is met and judged.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e8b4c1c7-e9d1-4863-98cf-b3268f08313c' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'ResponseType')) BEGIN
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
            'e8b4c1c7-e9d1-4863-98cf-b3268f08313c',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'ResponseType',
            'Response Type',
            'What an applicant gives in answer: a yes or no attestation, a written narrative, supporting evidence, or a combination.',
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
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '48a9c3d8-d41e-4c4e-8cf4-7e21279ceb41' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'IntakeMode')) BEGIN
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
            '48a9c3d8-d41e-4c4e-8cf4-7e21279ceb41',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'IntakeMode',
            'Intake Mode',
            'How the answer is gathered: typed by the applicant, located in their uploaded documents, or drafted for them to confirm.',
            'nvarchar',
            40,
            0,
            0,
            0,
            'Manual',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'fb661861-6c7b-4975-99f9-9bf05293de9e' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'EvaluationMode')) BEGIN
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
            'fb661861-6c7b-4975-99f9-9bf05293de9e',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'EvaluationMode',
            'Evaluation Mode',
            'How far AI takes part in judging the answer. It is never edited directly; it changes only through evidence-gated promotion.',
            'nvarchar',
            40,
            0,
            0,
            0,
            'Human Only',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'b79ba885-7a46-4970-951c-ba1cd6dcfe90' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'IsInterpretive')) BEGIN
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
            'b79ba885-7a46-4970-951c-ba1cd6dcfe90',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'IsInterpretive',
            'Is Interpretive',
            'Whether meeting the standard is a matter of judgment. An interpretive standard is always reviewed by people.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '20163e89-c6a9-42c1-b750-df89f3b30e36' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'IsEligibility')) BEGIN
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
            '20163e89-c6a9-42c1-b750-df89f3b30e36',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'IsEligibility',
            'Is Eligibility',
            'Whether the standard decides if an applicant may apply at all.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0a3fb236-1f45-4cbc-9a61-eed81720f63e' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'IsNewForVersion')) BEGIN
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
            '0a3fb236-1f45-4cbc-9a61-eed81720f63e',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'IsNewForVersion',
            'Is New For Version',
            'Whether the standard was added in this version and so has no answer to carry forward from an earlier one.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '4080d308-3968-4764-9ebb-d3c4989dcb2c' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'EvidenceHint')) BEGIN
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
            '4080d308-3968-4764-9ebb-d3c4989dcb2c',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'EvidenceHint',
            'Evidence Hint',
            'Where the supporting evidence is usually found, for example the name of a document.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0cec2e88-63a8-4a99-8676-0c7ffbd75e15' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'LineageKey')) BEGIN
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
            '0cec2e88-63a8-4a99-8676-0c7ffbd75e15',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'LineageKey',
            'Lineage Key',
            'Identifies the same requirement across versions of a program. A copy of a standard in a later version keeps this value.',
            'uniqueidentifier',
            16,
            0,
            0,
            0,
            'newid()',
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
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0c61e050-fb6a-4e82-921a-b3bf18b67563' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'Sequence')) BEGIN
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
            '0c61e050-fb6a-4e82-921a-b3bf18b67563',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'Sequence',
            'Sequence',
            'The position of the standard within its section, lowest first.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '9984a1fe-d5f9-49e6-b81e-87da2bdc4f7c' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = '__mj_CreatedAt')) BEGIN
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
            '9984a1fe-d5f9-49e6-b81e-87da2bdc4f7c',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f403e61e-8868-427f-9335-1ea5c0ab0f90' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = '__mj_UpdatedAt')) BEGIN
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
            'f403e61e-8868-427f-9335-1ea5c0ab0f90',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '60ff30c4-2828-41f8-aef9-a98684bff3f6' OR (EntityID = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND Name = 'ID')) BEGIN
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
            '60ff30c4-2828-41f8-aef9-a98684bff3f6',
            '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f7b3b676-a015-4855-9226-7d34e34c2b30' OR (EntityID = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND Name = 'OrganizationID')) BEGIN
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
            'f7b3b676-a015-4855-9226-7d34e34c2b30',
            '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE'),
            'OrganizationID',
            'Organization ID',
            'The BizApps Common organization record for this accrediting body.',
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
            'C70448F9-9792-41D7-A82C-784B66429D54',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '3771f657-6b23-4606-ab4b-dfafd8cf48ce' OR (EntityID = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND Name = 'Name')) BEGIN
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
            '3771f657-6b23-4606-ab4b-dfafd8cf48ce',
            '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE'),
            'Name',
            'Name',
            'The name of the accrediting body as shown on letters and certificates.',
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
            1,
            1,
            0,
            1,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'b0d64728-5ae4-41fb-bb8b-ffdb9ff27d32' OR (EntityID = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND Name = 'Description')) BEGIN
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
            'b0d64728-5ae4-41fb-bb8b-ffdb9ff27d32',
            '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE'),
            'Description',
            'Description',
            'What this accrediting body does and whom it accredits.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '7849903b-fb56-4e64-9e8b-cd90a0444a8c' OR (EntityID = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND Name = 'Status')) BEGIN
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
            '7849903b-fb56-4e64-9e8b-cd90a0444a8c',
            '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE'),
            'Status',
            'Status',
            'Whether the accrediting body is in use. An inactive body keeps its history but takes no new work.',
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
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0038410e-879a-4a65-b9f0-93c543a70199' OR (EntityID = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND Name = '__mj_CreatedAt')) BEGIN
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
            '0038410e-879a-4a65-b9f0-93c543a70199',
            '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2d200fc7-1474-4701-8197-657634d0c4a9' OR (EntityID = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND Name = '__mj_UpdatedAt')) BEGIN
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
            '2d200fc7-1474-4701-8197-657634d0c4a9',
            '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5ac6c1da-0c5d-4458-9b3f-743face78a37' OR (EntityID = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND Name = 'ID')) BEGIN
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
            '5ac6c1da-0c5d-4458-9b3f-743face78a37',
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2607293c-bbf0-49aa-9f20-db800603ba3f' OR (EntityID = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND Name = 'ProgramVersionID')) BEGIN
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
            '2607293c-bbf0-49aa-9f20-db800603ba3f',
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41'),
            'ProgramVersionID',
            'Program Version ID',
            'The program version this document requirement belongs to.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '30380b43-7557-4726-b142-d4c89c46e912' OR (EntityID = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND Name = 'Name')) BEGIN
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
            '30380b43-7557-4726-b142-d4c89c46e912',
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41'),
            'Name',
            'Name',
            'The name of the document, for example "Bylaws", unique within its version.',
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
            1,
            1,
            0,
            1,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '599427f8-c197-45cc-b23d-84935712722e' OR (EntityID = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND Name = 'Description')) BEGIN
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
            '599427f8-c197-45cc-b23d-84935712722e',
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41'),
            'Description',
            'Description',
            'What the document is and what it should contain.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '68985176-468e-4d09-9536-24f83b875bd6' OR (EntityID = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND Name = 'IsRequired')) BEGIN
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
            '68985176-468e-4d09-9536-24f83b875bd6',
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41'),
            'IsRequired',
            'Is Required',
            'Whether an application is incomplete without this document.',
            'bit',
            1,
            1,
            0,
            0,
            '(1)',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1d3a2ad6-98b7-48c9-9ffc-cc96b8525ea1' OR (EntityID = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND Name = 'SensitivityPolicy')) BEGIN
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
            '1d3a2ad6-98b7-48c9-9ffc-cc96b8525ea1',
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41'),
            'SensitivityPolicy',
            'Sensitivity Policy',
            'Whether the applicant may mark this document restricted, so that it is handled outside the system.',
            'nvarchar',
            60,
            0,
            0,
            0,
            'Normal',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'eefb3409-be43-446d-b16a-22f3c894c534' OR (EntityID = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND Name = 'Sequence')) BEGIN
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
            'eefb3409-be43-446d-b16a-22f3c894c534',
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41'),
            'Sequence',
            'Sequence',
            'The position of the document in the list, lowest first.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1b94bda3-ecfc-4405-b421-d138786cca0b' OR (EntityID = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND Name = '__mj_CreatedAt')) BEGIN
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
            '1b94bda3-ecfc-4405-b421-d138786cca0b',
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'b3d622a6-8d61-434a-b0c0-3cedec105df9' OR (EntityID = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND Name = '__mj_UpdatedAt')) BEGIN
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
            'b3d622a6-8d61-434a-b0c0-3cedec105df9',
            'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0ad1c09e-630f-4f24-bee7-b560623d9ab0' OR (EntityID = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7' AND Name = 'ID')) BEGIN
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
            '0ad1c09e-630f-4f24-bee7-b560623d9ab0',
            '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '9d94faf8-0745-41c1-9365-72eae95c2232' OR (EntityID = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7' AND Name = 'AccreditingOrganizationID')) BEGIN
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
            '9d94faf8-0745-41c1-9365-72eae95c2232',
            '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7'),
            'AccreditingOrganizationID',
            'Accrediting Organization ID',
            'The accrediting organization the person belongs to.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '7ab446d1-129d-435a-8458-c4ecc9edc3fa' OR (EntityID = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7' AND Name = 'UserID')) BEGIN
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
            '7ab446d1-129d-435a-8458-c4ecc9edc3fa',
            '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7'),
            'UserID',
            'User ID',
            'The user who is a staff member of the organization.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '47fddd7c-937b-416c-bdeb-a86049d7f3b4' OR (EntityID = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7' AND Name = '__mj_CreatedAt')) BEGIN
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
            '47fddd7c-937b-416c-bdeb-a86049d7f3b4',
            '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7'),
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
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '95281210-7295-4b63-93a0-d79f360bc39b' OR (EntityID = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7' AND Name = '__mj_UpdatedAt')) BEGIN
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
            '95281210-7295-4b63-93a0-d79f360bc39b',
            '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7'),
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
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2f6cdcd1-8761-4b8d-a1f0-5739f3a9c4f4' OR (EntityID = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF' AND Name = 'ID')) BEGIN
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
            '2f6cdcd1-8761-4b8d-a1f0-5739f3a9c4f4',
            'B53A723D-E733-4B5F-AAFF-91FEEC2911DF', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8272a23c-c7bf-4cfd-9727-14465dd4fc05' OR (EntityID = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF' AND Name = 'ProgramVersionID')) BEGIN
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
            '8272a23c-c7bf-4cfd-9727-14465dd4fc05',
            'B53A723D-E733-4B5F-AAFF-91FEEC2911DF', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF'),
            'ProgramVersionID',
            'Program Version ID',
            'The program version this section belongs to.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '286c7e2f-01f9-4efb-924b-19b271120e00' OR (EntityID = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF' AND Name = 'Number')) BEGIN
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
            '286c7e2f-01f9-4efb-924b-19b271120e00',
            'B53A723D-E733-4B5F-AAFF-91FEEC2911DF', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF'),
            'Number',
            'Number',
            'The section number shown to applicants and reviewers, unique within its version.',
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
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '869916dd-f597-4341-b7ef-60b57f816d0c' OR (EntityID = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF' AND Name = 'Name')) BEGIN
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
            '869916dd-f597-4341-b7ef-60b57f816d0c',
            'B53A723D-E733-4B5F-AAFF-91FEEC2911DF', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF'),
            'Name',
            'Name',
            'The title of the section.',
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
            1,
            1,
            0,
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'd4ba334a-590f-4224-ae2a-cecf1169df2c' OR (EntityID = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF' AND Name = 'Description')) BEGIN
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
            'd4ba334a-590f-4224-ae2a-cecf1169df2c',
            'B53A723D-E733-4B5F-AAFF-91FEEC2911DF', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF'),
            'Description',
            'Description',
            'What the standards in this section cover.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c423f693-b47b-4417-aa7b-5efc7039dba3' OR (EntityID = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF' AND Name = 'Sequence')) BEGIN
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
            'c423f693-b47b-4417-aa7b-5efc7039dba3',
            'B53A723D-E733-4B5F-AAFF-91FEEC2911DF', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF'),
            'Sequence',
            'Sequence',
            'The position of the section within its version, lowest first.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '7a2f5d7d-2800-44f6-9423-59f586194362' OR (EntityID = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF' AND Name = '__mj_CreatedAt')) BEGIN
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
            '7a2f5d7d-2800-44f6-9423-59f586194362',
            'B53A723D-E733-4B5F-AAFF-91FEEC2911DF', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '85465c79-2572-4919-a4a2-b0b2ffc41f00' OR (EntityID = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF' AND Name = '__mj_UpdatedAt')) BEGIN
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
            '85465c79-2572-4919-a4a2-b0b2ffc41f00',
            'B53A723D-E733-4B5F-AAFF-91FEEC2911DF', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f9db89a3-9b25-4976-a002-fdab94783e8c' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'ID')) BEGIN
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
            'f9db89a3-9b25-4976-a002-fdab94783e8c',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'd582811b-15d4-4be3-a4fb-9f4ac2e2d3d7' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'AccreditingOrganizationID')) BEGIN
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
            'd582811b-15d4-4be3-a4fb-9f4ac2e2d3d7',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
            'AccreditingOrganizationID',
            'Accrediting Organization ID',
            'The accrediting organization that owns this program. It cannot be changed after the program is created.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8559d6c4-a2b6-4c6d-bfef-5acb321ba30b' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'Name')) BEGIN
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
            '8559d6c4-a2b6-4c6d-bfef-5acb321ba30b',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
            'Name',
            'Name',
            'The name of the program, unique within its organization.',
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
            1,
            1,
            0,
            1,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1987fb4d-c674-4a3a-96c7-ad568d8c4e81' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'Description')) BEGIN
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
            '1987fb4d-c674-4a3a-96c7-ad568d8c4e81',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
            'Description',
            'Description',
            'What the program recognizes and who it is for.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'db23ec42-967d-4b94-9c6d-63cbe3c4192a' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'ProgramType')) BEGIN
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
            'db23ec42-967d-4b94-9c6d-63cbe3c4192a',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
            'ProgramType',
            'Program Type',
            'The kind of credential the program awards.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '3ca60d14-19a7-4bce-9747-47ec52e8deb4' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'SubjectType')) BEGIN
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
            '3ca60d14-19a7-4bce-9747-47ec52e8deb4',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
            'SubjectType',
            'Subject Type',
            'Whether the program credentials people or organizations.',
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
            0,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2a5441e2-e38e-42ad-8ce4-704f2fe244ec' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'SubjectNoun')) BEGIN
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
            '2a5441e2-e38e-42ad-8ce4-704f2fe244ec',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
            'SubjectNoun',
            'Subject Noun',
            'The word used on screen for what is credentialed, for example "facility" or "professional".',
            'nvarchar',
            200,
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '346e5d2b-363b-4028-8cbb-825d6eda9875' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'CredentialPrefix')) BEGIN
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
            '346e5d2b-363b-4028-8cbb-825d6eda9875',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
            'CredentialPrefix',
            'Credential Prefix',
            'The prefix of credential numbers issued by this program, unique within its organization.',
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
            0,
            0,
            1,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '6aecf948-6702-449d-af00-a9660ac2c2fa' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'HostEntityID')) BEGIN
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
            '6aecf948-6702-449d-af00-a9660ac2c2fa',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
            'HostEntityID',
            'Host Entity ID',
            'The host system entity whose records are the subjects of this program, when subjects come from the host.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '15f21a0c-be99-4a91-a722-e4b67e0851e9' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'Status')) BEGIN
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
            '15f21a0c-be99-4a91-a722-e4b67e0851e9',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
            'Status',
            'Status',
            'Whether the program is offered. A retired program keeps its history but accepts no new applications.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'dec38e04-f826-489f-a937-2953aafb1c91' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = '__mj_CreatedAt')) BEGIN
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
            'dec38e04-f826-489f-a937-2953aafb1c91',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ecd18680-80cd-4f12-a1c1-e3ff39586b99' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = '__mj_UpdatedAt')) BEGIN
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
            'ecd18680-80cd-4f12-a1c1-e3ff39586b99',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8a303052-adcc-47c9-82a6-68a41da4dd3e' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'ID')) BEGIN
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
            '8a303052-adcc-47c9-82a6-68a41da4dd3e',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5fc43777-73d0-433b-9335-66ccd34f5102' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'ProgramID')) BEGIN
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
            '5fc43777-73d0-433b-9335-66ccd34f5102',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'ProgramID',
            'Program ID',
            'The program this version belongs to.',
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
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '92cb65ce-d0c8-40d0-88b5-ef5d403923ce' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'Label')) BEGIN
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
            '92cb65ce-d0c8-40d0-88b5-ef5d403923ce',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'Label',
            'Label',
            'The name of the version, for example "2027", unique within its program.',
            'nvarchar',
            100,
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'aeac48bf-f142-41f8-b5e5-f549efdd0ba0' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'Status')) BEGIN
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
            'aeac48bf-f142-41f8-b5e5-f549efdd0ba0',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'Status',
            'Status',
            'Where the version is in its life. A Draft can be edited, an Active version is frozen and accepts applications, a Retired version accepts none.',
            'nvarchar',
            40,
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '27452d7d-3bc8-49f9-8f56-636f8c8418b0' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'ActivatedAt')) BEGIN
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
            '27452d7d-3bc8-49f9-8f56-636f8c8418b0',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'ActivatedAt',
            'Activated At',
            'When the version was activated.',
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
            1,
            0,
            0,
            'Search',
            GETUTCDATE(),
            GETUTCDATE()
         )
      END;

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '59168897-0e51-4966-bab6-91c4fb5ca51d' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'RetiredAt')) BEGIN
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
            '59168897-0e51-4966-bab6-91c4fb5ca51d',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'RetiredAt',
            'Retired At',
            'When the version was retired.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '55516e11-0291-492c-ac65-57726fc02008' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'ClonedFromVersionID')) BEGIN
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
            '55516e11-0291-492c-ac65-57726fc02008',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'ClonedFromVersionID',
            'Cloned From Version ID',
            'The version this one was copied from, when it was started with "Edit in draft".',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '39296c5e-4249-436b-8d72-0b5b8149d5cd' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'CommitteeID')) BEGIN
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
            '39296c5e-4249-436b-8d72-0b5b8149d5cd',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'CommitteeID',
            'Committee ID',
            'The committee that decides applications to this version. Required before the version can be activated.',
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
            'A5DA88A1-AA21-4A3F-B1C4-42652FB440CE',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '34d540f7-6142-4c8d-b6bc-3bf8c9d49f56' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'PeerReviewerCount')) BEGIN
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
            '34d540f7-6142-4c8d-b6bc-3bf8c9d49f56',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'PeerReviewerCount',
            'Peer Reviewer Count',
            'How many peer reviewers are assigned to each application. Fixed once the version is active.',
            'int',
            4,
            10,
            0,
            0,
            '(2)',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8897d9c3-af37-4545-bf11-3ea17a5d9154' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'PassiveApprovalWindowDays')) BEGIN
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
            '8897d9c3-af37-4545-bf11-3ea17a5d9154',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'PassiveApprovalWindowDays',
            'Passive Approval Window Days',
            'How many days committee members have to object before a recommendation stands. Fixed once the version is active.',
            'int',
            4,
            10,
            0,
            0,
            '(14)',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '110c6c61-f9f3-4c16-9d6b-dca42cfe9414' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'RequiresScreening')) BEGIN
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
            '110c6c61-f9f3-4c16-9d6b-dca42cfe9414',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'RequiresScreening',
            'Requires Screening',
            'Whether staff screen an application for completeness before review begins. Fixed once the version is active.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ce3411c0-83e7-4eaf-a692-5545e1fb8fec' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'RequiresExecutiveApproval')) BEGIN
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
            'ce3411c0-83e7-4eaf-a692-5545e1fb8fec',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'RequiresExecutiveApproval',
            'Requires Executive Approval',
            'Whether an executive must approve the decision before it is issued. Fixed once the version is active.',
            'bit',
            1,
            1,
            0,
            0,
            '(1)',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '3bc13d4e-5bb8-4011-81c8-86d3be891e5a' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'RequiresGoverningBodyAttestation')) BEGIN
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
            '3bc13d4e-5bb8-4011-81c8-86d3be891e5a',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'RequiresGoverningBodyAttestation',
            'Requires Governing Body Attestation',
            'Whether the applicant''s governing body must attest to the application. Fixed once the version is active.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e6e56a26-496e-4b5d-99c9-b7ad30458ae0' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'MinimumAgreeRate')) BEGIN
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
            'e6e56a26-496e-4b5d-99c9-b7ad30458ae0',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'MinimumAgreeRate',
            'Minimum Agree Rate',
            'The share of reviewer reactions that must agree with AI findings before a standard may be promoted to a more automated evaluation mode, from 0 to 1. Fixed once the version is active.',
            'decimal',
            5,
            5,
            4,
            0,
            '(0.9000)',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f38530ca-319e-4fab-9193-34bcab85001c' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'MinimumObservations')) BEGIN
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
            'f38530ca-319e-4fab-9193-34bcab85001c',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'MinimumObservations',
            'Minimum Observations',
            'How many reviewed findings a standard needs before it may be promoted. Fixed once the version is active.',
            'int',
            4,
            10,
            0,
            0,
            '(30)',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '7a9c214d-d78c-4bd3-8e0e-d2611aea1d31' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'MinimumReviewers')) BEGIN
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
            '7a9c214d-d78c-4bd3-8e0e-d2611aea1d31',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'MinimumReviewers',
            'Minimum Reviewers',
            'How many different reviewers must have reacted to a standard''s findings before it may be promoted. Fixed once the version is active.',
            'int',
            4,
            10,
            0,
            0,
            '(3)',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5a025ed3-584e-4e85-b62f-40aa9dcb9347' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'MinimumReplayFloor')) BEGIN
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
            '5a025ed3-584e-4e85-b62f-40aa9dcb9347',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'MinimumReplayFloor',
            'Minimum Replay Floor',
            'The lowest agreement rate on replayed past decisions that still allows promotion, from 0 to 1. Fixed once the version is active.',
            'decimal',
            5,
            5,
            4,
            0,
            '(0.8500)',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'd82c18ae-852a-4489-bb70-e6d2a824d940' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'AgentObservationsVisibleToReviewers')) BEGIN
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
            'd82c18ae-852a-4489-bb70-e6d2a824d940',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'AgentObservationsVisibleToReviewers',
            'Agent Observations Visible To Reviewers',
            'Whether reviewers see AI observations. Can be changed while the version is active.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1b279ab5-feb9-4b25-83a9-6a06600c08b4' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'PromotionEnabled')) BEGIN
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
            '1b279ab5-feb9-4b25-83a9-6a06600c08b4',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'PromotionEnabled',
            'Promotion Enabled',
            'Whether standards in this version may be promoted to more automated evaluation modes. Can be changed while the version is active.',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'eda3b64d-1262-480d-a73f-896c6a425380' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'AutoCarryForwardOnRenewal')) BEGIN
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
            'eda3b64d-1262-480d-a73f-896c6a425380',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'AutoCarryForwardOnRenewal',
            'Auto Carry Forward On Renewal',
            'Whether a renewal application starts with the answers from the previous one. Can be changed while the version is active.',
            'bit',
            1,
            1,
            0,
            0,
            '(1)',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2bc0c025-0ce4-45ff-85b2-f14714af9b67' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = '__mj_CreatedAt')) BEGIN
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
            '2bc0c025-0ce4-45ff-85b2-f14714af9b67',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '3a05cf6b-e873-46a7-89df-5c781fd1ed16' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = '__mj_UpdatedAt')) BEGIN
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
            '3a05cf6b-e873-46a7-89df-5c781fd1ed16',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
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


/* SQL text to insert entity field value with ID f6abe6f5-35fd-4a5d-978d-62a98ce536ba */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('f6abe6f5-35fd-4a5d-978d-62a98ce536ba', 'E8B4C1C7-E9D1-4863-98CF-B3268F08313C', 1, 'Attestation', 'Attestation', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 26c58183-f5bd-4bb4-9e33-96c34481cca6 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('26c58183-f5bd-4bb4-9e33-96c34481cca6', 'E8B4C1C7-E9D1-4863-98CF-B3268F08313C', 2, 'Composite', 'Composite', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 4d7b5c21-bf85-47db-a5a2-e5e410d3c42a */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('4d7b5c21-bf85-47db-a5a2-e5e410d3c42a', 'E8B4C1C7-E9D1-4863-98CF-B3268F08313C', 3, 'Evidence', 'Evidence', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID f0186dc0-9945-45f3-b1a7-f37a924a44ad */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('f0186dc0-9945-45f3-b1a7-f37a924a44ad', 'E8B4C1C7-E9D1-4863-98CF-B3268F08313C', 4, 'Narrative', 'Narrative', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID E8B4C1C7-E9D1-4863-98CF-B3268F08313C */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='E8B4C1C7-E9D1-4863-98CF-B3268F08313C';

/* SQL text to insert entity field value with ID 1a23393c-c43e-4535-9abd-852b5ffbe90b */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('1a23393c-c43e-4535-9abd-852b5ffbe90b', '48A9C3D8-D41E-4C4E-8CF4-7E21279CEB41', 1, 'Locate', 'Locate', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID dd18b13e-aa58-434d-bcf7-8f8f1c34abaa */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('dd18b13e-aa58-434d-bcf7-8f8f1c34abaa', '48A9C3D8-D41E-4C4E-8CF4-7E21279CEB41', 2, 'Manual', 'Manual', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 5ed84184-0ff4-47b9-b022-5cbc3429e76d */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('5ed84184-0ff4-47b9-b022-5cbc3429e76d', '48A9C3D8-D41E-4C4E-8CF4-7E21279CEB41', 3, 'Prefill', 'Prefill', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 48A9C3D8-D41E-4C4E-8CF4-7E21279CEB41 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='48A9C3D8-D41E-4C4E-8CF4-7E21279CEB41';

/* SQL text to insert entity field value with ID 3a185523-9ec2-44d6-a409-d1fe6c72583d */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('3a185523-9ec2-44d6-a409-d1fe6c72583d', 'FB661861-6C7B-4975-99F9-9BF05293DE9E', 1, 'AI Assisted', 'AI Assisted', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID ebdb05e8-5434-4804-8590-f1b39bf2dc97 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('ebdb05e8-5434-4804-8590-f1b39bf2dc97', 'FB661861-6C7B-4975-99F9-9BF05293DE9E', 2, 'AI Automated', 'AI Automated', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 690a5bb5-ecbe-490a-9ab7-e1c4473faef9 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('690a5bb5-ecbe-490a-9ab7-e1c4473faef9', 'FB661861-6C7B-4975-99F9-9BF05293DE9E', 3, 'Human Only', 'Human Only', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID FB661861-6C7B-4975-99F9-9BF05293DE9E */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='FB661861-6C7B-4975-99F9-9BF05293DE9E';

/* SQL text to insert entity field value with ID 2198d620-c518-4d96-bef7-9666b0ae9202 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('2198d620-c518-4d96-bef7-9666b0ae9202', '7849903B-FB56-4E64-9E8B-CD90A0444A8C', 1, 'Active', 'Active', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID ab4cce8b-0292-4511-a4ec-87736b96d948 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('ab4cce8b-0292-4511-a4ec-87736b96d948', '7849903B-FB56-4E64-9E8B-CD90A0444A8C', 2, 'Inactive', 'Inactive', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 7849903B-FB56-4E64-9E8B-CD90A0444A8C */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='7849903B-FB56-4E64-9E8B-CD90A0444A8C';

/* SQL text to insert entity field value with ID 33a04157-2978-4698-a0d6-d4083fbdbf5f */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('33a04157-2978-4698-a0d6-d4083fbdbf5f', '1D3A2AD6-98B7-48C9-9FFC-CC96B8525EA1', 1, 'Normal', 'Normal', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 5f4aa502-6d7e-41aa-ba33-eecba1d607ff */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('5f4aa502-6d7e-41aa-ba33-eecba1d607ff', '1D3A2AD6-98B7-48C9-9FFC-CC96B8525EA1', 2, 'Restricted Allowed', 'Restricted Allowed', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 1D3A2AD6-98B7-48C9-9FFC-CC96B8525EA1 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='1D3A2AD6-98B7-48C9-9FFC-CC96B8525EA1';

/* SQL text to insert entity field value with ID a2d16ffe-1209-4b07-a107-cf7d868a5b75 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('a2d16ffe-1209-4b07-a107-cf7d868a5b75', 'DB23EC42-967D-4B94-9C6D-63CBE3C4192A', 1, 'Accreditation', 'Accreditation', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 19b9db4b-feb5-434f-b3b6-0046ed4a7e38 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('19b9db4b-feb5-434f-b3b6-0046ed4a7e38', 'DB23EC42-967D-4B94-9C6D-63CBE3C4192A', 2, 'Certification', 'Certification', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 050a2951-3bfb-4411-a41d-07fd8fb6f8ed */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('050a2951-3bfb-4411-a41d-07fd8fb6f8ed', 'DB23EC42-967D-4B94-9C6D-63CBE3C4192A', 3, 'License', 'License', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 897e8adf-e8ef-4f8b-b7c1-3051e2a81626 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('897e8adf-e8ef-4f8b-b7c1-3051e2a81626', 'DB23EC42-967D-4B94-9C6D-63CBE3C4192A', 4, 'Recognition', 'Recognition', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID DB23EC42-967D-4B94-9C6D-63CBE3C4192A */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='DB23EC42-967D-4B94-9C6D-63CBE3C4192A';

/* SQL text to insert entity field value with ID 3a6d879a-bbeb-412b-a7e0-496a99c24cc6 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('3a6d879a-bbeb-412b-a7e0-496a99c24cc6', '3CA60D14-19A7-4BCE-9747-47EC52E8DEB4', 1, 'Organization', 'Organization', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 724d5253-f73d-4911-b0ab-f00ab1746490 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('724d5253-f73d-4911-b0ab-f00ab1746490', '3CA60D14-19A7-4BCE-9747-47EC52E8DEB4', 2, 'Person', 'Person', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 3CA60D14-19A7-4BCE-9747-47EC52E8DEB4 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='3CA60D14-19A7-4BCE-9747-47EC52E8DEB4';

/* SQL text to insert entity field value with ID 108771da-2792-4c0e-90d7-6eed5f95f8f2 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('108771da-2792-4c0e-90d7-6eed5f95f8f2', '15F21A0C-BE99-4A91-A722-E4B67E0851E9', 1, 'Active', 'Active', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID f4671633-7759-4a9b-9208-b8c6a05c5c12 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('f4671633-7759-4a9b-9208-b8c6a05c5c12', '15F21A0C-BE99-4A91-A722-E4B67E0851E9', 2, 'Retired', 'Retired', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 15F21A0C-BE99-4A91-A722-E4B67E0851E9 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='15F21A0C-BE99-4A91-A722-E4B67E0851E9';

/* SQL text to insert entity field value with ID abd7bff9-1540-41b0-864c-b0e2b33ab084 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('abd7bff9-1540-41b0-864c-b0e2b33ab084', 'AEAC48BF-F142-41F8-B5E5-F549EFDD0BA0', 1, 'Active', 'Active', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 9942ed43-5bb6-4dde-ba65-ab5b3648d0e0 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('9942ed43-5bb6-4dde-ba65-ab5b3648d0e0', 'AEAC48BF-F142-41F8-B5E5-F549EFDD0BA0', 2, 'Draft', 'Draft', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID bcde0c6c-c408-4f6d-9826-36a8c6e72e18 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('bcde0c6c-c408-4f6d-9826-36a8c6e72e18', 'AEAC48BF-F142-41F8-B5E5-F549EFDD0BA0', 3, 'Retired', 'Retired', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID AEAC48BF-F142-41F8-B5E5-F549EFDD0BA0 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='AEAC48BF-F142-41F8-B5E5-F549EFDD0BA0';

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


/* Create Entity Relationship: Committees: Committees -> MJ_BizApps_Credentialing: Program Versions (One To Many via CommitteeID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'ee842e84-e13d-4963-b5a5-080470dada50' OR ([EntityID] = 'A5DA88A1-AA21-4A3F-B1C4-42652FB440CE' AND [RelatedEntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND [RelatedEntityJoinField] = 'CommitteeID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('ee842e84-e13d-4963-b5a5-080470dada50', 'A5DA88A1-AA21-4A3F-B1C4-42652FB440CE', '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', 'CommitteeID', 'One To Many', 1, 1, 7, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Accrediting Organizations -> MJ_BizApps_Credentialing: Organization Memberships (One To Many via AccreditingOrganizationID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'a79053fa-e82d-4e1d-8248-2a8be007ec60' OR ([EntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND [RelatedEntityID] = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7' AND [RelatedEntityJoinField] = 'AccreditingOrganizationID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('a79053fa-e82d-4e1d-8248-2a8be007ec60', '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7', 'AccreditingOrganizationID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Accrediting Organizations -> MJ_BizApps_Credentialing: Programs (One To Many via AccreditingOrganizationID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '505ba31d-da46-45b0-9fe5-3a82098e4716' OR ([EntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND [RelatedEntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND [RelatedEntityJoinField] = 'AccreditingOrganizationID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('505ba31d-da46-45b0-9fe5-3a82098e4716', '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', 'AccreditingOrganizationID', 'One To Many', 1, 1, 2, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Entities -> MJ_BizApps_Credentialing: Programs (One To Many via HostEntityID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'a01d68f2-ea8a-436c-a71d-3c8f6070d7a8' OR ([EntityID] = 'E0238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND [RelatedEntityJoinField] = 'HostEntityID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('a01d68f2-ea8a-436c-a71d-3c8f6070d7a8', 'E0238F34-2837-EF11-86D4-6045BDEE16E6', 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', 'HostEntityID', 'One To Many', 1, 1, 98, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Users -> MJ_BizApps_Credentialing: Organization Memberships (One To Many via UserID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'a2bc13aa-545b-4a73-b09e-aebe7d1514d5' OR ([EntityID] = 'E1238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7' AND [RelatedEntityJoinField] = 'UserID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('a2bc13aa-545b-4a73-b09e-aebe7d1514d5', 'E1238F34-2837-EF11-86D4-6045BDEE16E6', '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7', 'UserID', 'One To Many', 1, 1, 136, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ_BizApps_Common: Organizations -> MJ_BizApps_Credentialing: Accrediting Organizations (One To Many via OrganizationID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '47ec1758-00a2-47f9-8b98-57ee77b8b5a2' OR ([EntityID] = 'C70448F9-9792-41D7-A82C-784B66429D54' AND [RelatedEntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND [RelatedEntityJoinField] = 'OrganizationID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('47ec1758-00a2-47f9-8b98-57ee77b8b5a2', 'C70448F9-9792-41D7-A82C-784B66429D54', '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', 'OrganizationID', 'One To Many', 1, 1, 7, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Sections -> MJ_BizApps_Credentialing: Standards (One To Many via SectionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'c44e60c2-beb8-42af-bf45-b7d8db7c2be9' OR ([EntityID] = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF' AND [RelatedEntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND [RelatedEntityJoinField] = 'SectionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('c44e60c2-beb8-42af-bf45-b7d8db7c2be9', 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF', '82E1DFB0-3B46-4F20-A613-1CD624A71720', 'SectionID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Programs -> MJ_BizApps_Credentialing: Program Versions (One To Many via ProgramID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '39528fd2-d5a8-4fc6-8126-ff8e297ba3b7' OR ([EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND [RelatedEntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND [RelatedEntityJoinField] = 'ProgramID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('39528fd2-d5a8-4fc6-8126-ff8e297ba3b7', 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', 'ProgramID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Program Versions -> MJ_BizApps_Credentialing: Standards (One To Many via ProgramVersionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '8785b913-8800-408c-9b60-638b5d67e0cd' OR ([EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND [RelatedEntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND [RelatedEntityJoinField] = 'ProgramVersionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('8785b913-8800-408c-9b60-638b5d67e0cd', '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', '82E1DFB0-3B46-4F20-A613-1CD624A71720', 'ProgramVersionID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Program Versions -> MJ_BizApps_Credentialing: Document Requirements (One To Many via ProgramVersionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'b17ff853-8ad1-4461-b220-932a3b36e361' OR ([EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND [RelatedEntityID] = 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41' AND [RelatedEntityJoinField] = 'ProgramVersionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('b17ff853-8ad1-4461-b220-932a3b36e361', '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', 'B648A7D7-D7C8-47CB-BC10-7A9D326D9E41', 'ProgramVersionID', 'One To Many', 1, 1, 2, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ_BizApps_Credentialing: Program Versions -> MJ_BizApps_Credentialing: Sections (One To Many via ProgramVersionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '673d57d4-551b-4d9e-9452-4813816c625b' OR ([EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND [RelatedEntityID] = 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF' AND [RelatedEntityJoinField] = 'ProgramVersionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('673d57d4-551b-4d9e-9452-4813816c625b', '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', 'B53A723D-E733-4B5F-AAFF-91FEEC2911DF', 'ProgramVersionID', 'One To Many', 1, 1, 3, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Program Versions -> MJ_BizApps_Credentialing: Program Versions (One To Many via ClonedFromVersionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '05fd8ccb-31d7-4e69-9c74-b5c511497ad1' OR ([EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND [RelatedEntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND [RelatedEntityJoinField] = 'ClonedFromVersionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('05fd8ccb-31d7-4e69-9c74-b5c511497ad1', '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', 'ClonedFromVersionID', 'One To Many', 1, 1, 4, GETUTCDATE(), GETUTCDATE())
   END;

/* Index for Foreign Keys for AccreditingOrganization */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key OrganizationID in table AccreditingOrganization
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_AccreditingOrganization_OrganizationID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[AccreditingOrganization]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_AccreditingOrganization_OrganizationID ON [${flyway:defaultSchema}].[AccreditingOrganization] ([OrganizationID]);

/* SQL text to update entity field related entity name field map for entity field ID F7B3B676-A015-4855-9226-7D34E34C2B30 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='F7B3B676-A015-4855-9226-7D34E34C2B30', @RelatedEntityNameFieldMap='Organization';

/* Index for Foreign Keys for DocumentRequirement */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Requirements
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key ProgramVersionID in table DocumentRequirement
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_DocumentRequirement_ProgramVersionID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[DocumentRequirement]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_DocumentRequirement_ProgramVersionID ON [${flyway:defaultSchema}].[DocumentRequirement] ([ProgramVersionID]);

/* Index for Foreign Keys for OrganizationMembership */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Organization Memberships
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key AccreditingOrganizationID in table OrganizationMembership
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_OrganizationMembership_AccreditingOrganizationID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[OrganizationMembership]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_OrganizationMembership_AccreditingOrganizationID ON [${flyway:defaultSchema}].[OrganizationMembership] ([AccreditingOrganizationID]);

-- Index for foreign key UserID in table OrganizationMembership
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_OrganizationMembership_UserID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[OrganizationMembership]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_OrganizationMembership_UserID ON [${flyway:defaultSchema}].[OrganizationMembership] ([UserID]);

/* SQL text to update entity field related entity name field map for entity field ID 9D94FAF8-0745-41C1-9365-72EAE95C2232 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='9D94FAF8-0745-41C1-9365-72EAE95C2232', @RelatedEntityNameFieldMap='AccreditingOrganization';

/* Index for Foreign Keys for ProgramVersion */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Program Versions
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key ProgramID in table ProgramVersion
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ProgramVersion_ProgramID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ProgramVersion]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ProgramVersion_ProgramID ON [${flyway:defaultSchema}].[ProgramVersion] ([ProgramID]);

-- Index for foreign key ClonedFromVersionID in table ProgramVersion
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ProgramVersion_ClonedFromVersionID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ProgramVersion]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ProgramVersion_ClonedFromVersionID ON [${flyway:defaultSchema}].[ProgramVersion] ([ClonedFromVersionID]);

-- Index for foreign key CommitteeID in table ProgramVersion
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_ProgramVersion_CommitteeID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[ProgramVersion]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_ProgramVersion_CommitteeID ON [${flyway:defaultSchema}].[ProgramVersion] ([CommitteeID]);

/* SQL text to update entity field related entity name field map for entity field ID 5FC43777-73D0-433B-9335-66CCD34F5102 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='5FC43777-73D0-433B-9335-66CCD34F5102', @RelatedEntityNameFieldMap='Program';

/* Index for Foreign Keys for Program */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Programs
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key AccreditingOrganizationID in table Program
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Program_AccreditingOrganizationID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Program]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Program_AccreditingOrganizationID ON [${flyway:defaultSchema}].[Program] ([AccreditingOrganizationID]);

-- Index for foreign key HostEntityID in table Program
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Program_HostEntityID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Program]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Program_HostEntityID ON [${flyway:defaultSchema}].[Program] ([HostEntityID]);

/* SQL text to update entity field related entity name field map for entity field ID D582811B-15D4-4BE3-A4FB-9F4AC2E2D3D7 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='D582811B-15D4-4BE3-A4FB-9F4AC2E2D3D7', @RelatedEntityNameFieldMap='AccreditingOrganization';

/* Index for Foreign Keys for Section */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Sections
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key ProgramVersionID in table Section
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Section_ProgramVersionID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Section]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Section_ProgramVersionID ON [${flyway:defaultSchema}].[Section] ([ProgramVersionID]);

/* Index for Foreign Keys for Standard */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standards
-- Item: Index for Foreign Keys
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------
-- Index for foreign key SectionID in table Standard
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Standard_SectionID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Standard]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Standard_SectionID ON [${flyway:defaultSchema}].[Standard] ([SectionID]);

-- Index for foreign key ProgramVersionID in table Standard
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IDX_AUTO_MJ_FKEY_Standard_ProgramVersionID' 
    AND object_id = OBJECT_ID('[${flyway:defaultSchema}].[Standard]')
)
CREATE INDEX IDX_AUTO_MJ_FKEY_Standard_ProgramVersionID ON [${flyway:defaultSchema}].[Standard] ([ProgramVersionID]);

/* SQL text to update entity field related entity name field map for entity field ID 29FA314F-F836-43C5-94F7-4FA0319667D0 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='29FA314F-F836-43C5-94F7-4FA0319667D0', @RelatedEntityNameFieldMap='Section';

/* Base View SQL for MJ_BizApps_Credentialing: Document Requirements */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Requirements
-- Item: vwDocumentRequirements
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Document Requirements
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  DocumentRequirement
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwDocumentRequirements]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwDocumentRequirements];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwDocumentRequirements]
AS
SELECT
    d.*
FROM
    [${flyway:defaultSchema}].[DocumentRequirement] AS d
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwDocumentRequirements] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Document Requirements */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Requirements
-- Item: Permissions for vwDocumentRequirements
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwDocumentRequirements] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Document Requirements */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Requirements
-- Item: spCreateDocumentRequirement
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR DocumentRequirement
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateDocumentRequirement]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateDocumentRequirement];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateDocumentRequirement]
    @ID uniqueidentifier = NULL,
    @ProgramVersionID uniqueidentifier,
    @Name nvarchar(255),
    @Description_Clear bit = 0,
    @Description nvarchar(MAX) = NULL,
    @IsRequired bit = NULL,
    @SensitivityPolicy nvarchar(30) = NULL,
    @Sequence int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[DocumentRequirement]
            (
                [ID],
                [ProgramVersionID],
                [Name],
                [Description],
                [IsRequired],
                [SensitivityPolicy],
                [Sequence]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @ProgramVersionID,
                @Name,
                CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, NULL) END,
                ISNULL(@IsRequired, 1),
                ISNULL(@SensitivityPolicy, 'Normal'),
                ISNULL(@Sequence, 0)
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[DocumentRequirement]
            (
                [ProgramVersionID],
                [Name],
                [Description],
                [IsRequired],
                [SensitivityPolicy],
                [Sequence]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ProgramVersionID,
                @Name,
                CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, NULL) END,
                ISNULL(@IsRequired, 1),
                ISNULL(@SensitivityPolicy, 'Normal'),
                ISNULL(@Sequence, 0)
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwDocumentRequirements] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateDocumentRequirement] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Document Requirements */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateDocumentRequirement] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Document Requirements */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Requirements
-- Item: spUpdateDocumentRequirement
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR DocumentRequirement
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateDocumentRequirement]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateDocumentRequirement];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateDocumentRequirement]
    @ID uniqueidentifier,
    @ProgramVersionID uniqueidentifier = NULL,
    @Name nvarchar(255) = NULL,
    @Description_Clear bit = 0,
    @Description nvarchar(MAX) = NULL,
    @IsRequired bit = NULL,
    @SensitivityPolicy nvarchar(30) = NULL,
    @Sequence int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[DocumentRequirement]
    SET
        [ProgramVersionID] = ISNULL(@ProgramVersionID, [ProgramVersionID]),
        [Name] = ISNULL(@Name, [Name]),
        [Description] = CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, [Description]) END,
        [IsRequired] = ISNULL(@IsRequired, [IsRequired]),
        [SensitivityPolicy] = ISNULL(@SensitivityPolicy, [SensitivityPolicy]),
        [Sequence] = ISNULL(@Sequence, [Sequence])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwDocumentRequirements] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwDocumentRequirements]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateDocumentRequirement] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the DocumentRequirement table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateDocumentRequirement]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateDocumentRequirement];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateDocumentRequirement
ON [${flyway:defaultSchema}].[DocumentRequirement]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[DocumentRequirement]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[DocumentRequirement] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Document Requirements */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateDocumentRequirement] TO [cdp_Developer], [cdp_Integration];

/* Base View SQL for MJ_BizApps_Credentialing: Sections */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Sections
-- Item: vwSections
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Sections
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  Section
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwSections]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwSections];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwSections]
AS
SELECT
    s.*
FROM
    [${flyway:defaultSchema}].[Section] AS s
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwSections] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Sections */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Sections
-- Item: Permissions for vwSections
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwSections] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Sections */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Sections
-- Item: spCreateSection
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR Section
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateSection]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateSection];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateSection]
    @ID uniqueidentifier = NULL,
    @ProgramVersionID uniqueidentifier,
    @Number nvarchar(20),
    @Name nvarchar(255),
    @Description_Clear bit = 0,
    @Description nvarchar(MAX) = NULL,
    @Sequence int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[Section]
            (
                [ID],
                [ProgramVersionID],
                [Number],
                [Name],
                [Description],
                [Sequence]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @ProgramVersionID,
                @Number,
                @Name,
                CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, NULL) END,
                ISNULL(@Sequence, 0)
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[Section]
            (
                [ProgramVersionID],
                [Number],
                [Name],
                [Description],
                [Sequence]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ProgramVersionID,
                @Number,
                @Name,
                CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, NULL) END,
                ISNULL(@Sequence, 0)
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwSections] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateSection] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Sections */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateSection] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Sections */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Sections
-- Item: spUpdateSection
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR Section
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateSection]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateSection];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateSection]
    @ID uniqueidentifier,
    @ProgramVersionID uniqueidentifier = NULL,
    @Number nvarchar(20) = NULL,
    @Name nvarchar(255) = NULL,
    @Description_Clear bit = 0,
    @Description nvarchar(MAX) = NULL,
    @Sequence int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Section]
    SET
        [ProgramVersionID] = ISNULL(@ProgramVersionID, [ProgramVersionID]),
        [Number] = ISNULL(@Number, [Number]),
        [Name] = ISNULL(@Name, [Name]),
        [Description] = CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, [Description]) END,
        [Sequence] = ISNULL(@Sequence, [Sequence])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwSections] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwSections]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateSection] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the Section table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateSection]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateSection];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateSection
ON [${flyway:defaultSchema}].[Section]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Section]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[Section] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Sections */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateSection] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Document Requirements */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Requirements
-- Item: spDeleteDocumentRequirement
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR DocumentRequirement
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteDocumentRequirement]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteDocumentRequirement];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteDocumentRequirement]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[DocumentRequirement]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteDocumentRequirement] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Document Requirements */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteDocumentRequirement] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Sections */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Sections
-- Item: spDeleteSection
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR Section
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteSection]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteSection];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteSection]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[Section]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteSection] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Sections */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteSection] TO [cdp_Developer], [cdp_Integration];

/* Base View SQL for MJ_BizApps_Credentialing: Accrediting Organizations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
-- Item: vwAccreditingOrganizations
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Accrediting Organizations
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  AccreditingOrganization
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwAccreditingOrganizations]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwAccreditingOrganizations];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwAccreditingOrganizations]
AS
SELECT
    a.*,
    mjBizAppsCommonOrganization_OrganizationID.[Name] AS [Organization]
FROM
    [${flyway:defaultSchema}].[AccreditingOrganization] AS a
INNER JOIN
    [__mj_BizAppsCommon].[Organization] AS mjBizAppsCommonOrganization_OrganizationID
  ON
    [a].[OrganizationID] = mjBizAppsCommonOrganization_OrganizationID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwAccreditingOrganizations] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Accrediting Organizations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
-- Item: Permissions for vwAccreditingOrganizations
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwAccreditingOrganizations] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Accrediting Organizations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
-- Item: spCreateAccreditingOrganization
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR AccreditingOrganization
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateAccreditingOrganization]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateAccreditingOrganization];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateAccreditingOrganization]
    @ID uniqueidentifier = NULL,
    @OrganizationID uniqueidentifier,
    @Name nvarchar(255),
    @Description_Clear bit = 0,
    @Description nvarchar(MAX) = NULL,
    @Status nvarchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[AccreditingOrganization]
            (
                [ID],
                [OrganizationID],
                [Name],
                [Description],
                [Status]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @OrganizationID,
                @Name,
                CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, NULL) END,
                ISNULL(@Status, 'Active')
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[AccreditingOrganization]
            (
                [OrganizationID],
                [Name],
                [Description],
                [Status]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @OrganizationID,
                @Name,
                CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, NULL) END,
                ISNULL(@Status, 'Active')
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwAccreditingOrganizations] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateAccreditingOrganization] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Accrediting Organizations */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateAccreditingOrganization] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Accrediting Organizations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
-- Item: spUpdateAccreditingOrganization
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR AccreditingOrganization
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateAccreditingOrganization]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateAccreditingOrganization];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateAccreditingOrganization]
    @ID uniqueidentifier,
    @OrganizationID uniqueidentifier = NULL,
    @Name nvarchar(255) = NULL,
    @Description_Clear bit = 0,
    @Description nvarchar(MAX) = NULL,
    @Status nvarchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[AccreditingOrganization]
    SET
        [OrganizationID] = ISNULL(@OrganizationID, [OrganizationID]),
        [Name] = ISNULL(@Name, [Name]),
        [Description] = CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, [Description]) END,
        [Status] = ISNULL(@Status, [Status])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwAccreditingOrganizations] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwAccreditingOrganizations]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateAccreditingOrganization] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the AccreditingOrganization table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateAccreditingOrganization]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateAccreditingOrganization];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateAccreditingOrganization
ON [${flyway:defaultSchema}].[AccreditingOrganization]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[AccreditingOrganization]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[AccreditingOrganization] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Accrediting Organizations */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateAccreditingOrganization] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Accrediting Organizations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
-- Item: spDeleteAccreditingOrganization
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR AccreditingOrganization
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteAccreditingOrganization]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteAccreditingOrganization];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteAccreditingOrganization]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[AccreditingOrganization]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteAccreditingOrganization] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Accrediting Organizations */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteAccreditingOrganization] TO [cdp_Developer], [cdp_Integration];

/* SQL text to update entity field related entity name field map for entity field ID 7AB446D1-129D-435A-8458-C4ECC9EDC3FA */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='7AB446D1-129D-435A-8458-C4ECC9EDC3FA', @RelatedEntityNameFieldMap='User';

/* SQL text to update entity field related entity name field map for entity field ID 39296C5E-4249-436B-8D72-0B5B8149D5CD */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='39296C5E-4249-436B-8D72-0B5B8149D5CD', @RelatedEntityNameFieldMap='Committee';

/* Base View SQL for MJ_BizApps_Credentialing: Standards */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standards
-- Item: vwStandards
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Standards
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  Standard
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwStandards]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwStandards];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwStandards]
AS
SELECT
    s.*,
    mjBizAppsCredentialingSection_SectionID.[Name] AS [Section]
FROM
    [${flyway:defaultSchema}].[Standard] AS s
INNER JOIN
    [${flyway:defaultSchema}].[Section] AS mjBizAppsCredentialingSection_SectionID
  ON
    [s].[SectionID] = mjBizAppsCredentialingSection_SectionID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwStandards] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Standards */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standards
-- Item: Permissions for vwStandards
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwStandards] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Standards */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standards
-- Item: spCreateStandard
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR Standard
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateStandard]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateStandard];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateStandard]
    @ID uniqueidentifier = NULL,
    @SectionID uniqueidentifier,
    @ProgramVersionID uniqueidentifier,
    @Code nvarchar(50),
    @Statement nvarchar(MAX),
    @Guidance_Clear bit = 0,
    @Guidance nvarchar(MAX) = NULL,
    @ResponseType nvarchar(20),
    @IntakeMode nvarchar(20) = NULL,
    @EvaluationMode nvarchar(20) = NULL,
    @IsInterpretive bit = NULL,
    @IsEligibility bit = NULL,
    @IsNewForVersion bit = NULL,
    @EvidenceHint_Clear bit = 0,
    @EvidenceHint nvarchar(MAX) = NULL,
    @LineageKey uniqueidentifier = NULL,
    @Sequence int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[Standard]
            (
                [ID],
                [SectionID],
                [ProgramVersionID],
                [Code],
                [Statement],
                [Guidance],
                [ResponseType],
                [IntakeMode],
                [EvaluationMode],
                [IsInterpretive],
                [IsEligibility],
                [IsNewForVersion],
                [EvidenceHint],
                [LineageKey],
                [Sequence]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @SectionID,
                @ProgramVersionID,
                @Code,
                @Statement,
                CASE WHEN @Guidance_Clear = 1 THEN NULL ELSE ISNULL(@Guidance, NULL) END,
                @ResponseType,
                ISNULL(@IntakeMode, 'Manual'),
                ISNULL(@EvaluationMode, 'Human Only'),
                ISNULL(@IsInterpretive, 0),
                ISNULL(@IsEligibility, 0),
                ISNULL(@IsNewForVersion, 0),
                CASE WHEN @EvidenceHint_Clear = 1 THEN NULL ELSE ISNULL(@EvidenceHint, NULL) END,
                CASE WHEN @LineageKey = '00000000-0000-0000-0000-000000000000' THEN newid() ELSE ISNULL(@LineageKey, newid()) END,
                ISNULL(@Sequence, 0)
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[Standard]
            (
                [SectionID],
                [ProgramVersionID],
                [Code],
                [Statement],
                [Guidance],
                [ResponseType],
                [IntakeMode],
                [EvaluationMode],
                [IsInterpretive],
                [IsEligibility],
                [IsNewForVersion],
                [EvidenceHint],
                [LineageKey],
                [Sequence]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @SectionID,
                @ProgramVersionID,
                @Code,
                @Statement,
                CASE WHEN @Guidance_Clear = 1 THEN NULL ELSE ISNULL(@Guidance, NULL) END,
                @ResponseType,
                ISNULL(@IntakeMode, 'Manual'),
                ISNULL(@EvaluationMode, 'Human Only'),
                ISNULL(@IsInterpretive, 0),
                ISNULL(@IsEligibility, 0),
                ISNULL(@IsNewForVersion, 0),
                CASE WHEN @EvidenceHint_Clear = 1 THEN NULL ELSE ISNULL(@EvidenceHint, NULL) END,
                CASE WHEN @LineageKey = '00000000-0000-0000-0000-000000000000' THEN newid() ELSE ISNULL(@LineageKey, newid()) END,
                ISNULL(@Sequence, 0)
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwStandards] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateStandard] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Standards */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateStandard] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Standards */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standards
-- Item: spUpdateStandard
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR Standard
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateStandard]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateStandard];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateStandard]
    @ID uniqueidentifier,
    @SectionID uniqueidentifier = NULL,
    @ProgramVersionID uniqueidentifier = NULL,
    @Code nvarchar(50) = NULL,
    @Statement nvarchar(MAX) = NULL,
    @Guidance_Clear bit = 0,
    @Guidance nvarchar(MAX) = NULL,
    @ResponseType nvarchar(20) = NULL,
    @IntakeMode nvarchar(20) = NULL,
    @EvaluationMode nvarchar(20) = NULL,
    @IsInterpretive bit = NULL,
    @IsEligibility bit = NULL,
    @IsNewForVersion bit = NULL,
    @EvidenceHint_Clear bit = 0,
    @EvidenceHint nvarchar(MAX) = NULL,
    @LineageKey uniqueidentifier = NULL,
    @Sequence int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Standard]
    SET
        [SectionID] = ISNULL(@SectionID, [SectionID]),
        [ProgramVersionID] = ISNULL(@ProgramVersionID, [ProgramVersionID]),
        [Code] = ISNULL(@Code, [Code]),
        [Statement] = ISNULL(@Statement, [Statement]),
        [Guidance] = CASE WHEN @Guidance_Clear = 1 THEN NULL ELSE ISNULL(@Guidance, [Guidance]) END,
        [ResponseType] = ISNULL(@ResponseType, [ResponseType]),
        [IntakeMode] = ISNULL(@IntakeMode, [IntakeMode]),
        [EvaluationMode] = ISNULL(@EvaluationMode, [EvaluationMode]),
        [IsInterpretive] = ISNULL(@IsInterpretive, [IsInterpretive]),
        [IsEligibility] = ISNULL(@IsEligibility, [IsEligibility]),
        [IsNewForVersion] = ISNULL(@IsNewForVersion, [IsNewForVersion]),
        [EvidenceHint] = CASE WHEN @EvidenceHint_Clear = 1 THEN NULL ELSE ISNULL(@EvidenceHint, [EvidenceHint]) END,
        [LineageKey] = ISNULL(@LineageKey, [LineageKey]),
        [Sequence] = ISNULL(@Sequence, [Sequence])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwStandards] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwStandards]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateStandard] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the Standard table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateStandard]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateStandard];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateStandard
ON [${flyway:defaultSchema}].[Standard]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Standard]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[Standard] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Standards */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateStandard] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Standards */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standards
-- Item: spDeleteStandard
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR Standard
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteStandard]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteStandard];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteStandard]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[Standard]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteStandard] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Standards */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteStandard] TO [cdp_Developer], [cdp_Integration];

/* SQL text to update entity field related entity name field map for entity field ID 6AECF948-6702-449D-AF00-A9660AC2C2FA */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='6AECF948-6702-449D-AF00-A9660AC2C2FA', @RelatedEntityNameFieldMap='HostEntity';

/* Base View SQL for MJ_BizApps_Credentialing: Organization Memberships */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Organization Memberships
-- Item: vwOrganizationMemberships
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Organization Memberships
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  OrganizationMembership
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwOrganizationMemberships]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwOrganizationMemberships];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwOrganizationMemberships]
AS
SELECT
    o.*,
    mjBizAppsCredentialingAccreditingOrganization_AccreditingOrganizationID.[Name] AS [AccreditingOrganization],
    MJUser_UserID.[Name] AS [User]
FROM
    [${flyway:defaultSchema}].[OrganizationMembership] AS o
INNER JOIN
    [${flyway:defaultSchema}].[AccreditingOrganization] AS mjBizAppsCredentialingAccreditingOrganization_AccreditingOrganizationID
  ON
    [o].[AccreditingOrganizationID] = mjBizAppsCredentialingAccreditingOrganization_AccreditingOrganizationID.[ID]
INNER JOIN
    [${mjSchema}].[User] AS MJUser_UserID
  ON
    [o].[UserID] = MJUser_UserID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwOrganizationMemberships] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Organization Memberships */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Organization Memberships
-- Item: Permissions for vwOrganizationMemberships
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwOrganizationMemberships] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Organization Memberships */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Organization Memberships
-- Item: spCreateOrganizationMembership
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR OrganizationMembership
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateOrganizationMembership]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateOrganizationMembership];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateOrganizationMembership]
    @ID uniqueidentifier = NULL,
    @AccreditingOrganizationID uniqueidentifier,
    @UserID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[OrganizationMembership]
            (
                [ID],
                [AccreditingOrganizationID],
                [UserID]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @AccreditingOrganizationID,
                @UserID
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[OrganizationMembership]
            (
                [AccreditingOrganizationID],
                [UserID]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @AccreditingOrganizationID,
                @UserID
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwOrganizationMemberships] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateOrganizationMembership] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Organization Memberships */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateOrganizationMembership] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Organization Memberships */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Organization Memberships
-- Item: spUpdateOrganizationMembership
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR OrganizationMembership
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateOrganizationMembership]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateOrganizationMembership];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateOrganizationMembership]
    @ID uniqueidentifier,
    @AccreditingOrganizationID uniqueidentifier = NULL,
    @UserID uniqueidentifier = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[OrganizationMembership]
    SET
        [AccreditingOrganizationID] = ISNULL(@AccreditingOrganizationID, [AccreditingOrganizationID]),
        [UserID] = ISNULL(@UserID, [UserID])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwOrganizationMemberships] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwOrganizationMemberships]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateOrganizationMembership] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the OrganizationMembership table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateOrganizationMembership]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateOrganizationMembership];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateOrganizationMembership
ON [${flyway:defaultSchema}].[OrganizationMembership]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[OrganizationMembership]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[OrganizationMembership] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Organization Memberships */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateOrganizationMembership] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Organization Memberships */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Organization Memberships
-- Item: spDeleteOrganizationMembership
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR OrganizationMembership
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteOrganizationMembership]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteOrganizationMembership];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteOrganizationMembership]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[OrganizationMembership]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteOrganizationMembership] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Organization Memberships */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteOrganizationMembership] TO [cdp_Developer], [cdp_Integration];

/* Base View SQL for MJ_BizApps_Credentialing: Programs */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Programs
-- Item: vwPrograms
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Programs
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  Program
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwPrograms]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwPrograms];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwPrograms]
AS
SELECT
    p.*,
    mjBizAppsCredentialingAccreditingOrganization_AccreditingOrganizationID.[Name] AS [AccreditingOrganization],
    MJEntity_HostEntityID.[Name] AS [HostEntity]
FROM
    [${flyway:defaultSchema}].[Program] AS p
INNER JOIN
    [${flyway:defaultSchema}].[AccreditingOrganization] AS mjBizAppsCredentialingAccreditingOrganization_AccreditingOrganizationID
  ON
    [p].[AccreditingOrganizationID] = mjBizAppsCredentialingAccreditingOrganization_AccreditingOrganizationID.[ID]
LEFT OUTER JOIN
    [${mjSchema}].[Entity] AS MJEntity_HostEntityID
  ON
    [p].[HostEntityID] = MJEntity_HostEntityID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwPrograms] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Programs */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Programs
-- Item: Permissions for vwPrograms
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwPrograms] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Programs */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Programs
-- Item: spCreateProgram
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR Program
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateProgram]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateProgram];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateProgram]
    @ID uniqueidentifier = NULL,
    @AccreditingOrganizationID uniqueidentifier,
    @Name nvarchar(255),
    @Description_Clear bit = 0,
    @Description nvarchar(MAX) = NULL,
    @ProgramType nvarchar(20),
    @SubjectType nvarchar(20),
    @SubjectNoun nvarchar(100),
    @CredentialPrefix nvarchar(20),
    @HostEntityID_Clear bit = 0,
    @HostEntityID uniqueidentifier = NULL,
    @Status nvarchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[Program]
            (
                [ID],
                [AccreditingOrganizationID],
                [Name],
                [Description],
                [ProgramType],
                [SubjectType],
                [SubjectNoun],
                [CredentialPrefix],
                [HostEntityID],
                [Status]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @AccreditingOrganizationID,
                @Name,
                CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, NULL) END,
                @ProgramType,
                @SubjectType,
                @SubjectNoun,
                @CredentialPrefix,
                CASE WHEN @HostEntityID_Clear = 1 THEN NULL ELSE ISNULL(@HostEntityID, NULL) END,
                ISNULL(@Status, 'Active')
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[Program]
            (
                [AccreditingOrganizationID],
                [Name],
                [Description],
                [ProgramType],
                [SubjectType],
                [SubjectNoun],
                [CredentialPrefix],
                [HostEntityID],
                [Status]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @AccreditingOrganizationID,
                @Name,
                CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, NULL) END,
                @ProgramType,
                @SubjectType,
                @SubjectNoun,
                @CredentialPrefix,
                CASE WHEN @HostEntityID_Clear = 1 THEN NULL ELSE ISNULL(@HostEntityID, NULL) END,
                ISNULL(@Status, 'Active')
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwPrograms] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateProgram] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Programs */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateProgram] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Programs */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Programs
-- Item: spUpdateProgram
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR Program
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateProgram]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateProgram];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateProgram]
    @ID uniqueidentifier,
    @AccreditingOrganizationID uniqueidentifier = NULL,
    @Name nvarchar(255) = NULL,
    @Description_Clear bit = 0,
    @Description nvarchar(MAX) = NULL,
    @ProgramType nvarchar(20) = NULL,
    @SubjectType nvarchar(20) = NULL,
    @SubjectNoun nvarchar(100) = NULL,
    @CredentialPrefix nvarchar(20) = NULL,
    @HostEntityID_Clear bit = 0,
    @HostEntityID uniqueidentifier = NULL,
    @Status nvarchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Program]
    SET
        [AccreditingOrganizationID] = ISNULL(@AccreditingOrganizationID, [AccreditingOrganizationID]),
        [Name] = ISNULL(@Name, [Name]),
        [Description] = CASE WHEN @Description_Clear = 1 THEN NULL ELSE ISNULL(@Description, [Description]) END,
        [ProgramType] = ISNULL(@ProgramType, [ProgramType]),
        [SubjectType] = ISNULL(@SubjectType, [SubjectType]),
        [SubjectNoun] = ISNULL(@SubjectNoun, [SubjectNoun]),
        [CredentialPrefix] = ISNULL(@CredentialPrefix, [CredentialPrefix]),
        [HostEntityID] = CASE WHEN @HostEntityID_Clear = 1 THEN NULL ELSE ISNULL(@HostEntityID, [HostEntityID]) END,
        [Status] = ISNULL(@Status, [Status])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwPrograms] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwPrograms]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateProgram] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the Program table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateProgram]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateProgram];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateProgram
ON [${flyway:defaultSchema}].[Program]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[Program]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[Program] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Programs */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateProgram] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Programs */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Programs
-- Item: spDeleteProgram
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR Program
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteProgram]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteProgram];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteProgram]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[Program]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteProgram] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Programs */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteProgram] TO [cdp_Developer], [cdp_Integration];

/* Base View SQL for MJ_BizApps_Credentialing: Program Versions */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Program Versions
-- Item: vwProgramVersions
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- BASE VIEW FOR ENTITY:      MJ_BizApps_Credentialing: Program Versions
-----               SCHEMA:      ${flyway:defaultSchema}
-----               BASE TABLE:  ProgramVersion
-----               PRIMARY KEY: ID
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[vwProgramVersions]', 'V') IS NOT NULL
    DROP VIEW [${flyway:defaultSchema}].[vwProgramVersions];
GO

CREATE VIEW [${flyway:defaultSchema}].[vwProgramVersions]
AS
SELECT
    p.*,
    mjBizAppsCredentialingProgram_ProgramID.[Name] AS [Program],
    mjBizAppsCommitteesCommittee_CommitteeID.[Name] AS [Committee]
FROM
    [${flyway:defaultSchema}].[ProgramVersion] AS p
INNER JOIN
    [${flyway:defaultSchema}].[Program] AS mjBizAppsCredentialingProgram_ProgramID
  ON
    [p].[ProgramID] = mjBizAppsCredentialingProgram_ProgramID.[ID]
LEFT OUTER JOIN
    [__mj_BizAppsCommittees].[Committee] AS mjBizAppsCommitteesCommittee_CommitteeID
  ON
    [p].[CommitteeID] = mjBizAppsCommitteesCommittee_CommitteeID.[ID]
GO
GRANT SELECT ON [${flyway:defaultSchema}].[vwProgramVersions] TO [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Program Versions */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Program Versions
-- Item: Permissions for vwProgramVersions
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwProgramVersions] TO [cdp_Developer], [cdp_Integration];

/* spCreate SQL for MJ_BizApps_Credentialing: Program Versions */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Program Versions
-- Item: spCreateProgramVersion
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- CREATE PROCEDURE FOR ProgramVersion
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spCreateProgramVersion]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spCreateProgramVersion];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spCreateProgramVersion]
    @ID uniqueidentifier = NULL,
    @ProgramID uniqueidentifier,
    @Label nvarchar(50),
    @Status nvarchar(20) = NULL,
    @ActivatedAt_Clear bit = 0,
    @ActivatedAt datetimeoffset = NULL,
    @RetiredAt_Clear bit = 0,
    @RetiredAt datetimeoffset = NULL,
    @ClonedFromVersionID_Clear bit = 0,
    @ClonedFromVersionID uniqueidentifier = NULL,
    @CommitteeID_Clear bit = 0,
    @CommitteeID uniqueidentifier = NULL,
    @PeerReviewerCount int = NULL,
    @PassiveApprovalWindowDays int = NULL,
    @RequiresScreening bit = NULL,
    @RequiresExecutiveApproval bit = NULL,
    @RequiresGoverningBodyAttestation bit = NULL,
    @MinimumAgreeRate decimal(5, 4) = NULL,
    @MinimumObservations int = NULL,
    @MinimumReviewers int = NULL,
    @MinimumReplayFloor decimal(5, 4) = NULL,
    @AgentObservationsVisibleToReviewers bit = NULL,
    @PromotionEnabled bit = NULL,
    @AutoCarryForwardOnRenewal bit = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @InsertedRow TABLE ([ID] UNIQUEIDENTIFIER)

    IF @ID IS NOT NULL
    BEGIN
        -- User provided a value, use it
        INSERT INTO [${flyway:defaultSchema}].[ProgramVersion]
            (
                [ID],
                [ProgramID],
                [Label],
                [Status],
                [ActivatedAt],
                [RetiredAt],
                [ClonedFromVersionID],
                [CommitteeID],
                [PeerReviewerCount],
                [PassiveApprovalWindowDays],
                [RequiresScreening],
                [RequiresExecutiveApproval],
                [RequiresGoverningBodyAttestation],
                [MinimumAgreeRate],
                [MinimumObservations],
                [MinimumReviewers],
                [MinimumReplayFloor],
                [AgentObservationsVisibleToReviewers],
                [PromotionEnabled],
                [AutoCarryForwardOnRenewal]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ID,
                @ProgramID,
                @Label,
                ISNULL(@Status, 'Draft'),
                CASE WHEN @ActivatedAt_Clear = 1 THEN NULL ELSE ISNULL(@ActivatedAt, NULL) END,
                CASE WHEN @RetiredAt_Clear = 1 THEN NULL ELSE ISNULL(@RetiredAt, NULL) END,
                CASE WHEN @ClonedFromVersionID_Clear = 1 THEN NULL ELSE ISNULL(@ClonedFromVersionID, NULL) END,
                CASE WHEN @CommitteeID_Clear = 1 THEN NULL ELSE ISNULL(@CommitteeID, NULL) END,
                ISNULL(@PeerReviewerCount, 2),
                ISNULL(@PassiveApprovalWindowDays, 14),
                ISNULL(@RequiresScreening, 0),
                ISNULL(@RequiresExecutiveApproval, 1),
                ISNULL(@RequiresGoverningBodyAttestation, 0),
                ISNULL(@MinimumAgreeRate, 0.9000),
                ISNULL(@MinimumObservations, 30),
                ISNULL(@MinimumReviewers, 3),
                ISNULL(@MinimumReplayFloor, 0.8500),
                ISNULL(@AgentObservationsVisibleToReviewers, 0),
                ISNULL(@PromotionEnabled, 0),
                ISNULL(@AutoCarryForwardOnRenewal, 1)
            )
    END
    ELSE
    BEGIN
        -- No value provided, let database use its default (e.g., NEWSEQUENTIALID())
        INSERT INTO [${flyway:defaultSchema}].[ProgramVersion]
            (
                [ProgramID],
                [Label],
                [Status],
                [ActivatedAt],
                [RetiredAt],
                [ClonedFromVersionID],
                [CommitteeID],
                [PeerReviewerCount],
                [PassiveApprovalWindowDays],
                [RequiresScreening],
                [RequiresExecutiveApproval],
                [RequiresGoverningBodyAttestation],
                [MinimumAgreeRate],
                [MinimumObservations],
                [MinimumReviewers],
                [MinimumReplayFloor],
                [AgentObservationsVisibleToReviewers],
                [PromotionEnabled],
                [AutoCarryForwardOnRenewal]
            )
        OUTPUT INSERTED.[ID] INTO @InsertedRow
        VALUES
            (
                @ProgramID,
                @Label,
                ISNULL(@Status, 'Draft'),
                CASE WHEN @ActivatedAt_Clear = 1 THEN NULL ELSE ISNULL(@ActivatedAt, NULL) END,
                CASE WHEN @RetiredAt_Clear = 1 THEN NULL ELSE ISNULL(@RetiredAt, NULL) END,
                CASE WHEN @ClonedFromVersionID_Clear = 1 THEN NULL ELSE ISNULL(@ClonedFromVersionID, NULL) END,
                CASE WHEN @CommitteeID_Clear = 1 THEN NULL ELSE ISNULL(@CommitteeID, NULL) END,
                ISNULL(@PeerReviewerCount, 2),
                ISNULL(@PassiveApprovalWindowDays, 14),
                ISNULL(@RequiresScreening, 0),
                ISNULL(@RequiresExecutiveApproval, 1),
                ISNULL(@RequiresGoverningBodyAttestation, 0),
                ISNULL(@MinimumAgreeRate, 0.9000),
                ISNULL(@MinimumObservations, 30),
                ISNULL(@MinimumReviewers, 3),
                ISNULL(@MinimumReplayFloor, 0.8500),
                ISNULL(@AgentObservationsVisibleToReviewers, 0),
                ISNULL(@PromotionEnabled, 0),
                ISNULL(@AutoCarryForwardOnRenewal, 1)
            )
    END
    -- return the new record from the base view, which might have some calculated fields
    SELECT * FROM [${flyway:defaultSchema}].[vwProgramVersions] WHERE [ID] = (SELECT [ID] FROM @InsertedRow)
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateProgramVersion] TO [cdp_Developer], [cdp_Integration];

/* spCreate Permissions for MJ_BizApps_Credentialing: Program Versions */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spCreateProgramVersion] TO [cdp_Developer], [cdp_Integration];

/* spUpdate SQL for MJ_BizApps_Credentialing: Program Versions */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Program Versions
-- Item: spUpdateProgramVersion
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- UPDATE PROCEDURE FOR ProgramVersion
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spUpdateProgramVersion]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spUpdateProgramVersion];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spUpdateProgramVersion]
    @ID uniqueidentifier,
    @ProgramID uniqueidentifier = NULL,
    @Label nvarchar(50) = NULL,
    @Status nvarchar(20) = NULL,
    @ActivatedAt_Clear bit = 0,
    @ActivatedAt datetimeoffset = NULL,
    @RetiredAt_Clear bit = 0,
    @RetiredAt datetimeoffset = NULL,
    @ClonedFromVersionID_Clear bit = 0,
    @ClonedFromVersionID uniqueidentifier = NULL,
    @CommitteeID_Clear bit = 0,
    @CommitteeID uniqueidentifier = NULL,
    @PeerReviewerCount int = NULL,
    @PassiveApprovalWindowDays int = NULL,
    @RequiresScreening bit = NULL,
    @RequiresExecutiveApproval bit = NULL,
    @RequiresGoverningBodyAttestation bit = NULL,
    @MinimumAgreeRate decimal(5, 4) = NULL,
    @MinimumObservations int = NULL,
    @MinimumReviewers int = NULL,
    @MinimumReplayFloor decimal(5, 4) = NULL,
    @AgentObservationsVisibleToReviewers bit = NULL,
    @PromotionEnabled bit = NULL,
    @AutoCarryForwardOnRenewal bit = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[ProgramVersion]
    SET
        [ProgramID] = ISNULL(@ProgramID, [ProgramID]),
        [Label] = ISNULL(@Label, [Label]),
        [Status] = ISNULL(@Status, [Status]),
        [ActivatedAt] = CASE WHEN @ActivatedAt_Clear = 1 THEN NULL ELSE ISNULL(@ActivatedAt, [ActivatedAt]) END,
        [RetiredAt] = CASE WHEN @RetiredAt_Clear = 1 THEN NULL ELSE ISNULL(@RetiredAt, [RetiredAt]) END,
        [ClonedFromVersionID] = CASE WHEN @ClonedFromVersionID_Clear = 1 THEN NULL ELSE ISNULL(@ClonedFromVersionID, [ClonedFromVersionID]) END,
        [CommitteeID] = CASE WHEN @CommitteeID_Clear = 1 THEN NULL ELSE ISNULL(@CommitteeID, [CommitteeID]) END,
        [PeerReviewerCount] = ISNULL(@PeerReviewerCount, [PeerReviewerCount]),
        [PassiveApprovalWindowDays] = ISNULL(@PassiveApprovalWindowDays, [PassiveApprovalWindowDays]),
        [RequiresScreening] = ISNULL(@RequiresScreening, [RequiresScreening]),
        [RequiresExecutiveApproval] = ISNULL(@RequiresExecutiveApproval, [RequiresExecutiveApproval]),
        [RequiresGoverningBodyAttestation] = ISNULL(@RequiresGoverningBodyAttestation, [RequiresGoverningBodyAttestation]),
        [MinimumAgreeRate] = ISNULL(@MinimumAgreeRate, [MinimumAgreeRate]),
        [MinimumObservations] = ISNULL(@MinimumObservations, [MinimumObservations]),
        [MinimumReviewers] = ISNULL(@MinimumReviewers, [MinimumReviewers]),
        [MinimumReplayFloor] = ISNULL(@MinimumReplayFloor, [MinimumReplayFloor]),
        [AgentObservationsVisibleToReviewers] = ISNULL(@AgentObservationsVisibleToReviewers, [AgentObservationsVisibleToReviewers]),
        [PromotionEnabled] = ISNULL(@PromotionEnabled, [PromotionEnabled]),
        [AutoCarryForwardOnRenewal] = ISNULL(@AutoCarryForwardOnRenewal, [AutoCarryForwardOnRenewal])
    WHERE
        [ID] = @ID

    -- Check if the update was successful
    IF @@ROWCOUNT = 0
        -- Nothing was updated, return no rows, but column structure from base view intact, semantically correct this way.
        SELECT TOP 0 * FROM [${flyway:defaultSchema}].[vwProgramVersions] WHERE 1=0
    ELSE
        -- Return the updated record so the caller can see the updated values and any calculated fields
        SELECT
                                        *
                                    FROM
                                        [${flyway:defaultSchema}].[vwProgramVersions]
                                    WHERE
                                        [ID] = @ID
                                    
END
GO

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateProgramVersion] TO [cdp_Developer], [cdp_Integration]
GO

------------------------------------------------------------
----- TRIGGER FOR __mj_UpdatedAt field for the ProgramVersion table
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[trgUpdateProgramVersion]', 'TR') IS NOT NULL
    DROP TRIGGER [${flyway:defaultSchema}].[trgUpdateProgramVersion];
GO
CREATE TRIGGER [${flyway:defaultSchema}].trgUpdateProgramVersion
ON [${flyway:defaultSchema}].[ProgramVersion]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE
        [${flyway:defaultSchema}].[ProgramVersion]
    SET
        __mj_UpdatedAt = GETUTCDATE()
    FROM
        [${flyway:defaultSchema}].[ProgramVersion] AS _organicTable
    INNER JOIN
        INSERTED AS I ON
        _organicTable.[ID] = I.[ID];
END;
GO

/* spUpdate Permissions for MJ_BizApps_Credentialing: Program Versions */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spUpdateProgramVersion] TO [cdp_Developer], [cdp_Integration];

/* spDelete SQL for MJ_BizApps_Credentialing: Program Versions */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Program Versions
-- Item: spDeleteProgramVersion
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

------------------------------------------------------------
----- DELETE PROCEDURE FOR ProgramVersion
------------------------------------------------------------
IF OBJECT_ID('[${flyway:defaultSchema}].[spDeleteProgramVersion]', 'P') IS NOT NULL
    DROP PROCEDURE [${flyway:defaultSchema}].[spDeleteProgramVersion];
GO

CREATE PROCEDURE [${flyway:defaultSchema}].[spDeleteProgramVersion]
    @ID uniqueidentifier
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM
        [${flyway:defaultSchema}].[ProgramVersion]
    WHERE
        [ID] = @ID


    -- Check if the delete was successful
    IF @@ROWCOUNT = 0
        SELECT NULL AS [ID] -- Return NULL for all primary key fields to indicate no record was deleted
    ELSE
        SELECT @ID AS [ID] -- Return the primary key values to indicate we successfully deleted the record
END
GO
GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteProgramVersion] TO [cdp_Developer], [cdp_Integration];

/* spDelete Permissions for MJ_BizApps_Credentialing: Program Versions */

GRANT EXECUTE ON [${flyway:defaultSchema}].[spDeleteProgramVersion] TO [cdp_Developer], [cdp_Integration];

/* SQL text to insert 8 new entity field(s) */

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '61023164-973d-40ee-9734-a15526aa2fbf' OR (EntityID = '82E1DFB0-3B46-4F20-A613-1CD624A71720' AND Name = 'Section')) BEGIN
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
            '61023164-973d-40ee-9734-a15526aa2fbf',
            '82E1DFB0-3B46-4F20-A613-1CD624A71720', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '82E1DFB0-3B46-4F20-A613-1CD624A71720'),
            'Section',
            'Section',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2864eb06-3deb-40ca-abc2-732b325c59cd' OR (EntityID = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE' AND Name = 'Organization')) BEGIN
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
            '2864eb06-3deb-40ca-abc2-732b325c59cd',
            '44B21AEE-60D7-4E12-B174-4D3D1B2102BE', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '44B21AEE-60D7-4E12-B174-4D3D1B2102BE'),
            'Organization',
            'Organization',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '631ae551-8a4f-4250-8dd6-a4237b3ee379' OR (EntityID = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7' AND Name = 'AccreditingOrganization')) BEGIN
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
            '631ae551-8a4f-4250-8dd6-a4237b3ee379',
            '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '05c25aa8-f137-448d-8a36-cc6be7c907a9' OR (EntityID = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7' AND Name = 'User')) BEGIN
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
            '05c25aa8-f137-448d-8a36-cc6be7c907a9',
            '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '446C13AC-E489-40F7-B9DC-7C0D5CBAAEF7'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '8d198877-75ce-40eb-82e9-6a3a54a4c79f' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'AccreditingOrganization')) BEGIN
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
            '8d198877-75ce-40eb-82e9-6a3a54a4c79f',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'a7f64ea1-1ecc-467e-a214-fd77972d3261' OR (EntityID = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571' AND Name = 'HostEntity')) BEGIN
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
            'a7f64ea1-1ecc-467e-a214-fd77972d3261',
            'C57CD8EC-7A87-4B99-AAF3-9B71DF863571', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'C57CD8EC-7A87-4B99-AAF3-9B71DF863571'),
            'HostEntity',
            'Host Entity',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e05f19b7-540a-4b1c-b7d4-67d2e71df275' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'Program')) BEGIN
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
            'e05f19b7-540a-4b1c-b7d4-67d2e71df275',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'Program',
            'Program',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '618f5f91-f741-4de8-a4ad-46c3a3732391' OR (EntityID = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF' AND Name = 'Committee')) BEGIN
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
            '618f5f91-f741-4de8-a4ad-46c3a3732391',
            '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '169F7DB5-6191-4DAA-9DD2-BC5BF2015DBF'),
            'Committee',
            'Committee',
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


