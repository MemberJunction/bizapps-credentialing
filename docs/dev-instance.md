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
  - `MJ_MAGIC_LINK_PRIVATE_KEY` is set in `mj/.env` (RSA private key).
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
| App `corepack pnpm exec mj sync push --dir=metadata --ci` | `bizapps-credentialing/` | `bizapps-credentialing/.env` | Strip any written `sync` blocks before committing |

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

`Credentialing` intentionally sets `DefaultForNewUser: false` and has only a
`Developer` entry in `metadata/application-roles/.application-roles.json` (no `UI`
grant). When signing into MJExplorer (`http://localhost:4251`) as
`admin@memberjunction.org` (`Developer`), `Credentialing` is absent from the app
switcher initially and is added via **Application launcher → Configure… →
Available Applications → Add Credentialing → Save Changes** (creating an
`MJ: User Applications` row, `IsActive = 1`), after which opening `Credentialing`
loads `CredentialingOverviewResource` at `/app/credentialing/Overview`.

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

## Rebuild from nothing

If `node mj/packages/MJCLI/bin/run.js dev workspace --force` is run at the
workspace parent during recovery, re-apply the `@typespec/ts-http-runtime` /
`@azure/*` pins and the 12 Angular `21.2.22` overrides to parent
`pnpm-workspace.yaml`, then run `corepack pnpm install && corepack pnpm prune`
at the workspace parent and `corepack pnpm --filter "@mj-biz-apps/common-*" run build`
before `corepack pnpm run build`.

1. Stop MJAPI (`4050`) and MJExplorer (`4251`) so no open connections hold the database.
2. Drop (if present) and recreate the database:
   ```sql
   ALTER DATABASE [MJ_6_2_2_CLEAN_credentialing] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
   DROP DATABASE [MJ_6_2_2_CLEAN_credentialing];
   CREATE DATABASE [MJ_6_2_2_CLEAN_credentialing];
   ```
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
5. From `bizapps-credentialing/` (using `bizapps-credentialing/.env`), migrate and push app metadata (strip any `sync` blocks if keeping working tree clean):
   ```sh
   corepack pnpm run mj:migrate
   corepack pnpm exec mj sync push --dir=metadata --ci
   ```
6. Ensure `admin@memberjunction.org` has the `MJ: User Applications` row for `Credentialing` (either via `corepack pnpm run dev:owner` in `bizapps-credentialing/` when no browser is needed — idempotent via entity objects — or in Explorer via **Application launcher → Configure… → Available Applications → Add Credentialing → Save Changes**):
   ```sh
   corepack pnpm run dev:owner
   ```
7. From `mj/`, start MJAPI (`corepack pnpm run start:api`, port `4050`) and MJExplorer (`corepack pnpm run start:explorer`, port `4251`).
8. From `bizapps-credentialing/`, build this app's packages (the `mj test` check module is
   `packages/IntegrationTests/dist/index.js`) and push the integration test rows (`MJ: Tests`):
   ```sh
   corepack pnpm run build:packages
   corepack pnpm exec mj sync push --dir=metadata-tests --ci
   ```
9. Set `MJ_API_KEY` in `bizapps-credentialing/.env` for the client-transport harness. It is
   MJAPI's **system** API key — the same value as `MJ_API_KEY` in `mj/.env` — not a user
   `mj_sk_…` key (see "Running tests" below). No key is created in Explorer or in the database.

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
| `cred-operations-wire` | — (client harness only) | client only |

```sh
MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "CRD-02 - Version rules"   # 11 checks
MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "CRD-03 - Standard rules"  # 8 checks
MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "CRD-04 - Operations"     # 10 checks
corepack pnpm run test:integration cred-operations-wire                                               # 3 checks, GraphQL
```

`cred-operations` is server only for three reasons: `.3` writes one `EvaluationMode` with SQL
(the provider's `ExecuteSQL`, which GraphQL does not have), `.6` sets the static test seam
`CloneVersionToDraftServerOperation.FailAfterStandards` (it exists only in the server process, reached
through the class factory registration), and `.7` and `.9` need separate provider instances. It acts
as three users: `operations.staff@example.test` (holds `Credentialing Staff` for the operations'
`Authorize` and `Developer` for entity permissions — the credentialing roles hold no entity
permissions until the permissions task, which replaces this user), the world's `admin@example.test`
(`Credentialing Admin`) and the world's `StaffA` (`Credentialing Staff`).

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
the world's grants (`admin@example.test` → `Credentialing Admin`, `staff.a@example.test` →
`Credentialing Staff`) in its own process, so restart MJAPI after it before signing in as them or
running `cred-operations-wire`.
