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
- `node mj/packages/MJCLI/bin/run.js dev workspace` generates `pnpm-workspace.yaml`
  and `package.json` at the workspace parent and removes members' standalone
  `node_modules`. Installs run **only at the workspace parent** (`corepack pnpm install`).
- Parent `pnpm-workspace.yaml` pins transitive `@memberjunction/*` packages to
  `6.2.2` and `@angular/{common,compiler,compiler-cli,core,forms}` to `21.2.22`.
- On a cold checkout, `bizapps-tasks/packages/Angular/package.json` pins
  `@mj-biz-apps/common-entities` at `5.63.0` while the linked sibling is `5.66.0`;
  building `bizapps-common` first (`corepack pnpm --filter "@mj-biz-apps/common-*" run build`)
  before running the full parent build resolves the ordering cleanly.
- `node mj/packages/MJCLI/bin/run.js dev workspace doctor` verifies 0 workspace resolution failures.

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
Create the local dev `Owner` user (`admin@memberjunction.org`, `Type = 'Owner'`,
with roles `Developer`, `Integration`, and `UI`) using MJ entity objects
(`Metadata.GetEntityObject('MJ: Users' / 'MJ: User Roles')`) before signing in.

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

## Rebuild from nothing

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
4. Migrate dependency apps leaf-first (with `.env` in each sibling root), and create the local dev Owner user (`admin@memberjunction.org` with roles `Developer`, `Integration`, `UI`) via `Metadata.GetEntityObject('MJ: Users' / 'MJ: User Roles')`:
   ```sh
   (cd ../bizapps-common && corepack pnpm run mj:migrate)
   (cd ../bizapps-tasks && corepack pnpm run mj:migrate)
   (cd ../bizapps-committees && corepack pnpm run mj:migrate)
   ```
5. From `bizapps-credentialing/` (using `bizapps-credentialing/.env`), migrate and push app metadata (strip any `sync` blocks if keeping working tree clean):
   ```sh
   corepack pnpm run mj:migrate
   corepack pnpm exec mj sync push --dir=metadata --ci
   ```
6. Grant `admin@memberjunction.org` an `MJ: User Applications` row for `Credentialing` via Explorer's **Application launcher → Configure…** UI (or an `md.GetEntityObject('MJ: User Applications', sysUser)` script, never raw SQL DML).
7. From `mj/`, start MJAPI (`corepack pnpm run start:api`, port `4050`) and MJExplorer (`corepack pnpm run start:explorer`, port `4251`).

## Role grants and the user cache

MJAPI builds each request's user from an in-memory cache populated at startup
(`mj/packages/MJServer/src/context.ts`, `UserCache.Instance.Users`). Any role or
application grant applied while MJAPI is running is not seen by that user's
requests until the cache refreshes. In development, restart MJAPI after loading
test data or granting a role outside operations that refresh the cache
themselves, and before signing in as the affected user.
