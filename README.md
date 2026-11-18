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
  <a href="plans/active/credentialing-frd.md">Requirements</a> &middot;
  <a href="#development">Development</a>
</p>

<p align="center">
  <img alt="MJ Version" src="https://img.shields.io/badge/MemberJunction-6.1.0--edge.5-blue?style=flat-square" />
  <img alt="Angular" src="https://img.shields.io/badge/Angular-21-DD0031?style=flat-square&logo=angular&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <a href="./LICENSE"><img alt="License: BUSL-1.1" src="https://img.shields.io/badge/License-BUSL--1.1-green?style=flat-square" /></a>
  <img alt="Node" src="https://img.shields.io/badge/Node-18%2B-339933?style=flat-square&logo=node.js&logoColor=white" />
  <img alt="Status" src="https://img.shields.io/badge/Status-Pre--release%20(program%20authoring)-orange?style=flat-square" />
</p>

---

> ⚠️ **Status: pre-release — first feature set (program authoring).** Accrediting organizations,
> their staff, and programs of versioned standards can be set up and authored. Applications,
> review, committee decisions, credentials, verification and renewals do **not** exist yet. What the
> whole product must do is specified in the
> [Functional Requirements Document](plans/active/credentialing-frd.md), the document to read first;
> what was verified for this feature set is in [`docs/verification/b1-2026-11.md`](docs/verification/b1-2026-11.md).

Associations and non-profits track member certifications, professional licenses, continuing-education requirements, volunteer background checks, and staff compliance training. Today, every application reinvents the same tables and workflows for tracking credentials, evidence, and renewals. BizApps Credentialing provides the thin, reusable primitive layer designed to handle all these scenarios natively on the MemberJunction platform — deliberately thin, in the same spirit as [BizApps Tasks](https://github.com/MemberJunction/bizapps-tasks) and [BizApps Issues](https://github.com/MemberJunction/bizapps-issues).

## How It Fits

```text
bizapps-common          People, Organizations, Addresses               __mj_BizAppsCommon
      ▲
bizapps-tasks           Tasks, Task Types (action hooks), Task Links   __mj_BizAppsTasks
      ▲
bizapps-committees      Committees, Memberships, Meetings              __mj_BizAppsCommittees
      ▲
bizapps-credentialing   Accrediting Organizations, Memberships,        __mj_BizAppsCredentialing   ◄── this app
                        Programs, Versions, Sections, Standards,
                        Document Requirements
      ▲
Consuming apps          Member portals, LMS integrations, registries
```

An accrediting organization is a bizapps-common `Organization`; each program version names the
deciding committee from bizapps-committees that belongs to that organization. Credentials, and the
review work that bizapps-tasks will carry, come in later feature sets (see the FRD).

## Installation

```sh
mj app install https://github.com/MemberJunction/bizapps-credentialing
```

The installation process performs the following steps:
1. Fetches `mj-app.json`;
2. Validates MJ compatibility (`>=6.1.0-edge.5 <7.0.0`);
3. Installs [BizApps Common](https://github.com/MemberJunction/bizapps-common), [BizApps Tasks](https://github.com/MemberJunction/bizapps-tasks) and [BizApps Committees](https://github.com/MemberJunction/bizapps-committees) if not present;
4. Creates the `__mj_BizAppsCredentialing` schema;
5. Runs Skyway migrations from `migrations/` (programs and standards);
6. Installs the npm packages into the MJAPI and MJExplorer workspaces;
7. Registers the server bootstrap (`@mj-biz-apps/credentialing-server`, `LoadBizAppsCredentialingServer`) in `mj.config.cjs`;
8. Adds the client bootstrap (`@mj-biz-apps/credentialing-ng`) to MJExplorer's generated client registrations.

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

Schema `__mj_BizAppsCredentialing` (FRD section 4):

| Table | What it holds |
|---|---|
| `AccreditingOrganization` | A body that runs credentialing programs; one per bizapps-common `Organization`. |
| `OrganizationMembership` | Which staff users belong to which accrediting organization. Staff see only their organizations' data. |
| `Program` | A credentialing program (type, who it credentials, credential prefix), owned by one organization. |
| `ProgramVersion` | A version of a program's standards: Draft, Active or Retired, with its workflow settings, promotion thresholds, rollout flags and deciding committee. At most one Draft per program. |
| `Section` | A numbered group of standards in a version. |
| `Standard` | One requirement: code, statement, guidance, response type, intake mode, evaluation mode, and a lineage key that follows it from version to version. |
| `DocumentRequirement` | A document a version asks applicants for, with its sensitivity policy. |

### Roles

| Role | What it can do now |
|---|---|
| `Credentialing Admin` | Set up accrediting organizations and name each one's first staff member. |
| `Credentialing Staff` | Author programs of their own organizations: create programs, edit Draft versions (sections, standards, document requirements, settings), activate, retire, and start a new Draft from an Active version. |
| `Credentialing Applicant`, `Credentialing Reviewer`, `Credentialing Committee` | Sign in by magic link and see their (empty) area; no data access yet. |

Organization isolation is enforced by row-level security filters and server-side guards; every
read path is listed in [`docs/isolation-read-paths.md`](docs/isolation-read-paths.md). No
credentialing role holds MJ's `UI` role.

### TypeScript Packages

| Package Directory | npm Package | Role |
|---|---|---|
| `packages/Entities` | `@mj-biz-apps/credentialing-entities` | CodeGen entity subclasses for the seven tables. |
| `packages/Actions` | `@mj-biz-apps/credentialing-actions` | MemberJunction Actions; no actions yet (compiling skeleton). |
| `packages/Core` | `@mj-biz-apps/credentialing-core` | The authoring rules (version lifecycle, settings tiers, standard codes, program ownership) and the contracts of the five remote operations, shared by browser and server. |
| `packages/CoreEntitiesServer` | `@mj-biz-apps/credentialing-core-entities-server` | Server entity subclasses that enforce the rules on every save and delete, and the server bodies of the remote operations (create program, edit in draft, reorder a version's tree, set up an organization, create a committee for a program's organization). |
| `packages/Server` | `@mj-biz-apps/credentialing-server` | Server bootstrap registered with MJAPI via `LoadBizAppsCredentialingServer`, plus the generated GraphQL resolvers. |
| `packages/Angular` | `@mj-biz-apps/credentialing-ng` | The Credentialing application in MJExplorer: Program Studio, organization setup and the role areas. |
| `packages/IntegrationTests` | `@mj-biz-apps/credentialing-integration-tests` (private) | Integration check bundles run by `mj test` (`CRD-*` rows in `metadata-tests/`) and by the GraphQL harness; the sample world used for development. |

### Explorer

The **Credentialing** application shows each user the areas their roles serve:

- **Program Studio** (Credentialing Staff) — the organization's programs; a program's versions,
  sections, standards, document requirements and settings. An Active version is read-only except its
  rollout flags; **Edit in draft** copies it into a new Draft. Deep links carry
  `?programId=…&versionId=…`.
- **Set up organization** / **New organization** (Credentialing Admin) — creates an accrediting
  organization and gives its first staff member the staff role and the application.
- **Assignments** (Reviewer, Committee) and **My Applications** (Applicant) — placeholders that
  say there is nothing yet.

A staff user with no organization membership sees a sentence saying so instead of an empty screen.
A page opened by URL by a user whose roles do not serve it shows `This area is not available to your
account.`

### Not there yet

Applications and intake, document upload, review and AI observations, committee decisions,
credential issuance and public verification, renewals, and issuing invitations from the product.

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
6. Add `@mj-biz-apps/credentialing-ng` to MJExplorer's `package.json` and register it under `dynamicPackages.client`; MJ 6.2 writes the client import into `packages/MJExplorer/src/app/generated/class-registrations-manifest.ts` (`mj:manifest:explorer`). The verified local setup is in [`docs/dev-instance.md`](docs/dev-instance.md).
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
├── metadata/               # mj-sync metadata (application, roles, row filters, permissions, schema-info)
├── metadata-tests/         # MJ: Tests rows (CRD-*) for the integration bundles
├── packages/
│   ├── Entities/           # @mj-biz-apps/credentialing-entities (CodeGen entity subclasses)
│   ├── Actions/            # @mj-biz-apps/credentialing-actions (MemberJunction actions)
│   ├── Core/               # @mj-biz-apps/credentialing-core (domain logic & shared services)
│   ├── CoreEntitiesServer/ # @mj-biz-apps/credentialing-core-entities-server (server-side overrides)
│   ├── Server/             # @mj-biz-apps/credentialing-server (MJAPI bootstrap)
│   ├── Angular/            # @mj-biz-apps/credentialing-ng (MJExplorer components & resources)
│   └── IntegrationTests/   # @mj-biz-apps/credentialing-integration-tests (private; integration checks, sample world)
├── plans/                  # Architecture, designs, and specifications
│   └── active/credentialing-frd.md # Functional Requirements Document
└── docs/                   # Development guides and template documentation
```

## License

Business Source License 1.1 — see [LICENSE](./LICENSE) for details.
