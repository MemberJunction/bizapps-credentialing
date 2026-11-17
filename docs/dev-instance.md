# Linked Development Instance (MJ 6.2.2)

This document records the verified local development setup joining MemberJunction
(`mj`), the BizApps dependency apps (`bizapps-common`, `bizapps-tasks`,
`bizapps-committees`), and `bizapps-credentialing` in one linked pnpm workspace.

## Directory Layout & Sibling Versions

All repositories live as siblings inside a single workspace parent directory
(which is **not** a git repository):

| Directory | Repository | Branch / Tag | `mj-app.json` Version | Role in Workspace |
|---|---|---|---|---|
| `mj/` | `MemberJunction/MJ` | tag `v6.2.2` | — | Core MJ framework, CLI, MJAPI, MJExplorer |
| `bizapps-common/` | `MemberJunction/bizapps-common` | tag `v5.66.0` | `5.66.0` | Dependency app (`__mj_BizAppsCommon`). Its `next` branch was `5.65.0`, so tag `v5.66.0` is checked out to match the `@mj-biz-apps/common-entities@5.66.0` anchor. |
| `bizapps-tasks/` | `MemberJunction/bizapps-tasks` | branch `next` | `1.13.0` | Dependency app (`__mj_BizAppsTasks`) |
| `bizapps-committees/` | `MemberJunction/bizapps-committees` | branch `next` | `1.5.0` | Dependency app (`__mj_BizAppsCommittees`, manifest name `mj-committees`) |
| `bizapps-credentialing/` | `MemberJunction/bizapps-credentialing` | branch `feature/b1-foundation` | `0.0.0` | Product app (`__mj_BizAppsCredentialing`) |

Workspace linking & build notes:
- `node mj/packages/MJCLI/bin/run.js dev workspace` generates `pnpm-workspace.yaml`,
  `.npmrc`, `package.json`, and `.mj-dev-workspace.json` at the workspace parent and
  removes members' standalone `node_modules`. Installs run **only at the workspace
  parent** (`corepack pnpm install`).
- **Step 2 failure 1 — `ERR_INTERNAL_ASSERTION` on `https-proxy-agent` (`parent build rc=1` and `doctor rc=1`):**
  `mj dev workspace`'s `DeriveLockfilePins` (`mj/packages/MJCLI/src/lib/dev-workspace/lockfile.ts`)
  pins direct importer dependencies and `@types/*`, leaving transitive-only packages
  unpinned. Under Node `v24.15.0`, pnpm floated transitive `@typespec/ts-http-runtime`
  to `0.3.10`, which pulled ESM-only `https-proxy-agent@9.1.0`; `@oclif/core@3.27.0`
  (invoked by `@memberjunction/cli#build` `oclif manifest` in `ws-build.log` and by
  `dev workspace doctor` `findCommand` in `ws-doctor.log`) triggered CJS `proxyPolicy.js`
  to `require()` `https-proxy-agent@9.1.0` and threw
  `ERR_INTERNAL_ASSERTION: Unexpected module status 0. Cannot require() ES Module .../https-proxy-agent@9.1.0/.../index.js`.
  **Fix:** in parent `pnpm-workspace.yaml` `overrides:`, pin `@typespec/ts-http-runtime`
  and its `@azure/*` siblings to `mj/pnpm-lock.yaml`'s versions:
  `'@typespec/ts-http-runtime': '0.3.3'` (which keeps `https-proxy-agent` on `7.0.6`),
  `'@azure-rest/ai-inference': '1.0.0-beta.6'`, `'@azure-rest/core-client': '2.5.1'`,
  `'@azure/abort-controller': '2.1.2'`, `'@azure/communication-call-automation': '1.6.0'`,
  `'@azure/core-auth': '1.10.1'`, `'@azure/core-client': '1.10.1'`,
  `'@azure/core-http-compat': '2.3.2'`, `'@azure/core-rest-pipeline': '1.22.2'`,
  `'@azure/core-tracing': '1.3.1'`, `'@azure/core-util': '1.13.1'`,
  `'@azure/identity': '4.13.1'`, `'@azure/keyvault-secrets': '4.10.0'`,
  `'@azure/logger': '1.3.0'`.
- **Step 2 failure 2 — `@mj-biz-apps/tasks-ng` build ordering (`ws-build2.log`):**
  `bizapps-tasks/packages/Angular/package.json` declares `"@mj-biz-apps/common-entities": "5.63.0"`
  instead of `workspace:*` (`bizapps-common/` provides `5.66.0`), so `pnpm -r` does
  not guarantee `bizapps-common` builds before `bizapps-tasks` on an unbuilt tree,
  failing `tasks-ng` with `TS2307: Cannot find module '@mj-biz-apps/common-entities'`.
  **Fix:** build `bizapps-common` first (`corepack pnpm --filter "@mj-biz-apps/common-*" run build`)
  before running `corepack pnpm run build` at the workspace parent.
- **Angular version in `MJExplorer` (`21.1.3` -> fixed to `21.2.22`):**
  `AssembleParentOverrides` (`mj/packages/MJCLI/src/lib/dev-workspace/build.ts`) layers
  `lockfilePins < memberOverrides`. Although lockfile pin derivation selected `21.2.22`,
  `bizapps-committees/package.json` `pnpm.overrides` pinned 12 Angular packages
  (`@angular/{animations,cli,common,compiler,compiler-cli,core,forms,localize,platform-browser,platform-browser-dynamic,router,service-worker}`)
  to `21.1.3`, and `mj/package.json` `pnpm.overrides` did not declare those 12 keys —
  so `bizapps-committees` superseded the `21.2.22` pins in parent `pnpm-workspace.yaml`
  and `pnpm-lock.yaml`, causing `MJExplorer/node_modules/@angular/core` to install and
  build at `21.1.3` alongside `@angular/elements@21.2.22` and `@angular/build@21.2.23`.
  That is **wrong** for MJ 6.2.2: `mj/packages/MJExplorer/package.json` pins
  `@angular/core: 21.2.22` and MJ 6.2.2 Angular packages (`@memberjunction/ng-*`)
  require `^21.2.22`.
  **Fix:** change those 12 `'21.1.3'` overrides in parent `pnpm-workspace.yaml` to
  `'21.2.22'`, run `corepack pnpm install && corepack pnpm prune` at the workspace
  parent, verify `dev workspace doctor` reports `@angular/core@21.2.22`,
  `@angular/common@21.2.22`, `@angular/compiler@21.2.22` as single-copy, and rebuild.
- **Durability across `mj dev workspace --force`:** **Neither override fix survives
  `mj dev workspace --force`**, because `--force` overwrites parent `pnpm-workspace.yaml`
  from member manifests/lockfiles (keeping a `.bak`). After any `dev workspace --force`
  run, re-apply both override sets (`@typespec/ts-http-runtime` + `@azure/*` pins and
  the 12 Angular `21.2.22` overrides) to parent `pnpm-workspace.yaml` and run
  `corepack pnpm install && corepack pnpm prune` at the workspace parent.
- **Updating this repo's own `pnpm-lock.yaml` while linked:** the parent lockfile is the
  workspace's and never replaces a member's (`mj/guides/OPEN_APP_WORKSPACE_LINKING_SPEC.md`
  §2). After changing any `package.json` here, run `corepack pnpm install` at the workspace
  parent (that is the install), then, from `bizapps-credentialing/`,
  `corepack pnpm install --lockfile-only` — the same command `ci/merge_main_and_update_lock.mjs`
  and `version:ci` use. It resolves against this repo's own `pnpm-workspace.yaml` and writes
  only `pnpm-lock.yaml`: no entry under `bizapps-credentialing/node_modules` or
  `packages/*/node_modules` changed (mtimes checked), and `dev workspace doctor` still passes.
  `corepack pnpm install --lockfile-only --frozen-lockfile` exits 0 when the lockfile matches
  the manifests, which is what CI's `pnpm install --frozen-lockfile` requires.
- `node mj/packages/MJCLI/bin/run.js dev workspace doctor` verifies 0 failures and
  single-copy `@angular/core@21.2.22`, `@angular/common@21.2.22`, `@angular/compiler@21.2.22`,
  `rxjs@7.8.2`, `zone.js@0.16.0`.

## Database, Ports & Routes

| Setting | Value | Notes |
|---|---|---|
| SQL Server | `localhost,1433` (`mj-sqlserver` container) | Local dev SQL auth (`sa`) |
| Database | `MJ_6_2_2_CLEAN_credentialing` | Dedicated clean database for this app only |
| MJAPI port | `4050` (`GRAPHQL_PORT=4050`) | Configured in `mj/.env` and symlinked at `mj/packages/MJAPI/.env` |
| MJExplorer port | `4251` (`ng serve --port 4251`) | Configured in `mj/packages/MJExplorer/package.json` and `environments/environment*.ts` |
| Route base path | `/` (`MJAPI_BASE_PATH` unset) | Core HTTP routes mount at root (`mj/packages/MJServer/src/apiRoot.ts`) |
| Local dev auth | `MJ_DEV_AUTH_ENABLED=true` | Exposes `GET /auth/dev-users` and `POST /auth/dev-login` on localhost only (`mj/packages/MJServer/src/auth/localDevAuth.ts`) |

### Local Dev User Resolution & Seeding

`ResolveLocalDevUser` (`mj/packages/MJServer/src/auth/localDevAuth.ts`) selects
the user matching (1) requested `email` in the `POST /auth/dev-login` body,
`MJ_DEV_AUTH_DEFAULT_EMAIL`, or `configInfo.devAuth.defaultEmail`, then
(2) `admin@memberjunction.org`, (3) the first active user holding `Developer`,
(4) the first active `Owner` user, or (5) the first active non-System user.

A clean database migrated with `mj migrate` + `mj sync push` contains only
`System` (`not.set@nowhere.com`) and `Anonymous` (`anonymous@magic-link.local`).
Provision the local dev `Owner` user (`admin@memberjunction.org`, `Type = 'Owner'`,
roles `Developer`, `Integration`, and `UI`) via MJ entity objects using the
idempotent repo script before signing in:

```sh
corepack pnpm run dev:owner
```

(`scripts/dev/ensure-dev-owner.mjs` reads `.env` in `bizapps-credentialing/` and
uses `Metadata.GetEntityObject('MJ: Users' / 'MJ: User Roles' / 'MJ: User Applications')`;
when `Credentialing` exists in `__mj.Application`, it also ensures the
`MJ: User Applications` row.)

### Magic-Link & Dynamic Package Wiring (`mj/` local only — never commit)

- `mj/mj.config.cjs`:
  - `magicLink.enabled: true`, `explorerUrl: 'http://localhost:4251'`,
    `inviteIssuerRoleNames: ['Credentialing Staff']`,
    `grantableRoleNames: ['Credentialing Applicant', 'Credentialing Reviewer', 'Credentialing Committee']`.
    MJAPI boots cleanly even before those Credentialing roles exist because `MagicLinkService` enforces those lists per request rather than at startup.
  - `MJ_MAGIC_LINK_PRIVATE_KEY` must be set in `mj/.env`: a 2048-bit RSA private key, PEM or
    base64 of the PEM (`MagicLinkKeyManager.normalizePem`,
    `mj/packages/MJServer/src/auth/magicLink/MagicLinkKeys.ts`). The same key signs dev-login tokens
    (`localDevAuth.ts` initializes the same manager). **Left empty, MJAPI generates a new key at every
    start**, so every dev-login token and magic-link session dies on each MJAPI restart (Explorer then
    gets HTTP 401 on every call and stalls on "Taking longer than expected"). Measured during the
    B1 verification: the variable was present but empty on this instance, and the token's `kid`
    changed at every restart; after setting it, a token minted before a restart still answered
    `CurrentUser` after it. Generate it without printing it — see "Rebuild from nothing", step 9.
  - `dynamicPackages.server` registers `@mj-biz-apps/common-server` (`LoadBizAppsCommonServer`), `@mj-biz-apps/tasks-server` (`LoadBizAppsTasksServer`), `@mj-biz-apps/committees-server` (`LoadCommitteesServer`), and `@mj-biz-apps/credentialing-server` (`LoadBizAppsCredentialingServer`).
  - `dynamicPackages.client` registers `@mj-biz-apps/common-ng`, `@mj-biz-apps/tasks-ng`, `@mj-biz-apps/committees-ng`, and `@mj-biz-apps/credentialing-ng` (`Enabled: true`).
- `mj/packages/MJAPI/package.json` and `mj/packages/MJExplorer/package.json` list
  those server/client packages at their sibling versions (`5.66.0`, `1.13.0`,
  `1.5.0`, `0.0.0`), plus any transitive workspace packages added by `mj:manifest:api`
  and `mj:manifest:explorer`. Run `corepack pnpm install` at the workspace parent after manifest regeneration.
- Client bootstrap in MJ 6.2.2 writes `OPEN_APP_CLIENT_MODULES` directly into
  `mj/packages/MJExplorer/src/app/generated/class-registrations-manifest.ts`
  via `--open-app-client-bootstrap` (`mj:manifest:explorer`). There is no
  `open-app-bootstrap.generated.ts` file in MJ 6.2.2.
- `mj_api`'s `start` script runs `-r dotenv/config` inside `mj/packages/MJAPI/`, so
  symlink `mj/packages/MJAPI/.env -> ../../.env` (gitignored by `mj/.gitignore`).

## Per-Command Working Directory & `.env`

| Command | Working Directory | `.env` Read | Verified Notes |
|---|---|---|---|
| `corepack pnpm mj migrate` / `codegen` / `sync push` (core) | `mj/` | `mj/.env` | Core schema (`__mj`) and core metadata |
| `corepack pnpm run start:api` | `mj/` (Turbo executes in `mj/packages/MJAPI/`) | `mj/packages/MJAPI/.env` | Symlinked to `mj/.env`; `GRAPHQL_PORT=4050` |
| `corepack pnpm run start:explorer` | `mj/` | — | Serves on port `4251`, targets MJAPI `4050` |
| Dependency `corepack pnpm run mj:migrate` | Each sibling repo root (`bizapps-common/`, `bizapps-tasks/`, `bizapps-committees/`) | `.env` at each sibling repo root | Leaf-first order (`common` -> `tasks` -> `committees`); **Attempt A worked** (see below) |
| App `corepack pnpm run mj:migrate` | `bizapps-credentialing/` | `bizapps-credentialing/.env` | Creates `__mj_BizAppsCredentialing` and inserts `__mj.SchemaInfo` |
| App `corepack pnpm run mj:codegen` | `bizapps-credentialing/` | `bizapps-credentialing/.env` | Resolves `bizapps-credentialing/mj.config.cjs` + `.env` |
| App `corepack pnpm exec mj sync push --dir=metadata --ci` | `bizapps-credentialing/` | `bizapps-credentialing/.env` | Then `corepack pnpm run metadata:strip-sync` (removes the `sync` blocks the push wrote; see "Rebuild from nothing", step 5) |

## Dependency App Database Setup (Attempt A)

**Attempt A succeeded directly; Attempt B (`mj app install`) was not needed.**
With `.env` at each sibling repo root pointing to `MJ_6_2_2_CLEAN_credentialing`,
running `corepack pnpm run mj:migrate` leaf-first in `bizapps-common/`, then
`bizapps-tasks/`, then `bizapps-committees/` executed all shipped migrations
including their `Metadata_Sync` migrations and ran `mj migrate`'s automatic
per-schema metadata refresh (`spUpdateSchemaInfoFromDatabase` + entity metadata):
- `__mj_BizAppsCommon`: 31 tables, 30 entities, Application `Common` (plus legacy bucket `__mj_BizAppsCommon`)
- `__mj_BizAppsTasks`: 22 tables, 21 entities, Application `Tasks`
- `__mj_BizAppsCommittees`: 17 tables, 16 entities, Application `Committee Management`

## Metadata & `SchemaInfo` Findings

1. **`SchemaInfo` `@lookup` primary key:** `mj migrate --schema __mj_BizAppsCredentialing`
   triggers `refreshMetadataAfterOpenAppMigrate` (`spUpdateSchemaInfoFromDatabase`),
   which inserts the `__mj.SchemaInfo` row with an auto-generated ID before
   `mj sync push` runs. Therefore `metadata/schema-info/.schema-info.json` keys
   `primaryKey.ID` as `@lookup:MJ: Schema Info.SchemaName=__mj_BizAppsCredentialing`
   instead of a hardcoded UUID (which collides on `IX_SchemaInfo`).
2. **`EntityNamePrefix` 25-character limit:** `__mj.SchemaInfo.EntityNamePrefix`
   is `NVARCHAR(25)`, whereas `'MJ_BizApps_Credentialing: '` is 26 characters and
   fails `MJ: Schema Info` validation during `mj sync push`. CodeGen reads
   `mj.config.cjs` `newEntityDefaults.NameRulesBySchema` first and only falls back
   to `SchemaInfo.EntityNamePrefix` when unset (`mj/packages/CodeGenLib/src/Database/manage-metadata.ts`,
   `getNewEntityNameRule`), and sibling apps Tasks and Committees leave
   `SchemaInfo.EntityNamePrefix` `NULL`. Therefore `EntityNamePrefix` lives only
   in `mj.config.cjs` and is omitted from `.schema-info.json` (leaving DB
   `SchemaInfo.EntityNamePrefix` `NULL`, `EntityIDMin = 10000001`,
   `EntityIDMax = 10099999`).
3. **`MetadataSync` `.mj-*.json` ignore rule:** `mj/packages/MetadataSync/src/lib/record-file-glob.ts`
   globally ignores `**/.mj-*.json` as reserved MetadataSync config files.
   Naming the application record `.mj-bizapps-credentialing-application.json`
   caused `mj sync push` to read 0 records; renaming it to
   `metadata/applications/.credentialing-application.json` resolved the push.

## App Visibility in MJExplorer

`Credentialing` intentionally sets `DefaultForNewUser: false`.
`metadata/application-roles/.application-roles.json` grants it to `Developer` (access + admin)
and to the five credentialing roles (access); `UI` has no grant. When signing into MJExplorer (`http://localhost:4251`) as
`admin@memberjunction.org` (`Developer`), `Credentialing` is absent from the app
switcher initially and is added via **Application launcher → Configure… →
Available Applications → Add Credentialing → Save Changes** (creating an
`MJ: User Applications` row, `IsActive = 1`). Opening `Credentialing` then shows the nav
items `CredentialingApplication` builds from the user's roles (Task 10; `ClassName:
"CredentialingApplication"` on the Application record): Credentialing Staff → `Program Studio`
(`CredentialingProgramStudioResource`); Credentialing Admin → `Set up organization` (no
organization exists) or `New organization` (`CredentialingOrganizationSetupResource`); Reviewer or
Committee → `Assignments` (`CredentialingReviewHomeResource`); Applicant → `My Applications`
(`CredentialingApplicantHomeResource`). A user holding none of the five roles (such as the dev
`Developer` owner) sees no nav items. The scaffold `Overview` page no longer exists.

Observed in Explorer (Task 10, MJ v6.2.2):
- **Deep links: `DefaultNavItems` lists every item, each resource guards itself.** Explorer's route
  guard resolves `/app/credentialing/<Nav Item>` from the record's `DefaultNavItems` JSON only
  (`mj/packages/Angular/Explorer/explorer-core/src/app-routing.module.ts:500-545`), not from
  `GetNavItems()`; an item missing from that list logs `Nav item … not found in app credentialing`
  and returns before the tab is queued with the URL's query parameters. So `DefaultNavItems` holds
  all five labels (`Program Studio`, `Set up organization`, `New organization`, `Assignments`,
  `My Applications`; only the last is `isDefault`). What a user sees is still decided per user by
  `GetNavItems()`; a resource opened by URL by a user whose roles do not serve its area
  (`AreaNav.CanOpen`, `CredentialingAreaResource`) shows only `This area is not available to your
  account.` and makes no data request. Verified: `staff.a` opening
  `/app/credentialing/Program%20Studio?probe=1` in a fresh tab gets Program Studio with
  `Data.Configuration.queryParams = {"probe":"1"}` and no guard error; `admin@example.test` gets the
  not-available panel there; `staff.a` gets it on the four other items.
- **A user with no Credentialing role never reaches a resource.** `UI` has no `MJ: Application Roles`
  grant on Credentialing, so `UserInfoEngine.UserHasApplicationAccess` is false and Explorer shows
  "No Applications Available" for every Credentialing URL, even with an `MJ: User Applications`
  row (checked with `ui.only@example.test` and a temporary row, removed afterwards). No
  credentialing request reached MJAPI.
- **A saved tab for a removed resource heals once.** A workspace saved while `Overview` existed
  logs `No resource component registered for driver class "CredentialingOverviewResource"` on
  the next sign-in, after which the shell drops the tab and the saved configuration no longer
  names it.
- **Choosing the signed-in user without restarting MJAPI:** set `LOCAL_DEV_EMAIL` in
  `mj/packages/MJExplorer/src/environments/environment.development.ts` (the file `ng serve`
  uses; local only), wait for the dev server's rebuild, reload. Remove the line afterwards.

### Default CodeGen Role Grants (`mj.config.cjs`)

Because this app isolates organizations with row-level security filters, an
unfiltered `UI` grant would defeat organization isolation. Therefore
`mj.config.cjs` overrides CodeGen's defaults in two places so CodeGen emits
grants for `Developer` and `Integration` only (and never `UI`):

- `newEntityDefaults.PermissionDefaults`: sets `AutoAddPermissionsForNewEntities: true`
  with `Permissions` containing only `Developer` (full CRUD) and `Integration`
  (full CRUD).
- `newSchemaDefaults.ApplicationRoleDefaults`: sets
  `AutoAddRolesForNewApplications: true` with `Roles` containing only
  `Developer` (`CanAccess: true, CanAdmin: true`) and `Integration`
  (`CanAccess: true, CanAdmin: false`) for the generated schema application.

## Roles, row filters and permissions (Task 8)

**No credentialing role holds `UI`, and no world user holds `Developer` or `UI` beside a
credentialing role.** Every permission row is `MJ: Entity Permissions` metadata under
`metadata/entity-permissions/`, every filter is under `metadata/row-level-security-filters/`.

How MJ v6.2.2 evaluates them (read from source, then confirmed by `CRD-05`):

- **An unfiltered grant from any role exempts the user.** `EntityInfo.UserExemptFromRowLevelSecurity`
  (`mj/packages/MJCore/src/generic/entityInfo.ts:5012-5046`) returns true when any of the user's
  roles has an Allow row granting the operation with no filter for it. So a user holding
  `Credentialing Staff` and `Developer` (or `UI`, wherever `UI` holds an unfiltered read) reads
  every organization's rows. The filters of the user's other roles are OR'd
  (`GetUserRowLevelSecurityWhereClause`, `:5121-5139`), and a row that does not grant the operation
  contributes nothing (`GetUserRowLevelSecurityInfo`, `:5065-5108`).
- **Reads** add the Read filter to the view query
  (`mj/packages/GenericDatabaseProvider/src/GenericDatabaseProvider.ts:3219-3224`). A user with no
  Read permission at all has the read refused: `RunView` fails with
  `User <email> does not have read permissions on <entity>` (`CheckUserReadPermissions`).
  `CRD-05` asserts which of the two each "reads nothing" case is.
- **Writes** (`mj/packages/MJCore/src/generic/databaseProviderBase.ts:2126-2195`): the entity's
  validation runs first (`BaseEntity.Save` → `Validate`/`ValidateAsync`, then the provider's
  `OnValidateBeforeSave`), and only then the Create filter (`CheckCreateRLS`, a synthetic-row
  `SELECT CASE WHEN (<filter>)`; refusal `Access denied for new <entity> record`) or the Update
  filter (`CheckRecordRLS` on the stored row; refusal
  `Record not found or access denied for <entity>`), and after the before-save hooks a post-image
  check of both. A delete checks the Delete filter after the before-delete hooks (`:2447-2459`).
  The credentialing entity guards of Task 6 read every parent **as the caller**, so a parent of
  another organization fails validation with `Record not found.` before the platform filter is
  reached; `cred-isolation.3` proves the refusal for another organization's parent, standard
  update and standard delete (and for `CreateProgram`, `CloneVersionToDraft`,
  `ReorderVersionTree`) equals the refusal for a random UUID. A Create-filter refusal message
  (`Access denied for new …`) is therefore never what a staff member sees for these entities.
- The Create filter's subquery runs on the saving transaction's connection (the provider's
  `ExecuteSQL` joins the ambient transaction), so `CreateProgram`'s version insert passes
  `Credentialing: Staff Rows By Program` against the program row inserted moments earlier in the
  same transaction — measured: `CRD-04` passes as `StaffA`.

| Filter | Attached to | Text |
|---|---|---|
| `Credentialing: Staff Organizations` | Accrediting Organizations | `(ID IN (<membership>))` |
| `Credentialing: Staff Rows By Organization` | Programs, Organization Memberships | `(AccreditingOrganizationID IN (<membership>))` |
| `Credentialing: Staff Rows By Program` | Program Versions | `(ProgramID IN (SELECT p.ID FROM [__mj_BizAppsCredentialing].[vwPrograms] p WHERE p.AccreditingOrganizationID IN (<membership>)))` |
| `Credentialing: Staff Rows By Version` | Sections, Standards, Document Requirements | `(ProgramVersionID IN (SELECT v.ID FROM …[vwProgramVersions] v INNER JOIN …[vwPrograms] p ON p.ID = v.ProgramID WHERE p.AccreditingOrganizationID IN (<membership>)))` |
| `Credentialing: Staff Committees` | `Committees: Committees` | `(OrganizationID IN (SELECT ao.OrganizationID FROM …[vwAccreditingOrganizations] ao INNER JOIN …[vwOrganizationMemberships] m ON m.AccreditingOrganizationID = ao.ID WHERE m.UserID = TRY_CAST('{{UserID}}' AS UNIQUEIDENTIFIER)))` |
| `Credentialing: Own Workspace Items` | MJ: Workspace Items (shell) | `(WorkspaceID IN (SELECT w.ID FROM [__mj].[vwWorkspaces] w WHERE w.UserID = TRY_CAST('{{UserID}}' AS UNIQUEIDENTIFIER)))` |
| `Credentialing: Shell Empty` | shell entities a role must not read | `(1 = 0)` |
| `Credentialing: Resource Type Catalog` | MJ: Resource Types (shell) | `(1 = 1)` — type names, not records; present so no grant outside the schema is unfiltered |

`<membership>` is `SELECT m.AccreditingOrganizationID FROM [__mj_BizAppsCredentialing].[vwOrganizationMemberships] m WHERE m.UserID = TRY_CAST('{{UserID}}' AS UNIQUEIDENTIFIER)`.
The view names are the ones CodeGen created (`SELECT name FROM sys.views WHERE schema_id =
SCHEMA_ID('__mj_BizAppsCredentialing')`: `vwAccreditingOrganizations`, `vwDocumentRequirements`,
`vwOrganizationMemberships`, `vwPrograms`, `vwProgramVersions`, `vwSections`, `vwStandards`).

**Committees names (Task 8 Step 3 discovery).** Read from `__mj.Entity`/`__mj.EntityField` and
`bizapps-committees/migrations/B202602151200__v1.0__Committees_Baseline.sql`: entity
`Committees: Committees`, table `[__mj_BizAppsCommittees].[Committee]`, base view `vwCommittees`;
the owning-organization column is `OrganizationID`, related entity
`MJ_BizApps_Common: Organizations`. An accrediting organization's Common organization is
`AccreditingOrganization.OrganizationID`, which is what the filter joins on. The permission row is
on the dependency's entity; its schema is untouched.

Grants (`Type: Allow`; every granted operation of a filtered row carries the filter):

| Role | Entity | Grant |
|---|---|---|
| Credentialing Staff | Programs, Program Versions, Sections, Standards, Document Requirements | CRUD, filtered |
| Credentialing Staff | Accrediting Organizations, Organization Memberships | Read, filtered |
| Credentialing Staff | Committees: Committees | Read, `Credentialing: Staff Committees` |
| Credentialing Admin | Accrediting Organizations, Organization Memberships | CRUD, unfiltered |
| Committee, Reviewer, Applicant | the seven entities | none |
| all five | the shell baseline below | filtered |
| `UI` | the seven entities | **no row at all** (see below) |

**Task 8 Step 4 discovery — CodeGen does not grant `UI`.** With the override of Task 4
(`mj.config.cjs` `newEntityDefaults.PermissionDefaults` lists only `Developer` and
`Integration`), there is no `UI` row to switch off, so no `metadata/entities/.ui-role-permissions.json`
exists (an `@lookup` primary key of a `UI` row would fail to resolve). After the metadata push,
`corepack pnpm run mj:codegen` (rc 0, 520 entities) and
`SELECT e.Name, ep.CanRead FROM __mj.EntityPermission ep JOIN __mj.Entity e ON e.ID=ep.EntityID JOIN __mj.Role r ON r.ID=ep.RoleID WHERE r.Name='UI' AND e.SchemaName='__mj_BizAppsCredentialing'`
returned **zero rows**, and `git status` showed no change under any `src/generated/` folder or
`migrations/` (CodeGen's SQL log goes to the gitignored `migrations/codegen/`).
`cred-isolation.5` (a user holding only `UI` reads nothing; each read is refused for want of
permission) passes.

**Task 8 Step 6 discovery — the Explorer shell baseline of the credentialing roles.** Signed in
by dev-login (`MJ_DEV_AUTH_DEFAULT_EMAIL` in `mj/.env`, MJAPI restarted, then removed again) as
`staff.a@example.test` and as `admin@example.test`, in Orca's built-in browser on
`http://localhost:4251` (the chrome-devtools MCP could not start: its Chrome profile was held by
another session's browser). Both load Explorer and open the Credentialing application on its
scaffold Overview (`/app/credentialing/Overview`); screenshots in
`../logs/screens/task8-{staff-a,admin}-credentialing.png` (outside the repo). The final list, in
`metadata/entity-permissions/.core-entity-permissions.json`, for all five roles:

| Entity | Grant | Filter | Why |
|---|---|---|---|
| MJ: Workspaces | CRUD | `Magic Link: Own Rows by UserID` | Explorer creates the per-user workspace (Magic Link baseline) |
| MJ: Workspace Items | CRUD | `Credentialing: Own Workspace Items` | same |
| MJ: User Settings, MJ: User Favorites, MJ: User Record Logs, MJ: User Notification Preferences | CRUD | `Magic Link: Own Rows by UserID` | per-user stores (Magic Link baseline) |
| MJ: User Roles, MJ: User Applications | Read | `Magic Link: Own Rows by UserID` | current user and app access (Magic Link baseline) |
| MJ: Application Roles | Read | `Magic Link: Own Application Roles` | app authorization (Magic Link baseline) |
| MJ: User Notifications | Read, Update | `Magic Link: Own Rows by UserID` | found here: `UserInfoEngine` loads its seven entities all-or-nothing (`BaseEngine.CheckPermissionsOrSkipAll`, `mj/packages/MJCore/src/generic/baseEngine.ts:2138`); without these two the whole engine loaded empty and the app switcher said "No Applications Available" / "user lacks read permission on: MJ: User Applications" |
| MJ: User Notification Types | Read | `Credentialing: Shell Empty` | same engine |
| MJ: Resource Types | Read | `Credentialing: Resource Type Catalog` | found here: the tab container throws `ResourceType ID not found for type: Custom` (`explorer-core/.../tab-container.component.ts:2525`) and the shell stalls on "Taking longer than expected" without it; `ResourcePermissionEngine` loads it with Resource Permissions all-or-nothing |
| MJ: Resource Permissions | Read | `Magic Link: Own Rows by UserID` | same engine |
| MJ: Application Settings | Read | `Credentialing: Shell Empty` | `ApplicationSettingEngine` (nav item settings) |

Nothing on `MJ: Record Changes`, `MJ: Queries` or `MJ: Users` (`cred-isolation.8` asserts the first
two). The remaining console noise is by MJ's design: engines the role cannot read load empty
(`BaseEngine` "Skipping N config(s)" warnings), `UserInfoEngine.CreateDefaultApplications` cannot
add the `DefaultForNewUser` apps (no Create on User Applications), and the shell's avatar load
(`shell.component.ts:3638-3663`, which loads the user's own `MJ: Users` row) is caught and falls
back to the default avatar.

**The Credentialing application must be in the user's `MJ: User Applications`.** The roles read
their own rows but cannot create one, and the application is not `DefaultForNewUser`. Organization
setup creates it for a new staff member (Task 7); the world loader creates it for `StaffA`,
`StaffB`, `StaffNoMembership` and `Admin` (`ensureCredentialingApplication` in
`packages/IntegrationTests/src/world/load-world.ts`). How an administrator who is not set up by
organization setup gets it is not settled by this task.

## Signing in to Explorer as a chosen user

By default, MJExplorer's local dev auth provider (`MJLocalDevProvider`,
`mj/packages/Angular/Explorer/auth-services/src/lib/providers/mjexplorer-local-dev-provider.service.ts`)
reads `environment.LOCAL_DEV_EMAIL` (`mj/packages/MJExplorer/src/environments/environment.ts`);
when unset, `acquireDevToken()` posts an empty body (`{}`) to
`POST /auth/dev-login` on every `initialize()` call. On MJAPI,
`ResolveLocalDevUser` (`mj/packages/MJServer/src/auth/localDevAuth.ts`) checks
`MJ_DEV_AUTH_DEFAULT_EMAIL` (and `configInfo.devAuth.defaultEmail` in
`mj/mj.config.cjs`) before falling back to `admin@memberjunction.org`.

To open `http://localhost:4251` as any chosen existing user without editing
Explorer source or restarting MJExplorer:

1. Set `MJ_DEV_AUTH_DEFAULT_EMAIL=<user-email>` in `mj/.env` (which
   `mj/packages/MJAPI/.env` symlinks to).
2. **Restart MJAPI** so `dotenv/config` reloads `.env` and `UserCache.Instance.Users`
   includes the user (and any newly added roles or applications).
3. Reload `http://localhost:4251` in the browser; `MJLocalDevProvider` acquires a
   fresh JWT for that user automatically (no MJExplorer restart needed).
4. To return to `admin@memberjunction.org`, remove `MJ_DEV_AUTH_DEFAULT_EMAIL`
   from `mj/.env`, restart MJAPI, and reload `http://localhost:4251`.

(Alternatively, setting `LOCAL_DEV_EMAIL` in
`mj/packages/MJExplorer/src/environments/environment.ts` causes Explorer to send
`{ email }` in `POST /auth/dev-login`, which avoids editing `mj/.env` or restarting
MJAPI after initial user creation, at the cost of recompiling MJExplorer.)

## Signing in as a persona

`scripts/dev/personas.json` names the seven personas. Each has an email, a sign-in method and the
account's origin:

| Persona | Email | Sign-in | Role | Account created by |
|---|---|---|---|---|
| `staff-a` | `staff.a@example.test` | dev-login | Credentialing Staff (OrgA) | world (`seed:users`) |
| `staff-b` | `staff.b@example.test` | dev-login | Credentialing Staff (OrgB) | world |
| `staff-none` | `staff.none@example.test` | dev-login | Credentialing Staff, no membership | world |
| `admin` | `admin@example.test` | dev-login | Credentialing Admin | world |
| `applicant-a` | `applicant.a@example.test` | magic link | Credentialing Applicant | world; the redemption adds its application row |
| `reviewer-a` | `reviewer.a@example.test` | magic link | Credentialing Reviewer | the first redemption |
| `committee-a` | `committee.a@example.test` | magic link | Credentialing Committee | the first redemption |

```sh
corepack pnpm run persona staff-b        # token=<jwt>            (POST /auth/dev-login)
corepack pnpm run persona applicant-a    # url=<redemptionUrl>    (a fresh single-use invite, 8 hours)
corepack pnpm run probe:isolation        # one PASS/FAIL line per case and actor; exit 1 on any FAIL
```

Both scripts talk to MJAPI over HTTP and GraphQL only (`MJAPI_URL`, default `http://localhost:4050`);
IDs are looked up by name in the metadata MJAPI serves. MJ's log output goes to stderr, so stdout
carries only the one line (or the probe's lines).

**Who issues the links: the local dev Owner, `admin@memberjunction.org`** (the `issuer` field of
`personas.json`). It passes the issuer check because its `Type` is `Owner`: `CanIssueInvites`
returns true for an Owner before it looks at `inviteIssuerRoleNames`
(`mj/packages/MJServer/src/auth/magicLink/magicLinkCore.ts:72-85`). It can also write the invite row:
`MagicLinkService.CreateInvite` saves `MJ: Magic Link Invites` **as the caller**
(`MagicLinkService.ts:197-207`), and the Owner holds `Developer`, which has Create there. A
`Credentialing Staff` user passes the issuer check (`inviteIssuerRoleNames: ['Credentialing Staff']`)
but is then refused with `Does NOT have permission to Create MJ: Magic Link Invites records` (HTTP
400), and B1 grants no credentialing role anything on that entity — the reason is in
`docs/isolation-read-paths.md`, "Owed by the plan that adds invite issuing".

**What a redemption does** (`MagicLinkService.RedeemInvite`, `ts:418-560`, and `provisionUser`,
`:673-720`), measured on this instance:
- It ensures an `MJ: Application Roles` row giving the invite's role access to the application
  (`ensureAppAccess`, `:874-919`; the five credentialing roles already have theirs from Task 8).
- An account whose email is **already in MJAPI's user cache** keeps its account: the invite's role and
  an `MJ: User Applications` row for the application are added if missing (`ensureRoleAndApp`,
  `:829-871`). That is how `applicant.a@example.test` gets its Credentialing application row. An
  existing account holding any role outside the restricted and grantable roles (for example
  `Developer`) is "protected" and is refused or warned about per `provisioningGuard` (`:690-711`).
- An email **not in the cache** gets a new account (`Type = User`, `Name` the email, `FirstName = 'Guest'`) with exactly
  the role and the application row, in one transaction, and is pushed into the cache
  (`createScopedUser`, `:763-826`). That is how `reviewer.a@` and `committee.a@` come to exist; they
  are therefore not world users and `seed:users` does not create them. Because the lookup is the cache,
  restart MJAPI after loading the world: a world account missing from the cache would be created a
  second time and fail on the duplicate email.
- The session JWT carries `mj_magic_link: true` and `mj_app_id`. The server keeps the account's real
  database roles for a named session (`mj/packages/MJServer/src/context.ts:232-290`); Explorer's
  magic-link provider locks the shell to `mj_app_id` (`GetSessionScope`,
  `mj/packages/Angular/Explorer/auth-services/src/lib/providers/mjexplorer-magic-link-provider.service.ts:177-186`).

**Task 12 Step 4 discovery — an external role boots Explorer.** After an MJAPI restart, the
`applicant-a` link opened in chrome-devtools (isolated browser context), the interstitial's
"Continue to sign in" pressed: Explorer loads on `/app/credentialing`, shows
`You have no applications yet.`, and has **no app switcher** (the header holds only the Credentialing
nav item "My Applications"). `http://localhost:4251/app/admin`, `/app/home` (the Home application's
path) and `/` each land back on `/app/credentialing`. The console holds only the expected
"Skipping N config(s) … lacks read permission" engine warnings; no shell entity beyond the Task 8
list was needed, so `.core-entity-permissions.json` is unchanged. Screenshots:
`../logs/screens/t12-applicant-{credentialing,admin-redirect,home-redirect}.png` (outside the repo).

**A dev-login persona in the browser without restarting MJAPI.** Explorer chooses the magic-link auth
provider for any page load whose URL fragment carries `#token=`
(`mj/packages/Angular/Explorer/auth-services/src/lib/auth-services.module.ts:66-81`); that provider only
stores the token in `sessionStorage` and sends it as the bearer token, and MJAPI validates it by its
issuer like any other. So a dev-login token can be handed to Explorer directly:

```
http://localhost:4251/app/credentialing#token=<the jwt printed by: pnpm run persona staff-b>
```

Measured: opened in a fresh isolated browser context, Explorer signs in as Staff B, shows Program
Studio with only `Sample Program B`, and (no `mj_magic_link` claim) keeps the app switcher. Use a
fresh tab or browser context per persona (the token lives in that tab's `sessionStorage`). The token
is not refreshed; it lasts as long as dev-login's token (8 hours here), and survives an MJAPI restart
only when `MJ_MAGIC_LINK_PRIVATE_KEY` is set (otherwise mint a new one after every restart). Once
stored, the tab keeps using it on later navigations without the fragment (`MJMagicLinkProvider.hasSessionToken`,
`auth-services.module.ts:66-81`). Screenshot:
`../logs/screens/t12-staff-b-fragment-token.png`. The `MJ_DEV_AUTH_DEFAULT_EMAIL` route above still
works and is the one to use for a normal, refreshing dev session.

## Rebuild from nothing

If `node mj/packages/MJCLI/bin/run.js dev workspace --force` is run at the
workspace parent during recovery, re-apply the `@typespec/ts-http-runtime` /
`@azure/*` pins and the 12 Angular `21.2.22` overrides to parent
`pnpm-workspace.yaml`, then run `corepack pnpm install && corepack pnpm prune`
at the workspace parent and `corepack pnpm --filter "@mj-biz-apps/common-*" run build`
before `corepack pnpm run build`.

Followed literally, top to bottom, for the B1 verification (`docs/verification/b1-2026-11.md`);
every step below is the one that worked.

1. Stop MJAPI (`4050`) and MJExplorer (`4251`) so no open connections hold the database.
2. Drop (if present) and recreate the database, with read-committed snapshot on:
   ```sql
   ALTER DATABASE [MJ_6_2_2_CLEAN_credentialing] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
   DROP DATABASE [MJ_6_2_2_CLEAN_credentialing];
   CREATE DATABASE [MJ_6_2_2_CLEAN_credentialing];
   ALTER DATABASE [MJ_6_2_2_CLEAN_credentialing] SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
   ```
   Without the last line every MJAPI start logs `[WorkQueue] Error: Database transport —
   READ_COMMITTED_SNAPSHOT is OFF for this SQL Server database. The Database transport requires it`
   (`mj/packages/MJServer/src/services/WorkQueueHostService.ts`, `ReportTopologyIssues`). A new SQL
   Server database has it off; check with
   `SELECT is_read_committed_snapshot_on FROM sys.databases WHERE name = 'MJ_6_2_2_CLEAN_credentialing'`.
3. From `mj/` (using `mj/.env`), migrate and populate MJ core:
   ```sh
   corepack pnpm mj migrate
   corepack pnpm mj codegen --skipfiles
   corepack pnpm mj sync push --dir=metadata --ci
   corepack pnpm mj codegen --skipdb
   corepack pnpm run build
   ```
4. Migrate dependency apps leaf-first (with `.env` in each sibling root), and provision the local dev Owner user (`admin@memberjunction.org` with roles `Developer`, `Integration`, `UI`) from `bizapps-credentialing/`:
   ```sh
   (cd ../bizapps-common && corepack pnpm run mj:migrate)
   (cd ../bizapps-tasks && corepack pnpm run mj:migrate)
   (cd ../bizapps-committees && corepack pnpm run mj:migrate)
   corepack pnpm run dev:owner
   ```
   On the first run `dev:owner` prints `Application 'Credentialing' not yet in metadata; skipping MJ:
   User Applications` — expected; step 6 adds the row.
5. From `bizapps-credentialing/` (using `bizapps-credentialing/.env`), migrate and push app metadata,
   then remove the `sync` blocks the push wrote:
   ```sh
   corepack pnpm run mj:migrate
   corepack pnpm exec mj sync push --dir=metadata --ci
   corepack pnpm run metadata:strip-sync
   ```
   The push writes a `sync` block (`lastModified`, `checksum`) into every record it creates or changes
   (`PushService`, `mj/packages/MetadataSync/src/services/PushService.ts`, "Sync metadata handling";
   nested `relatedEntities` records too) and rewrites record files as `JSON.stringify(data, null, 2)`
   with no trailing newline (`JsonWriteHelper`). `sync` blocks are never committed.
   `scripts/dev/strip-sync-blocks.mjs` (`metadata:strip-sync`) removes exactly that: the `sync`
   property of every record object (an object with `fields`) under `metadata/` and `metadata-tests/`,
   writing 2-space JSON with the final newline the committed file has; files the push only re-wrote get
   just their final newline back, and `.mj-sync.json` files are never touched. **Do not use
   `git checkout`/`git restore` for this**: it would also discard any metadata edit not yet committed.
   Proof (B1 verification): with a hand edit to three role descriptions in `metadata/roles/.roles.json`,
   a push wrote 3 `sync` blocks and dropped 7 files' final newlines; after the script, `git diff` held
   only the hand edit. On a fresh database the push reports `created: 100, updated: 1`.
6. Ensure `admin@memberjunction.org` has the `MJ: User Applications` row for `Credentialing` (either via `corepack pnpm run dev:owner` in `bizapps-credentialing/` when no browser is needed — idempotent via entity objects — or in Explorer via **Application launcher → Configure… → Available Applications → Add Credentialing → Save Changes**):
   ```sh
   corepack pnpm run dev:owner     # Granted MJ: User Applications 'Credentialing' to 'admin@memberjunction.org'.
   ```
7. From `bizapps-credentialing/`, build this app's packages, push the integration test rows
   (`MJ: Tests`) and strip their `sync` blocks the same way, then confirm CodeGen has nothing to change:
   ```sh
   corepack pnpm run build:packages
   corepack pnpm exec mj sync push --dir=metadata-tests --ci     # created: 7
   corepack pnpm run metadata:strip-sync
   corepack pnpm run mj:codegen                                  # 520 entities
   git status --short                                            # nothing under migrations/ or src/generated/
   ```
   Build before starting MJAPI: `mj/mj.config.cjs` `dynamicPackages.server` loads
   `@mj-biz-apps/credentialing-server` from its `dist/`, and `mj/`'s own `corepack pnpm run build`
   (step 3) does not build this app's packages (no `@mj-biz-apps/credentialing-*` task in its turbo
   run). The `mj test` check module is `packages/IntegrationTests/dist/index.js`.
8. From `mj/`, start MJAPI (`corepack pnpm run start:api`, port `4050`) and MJExplorer
   (`corepack pnpm run start:explorer`, port `4251`). Start them detached (for example with `nohup …
   &` and the output redirected to a log file) when they must outlive the shell that started them.
   MJAPI is up when `POST /auth/dev-login` answers; Explorer's first page load after a start compiles
   for a few minutes.
9. Set `MJ_MAGIC_LINK_PRIVATE_KEY` in `mj/.env` once (it survives rebuilds, since it is not in the
   database), without printing it, then restart MJAPI:
   ```sh
   K=$(openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 2>/dev/null | base64 | tr -d '\n')
   # write it as the value of MJ_MAGIC_LINK_PRIVATE_KEY= in mj/.env (one line)
   ```
   See "Magic-Link & Dynamic Package Wiring" for what goes wrong without it.
10. Set `MJ_BASE_ENCRYPTION_KEY` — the same value — in `mj/.env` (MJAPI) and
   `bizapps-credentialing/.env` (`mj test`, the dev scripts). It is the key material of the
   `Base Encryption Key` row (`__mj.EncryptionKey`, `EnvVarKeySource`, algorithm `AES-256-GCM`,
   256 bits), so it is 32 random bytes, base64-encoded, generated as MJ's message says
   (`mj/packages/Encryption/src/providers/EnvVarKeySource.ts`):
   ```sh
   openssl rand -base64 32
   # then in each .env:
   MJ_BASE_ENCRYPTION_KEY=<base64 of 32 random bytes>
   ```
   Without it every MJAPI start and `mj test` run prints `ENCRYPTION KEY VALIDATION FAILED`
   (`EncryptionStartupValidator`), and any save of an encrypted field (`MJ: Credentials`) fails.
   Set it before anything is encrypted: values encrypted under one key cannot be read with another.
11. Set `MJ_API_KEY` in `bizapps-credentialing/.env` for the client-transport harness. It is
   MJAPI's **system** API key — the same value as `MJ_API_KEY` in `mj/.env` — not a user
   `mj_sk_…` key (see "Running tests" below). No key is created in Explorer or in the database.
   Generate it as 32 random bytes in hex and write the same value to both files without printing it
   (MJ's installer does not generate this key; any secret string works, MJAPI compares it with
   `x-mj-api-key`); restart MJAPI afterwards. To rotate it, repeat this and rerun
   `corepack pnpm run test:integration`:
   ```sh
   K=$(openssl rand -hex 32)   # then MJ_API_KEY=$K in mj/.env and bizapps-credentialing/.env
   ```

Steps 9–11 are one-time `.env` settings; on a rebuild of an instance that already has them, check
that each is present and non-empty (`grep -c '^MJ_MAGIC_LINK_PRIVATE_KEY=.' mj/.env`) and move on.

### First run on the rebuilt database

Before any test row or `seed:dev`, the database has no accrediting organization. This is the
order that proves first-run setup (B1 verification, Step 1):

```sh
corepack pnpm run seed:users        # cred-users.1: the six world accounts, roles and app rows, no organization
# restart MJAPI so its user cache holds the new accounts
corepack pnpm run persona admin     # token=…; open http://localhost:4251/app/credentialing#token=<token>
```

`admin@example.test` lands on **Set up organization**. `seed:users` gives it the Credentialing
`MJ: User Applications` row (`ensureCredentialingApplication`, `load-world.ts`), so no Explorer
configuration is needed. Creating `Sample Accrediting Body A` with `staff.a@example.test` writes one
accrediting organization, one Common organization of that name and one membership; `staff.a`
already holds `Credentialing Staff` and the application row from `seed:users`, and the operation adds
neither a second time. `staff.a@example.test` then signs in **without an MJAPI restart** (the
operation refreshes the user cache) and gets an empty Program Studio. The world loader finds that
organization by name and adopts it as `OrgA` (`seed:dev` creates no second one). After that, run
`pnpm test`, the `CRD-*` rows, restart MJAPI, then `test:integration`, `seed:dev`, `probe:isolation`.

## Running tests

All commands run from `bizapps-credentialing/` (verified against this instance).

**Unit tests** (vitest, every `packages/*` package; packages with no tests pass via
`passWithNoTests`):

```sh
corepack pnpm test                                                   # all packages, via turbo
corepack pnpm --filter @mj-biz-apps/credentialing-core run test      # one package
corepack pnpm --filter @mj-biz-apps/credentialing-core exec vitest run src/__tests__/smoke.test.ts   # one file
```

**Integration tests, server transport** (`mj test`, direct SQL provider; needed for
multi-user checks). Reads `bizapps-credentialing/.env` and `bizapps-credentialing/mj.config.cjs`
(`dbHost`/`dbDatabase`/`dbUsername`/`dbPassword` and `testing.checkModules`). Requires
`corepack pnpm run build:packages` first and the `metadata-tests` rows pushed:

```sh
corepack pnpm exec mj sync push --dir=metadata-tests --ci
MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "CRD-00 - Smoke"
```

`testing.checkModules` holds `path.join(__dirname, 'packages/IntegrationTests/dist/index.js')`,
not the package name: `mj test` imports a bare specifier from its own location
(`mj/packages/TestingFramework/CLI/src/utils/check-module-loader.ts`), where
`@mj-biz-apps/credentialing-integration-tests` does not resolve (`MODULE_NOT_FOUND`), and a
failed load only surfaces later as `Unknown integration check bundle`. A successful run prints
`Loaded check modules: …/packages/IntegrationTests/dist/index.js (bundles added: 1)`.

**Integration tests, client transport** (GraphQL against the running MJAPI on `4050`):

```sh
corepack pnpm run test:integration              # every bundle in ALL_BUNDLES
corepack pnpm run test:integration cred-smoke   # one bundle (or one check: cred-smoke.1)
```

`test-harnesses/integration.mjs` loads `bizapps-credentialing/.env`, then `../mj/.env` (for
`GRAPHQL_PORT=4050`; dotenv never overrides a value already set). `BootstrapIntegrationClient`
(`mj/packages/TestingFramework/testing-integration/src/bootstrap-client.ts`) sends `MJ_API_KEY`
as the `x-mj-api-key` header, which MJAPI accepts only when it equals its own system key
(`mj/packages/MJServer/src/context.ts`, `GetUserPayload`) and then runs as the `System` user.
A user API key (`mj_sk_…`, `x-api-key` header) is not used by this harness.

### Which bundles run on which transport

| Bundle | Test row | Transport |
|---|---|---|
| `cred-smoke` | `CRD-00 - Smoke` | server and client |
| `cred-schema` | `CRD-01 - Schema` | server and client |
| `cred-version-rules` | `CRD-02 - Version rules` | server only |
| `cred-standard-rules` | `CRD-03 - Standard rules` | server only |
| `cred-operations` | `CRD-04 - Operations` | server only |
| `cred-isolation` | `CRD-05 - Isolation` | server only |
| `cred-world` | `CRD-06 - World` | server and client (`pnpm run seed:dev`) |
| `cred-users` | — (client harness only) | client (`pnpm run seed:users`; registered in `cred-world.checks.ts`) |
| `cred-operations-wire` | — (client harness only) | client only |

```sh
MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "CRD-02 - Version rules"   # 11 checks
MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "CRD-03 - Standard rules"  # 10 checks
MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "CRD-04 - Operations"     # 12 checks
MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "CRD-05 - Isolation"      # 9 checks
MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "CRD-06 - World"          # 2 checks
corepack pnpm run test:integration cred-operations-wire                                               # 3 checks, GraphQL
corepack pnpm run seed:dev                                                                            # 2 checks (cred-world), GraphQL
corepack pnpm run seed:users                                                                          # 1 check (cred-users), GraphQL
```

**Dev seeding (`seed:dev` and `seed:users`).** Both scripts run `test-harnesses/integration.mjs` on
the client transport (GraphQL against MJAPI on port `4050` using `MJ_API_KEY`, which resolves to the
`System` user, `Type = 'Owner'`, holding `Developer` and `Integration` so `MJ: Users`,
`MJ: User Roles`, `MJ: User Applications`, Common/Committees entities, and all seven credentialing
entities are writable over GraphQL):
- `pnpm run seed:dev` (`node test-harnesses/integration.mjs cred-world`): loads the full
  `CredentialingWorld` (`EnsureWorldUsers` + `EnsureWorldData` including `SampleProgram`,
  `PlaceholderProgram` with 12 sections / 36 standards / 5 document requirements, and `ProgramB`),
  verifies idempotent reload, and verifies `EnsureProgramTree` partial-delete repair on a run-unique
  scratch tree (`Repair <hex>`), which it deletes again when the check ends (a Draft version's delete
  removes its tree), so a second `seed:dev` leaves every row count unchanged. Measured: the row counts
  of the seven credentialing tables, Common organizations, users, user roles, user applications and
  committees were identical before and after two more runs. (Before this was fixed, every run left one
  `Repair <hex>` program in `OrgA`; the earlier ones are still in this dev database.)
- `pnpm run seed:users` (`node test-harnesses/integration.mjs cred-users`): runs `EnsureWorldUsers`
  only (creates or finds the six world user accounts, their roles, and Credentialing application
  rows, with no accrediting organizations), for first-run setup verification. Restart MJAPI
  afterward before signing in as any newly created user so `UserCache` picks up their roles.
Both scripts are idempotent when run twice in a row. `packages/IntegrationTests/src/world/load-world.ts`
calls `LoadGeneratedEntities()` from `@mj-biz-apps/common-entities` and `@mj-biz-apps/committees-entities`
so dependency-app entity subclasses are registered even when loaded via the client harness without
the package barrel.

`cred-operations` is server only for three reasons: `.3` writes one `EvaluationMode` with SQL
(the provider's `ExecuteSQL`, which GraphQL does not have), `.6` sets the static test seam
`CloneVersionToDraftServerOperation.FailAfterStandards` (it exists only in the server process, reached
through the class factory registration), and `.7` and `.9` need separate provider instances. The
program operations act as the world's `StaffA` (`staff.a@example.test`: only `Credentialing Staff`, a
membership of OrgA, where every scratch program is made), so they run under staff's row-filtered
permissions; organization setup acts as the world's `admin@example.test` (`Credentialing Admin`).
`cred-operations-wire.2` signs in as `staff.a@example.test` too. (Task 7's stand-in
`operations.staff@example.test`, which held `Developer` beside `Credentialing Staff`, is no longer
used; its `Developer` grant was removed from the dev database.)

`cred-operations-wire` proves the browser path: the shared contract classes of
`@mj-biz-apps/credentialing-core`, called with no provider (as a browser calls them) or with a second
`GraphQLDataProvider` session signed in through `POST /auth/dev-login`, against the running MJAPI.
Its precondition is that the world exists and MJAPI's user cache holds the world's role grants: run
`CRD-04 - Operations` once on the server transport, then `servers.sh restart api`, then the wire
bundle. Measured: `.1` FORBIDDEN for the `System` user on both operations, `.2` staff create a
program and get `REFUSED` + the guard's sentence for a blank label with no row left, `.3` an admin
sets up an organization and the new staff member's dev-login, made straight after the call returned,
lists `Credentialing Staff` in its roles.

Build `packages/IntegrationTests` (or `build:packages`) and push `metadata-tests` first. A
change to `packages/CoreEntitiesServer` needs a build and an MJAPI restart before anything that
goes through MJAPI sees it. The `mj test` process loads the built package itself, so it needs no
restart.

**The client harness never imports the package barrel.** `packages/IntegrationTests/dist/index.js`
registers the server entity subclasses (`LoadBizAppsCredentialingEntitiesServer()`, which also
loads `@memberjunction/sqlserver-dataprovider` through the authoring lock). Imported into the
GraphQL client process, those subclasses replace the classes a browser gets. Measured:
`GetEntityObject('MJ_BizApps_Credentialing: Standards')` returned `StandardEntityServer` through
the barrel, and the client class through a bundle module. MJ's rule for client dispatchers
(`mj/packages/TestingFramework/testing-integration/src/registry.ts`, B32) is to pair the
server-free `@memberjunction/testing-integration/client` bootstrap with a direct import of each
bundle's own module through the package's `./checks/*` subpath. `test-harnesses/integration.mjs`
does exactly that: it imports the client entity classes
(`packages/Entities/dist/index.js`) and then `dist/checks/<bundle>.checks.js` for each requested
bundle. Check modules therefore import nothing from
`@mj-biz-apps/credentialing-core-entities-server` except `import type`. Asking the client harness
for a server-only bundle fails with the `mj test run` command to use instead.

**Concurrency checks use separate provider instances, on the server transport.** Two saves begun
on one provider instance join one transaction, where a transaction-owned application lock is
re-entrant and proves nothing. `cred-version-rules.7`, `.8`, `.10`, `.11` and
`cred-standard-rules.7`, `.8` give each actor its own `ctx.Provider.CreateIndependentInstance()`
(`IntegrationTests/src/actors.ts`, `WithActors`). Each instance shares the pool and metadata but
has its own transaction stack, like MJAPI's per-request providers. `SQLServerDataProvider` implements it at
v6.2.2 (`mj/packages/SQLServerDataProvider/src/SQLServerDataProvider.ts:748`), so the client
transport was not needed for these checks.

- Started in the same tick (in either order), the activation in `.7` reached the version lock
  first in 29 of 30 rounds over three runs. Instrumented, both lock requests arrived within a millisecond and
  the second was granted only after waiting (`sp_getapplock` returned `1`), so the race was real
  but lopsided. `.7` therefore alternates which write leads and starts the other 5 ms later, while
  the leader's transaction is still open (a write here takes 30–40 ms). Every round still showed
  a grant after waiting, and the rounds split 5/5.
- Negative control (lock turned into a no-op, then restored): `.7` failed (both writes succeeded,
  leaving an Active version with an empty section), `cred-standard-rules.7` failed (the loser got
  SQL Server's duplicate-key text, not the rule's sentence) and `.8` failed once it ran five
  rounds. A single round of `.8` passed without the lock when row locks on the first insert
  happened to serialize the second request's read. That is why `.8` runs five rounds. Three
  Active-with-an-empty-section scratch versions from that control run remain in the dev database
  (scratch residue nothing reads).

## Remote operations (Task 7 discovery, MJ v6.2.2 source)

The four multi-record writes (`Credentialing.CreateProgram`, `.CloneVersionToDraft`,
`.ReorderVersionTree`, `.CreateOrganization`) are hand-written, code-only remote operations: a
contract class per operation in `packages/Core/src/operations` (key and types, no body) and a server
subclass per operation in `packages/CoreEntitiesServer/src/operations`. They have no
`MJ: Remote Operations` metadata row; `RemoteOperationEngineBase.IsInvokable` returns
`{ Invokable: true }` when no row exists (`mj/packages/MJCoreEntities/src/engines/RemoteOperationEngineBase.ts:83-87`).

**Which class the server runs is decided by registration order.** Both classes register under the
same key, `@RegisterClass(BaseRemotableOperation, <key>)`, with no explicit priority. For a priority of
0 the class factory assigns the highest existing priority for that key plus one
(`mj/packages/MJGlobal/src/ClassFactory.ts:264-293`), and lookup returns the highest priority
(`ClassFactory.ts:747-766`). The server subclass imports and extends its contract, so the contract's
decorator has always run first and the subclass always outranks it — the "last registration wins by
import order" rule of `mj/packages/MJCore/src/generic/baseRemotableOperation.ts:149-151`, the same as
`mj/packages/RecordCloning/engine/src/operations.ts:432-455` and
`mj/packages/MJCoreEntities/src/custom/operations/AuthorizationCheckOperation.ts:27`. The one
requirement is that the server package is loaded in the process: `LoadBizAppsCredentialingEntitiesServer()`
references the four classes so tree-shaking keeps them. Without it the key still resolves — to the
contract, whose default `InternalExecute` throws — and the caller gets `EXECUTION_ERROR`
`Remote operation '<key>' has no server implementation…` (seen in the failing-first run of `CRD-04`,
before the server package was rebuilt).

**Dispatch.** Server code calls `new XOperation().Execute(input, { provider, user })`;
`DatabaseProviderBase.InternalRouteOperation` → `DispatchRemoteOperationInProcess`
(`mj/packages/MJCore/src/generic/remoteOperationDispatch.ts:26-76`) creates the registered class by
key and runs `ExecuteServer`. A browser calls the same line with no options; `GraphQLDataProvider`
sends the `ExecuteRemoteOperation` mutation (`mj/packages/GraphQLDataProvider/src/graphQLDataProvider.ts:2248`)
and `ExecuteRemoteOperationResolver` (`mj/packages/MJServer/src/resolvers/ExecuteRemoteOperationResolver.ts:81-170`)
resolves the user, applies the metadata gate and routes through the request's own provider, so the
browser needs only the contract class.

**How a failure reaches the caller** (`baseRemotableOperation.ts:290-316`): `Authorize` returning
false gives `Success: false`, `ResultCode: 'FORBIDDEN'`, `Not authorized to run operation '<key>'`; a
thrown `RemoteOperationError(code, message)` gives `ResultCode: code` and `ErrorMessage: message`;
any other throw gives `EXECUTION_ERROR` and the error's message. The resolver copies
`success`/`resultCode`/`errorMessage` onto the wire and the GraphQL provider copies them back
(`graphQLDataProvider.ts:2296-2306`), so both tiers read the same `RemoteOpResult`. The operations
throw `RemoteOperationError('REFUSED', <entity>.LatestResult.CompleteMessage)` for the first refused
save, which also rolls back the operation's transaction (`OperationSupport.InTransaction`, which
refuses to run on a provider that is not a `DatabaseProviderBase`, because `RunInEntityTransaction`
would otherwise run the work without a transaction).

**Organization setup acts as the system user** (`UserCache.Instance.GetSystemUser()`, imported from
`@memberjunction/generic-database-provider`; the `@memberjunction/sqlserver-dataprovider` re-export is
marked deprecated at `mj/packages/SQLServerDataProvider/src/index.ts:9-19`). After the commit it
calls `UserCache.Instance.RefreshNow()`, not `Refresh(provider)`: `Refresh` stores the provider it is
given for every later self-refresh and timer (`mj/packages/GenericDatabaseProvider/src/UserCache.ts:170-189`),
which would rebind the process-wide cache to one request's provider; `RefreshNow` reloads through the
provider `SetupSQLServerClient` gave the cache at startup (`UserCache.ts:544-565`,
`mj/packages/SQLServerDataProvider/src/config.ts:30`). `POST /auth/dev-login` resolves users and their
roles from that cache only (`mj/packages/MJServer/src/auth/localDevAuth.ts:307-336`), which is what
`cred-operations-wire.3` reads back. On an instance with more than one MJAPI process, the others
pick the grant up from the cache's shared-store notice, its staleness check
(`cacheSettings.userCacheCheckIntervalSeconds`, default 300) or a restart.

**`mj sync validate` does not exit.** `corepack pnpm exec mj sync validate --dir=metadata` prints the
report (`✓ Validation passed!`) and then stays running; run it under `timeout` and read the report.
`mj sync push` exits normally.

## Role grants and the user cache

MJAPI builds each request's user from an in-memory cache populated at startup
(`mj/packages/MJServer/src/context.ts`, `UserCache.Instance.Users`). Any role or
application grant applied while MJAPI is running is not seen by that user's
requests until the cache refreshes. In development, restart MJAPI after loading
test data or granting a role outside operations that refresh the cache
themselves, and before signing in as the affected user. `Credentialing.CreateOrganization` is
such an operation: it refreshes the cache of the MJAPI process that ran it. The `mj test` run creates
the world's grants (`admin@example.test` → `Credentialing Admin`; `staff.a`, `staff.b`,
`staff.none@example.test` → `Credentialing Staff`; `ui.only@example.test` → `UI`;
`applicant.a@example.test` → `Credentialing Applicant`) in its own process, so restart MJAPI after it before signing in as them or
running `cred-operations-wire`.

## Program Studio (Task 11)

**Loading.** Program Studio reads the program list in one `RunViews` call, then a program in two:
(1) the program, its versions (entity objects, because settings and status are saved from them) and
the accrediting organizations the user can read; (2) every version's sections, standards and document
requirements, and the committees owned by the program's Common organization. Display rows are
`simple` with named `Fields`. Measured in the browser on the 12-section placeholder program: opening
it from the list issues exactly two `RunViewsQuery` requests (the other requests in that window are
Explorer's own workspace save and cache-invalidation check).

**Why two calls and not one.** The first version filtered the tree by
`ProgramVersionID IN (SELECT … FROM [__mj_BizAppsCredentialing].[vwProgramVersions] …)`. MJAPI refuses
that from a browser for a user whose read of the subqueried entity is row-filtered:
`Invalid ExtraFilter: entity 'MJ_BizApps_Credentialing: Program Versions' is row-level-security
filtered for you — SQL that reads its base view directly cannot apply that filter; read that entity
with RunView`. A browser filter must not read a row-filtered entity's view in a subquery; the second
call carries literal ID lists instead (`packages/Angular/src/lib/staff/program-studio/studio-data.ts`).

**How a refused write reaches the screen.** A refused single-record `Save()` or `Delete()` comes back
from MJAPI as a GraphQL error whose message is the entity's `LatestResult.CompleteMessage`
(`mj/packages/MJServer/src/generic/ResolverBase.ts`, `DeleteRecord`); `GraphQLDataProvider` copies it
into the client entity's `LatestResult.Message` and returns `false`
(`mj/packages/GraphQLDataProvider/src/graphQLDataProvider.ts`, `Delete`). The widgets show
`LatestResult.CompleteMessage` beside the control that caused it. A remote operation's refusal is its
`ErrorMessage`. MJ's provider also logs each refusal to the browser console (`[GraphQL] ExecuteGQL
error caught`, then the sentence); those console errors are expected for a refused write.

**URL.** The open program and version are `?programId=…&versionId=…`; the resource writes them with
`UpdateQueryParams` when the page emits `SelectionChanged` and applies them in `OnQueryParamsChanged`.
A `programId` the user cannot read shows `Program not found` (`This program does not exist, or you do
not have access to it.`), the same as an ID that does not exist, and the URL keeps the pasted IDs.

The page emits after **every** load that found the program (`StudioUrl.SelectionAfterLoad`,
`packages/Angular/src/lib/staff/program-studio/studio-url.ts`), not only after a click. Why: on a full
page load of a URL without query params (for example `/app/credentialing/Program%20Studio`), MJ v6.2.2
restores the saved tab with its own saved `queryParams` ("a bare deep link to an open tab keeps that
tab's saved state", `mj/packages/Angular/Explorer/explorer-core/src/lib/shell/deep-link-workspace.ts`)
and does not write the URL while starting from a URL (`ShellComponent.syncUrlWithWorkspace` returns
while `urlBasedNavigation` is set). The resource received the restored program through
`GetQueryParams`/`OnQueryParamsChanged`, so the address bar stayed bare. Writing the selection back with
`UpdateQueryParams` updates the tab configuration; `WorkspaceStateManager.UpdateConfiguration` always
publishes, and the shell then rebuilds the URL (`buildResourceUrl`). Measured: the bare URL becomes
`?programId=…&versionId=…` of the restored program; selecting a version, Edit in draft and deleting a
draft each leave the URL naming what is shown; a reload keeps URL, program and version; the copied URL
opened in a fresh browser context as staff-a shows that program and version even when the user's saved
workspace holds another version; as staff-b it shows `Program not found`.

## Organization setup and the nav bar

MJ v6.2.2 has no call by which an application tells the shell its nav items changed (no such method on
`BaseApplication`, `mj/packages/Angular/Explorer/base-application/src/lib/base-application.ts`). The nav
bar calls `GetNavItems()` again on every `WorkspaceStateManager.Configuration` emission
(`AppNavComponent.ngOnInit`, `explorer-core/src/lib/shell/components/header/app-nav.component.ts:146-157`).
So after `Credentialing.CreateOrganization` succeeds, `CredentialingOrganizationSetupResource` reloads
the cached standing (`StandingService.Reload`) and retargets **its own tab** to the item the new standing
shows (`AreaNav.RetargetTab`): `WorkspaceStateManager.UpdateTabTitle` and
`UpdateTabConfiguration(tabId, { navItemName })`. That configuration change rebuilds the nav bar from the
reloaded standing and makes the shell rewrite the URL to `/app/credentialing/New%20organization`. The
component is kept (the tab container's content signature, `getTabContentSignature`, does not include
`navItemName`), so the success sentence stays. Measured on this database (organizations already exist):
the admin opened `/app/credentialing/Set%20up%20organization`, created `Sample Accrediting Body C`, and the
URL and browser title became `New organization` without a reload, with the success sentence on screen.
The 0 → 1 transition itself (the label changing from `Set up organization`) is proven by unit test
(`standing.service.test.ts`, "after the first organization is created …"); it was not re-run in the
browser because this database has organizations and none is rebuilt for it.
