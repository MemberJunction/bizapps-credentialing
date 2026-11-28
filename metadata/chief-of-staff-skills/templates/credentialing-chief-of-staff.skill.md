# Credentialing & Accreditation

The **BizApps Credentialing** Open App is installed in this environment. Use this skill whenever the user asks about accreditation, certification, licensure, or recognition programs; active program versions and standards; applicant subjects; application progress; evidence documents and extractions; or review/committee/executive sign-off readiness.

## 1. Access Control & Data Reading Rules

- **Always query through `RunView` (or typed entity reads) under the caller's `contextUser`. Never execute raw SQL.**
- Credentialing enforces strict **role- and organization/subject-scoped Row-Level Security (RLS)**:
  - **Credentialing Staff** (`Credentialing: Staff Organizations`, `Credentialing: Staff Subjects`, `Credentialing: Staff Rows By Subject`): sees only `MJ_BizApps_Credentialing: Accrediting Organizations` where the caller has a `MJ_BizApps_Credentialing: Organization Memberships` row (`UserID = caller`), and only subjects, applications, standard responses, citations, evidence documents, attestations, application documents, and extractions belonging to those organizations.
  - **Credentialing Applicant** (`Credentialing: Applicant Subjects`, `Credentialing: Applicant Rows By Subject`): sees only `MJ_BizApps_Credentialing: Subjects` where the caller is listed in `MJ_BizApps_Credentialing: Subject Contacts` (`UserID = caller`), and only rows tied to those `SubjectID`s. Applicants never see other subjects' applications or evidence, nor another accrediting organization's data.
- **Never bridge or summarize records across accrediting organizations or unrelated subjects.** Report strictly what `RunView` returns for the active user.

## 2. Core Entities & Key Fields

| Entity | Meaning | Key Fields & Values |
| --- | --- | --- |
| `MJ_BizApps_Credentialing: Accrediting Organizations` | Bodies administering credential programs | `OrganizationID`, `Name`, `Description`, `Status` (`'Active'`, `'Inactive'`) |
| `MJ_BizApps_Credentialing: Organization Memberships` | Staff membership linking a user to an accrediting organization | `AccreditingOrganizationID`, `UserID` |
| `MJ_BizApps_Credentialing: Programs` | Credential, accreditation, license, or recognition programs | `AccreditingOrganizationID`, `Name`, `ProgramType` (`'Accreditation'`, `'Certification'`, `'License'`, `'Recognition'`), `SubjectType` (`'Organization'`, `'Person'`), `SubjectNoun`, `CredentialPrefix`, `Status` (`'Active'`, `'Retired'`) |
| `MJ_BizApps_Credentialing: Program Versions` | Versioned standard sets & governance settings | `ProgramID`, `Label`, `Status` (`'Draft'`, `'Active'`, `'Retired'`), `CommitteeID`, `PeerReviewerCount`, `PassiveApprovalWindowDays`, `RequiresScreening`, `RequiresExecutiveApproval`, `RequiresGoverningBodyAttestation`, `AutoCarryForwardOnRenewal` |
| `MJ_BizApps_Credentialing: Sections` & `MJ_BizApps_Credentialing: Standards` | Structured compliance sections and individual standards | `ProgramVersionID`, `SectionID`, `Number`, `Code`, `Statement`, `Guidance`, `ResponseType` (`'Attestation'`, `'Composite'`, `'Evidence'`, `'Narrative'`), `IntakeMode` (`'Locate'`, `'Manual'`, `'Prefill'`), `EvaluationMode` (`'AI Assisted'`, `'AI Automated'`, `'Human Only'`), `IsEligibility`, `Sequence` |
| `MJ_BizApps_Credentialing: Document Requirements` & `MJ_BizApps_Credentialing: Response Sources` | Required evidence artifacts and extraction bindings per standard | `ProgramVersionID`, `Name`, `IsRequired`, `SensitivityPolicy` (`'Normal'`, `'Restricted Allowed'`), `Mode` (`'Both'`, `'Prefill Only'`, `'Verify Only'`), `Rank` |
| `MJ_BizApps_Credentialing: Subjects` & `MJ_BizApps_Credentialing: Subject Contacts` | Organizations or individuals applying for/holding credentials and their authorized user contacts | `AccreditingOrganizationID`, `SubjectType`, `DisplayName`, `PrimaryEmail`, `Status` (`'Active'`, `'Inactive'`), `ContactRole` (`'Primary'`, `'Staff'`) |
| `MJ_BizApps_Credentialing: Applications` | A subject's application against a program version | `SubjectID`, `ProgramVersionID`, `Status` (`'Draft'`, `'Submitted'`, `'Screening'`, `'Info Requested'`, `'In Review'`, `'Committee'`, `'Executive Sign-Off'`, `'Decided'`, `'Closed'`, `'Withdrawn'`), `IsHistorical`, `SubmittedAt`, `AttestationOfficerName`, `AttestedAt`, `WithdrawnAt`, `WithdrawalReason` |
| `MJ_BizApps_Credentialing: Standard Responses` | Per-standard answers and self-assessments on an application | `ApplicationID`, `StandardID`, `SubjectID`, `ResponseText`, `SelfAssessment` (`'Met'`, `'Partially Met'`, `'Not Met'`), `Status` (`'Empty'`, `'Prefilled'`, `'Located'`, `'Drafted'`, `'Flagged'`, `'Confirmed'`), `AuthorType` (`'Agent'`, `'Human'`), `IsStale` |
| `MJ_BizApps_Credentialing: Evidence Documents` & `MJ_BizApps_Credentialing: Document Attestations` & `MJ_BizApps_Credentialing: Application Documents` | Uploaded evidence files, attestations, and submission-frozen document snapshots | `SubjectID`, `DocumentRequirementID`, `FileName`, `TextStatus`, `ReadingStatus` (`'Pending'`, `'Running'`, `'Complete'`, `'Failed'`, `'Could Not Run'`, `'Not Applicable'`), `Status` (`'Current'`, `'Confirm Current'`, `'Superseded'`), `FrozenAt` |
| `MJ_BizApps_Credentialing: Extractions` & `MJ_BizApps_Credentialing: Response Citations` | AI-extracted evidence values and cited excerpts supporting responses | `EvidenceDocumentID`, `StandardID`, `SubjectID`, `Value`, `Excerpt`, `Confidence`, `Status` (`'Proposed'`, `'Accepted'`, `'Rejected'`), `IsSuperseded` |

## 3. Common Chief of Staff Workflows

1. **Application pipeline & bottleneck summary (Staff view — "What applications need attention?"):**
   - Query `MJ_BizApps_Credentialing: Applications` with `IsHistorical = 0` and `Status NOT IN ('Closed', 'Withdrawn')`, batched via `RunViews` with `MJ_BizApps_Credentialing: Subjects` and `MJ_BizApps_Credentialing: Program Versions`.
   - Group by `Status` (`'Screening'`, `'Info Requested'`, `'In Review'`, `'Committee'`, `'Executive Sign-Off'`), call out pending submissions or stalled reviews, and note linked governance committees (`ProgramVersion.CommitteeID`) when BizApps Committees is installed.
2. **Application readiness & missing evidence check (Applicant or Staff — "What's left before submitting?"):**
   - For a `Draft` or `Info Requested` application, batch-query `MJ_BizApps_Credentialing: Standard Responses`, `MJ_BizApps_Credentialing: Document Requirements`, `MJ_BizApps_Credentialing: Evidence Documents` (`Status IN ('Current', 'Confirm Current')`), and `MJ_BizApps_Credentialing: Document Attestations` (`IsSuperseded = 0`).
   - Highlight responses still `'Empty'`, `'Flagged'`, `'Prefilled'`/`'Drafted'` (not yet `'Confirmed'`), or `IsStale = 1`, plus any required documents missing or with `ReadingStatus IN ('Failed', 'Could Not Run')`.
3. **Evidence extraction review ("What did AI find in our uploaded docs?"):**
   - Query `MJ_BizApps_Credentialing: Extractions` (`IsSuperseded = 0`, `Status = 'Proposed'`) alongside `MJ_BizApps_Credentialing: Standards` and `MJ_BizApps_Credentialing: Evidence Documents` to surface proposed citations and confidence scores for human confirmation.
   - Never submit an application, record an officer attestation, or finalize a credentialing decision without explicit human approval.
