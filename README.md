<p align="center">
  <img src="https://raw.githubusercontent.com/MemberJunction/MJ/main/logo.png" alt="MemberJunction" width="120" />
</p>

<h1 align="center">BizApps Credentialing</h1>

<p align="center">
  <strong>Credentialing, certification, and licensure management for the <a href="https://github.com/MemberJunction/MJ">MemberJunction</a> platform</strong>
</p>

<p align="center">
  <a href="#installation">Install</a> &middot;
  <a href="#how-it-fits">How It Fits</a> &middot;
  <a href="#what-you-get">What You Get</a> &middot;
  <a href="plans/active/credentialing-design.md">Design</a> &middot;
  <a href="#development">Development</a>
</p>

<p align="center">
  <img alt="MJ Version" src="https://img.shields.io/badge/MemberJunction-6.1.0--edge.5-blue?style=flat-square" />
  <img alt="Angular" src="https://img.shields.io/badge/Angular-21-DD0031?style=flat-square&logo=angular&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <a href="./LICENSE"><img alt="License: BUSL-1.1" src="https://img.shields.io/badge/License-BUSL--1.1-green?style=flat-square" /></a>
  <img alt="Node" src="https://img.shields.io/badge/Node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img alt="Status" src="https://img.shields.io/badge/Status-Pre--release%20(scaffold)-orange?style=flat-square" />
</p>

---

> ⚠️ **Status: scaffold.** This repository is the platform wiring for a new BizApp. The
> packages build and install, but contain no domain entities yet. The proposed domain
> model — credential types, requirements, holder records, evidence, verification, renewal
> cycles — is in [`plans/active/credentialing-design.md`](plans/active/credentialing-design.md) and is
> the document to review first.

Associations and non-profits track member certifications, professional licenses, continuing-education requirements, volunteer background checks, and staff compliance training. Today, every application reinvents the same tables and workflows for tracking credentials, evidence, and renewals. BizApps Credentialing provides the thin, reusable primitive layer designed to handle all these scenarios natively on the MemberJunction platform — deliberately thin, in the same spirit as [BizApps Tasks](https://github.com/MemberJunction/bizapps-tasks) and [BizApps Issues](https://github.com/MemberJunction/bizapps-issues).

## How It Fits

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

## Installation

```sh
mj app install https://github.com/MemberJunction/bizapps-credentialing
```

The installation process performs the following steps:
1. Fetches `mj-app.json`;
2. Validates MJ compatibility (`>=6.1.0-edge.5 <7.0.0`);
3. Installs [BizApps Common](https://github.com/MemberJunction/bizapps-common) and [BizApps Tasks](https://github.com/MemberJunction/bizapps-tasks) if not present;
4. Creates the `__mj_BizAppsCredentialing` schema;
5. Runs Skyway migrations from `migrations/` (none yet);
6. Installs the npm packages into the MJAPI and MJExplorer workspaces;
7. Registers the server bootstrap (`@mj-biz-apps/credentialing-server`, `LoadBizAppsCredentialingServer`) in `mj.config.cjs`;
8. Adds the client bootstrap (`@mj-biz-apps/credentialing-ng`) to `open-app-bootstrap.generated.ts`.

After installation, restart MJAPI and rebuild MJExplorer.

### Manage the App

Use `mj app` commands with the manifest name `mj-bizapps-credentialing`:

```sh
mj app list
mj app info mj-bizapps-credentialing
mj app upgrade mj-bizapps-credentialing
mj app disable mj-bizapps-credentialing
mj app enable mj-bizapps-credentialing
mj app remove mj-bizapps-credentialing  # --keep-data to preserve schema
```

## What You Get

### Database Tables

None yet. The proposed tables and their phased build order are in the [design document](plans/active/credentialing-design.md).

### TypeScript Packages

| Package Directory | npm Package | Role |
|---|---|---|
| `packages/Entities` | `@mj-biz-apps/credentialing-entities` | CodeGen entity subclasses and interfaces for credential types, credentials, requirements, evidence, and verifications; currently a compiling skeleton. |
| `packages/Actions` | `@mj-biz-apps/credentialing-actions` | MemberJunction Actions for automated lifecycle transitions and agent integration; currently a compiling skeleton. |
| `packages/Core` | `@mj-biz-apps/credentialing-core` | Shared business logic, calculation engines, and client/server services (may import Common and Tasks entities); currently a compiling skeleton. |
| `packages/CoreEntitiesServer` | `@mj-biz-apps/credentialing-core-entities-server` | Server-side entity overrides, validations, and lifecycle save hooks; currently a compiling skeleton. |
| `packages/Server` | `@mj-biz-apps/credentialing-server` | Server bootstrap module registered with MJAPI via `LoadBizAppsCredentialingServer`; currently a compiling skeleton. |
| `packages/Angular` | `@mj-biz-apps/credentialing-ng` | Client bootstrap, UI components, forms, and Explorer resources registered with MJExplorer; currently a compiling skeleton. |

### Explorer

One nav item, Overview, driven by `CredentialingOverviewResource`.

## Development

Development happens against a linked MemberJunction workspace:
1. Clone MemberJunction 6.x as a lowercase `mj` sibling under a plain parent directory (both `CLAUDE.md`'s `@../mj/CLAUDE.md` import and the workspace tooling key off that name).
2. From this repository, link the workspace:
   ```sh
   ./node_modules/.bin/mj dev workspace --dir <parent>
   ```
3. Use `status`, `doctor`, and `clean` subcommands to inspect and maintain the link.
4. **Never run an install inside a member** — installs must run at the workspace parent to maintain the single-copy invariant of `@memberjunction/*` packages.
5. Register the server package in MJ's `mj.config.cjs` under `dynamicPackages.server`:
   ```javascript
   {
     PackageName: '@mj-biz-apps/credentialing-server',
     StartupExport: 'LoadBizAppsCredentialingServer',
     AppName: 'mj-bizapps-credentialing'
   }
   ```
6. Add `@mj-biz-apps/credentialing-ng` to MJExplorer and `import '@mj-biz-apps/credentialing-ng';` to the generated bootstrap (`open-app-bootstrap.generated.ts`).
7. Run migrations, codegen, and package builds:
   ```sh
   pnpm run mj:migrate
   pnpm run mj:codegen
   pnpm run build:packages
   ```

For full details on the workspace linking model, see [`docs/template-docs/linking-to-mj.md`](docs/template-docs/linking-to-mj.md).

### Standalone Build

To build the packages standalone without a MemberJunction checkout or database:

```sh
corepack pnpm install && corepack pnpm run build:packages
```

## Contributing

- **Branch model**: Feature branches cut from `next` tracking `origin/<same-name>`. PRs target `next`.
- **Changesets**: A migration-bearing PR must include a changeset with at least a `minor` bump (`pnpm exec changeset`).
- **Version packages**: `version.yml` maintains the Version Packages PR on `next`.
- **Releases**: A `next → main` release PR triggers `publish.yml` to publish packages to npm and tag `vX.Y.Z`.
- **Never hand-edit a version** in `package.json` or `mj-app.json`.
- For branching details, see [`docs/template-docs/branching.md`](docs/template-docs/branching.md).
- For publishing workflows, see [`docs/template-docs/publishing.md`](docs/template-docs/publishing.md).
- For first-publish steps, see [`PUBLISH_SETUP.md`](PUBLISH_SETUP.md).

## Repository Structure

```
.
├── mj-app.json             # App manifest (identity, compatibility, dependencies, packages)
├── mj.config.cjs           # CodeGen & migration runner configuration
├── migrations/             # Skyway database migrations (__mj_BizAppsCredentialing)
├── metadata/               # mj-sync metadata (applications, roles, schema-info)
├── packages/
│   ├── Entities/           # @mj-biz-apps/credentialing-entities (CodeGen entity subclasses)
│   ├── Actions/            # @mj-biz-apps/credentialing-actions (MemberJunction actions)
│   ├── Core/               # @mj-biz-apps/credentialing-core (domain logic & shared services)
│   ├── CoreEntitiesServer/ # @mj-biz-apps/credentialing-core-entities-server (server-side overrides)
│   ├── Server/             # @mj-biz-apps/credentialing-server (MJAPI bootstrap)
│   └── Angular/            # @mj-biz-apps/credentialing-ng (MJExplorer components & resources)
├── plans/                  # Architecture, designs, and specifications
│   └── credentialing-design.md # Proposed domain data model and architecture
└── docs/                   # Development guides and template documentation
```

## License

Business Source License 1.1 — see [LICENSE](./LICENSE) for details.
