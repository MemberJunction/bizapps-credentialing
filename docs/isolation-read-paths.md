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
| **GraphQL writes** (generated `Create…`/`Update…`/`Delete…` mutations, entity `Save`/`Delete`) | Guarded by this app and filtered by the platform: the Task 6 guards read every parent as the caller and refuse with `Record not found.`; an update or delete first reloads the stored row through the caller's filter (`mj/packages/MJServer/src/generic/ResolverBase.ts:1993-2017`), even when the client sends `OldValues___`, and the Create/Update/Delete filters check the row (docs/dev-instance.md, "Roles, row filters and permissions"). The refusal for another organization's record equals the refusal for a random ID. | Unreachable: no Create/Update/Delete permission. | `cred-isolation.3`, `.4`; probe **P5**, **P8**, **P11** (staff-b and applicant-a deleting accrediting body A: refused, nothing deleted) |
| **Remote operations** (`Credentialing.CreateProgram`, `.CloneVersionToDraft`, `.ReorderVersionTree`, `.CreateOrganization`, `.CreateCommittee`) | Guarded by this app: `Authorize` requires `Credentialing Staff` (or `Credentialing Admin` for organization setup); the bodies load and save as the caller, so every guard and filter above applies, and a record of another organization answers `Record not found.`. `CreateCommittee` reads the program and its organization as the caller in the same way, and only its one write is made as the system user ("System-user work" below). | Guarded by this app: `Authorize` refuses (`FORBIDDEN`). | `cred-operations.*`, `cred-isolation.3`; probe **P8**, **P9**, **P12** |
| **Saved Queries** (`GetQueryData`, `RunQueries`, …) | Unreachable: no credentialing role holds any permission row on `MJ: Queries`, and no saved query's SQL reads a credentialing view today. A saved query is authorized against the SQL it renders, **except that a query carrying `MJ: Query Permissions` rows is authorized by its role list alone** (`mj/packages/GenericDatabaseProvider/src/GenericDatabaseProvider.ts:5815-5845`), which bypasses row filters. A later plan that ships a query reading credentialing views must not give it query permissions for these roles. | Unreachable. | `cred-isolation.8`; probe **P7** |
| **Ad-hoc SQL** (`ExecuteAdhocQuery`, `TestQuerySQL`) | Unreachable on this instance: no read-only data source is configured, so MJAPI refuses every ad-hoc query (`No read-only data source available…`). Where one is configured, the SQL is authorized only if the caller can read **every** view it touches unscoped — no row filter (`mj/packages/MJServer/src/resolvers/AdhocQueryResolver.ts:100-120`) — and staff hold only filtered reads, so it is refused. | Unreachable (same; external roles hold no read at all). | probe **P7** |
| **Record change history** (`MJ: Record Changes`, the record's history panel, version history) | Unreachable: the raw change rows are not row-filtered by the record's own filter (FRD NFR-2.2), so no credentialing role holds any permission row on `MJ: Record Changes` and none holds `UI`. | Unreachable. | `cred-isolation.8`; probe **P6** (the control reader sees the sample program's change row; staff-b and applicant-a are refused) |
| **Relationship loads** (related-record grids and tabs on a form, `EntityRelationship` views) | Filtered by the platform: they are RunViews of the related entity as the user. | Unreachable (read refused). | same as RunView: `cred-isolation.1`; probe **P1**, **P3** |
| **Global search** (`Search everything…`, `SearchEntities`) | Filtered by the platform: `SearchEntities` runs RunViews as the requesting user (`mj/packages/MJServer/src/resolvers/SearchEntitiesResolver.ts:104-151`). Knowledge search needs a search scope; no `MJ: Search Scope Entities` or `MJ: Entity Documents` row names a credentialing entity in B1. | Unreachable (no read on the seven; no search scope). | same path as RunView; not probed separately |
| **Engine caches** (`BaseEngine` subclasses loaded in the browser) | Filtered by the platform: an engine loads through RunView as the signed-in user, and a config the user cannot read is skipped (`BaseEngine.CheckPermissionsOrSkipAll`, `mj/packages/MJCore/src/generic/baseEngine.ts:2138`). B1 adds no credentialing engine. | Same. | Task 8 / Task 12 browser checks (the "Skipping N config(s)" warnings) |
| **System-user work** | **Three places in B1** (B2 adds the reads listed under "B2: applicant data" below), all reached through `SystemUser.Get` (`packages/CoreEntitiesServer/src/guards/SystemUser.ts`, `UserCache.Instance.GetSystemUser()`). **1.** `Credentialing.CreateOrganization` (`packages/CoreEntitiesServer/src/operations/CreateOrganizationServerOperation.ts`), after `Authorize` has established `Credentialing Admin`, writes the Common organization, the accrediting organization, the membership and the `MJ: User Roles` / `MJ: User Applications` rows **as the system user**, because the calling admin has, and should have, no permission on those platform entities. It returns only the IDs it wrote. **2.** Deleting an accrediting organization (`packages/CoreEntitiesServer/src/AccreditingOrganizationEntityServer.ts`) **reads, as the system user, whether that one organization has any program** (`Fields: ['ID']`, `MaxRows: 1`, read-only), because the only role that may delete an organization, `Credentialing Admin`, has no permission on programs: read as the caller, the check was refused and so was every delete (measured). The admin provisions organizations and may be told that programs exist (the refusal is the fixed sentence `Remove this organization's programs before deleting it.`), never which: nothing about a program reaches the caller. The read runs only for a caller holding Delete on accrediting organizations, after the organization has been re-read as that caller; any other caller gets the platform's permission refusal first. **3.** `Credentialing.CreateCommittee` (`packages/CoreEntitiesServer/src/operations/CreateCommitteeServerOperation.ts`), after `Authorize` has established `Credentialing Staff`, **writes one BizApps Committees committee as the system user**, because the write goes to another app's entity that staff must not be able to write freely: staff hold only the filtered Read on `Committees: Committees`, and a Create there would let a staff member make a committee for any organization (or for none). The operation fixes the owning organization itself: the caller names a program, the program and its accrediting organization are read **as the caller** (another organization's program answers `Record not found.`, exactly like a random ID), and the committee's `OrganizationID` is that organization's Common organization, never a value the caller sent. Before the write it reads as the system user, under the organization's authoring lock, whether the committee type exists and whether that one organization already has a committee of the name (`ID` only, at most one row each); the caller learns only the fixed sentences `Choose a committee type.` and `A committee named … already exists for this organization.`, both about the caller's own organization. The committee is created `Active` and private (`IsPublic` 0). Nothing else in this app's code acts as the system user. (Outside this app: magic-link redemption provisions accounts as MJAPI's configured provisioning user, and MJAPI's system API key — used by the integration harness and seeding — is the `System` user; neither is reachable by a signed-in credentialing user.) | Guarded by this app (`FORBIDDEN`; the delete: no Delete permission). | `cred-operations.8`–`.10`, `.13`, `.14`, `.16`–`.20`, `cred-operations-wire.1`; probe **P8**, **P11**, **P12** (staff-b told `Record not found.`, applicant-a `FORBIDDEN`, each like a random program ID; no committee created) |
| **Magic-link invite rows** (`MJ: Magic Link Invites`) | Unreachable: no credentialing role holds any permission row on it; links are issued by the local dev Owner (docs/dev-instance.md, "Signing in as a persona"). | Unreachable. | probe **P10** (Create refused for want of permission; read refused) |
| **File download** | No credentialing entity stores a file in B1. **Owed by the plan that introduces document uploads:** files must be served through a path that checks the owning record's row filter as the caller. | — | — |
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
- Probe **P1** is re-scoped: applicant-a is now a contact of `Sample Applicant One`, so P1 asserts it
  reads nothing from the eight authoring entities (B1's seven and Response Sources); its own-subject
  reads of the nine are proved by `cred-subject-isolation.1` until Task 12 adds them to the probe (P11).
  P3 (reviewer, committee member) covers all seventeen entities.
- The integration world (`packages/IntegrationTests/src/world/applicant-world.ts`) writes its
  subjects, party records, contacts, applications and responses as the system user inside
  `OperationWrite`, as an invitation will; test code, not product code.
