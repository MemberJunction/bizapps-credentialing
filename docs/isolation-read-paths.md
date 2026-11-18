# Isolation read paths (B1)

Every way a signed-in user can reach a credentialing row, and what keeps one accrediting
organization's data from another organization's staff and from the external roles
(`Credentialing Applicant`, `Credentialing Reviewer`, `Credentialing Committee`).

**Status for B1** is one of:

- **filtered by the platform** — MemberJunction applies the role's entity permission and row filter
  (`metadata/entity-permissions/`, `metadata/row-level-security-filters/`) on this path;
- **guarded by this app** — the credentialing server code refuses the request itself (entity
  subclasses in `packages/CoreEntitiesServer`, Task 6; remote operations, Task 7);
- **unreachable for external roles** — the external roles hold no permission row that opens the path.

**Proof** names the isolation probe case (`pnpm run probe:isolation`, `scripts/dev/probe-isolation.mjs`,
over MJAPI's HTTP and GraphQL surface as personas of `scripts/dev/personas.json`) or the
integration check (`CRD-05 - Isolation`, `cred-isolation.N`, server transport) that proves it.
Source references are to MemberJunction at tag `v6.2.2`.

| Read path | Staff of another organization | External roles | Proof |
|---|---|---|---|
| **RunView** (lists, grids, pickers, `RunViews`, the generated `Run…DynamicView` resolvers) | Filtered by the platform: the Read filter of the role's permission row is added to the view query (`mj/packages/GenericDatabaseProvider/src/GenericDatabaseProvider.ts:3219-3224`). A browser `ExtraFilter` that subqueries a row-filtered view is refused by MJAPI, so a filter cannot route around the row filter (docs/dev-instance.md, "Program Studio"). | Unreachable: no permission row on the seven entities, so the read is refused (`does not have read permissions`). | `cred-isolation.1`, `.4`, `.6`; probe **P1**, **P3** |
| **Platform entities that would expose people or organizations** (`MJ: Users`, `MJ: Entities`, Common `People` and `Organizations`) | Not granted to any credentialing role. | Unreachable (read refused). | probe **P2** |
| **Committee types** (`Committees: Types`, the list in the New committee form) | Not organization data: a catalog of kinds of committee (`Standing Committee`, `Workgroup`, …) shared by every organization. `Credentialing Staff` read all of it through the filter `Credentialing: Committee Type Catalog` (`(1 = 1)`, present so no grant outside this app's schema is unfiltered); no write. | Unreachable: no permission row (read refused). | `cred-isolation.8` |
| **Single-record load** (`BaseEntity.Load` / `InnerLoad`, the generated `mjBizAppsCredentialing<Entity>(ID)` resolver) | Filtered by the platform: the resolver checks read permission and appends the row filter (`packages/Server/src/generated/graphql-schemas/__mj_BizAppsCredentialing.ts`, e.g. the `mjBizAppsCredentialingProgram` query). Another organization's ID loads nothing, exactly like a nonexistent ID. | Unreachable (read refused). | `cred-isolation.2`; probe **P4** |
| **Record display name** (`GetEntityRecordName`, behind every link, breadcrumb and picker label) | Filtered by the platform: read permission is checked and the provider's lookup applies the user's read filter (`mj/packages/MJServer/src/resolvers/EntityRecordNameResolver.ts:36-73`). | Unreachable. | probe **P4** (record name `none`) |
| **GraphQL writes** (generated `Create…`/`Update…`/`Delete…` mutations, entity `Save`/`Delete`) | Guarded by this app and filtered by the platform: the Task 6 guards read every parent as the caller and refuse with `Record not found.`; an update or delete first reloads the stored row through the caller's filter (`mj/packages/MJServer/src/generic/ResolverBase.ts:1993-2017`), even when the client sends `OldValues___`, and the Create/Update/Delete filters check the row (docs/dev-instance.md, "Roles, row filters and permissions"). The refusal for another organization's record equals the refusal for a random ID. | Unreachable: no Create/Update/Delete permission. | `cred-isolation.3`, `.4`; probe **P5**, **P8**, **P10b** (staff-b and applicant-a deleting accrediting body A: refused, nothing deleted) |
| **Remote operations** (`Credentialing.CreateProgram`, `.CloneVersionToDraft`, `.ReorderVersionTree`, `.CreateOrganization`, `.CreateCommittee`) | Guarded by this app: `Authorize` requires `Credentialing Staff` (or `Credentialing Admin` for organization setup); the bodies load and save as the caller, so every guard and filter above applies, and a record of another organization answers `Record not found.`. `CreateCommittee` reads the program and its organization as the caller in the same way, and only its one write is made as the system user ("System-user work" below). | Guarded by this app: `Authorize` refuses (`FORBIDDEN`). | `cred-operations.*`, `cred-isolation.3`; probe **P8**, **P9**, **P10c** |
| **Saved Queries** (`GetQueryData`, `RunQueries`, …) | Unreachable: no credentialing role holds any permission row on `MJ: Queries`, and no saved query's SQL reads a credentialing view today. A saved query is authorized against the SQL it renders, **except that a query carrying `MJ: Query Permissions` rows is authorized by its role list alone** (`mj/packages/GenericDatabaseProvider/src/GenericDatabaseProvider.ts:5815-5845`), which bypasses row filters. A later plan that ships a query reading credentialing views must not give it query permissions for these roles. | Unreachable. | `cred-isolation.8`; probe **P7** |
| **Ad-hoc SQL** (`ExecuteAdhocQuery`, `TestQuerySQL`) | Unreachable on this instance: no read-only data source is configured, so MJAPI refuses every ad-hoc query (`No read-only data source available…`). Where one is configured, the SQL is authorized only if the caller can read **every** view it touches unscoped — no row filter (`mj/packages/MJServer/src/resolvers/AdhocQueryResolver.ts:100-120`) — and staff hold only filtered reads, so it is refused. | Unreachable (same; external roles hold no read at all). | probe **P7** |
| **Record change history** (`MJ: Record Changes`, the record's history panel, version history) | Unreachable: the raw change rows are not row-filtered by the record's own filter (FRD NFR-2.2), so no credentialing role holds any permission row on `MJ: Record Changes` and none holds `UI`. | Unreachable. | `cred-isolation.8`; probe **P6** (the control reader sees the sample program's change row; staff-b and applicant-a are refused) |
| **Relationship loads** (related-record grids and tabs on a form, `EntityRelationship` views) | Filtered by the platform: they are RunViews of the related entity as the user. | Unreachable (read refused). | same as RunView: `cred-isolation.1`; probe **P1**, **P3** |
| **Global search** (`Search everything…`, `SearchEntities`) | Filtered by the platform: `SearchEntities` runs RunViews as the requesting user (`mj/packages/MJServer/src/resolvers/SearchEntitiesResolver.ts:104-151`). Knowledge search needs a search scope; no `MJ: Search Scope Entities` or `MJ: Entity Documents` row names a credentialing entity in B1. | Unreachable (no read on the seven; no search scope). | same path as RunView; not probed separately |
| **Engine caches** (`BaseEngine` subclasses loaded in the browser) | Filtered by the platform: an engine loads through RunView as the signed-in user, and a config the user cannot read is skipped (`BaseEngine.CheckPermissionsOrSkipAll`, `mj/packages/MJCore/src/generic/baseEngine.ts:2138`). B1 adds no credentialing engine. | Same. | Task 8 / Task 12 browser checks (the "Skipping N config(s)" warnings) |
| **System-user work** | **Three places in B1** (B2 adds the reads and writes listed under "B2: applicant data" below), all reached through `SystemUser.Get` (`packages/CoreEntitiesServer/src/guards/SystemUser.ts`, `UserCache.Instance.GetSystemUser()`). **1.** `Credentialing.CreateOrganization` (`packages/CoreEntitiesServer/src/operations/CreateOrganizationServerOperation.ts`), after `Authorize` has established `Credentialing Admin`, writes the Common organization, the accrediting organization, the membership and the `MJ: User Roles` / `MJ: User Applications` rows **as the system user**, because the calling admin has, and should have, no permission on those platform entities. It returns only the IDs it wrote. **2.** Deleting an accrediting organization (`packages/CoreEntitiesServer/src/AccreditingOrganizationEntityServer.ts`) **reads, as the system user, whether that one organization has any program** (`Fields: ['ID']`, `MaxRows: 1`, read-only), because the only role that may delete an organization, `Credentialing Admin`, has no permission on programs: read as the caller, the check was refused and so was every delete (measured). The admin provisions organizations and may be told that programs exist (the refusal is the fixed sentence `Remove this organization's programs before deleting it.`), never which: nothing about a program reaches the caller. The read runs only for a caller holding Delete on accrediting organizations, after the organization has been re-read as that caller; any other caller gets the platform's permission refusal first. **3.** `Credentialing.CreateCommittee` (`packages/CoreEntitiesServer/src/operations/CreateCommitteeServerOperation.ts`), after `Authorize` has established `Credentialing Staff`, **writes one BizApps Committees committee as the system user**, because the write goes to another app's entity that staff must not be able to write freely: staff hold only the filtered Read on `Committees: Committees`, and a Create there would let a staff member make a committee for any organization (or for none). The operation fixes the owning organization itself: the caller names a program, the program and its accrediting organization are read **as the caller** (another organization's program answers `Record not found.`, exactly like a random ID), and the committee's `OrganizationID` is that organization's Common organization, never a value the caller sent. Before the write it reads as the system user, under the organization's authoring lock, whether the committee type exists and whether that one organization already has a committee of the name (`ID` only, at most one row each); the caller learns only the fixed sentences `Choose a committee type.` and `A committee named … already exists for this organization.`, both about the caller's own organization. Nothing else in B1 acts as the system user. (Outside this app: magic-link redemption provisions accounts as MJAPI's configured provisioning user, and MJAPI's system API key — used by the integration harness and seeding — is the `System` user; neither is reachable by a signed-in credentialing user.) | Guarded by this app (`FORBIDDEN`; the delete: no Delete permission). | `cred-operations.8`–`.10`, `.13`, `.14`, `.16`–`.20`, `cred-operations-wire.1`; probe **P8**, **P10b**, **P10c** (staff-b told `Record not found.`, applicant-a `FORBIDDEN`, each like a random program ID; no committee created) |
| **Magic-link invite rows** (`MJ: Magic Link Invites`) | Unreachable: no credentialing role holds any permission row on it; links are issued by the local dev Owner (docs/dev-instance.md, "Signing in as a persona"). | Unreachable. | probe **P10** (Create refused for want of permission; read refused) |
| **File download** (evidence bytes, B2 Task 7) | The only door is this app's route `GET /credentialing/evidence/:documentId/content`, mounted post-auth by `EvidenceRouteExtension` (`packages/Server/src/evidence/`). It loads the document **as the caller** through `SubjectAccess.Document` (the subject's row filter decides) and then requires `SubjectAccess.ActorFor` to be `Applicant` (a contact of the subject) or `Staff` (a member of the owning organization); anything else, including a malformed or random ID, answers the identical `404 {"Message":"Record not found."}`, decided before any storage call. Only then is the object read, as the system user, through the evidence store. Uploads go through `POST /credentialing/evidence`, which admits only a caller acting as `Applicant` for the subject (staff get the same 404, FR-5.9). No credentialing role holds a permission on `MJ: Files` or on the storage account, so MJ's own file resolvers (`GetFileContents`, `CreateMediaAccessToken`, `DownloadUrl`) refuse them. On the dev instance the account carries one `MJ: File Storage Account Permissions` row, for the System user, because MJ Storage treats an account with no rows as open to every signed-in user (`StorageAccessEvaluator`). Responses carry `X-Content-Type-Options: nosniff` and `Cache-Control: private, no-store`. A request without a token is answered `401` by MJAPI's authentication before the route. | Same route: a contact of another subject gets the same 404; reviewers and committee members hold no read on evidence documents, so the document does not load (404). | `cred-evidence.6`, `.7`, `.8` (client transport) |
| **Direct database access** | Unreachable: only the MJAPI and CodeGen service accounts connect to the database; no user role maps to a database login (all five roles have `SQLName: null`, `metadata/roles/.roles.json`). | Unreachable. | — |

## Who is outside the organization boundary

- **`Developer` and `Integration`** keep CodeGen's full, unfiltered access to the seven entities
  (`mj.config.cjs` `newEntityDefaults.PermissionDefaults`). They are instance-administration roles:
  an unfiltered grant from any role exempts the user from row filters
  (`EntityInfo.UserExemptFromRowLevelSecurity`, `mj/packages/MJCore/src/generic/entityInfo.ts:5012-5046`),
  so a holder reads every organization's rows by design. No world user or persona holds either role
  beside a credentialing role.
- **A host employee holding `UI` together with a credentialing role** is inside the host's trust
  boundary, not an organization's. `UI` carries unfiltered reads on platform entities that row
  filters do not cover — `MJ: Record Changes` above all — so such a person can read every
  organization's change history. That is a decision for the host to make about its own staff (Task 8);
  no credentialing role holds `UI`, and no world user or persona holds both.
- **`Credentialing Admin`** reads every accrediting organization and membership (unfiltered, FR-1.2:
  the admin provisions organizations) and no program content. Deleting an organization tells the
  admin only *whether* it still has programs (the system-user read above), never which.

## Owed by the plan that adds invite issuing

B1 issues magic links only from the test harness, as the local dev Owner. A staff member issuing
invites from the product needs more than `inviteIssuerRoleNames`:

- `MagicLinkService.CreateInvite` saves the `MJ: Magic Link Invites` row **as the caller**
  (`mj/packages/MJServer/src/auth/magicLink/MagicLinkService.ts:197-207`), so the issuer needs Create
  on that entity. Measured: `staff.a@example.test`, who passes the issuer check, gets HTTP 400
  `Does NOT have permission to Create MJ: Magic Link Invites records`.
- An **unfiltered** Create there would let its holder call the generated `CreateMJMagicLinkInvite`
  mutation directly, with any `RoleID` and `ApplicationID` and a `TokenHash` of a token they chose.
  The grantable-role allow-list is checked only in `CreateInvite` (`MagicLinkService.ts:175-185`);
  redemption only looks the role up (`MagicLinkService.ts:484-488`) and then grants it
  (`provisionUser`, `:673-720`; `createScopedUser`, `:763-826`). So a staff member could mint, for
  example, a `Developer` account.
- That plan must therefore either issue invites through a server-side operation that validates the
  role and application and writes the invite row itself (as this app's `CreateOrganization` writes its
  platform rows), **or** grant a Create filter limited to the caller's own invites
  (`CreatedByUserID`), the three external roles and the Credentialing application — with a check
  proving a staff user cannot create an invite for any other role or application.
- Until then, probe **P10** proves the present state: neither `staff-b` nor `applicant-a` can create
  or read an invite row.

## B2: applicant data (Task 3)

The nine **applicant-data entities** — Subjects, Subject Contacts, Applications, Standard Responses,
Response Citations, Evidence Documents, Document Attestations, Application Documents, Extractions —
each carry their subject (`Subject.ID`, every other row `SubjectID`), so two filters per role cover
them all. `Response Sources` is authoring data under a version and follows B1's tree pattern.

| Filter | Text | Attached to |
|---|---|---|
| `Credentialing: Applicant Subjects` | `(ID IN (SELECT c.SubjectID FROM [__mj_BizAppsCredentialing].[vwSubjectContacts] c WHERE c.UserID = TRY_CAST('{{UserID}}' AS UNIQUEIDENTIFIER)))` | Subjects, for `Credentialing Applicant` |
| `Credentialing: Applicant Rows By Subject` | `(SubjectID IN (SELECT c.SubjectID FROM [__mj_BizAppsCredentialing].[vwSubjectContacts] c WHERE c.UserID = …))` | the other eight, for `Credentialing Applicant` |
| `Credentialing: Staff Subjects` | `(AccreditingOrganizationID IN (<membership>))` | Subjects, for `Credentialing Staff` |
| `Credentialing: Staff Rows By Subject` | `(SubjectID IN (SELECT s.ID FROM [__mj_BizAppsCredentialing].[vwSubjects] s WHERE s.AccreditingOrganizationID IN (<membership>)))` | the other eight, for `Credentialing Staff` |

Grants: `Credentialing Applicant` and `Credentialing Staff` each hold Read, Create and Update — no
Delete — on the nine, with the matching filter on read, create **and** update.
`Credentialing Staff` holds RCUD on `Response Sources` with `Credentialing: Staff Rows By Version`.
`Credentialing Reviewer` and `Credentialing Committee` hold nothing on any of the ten. An applicant
holds no permission row on Programs, Program Versions, Sections, Standards, Document Requirements,
Response Sources, Accrediting Organizations or Organization Memberships (`cred-subject-isolation.6`).
`Extractions` and `Evidence Documents` carry `ExtractedText`: the subject's own material, readable
to its contacts and its organization's staff.

### How the create and update filters are evaluated (Task 3 Step 3 discovery)

Read from MJ v6.2.2 (`mj/packages/MJCore/src/generic/databaseProviderBase.ts:2126-2195`,
`mj/packages/GenericDatabaseProvider/src/GenericDatabaseProvider.ts:7633-7760`):

- **Create**: `CheckCreateRLS` evaluates the Create filter against **the new row's values** — a
  synthetic one-row subquery projecting every non-virtual field as the caller set it
  (`SELECT CASE WHEN (<filter>) THEN 1 ELSE 0 END FROM (SELECT <values>) AS newrow`, NULLs typed from
  metadata). It runs after validation and again after the before-save hooks (post-image), so a hook
  cannot move a new row out of scope. Refusal: `Access denied for new <entity> record`. A column the
  database fills on insert is NULL there, so `Credentialing: Applicant Subjects` (`ID IN …`) can never
  admit a Subject created without an explicit ID — no applicant path creates one.
- **Update**: `CheckRecordRLS` checks the **stored row** by primary key against the Update filter
  (pre-image; refusal `Record not found or access denied for <entity>`), then
  `CheckUpdateRLSPostImage` checks the **new values** the same synthetic way. The post-image check is
  skipped only when the filter decomposes into simple `column <op> literal` terms none of which is
  dirty; these filters hold subqueries, so it always runs.
- **Delete**: `CheckRecordRLS` on the stored row with the Delete filter (no role holds Delete on the nine).
- The filter subqueries run on the saving transaction's connection, so rows inserted earlier in the
  same operation (a new subject, then its contact) are visible to them (as B1's `CreateProgram` showed).

So create and update filters **are** enforced on the values written. They are not the only guard: the
nine entity subclasses refuse every save and delete that is not an operation write (below), and every
operation reaches its rows through `SubjectAccess` first.

### What guards each path

| Path | Guard | Proof |
|---|---|---|
| RunView / single-record load / record name / relationship grids of the nine | Filtered by the platform with the four filters above. Another subject's or organization's rows are not returned. | `cred-subject-isolation.1`, `.2` |
| Generated create/update/delete mutations, any entity `Save`/`Delete` of the nine | **Guarded by this app** — refused for every caller, staff and the system user included, with `This record is changed only through the application's own actions.`: each subclass (`packages/CoreEntitiesServer/src/*EntityServer.ts`, through `guards/ApplicantRow.ts`) admits only a write made through an operation's `OperationWrite` scope (`guards/OperationWrite.ts`, a module-private `WeakSet` that nothing a request sends can reach). An admitted write still runs the platform's permission and filter checks as the caller, after the subclass has restored the immutable columns from the loaded row and set `SubjectID` from the parent (read as the caller). | `cred-subject-isolation.4` (refused, row unchanged), `.5` (admitted write saves as the contact; its record change names the contact; a changed `SubjectID` is restored). Through MJAPI (Task 3 runtime check): staff-a's `UpdatemjBizAppsCredentialingStandardResponse` (`Status: "Confirmed"`) and `DeletemjBizAppsCredentialingStandardResponse` on a `Sample Applicant One` response both answered `This record is changed only through the application's own actions.`; the stored row stayed `Empty`. |
| Remote operations of Tasks 4–11 | **Guarded by this app** — `SubjectAccess` (`guards/SubjectAccess.ts`) reads the subject, application, response or document **as the caller**; nothing loads → `Record not found.`, identical to a random ID. | `cred-subject-isolation.3` |
| `Response Sources` writes | Staff only (permission), Draft version only, under the version lock (`ResponseSourceEntityServer.ts`, `ResponseSourceRules`); `ProgramVersionID` is the standard's, set by the server. | Task 10 `cred-prefill.7` |

### System-user reads added by Task 3

All through `SystemUser.Get`, and only **after** the caller's own row filter has admitted the owned row:

- `SubjectAccess.Application` reads the application's **version and program**; `SubjectAccess.Response`
  reads the response's **standard and version** — by the IDs the admitted row carries, one row each.
  An applicant holds no permission on authoring entities (plan Decision 3); these entity objects go to
  server code, never to the client, which receives only what an operation returns.
- `SubjectAccess.Requirement` reads one **document requirement** by ID and admits it only when the
  subject (already admitted) holds an application on the requirement's version; otherwise
  `Record not found.`.
- `SubjectAccess.ActorFor` reads the subject's **contact rows and its organization's memberships**,
  filtered to the one user and the one subject (`ID` only), to decide `Applicant` or `Staff`
  (`Applicant` wins when both, and each also requires the matching role). An applicant cannot read
  memberships.
- Probe **P1** was re-scoped in Task 3: `applicant-a` is a contact of `Sample Applicant One`, so P1 asserts it reads nothing from the eight authoring entities (B1's seven and Response Sources), while Task 12 adds its nine applicant-data entity reads to the probe (**P11**–**P20**). **P3** (reviewer, committee member) covers all seventeen entities (**P3** + **P18**).
- The integration world (`packages/IntegrationTests/src/world/applicant-world.ts`) writes its
  subjects, party records, contacts, applications and responses as the system user inside
  `OperationWrite`, as an invitation will; test code, not product code.

### System-user reads and writes added by Task 4

`Credentialing.InviteApplicant` and `Credentialing.ReissueInvitation` authorize `Credentialing Staff`
first, load the version/program (or contact) as the caller (so another organization stops with
`Record not found.`), take `AuthoringLock.ForUserEmail` (normalized email, then organization and version
for `InviteApplicant`), and then use `SystemUser.Get` only for the shared platform records that staff
cannot read or write directly:

- **BizApps Common party records (`MJ_BizApps_Common: People` / `Organizations`):** finds or creates
  the party record for a newly created `Subject` (`PartyEntityID` / `PartyRecordID`) and links a newly
  created `MJ: Users` row (`LinkedEntityID` / `LinkedEntityRecordID` pointing to `People`), matching B1's
  `CreateOrganization`.
- **Users, roles, and applications (`MJ: Users`, `MJ: User Roles`, `MJ: User Applications`):** reads
  users by `LOWER(Email)` to reject internal accounts (holding `Credentialing Staff`, `Credentialing Admin`,
  or any role outside external roles + `Magic Link Baseline`) and to reuse existing external users without
  duplicating rows; creates new external `User` rows (`Type = 'User'`) and adds the
  `Credentialing Applicant` role and `Credentialing` application row, then refreshes `UserCache` after commit.
- **Magic-link invitations (`MJ: Magic Link Invites`):** after transaction commit,
  `MagicLinkInvitationIssuer` calls `MagicLinkService.CreateInvite` passing the configured provisioning
  principal (`magicLink.contextUserForProvisioning` or `SystemUser.Get`), with fixed role
  `Credentialing Applicant`, fixed application `Credentialing`, and `MaxUses: 1`. Staff retain zero
  permission on `MJ: Magic Link Invites` (`cred-invite.9`, P10).
- **Applicant-data writes (`Subject`, `SubjectContact`, `Application`, `StandardResponse`):** written
  as the caller inside `OperationWrite.Run` so entity permissions and org-scoped row filters run against
  the staff caller (`InvitedByUserID` and audit records carry the staff caller).

### System-user work added by Task 7 (evidence storage)

- **Evidence files (`MJ: Files`, the storage account's objects):** `StorageEvidenceStore`
  (`packages/Server/src/evidence/StorageEvidenceStore.ts`) writes, reads and removes evidence objects
  and their `MJ: Files` rows as the system user, on the ONE account named by
  `CREDENTIALING_EVIDENCE_STORAGE_ACCOUNT` (never MJ Storage's "first account" fallback), every object
  under `credentialing-evidence/`. It is called only after the route or the intake admitted the caller
  as above; it reads or removes a file only when that row is an evidence object of that account. The
  caller receives the bytes (download) or the document's ID, text status and note (upload), never a
  file ID's storage location.
- **What stays as the caller:** the subject, requirement admission, the current document and the
  applications that froze it, and every `EvidenceDocument` / `DocumentAttestation` write are made as
  the caller inside `OperationWrite` (`EvidenceIntake`, `AttestInLieu`, `ConfirmDocumentCurrent`).

### System-user work added by Task 9 (the reading queue)

- **The reading queue** (`packages/CoreEntitiesServer/src/reading/DatabaseReadingData.ts`) has no
  caller: it is started by an upload's nudge after commit, by the boot sweep and by the sweep timer. It
  reads and writes as the system user, on a fresh isolated provider per unit of work, and every write is
  an entity save inside `OperationWrite` under `AuthoringLock.ForDocument` (claims, renewals, requeues,
  failures) or `ForSubject` then `ForDocument` (the commit), after a re-read. What it writes: the
  document's `ReadingStatus`/`ReadingNote`/claim columns, a scan's recognized text once
  (`ExtractedText`, `TextStatus`, `TextNote`, `PageCount`), and `Extraction` rows for standards of the
  subject's **Draft** applications only (re-read inside the commit's locks; a submitted application's
  extractions are neither superseded nor added to). It reads only the document, the sources naming its
  requirement, those standards and the subject's Draft applications on those versions. Nothing it reads
  is returned to a client; the contact and staff see its results through `GetDocumentLibrary` as before.
- **The recognizer and the reader** (`packages/Server/src/reading/`) run the prompts
  `Credentialing: Scan Reader` / `Credentialing: Evidence Reader` as the system user. Their prompt runs
  hold the document's text, and the scan reader's hold the file itself (`AIPromptRun.Messages`); no
  credentialing role holds a permission on `MJ: AI Prompt Runs` (Task 12 probe P16).
- **`Credentialing.RequeueReading`** ("Read again") stays as the caller: the document is read through
  `SubjectAccess.Document` (another subject's or organization's document answers `Record not found.`),
  `ActorFor` must be `Applicant` or `Staff`, and the save is the caller's, inside `OperationWrite`
  (`cred-reader.9`).

### System-user work added by Task 10 (prefill resolution)

- **`PrefillRunner.RunForSubject`** (`packages/CoreEntitiesServer/src/prefill/PrefillRunner.ts`) runs in
  the background when a document reading commits (`CredentialingServices.OnReadingCommitted`): it reads
  the subject's Draft applications on an isolated provider and runs `RunForApplication` as `SystemUser.Get`.
- **`PrefillRunner.RunForApplication` & `Credentialing.RefreshPrefills`:** `RefreshPrefills` authorizes
  `Applicant` or `Staff` for the subject via `SubjectAccess.Application` + `ActorFor`, and `DatabasePrefillData`
  re-reads the `Application` and its `StandardResponse` IDs **as the caller** inside the subject+application
  lock (`AuthoringLock.ForSubject` then `ForApplication`) so row-level security decides access before any
  write. Only after the caller's read succeeds does `DatabasePrefillData` load the response/citation
  entity objects and write outcomes (updating `StandardResponse`, replacing `ResponseCitation`s) as
  `SystemUser.Get` inside `OperationWrite` (an applicant holds no delete permission on `ResponseCitation`
  and bulk writes run without per-row RLS round-trips). Candidate evaluation (`DocumentExtractionEvaluator`)
  reads extractions, documents, and requirements as the caller (or system user for background runs).

### System-user work added by Task 11 (submission notifications and durable dispatch)

- **Staff notification fan-out (`SubmitApplicationServerOperation.notifyStaffBestEffort` & `EngineStaffNotifier`):**
  after the submission transaction commits, `SubmitApplicationServerOperation` reads the owning accrediting
  organization's `OrganizationMembership` `UserID`s as `SystemUser.Get` (an applicant holds no permission on
  memberships) and `EngineStaffNotifier` (`packages/Server/src/notifications/EngineStaffNotifier.ts`) calls
  `NotificationEngine.Instance.Config(false, system, Metadata.Provider)` and
  `NotificationEngine.Instance.SendNotification(..., system)` to insert one `MJ: User Notifications` row per
  staff member (applicants hold no Create permission there). Failures are logged and never affect the
  submission response (`cred-submission.9`, `.12`).
- **Durable submission dispatch (`ApplicationEvents`):** `packages/CoreEntitiesServer/src/events/ApplicationEvents.ts`
  (`DatabaseEventsData`) claims, runs registered `ApplicationSubmitted` subscribers outside any transaction,
  and marks `SubmissionDispatchedAt` / `SubmissionDispatchNote` as `SystemUser.Get` on `InBackground` isolated
  providers under `AuthoringLock.ForApplication` inside `OperationWrite` (`cred-submission.10`–`.14`).

### B2 read paths (applicant data, files, extracted text, AI prompt runs, notifications)

Every read path from the B1 table re-stated for the nine applicant-data entities (`Subjects`, `Subject Contacts`,
`Applications`, `Standard Responses`, `Response Citations`, `Evidence Documents`, `Document Attestations`,
`Application Documents`, `Extractions`), plus file bytes, extracted text, AI prompt runs, and notifications:

| Read path | Applicant of another subject / Staff of another org | Reviewer / Committee / Admin | Proof |
|---|---|---|---|
| **RunView** (`RunView`, `RunViews`, `Run…DynamicView`) on the 9 applicant-data entities | Filtered by the platform: `Credentialing Applicant` carries `Credentialing: Applicant Subjects` / `Applicant Rows By Subject`; `Credentialing Staff` carries `Credentialing: Staff Subjects` / `Staff Rows By Subject`. `applicant-a` reads only `Sample Applicant One`; `staff-b` reads only OrgB subjects. | Unreachable: `Reviewer` and `Committee` hold zero permission rows on all 9 (read refused); `Admin` holds no permission on applicant data. | `cred-subject-isolation.1`, `.2`; probe **P11**, **P17-P11**, **P18** |
| **Authoring & platform entities** (`Programs`, `Program Versions`, `Sections`, `Standards`, `Document Requirements`, `Response Sources`, `MJ: Files`, `MJ: File Storage Accounts`, `MJ: Users`, Common `People` & `Organizations`, `MJ: Record Changes`, `MJ: AI Prompt Runs`) | `Credentialing Applicant` holds no permission row on any of these 13 entities (read refused). `Credentialing Staff` holds filtered Read on authoring entities and zero permission on `MJ: Files`, `MJ: File Storage Accounts`, `MJ: Users`, Common `People`/`Organizations`, `MJ: Record Changes`, `MJ: AI Prompt Runs`. | Same (no permission on authoring or platform tables, except `Admin` on `Accrediting Organizations` / `Organization Memberships`). | `cred-subject-isolation.6`; probe **P1**, **P2**, **P6**, **P16** |
| **Single-record load** (`BaseEntity.InnerLoad`, generated `mjBizAppsCredentialing<Entity>(ID)` GraphQL queries) | Filtered by the platform: appends the Read RLS filter to `SELECT * FROM vw... WHERE ID = @id`; another subject's or org's Application, StandardResponse, or EvidenceDocument returns `null`, identical to a random UUID. | Unreachable (read refused). | `cred-subject-isolation.1`; probe **P12**, **P17-P12** |
| **Record display name** (`GetEntityRecordName`) | Filtered by the platform: applies the caller's Read RLS filter; returns `null` for another subject's or org's rows. | Unreachable. | probe **P12**, **P17-P12** |
| **GraphQL writes** (generated `Create…`/`Update…`/`Delete…` mutations on the 9 entities) | Guarded by this app (`ApplicantRow.Save`/`Delete` + `OperationWrite`) and filtered by the platform: every direct Create/Update/Delete mutation — even on the caller's **own** response, application, or document — is refused (`This record is changed only through the application's own actions.` for Create/Update; permission or operation-only refusal for Delete since roles hold no Delete). | Unreachable (no permission). | `cred-subject-isolation.4`; probe **P15** |
| **Remote operations (Tasks 4–11)** (`GetMySubjects`, `GetApplicationWorkspace`, `SaveResponse`, `ConfirmResponse`, `ReopenResponse`, `WithdrawApplication`, `AttestInLieu`, `ConfirmDocumentCurrent`, `GetDocumentLibrary`, `RequeueReading`, `SaveResponseSources`, `RefreshPrefills`, `GetSubmissionGate`, `SubmitApplication`, `InviteApplicant`, `ReissueInvitation`) | Guarded by this app: `SubjectAccess` loads the target subject/application/response/document **as the caller**; foreign or another-org IDs answer `REFUSED` `Record not found.`, byte-equal to a random UUID. Role-restricted ops (`ReopenResponse`, `SaveResponseSources`, `InviteApplicant`, `ReissueInvitation` for staff; `GetMySubjects`, `AttestInLieu`, `ConfirmDocumentCurrent` for applicants) refuse the opposite role with `FORBIDDEN`, byte-equal to a random UUID. `GetMySubjects` returns only the caller's own subjects. | Guarded by this app: `Authorize` refuses (`FORBIDDEN`). | `cred-subject-isolation.3`, `.10`; `cred-invite.*`; `cred-responses.*`; `cred-prefill.7`; `cred-submission.7`; probe **P13**, **P17-P13** |
| **Saved Queries & Ad-hoc SQL** (`RunQuery`, `ExecuteAdhocQuery`) | Unreachable: no credentialing role has permission on `MJ: Queries`, no saved query targets applicant-data views, and no read-only data source is configured on this instance. | Unreachable. | probe **P7** |
| **Record change history** (`MJ: Record Changes`) | Unreachable: no credentialing role holds any permission on `MJ: Record Changes` and none holds `UI`, so change descriptions (including response text / edits) are unreachable. | Unreachable. | `cred-subject-isolation.5` (system/audit check); probe **P6**, **P16** |
| **Relationship loads & Engine caches** | Relationship loads use `RunView` as the caller (row-filtered). B2 adds no client-side `BaseEngine` caching applicant data. | Unreachable (`BaseEngine.CheckPermissionsOrSkipAll` skips unread configs). | same as RunView (`P11`, `P18`) |
| **File bytes** (`GET /credentialing/evidence/:documentId/content`, `POST /credentialing/evidence`, MJ file resolvers) | Guarded by this app: `EvidenceRouteExtension` reads `req.userPayload.userRecord` (unauthenticated requests get MJAPI `401` before the route), loads the document as the caller (`SubjectAccess.Document`), and checks `ActorFor` (`Applicant` or `Staff` for download; `Applicant` only for upload). Another subject's contact or another org's staff gets `404 {"Message":"Record not found."}`, byte-identical to a random UUID. MJ's own `CreateMediaAccessToken`, `GetFileContents`, and `CreatePreAuthDownloadUrl` are refused even for the applicant's **own** `FileID` because no credentialing role holds permission on `MJ: Files` or `MJ: File Storage Accounts`, and the storage account has an explicit permission row for `System` only. | Unreachable: route returns `404`; MJ file resolvers refuse for lack of permission on `MJ: Files`. | `cred-evidence.6`–`.8`; probe **P14**, **P16**, **P17-P14**, **P19** |
| **Extracted text & Global search** (`EvidenceDocument.ExtractedText`, `Extraction.Excerpt`, `SearchEntities`) | `ExtractedText` and `Excerpt` are only readable by the owning subject's contacts and owning org's staff; `GetDocumentLibrary` omits `ExtractedText`. `SearchEntities` runs `ProviderBase.searchEntitiesLexicalPass` (a `RunView` over fields marked `IncludeInUserSearchAPI` / `IsNameField`, such as `Subject.DisplayName`) plus `searchEntitiesFilterByPermission` as the requesting user, so another subject's display name returns zero hits. For semantic/vector search (`GenericDatabaseProvider.searchEntitiesSemanticPass`), **no `MJ: Entity Documents` row (and no `MJ: Search Scope Entities` row) names any credentialing entity**, so no vector index exists for applicant data or document text. | Unreachable (no read on `Subjects`, `Evidence Documents`, `Extractions`, `MJ: Files`, or `MJ: AI Prompt Runs`). | probe **P11**, **P16**, **P20** |
| **AI prompt runs** (`MJ: AI Prompt Runs`) | Unreachable: `PromptTextRecognizer` and `PromptEvidenceReader` store scanned files and extracted document text in `AIPromptRun.Messages` when running as `SystemUser.Get`; no credentialing role holds any permission on `MJ: AI Prompt Runs`. | Unreachable. | probe **P16** |
| **Notifications** (`MJ: User Notifications`, `MJ: User Notification Types`) | Filtered by the platform: all five credentialing roles hold Read/Update on `MJ: User Notifications` with `Magic Link: Own Rows by UserID` (`UserID = '{{UserID}}'`), no Create, and `Credentialing: Shell Empty` (`1 = 0`) on `MJ: User Notification Types`. `EngineStaffNotifier` targets only `OrganizationMembership` users of the submitting application's owning organization; `ApplicationRecordRedirectFormComponent` opens the Pipeline tab, where `SubjectAccess` enforces org isolation. | Same per-user `UserID` filter (`Reviewer`/`Committee` receive no submission notifications). | `cred-submission.9`, `.12` |
| **Direct database access** | Unreachable: all credentialing roles have `SQLName: null`. | Unreachable. | — |
