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
| **Single-record load** (`BaseEntity.Load` / `InnerLoad`, the generated `mjBizAppsCredentialing<Entity>(ID)` resolver) | Filtered by the platform: the resolver checks read permission and appends the row filter (`packages/Server/src/generated/graphql-schemas/__mj_BizAppsCredentialing.ts`, e.g. the `mjBizAppsCredentialingProgram` query). Another organization's ID loads nothing, exactly like a nonexistent ID. | Unreachable (read refused). | `cred-isolation.2`; probe **P4** |
| **Record display name** (`GetEntityRecordName`, behind every link, breadcrumb and picker label) | Filtered by the platform: read permission is checked and the provider's lookup applies the user's read filter (`mj/packages/MJServer/src/resolvers/EntityRecordNameResolver.ts:36-73`). | Unreachable. | probe **P4** (record name `none`) |
| **GraphQL writes** (generated `Create…`/`Update…`/`Delete…` mutations, entity `Save`/`Delete`) | Guarded by this app and filtered by the platform: the Task 6 guards read every parent as the caller and refuse with `Record not found.`; an update or delete first reloads the stored row through the caller's filter (`mj/packages/MJServer/src/generic/ResolverBase.ts:1993-2017`), even when the client sends `OldValues___`, and the Create/Update/Delete filters check the row (docs/dev-instance.md, "Roles, row filters and permissions"). The refusal for another organization's record equals the refusal for a random ID. | Unreachable: no Create/Update/Delete permission. | `cred-isolation.3`, `.4`; probe **P5**, **P8**, **P11** (staff-b and applicant-a deleting accrediting body A: refused, nothing deleted) |
| **Remote operations** (`Credentialing.CreateProgram`, `.CloneVersionToDraft`, `.ReorderVersionTree`, `.CreateOrganization`) | Guarded by this app: `Authorize` requires `Credentialing Staff` (or `Credentialing Admin` for organization setup); the bodies load and save as the caller, so every guard and filter above applies, and a record of another organization answers `Record not found.`. | Guarded by this app: `Authorize` refuses (`FORBIDDEN`). | `cred-operations.*`, `cred-isolation.3`; probe **P8**, **P9** |
| **Saved Queries** (`GetQueryData`, `RunQueries`, …) | Unreachable: no credentialing role holds any permission row on `MJ: Queries`, and no saved query's SQL reads a credentialing view today. A saved query is authorized against the SQL it renders, **except that a query carrying `MJ: Query Permissions` rows is authorized by its role list alone** (`mj/packages/GenericDatabaseProvider/src/GenericDatabaseProvider.ts:5815-5845`), which bypasses row filters. A later plan that ships a query reading credentialing views must not give it query permissions for these roles. | Unreachable. | `cred-isolation.8`; probe **P7** |
| **Ad-hoc SQL** (`ExecuteAdhocQuery`, `TestQuerySQL`) | Unreachable on this instance: no read-only data source is configured, so MJAPI refuses every ad-hoc query (`No read-only data source available…`). Where one is configured, the SQL is authorized only if the caller can read **every** view it touches unscoped — no row filter (`mj/packages/MJServer/src/resolvers/AdhocQueryResolver.ts:100-120`) — and staff hold only filtered reads, so it is refused. | Unreachable (same; external roles hold no read at all). | probe **P7** |
| **Record change history** (`MJ: Record Changes`, the record's history panel, version history) | Unreachable: the raw change rows are not row-filtered by the record's own filter (FRD NFR-2.2), so no credentialing role holds any permission row on `MJ: Record Changes` and none holds `UI`. | Unreachable. | `cred-isolation.8`; probe **P6** (the control reader sees the sample program's change row; staff-b and applicant-a are refused) |
| **Relationship loads** (related-record grids and tabs on a form, `EntityRelationship` views) | Filtered by the platform: they are RunViews of the related entity as the user. | Unreachable (read refused). | same as RunView: `cred-isolation.1`; probe **P1**, **P3** |
| **Global search** (`Search everything…`, `SearchEntities`) | Filtered by the platform: `SearchEntities` runs RunViews as the requesting user (`mj/packages/MJServer/src/resolvers/SearchEntitiesResolver.ts:104-151`). Knowledge search needs a search scope; no `MJ: Search Scope Entities` or `MJ: Entity Documents` row names a credentialing entity in B1. | Unreachable (no read on the seven; no search scope). | same path as RunView; not probed separately |
| **Engine caches** (`BaseEngine` subclasses loaded in the browser) | Filtered by the platform: an engine loads through RunView as the signed-in user, and a config the user cannot read is skipped (`BaseEngine.CheckPermissionsOrSkipAll`, `mj/packages/MJCore/src/generic/baseEngine.ts:2138`). B1 adds no credentialing engine. | Same. | Task 8 / Task 12 browser checks (the "Skipping N config(s)" warnings) |
| **System-user work** | **Two places**, both reached through `SystemUser.Get` (`packages/CoreEntitiesServer/src/guards/SystemUser.ts`, `UserCache.Instance.GetSystemUser()`). **1.** `Credentialing.CreateOrganization` (`packages/CoreEntitiesServer/src/operations/CreateOrganizationServerOperation.ts`), after `Authorize` has established `Credentialing Admin`, writes the Common organization, the accrediting organization, the membership and the `MJ: User Roles` / `MJ: User Applications` rows **as the system user**, because the calling admin has, and should have, no permission on those platform entities. It returns only the IDs it wrote. **2.** Deleting an accrediting organization (`packages/CoreEntitiesServer/src/AccreditingOrganizationEntityServer.ts`) **reads, as the system user, whether that one organization has any program** (`Fields: ['ID']`, `MaxRows: 1`, read-only), because the only role that may delete an organization, `Credentialing Admin`, has no permission on programs: read as the caller, the check was refused and so was every delete (measured). The admin provisions organizations and may be told that programs exist (the refusal is the fixed sentence `Remove this organization's programs before deleting it.`), never which: nothing about a program reaches the caller. The read runs only for a caller holding Delete on accrediting organizations, after the organization has been re-read as that caller; any other caller gets the platform's permission refusal first. Nothing else in this app's code acts as the system user. (Outside this app: magic-link redemption provisions accounts as MJAPI's configured provisioning user, and MJAPI's system API key — used by the integration harness and seeding — is the `System` user; neither is reachable by a signed-in credentialing user.) | Guarded by this app (`FORBIDDEN`; the delete: no Delete permission). | `cred-operations.8`–`.10`, `.13`, `.14`, `cred-operations-wire.1`; probe **P8**, **P11** |
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
