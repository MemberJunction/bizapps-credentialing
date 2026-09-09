# Scaffold Notes

## File tree
```
.
├── .DS_Store
├── .changeset
│   ├── README.md
│   └── config.json
├── .github
│   ├── scripts
│   │   ├── __tests__
│   │   ├── check-migration-entityfield-sequence.sh
│   │   ├── validate-migration-filenames.sh
│   │   ├── validate-npm-packages.sh
│   │   ├── validate-package-files.sh
│   │   ├── validate-package-lock-case.sh
│   │   └── validate-package-repository.sh
│   └── workflows
│       ├── build.yml
│       ├── changes.yml
│       ├── publish.yml
│       ├── release-readiness.yml
│       └── version.yml
├── .gitignore
├── .npmrc
├── .superpowers
│   └── sdd
│       ├── .gitignore
│       └── 2026-09-09-bizapps-credentialing-scaffold
├── CLAUDE.md
├── LICENSE
├── PUBLISH_SETUP.md
├── README.md
├── ci
│   ├── check-bump-level.sh
│   ├── commit_push.mjs
│   ├── merge_main.mjs
│   ├── merge_main_and_update_lock.mjs
│   └── sync-mj-app-version.mjs
├── docs
│   ├── claude
│   │   ├── 01-critical-rules.md
│   │   ├── 02-git-and-branches.md
│   │   ├── 03-entities-and-data.md
│   │   ├── 04-performance.md
│   │   ├── 05-codegen-and-migrations.md
│   │   ├── 06-angular.md
│   │   ├── 07-code-style.md
│   │   ├── 08-metadata-and-sync.md
│   │   ├── 09-testing.md
│   │   └── README.md
│   └── template-docs
│       ├── README.md
│       ├── branching.md
│       ├── codegen-and-metadata-migrations.md
│       ├── explorer-visibility.md
│       ├── getting-started.md
│       ├── init-script.md
│       ├── linking-to-mj.md
│       ├── metadata.md
│       ├── publishing.md
│       ├── repo-setup.md
│       └── versioning-and-peer-deps.md
├── metadata
│   ├── .mj-sync.json
│   ├── README.md
│   ├── application-roles
│   │   ├── .application-roles.json
│   │   └── .mj-sync.json
│   ├── applications
│   │   ├── .mj-bizapps-credentialing-application.json
│   │   ├── .mj-sync.json
│   │   └── README.md
│   └── schema-info
│       ├── .mj-sync.json
│       ├── .schema-info.json
│       └── README.md
├── migrations
│   ├── EXAMPLE__v0.0.0_Skeleton.sql.example
│   └── _README.md
├── mj-app.json
├── mj-app.reference.jsonc
├── mj.config.cjs
├── package.json
├── packages
│   ├── Actions
│   ├── Angular
│   ├── Core
│   ├── CoreEntitiesServer
│   ├── Entities
│   └── Server
├── plans
│   ├── 2026-09-09-bizapps-credentialing-scaffold.md
│   ├── _README.md
│   ├── complete
│   │   └── TEMPLATE-SPEC.md
│   └── credentialing-design.md
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── scripts
│   └── init-template.mjs
├── tsconfig.angular.json
├── tsconfig.server.json
└── turbo.json
```

## Final mj-app.json
```json
{
  "$schema": "https://schema.memberjunction.org/mj-app/v1.json",
  "manifestVersion": 1,
  "name": "mj-bizapps-credentialing",
  "displayName": "Credentialing",
  "description": "Credentialing, certification, and licensure management for MemberJunction: credential definitions, requirements, holder records, verification, expiration and renewal cycles.",
  "version": "0.0.0",
  "license": "BUSL-1.1",
  "icon": "fa-solid fa-certificate",
  "color": "#264FAF",
  "publisher": {
    "name": "MemberJunction",
    "email": "hello@memberjunction.com",
    "url": "https://memberjunction.com"
  },
  "repository": "https://github.com/MemberJunction/bizapps-credentialing",
  "mjVersionRange": ">=6.1.0-edge.5 <7.0.0",
  "dependencies": {
    "mj-bizapps-common": {
      "version": ">=5.40.0 <6.0.0",
      "repository": "https://github.com/MemberJunction/bizapps-common"
    },
    "mj-bizapps-tasks": {
      "version": ">=1.4.3 <2.0.0",
      "repository": "https://github.com/MemberJunction/bizapps-tasks"
    }
  },
  "schema": {
    "name": "__mj_BizAppsCredentialing",
    "createIfNotExists": true
  },
  "migrations": {
    "directory": "migrations",
    "engine": "skyway"
  },
  "metadata": {
    "directory": "metadata"
  },
  "packages": {
    "server": [
      {
        "name": "@mj-biz-apps/credentialing-server",
        "role": "bootstrap",
        "startupExport": "LoadBizAppsCredentialingServer"
      }
    ],
    "client": [
      {
        "name": "@mj-biz-apps/credentialing-ng",
        "role": "bootstrap",
        "startupExport": "LoadBizAppsCredentialingClient"
      }
    ],
    "shared": [
      { "name": "@mj-biz-apps/credentialing-entities", "role": "library" },
      { "name": "@mj-biz-apps/credentialing-actions", "role": "library" },
      { "name": "@mj-biz-apps/credentialing-core", "role": "library" },
      { "name": "@mj-biz-apps/credentialing-core-entities-server", "role": "library" }
    ]
  },
  "code": {
    "visibility": "public",
    "sourceDirectory": "packages"
  },
  "categories": ["Business", "Credentialing", "Certification"],
  "tags": ["credential", "certification", "license", "licensure", "renewal", "verification"]
}
```

## Init command
```bash
node scripts/init-template.mjs \
  --name mj-bizapps-credentialing \
  --display "Credentialing" \
  --description "Credentialing, certification, and licensure management for MemberJunction: credential definitions, requirements, holder records, verification, expiration and renewal cycles." \
  --scope @mj-biz-apps/credentialing \
  --schema __mj_BizAppsCredentialing \
  --prefix "MJ_BizApps_Credentialing" \
  --repo https://github.com/MemberJunction/bizapps-credentialing \
  --publisher "MemberJunction" \
  --email hello@memberjunction.com \
  --id-min 10000001 --id-max 10099999 \
  --first-party --yes
```

Hand-fixes applied afterwards:
1. **Pascal rename**: Replaced `MjBizappsCredentialing` with `BizAppsCredentialing` globally.
2. **Selector**: Renamed `sample-app-overview-resource` to `bizapps-credentialing-overview-resource`.
3. **Prefix colon**: Added `: ` to `EntityNamePrefix` in `mj.config.cjs` and `.schema-info.json`.
4. **Publish guard**: Modified `.github/workflows/publish.yml` to compare `github.repository != 'MemberJunction/open-app-template'`.
5. **Application record name**: Updated fields in `metadata/applications/.mj-bizapps-credentialing-application.json`.

## Decisions
Note: The human accepted all sixteen recommendations from Checkpoint 1, and `../credentialing` was ruled out of scope.

| Decision | What was done |
|---|---|
| D1-D16 | Accepted as recommended. |
| D2/D3/D4 | Used schema-info mechanism for schema registration. |
| D5 | Baseline migration intentionally omitted. |
| D6 | Changeset intentionally omitted. |
| D7 | Created a new `Core` package. |
| D10 | Upgraded CI with lock-case script and entityfield-sequence gate from bizapps-common. |
| D14 | Updated MJ baseline to `6.1.0-edge.5`. |
| D15 | Retained `docs/template-docs/` and `TEMPLATE-SPEC.md`. |
| D16 | Omitted empty `entities/` and `entity-relationships/` folders. |

## Where the references disagreed
The seven bullets from Checkpoint 1 were resolved by aligning the template with the newer BizApps conventions: adopting the modern `mjVersionRange`, setting the baseline to `6.1.0-edge.5`, porting CI scripts from `bizapps-common` (lock-case, entityfield-sequence), adding the `Core` package and explicit `entityImportPackages` for dependency schemas, removing the `firstParty` flag in favor of the `code` visibility block, and standardizing the schema-info mechanism. 

## Remaining human steps
- [x] Create GitHub repository (`MemberJunction/bizapps-credentialing`)
- [x] Push `main` and `next` branches to `origin`
- [x] Set `next` as default branch
- [x] Configure `protect-next` branch ruleset on GitHub
- [ ] TODO (npm): Publish placeholder 0.0.0 packages under `@mj-biz-apps` scope (requires interactive npm login / 2FA)
- [ ] TODO (npm): Configure npm Trusted Publisher (OIDC) on npmjs.com package settings for `MemberJunction/bizapps-credentialing`
- [ ] TODO (Human): Link local MJ checkout once updated to MJ 6.x (`mj dev workspace link`)

## Not completed, and why
- no baseline migration and no changeset (D5/D6, by decision)
- `validate-npm-packages.sh` not run locally (packages unpublished)
- `docs/template-docs/` prose still says "sample" in places describing the template's own history
- the local `../mj` checkout is MJ 2.119 and cannot host a linked workspace until updated to 6.x

## Generated identifiers
- SchemaInfo UUID: `80C351DC-A6C2-40F2-AD22-4443CC9CD3FA`
- Applications UUID: `D72F9280-EAFE-4DB4-A80C-8E2092B89DD5`
- Application Roles UUIDs:
  - UI: `218A07B7-A885-4BD3-B5A1-63CBB4FAD5E1`
  - Developer: `CC3C38A6-3C74-4C77-8CD6-E6FDD74FB417`
