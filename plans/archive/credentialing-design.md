> **Superseded 2026-09-09** by [`plans/active/credentialing-frd.md`](../active/credentialing-frd.md), the Functional Requirements Document. Retained for history; do not build from it.

# BizApps Credentialing — Domain Design (first pass)

**Status:** Proposal for team review. No tables, entities, or migrations exist yet; this document is the deliverable for the domain.
**Date:** 2026-09-09

## 1. Problem statement

Credentialing for associations and non-profits covers a wide variety of domains and requirements, but the underlying mechanisms remain structurally similar. This includes member certifications, which represent a designation earned by exam and maintained by continuous education (CE) cycles. It also covers professional licenses tracked on behalf of members, where organizations need to monitor when state or federal licenses expire and require renewal. Additionally, it encompasses continuing-education requirements with specific hour targets or credit allocations per cycle, volunteer background checks that have strict validity periods and expiration dates, and internal staff compliance training. 

The common shape across all five of these scenarios includes a *definition* of what the credential is and what it takes to earn and keep it; an *instance* held by a person, with a structured lifecycle (pending, active, expired, suspended, revoked, renewal due); *evidence* proving requirements were met (e.g., transcripts, exam scores); *verification* by staff or a third party; *renewal* on a predictable cycle; and a strict *audit trail* for compliance and legal reasons.

Today, each MJ application reinvents these tables and workflows. Organizations end up building custom tables for CE hours, background checks, and certifications, duplicating logic for expiry warnings, status transitions, and renewal processes. They struggle to handle complex workflows like exam tracking where members must pass standardized tests, intensive audits where random subsets of users are selected to prove their claims, continuing education cycles with overlapping or rolling dates, and stringent compliance deadlines where access or employment depends on active credentials. 

The current landscape causes massive fragmentation. Integrating learning management systems (LMS), testing centers, or professional registries is often a custom exercise every time, tightly coupled to a single use-case implementation. This creates a maintenance burden, increases the likelihood of compliance failures, and leads to an inconsistent user experience for association members who hold multiple credentials across different organizational departments.

Furthermore, there is a strong need to track evidence submissions systematically and provide auditability. When a member's credential is under review or audit, the association staff must be able to securely verify the exact documentation uploaded, track who reviewed it, when it was approved or rejected, and ensure that no data is permanently deleted. This makes the storage and verification of credentials incredibly high-stakes, yet typically underserved by simple text fields and ad-hoc file attachments.

BizApps Credentialing provides the thin, reusable primitive layer designed to handle all these scenarios natively, in the same spirit as `bizapps-tasks` and `bizapps-issues`. By providing a centralized abstraction for defining, tracking, and verifying credentials, consuming applications can avoid boilerplate data models and instead rely on robust, tested hooks for renewals, evidence submission, and compliance monitoring.

## 2. How it fits

```text
bizapps-common          People, Organizations, Addresses               __mj_BizAppsCommon
      ▲
bizapps-tasks           Tasks, Task Types (action hooks), Task Links   __mj_BizAppsTasks
      ▲
bizapps-credentialing   Credential Types, Requirements, Credentials,   __mj_BizAppsCredentialing   ◄── this app
                        Evidence, Verifications, Activity, hooks
      ▲
Consuming apps          Member portals, LMS integrations, registries
```

A Credential is the *record*; renewals and verification reviews are the *work*, and the work is `Task` records from bizapps-tasks linked back through `TaskLink` (EntityID = the Credentials entity, RecordID = the credential's ID). Holders and issuing bodies are `Person` and `Organization` rows from bizapps-common, referenced by UNIQUEIDENTIFIER FKs.

## 3. Proposed core entities

CodeGen owns `__mj_CreatedAt` / `__mj_UpdatedAt` and FK indexes for all tables below.

### 3.1 CredentialType

This entity defines the overarching rules and metadata for a specific type of credential. It dictates whether a credential expires, how long it is valid, and the window during which renewals are allowed. It serves as the blueprint for instances held by people, standardizing how consuming applications reference a credential across the system. 

- `ID UNIQUEIDENTIFIER PK DEFAULT NEWSEQUENTIALID()`
- `Name NVARCHAR(200)`
- `Code NVARCHAR(50) UNIQUE` (stable machine code for cross-app metadata references, as TaskType.Code)
- `Description NVARCHAR(MAX) NULL`
- `Category NVARCHAR(50) CHECK IN ('Certification','License','Designation','Clearance','Training')`
- `IssuingOrganizationID UNIQUEIDENTIFIER FK → __mj_BizAppsCommon.Organization`
- `IsExpiring BIT NOT NULL DEFAULT 0`
- `ValidityMonths INT NULL`
- `RenewalWindowDays INT NULL` (how long before expiry a renewal becomes due)
- `RequiresVerification BIT NOT NULL DEFAULT 0`
- `CredentialNumberFormat NVARCHAR(100) NULL`
- `IconClass NVARCHAR(100) NULL`
- `IsActive BIT NOT NULL DEFAULT 1`

Hook columns per §3.9.

### 3.2 CredentialStatus

This entity holds the dynamic statuses per credential type, allowing organizations to configure custom workflows while maintaining platform compatibility. It mirrors the `TaskTypeStatus` and `IssueStatus` pattern, ensuring that generic machinery (dashboards, expiry jobs) can read the standardized `MacroStatus` while the UI displays the domain-specific status name to users. By defining `OnEnterActionID` and `OnExitActionID`, status transitions can trigger complex behaviors automatically.

- `ID UNIQUEIDENTIFIER PK DEFAULT NEWSEQUENTIALID()`
- `CredentialTypeID UNIQUEIDENTIFIER FK (ON DELETE CASCADE)`
- `Name NVARCHAR(100)`
- `Code NVARCHAR(50)`
- `MacroStatus NVARCHAR(20) CHECK IN ('Pending','Active','RenewalDue','Expired','Suspended','Revoked')`
- `Sequence INT`
- `IsDefault BIT NOT NULL DEFAULT 0`
- `IsTerminal BIT NOT NULL DEFAULT 0`
- `Color NVARCHAR(50) NULL`
- `IconClass NVARCHAR(100) NULL`
- `OnEnterActionID UNIQUEIDENTIFIER FK → __mj.[Action] NULL`
- `OnExitActionID UNIQUEIDENTIFIER FK → __mj.[Action] NULL`
- `IsActive BIT NOT NULL DEFAULT 1`

Unique constraints: `(CredentialTypeID, Code)` and `(CredentialTypeID, Name)`.

### 3.3 CredentialRequirement

This entity specifies the conditions that must be satisfied to either earn or renew a credential. Requirements can represent continuing education hours, passing an exam, paying a fee, or holding a prerequisite credential. It is intentionally polymorphic only where it earns its keep: a prerequisite points directly to a typed foreign key, while documents are resolved through the `CredentialEvidence` table.

- `ID UNIQUEIDENTIFIER PK DEFAULT NEWSEQUENTIALID()`
- `CredentialTypeID UNIQUEIDENTIFIER FK`
- `Name NVARCHAR(200)`
- `Description NVARCHAR(MAX) NULL`
- `AppliesTo NVARCHAR(20) CHECK IN ('Issue', 'Renewal', 'Both')`
- `RequirementKind NVARCHAR(30) CHECK IN ('ContinuingEducationHours','PrerequisiteCredential','Exam','Fee','Document','Attestation','Other')`
- `QuantityRequired DECIMAL(9,2) NULL` (hours, count)
- `PrerequisiteCredentialTypeID UNIQUEIDENTIFIER FK NULL` (self-join on CredentialType for the prerequisite kind)
- `IsRequired BIT NOT NULL DEFAULT 1`
- `Sequence INT`
- `IsActive BIT NOT NULL DEFAULT 1`

### 3.4 Credential

This is the core instance of a credential held by a person. It tracks the lifecycle of an individual's certification, clearance, or license from issuance through expiration and renewal. It is heavily integrated with the platform via `PersonID` and syncs its `Status` field directly with the dynamic domain statuses to ensure fast querying and filtering.

- `ID UNIQUEIDENTIFIER PK DEFAULT NEWSEQUENTIALID()`
- `CredentialTypeID UNIQUEIDENTIFIER FK`
- `PersonID UNIQUEIDENTIFIER FK → __mj_BizAppsCommon.Person`
- `CredentialStatusID UNIQUEIDENTIFIER FK NULL` (domain status)
- `Status NVARCHAR(20)` (denormalized macro status, kept in sync server-side exactly as `Task.Status` is)
- `CredentialNumber NVARCHAR(100) NULL`
- `IssuingOrganizationID UNIQUEIDENTIFIER FK → __mj_BizAppsCommon.Organization NULL` (defaults from the type; overridable for third-party-issued credentials)
- `IssuedAt DATE NULL`
- `ExpiresAt DATE NULL`
- `LastVerifiedAt DATETIMEOFFSET NULL`
- `RenewalDueAt DATE NULL` (computed by server logic from ExpiresAt and RenewalWindowDays)
- `Notes NVARCHAR(MAX) NULL`

Unique constraint: `(CredentialTypeID, CredentialNumber)` filtered where number is not null; whether numbers are globally unique is an open question (§5).

### 3.5 CredentialRequirementFulfillment

This entity tracks a person's progress against the requirements needed to earn or renew a credential. It records partial progress, such as completed CE hours towards a target, and establishes whether a given requirement has been fully satisfied for a specific cycle. This separation allows the system to handle multi-step compliance efficiently.

- `ID UNIQUEIDENTIFIER PK DEFAULT NEWSEQUENTIALID()`
- `CredentialID UNIQUEIDENTIFIER FK`
- `CredentialRequirementID UNIQUEIDENTIFIER FK`
- `QuantityCompleted DECIMAL(9,2) NOT NULL DEFAULT 0`
- `IsSatisfied BIT NOT NULL DEFAULT 0`
- `SatisfiedAt DATETIMEOFFSET NULL`
- `CycleStartsAt DATE NULL` (for CE cycles)
- `CycleEndsAt DATE NULL` (for CE cycles)

Unique constraint: `(CredentialID, CredentialRequirementID, CycleStartsAt)`.

### 3.6 CredentialEvidence

This entity stores the uploaded proof or documentation linked to a specific requirement, such as transcripts, exam results, or receipts. It ties directly into the core `__mj.[File]` storage system to handle large files and provides a review workflow so staff can approve or reject the submitted evidence.

- `ID UNIQUEIDENTIFIER PK DEFAULT NEWSEQUENTIALID()`
- `CredentialID UNIQUEIDENTIFIER FK`
- `CredentialRequirementID UNIQUEIDENTIFIER FK NULL`
- `Name NVARCHAR(200)`
- `EvidenceKind NVARCHAR(30) CHECK IN ('Document','Transcript','ExamResult','Receipt','Attestation','Other')`
- `FileID UNIQUEIDENTIFIER FK → __mj.[File] NULL` (MJ core file storage, as bizapps-common's ActivityFile does)
- `ExternalURL NVARCHAR(1000) NULL`
- `SubmittedByPersonID UNIQUEIDENTIFIER FK → __mj_BizAppsCommon.Person NULL`
- `SubmittedAt DATETIMEOFFSET NOT NULL`
- `QuantityClaimed DECIMAL(9,2) NULL`
- `ReviewStatus NVARCHAR(20) CHECK IN ('Submitted','Accepted','Rejected')`
- `ReviewedByPersonID UNIQUEIDENTIFIER FK NULL`
- `ReviewedAt DATETIMEOFFSET NULL`
- `ReviewNotes NVARCHAR(MAX) NULL`

### 3.7 CredentialVerification

This entity captures the audit trail of who verified a credential, when the verification occurred, the method used, and the ultimate outcome. It is designed to cleanly accommodate future automated abstractions (e.g., a `CredentialVerificationProvider`) that can plug into third-party registries for automated primary-source verification without requiring structural schema changes.

- `ID UNIQUEIDENTIFIER PK DEFAULT NEWSEQUENTIALID()`
- `CredentialID UNIQUEIDENTIFIER FK`
- `VerifiedByPersonID UNIQUEIDENTIFIER FK → __mj_BizAppsCommon.Person NULL` (null for automated/third-party)
- `VerificationMethod NVARCHAR(30) CHECK IN ('Manual','PrimarySource','ThirdPartyRegistry','SelfAttested')`
- `VerifiedAt DATETIMEOFFSET NOT NULL`
- `Outcome NVARCHAR(20) CHECK IN ('Verified','NotVerified','Inconclusive')`
- `ProviderName NVARCHAR(200) NULL`
- `ProviderReference NVARCHAR(200) NULL`
- `Notes NVARCHAR(MAX) NULL`

### 3.8 CredentialActivity

This entity provides a server-authoritative audit log, ensuring complete traceability of all significant events in a credential's lifecycle. It mirrors the `TaskActivity` approach and is written exclusively by the server-side entity subclass in the `Save()` pipeline, ensuring clients cannot tamper with the historical record.

- `ID UNIQUEIDENTIFIER PK DEFAULT NEWSEQUENTIALID()`
- `CredentialID UNIQUEIDENTIFIER FK`
- `PersonID UNIQUEIDENTIFIER FK → __mj_BizAppsCommon.Person NULL`
- `ActivityType NVARCHAR(50) CHECK IN ('Created','Issued','StatusChange','Renewed','Expired','Suspended','Revoked','Verified','EvidenceSubmitted','EvidenceReviewed','RequirementSatisfied','NumberChanged','ExpiryChanged')`
- `PreviousValue NVARCHAR(500) NULL`
- `NewValue NVARCHAR(500) NULL`
- `Description NVARCHAR(MAX) NULL`

### 3.9 CredentialType action hooks

These define the programmable behavior of the credential system using the platform's action framework, allowing configurations to be purely declarative. They are not a separate table but rather nullable `On<Event>ActionID UNIQUEIDENTIFIER FK → __mj.[Action] (ID)` columns on `CredentialType`, mirroring how `TaskType` operates. 

- `OnIssueActionID UNIQUEIDENTIFIER FK NULL`
- `OnRenewActionID UNIQUEIDENTIFIER FK NULL`
- `OnRenewalDueActionID UNIQUEIDENTIFIER FK NULL`
- `OnExpireActionID UNIQUEIDENTIFIER FK NULL`
- `OnSuspendActionID UNIQUEIDENTIFIER FK NULL`
- `OnRevokeActionID UNIQUEIDENTIFIER FK NULL`
- `OnVerifyActionID UNIQUEIDENTIFIER FK NULL`

Null means no-op. Configuration is data (an `MJ: Actions` row plus the FK), so renewal reminders and follow-up tasks are declarative. Dispatch order in the server `Save()` pipeline is strict: capture context before write → sync `Status` from `CredentialStatus.MacroStatus` → write `CredentialActivity` → fire status `OnExit`, then `OnEnter`, then the type-level hook for the transition — the exact order that `bizapps-tasks` uses.

## 4. Explicit reuse decisions

- Renewal and verification work items are `Task` records from bizapps-tasks linked via `TaskLink` (EntityID = `MJ_BizApps_Credentialing: Credentials`, RecordID = Credential.ID). No credentialing task tables. A seeded `TaskType` with `Code = 'CREDENTIAL_RENEWAL'` (and `'CREDENTIAL_VERIFICATION'`) is created by this app's metadata, referenced by code, never by GUID. By deferring work item tracking to `bizapps-tasks`, we inherit assigning, tracking, and notification functionality without rebuilding it.
- Multi-reviewer approval of a credential application uses `TaskDecision` / `TaskDecisionOutcome` from bizapps-tasks rather than a credentialing decision table. This aligns with standard business app workflows and reduces duplication of approval abstractions.
- Holders are `Person`; issuing bodies are `Organization`; addresses of issuing bodies come via `AddressLink`. No credentialing person or org tables. `Person.LinkedUserID` is deprecated upstream and must not be used to find "my credentials"; use the platform's Person–User subtype binding. This enforces the single-source-of-truth model for people and organizations.
- Files go through MJ core file storage (`__mj.[File]`), not a credentialing blob table. This leverages the existing core security and infrastructure for file access.
- Application and intake forms: **open question** — `bizapps-forms` is a candidate dependency for credential applications and renewal submissions. It is deliberately not declared in `mj-app.json` yet; decide when the intake workflow is designed. If included, it eliminates building a custom multi-step intake wizard.
- Statuses are dynamic rows (`CredentialStatus`) with a fixed `MacroStatus` enum, never a CHECK-constraint-only list, so consuming organisations add stages without a migration. This ensures flexibility in domain-specific workflows while allowing global engine processes to predictably evaluate state transitions.

## 5. Open questions for the team

- **Continuing-education tracking depth**: Tracking hours per cycle only is simpler and faster to build, but activity-level records with provider and category fields allow for deeper auditing and transcript generation.
- **Multi-tenant issuing bodies**: Scoping `CredentialType` globally across an MJ instance keeps the schema unified, but scoping per Organization prevents tenant data bleeding if one MJ instance certifies for several competing organizations.
- **Public verification lookup**: Building an unauthenticated endpoint allows instant public registry verification, but it requires careful tokenization or anonymization to prevent data scraping and PII leaks.
- **Integration with external certification registries**: Implementing a pull model keeps the system authoritative locally but may cause drift, whereas pushing requires handling complex third-party API rate limits and error states.
- **Credential numbers uniqueness**: Enforcing global uniqueness ensures no collisions across the entire system, but per-type or per-issuing-organization uniqueness accurately reflects real-world scenarios where different boards use the same numbering sequence.
- **bizapps-forms dependency**: Making `bizapps-forms` a hard dependency provides rich intake capabilities immediately, but it tightly couples the primitive layer to a potentially heavy UI component that some simple integrations might not need.
- **Volunteer background checks**: Treating background checks as just another `CredentialType` category maximizes reuse of the expiry engine, but splitting them into a separate clearance app would allow for highly specialized data privacy controls required for sensitive legal records.

## 6. Phased build order

1. **Phase 1** — core entities and CRUD: CredentialType, CredentialStatus, CredentialRequirement, Credential, CredentialRequirementFulfillment; baseline migration; CodeGen; generated forms; seed statuses per type via metadata.
2. **Phase 2** — statuses and hooks: server-side `CredentialEntityServer.Save()` with status sync, `CredentialActivity`, and `CredentialType` hook dispatch; scheduled job that moves credentials to `RenewalDue`/`Expired` and fires hooks.
3. **Phase 3** — renewals via Tasks: seeded TaskTypes, TaskLink creation from hooks, "renewal due" Task generation, completion writes back to the credential. This phase connects the credential state machine with actual staff work queues.
4. **Phase 4** — verification and evidence: CredentialEvidence with MJ file storage, CredentialVerification, review workflow through Tasks/TaskDecision, provider abstraction seam. This establishes the evidence pipeline for proving CE or passing an audit.
5. **Phase 5** — UI: credential list, detail panel, edit panel, holder dashboard, "My Credentials"; each a standalone component emitting events; application nav items added per view. This caps off the domain layer with the primary user-facing portals.

## Conventions this design inherits

- `${flyway:defaultSchema}` for own objects and `${mjSchema}` for core in migrations.
- Sibling schemas literal in DDL.
- Allow-list CodeGen scoping (`@IncludedSchemaNames='${flyway:defaultSchema}'`).
- Hardcoded UUIDs for metadata rows.
- `sp_addextendedproperty` on every column.
- Additive-only changes within a major.
- One changeset (≥ minor) per migration-bearing PR.
