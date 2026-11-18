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
  <img alt="Status" src="https://img.shields.io/badge/Status-Pre--release%20(applications%20and%20evidence)-orange?style=flat-square" />
</p>

---

> ⚠️ **Status: pre-release — second feature set (applications and evidence).** Accrediting
> organizations, their staff and programs of versioned standards can be set up and authored; staff
> invite applicants, who answer the standards, build a document library that the assistant reads for
> evidence, see drafted answers with citations, and submit. Review, committee decisions, credentials,
> verification and renewals do **not** exist yet. What the whole product must do is specified in the
> [Functional Requirements Document](plans/active/credentialing-frd.md), the document to read first;
> what was verified is in [`docs/verification/b1-2026-11.md`](docs/verification/b1-2026-11.md) and
> [`docs/verification/b2-2026-11.md`](docs/verification/b2-2026-11.md).

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
                        Document Requirements, Subjects, Applications,
                        Responses, Evidence Documents, Extractions
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
| `Subject` | The party being credentialed (a person or an organization), owned by one accrediting organization, with a party reference to a bizapps-common `Person` or `Organization`. |
| `SubjectContact` | A user who acts for a subject (Primary or Staff); it is what makes a signed-in user an applicant. |
| `Application` | A subject's application to an Active program version: status, submission and governing-body attestation, durable submission dispatch, a historical flag. One live application per subject and version. |
| `StandardResponse` | One answer per application and standard: text, self-assessment, status (Empty, Drafted, Prefilled, Located, Confirmed, …), author type and provenance. Only a person confirms. |
| `ResponseCitation` | A pointer from an answer to a document: excerpt, character span, page where known. |
| `EvidenceDocument` | A file in a subject's document library: hash, size, extracted or recognized text, reading status, supersession. The bytes live in MJ Storage. |
| `DocumentAttestation` | A signed statement in place of a restricted document. |
| `ApplicationDocument` | The documents and attestations frozen into an application when it is submitted. |
| `Extraction` | One reading of one document for one standard: drafted value, verbatim excerpt and span, confidence, the AI prompt run. |
| `ResponseSource` | Where the assistant looks for a standard's answer (a document requirement), authored on a Draft version. |

### Roles

| Role | What it can do now |
|---|---|
| `Credentialing Admin` | Set up accrediting organizations and name each one's first staff member. |
| `Credentialing Staff` | Author programs of their own organizations: create programs, edit Draft versions (sections, standards, document requirements, settings), activate, retire, and start a new Draft from an Active version. |
| `Credentialing Staff` (applications) | Invite applicants by magic link (or send a new link), follow applications in the Pipeline, read answers and frozen documents, reopen a confirmed answer, withdraw an application; receive an in-app notification when an application is submitted. |
| `Credentialing Applicant` | Sign in by magic link; for each subject they act for: see My Applications, answer and confirm standards, upload and attest documents, read what the assistant found, review and submit. Reads only their own subjects' rows. |
| `Credentialing Reviewer`, `Credentialing Committee` | Sign in by magic link and see their (empty) area; no data access yet. |

Organization and subject isolation are enforced by row-level security filters and server-side
guards; every read path, including file bytes, extracted text and AI prompt runs, is listed in
[`docs/isolation-read-paths.md`](docs/isolation-read-paths.md). Applicant data is written only
through the app's remote operations and evidence routes, never through generated mutations. No
credentialing role holds MJ's `UI` role.

### TypeScript Packages

| Package Directory | npm Package | Role |
|---|---|---|
| `packages/Entities` | `@mj-biz-apps/credentialing-entities` | CodeGen entity subclasses for the seventeen tables. |
| `packages/Actions` | `@mj-biz-apps/credentialing-actions` | MemberJunction Actions; no actions yet (compiling skeleton). |
| `packages/Core` | `@mj-biz-apps/credentialing-core` | The rules (version lifecycle, settings tiers, standard codes, program ownership, application lifecycle, answers and freeze, the submission gate, prefill ranking, evidence files, verbatim excerpts) and the contracts of the remote operations, shared by browser and server. |
| `packages/CoreEntitiesServer` | `@mj-biz-apps/credentialing-core-entities-server` | Server entity subclasses that enforce the rules on every save and delete (applicant data only inside an operation), the server bodies of the remote operations (authoring, invitations, answers, documents, prefill, submission), the evidence intake, the reading queue, the prefill runner and the durable submission dispatch. |
| `packages/Server` | `@mj-biz-apps/credentialing-server` | Server bootstrap registered with MJAPI via `LoadBizAppsCredentialingServer`; the evidence upload and download routes (`/credentialing/evidence`); storage, text extraction in a child process, scan recognition and evidence reading through MJ AI prompts, magic-link invitations and staff notifications; the generated GraphQL resolvers. |
| `packages/Angular` | `@mj-biz-apps/credentialing-ng` | The Credentialing application in MJExplorer: Program Studio, organization setup, the Pipeline, and the applicant area (My Applications, Standards, Documents, Review and submit). |
| `packages/IntegrationTests` | `@mj-biz-apps/credentialing-integration-tests` (private) | Integration check bundles run by `mj test` (`CRD-*` rows in `metadata-tests/`) and by the GraphQL harness; the sample world used for development. |

### Explorer

The **Credentialing** application shows each user the areas their roles serve:

- **Program Studio** (Credentialing Staff) — the organization's programs; a program's versions,
  sections, standards, document requirements and settings. An Active version is read-only except its
  rollout flags; **Edit in draft** copies it into a new Draft. Deep links carry
  `?programId=…&versionId=…`.
- **Set up organization** / **New organization** (Credentialing Admin) — creates an accrediting
  organization and gives its first staff member the staff role and the application.
- **Pipeline** (Credentialing Staff) — the organization's applications and contacts; **Invite
  applicant** (program version, new or existing subject, contact) issues a magic link and shows it
  when no email provider is configured; **Send a new link**; an application's answers, citations and
  documents (frozen ones after submission); reopen an answer or withdraw an application, each with a
  reason. A submission notification opens the application here.
- **Response sources** in the standard editor (Draft versions) — bind a standard to the document
  requirement the assistant reads it from.
- **My Applications** (Applicant) — the subject's applications with their progress; a picker when
  the user acts for several subjects.
- **Standards** (Applicant) — the Standards Runner: sections with progress, a card per standard with
  the answer, self-assessment, drafted answers and located passages with their citation chips,
  `Refresh prefills`, `Read and confirm`, and **Review and submit** (the gate, the documents that will
  freeze, the governing-body attestation where the version asks for it).
- **Documents** (Applicant) — the document library by requirement and general uploads: upload and
  replace, version history, attest instead of uploading a restricted document, `Still current`,
  what the assistant read, `Read again`, and a viewer with the original and the extracted or
  recognized text with the cited span highlighted.
- **Assignments** (Reviewer, Committee) — a placeholder that says there is nothing yet.

A staff user with no organization membership sees a sentence saying so instead of an empty screen.
A page opened by URL by a user whose roles do not serve it shows `This area is not available to your
account.`

### Not there yet

Review, conversations and information requests, AI observations and verification, committee
decisions, credential issuance and public verification, renewals and carry-forward, data bindings
to host data (`Host Query` sources), and self-service sign-in for a returning applicant (staff send a
new link).

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
