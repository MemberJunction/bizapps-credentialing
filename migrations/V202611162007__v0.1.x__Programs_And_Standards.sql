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
         'af17c193-76ef-4b44-9db2-cacd2f653ba9',
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

/* SQL generated to create new application ${flyway:defaultSchema} */
IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[Application] WHERE [ID] = '24c7618d-8d62-4713-a820-33afaff1ea32'
   )
   BEGIN
      INSERT INTO [${mjSchema}].[Application] ([ID], [Name], [Description], [SchemaAutoAddNewEntities], [Path], [AutoUpdatePath], [DefaultForNewUser])
                       VALUES ('24c7618d-8d62-4713-a820-33afaff1ea32', '${flyway:defaultSchema}', 'Generated for schema', '${flyway:defaultSchema}', 'mjbizappscredentialing', 1, 0)
   END;

/* Adding role UI to application ${flyway:defaultSchema} */
IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[ApplicationRole] WHERE [ApplicationID] = '24c7618d-8d62-4713-a820-33afaff1ea32' AND [RoleID] = 'E0AFCCEC-6A37-EF11-86D4-000D3A4E707E'
   )
   BEGIN
      INSERT INTO [${mjSchema}].[ApplicationRole]
                                 ([ApplicationID], [RoleID], [CanAccess], [CanAdmin]) VALUES
                                 ('24c7618d-8d62-4713-a820-33afaff1ea32', 'E0AFCCEC-6A37-EF11-86D4-000D3A4E707E', 1, 0)
   END;

/* Adding role Developer to application ${flyway:defaultSchema} */
IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[ApplicationRole] WHERE [ApplicationID] = '24c7618d-8d62-4713-a820-33afaff1ea32' AND [RoleID] = 'DEAFCCEC-6A37-EF11-86D4-000D3A4E707E'
   )
   BEGIN
      INSERT INTO [${mjSchema}].[ApplicationRole]
                                 ([ApplicationID], [RoleID], [CanAccess], [CanAdmin]) VALUES
                                 ('24c7618d-8d62-4713-a820-33afaff1ea32', 'DEAFCCEC-6A37-EF11-86D4-000D3A4E707E', 1, 1)
   END;

/* Adding role Integration to application ${flyway:defaultSchema} */
IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[ApplicationRole] WHERE [ApplicationID] = '24c7618d-8d62-4713-a820-33afaff1ea32' AND [RoleID] = 'DFAFCCEC-6A37-EF11-86D4-000D3A4E707E'
   )
   BEGIN
      INSERT INTO [${mjSchema}].[ApplicationRole]
                                 ([ApplicationID], [RoleID], [CanAccess], [CanAdmin]) VALUES
                                 ('24c7618d-8d62-4713-a820-33afaff1ea32', 'DFAFCCEC-6A37-EF11-86D4-000D3A4E707E', 1, 0)
   END;

/* SQL generated to add entity MJ_BizApps_Credentialing: Accrediting Organizations to application ID: '24c7618d-8d62-4713-a820-33afaff1ea32' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('24c7618d-8d62-4713-a820-33afaff1ea32', 'af17c193-76ef-4b44-9db2-cacd2f653ba9', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '24c7618d-8d62-4713-a820-33afaff1ea32'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Accrediting Organizations for role UI */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('af17c193-76ef-4b44-9db2-cacd2f653ba9' AS uniqueidentifier), CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 0, 0, 0, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('af17c193-76ef-4b44-9db2-cacd2f653ba9' AS uniqueidentifier) AND [RoleID] = CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Accrediting Organizations for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('af17c193-76ef-4b44-9db2-cacd2f653ba9' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('af17c193-76ef-4b44-9db2-cacd2f653ba9' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Accrediting Organizations for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('af17c193-76ef-4b44-9db2-cacd2f653ba9' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('af17c193-76ef-4b44-9db2-cacd2f653ba9' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
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
         '93036ad3-643b-434a-8fdc-8944894f857c',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Organization Memberships to application ID: '24C7618D-8D62-4713-A820-33AFAFF1EA32' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('24C7618D-8D62-4713-A820-33AFAFF1EA32', '93036ad3-643b-434a-8fdc-8944894f857c', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '24C7618D-8D62-4713-A820-33AFAFF1EA32'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Organization Memberships for role UI */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('93036ad3-643b-434a-8fdc-8944894f857c' AS uniqueidentifier), CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 0, 0, 0, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('93036ad3-643b-434a-8fdc-8944894f857c' AS uniqueidentifier) AND [RoleID] = CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Organization Memberships for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('93036ad3-643b-434a-8fdc-8944894f857c' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('93036ad3-643b-434a-8fdc-8944894f857c' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Organization Memberships for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('93036ad3-643b-434a-8fdc-8944894f857c' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('93036ad3-643b-434a-8fdc-8944894f857c' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
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
         'd9911849-71ac-45fe-b827-515c2883db29',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Programs to application ID: '24C7618D-8D62-4713-A820-33AFAFF1EA32' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('24C7618D-8D62-4713-A820-33AFAFF1EA32', 'd9911849-71ac-45fe-b827-515c2883db29', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '24C7618D-8D62-4713-A820-33AFAFF1EA32'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Programs for role UI */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('d9911849-71ac-45fe-b827-515c2883db29' AS uniqueidentifier), CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 0, 0, 0, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('d9911849-71ac-45fe-b827-515c2883db29' AS uniqueidentifier) AND [RoleID] = CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Programs for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('d9911849-71ac-45fe-b827-515c2883db29' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('d9911849-71ac-45fe-b827-515c2883db29' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Programs for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('d9911849-71ac-45fe-b827-515c2883db29' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('d9911849-71ac-45fe-b827-515c2883db29' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
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
         '41a97ec2-f553-49f3-b867-be4d31b030df',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Program Versions to application ID: '24C7618D-8D62-4713-A820-33AFAFF1EA32' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('24C7618D-8D62-4713-A820-33AFAFF1EA32', '41a97ec2-f553-49f3-b867-be4d31b030df', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '24C7618D-8D62-4713-A820-33AFAFF1EA32'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Program Versions for role UI */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('41a97ec2-f553-49f3-b867-be4d31b030df' AS uniqueidentifier), CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 0, 0, 0, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('41a97ec2-f553-49f3-b867-be4d31b030df' AS uniqueidentifier) AND [RoleID] = CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Program Versions for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('41a97ec2-f553-49f3-b867-be4d31b030df' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('41a97ec2-f553-49f3-b867-be4d31b030df' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Program Versions for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('41a97ec2-f553-49f3-b867-be4d31b030df' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('41a97ec2-f553-49f3-b867-be4d31b030df' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

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
         '4d33d968-283c-4319-be94-3c4a92765d32',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Sections to application ID: '24C7618D-8D62-4713-A820-33AFAFF1EA32' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('24C7618D-8D62-4713-A820-33AFAFF1EA32', '4d33d968-283c-4319-be94-3c4a92765d32', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '24C7618D-8D62-4713-A820-33AFAFF1EA32'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Sections for role UI */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('4d33d968-283c-4319-be94-3c4a92765d32' AS uniqueidentifier), CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 0, 0, 0, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('4d33d968-283c-4319-be94-3c4a92765d32' AS uniqueidentifier) AND [RoleID] = CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Sections for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('4d33d968-283c-4319-be94-3c4a92765d32' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('4d33d968-283c-4319-be94-3c4a92765d32' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Sections for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('4d33d968-283c-4319-be94-3c4a92765d32' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('4d33d968-283c-4319-be94-3c4a92765d32' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
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
         '19ee159d-feca-4a61-ac76-e5aa25d47f61',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Standards to application ID: '24C7618D-8D62-4713-A820-33AFAFF1EA32' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('24C7618D-8D62-4713-A820-33AFAFF1EA32', '19ee159d-feca-4a61-ac76-e5aa25d47f61', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '24C7618D-8D62-4713-A820-33AFAFF1EA32'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Standards for role UI */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('19ee159d-feca-4a61-ac76-e5aa25d47f61' AS uniqueidentifier), CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 0, 0, 0, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('19ee159d-feca-4a61-ac76-e5aa25d47f61' AS uniqueidentifier) AND [RoleID] = CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Standards for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('19ee159d-feca-4a61-ac76-e5aa25d47f61' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('19ee159d-feca-4a61-ac76-e5aa25d47f61' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Standards for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('19ee159d-feca-4a61-ac76-e5aa25d47f61' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('19ee159d-feca-4a61-ac76-e5aa25d47f61' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
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
         'babff154-ddf1-4dd8-aafa-3eb86dbbe5c4',
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

/* SQL generated to add entity MJ_BizApps_Credentialing: Document Requirements to application ID: '24C7618D-8D62-4713-A820-33AFAFF1EA32' */
INSERT INTO [${mjSchema}].[ApplicationEntity]
                                    ([ApplicationID], [EntityID], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt]) VALUES
                                    ('24C7618D-8D62-4713-A820-33AFAFF1EA32', 'babff154-ddf1-4dd8-aafa-3eb86dbbe5c4', (SELECT COALESCE(MAX([Sequence]),0)+1 FROM [${mjSchema}].[ApplicationEntity] WHERE [ApplicationID] = '24C7618D-8D62-4713-A820-33AFAFF1EA32'), GETUTCDATE(), GETUTCDATE());

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Document Requirements for role UI */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('babff154-ddf1-4dd8-aafa-3eb86dbbe5c4' AS uniqueidentifier), CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 0, 0, 0, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('babff154-ddf1-4dd8-aafa-3eb86dbbe5c4' AS uniqueidentifier) AND [RoleID] = CAST('E0AFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Document Requirements for role Developer */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('babff154-ddf1-4dd8-aafa-3eb86dbbe5c4' AS uniqueidentifier), CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('babff154-ddf1-4dd8-aafa-3eb86dbbe5c4' AS uniqueidentifier) AND [RoleID] = CAST('DEAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

/* SQL generated to add new permission for entity MJ_BizApps_Credentialing: Document Requirements for role Integration */
INSERT INTO [${mjSchema}].[EntityPermission]
                ([EntityID], [RoleID], [Type], [CanRead], [CanCreate], [CanUpdate], [CanDelete], [__mj_CreatedAt], [__mj_UpdatedAt])
              SELECT CAST('babff154-ddf1-4dd8-aafa-3eb86dbbe5c4' AS uniqueidentifier), CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier), 'Allow', 1, 1, 1, 1, GETUTCDATE(), GETUTCDATE()
              WHERE NOT EXISTS (
                SELECT 1 FROM [${mjSchema}].[EntityPermission]
                WHERE [EntityID] = CAST('babff154-ddf1-4dd8-aafa-3eb86dbbe5c4' AS uniqueidentifier) AND [RoleID] = CAST('DFAFCCEC-6A37-EF11-86D4-000D3A4E707E' AS uniqueidentifier) AND [Type] = 'Allow'
              );

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

/* SQL text to insert 80 new entity field(s) */

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f433a7c2-924e-4907-b572-37cff5208216' OR (EntityID = '4D33D968-283C-4319-BE94-3C4A92765D32' AND Name = 'ID')) BEGIN
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
            'f433a7c2-924e-4907-b572-37cff5208216',
            '4D33D968-283C-4319-BE94-3C4A92765D32', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4D33D968-283C-4319-BE94-3C4A92765D32'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'fb533c14-3aee-4333-b7ff-1398d52b81d2' OR (EntityID = '4D33D968-283C-4319-BE94-3C4A92765D32' AND Name = 'ProgramVersionID')) BEGIN
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
            'fb533c14-3aee-4333-b7ff-1398d52b81d2',
            '4D33D968-283C-4319-BE94-3C4A92765D32', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4D33D968-283C-4319-BE94-3C4A92765D32'),
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
            '41A97EC2-F553-49F3-B867-BE4D31B030DF',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '84fd7fdc-d753-4065-8414-2d2b458124a9' OR (EntityID = '4D33D968-283C-4319-BE94-3C4A92765D32' AND Name = 'Number')) BEGIN
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
            '84fd7fdc-d753-4065-8414-2d2b458124a9',
            '4D33D968-283C-4319-BE94-3C4A92765D32', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4D33D968-283C-4319-BE94-3C4A92765D32'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '802277eb-c09d-4870-8eed-1996ab3fa441' OR (EntityID = '4D33D968-283C-4319-BE94-3C4A92765D32' AND Name = 'Name')) BEGIN
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
            '802277eb-c09d-4870-8eed-1996ab3fa441',
            '4D33D968-283C-4319-BE94-3C4A92765D32', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4D33D968-283C-4319-BE94-3C4A92765D32'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '39a87c02-fe00-4477-a362-df0fdda0c1ea' OR (EntityID = '4D33D968-283C-4319-BE94-3C4A92765D32' AND Name = 'Description')) BEGIN
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
            '39a87c02-fe00-4477-a362-df0fdda0c1ea',
            '4D33D968-283C-4319-BE94-3C4A92765D32', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4D33D968-283C-4319-BE94-3C4A92765D32'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '065be9cb-125f-46ad-ac3d-7571bec1d0fb' OR (EntityID = '4D33D968-283C-4319-BE94-3C4A92765D32' AND Name = 'Sequence')) BEGIN
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
            '065be9cb-125f-46ad-ac3d-7571bec1d0fb',
            '4D33D968-283C-4319-BE94-3C4A92765D32', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4D33D968-283C-4319-BE94-3C4A92765D32'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ba78ecc0-16d3-4b6b-b470-6ca0ad49f8f5' OR (EntityID = '4D33D968-283C-4319-BE94-3C4A92765D32' AND Name = '__mj_CreatedAt')) BEGIN
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
            'ba78ecc0-16d3-4b6b-b470-6ca0ad49f8f5',
            '4D33D968-283C-4319-BE94-3C4A92765D32', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4D33D968-283C-4319-BE94-3C4A92765D32'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '33137986-8760-4e79-9177-f5a7769f47a7' OR (EntityID = '4D33D968-283C-4319-BE94-3C4A92765D32' AND Name = '__mj_UpdatedAt')) BEGIN
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
            '33137986-8760-4e79-9177-f5a7769f47a7',
            '4D33D968-283C-4319-BE94-3C4A92765D32', -- Entity: MJ_BizApps_Credentialing: Sections
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '4D33D968-283C-4319-BE94-3C4A92765D32'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e77ee80a-5b0f-4962-80f0-c0a8b2d1dd89' OR (EntityID = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4' AND Name = 'ID')) BEGIN
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
            'e77ee80a-5b0f-4962-80f0-c0a8b2d1dd89',
            'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f55218ee-70e7-4775-b0fc-5239391ddf6b' OR (EntityID = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4' AND Name = 'ProgramVersionID')) BEGIN
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
            'f55218ee-70e7-4775-b0fc-5239391ddf6b',
            'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4'),
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
            '41A97EC2-F553-49F3-B867-BE4D31B030DF',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2f399e45-0447-4c31-9c49-1129e224786e' OR (EntityID = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4' AND Name = 'Name')) BEGIN
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
            '2f399e45-0447-4c31-9c49-1129e224786e',
            'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '55cd0223-ce35-411c-994a-d420af528f4c' OR (EntityID = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4' AND Name = 'Description')) BEGIN
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
            '55cd0223-ce35-411c-994a-d420af528f4c',
            'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'faa922bf-3326-4ffe-9f5f-334a81f24b40' OR (EntityID = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4' AND Name = 'IsRequired')) BEGIN
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
            'faa922bf-3326-4ffe-9f5f-334a81f24b40',
            'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '9b3a791c-6b82-4d8f-b486-36d452dbe892' OR (EntityID = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4' AND Name = 'SensitivityPolicy')) BEGIN
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
            '9b3a791c-6b82-4d8f-b486-36d452dbe892',
            'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ae42e035-dc0b-401d-974b-2c2a393918c7' OR (EntityID = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4' AND Name = 'Sequence')) BEGIN
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
            'ae42e035-dc0b-401d-974b-2c2a393918c7',
            'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e6b1bdd7-b494-4e6f-9649-089efd2722c1' OR (EntityID = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4' AND Name = '__mj_CreatedAt')) BEGIN
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
            'e6b1bdd7-b494-4e6f-9649-089efd2722c1',
            'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1b629f97-3699-415b-8ce3-40eabc7f8567' OR (EntityID = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4' AND Name = '__mj_UpdatedAt')) BEGIN
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
            '1b629f97-3699-415b-8ce3-40eabc7f8567',
            'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4', -- Entity: MJ_BizApps_Credentialing: Document Requirements
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'cbd345de-044e-45b8-9dc3-3e04ac4c3635' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'ID')) BEGIN
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
            'cbd345de-044e-45b8-9dc3-3e04ac4c3635',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '1289638d-b7c9-48b5-a1ee-628e324aad7c' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'AccreditingOrganizationID')) BEGIN
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
            '1289638d-b7c9-48b5-a1ee-628e324aad7c',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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
            'AF17C193-76EF-4B44-9DB2-CACD2F653BA9',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '827859d7-a573-4738-a0a0-2cc01e308923' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'Name')) BEGIN
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
            '827859d7-a573-4738-a0a0-2cc01e308923',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '9241e404-5ec6-4446-a8d2-36ae4b1c0ab1' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'Description')) BEGIN
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
            '9241e404-5ec6-4446-a8d2-36ae4b1c0ab1',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'a0e0f966-b49a-45dd-aaf6-68ed1dbf80e0' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'ProgramType')) BEGIN
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
            'a0e0f966-b49a-45dd-aaf6-68ed1dbf80e0',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '630e85b3-8ebc-4242-bc47-e1564c72d98d' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'SubjectType')) BEGIN
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
            '630e85b3-8ebc-4242-bc47-e1564c72d98d',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'fdb6aa33-71d1-43f6-b9b8-12160f2ae838' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'SubjectNoun')) BEGIN
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
            'fdb6aa33-71d1-43f6-b9b8-12160f2ae838',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '4a691d7d-0f8e-43d1-ab40-856b8e76966b' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'CredentialPrefix')) BEGIN
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
            '4a691d7d-0f8e-43d1-ab40-856b8e76966b',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f12c8eb3-b105-466a-8263-ac649a833067' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'HostEntityID')) BEGIN
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
            'f12c8eb3-b105-466a-8263-ac649a833067',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ca3c641e-b3f0-4bad-bdd5-a5eb393d531d' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'Status')) BEGIN
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
            'ca3c641e-b3f0-4bad-bdd5-a5eb393d531d',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2afcd152-366d-4e87-9912-b45be2e77303' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = '__mj_CreatedAt')) BEGIN
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
            '2afcd152-366d-4e87-9912-b45be2e77303',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '41b1bd77-80de-43cd-abc2-9e3706978dfb' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = '__mj_UpdatedAt')) BEGIN
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
            '41b1bd77-80de-43cd-abc2-9e3706978dfb',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'df49a3e0-ace4-48e3-83d2-e8a1f0efe4a5' OR (EntityID = '93036AD3-643B-434A-8FDC-8944894F857C' AND Name = 'ID')) BEGIN
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
            'df49a3e0-ace4-48e3-83d2-e8a1f0efe4a5',
            '93036AD3-643B-434A-8FDC-8944894F857C', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '93036AD3-643B-434A-8FDC-8944894F857C'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'd58de060-c755-4761-b25b-35e2c5dc57bc' OR (EntityID = '93036AD3-643B-434A-8FDC-8944894F857C' AND Name = 'AccreditingOrganizationID')) BEGIN
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
            'd58de060-c755-4761-b25b-35e2c5dc57bc',
            '93036AD3-643B-434A-8FDC-8944894F857C', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '93036AD3-643B-434A-8FDC-8944894F857C'),
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
            'AF17C193-76EF-4B44-9DB2-CACD2F653BA9',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5ed010cb-db3a-451c-b633-182741a2128c' OR (EntityID = '93036AD3-643B-434A-8FDC-8944894F857C' AND Name = 'UserID')) BEGIN
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
            '5ed010cb-db3a-451c-b633-182741a2128c',
            '93036AD3-643B-434A-8FDC-8944894F857C', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '93036AD3-643B-434A-8FDC-8944894F857C'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '510fb5fd-f3a5-45f6-b534-0cc58cdb4caa' OR (EntityID = '93036AD3-643B-434A-8FDC-8944894F857C' AND Name = '__mj_CreatedAt')) BEGIN
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
            '510fb5fd-f3a5-45f6-b534-0cc58cdb4caa',
            '93036AD3-643B-434A-8FDC-8944894F857C', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '93036AD3-643B-434A-8FDC-8944894F857C'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '27e5abff-e208-41a6-9fec-d7bd49521bc0' OR (EntityID = '93036AD3-643B-434A-8FDC-8944894F857C' AND Name = '__mj_UpdatedAt')) BEGIN
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
            '27e5abff-e208-41a6-9fec-d7bd49521bc0',
            '93036AD3-643B-434A-8FDC-8944894F857C', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '93036AD3-643B-434A-8FDC-8944894F857C'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '70d04289-44a7-44fe-830a-8b4e7e816b4f' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'ID')) BEGIN
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
            '70d04289-44a7-44fe-830a-8b4e7e816b4f',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f36e86cc-767d-4d1a-b1f8-fb7cd741ec28' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'ProgramID')) BEGIN
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
            'f36e86cc-767d-4d1a-b1f8-fb7cd741ec28',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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
            'D9911849-71AC-45FE-B827-515C2883DB29',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5a30c08e-0dc8-4557-b428-d33e1f41cb4a' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'Label')) BEGIN
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
            '5a30c08e-0dc8-4557-b428-d33e1f41cb4a',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'e69d7ef7-1522-48ee-b162-0e38d7e9a5ee' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'Status')) BEGIN
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
            'e69d7ef7-1522-48ee-b162-0e38d7e9a5ee',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '172cb3e2-ec20-4d3c-acdb-2345e9d6d0c9' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'ActivatedAt')) BEGIN
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
            '172cb3e2-ec20-4d3c-acdb-2345e9d6d0c9',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '6ebb02d8-c0a6-4f48-9838-1581cda6a8b6' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'RetiredAt')) BEGIN
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
            '6ebb02d8-c0a6-4f48-9838-1581cda6a8b6',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '4d58405b-3c5b-44b1-9bf9-7a5e287c90be' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'ClonedFromVersionID')) BEGIN
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
            '4d58405b-3c5b-44b1-9bf9-7a5e287c90be',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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
            '41A97EC2-F553-49F3-B867-BE4D31B030DF',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '660643ae-1d38-426d-bb23-0db0fe043429' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'CommitteeID')) BEGIN
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
            '660643ae-1d38-426d-bb23-0db0fe043429',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'dd60a5da-ccb8-4687-b8b1-5d80b73c722a' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'PeerReviewerCount')) BEGIN
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
            'dd60a5da-ccb8-4687-b8b1-5d80b73c722a',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ef13371c-48fb-4946-90e4-821a88c94210' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'PassiveApprovalWindowDays')) BEGIN
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
            'ef13371c-48fb-4946-90e4-821a88c94210',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '9d26427c-54e7-4a5d-83a2-647303d6c675' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'RequiresScreening')) BEGIN
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
            '9d26427c-54e7-4a5d-83a2-647303d6c675',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '66e39852-8bca-4125-9dcf-5e1ead8ac776' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'RequiresExecutiveApproval')) BEGIN
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
            '66e39852-8bca-4125-9dcf-5e1ead8ac776',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ae2fbb9e-9a91-4a30-8d17-b6cdee2b5343' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'RequiresGoverningBodyAttestation')) BEGIN
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
            'ae2fbb9e-9a91-4a30-8d17-b6cdee2b5343',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '871147a3-fbd5-4597-98f4-92bcfa5284d9' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'MinimumAgreeRate')) BEGIN
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
            '871147a3-fbd5-4597-98f4-92bcfa5284d9',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '39a340f5-f74f-4278-87db-4f89e78d9790' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'MinimumObservations')) BEGIN
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
            '39a340f5-f74f-4278-87db-4f89e78d9790',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '7ca49675-1750-4960-a9b8-6a91da27a417' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'MinimumReviewers')) BEGIN
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
            '7ca49675-1750-4960-a9b8-6a91da27a417',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '46c42d0f-152f-4ce9-bf6b-2192733e9488' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'MinimumReplayFloor')) BEGIN
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
            '46c42d0f-152f-4ce9-bf6b-2192733e9488',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c221195b-db42-4bec-a8b3-82efb7628869' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'AgentObservationsVisibleToReviewers')) BEGIN
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
            'c221195b-db42-4bec-a8b3-82efb7628869',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '37e3eb06-5c13-4640-a703-64c204aca947' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'PromotionEnabled')) BEGIN
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
            '37e3eb06-5c13-4640-a703-64c204aca947',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '689ccb41-d5d1-4603-87ff-7db911b600f6' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'AutoCarryForwardOnRenewal')) BEGIN
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
            '689ccb41-d5d1-4603-87ff-7db911b600f6',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '00153e4e-0e0a-4bb2-880b-3c7fafff95ad' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = '__mj_CreatedAt')) BEGIN
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
            '00153e4e-0e0a-4bb2-880b-3c7fafff95ad',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'a0001352-f73a-432e-aa80-a2218de52309' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = '__mj_UpdatedAt')) BEGIN
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
            'a0001352-f73a-432e-aa80-a2218de52309',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'cf55fcdf-53f0-4a0b-b0b4-26620cfff889' OR (EntityID = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9' AND Name = 'ID')) BEGIN
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
            'cf55fcdf-53f0-4a0b-b0b4-26620cfff889',
            'AF17C193-76EF-4B44-9DB2-CACD2F653BA9', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0466d68c-801c-4cfb-a05e-a0f2e40f19b4' OR (EntityID = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9' AND Name = 'OrganizationID')) BEGIN
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
            '0466d68c-801c-4cfb-a05e-a0f2e40f19b4',
            'AF17C193-76EF-4B44-9DB2-CACD2F653BA9', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c5e73bfd-62ef-466c-b0f0-e45b023292e7' OR (EntityID = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9' AND Name = 'Name')) BEGIN
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
            'c5e73bfd-62ef-466c-b0f0-e45b023292e7',
            'AF17C193-76EF-4B44-9DB2-CACD2F653BA9', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '61a605d1-74b3-4e39-a28c-8fcdf5f26805' OR (EntityID = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9' AND Name = 'Description')) BEGIN
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
            '61a605d1-74b3-4e39-a28c-8fcdf5f26805',
            'AF17C193-76EF-4B44-9DB2-CACD2F653BA9', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '00d639f8-a9c7-4c05-a834-2b359b096be3' OR (EntityID = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9' AND Name = 'Status')) BEGIN
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
            '00d639f8-a9c7-4c05-a834-2b359b096be3',
            'AF17C193-76EF-4B44-9DB2-CACD2F653BA9', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '24c63a50-7119-4996-a9fc-7501cb94a5d3' OR (EntityID = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9' AND Name = '__mj_CreatedAt')) BEGIN
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
            '24c63a50-7119-4996-a9fc-7501cb94a5d3',
            'AF17C193-76EF-4B44-9DB2-CACD2F653BA9', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '9c440817-3447-46bf-9c46-51cb8f80d3d6' OR (EntityID = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9' AND Name = '__mj_UpdatedAt')) BEGIN
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
            '9c440817-3447-46bf-9c46-51cb8f80d3d6',
            'AF17C193-76EF-4B44-9DB2-CACD2F653BA9', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '382b1d6d-2479-432d-9edc-1b5553a760c8' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'ID')) BEGIN
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
            '382b1d6d-2479-432d-9edc-1b5553a760c8',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '23a99c1c-542d-4550-b592-47be82c3f804' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'SectionID')) BEGIN
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
            '23a99c1c-542d-4550-b592-47be82c3f804',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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
            '4D33D968-283C-4319-BE94-3C4A92765D32',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '7174b4af-9b87-4a0a-8e3f-e23197a64163' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'ProgramVersionID')) BEGIN
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
            '7174b4af-9b87-4a0a-8e3f-e23197a64163',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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
            '41A97EC2-F553-49F3-B867-BE4D31B030DF',
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '97661f93-1397-4c45-ba3c-dbb7f6e86239' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'Code')) BEGIN
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
            '97661f93-1397-4c45-ba3c-dbb7f6e86239',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '00821877-6333-49ef-9293-9f906342a27b' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'Statement')) BEGIN
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
            '00821877-6333-49ef-9293-9f906342a27b',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '31360605-f803-4ab3-a183-263eab198eb5' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'Guidance')) BEGIN
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
            '31360605-f803-4ab3-a183-263eab198eb5',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '59d5c49f-c0f7-44f6-99c3-2290bd376411' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'ResponseType')) BEGIN
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
            '59d5c49f-c0f7-44f6-99c3-2290bd376411',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ff11f73a-6f5b-4592-8465-596a932bf881' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'IntakeMode')) BEGIN
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
            'ff11f73a-6f5b-4592-8465-596a932bf881',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '05e6f0e2-6f48-41e0-b956-611507fcb211' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'EvaluationMode')) BEGIN
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
            '05e6f0e2-6f48-41e0-b956-611507fcb211',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '856045d0-c11c-44af-98f1-40b0ba5fe8fb' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'IsInterpretive')) BEGIN
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
            '856045d0-c11c-44af-98f1-40b0ba5fe8fb',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'ab0df44b-3b49-4f78-9ebc-5d9535cb83b0' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'IsEligibility')) BEGIN
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
            'ab0df44b-3b49-4f78-9ebc-5d9535cb83b0',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '5330a9a4-1ec4-4d06-b8b6-501ca31f617f' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'IsNewForVersion')) BEGIN
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
            '5330a9a4-1ec4-4d06-b8b6-501ca31f617f',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'bca40318-188b-46a9-82b8-ec556a4c899a' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'EvidenceHint')) BEGIN
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
            'bca40318-188b-46a9-82b8-ec556a4c899a',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '4ce17e2d-c4b7-4c4b-9fbc-3b53bb775d6c' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'LineageKey')) BEGIN
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
            '4ce17e2d-c4b7-4c4b-9fbc-3b53bb775d6c',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '0617770f-3def-4258-9bca-0cdefc8520e3' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'Sequence')) BEGIN
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
            '0617770f-3def-4258-9bca-0cdefc8520e3',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '848824e2-1d57-4f3c-a341-a48484a315de' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = '__mj_CreatedAt')) BEGIN
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
            '848824e2-1d57-4f3c-a341-a48484a315de',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '80d90126-b88c-44b2-bf8a-154f5ad5af08' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = '__mj_UpdatedAt')) BEGIN
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
            '80d90126-b88c-44b2-bf8a-154f5ad5af08',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

/* SQL text to insert entity field value with ID c2eef615-a29c-420b-8330-06465121e3a4 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('c2eef615-a29c-420b-8330-06465121e3a4', '9B3A791C-6B82-4D8F-B486-36D452DBE892', 1, 'Normal', 'Normal', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 08f7dfae-847e-43b5-bb1b-aa038e932e48 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('08f7dfae-847e-43b5-bb1b-aa038e932e48', '9B3A791C-6B82-4D8F-B486-36D452DBE892', 2, 'Restricted Allowed', 'Restricted Allowed', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 9B3A791C-6B82-4D8F-B486-36D452DBE892 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='9B3A791C-6B82-4D8F-B486-36D452DBE892';

/* SQL text to insert entity field value with ID 3848645a-78f1-4a24-a248-efd9cf2964e2 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('3848645a-78f1-4a24-a248-efd9cf2964e2', 'A0E0F966-B49A-45DD-AAF6-68ED1DBF80E0', 1, 'Accreditation', 'Accreditation', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID e4d5d291-8c46-425b-8b66-bd9a91e3d8b4 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('e4d5d291-8c46-425b-8b66-bd9a91e3d8b4', 'A0E0F966-B49A-45DD-AAF6-68ED1DBF80E0', 2, 'Certification', 'Certification', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 45c92489-263b-4bde-8bfd-971f5fc50905 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('45c92489-263b-4bde-8bfd-971f5fc50905', 'A0E0F966-B49A-45DD-AAF6-68ED1DBF80E0', 3, 'License', 'License', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID c298caf0-2f27-4355-a371-e4ff0beccffe */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('c298caf0-2f27-4355-a371-e4ff0beccffe', 'A0E0F966-B49A-45DD-AAF6-68ED1DBF80E0', 4, 'Recognition', 'Recognition', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID A0E0F966-B49A-45DD-AAF6-68ED1DBF80E0 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='A0E0F966-B49A-45DD-AAF6-68ED1DBF80E0';

/* SQL text to insert entity field value with ID a902d8fa-4a52-40fe-8e92-61de757f090b */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('a902d8fa-4a52-40fe-8e92-61de757f090b', '630E85B3-8EBC-4242-BC47-E1564C72D98D', 1, 'Organization', 'Organization', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 41d01598-9ee5-4fb9-a7e6-0369aa54dbd8 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('41d01598-9ee5-4fb9-a7e6-0369aa54dbd8', '630E85B3-8EBC-4242-BC47-E1564C72D98D', 2, 'Person', 'Person', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 630E85B3-8EBC-4242-BC47-E1564C72D98D */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='630E85B3-8EBC-4242-BC47-E1564C72D98D';

/* SQL text to insert entity field value with ID caff9290-eb58-4e23-8225-359a1f163bc7 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('caff9290-eb58-4e23-8225-359a1f163bc7', 'CA3C641E-B3F0-4BAD-BDD5-A5EB393D531D', 1, 'Active', 'Active', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 2cf4ecd4-c1f8-427e-bf7c-41ebbc06a380 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('2cf4ecd4-c1f8-427e-bf7c-41ebbc06a380', 'CA3C641E-B3F0-4BAD-BDD5-A5EB393D531D', 2, 'Retired', 'Retired', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID CA3C641E-B3F0-4BAD-BDD5-A5EB393D531D */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='CA3C641E-B3F0-4BAD-BDD5-A5EB393D531D';

/* SQL text to insert entity field value with ID b3a76d73-e3d2-431d-8d92-c4390a86e9d3 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('b3a76d73-e3d2-431d-8d92-c4390a86e9d3', 'E69D7EF7-1522-48EE-B162-0E38D7E9A5EE', 1, 'Active', 'Active', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 43b981a3-fac2-4b39-b8dc-19b952de6512 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('43b981a3-fac2-4b39-b8dc-19b952de6512', 'E69D7EF7-1522-48EE-B162-0E38D7E9A5EE', 2, 'Draft', 'Draft', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID aa3c7527-7357-42c2-873d-f299c6fe8be8 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('aa3c7527-7357-42c2-873d-f299c6fe8be8', 'E69D7EF7-1522-48EE-B162-0E38D7E9A5EE', 3, 'Retired', 'Retired', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID E69D7EF7-1522-48EE-B162-0E38D7E9A5EE */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='E69D7EF7-1522-48EE-B162-0E38D7E9A5EE';

/* SQL text to insert entity field value with ID 81e5ee41-b1f8-42ee-8ea4-0b14deb2fe77 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('81e5ee41-b1f8-42ee-8ea4-0b14deb2fe77', '00D639F8-A9C7-4C05-A834-2B359B096BE3', 1, 'Active', 'Active', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 5c594829-5ae1-40b6-b86b-d20f92e2bd39 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('5c594829-5ae1-40b6-b86b-d20f92e2bd39', '00D639F8-A9C7-4C05-A834-2B359B096BE3', 2, 'Inactive', 'Inactive', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 00D639F8-A9C7-4C05-A834-2B359B096BE3 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='00D639F8-A9C7-4C05-A834-2B359B096BE3';

/* SQL text to insert entity field value with ID c8a6baad-e1cc-4d56-b007-706133ba3497 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('c8a6baad-e1cc-4d56-b007-706133ba3497', '59D5C49F-C0F7-44F6-99C3-2290BD376411', 1, 'Attestation', 'Attestation', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 5d225dff-2ba3-43b1-b852-9e9fddc41a6c */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('5d225dff-2ba3-43b1-b852-9e9fddc41a6c', '59D5C49F-C0F7-44F6-99C3-2290BD376411', 2, 'Composite', 'Composite', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID f3750149-3208-48c2-be15-cf12ffff663d */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('f3750149-3208-48c2-be15-cf12ffff663d', '59D5C49F-C0F7-44F6-99C3-2290BD376411', 3, 'Evidence', 'Evidence', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 3cc5dc49-066b-4c3f-a677-8eeae446f4b4 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('3cc5dc49-066b-4c3f-a677-8eeae446f4b4', '59D5C49F-C0F7-44F6-99C3-2290BD376411', 4, 'Narrative', 'Narrative', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 59D5C49F-C0F7-44F6-99C3-2290BD376411 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='59D5C49F-C0F7-44F6-99C3-2290BD376411';

/* SQL text to insert entity field value with ID 0db7091c-2c60-49e6-a992-f3d4c94404b2 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('0db7091c-2c60-49e6-a992-f3d4c94404b2', 'FF11F73A-6F5B-4592-8465-596A932BF881', 1, 'Locate', 'Locate', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID e0058384-59a4-4850-a038-c975129330f2 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('e0058384-59a4-4850-a038-c975129330f2', 'FF11F73A-6F5B-4592-8465-596A932BF881', 2, 'Manual', 'Manual', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 36a32500-9090-4d6d-9bbe-2b350b12a512 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('36a32500-9090-4d6d-9bbe-2b350b12a512', 'FF11F73A-6F5B-4592-8465-596A932BF881', 3, 'Prefill', 'Prefill', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID FF11F73A-6F5B-4592-8465-596A932BF881 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='FF11F73A-6F5B-4592-8465-596A932BF881';

/* SQL text to insert entity field value with ID f33087df-f4af-433c-b2ad-055a4dd60d71 */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('f33087df-f4af-433c-b2ad-055a4dd60d71', '05E6F0E2-6F48-41E0-B956-611507FCB211', 1, 'AI Assisted', 'AI Assisted', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 0fdad210-04c7-4258-9267-d65d0119e69d */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('0fdad210-04c7-4258-9267-d65d0119e69d', '05E6F0E2-6F48-41E0-B956-611507FCB211', 2, 'AI Automated', 'AI Automated', GETUTCDATE(), GETUTCDATE());

/* SQL text to insert entity field value with ID 15142690-fa3a-4a0f-8d9b-fac7d831f5ed */
INSERT INTO [${mjSchema}].[EntityFieldValue]
                                       ([ID], [EntityFieldID], [Sequence], [Value], [Code], [__mj_CreatedAt], [__mj_UpdatedAt])
                                    VALUES
                                       ('15142690-fa3a-4a0f-8d9b-fac7d831f5ed', '05E6F0E2-6F48-41E0-B956-611507FCB211', 3, 'Human Only', 'Human Only', GETUTCDATE(), GETUTCDATE());

/* SQL text to update ValueListType for entity field ID 05E6F0E2-6F48-41E0-B956-611507FCB211 */
UPDATE [${mjSchema}].[EntityField] SET ValueListType='List' WHERE ID='05E6F0E2-6F48-41E0-B956-611507FCB211';

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


/* Create Entity Relationship: MJ_BizApps_Credentialing: Sections -> MJ_BizApps_Credentialing: Standards (One To Many via SectionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '2a283771-3dd1-4794-a2b3-42556c7a2b1e' OR ([EntityID] = '4D33D968-283C-4319-BE94-3C4A92765D32' AND [RelatedEntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND [RelatedEntityJoinField] = 'SectionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('2a283771-3dd1-4794-a2b3-42556c7a2b1e', '4D33D968-283C-4319-BE94-3C4A92765D32', '19EE159D-FECA-4A61-AC76-E5AA25D47F61', 'SectionID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: Committees: Committees -> MJ_BizApps_Credentialing: Program Versions (One To Many via CommitteeID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'e530adde-fd60-47b5-8423-c25c28507950' OR ([EntityID] = 'A5DA88A1-AA21-4A3F-B1C4-42652FB440CE' AND [RelatedEntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND [RelatedEntityJoinField] = 'CommitteeID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('e530adde-fd60-47b5-8423-c25c28507950', 'A5DA88A1-AA21-4A3F-B1C4-42652FB440CE', '41A97EC2-F553-49F3-B867-BE4D31B030DF', 'CommitteeID', 'One To Many', 1, 1, 7, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Programs -> MJ_BizApps_Credentialing: Program Versions (One To Many via ProgramID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '36df448b-b79b-4949-8ac2-b7fcb9a543f7' OR ([EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29' AND [RelatedEntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND [RelatedEntityJoinField] = 'ProgramID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('36df448b-b79b-4949-8ac2-b7fcb9a543f7', 'D9911849-71AC-45FE-B827-515C2883DB29', '41A97EC2-F553-49F3-B867-BE4D31B030DF', 'ProgramID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Entities -> MJ_BizApps_Credentialing: Programs (One To Many via HostEntityID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '185a91af-b059-4e23-8a2c-07a25a5c89f1' OR ([EntityID] = 'E0238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29' AND [RelatedEntityJoinField] = 'HostEntityID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('185a91af-b059-4e23-8a2c-07a25a5c89f1', 'E0238F34-2837-EF11-86D4-6045BDEE16E6', 'D9911849-71AC-45FE-B827-515C2883DB29', 'HostEntityID', 'One To Many', 1, 1, 98, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ: Users -> MJ_BizApps_Credentialing: Organization Memberships (One To Many via UserID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'cfb4558f-f2fb-4105-ac6b-f826e0d88cae' OR ([EntityID] = 'E1238F34-2837-EF11-86D4-6045BDEE16E6' AND [RelatedEntityID] = '93036AD3-643B-434A-8FDC-8944894F857C' AND [RelatedEntityJoinField] = 'UserID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('cfb4558f-f2fb-4105-ac6b-f826e0d88cae', 'E1238F34-2837-EF11-86D4-6045BDEE16E6', '93036AD3-643B-434A-8FDC-8944894F857C', 'UserID', 'One To Many', 1, 1, 136, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ_BizApps_Common: Organizations -> MJ_BizApps_Credentialing: Accrediting Organizations (One To Many via OrganizationID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '60ef235c-1cc3-4886-b871-158aac16dd46' OR ([EntityID] = 'C70448F9-9792-41D7-A82C-784B66429D54' AND [RelatedEntityID] = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9' AND [RelatedEntityJoinField] = 'OrganizationID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('60ef235c-1cc3-4886-b871-158aac16dd46', 'C70448F9-9792-41D7-A82C-784B66429D54', 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9', 'OrganizationID', 'One To Many', 1, 1, 7, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Program Versions -> MJ_BizApps_Credentialing: Sections (One To Many via ProgramVersionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '3b849bb8-6ab2-4096-b97c-9b2a966362df' OR ([EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND [RelatedEntityID] = '4D33D968-283C-4319-BE94-3C4A92765D32' AND [RelatedEntityJoinField] = 'ProgramVersionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('3b849bb8-6ab2-4096-b97c-9b2a966362df', '41A97EC2-F553-49F3-B867-BE4D31B030DF', '4D33D968-283C-4319-BE94-3C4A92765D32', 'ProgramVersionID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Program Versions -> MJ_BizApps_Credentialing: Document Requirements (One To Many via ProgramVersionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = '54c3dbbc-0003-4424-aff2-89a1bf1a7ed6' OR ([EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND [RelatedEntityID] = 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4' AND [RelatedEntityJoinField] = 'ProgramVersionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('54c3dbbc-0003-4424-aff2-89a1bf1a7ed6', '41A97EC2-F553-49F3-B867-BE4D31B030DF', 'BABFF154-DDF1-4DD8-AAFA-3EB86DBBE5C4', 'ProgramVersionID', 'One To Many', 1, 1, 2, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Program Versions -> MJ_BizApps_Credentialing: Program Versions (One To Many via ClonedFromVersionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'ff1f0aed-3d96-44ba-a0ca-17fa2bcd6678' OR ([EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND [RelatedEntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND [RelatedEntityJoinField] = 'ClonedFromVersionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('ff1f0aed-3d96-44ba-a0ca-17fa2bcd6678', '41A97EC2-F553-49F3-B867-BE4D31B030DF', '41A97EC2-F553-49F3-B867-BE4D31B030DF', 'ClonedFromVersionID', 'One To Many', 1, 1, 3, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Program Versions -> MJ_BizApps_Credentialing: Standards (One To Many via ProgramVersionID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'ea4f6aa5-b3cc-4502-8595-17c88e81e648' OR ([EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND [RelatedEntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND [RelatedEntityJoinField] = 'ProgramVersionID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('ea4f6aa5-b3cc-4502-8595-17c88e81e648', '41A97EC2-F553-49F3-B867-BE4D31B030DF', '19EE159D-FECA-4A61-AC76-E5AA25D47F61', 'ProgramVersionID', 'One To Many', 1, 1, 4, GETUTCDATE(), GETUTCDATE())
   END;


/* Create Entity Relationship: MJ_BizApps_Credentialing: Accrediting Organizations -> MJ_BizApps_Credentialing: Programs (One To Many via AccreditingOrganizationID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'b2b272ce-aac2-4e88-83a0-e89f519738c6' OR ([EntityID] = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9' AND [RelatedEntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29' AND [RelatedEntityJoinField] = 'AccreditingOrganizationID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('b2b272ce-aac2-4e88-83a0-e89f519738c6', 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9', 'D9911849-71AC-45FE-B827-515C2883DB29', 'AccreditingOrganizationID', 'One To Many', 1, 1, 1, GETUTCDATE(), GETUTCDATE())
   END;
                    
/* Create Entity Relationship: MJ_BizApps_Credentialing: Accrediting Organizations -> MJ_BizApps_Credentialing: Organization Memberships (One To Many via AccreditingOrganizationID) */
   IF NOT EXISTS (
      SELECT 1 FROM [${mjSchema}].[EntityRelationship] WHERE [ID] = 'e50b46bd-9ee4-4636-a6fb-d9da184baf29' OR ([EntityID] = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9' AND [RelatedEntityID] = '93036AD3-643B-434A-8FDC-8944894F857C' AND [RelatedEntityJoinField] = 'AccreditingOrganizationID')
   )
   BEGIN
      INSERT INTO [${mjSchema}].[EntityRelationship] ([ID], [EntityID], [RelatedEntityID], [RelatedEntityJoinField], [Type], [BundleInAPI], [DisplayInForm], [Sequence], [__mj_CreatedAt], [__mj_UpdatedAt])
                    VALUES ('e50b46bd-9ee4-4636-a6fb-d9da184baf29', 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9', '93036AD3-643B-434A-8FDC-8944894F857C', 'AccreditingOrganizationID', 'One To Many', 1, 1, 2, GETUTCDATE(), GETUTCDATE())
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

/* SQL text to update entity field related entity name field map for entity field ID 0466D68C-801C-4CFB-A05E-A0F2E40F19B4 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='0466D68C-801C-4CFB-A05E-A0F2E40F19B4', @RelatedEntityNameFieldMap='Organization';

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

/* SQL text to update entity field related entity name field map for entity field ID D58DE060-C755-4761-B25B-35E2C5DC57BC */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='D58DE060-C755-4761-B25B-35E2C5DC57BC', @RelatedEntityNameFieldMap='AccreditingOrganization';

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

/* SQL text to update entity field related entity name field map for entity field ID F36E86CC-767D-4D1A-B1F8-FB7CD741EC28 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='F36E86CC-767D-4D1A-B1F8-FB7CD741EC28', @RelatedEntityNameFieldMap='Program';

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

/* SQL text to update entity field related entity name field map for entity field ID 1289638D-B7C9-48B5-A1EE-628E324AAD7C */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='1289638D-B7C9-48B5-A1EE-628E324AAD7C', @RelatedEntityNameFieldMap='AccreditingOrganization';

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

/* SQL text to update entity field related entity name field map for entity field ID 23A99C1C-542D-4550-B592-47BE82C3F804 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='23A99C1C-542D-4550-B592-47BE82C3F804', @RelatedEntityNameFieldMap='Section';

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
GRANT SELECT ON [${flyway:defaultSchema}].[vwDocumentRequirements] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Document Requirements */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Document Requirements
-- Item: Permissions for vwDocumentRequirements
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwDocumentRequirements] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

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
GRANT SELECT ON [${flyway:defaultSchema}].[vwSections] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Sections */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Sections
-- Item: Permissions for vwSections
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwSections] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

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

/* SQL text to update entity field related entity name field map for entity field ID 5ED010CB-DB3A-451C-B633-182741A2128C */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='5ED010CB-DB3A-451C-B633-182741A2128C', @RelatedEntityNameFieldMap='User';

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
GRANT SELECT ON [${flyway:defaultSchema}].[vwAccreditingOrganizations] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Accrediting Organizations */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
-- Item: Permissions for vwAccreditingOrganizations
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwAccreditingOrganizations] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

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

/* SQL text to update entity field related entity name field map for entity field ID 660643AE-1D38-426D-BB23-0DB0FE043429 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='660643AE-1D38-426D-BB23-0DB0FE043429', @RelatedEntityNameFieldMap='Committee';

/* SQL text to update entity field related entity name field map for entity field ID F12C8EB3-B105-466A-8263-AC649A833067 */
EXEC [${mjSchema}].[spUpdateEntityFieldRelatedEntityNameFieldMap] @EntityFieldID='F12C8EB3-B105-466A-8263-AC649A833067', @RelatedEntityNameFieldMap='HostEntity';

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
GRANT SELECT ON [${flyway:defaultSchema}].[vwStandards] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Standards */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Standards
-- Item: Permissions for vwStandards
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwStandards] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

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
GRANT SELECT ON [${flyway:defaultSchema}].[vwOrganizationMemberships] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Organization Memberships */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Organization Memberships
-- Item: Permissions for vwOrganizationMemberships
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwOrganizationMemberships] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

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
GRANT SELECT ON [${flyway:defaultSchema}].[vwProgramVersions] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Program Versions */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Program Versions
-- Item: Permissions for vwProgramVersions
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwProgramVersions] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

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
GRANT SELECT ON [${flyway:defaultSchema}].[vwPrograms] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

/* Base View Permissions SQL for MJ_BizApps_Credentialing: Programs */
-----------------------------------------------------------------
-- SQL Code Generation
-- Entity: MJ_BizApps_Credentialing: Programs
-- Item: Permissions for vwPrograms
--
-- This was generated by the MemberJunction CodeGen tool.
-- This file should NOT be edited by hand.
-----------------------------------------------------------------

GRANT SELECT ON [${flyway:defaultSchema}].[vwPrograms] TO [cdp_UI], [cdp_Developer], [cdp_Integration];

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

/* SQL text to insert 8 new entity field(s) */

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '39f27017-163f-42bf-b1d8-6e1c17d5d872' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'AccreditingOrganization')) BEGIN
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
            '39f27017-163f-42bf-b1d8-6e1c17d5d872',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'c1748191-0796-48b2-877c-04de9212cc82' OR (EntityID = 'D9911849-71AC-45FE-B827-515C2883DB29' AND Name = 'HostEntity')) BEGIN
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
            'c1748191-0796-48b2-877c-04de9212cc82',
            'D9911849-71AC-45FE-B827-515C2883DB29', -- Entity: MJ_BizApps_Credentialing: Programs
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'D9911849-71AC-45FE-B827-515C2883DB29'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = 'f9e81c25-74b4-410a-9e66-716f3054c528' OR (EntityID = '93036AD3-643B-434A-8FDC-8944894F857C' AND Name = 'AccreditingOrganization')) BEGIN
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
            'f9e81c25-74b4-410a-9e66-716f3054c528',
            '93036AD3-643B-434A-8FDC-8944894F857C', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '93036AD3-643B-434A-8FDC-8944894F857C'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '120b654c-627e-4a34-b15e-3d9e58405b4a' OR (EntityID = '93036AD3-643B-434A-8FDC-8944894F857C' AND Name = 'User')) BEGIN
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
            '120b654c-627e-4a34-b15e-3d9e58405b4a',
            '93036AD3-643B-434A-8FDC-8944894F857C', -- Entity: MJ_BizApps_Credentialing: Organization Memberships
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '93036AD3-643B-434A-8FDC-8944894F857C'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '44797f8f-bc04-414c-8c72-fd5ba5ec06b4' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'Program')) BEGIN
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
            '44797f8f-bc04-414c-8c72-fd5ba5ec06b4',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '4da4193b-7acc-4330-8b3b-f0c9bf29f33e' OR (EntityID = '41A97EC2-F553-49F3-B867-BE4D31B030DF' AND Name = 'Committee')) BEGIN
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
            '4da4193b-7acc-4330-8b3b-f0c9bf29f33e',
            '41A97EC2-F553-49F3-B867-BE4D31B030DF', -- Entity: MJ_BizApps_Credentialing: Program Versions
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '41A97EC2-F553-49F3-B867-BE4D31B030DF'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '06bc1922-d14c-49f1-9688-5278e970bba0' OR (EntityID = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9' AND Name = 'Organization')) BEGIN
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
            '06bc1922-d14c-49f1-9688-5278e970bba0',
            'AF17C193-76EF-4B44-9DB2-CACD2F653BA9', -- Entity: MJ_BizApps_Credentialing: Accrediting Organizations
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = 'AF17C193-76EF-4B44-9DB2-CACD2F653BA9'),
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

      IF NOT EXISTS (SELECT 1 FROM [${mjSchema}].[EntityField] WHERE ID = '2dba2b31-a521-442c-886b-6e53a0d57e9f' OR (EntityID = '19EE159D-FECA-4A61-AC76-E5AA25D47F61' AND Name = 'Section')) BEGIN
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
            '2dba2b31-a521-442c-886b-6e53a0d57e9f',
            '19EE159D-FECA-4A61-AC76-E5AA25D47F61', -- Entity: MJ_BizApps_Credentialing: Standards
            (SELECT COALESCE(MAX([Sequence]), 0) + 1 FROM [${mjSchema}].[EntityField] WHERE [EntityID] = '19EE159D-FECA-4A61-AC76-E5AA25D47F61'),
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

