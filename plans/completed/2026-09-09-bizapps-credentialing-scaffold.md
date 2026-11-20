# bizapps-credentialing Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `bizapps-credentialing` MemberJunction Open App repository as a faithful, renamed instance of `open-app-template` with BizApps dependencies declared, six compiling skeleton packages, schema registration metadata, a design document, README, publish checklist, and one commit on `main` with a local `next` branch.

**Architecture:** Copy the template, run its init script with the credentialing identity, then apply the hand-fixes the script cannot do (loader names, selector, prefix colon, publish guard). Layer on the BizApps conventions observed in bizapps-issues/tasks/common: a `Core` package carrying the Common/Tasks entity dependencies, `entityImportPackages`, application-roles metadata, and the newer template CI plus two script fixes from bizapps-common. No domain tables, migrations, or changesets ship in this scaffold.

**Tech Stack:** pnpm 10 via corepack, TypeScript 5.9, Angular 21.1.3, MemberJunction `6.1.0-edge.5`, Turbo, Changesets, Skyway migrations (none yet), mj-sync metadata.

**Spec:** The `SETUP_TASK.md` prompt (delivered as skill arguments, never saved to disk) as amended by the approved Checkpoint 1 decisions D1–D16 recorded in `_reference/NOTES.md` and the chat report of 2026-09-09.

## Global Constraints

- Working directory: `/Users/arieglazier/repos/bizapps-credentialing`. All reference clones live in `_reference/`; `../credentialing` is out of scope and must not be read or referenced.
- pnpm only, always as `corepack pnpm`. Never `npm install`, never hand-edit `pnpm-lock.yaml`.
- Every package `version` stays `0.0.0`. Never edit a version field.
- **One commit only**, at the very end (Task 14), message `Initial scaffold of bizapps-credentialing from open-app-template`. No intermediate commits. Do not push, do not create remote resources, do not publish.
- No domain tables, entity classes, migrations, seed rows for credentialing entities, changesets, fake data, or mock services.
- TypeScript: no `any`. Public class members PascalCase, private camelCase. Angular components standalone with `@if`/`@for`.
- Identity values (exact): app id `mj-bizapps-credentialing`; display `Credentialing`; description `Credentialing, certification, and licensure management for MemberJunction: credential definitions, requirements, holder records, verification, expiration and renewal cycles.`; scope `@mj-biz-apps/credentialing`; schema `__mj_BizAppsCredentialing`; prefix `MJ_BizApps_Credentialing`; repo `https://github.com/MemberJunction/bizapps-credentialing`; publisher `MemberJunction` / `https://memberjunction.com` / `hello@memberjunction.com`; license `BUSL-1.1`; icon `fa-solid fa-certificate`; categories `Business`, `Credentialing`, `Certification`; tags `credential`, `certification`, `license`, `licensure`, `renewal`, `verification`; entity ID range `10000001`–`10099999`; MJ baseline `6.1.0-edge.5`; `mjVersionRange` `>=6.1.0-edge.5 <7.0.0`; dependency ranges `mj-bizapps-common` `>=5.40.0 <6.0.0`, `mj-bizapps-tasks` `>=1.4.3 <2.0.0`.
- Loader names: `LoadBizAppsCredentialingServer`, `LoadBizAppsCredentialingClient`, `LoadBizAppsCredentialingEntitiesServer`, `LoadBizAppsCredentialingActions`. Overview component class and DriverClass: `CredentialingOverviewResource`; its anchor `LoadCredentialingOverviewResource`.
- Two hard checkpoints remain: Checkpoint 2 (Task 13) stops before Task 14. Do not proceed past it without explicit approval.
- Every task ends with its verification commands run and passing. A failing verification is fixed before moving on, never deferred.

---

## File Structure

Created or materially rewritten by this plan (relative to repo root):

| Path | Responsibility |
|---|---|
| `.gitignore` | Trimmed app-relevant ignore list (Task 8); `_reference/`, `SETUP_TASK.md` lines removed in Task 14 |
| `mj-app.json` | The manifest, final form written whole in Task 5 |
| `mj.config.cjs` | CodeGen config: scope, prefix, placeholders, `entityImportPackages`, six build commands (Tasks 2, 4, 6) |
| `package.json` (root) | Name, description, MJ pins at `6.1.0-edge.5` (Tasks 3, 8) |
| `packages/Core/{package.json,tsconfig.json,src/index.ts}` | New sixth package `@mj-biz-apps/credentialing-core` carrying the Common/Tasks entity deps (Task 4) |
| `packages/{Entities,Actions,CoreEntitiesServer,Server}/src/index.ts` | Skeletons with credentialing headers; Server chains the loaders (Task 10) |
| `packages/Angular/src/lib/overview/credentialing-overview.resource.ts` | Landing resource `CredentialingOverviewResource` (Task 10; replaces `overview.resource.ts`) |
| `packages/Angular/src/public-api.ts` | Client bootstrap exporting `LoadBizAppsCredentialingClient` (Task 10) |
| `.github/workflows/{build,changes,publish}.yml`, `.github/scripts/*` | Template CI plus common's lock-case fix and EntityField-sequence gate; publish guard restored (Task 7) |
| `metadata/schema-info/.schema-info.json` | Schema registration row, UUID from init, prefix with colon-space (Task 6) |
| `metadata/applications/.mj-bizapps-credentialing-application.json` | Applications record pointing at `CredentialingOverviewResource` (Task 9) |
| `metadata/application-roles/{.mj-sync.json,.application-roles.json}` | UI and Developer role access (Task 9) |
| `metadata/.mj-sync.json`, `metadata/README.md`, `metadata/*/README.md` | Directory order and folder docs (Task 9) |
| `docs/template-docs/repo-setup.md` | §2/§3 corrected to the PR-based release model (Task 8) |
| `plans/credentialing-design.md` | Domain design proposal (Task 11) |
| `README.md`, `PUBLISH_SETUP.md`, `CLAUDE.md` | Public docs (Task 12) |
| `plans/scaffold-notes.md` | Final summary, written at Checkpoint 2 (Task 13) |

---

### Task 1: Copy the template into the target folder

**Files:**
- Create: everything under `_reference/open-app-template/` except `.git/`, copied to repo root
- Modify: `.gitignore` (merge)

**Interfaces:**
- Produces: a working tree identical to the template plus the two scaffold-only ignore lines.

- [ ] **Step 1: Copy with dotfiles, excluding `.git`**

```bash
cd /Users/arieglazier/repos/bizapps-credentialing
rsync -a --exclude='.git' --exclude='node_modules' _reference/open-app-template/ ./ --backup --suffix=.template-orig
```

The only pre-existing file is `.gitignore`, which rsync backs up as `.gitignore.template-orig` before overwriting. Nothing else exists yet, so no other backups appear.

- [ ] **Step 2: Merge the two `.gitignore` files**

```bash
{ printf '# Scaffold-only (removed before the first commit)\n_reference/\nSETUP_TASK.md\n\n'; cat .gitignore; } > .gitignore.merged
mv .gitignore.merged .gitignore
rm .gitignore.template-orig
```

- [ ] **Step 3: Verify**

Run:
```bash
head -4 .gitignore
ls -a | tr '\n' ' '; echo
ls -d .git _reference >/dev/null && git status --porcelain | grep -c . 
git status --porcelain | grep -E '^\?\? (_reference|SETUP_TASK)' || echo "ignored correctly"
find . -name '*.template-orig' -not -path './_reference/*' -not -path './node_modules/*'
```
Expected: first line `# Scaffold-only`; listing shows `.changeset .github .gitignore .npmrc CLAUDE.md LICENSE README.md ci docs metadata migrations mj-app.json mj-app.reference.jsonc mj.config.cjs package.json packages plans pnpm-lock.yaml pnpm-workspace.yaml scripts tsconfig.angular.json tsconfig.server.json turbo.json`; "ignored correctly"; the `find` prints nothing.

---

### Task 2: Run the init script and apply the rename hand-fixes

**Files:**
- Modify: every git-tracked text file (by the script); then `mj-app.json`, `packages/*/src/*.ts`, `metadata/applications/*`, docs (by sed)

**Interfaces:**
- Produces: package names `@mj-biz-apps/credentialing-{entities,actions,core-entities-server,server,ng}`; loaders `LoadBizAppsCredentialingServer`, `LoadBizAppsCredentialingClient`, `LoadBizAppsCredentialingEntitiesServer`, `LoadBizAppsCredentialingActions`; `metadata/schema-info/.schema-info.json` with a pinned UUID; `metadata/applications/.mj-bizapps-credentialing-application.json`.

- [ ] **Step 1: Stage the tree so `git ls-files` sees it (the script only rewrites tracked files)**

```bash
git add -A
git status --short | wc -l
```
Expected: a count in the dozens, no `_reference/` or `SETUP_TASK.md` entries (`git status --short | grep -c _reference` prints 0).

- [ ] **Step 2: Run the init script non-interactively**

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
Expected: the script prints its replacement table and a changed-file count, then follow-up steps. It must not prompt. If it prints `Input ended before all questions were answered`, a flag is missing; fix the command, do not answer interactively.

- [ ] **Step 3: Record the generated UUID (it must never change again)**

```bash
node -e "const r=require('./metadata/schema-info/.schema-info.json');console.log(r[0].primaryKey.ID, r[0].fields.SchemaName, r[0].fields.EntityIDMin, r[0].fields.EntityIDMax, JSON.stringify(r[0].fields.EntityNamePrefix))"
```
Expected: `<UUID> __mj_BizAppsCredentialing 10000001 10099999 "MJ_BizApps_Credentialing"`. Append the UUID to `_reference/NOTES.md` under a heading `## SchemaInfo UUID (generated once, 2026-09-09)`.

- [ ] **Step 4: Fix the Pascal form the script derived**

The script produces `MjBizappsCredentialing`; the BizApps convention is `BizAppsCredentialing`.

```bash
grep -rl "MjBizappsCredentialing" --exclude-dir=node_modules --exclude-dir=_reference --exclude-dir=.git . \
  | xargs sed -i '' 's/MjBizappsCredentialing/BizAppsCredentialing/g'
grep -rn "MjBizapps" --exclude-dir=node_modules --exclude-dir=_reference --exclude-dir=.git . || echo "pascal fixed"
```
Expected: `pascal fixed`.

- [ ] **Step 5: Fix the two strings the script never rewrites**

```bash
sed -i '' 's/sample-app-overview-resource/bizapps-credentialing-overview-resource/g; s/sample-app-overview/credentialing-overview/g' packages/Angular/src/lib/overview/overview.resource.ts
```

- [ ] **Step 6: Run the rename grep from the task document**

```bash
grep -rn "sample-app\|sample_app\|Sample App\|SampleApp\|mj-sample-app" \
  --exclude-dir=node_modules --exclude-dir=_reference --exclude-dir=.git \
  --exclude=init-template.mjs . || echo "ZERO HITS"
```
Expected: `ZERO HITS`. Any hit is fixed by hand with `sed` on that file, then the grep is re-run.

- [ ] **Step 7: Confirm the manifest and the two bootstrap exports agree**

```bash
node -e "const m=require('./mj-app.json');console.log(m.name, m.packages.server[0].startupExport, m.packages.client[0].startupExport)"
grep -n "export function LoadBizAppsCredentialingServer" packages/Server/src/index.ts
grep -n "export function LoadBizAppsCredentialingClient" packages/Angular/src/public-api.ts
grep -n "DriverClass" metadata/applications/.mj-bizapps-credentialing-application.json
```
Expected: `mj-bizapps-credentialing LoadBizAppsCredentialingServer LoadBizAppsCredentialingClient`; one match in each source file; DriverClass `BizAppsCredentialingOverviewResource` (renamed again in Task 10).

- [ ] **Step 8: Install and build**

```bash
corepack pnpm install 2>&1 | tail -5
corepack pnpm run build:packages 2>&1 | tail -15
```
Expected: install completes (corepack fetches pnpm 10.33.0 the first time); build ends with `Tasks: 5 successful, 5 total`.

- [ ] **Step 9: Verify lockfile importers carry the new names**

```bash
grep -c "@mj-biz-apps/credentialing-" pnpm-lock.yaml; grep -c "mj-sample-app" pnpm-lock.yaml
```
Expected: first count > 0, second count 0.

---

### Task 3: Move the MJ baseline to `6.1.0-edge.5`

**Files:**
- Modify: `package.json`, `mj-app.json`, `packages/Entities/package.json`, `packages/Actions/package.json`, `packages/CoreEntitiesServer/package.json`, `packages/Server/package.json`, `packages/Angular/package.json`

**Interfaces:**
- Produces: every `@memberjunction/*` spec at `6.1.0-edge.5` (peers careted, root devDeps and overrides exact); `mjVersionRange` `>=6.1.0-edge.5 <7.0.0`.

- [ ] **Step 1: Replace the version string in the package manifests only**

```bash
sed -i '' 's/6\.1\.0-edge\.3/6.1.0-edge.5/g' package.json mj-app.json packages/*/package.json
grep -rn "edge\.3" package.json mj-app.json packages/*/package.json || echo "no edge.3 left in manifests"
```
Expected: `no edge.3 left in manifests`. Docs and `ci/sync-mj-app-version.mjs` still mention `edge.3` in prose examples; leave those.

- [ ] **Step 2: Reinstall and rebuild**

```bash
corepack pnpm install 2>&1 | tail -5
corepack pnpm run build:packages 2>&1 | tail -15
```
Expected: `Tasks: 5 successful, 5 total`. If the Angular package fails to compile against edge.5 (for example a changed `BaseResourceComponent` or `ResourceData` signature), read the error, fix the component to the new API, and record the change in `_reference/NOTES.md`. Do not revert to edge.3.

- [ ] **Step 3: Confirm the installed core version**

```bash
node -e "console.log(require('./node_modules/@memberjunction/core/package.json').version)"
node -e "const m=require('./mj-app.json');console.log(m.mjVersionRange)"
```
Expected: `6.1.0-edge.5` and `>=6.1.0-edge.5 <7.0.0`.

---

### Task 4: Add the `Core` package and wire it in

**Files:**
- Create: `packages/Core/package.json`, `packages/Core/tsconfig.json`, `packages/Core/src/index.ts`
- Modify: `packages/Server/package.json`, `mj.config.cjs` (`commands`)

**Interfaces:**
- Produces: `@mj-biz-apps/credentialing-core` at `0.0.0`, depending on `@mj-biz-apps/credentialing-entities` (exact), `@mj-biz-apps/common-entities ^5.40.0`, `@mj-biz-apps/tasks-entities ^1.4.3`. Server depends on it. Task 5 lists it in `packages.shared`.

- [ ] **Step 1: Write `packages/Core/package.json`**

```json
{
  "name": "@mj-biz-apps/credentialing-core",
  "version": "0.0.0",
  "type": "module",
  "description": "Shared services and business logic for BizApps Credentialing: engines, services, and lifecycle helpers usable on both server and client.",
  "main": "dist/index.js",
  "files": ["/dist"],
  "publishConfig": { "access": "public" },
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc && tsc-alias -f",
    "test": "echo \"No tests configured yet\""
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/MemberJunction/bizapps-credentialing"
  },
  "license": "BUSL-1.1",
  "dependencies": {
    "@mj-biz-apps/credentialing-entities": "0.0.0",
    "@mj-biz-apps/common-entities": "^5.40.0",
    "@mj-biz-apps/tasks-entities": "^1.4.3"
  },
  "peerDependencies": {
    "@memberjunction/core": "^6.1.0-edge.5",
    "@memberjunction/global": "^6.1.0-edge.5"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

- [ ] **Step 2: Write `packages/Core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.server.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Write `packages/Core/src/index.ts`**

```ts
/**
 * @mj-biz-apps/credentialing-core — shared services for BizApps Credentialing.
 *
 * WHAT WILL LIVE HERE
 *   Engines and services that run on both server and client: credential
 *   lifecycle orchestration, renewal scheduling that spawns BizApps Tasks
 *   records, requirement evaluation, and the typed helpers UI packages call.
 *   This package may import entity classes from @mj-biz-apps/credentialing-entities,
 *   @mj-biz-apps/common-entities (People, Organizations) and
 *   @mj-biz-apps/tasks-entities (Tasks, Task Links) — it must never import
 *   server-only packages.
 *
 * Nothing is implemented yet. The domain model is proposed in
 * plans/credentialing-design.md; code lands with the first schema migration.
 */
export {};
```

- [ ] **Step 4: Add Core to the Server package dependencies**

Edit `packages/Server/package.json` `dependencies` to read:
```json
  "dependencies": {
    "@mj-biz-apps/credentialing-actions": "0.0.0",
    "@mj-biz-apps/credentialing-core": "0.0.0",
    "@mj-biz-apps/credentialing-core-entities-server": "0.0.0",
    "@mj-biz-apps/credentialing-entities": "0.0.0",
    "class-validator": "^0.14.3"
  },
```

- [ ] **Step 5: Add Core and CoreEntitiesServer to the CodeGen post-build commands**

In `mj.config.cjs`, replace the `commands` array with (order matches bizapps-issues: Entities → Actions → Core → CoreEntitiesServer → Server → Angular):
```js
  commands: [
    { workingDirectory: './packages/Entities', command: 'pnpm', args: ['run', 'build'], when: 'after' },
    { workingDirectory: './packages/Actions', command: 'pnpm', args: ['run', 'build'], when: 'after' },
    { workingDirectory: './packages/Core', command: 'pnpm', args: ['run', 'build'], when: 'after' },
    { workingDirectory: './packages/CoreEntitiesServer', command: 'pnpm', args: ['run', 'build'], when: 'after' },
    { workingDirectory: './packages/Server', command: 'pnpm', args: ['run', 'build'], when: 'after' },
    { workingDirectory: './packages/Angular', command: 'pnpm', args: ['run', 'build'], when: 'after' },
  ],
```

- [ ] **Step 6: Install and build**

```bash
corepack pnpm install 2>&1 | tail -5
corepack pnpm run build:packages 2>&1 | tail -15
ls node_modules/@mj-biz-apps/
```
Expected: `Tasks: 6 successful, 6 total`; the listing shows `common-entities`, `tasks-entities`, and the six `credentialing-*` links.

---

### Task 5: Write the final manifest

**Files:**
- Modify: `mj-app.json` (rewritten whole)

**Interfaces:**
- Produces: the manifest every later task and the README quote from.

- [ ] **Step 1: Write `mj-app.json`**

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

- [ ] **Step 2: Verify the manifest parses and the CI sync script still finds its fields**

```bash
node -e "const m=JSON.parse(require('fs').readFileSync('mj-app.json','utf8'));console.log(m.name,m.version,m.mjVersionRange,Object.keys(m.dependencies).join(','),m.packages.shared.length,m.description.length)"
node ci/sync-mj-app-version.mjs && git diff --stat mj-app.json
```
Expected: `mj-bizapps-credentialing 0.0.0 >=6.1.0-edge.5 <7.0.0 mj-bizapps-common,mj-bizapps-tasks 4 171`; the sync script prints two `already` lines and `git diff --stat` shows no change to `mj-app.json` beyond what this task wrote (the sync must be a no-op).

- [ ] **Step 3: Verify every package repository URL**

```bash
bash .github/scripts/validate-package-repository.sh
bash .github/scripts/validate-package-files.sh
```
Expected: both end with their "All ... packages" success line and exit 0 (six packages checked).

---

### Task 6: Finish schema registration and CodeGen scope

**Files:**
- Modify: `metadata/schema-info/.schema-info.json`, `mj.config.cjs`

**Interfaces:**
- Produces: SchemaInfo record with `EntityNamePrefix` `MJ_BizApps_Credentialing: `; `mj.config.cjs` with `entityImportPackages` for Common and Tasks and both dependency schemas in `excludeSchemas`.

- [ ] **Step 1: Fix the prefix colon and description without touching the UUID**

```bash
node -e "
const fs=require('fs');const p='metadata/schema-info/.schema-info.json';
const r=JSON.parse(fs.readFileSync(p,'utf8'));
r[0].fields.EntityNamePrefix='MJ_BizApps_Credentialing: ';
r[0].fields.Description='Credentialing, certification, and licensure management: credential types, requirements, holder records, verification, expiration and renewal';
fs.writeFileSync(p, JSON.stringify(r,null,2)+'\n');
console.log(r[0].primaryKey.ID, JSON.stringify(r[0].fields.EntityNamePrefix));"
```
Expected: the same UUID recorded in Task 2 Step 3, and `"MJ_BizApps_Credentialing: "`.

- [ ] **Step 2: Replace the `mj.config.cjs` header comment**

Replace the block from `// mj.config.cjs — MemberJunction configuration for THIS Open App repository.` through the `// TODO(template): ... getting-started.md.` line (and the lone `//` line after it) with:
```js
//
// mj.config.cjs — MemberJunction configuration for the BizApps Credentialing repository.
//
// Drives `mj codegen` (and, when developing standalone, `mj migrate`). Database
// connection settings come from environment variables / .env — never put
// credentials here. Only what is specific to this app's layout is declared.
//
```

- [ ] **Step 3: Confirm the values the init script wrote**

```bash
grep -n "entityPackageName\|SchemaName: '__mj_BizAppsCredentialing'\|includeSchemas\|placeholder: '\${flyway:defaultSchema}'" mj.config.cjs
```
Expected: four lines — `entityPackageName: '@mj-biz-apps/credentialing-entities'`, the `NameRulesBySchema` entry with `EntityNamePrefix: 'MJ_BizApps_Credentialing: '`, `includeSchemas: ['__mj_BizAppsCredentialing']`, and `{ schema: '__mj_BizAppsCredentialing', placeholder: '${flyway:defaultSchema}' }`.

- [ ] **Step 4: Add the dependency schemas to `excludeSchemas` and add `entityImportPackages`**

Replace `excludeSchemas: ['sys', 'staging', 'dbo', '__mj'],` with:
```js
  excludeSchemas: ['sys', 'staging', 'dbo', '__mj', '__mj_BizAppsCommon', '__mj_BizAppsTasks'],

  // Schema → npm package for peer entity classes this app's CodeGen does NOT
  // generate (embeds + related-record collections). Distinct from:
  //   includeSchemas     — what this run generates
  //   entityPackageName  — the npm package this run writes
  // Core (__mj) always comes from @memberjunction/core-entities; do not list it.
  // Never map a foreign schema to this app's own package.
  entityImportPackages: {
    '__mj_BizAppsCommon': '@mj-biz-apps/common-entities',
    '__mj_BizAppsTasks': '@mj-biz-apps/tasks-entities',
  },
```
Also remove the remaining `// TODO(template): ...` comment lines inside the file (three of them: above `NameRulesBySchema`'s app entry, above `includeSchemas`, and above the app `schemaPlaceholders` entry).

- [ ] **Step 5: Verify the config loads**

```bash
node -e "const c=require('./mj.config.cjs');console.log(c.entityPackageName, c.includeSchemas, c.excludeSchemas.length, Object.keys(c.entityImportPackages).join(','), c.commands.length, c.newEntityDefaults.NameRulesBySchema[1].EntityNamePrefix)"
grep -c "TODO(template)" mj.config.cjs || true
```
Expected: `@mj-biz-apps/credentialing-entities [ '__mj_BizAppsCredentialing' ] 6 __mj_BizAppsCommon,__mj_BizAppsTasks 6 MJ_BizApps_Credentialing: ` and `0`.

---

### Task 7: CI: restore the publish guard and take common's two script fixes

**Files:**
- Modify: `.github/workflows/publish.yml`, `.github/workflows/build.yml`, `.github/workflows/changes.yml`
- Create: `.github/scripts/__tests__/validate-package-lock-case.test.sh`, `.github/scripts/check-migration-entityfield-sequence.sh`
- Replace: `.github/scripts/validate-package-lock-case.sh`

**Interfaces:**
- Produces: a `publish.yml` that runs for this repo; a lock-case gate that can actually fail; the EntityField-sequence gate on PRs.

- [ ] **Step 1: Restore the template-only publish guard**

The init script rewrote the repository name inside the guard, which would disable publishing for this repo.
```bash
grep -n "github.repository !=" .github/workflows/publish.yml
sed -i '' "s#github.repository != 'MemberJunction/bizapps-credentialing'#github.repository != 'MemberJunction/open-app-template'#" .github/workflows/publish.yml
grep -n "github.repository !=" .github/workflows/publish.yml
```
Expected: before, `'MemberJunction/bizapps-credentialing'`; after, `'MemberJunction/open-app-template'`.

- [ ] **Step 2: Copy the fixed lock-case validator, its test, and the EntityField gate from bizapps-common**

```bash
mkdir -p .github/scripts/__tests__
cp _reference/bizapps-common/.github/scripts/validate-package-lock-case.sh .github/scripts/validate-package-lock-case.sh
cp _reference/bizapps-common/.github/scripts/__tests__/validate-package-lock-case.test.sh .github/scripts/__tests__/validate-package-lock-case.test.sh
cp _reference/bizapps-common/.github/scripts/check-migration-entityfield-sequence.sh .github/scripts/check-migration-entityfield-sequence.sh
chmod +x .github/scripts/*.sh .github/scripts/__tests__/*.sh
grep -n "bizapps-common\|BizAppsCommon\|@mj-biz-apps/common" .github/scripts/validate-package-lock-case.sh .github/scripts/__tests__/validate-package-lock-case.test.sh .github/scripts/check-migration-entityfield-sequence.sh || echo "no common-specific strings"
```
Expected: `no common-specific strings`. If any appear, they are prose in comments; leave them only if they name the origin of the fix, otherwise generalize the wording.

- [ ] **Step 3: Add the guard-script test step to `build.yml`**

In `.github/workflows/build.yml`, after the step `- name: Validate repository.url in packages` (ends with `run: ./.github/scripts/validate-package-repository.sh`) and before `- name: Install dependencies`, insert:
```yaml
      # Runs on every PR, not only at publish. validate-package-lock-case.sh is a release gate, so
      # a bug in the GATE would otherwise be discovered during a release — the one-level-up form of
      # the failure it exists to prevent. These fixtures drive the real script against throwaway
      # repos, including the mis-cased cases that fail without the fix (taken from bizapps-common).
      - name: CI guard script tests
        run: ./.github/scripts/__tests__/validate-package-lock-case.test.sh

```

- [ ] **Step 4: Add the EntityField-sequence gate to `changes.yml`**

In `.github/workflows/changes.yml`, after the step `- name: Validate migration filenames` (three lines: name, `if:`, `run:`) and before `- name: Validate migration timestamps are newer than existing`, insert:
```yaml
      - name: EntityField Sequence must not be a literal placeholder
        env:
          BASE_REF: ${{ github.event.pull_request.base.sha }}
        run: |
          # Keep these two lines together. The default invocation exits 0 with
          # "no changed migrations to check" when BASE_REF is unset; --self-test
          # is what makes a green run meaningful.
          ./.github/scripts/check-migration-entityfield-sequence.sh --self-test
          ./.github/scripts/check-migration-entityfield-sequence.sh

```

- [ ] **Step 5: Run every gate that can run without CI context**

```bash
bash .github/scripts/validate-package-lock-case.sh
bash .github/scripts/__tests__/validate-package-lock-case.test.sh 2>&1 | tail -3
bash .github/scripts/check-migration-entityfield-sequence.sh --self-test 2>&1 | tail -2
bash .github/scripts/check-migration-entityfield-sequence.sh 2>&1 | tail -2
bash .github/scripts/validate-migration-filenames.sh
bash .github/scripts/validate-package-repository.sh | tail -1
bash .github/scripts/validate-package-files.sh | tail -1
for f in .github/workflows/*.yml; do node -e "require('fs').readFileSync('$f','utf8')" && python3 -c "import yaml,sys; yaml.safe_load(open('$f'))" 2>/dev/null || node -e "console.log('yaml module unavailable; skipped parse of $f')"; done
```
Expected: lock-case prints `No case-sensitivity issues found`; the test script reports all fixtures passing; `--self-test` passes; the plain run says no changed migrations to check; filenames prints `All 0 migration filenames are valid!`; the two package validators print their success lines. `validate-npm-packages.sh` is **not** run: it queries npm and the six packages do not exist yet (expected until the human publishes placeholders).

- [ ] **Step 6: Record the CI decision in the notes**

Append to `_reference/NOTES.md`: `CI: template workflows kept; publish.yml guard restored to open-app-template; lock-case script + test and entityfield-sequence gate copied from bizapps-common f7fdded.`

---

### Task 8: Root hygiene: `.gitignore`, root `package.json`, stale template doc

**Files:**
- Modify: `.gitignore` (rewrite), `package.json` (description), `docs/template-docs/repo-setup.md` (§2, §3)

- [ ] **Step 1: Rewrite `.gitignore`**

```gitignore
# Scaffold-only (removed before the first commit)
_reference/
SETUP_TASK.md

# CodeGen scratch output (fold what you need into migrations/, then discard)
codegen.output.log
migrations/codegen/
SQL Scripts/
Schema Files/
temp_sql_scripts/
metadata/sql_logging/
metadata/**/.backups/

# Build output and caches
node_modules/
dist/
dist-browser/
.turbo/
.angular/
.cache/
*.tsbuildinfo
coverage/
*.log

# pnpm is this repo's package manager (see .npmrc / pnpm-workspace.yaml).
# pnpm-lock.yaml is the lockfile of record and IS committed; a stray `npm install`
# must not leave a second, conflicting lockfile behind.
package-lock.json

# Environment and local-only config (never committed)
.env
*.env
.env.*
*.local
mj.config.js
mj.config.ts
.mjrc
.mjrc.*
.config/mjrc*

# OS / editor noise
.DS_Store
Thumbs.db
.idea/
.vscode/chrome
report.html
report.json

# Claude Code local state
**/.claude/settings.local.json
**/.claude/settings.local.json.bak
**/.claude/worktrees/
```

- [ ] **Step 2: Fix the root `package.json` description**

```bash
node -e "
const fs=require('fs');const p='package.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));
j.description='BizApps Credentialing - Credentialing, certification, and licensure management built on MemberJunction';
fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');console.log(j.name, j.repository.url, j.scripts['build:packages'])"
```
Expected: `bizapps-credentialing https://github.com/MemberJunction/bizapps-credentialing turbo --log-order=stream build --filter="@mj-biz-apps/credentialing-*"`.

- [ ] **Step 3: Correct `docs/template-docs/repo-setup.md` §2 and §3**

Replace the `main` bullet in §2 with:
```markdown
- **`main`** — release. A push to `main` triggers `publish.yml`, which validates,
  builds, publishes to npm, and tags. Versioning happens earlier, in the
  "Version Packages" PR that `version.yml` maintains on `next`.
```
Replace the whole of §3 with:
```markdown
## 3. Branch protection

Both branches can carry a ruleset requiring pull requests: the release
pipeline never pushes to either. `version.yml` delivers the version bump as a
pull request into `next`, and `publish.yml` only publishes and pushes a tag
(tags are not branches, so a branch ruleset never blocks them). Protect `next`
with required status checks (`build.yml`, `changes.yml`) for a hard gate on
feature PRs, and `main` with `release-readiness` for the release PR. Under the
default `GITHUB_TOKEN`, checks on the bot-opened Version Packages PR wait for a
maintainer to click **Approve and run** — see
[publishing.md](publishing.md).
```

- [ ] **Step 4: Verify**

```bash
git status --porcelain | grep -E '^\?\? (_reference|SETUP_TASK)' || echo "still ignored"
grep -n "unprotected\|merges back" docs/template-docs/repo-setup.md || echo "stale text gone"
corepack pnpm run build:packages 2>&1 | tail -3
```
Expected: `still ignored`, `stale text gone`, `Tasks: 6 successful, 6 total`.

---

### Task 9: Metadata skeleton

**Files:**
- Modify: `metadata/.mj-sync.json`, `metadata/applications/.mj-bizapps-credentialing-application.json`, `metadata/README.md`, `metadata/schema-info/README.md`, `metadata/applications/README.md`
- Create: `metadata/application-roles/.mj-sync.json`, `metadata/application-roles/.application-roles.json`
- Delete: `metadata/schema-info/schema-info.json.template`, `metadata/applications/application.json.template`

**Interfaces:**
- Consumes: DriverClass `CredentialingOverviewResource` (registered in Task 10).
- Produces: an Applications record named `Credentialing`; role access for `UI` and `Developer`.

- [ ] **Step 1: Rewrite the application record fields, keeping the UUID the init script minted**

```bash
node -e "
const fs=require('fs');const p='metadata/applications/.mj-bizapps-credentialing-application.json';
const r=JSON.parse(fs.readFileSync(p,'utf8'));
r[0]._comments=[
 'The BizApps Credentialing Application — what puts Credentialing in the MemberJunction Explorer app switcher.',
 '',
 'DefaultNavItems currently holds the single Overview landing page. Domain views (credential definitions,',
 'holders, verifications, renewals) are added here as their DriverClasses land in @mj-biz-apps/credentialing-ng.',
 'Each item is ResourceType Custom pointing at a DriverClass registered with',
 '@RegisterClass(BaseResourceComponent, \"<DriverClass>\").'
];
r[0].fields={
 Name:'Credentialing',
 Description:'Credentialing, certification, and licensure management for MemberJunction: credential definitions, requirements, holder records, verification, expiration and renewal cycles.',
 Icon:'fa-solid fa-certificate',
 Color:'#264FAF',
 DefaultForNewUser:true,
 DefaultSequence:1000,
 DefaultNavItems:[{Label:'Overview',Icon:'fa-solid fa-certificate',ResourceType:'Custom',DriverClass:'CredentialingOverviewResource',isDefault:true}]
};
const out=[{_comments:r[0]._comments,fields:r[0].fields,relatedEntities:r[0].relatedEntities,primaryKey:r[0].primaryKey}];
fs.writeFileSync(p, JSON.stringify(out,null,2)+'\n');console.log(out[0].primaryKey.ID, out[0].fields.Name)"
```
Expected: a UUID and `Credentialing`. Record the application UUID in `_reference/NOTES.md`.

- [ ] **Step 2: Create `metadata/application-roles/.mj-sync.json`**

```json
{
  "entity": "MJ: Application Roles",
  "filePattern": "**/.*.json",
  "pull": {
    "createNewFileIfNotFound": true,
    "newFileName": ".application-roles.json",
    "appendRecordsToExistingFile": true,
    "updateExistingRecords": true,
    "ignoreNullFields": true,
    "ignoreVirtualFields": true
  }
}
```

- [ ] **Step 3: Create `metadata/application-roles/.application-roles.json` with two freshly generated UUIDs**

```bash
U1=$(uuidgen | tr a-z A-Z); U2=$(uuidgen | tr a-z A-Z); echo "$U1 $U2"
cat > metadata/application-roles/.application-roles.json <<EOF
[
  {
    "fields": {
      "ApplicationID": "@lookup:MJ: Applications.Name=Credentialing",
      "RoleID": "@lookup:MJ: Roles.Name=UI",
      "CanAccess": true,
      "CanAdmin": false
    },
    "primaryKey": { "ID": "$U1" }
  },
  {
    "fields": {
      "ApplicationID": "@lookup:MJ: Applications.Name=Credentialing",
      "RoleID": "@lookup:MJ: Roles.Name=Developer",
      "CanAccess": true,
      "CanAdmin": true
    },
    "primaryKey": { "ID": "$U2" }
  }
]
EOF
```
Record both UUIDs in `_reference/NOTES.md`.

- [ ] **Step 4: Set the directory order**

Write `metadata/.mj-sync.json`:
```json
{
  "version": "1.0.0",
  "push": {
    "autoCreateMissingRecords": true
  },
  "directoryOrder": [
    "schema-info",
    "applications",
    "application-roles"
  ]
}
```

- [ ] **Step 5: Remove the inert templates and rewrite the three READMEs**

```bash
rm metadata/schema-info/schema-info.json.template metadata/applications/application.json.template
```

`metadata/README.md`:
```markdown
# metadata/

MJ metadata authored as files and pushed with `mj sync` — the dev-time source
of truth. Installs never read this folder: they receive the same records as
`V*_Metadata_Sync.sql` migrations captured from a push (see
[`docs/template-docs/codegen-and-metadata-migrations.md`](../docs/template-docs/codegen-and-metadata-migrations.md)).

## Layout

| Folder | Entity | What it holds |
|---|---|---|
| `schema-info/` | `MJ: Schema Info` | Registers `__mj_BizAppsCredentialing`: entity-name prefix `MJ_BizApps_Credentialing: `, entity ID range, pinned UUID. Pushed first. |
| `applications/` | `MJ: Applications` | The `Credentialing` application and its nav items (Explorer app switcher). |
| `application-roles/` | `MJ: Application Roles` | Which MJ roles can access the application (`UI`: access; `Developer`: access + admin). |

Folders push in the order listed in `.mj-sync.json` `directoryOrder`. Only
dot-prefixed `.json` files inside listed folders are records — do not park
drafts in this tree. Domain seed folders (credential types, statuses) are added
alongside the migrations that create their tables; see
[`plans/credentialing-design.md`](../plans/credentialing-design.md).

## Commands

```sh
pnpm exec mj-sync validate --dir=metadata            # validate before pushing
pnpm exec mj sync push --dir=metadata --format=json  # push to your dev database
```

`mj sync push` is a single-author, dev-time tool and performs a full reconcile
for each entity scope. Authoring rules, `@lookup:`/`@file:` syntax, and the
push → capture → commit loop:
[`docs/template-docs/metadata.md`](../docs/template-docs/metadata.md).
```

`metadata/schema-info/README.md`:
```markdown
# schema-info

Registers this app's schema in `__mj.SchemaInfo` — the record that gives the
app's entities their name prefix and reserved ID range.

`.schema-info.json` is **already activated** for `__mj_BizAppsCredentialing`
(prefix `MJ_BizApps_Credentialing: `, IDs `10000001`–`10099999`). The
`primaryKey.ID` was generated once and must **never change** — it is what makes
the row deterministic across every database this app is installed into. The
`sync` block is written back by `mj sync push` on first push; commit it.

`EntityNamePrefix` here must always agree with `mj.config.cjs`
`newEntityDefaults.NameRulesBySchema`. Full guide:
[`docs/template-docs/metadata.md`](../../docs/template-docs/metadata.md) § Schema registration.
```

`metadata/applications/README.md`:
```markdown
# applications

The `MJ: Applications` record that puts **Credentialing** in MJ Explorer's app
switcher. Each `DefaultNavItems` entry with `ResourceType: "Custom"` names a
`DriverClass` that must exactly match an
`@RegisterClass(BaseResourceComponent, '<DriverClass>')` component exported
from `@mj-biz-apps/credentialing-ng` — today that is
`CredentialingOverviewResource` in
`packages/Angular/src/lib/overview/credentialing-overview.resource.ts`.

The record's `primaryKey.ID` is pinned and must never change once pushed.
Keep `DefaultForNewUser: true` (see
[`docs/template-docs/explorer-visibility.md`](../../docs/template-docs/explorer-visibility.md)
for the trap it avoids). Access for existing roles is granted in
`../application-roles/`.
```

- [ ] **Step 6: Verify**

```bash
for f in $(find metadata -name '*.json' -not -path '*/node_modules/*'); do node -e "JSON.parse(require('fs').readFileSync('$f','utf8'))" && echo "ok $f"; done
ls -a metadata metadata/*
grep -rn "TODO\|Sample\|sample" metadata || echo "no placeholders in metadata"
grep -rho '"entity": "[^"]*"' metadata | sort -u
```
Expected: every file `ok`; no `.template` files; `no placeholders in metadata`; entities are exactly `MJ: Application Roles`, `MJ: Applications`, `MJ: Schema Info` (all MJ core entities).

---

### Task 10: Angular landing page, server bootstrap, package skeletons

**Files:**
- Create: `packages/Angular/src/lib/overview/credentialing-overview.resource.ts`
- Delete: `packages/Angular/src/lib/overview/overview.resource.ts`
- Modify: `packages/Angular/src/public-api.ts`, `packages/Server/src/index.ts`, `packages/Entities/src/index.ts`, `packages/Actions/src/index.ts`, `packages/CoreEntitiesServer/src/index.ts`

**Interfaces:**
- Consumes: `LoadBizAppsCredentialingEntitiesServer` (CoreEntitiesServer), `LoadBizAppsCredentialingActions` (Actions).
- Produces: `CredentialingOverviewResource` registered as DriverClass `CredentialingOverviewResource`; `LoadCredentialingOverviewResource(): void`; `LoadBizAppsCredentialingClient(): void`; `LoadBizAppsCredentialingServer(): void`.

- [ ] **Step 1: Write `packages/Angular/src/lib/overview/credentialing-overview.resource.ts`**

```ts
/**
 * Credentialing overview — the app's landing resource, rendered as a tab in MJ Explorer.
 *
 * Every link in the Explorer-visibility chain fails silently, so this page exists to
 * prove the wiring end to end:
 *   1. @RegisterClass(BaseResourceComponent, 'CredentialingOverviewResource')  <- this file
 *   2. exported from ../../public-api.ts and anchored by LoadBizAppsCredentialingClient()
 *   3. metadata/applications/ nav item with the SAME DriverClass string
 *   4. MJExplorer imports @mj-biz-apps/credentialing-ng (installed: the CLI maintains the
 *      generated bootstrap import; dev-linked: you add it yourself)
 * Chain + a "nothing shows up" checklist: docs/template-docs/explorer-visibility.md
 *
 * The cards below name the areas the design proposes (plans/credentialing-design.md).
 * They are static copy, not data; each becomes its own nav item as it ships.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';

interface CredentialingArea {
    Title: string;
    Description: string;
    Icon: string;
}

@RegisterClass(BaseResourceComponent, 'CredentialingOverviewResource')
@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'bizapps-credentialing-overview-resource',
    template: `
        <div class="credentialing-overview">
            <h2><i class="fa-solid fa-certificate"></i> {{ AppName }}</h2>
            <p class="tagline">{{ Tagline }}</p>
            <p class="status">
                This app is a scaffold: the platform wiring is in place and the domain model is
                proposed in <code>plans/credentialing-design.md</code>. The areas below arrive as
                that design is implemented.
            </p>
            <div class="areas">
                @for (area of Areas; track area.Title) {
                    <section class="area">
                        <h3><i [class]="area.Icon"></i> {{ area.Title }}</h3>
                        <p>{{ area.Description }}</p>
                    </section>
                }
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; width: 100%; height: 100%; }
        .credentialing-overview { padding: 1.5rem; max-width: 60rem; }
        .credentialing-overview h2 { margin: 0 0 .5rem; font-size: 1.25rem; }
        .tagline { margin: 0 0 1rem; line-height: 1.5; }
        .status { margin: 0 0 1.5rem; line-height: 1.5; opacity: .8; }
        .status code { padding: .1rem .3rem; border-radius: 3px; border: 1px solid; border-color: color-mix(in srgb, currentColor 25%, transparent); }
        .areas { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: 1rem; }
        .area { padding: 1rem; border-radius: 6px; border: 1px solid; border-color: color-mix(in srgb, currentColor 25%, transparent); }
        .area h3 { margin: 0 0 .5rem; font-size: 1rem; }
        .area p { margin: 0; line-height: 1.45; opacity: .85; }
    `],
})
export class CredentialingOverviewResource extends BaseResourceComponent implements OnInit {
    public readonly AppName: string = 'Credentialing';
    public readonly Tagline: string =
        'Credentialing, certification, and licensure management for MemberJunction: credential definitions, requirements, holder records, verification, expiration and renewal cycles.';
    public readonly Areas: CredentialingArea[] = [
        {
            Title: 'Credential Definitions',
            Description: 'Credential types, issuing bodies, validity periods, and the requirements to earn or renew each one.',
            Icon: 'fa-solid fa-certificate',
        },
        {
            Title: 'Holders',
            Description: 'The credentials people hold: status, credential number, issue and expiry dates, issuing organization.',
            Icon: 'fa-solid fa-id-badge',
        },
        {
            Title: 'Verifications',
            Description: 'Who verified a credential, when, by what method, and with what outcome.',
            Icon: 'fa-solid fa-clipboard-check',
        },
        {
            Title: 'Renewals',
            Description: 'Expiration tracking and renewal work items, run as BizApps Tasks linked back to the credential.',
            Icon: 'fa-solid fa-rotate',
        },
    ];

    /**
     * NotifyLoadComplete() is not optional: Explorer holds its loading state until the
     * resource signals. Always call super.ngOnInit() first.
     */
    override ngOnInit(): void {
        super.ngOnInit();
        this.NotifyLoadComplete();
    }

    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'Overview';
    }

    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-certificate';
    }
}

/**
 * Tree-shaking anchor: a decorator only runs if the module is evaluated, and a module is
 * only evaluated if something references it. The client bootstrap calls this.
 */
export function LoadCredentialingOverviewResource(): void {
    void CredentialingOverviewResource;
}
```

```bash
rm packages/Angular/src/lib/overview/overview.resource.ts
```

- [ ] **Step 2: Write `packages/Angular/src/public-api.ts`**

```ts
/**
 * @mj-biz-apps/credentialing-ng — the CLIENT BOOTSTRAP package for BizApps Credentialing.
 *
 * Named in mj-app.json under packages.client with role "bootstrap". When the app is
 * installed (or dev-linked), MJExplorer's generated open-app-bootstrap.generated.ts gains
 * `import '@mj-biz-apps/credentialing-ng';` — bundling this module fires every
 * @RegisterClass decorator that makes the app's components discoverable.
 *
 * WHAT LIVES HERE
 *   src/lib/generated/ — CodeGen Angular output (entity forms; never hand-edited).
 *                        After the first codegen run, import './lib/generated/generated-forms.module'
 *                        here and re-export GeneratedFormsModule, as every shipped BizApp does.
 *   src/lib/overview/  — the Credentialing landing resource (this scaffold's one page)
 *   src/lib/           — future components: credential list, detail/edit panels, holder
 *                        dashboard, "My Credentials" — standalone, @if/@for, events not routing
 */

// Entity package side-effect import: fires @RegisterClass for entity subclasses once they exist.
import '@mj-biz-apps/credentialing-entities';

import { LoadCredentialingOverviewResource } from './lib/overview/credentialing-overview.resource';

export {
    CredentialingOverviewResource,
    LoadCredentialingOverviewResource,
} from './lib/overview/credentialing-overview.resource';

/**
 * Bootstrap function named by mj-app.json packages.client[0].startupExport.
 * Calls each component module's anchor so its @RegisterClass decorators run and no
 * bundler can conclude the modules are unused.
 */
export function LoadBizAppsCredentialingClient(): void {
    LoadCredentialingOverviewResource();
}
```

- [ ] **Step 3: Write `packages/Server/src/index.ts`**

```ts
/**
 * @mj-biz-apps/credentialing-server — the SERVER BOOTSTRAP package for BizApps Credentialing.
 *
 * Named in mj-app.json under packages.server with role "bootstrap". At startup MJAPI
 * dynamically imports this package and calls LoadBizAppsCredentialingServer(). That call,
 * plus the imports below, fires every @RegisterClass decorator in the app's server-side
 * packages — entities, server-side entity subclasses, actions, and (after CodeGen)
 * GraphQL resolvers.
 *
 * WHAT LIVES HERE
 *   src/generated/  — CodeGen GraphQLServer output (resolvers; never hand-edited).
 *                     After the first codegen run add `export * from './generated/generated';`
 *                     and export RESOLVER_PATHS as bizapps-issues and bizapps-tasks do.
 *   src/            — hand-written resolvers, event handlers, scheduled jobs
 */

// Side-effect imports fire @RegisterClass in the shared packages.
import '@mj-biz-apps/credentialing-entities';
import '@mj-biz-apps/credentialing-core';

import { LoadBizAppsCredentialingActions } from '@mj-biz-apps/credentialing-actions';

// Server-side entity subclasses register at priority 2 and must load after the
// client-shared entities so their overrides win.
import { LoadBizAppsCredentialingEntitiesServer } from '@mj-biz-apps/credentialing-core-entities-server';

/**
 * Bootstrap function named by mj-app.json packages.server[0].startupExport and called by
 * MJ's DynamicPackageLoader. Chains the sub-package anchors so one call registers everything.
 */
export function LoadBizAppsCredentialingServer(): void {
    LoadBizAppsCredentialingEntitiesServer();
    LoadBizAppsCredentialingActions();
}
```

- [ ] **Step 4: Replace the header comments in the three remaining skeletons**

`packages/Entities/src/index.ts`:
```ts
/**
 * @mj-biz-apps/credentialing-entities — the ENTITY package for BizApps Credentialing.
 *
 * WHAT WILL LIVE HERE
 *   src/generated/entity_subclasses.ts — written by MemberJunction CodeGen
 *   (`pnpm run mj:codegen` at the repo root): one strongly-typed BaseEntity subclass
 *   plus zod schema per table in __mj_BizAppsCredentialing, named with the
 *   `MJ_BizApps_Credentialing: ` prefix. Committed generated code is the source of
 *   truth consumers install; CodeGen on a clean branch is a no-op.
 *   src/custom/ — hand-written entity subclasses shared by server and client
 *   (client-safe validation, computed helpers). Never edit src/generated/.
 *
 * @memberjunction/core and @memberjunction/global are PEER dependencies: exactly one
 * copy of each may exist in a host process (docs/template-docs/versioning-and-peer-deps.md).
 *
 * No tables exist yet — the model is proposed in plans/credentialing-design.md.
 */
export * from './generated/entity_subclasses';
```

`packages/Actions/src/index.ts`:
```ts
/**
 * @mj-biz-apps/credentialing-actions — MJ Actions exposed by BizApps Credentialing.
 *
 * Actions are metadata-driven integration points for agents, workflows, and the
 * TaskType / CredentialType action hooks — never a code-to-code call mechanism.
 *
 * WHAT WILL LIVE HERE
 *   src/generated/ — CodeGen ActionSubclasses output (never hand-edited)
 *   src/           — hand-written BaseAction subclasses registered as
 *                    @RegisterClass(BaseAction, 'MJ_BizApps_Credentialing: <Action Name>')
 *                    with matching MJ: Actions metadata rows, e.g. the OnIssue / OnExpire /
 *                    OnRenew / OnRevoke hook actions from plans/credentialing-design.md
 *
 * The Load function is imported by the server bootstrap so bundlers cannot tree-shake
 * the @RegisterClass side effects away.
 */
export function LoadBizAppsCredentialingActions(): void {
    // No-op until actions exist: importing this module registers the action classes above.
}
```

`packages/CoreEntitiesServer/src/index.ts`:
```ts
/**
 * @mj-biz-apps/credentialing-core-entities-server — SERVER-ONLY entity subclasses.
 *
 * Generated entities are overridden here for behavior that must run server-side and
 * authoritatively: Save() hooks that write the CredentialActivity audit log, status
 * transitions that fire CredentialType action hooks, cross-record invariants
 * (ValidateAsync, not DB triggers), and FK cleanup before delete — mirroring
 * bizapps-tasks' TaskEntityServer and bizapps-issues' IssueEntityServer.
 *
 * Client code must never import this package; it is a dependency of the Server
 * package only. The sibling entity package is an exact-pinned dependency (all app
 * packages version together); every @memberjunction/* package is a caret PEER.
 */
export function LoadBizAppsCredentialingEntitiesServer(): void {
    // No-op until subclasses exist: importing this module registers them.
}
```

- [ ] **Step 5: Build and verify the registration chain**

```bash
corepack pnpm run build:packages 2>&1 | tail -3
grep -rn "CredentialingOverviewResource" packages/Angular/src metadata/applications | grep -v "^packages/Angular/src/lib/overview/credentialing-overview.resource.ts:.*\*" 
grep -rn "TODO(template)\|Sample\|sample" packages/*/src || echo "packages clean"
ls packages/Angular/src/lib/overview/
```
Expected: `Tasks: 6 successful, 6 total`; hits in the component (`@RegisterClass` line, class line, anchor), `public-api.ts` (export + import), and the application record (`DriverClass`); `packages clean`; the listing shows only `credentialing-overview.resource.ts`.

---

### Task 11: Design document

**Files:**
- Create: `plans/credentialing-design.md`

**Interfaces:**
- Consumes: BizApps patterns recorded in `_reference/NOTES.md` (TaskType hooks, TaskTypeStatus two-level status, TaskLink polymorphism, TaskActivity, TaskDecision; Common Person/Organization UUID PKs; AddressLink).
- Produces: the document the README, overview page, and package headers point at.

- [ ] **Step 1: Write `plans/credentialing-design.md` with these sections and content**

Header: title `BizApps Credentialing — Domain Design (first pass)`, a status line `Proposal for team review. No tables, entities, or migrations exist yet; this document is the deliverable for the domain.`, date 2026-09-09.

**1. Problem statement** (one page): credentialing for associations and non-profits covers member certifications (a designation earned by exam and maintained by continuing education), professional licenses tracked on behalf of members, continuing-education requirements with hour targets per cycle, volunteer background checks that expire, and staff compliance training. Common shape across all five: a *definition* of what the credential is and what it takes to earn and keep it; an *instance* held by a person, with a lifecycle (pending, active, expired, suspended, revoked, renewal due); *evidence* proving requirements were met; *verification* by staff or a third party; *renewal* on a cycle; and an *audit trail*. Today each MJ application reinvents these tables. BizApps Credentialing is the thin, reusable primitive layer, in the same spirit as bizapps-tasks and bizapps-issues.

**2. How it fits** — ASCII layer cake in the bizapps-issues style:
```
bizapps-common          People, Organizations, Addresses               __mj_BizAppsCommon
      ▲
bizapps-tasks           Tasks, Task Types (action hooks), Task Links   __mj_BizAppsTasks
      ▲
bizapps-credentialing   Credential Types, Requirements, Credentials,   __mj_BizAppsCredentialing   ◄── this app
                        Evidence, Verifications, Activity, hooks
      ▲
Consuming apps          Member portals, LMS integrations, registries
```
Followed by two sentences: a Credential is the *record*; renewals and verification reviews are the *work*, and the work is `Task` records from bizapps-tasks linked back through `TaskLink` (EntityID = the Credentials entity, RecordID = the credential's ID). Holders and issuing bodies are `Person` and `Organization` rows from bizapps-common, referenced by UNIQUEIDENTIFIER FKs.

**3. Proposed core entities** — one subsection each with a purpose paragraph and a key-fields list (types in SQL Server terms; every table has `ID UNIQUEIDENTIFIER PK DEFAULT NEWSEQUENTIALID()`; CodeGen owns `__mj_CreatedAt`/`__mj_UpdatedAt` and FK indexes, so they are not listed):

- **CredentialType** — the definition. Fields: `Name NVARCHAR(200)`, `Code NVARCHAR(50) UNIQUE` (stable machine code for cross-app metadata references, as TaskType.Code), `Description`, `Category NVARCHAR(50) CHECK IN ('Certification','License','Designation','Clearance','Training')`, `IssuingOrganizationID → __mj_BizAppsCommon.Organization`, `IsExpiring BIT`, `ValidityMonths INT NULL`, `RenewalWindowDays INT NULL` (how long before expiry a renewal becomes due), `RequiresVerification BIT`, `CredentialNumberFormat NVARCHAR(100) NULL`, `IconClass`, `IsActive BIT`. Hook columns per §3.8.
- **CredentialStatus** — dynamic statuses per type, mirroring `TaskTypeStatus` and `IssueStatus`. Fields: `CredentialTypeID FK (ON DELETE CASCADE)`, `Name`, `Code`, `MacroStatus NVARCHAR(20) CHECK IN ('Pending','Active','RenewalDue','Expired','Suspended','Revoked')`, `Sequence INT`, `IsDefault BIT`, `IsTerminal BIT`, `Color`, `IconClass`, `OnEnterActionID`/`OnExitActionID → __mj.[Action]`, `IsActive`. Unique `(CredentialTypeID, Code)` and `(CredentialTypeID, Name)`. Generic machinery (dashboards, expiry jobs) reads `MacroStatus`; UI reads the domain status.
- **CredentialRequirement** — what must be satisfied to earn (`AppliesTo = 'Issue'`) or renew (`'Renewal'`, or `'Both'`) a type. Fields: `CredentialTypeID FK`, `Name`, `Description`, `AppliesTo NVARCHAR(20) CHECK`, `RequirementKind NVARCHAR(30) CHECK IN ('ContinuingEducationHours','PrerequisiteCredential','Exam','Fee','Document','Attestation','Other')`, `QuantityRequired DECIMAL(9,2) NULL` (hours, count), `PrerequisiteCredentialTypeID FK NULL` (self-join on CredentialType for the prerequisite kind), `IsRequired BIT`, `Sequence INT`, `IsActive`. Polymorphic only where it earns its keep: prerequisite is a typed FK, documents are typed through `CredentialEvidence`.
- **Credential** — the instance a person holds. Fields: `CredentialTypeID FK`, `PersonID → __mj_BizAppsCommon.Person`, `CredentialStatusID FK NULL` (domain status), `Status NVARCHAR(20)` (denormalized macro status, kept in sync server-side exactly as `Task.Status` is), `CredentialNumber NVARCHAR(100) NULL`, `IssuingOrganizationID → Organization NULL` (defaults from the type; overridable for third-party-issued credentials), `IssuedAt DATE NULL`, `ExpiresAt DATE NULL`, `LastVerifiedAt DATETIMEOFFSET NULL`, `RenewalDueAt DATE NULL` (computed by server logic from ExpiresAt and RenewalWindowDays), `Notes NVARCHAR(MAX)`. Unique `(CredentialTypeID, CredentialNumber)` filtered where number is not null; whether numbers are globally unique is an open question (§5).
- **CredentialRequirementFulfillment** — one row per (Credential, Requirement) recording progress: `CredentialID FK`, `CredentialRequirementID FK`, `QuantityCompleted DECIMAL(9,2)`, `IsSatisfied BIT`, `SatisfiedAt`, `CycleStartsAt`/`CycleEndsAt DATE NULL` (for CE cycles). Unique `(CredentialID, CredentialRequirementID, CycleStartsAt)`.
- **CredentialEvidence** — uploaded proof linked to a requirement. Fields: `CredentialID FK`, `CredentialRequirementID FK NULL`, `Name`, `EvidenceKind NVARCHAR(30) CHECK IN ('Document','Transcript','ExamResult','Receipt','Attestation','Other')`, `FileID → __mj.[File] NULL` (MJ core file storage, as bizapps-common's ActivityFile does), `ExternalURL NVARCHAR(1000) NULL`, `SubmittedByPersonID → Person NULL`, `SubmittedAt`, `QuantityClaimed DECIMAL(9,2) NULL`, `ReviewStatus NVARCHAR(20) CHECK IN ('Submitted','Accepted','Rejected')`, `ReviewedByPersonID`, `ReviewedAt`, `ReviewNotes`.
- **CredentialVerification** — who verified, when, how, outcome. Fields: `CredentialID FK`, `VerifiedByPersonID → Person NULL` (null for automated/third-party), `VerificationMethod NVARCHAR(30) CHECK IN ('Manual','PrimarySource','ThirdPartyRegistry','SelfAttested')`, `VerifiedAt DATETIMEOFFSET`, `Outcome NVARCHAR(20) CHECK IN ('Verified','NotVerified','Inconclusive')`, `ProviderName NVARCHAR(200) NULL`, `ProviderReference NVARCHAR(200) NULL`, `Notes`. Designed so a later `CredentialVerificationProvider` abstraction (as bizapps-issues plans `IssueProvider`) can plug in registries without a schema change to this table.
- **CredentialActivity** — server-authoritative audit log mirroring `TaskActivity`: `CredentialID FK`, `PersonID → Person NULL`, `ActivityType NVARCHAR(50) CHECK IN ('Created','Issued','StatusChange','Renewed','Expired','Suspended','Revoked','Verified','EvidenceSubmitted','EvidenceReviewed','RequirementSatisfied','NumberChanged','ExpiryChanged')`, `PreviousValue NVARCHAR(500)`, `NewValue NVARCHAR(500)`, `Description NVARCHAR(MAX)`. Written only by the server-side entity subclass in `Save()`, never by clients.
- **CredentialType action hooks** — not a separate table: nullable `On<Event>ActionID UNIQUEIDENTIFIER → __mj.[Action](ID)` columns on `CredentialType` exactly as `TaskType` does: `OnIssueActionID`, `OnRenewActionID`, `OnRenewalDueActionID`, `OnExpireActionID`, `OnSuspendActionID`, `OnRevokeActionID`, `OnVerifyActionID`. Null means no-op. Configuration is data (an `MJ: Actions` row plus the FK), so renewal reminders and follow-up tasks are declarative. Dispatch order in the server `Save()`: capture context before write → sync `Status` from `CredentialStatus.MacroStatus` → write `CredentialActivity` → fire status `OnExit`, then `OnEnter`, then the type-level hook for the transition — the order bizapps-tasks uses.

**4. Explicit reuse decisions**
- Renewal and verification work items are `Task` records from bizapps-tasks linked via `TaskLink` (EntityID = `MJ_BizApps_Credentialing: Credentials`, RecordID = Credential.ID). No credentialing task tables. A seeded `TaskType` with `Code = 'CREDENTIAL_RENEWAL'` (and `'CREDENTIAL_VERIFICATION'`) is created by this app's metadata, referenced by code, never by GUID.
- Multi-reviewer approval of a credential application uses `TaskDecision` / `TaskDecisionOutcome` from bizapps-tasks rather than a credentialing decision table.
- Holders are `Person`; issuing bodies are `Organization`; addresses of issuing bodies come via `AddressLink`. No credentialing person or org tables. `Person.LinkedUserID` is deprecated upstream and must not be used to find "my credentials"; use the platform's Person–User subtype binding.
- Files go through MJ core file storage (`__mj.[File]`), not a credentialing blob table.
- Application and intake forms: **open question** — `bizapps-forms` is a candidate dependency for credential applications and renewal submissions. It is deliberately not declared in `mj-app.json` yet; decide when the intake workflow is designed.
- Statuses are dynamic rows (`CredentialStatus`) with a fixed `MacroStatus` enum, never a CHECK-constraint-only list, so consuming organisations add stages without a migration.

**5. Open questions for the team** (bullets, each with the trade-off in one sentence): continuing-education tracking depth (hours per cycle only, or activity-level records with provider and category); multi-tenant issuing bodies (one MJ instance certifying for several organizations, and whether `CredentialType` is scoped per Organization); public verification lookup (an unauthenticated endpoint and the token/anonymisation it needs); integration with external certification registries (pull, push, or both, and where provider credentials live); whether credential numbers are unique globally, per type, or per issuing organization; whether `bizapps-forms` becomes a hard dependency for intake; whether volunteer background checks are a `CredentialType` category or a separate clearance app.

**6. Phased build order**
1. Phase 1 — core entities and CRUD: CredentialType, CredentialStatus, CredentialRequirement, Credential, CredentialRequirementFulfillment; baseline migration; CodeGen; generated forms; seed statuses per type via metadata.
2. Phase 2 — statuses and hooks: server-side `CredentialEntityServer.Save()` with status sync, `CredentialActivity`, and `CredentialType` hook dispatch; scheduled job that moves credentials to `RenewalDue`/`Expired` and fires hooks.
3. Phase 3 — renewals via Tasks: seeded TaskTypes, TaskLink creation from hooks, "renewal due" Task generation, completion writes back to the credential.
4. Phase 4 — verification and evidence: CredentialEvidence with MJ file storage, CredentialVerification, review workflow through Tasks/TaskDecision, provider abstraction seam.
5. Phase 5 — UI: credential list, detail panel, edit panel, holder dashboard, "My Credentials"; each a standalone component emitting events; application nav items added per view.

Close with a *Conventions this design inherits* list: `${flyway:defaultSchema}` for own objects and `${mjSchema}` for core in migrations, sibling schemas literal in DDL, allow-list CodeGen scoping (`@IncludedSchemaNames='${flyway:defaultSchema}'`), hardcoded UUIDs for metadata rows, `sp_addextendedproperty` on every column, additive-only changes within a major, one changeset (≥ minor) per migration-bearing PR.

- [ ] **Step 2: Verify**

```bash
wc -l plans/credentialing-design.md
grep -c "^## " plans/credentialing-design.md
grep -n "CREATE TABLE\|@RegisterClass\|import " plans/credentialing-design.md || echo "no code in the proposal"
grep -in "poc\|proof of concept\|../credentialing" plans/credentialing-design.md || echo "no PoC references"
```
Expected: roughly 250–400 lines; six or more `##` headings; `no code in the proposal`; `no PoC references`.

---

### Task 12: README, publish checklist, CLAUDE.md

**Files:**
- Modify: `README.md` (rewrite), `CLAUDE.md` (rewrite)
- Create: `PUBLISH_SETUP.md`

- [ ] **Step 1: Write `README.md`**

Structure and exact fixed content:

```markdown
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
  <a href="plans/credentialing-design.md">Design</a> &middot;
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
> cycles — is in [`plans/credentialing-design.md`](plans/credentialing-design.md) and is
> the document to review first.
```

Then these sections, in order:
- An intro paragraph (associations and non-profits track member certifications, professional licenses, continuing-education requirements, volunteer background checks, and staff compliance training; every app reinvents the same tables; this is the thin reusable primitive layer, deliberately thin like bizapps-tasks and bizapps-issues).
- `## How It Fits` — the layer-cake diagram from the design doc §2 verbatim, plus the "Credential is the record; Tasks are the work" paragraph.
- `## Installation` — `mj app install https://github.com/MemberJunction/bizapps-credentialing` and this numbered list: 1 fetches `mj-app.json`; 2 validates MJ compatibility (`>=6.1.0-edge.5 <7.0.0`); 3 installs [BizApps Common](https://github.com/MemberJunction/bizapps-common) and [BizApps Tasks](https://github.com/MemberJunction/bizapps-tasks) if not present; 4 creates the `__mj_BizAppsCredentialing` schema; 5 runs Skyway migrations from `migrations/` (none yet); 6 installs the npm packages into the MJAPI and MJExplorer workspaces; 7 registers the server bootstrap (`@mj-biz-apps/credentialing-server`, `LoadBizAppsCredentialingServer`) in `mj.config.cjs`; 8 adds the client bootstrap (`@mj-biz-apps/credentialing-ng`) to `open-app-bootstrap.generated.ts`. Then "After installation, restart MJAPI and rebuild MJExplorer."
- `### Manage the App` — the six `mj app` commands using the manifest name `mj-bizapps-credentialing` (`list`, `info`, `upgrade`, `disable`, `enable`, `remove  # --keep-data to preserve schema`).
- `## What You Get` — `### Database Tables`: "None yet. The proposed tables and their phased build order are in the design document." `### TypeScript Packages` table with six rows (Entities, Actions, Core, Core Entities Server, Server, Angular) whose Role column says what each will hold and that every one is currently a compiling skeleton. `### Explorer` — one nav item, Overview, driven by `CredentialingOverviewResource`.
- `## Development` — summarise the linked-workspace loop: clone MJ 6.x as a lowercase `mj` sibling under a plain parent (both `CLAUDE.md`'s `@../mj/CLAUDE.md` import and the workspace tooling key off that name); `./node_modules/.bin/mj dev workspace --dir <parent>`; `status` / `doctor` / `clean`; never run an install inside a member; register in MJ's `mj.config.cjs` `dynamicPackages.server` with `PackageName: '@mj-biz-apps/credentialing-server'`, `StartupExport: 'LoadBizAppsCredentialingServer'`, `AppName: 'mj-bizapps-credentialing'`; add `@mj-biz-apps/credentialing-ng` to MJExplorer and `import '@mj-biz-apps/credentialing-ng';` to the generated bootstrap; `pnpm run mj:migrate`, `pnpm run mj:codegen`, `pnpm run build:packages`; link to `docs/template-docs/linking-to-mj.md`. Standalone build: `corepack pnpm install && corepack pnpm run build:packages` needs no database.
- `## Contributing` — feature branches cut from `next` tracking `origin/<same-name>`; PRs target `next`; a migration-bearing PR must include a changeset with at least a `minor` bump (`pnpm exec changeset`); `version.yml` maintains the Version Packages PR on `next`; a `next → main` release PR triggers `publish.yml`; never hand-edit a version; links to `docs/template-docs/branching.md` and `publishing.md`; first-publish steps in `PUBLISH_SETUP.md`.
- `## Repository Structure` — a tree naming `mj-app.json`, `mj.config.cjs`, `packages/{Entities,Actions,Core,CoreEntitiesServer,Server,Angular}` with npm names, `migrations/`, `metadata/`, `plans/`, `docs/`.
- `## License` — "Business Source License 1.1 — see [LICENSE](./LICENSE) for details."

- [ ] **Step 2: Write `PUBLISH_SETUP.md`**

```markdown
# Publishing Setup — bizapps-credentialing

This repo publishes the six `@mj-biz-apps/credentialing-*` packages to npm through a
Changesets pipeline inherited from `open-app-template`. The workflows, validator scripts,
`ci/` helpers, and Changesets config are in place; the steps below are the one-time,
human-only setup that no workflow can do for itself.

## Branch model

```
feature branch ──PR──▶ next ──(Version Packages PR, version.yml)──▶ next
                                       │
                          release PR next → main ──(push triggers publish.yml)──▶ npm + tag
```

- PRs land on **`next`**. `build.yml` and `changes.yml` run as checks. A migration-bearing
  PR must carry a changeset with at least a `minor` bump (`changes.yml` enforces this).
- `version.yml` turns the changesets on `next` into a reviewable **"Version Packages"**
  PR: package bumps, CHANGELOGs, `mj-app.json` `version` + `mjVersionRange`, refreshed
  lockfile. Under the default `GITHUB_TOKEN` its checks wait for **Approve and run**.
- Releasing = one PR **`next` → `main`**; `release-readiness.yml` refuses pending
  changesets and a patch bump that carries migrations. The push to `main` runs
  `publish.yml`: validate → build → `changeset publish` → tag `vX.Y.Z`. It writes to no branch.
- **Not automated:** the `mj-bizapps-common` and `mj-bizapps-tasks` version ranges in
  `mj-app.json` are hand-maintained. Bump them in the same PR that bumps
  `@mj-biz-apps/common-entities` / `@mj-biz-apps/tasks-entities` in `packages/Core/package.json`.

## Repository and branches

- [ ] Create the GitHub repository `MemberJunction/bizapps-credentialing` (empty, no README).
- [ ] `git remote add origin https://github.com/MemberJunction/bizapps-credentialing.git`
- [ ] `git push -u origin main` then `git push -u origin next`
- [ ] Settings → General → Default branch → **`next`**
- [ ] (Recommended) Rulesets requiring pull requests on `main` and `next`; required checks
      `build-only`, `changes_and_migrations` on `next`, `release-readiness` on `main`.

## npm authentication — OIDC trusted publishing (no `NPM_TOKEN`)

`publish.yml` declares `id-token: write`; npm verifies the GitHub Actions OIDC identity
at publish time. There is no secret to create or rotate. Trusted publishing is configured
per package and only after the package exists, so it pairs with the placeholder publish.

## First publish — `0.0.0` placeholders

Every package ships at `0.0.0` and none exists on npm yet; `validate-npm-packages.sh`
fails the publish job until they all do. From a signed-in `npm login` (an `@mj-biz-apps`
org owner), after `corepack pnpm run build:packages`, run `npm publish --access public`
in each package directory:

- [ ] `@mj-biz-apps/credentialing-entities` (`packages/Entities`)
- [ ] `@mj-biz-apps/credentialing-actions` (`packages/Actions`)
- [ ] `@mj-biz-apps/credentialing-core` (`packages/Core`)
- [ ] `@mj-biz-apps/credentialing-core-entities-server` (`packages/CoreEntitiesServer`)
- [ ] `@mj-biz-apps/credentialing-server` (`packages/Server`)
- [ ] `@mj-biz-apps/credentialing-ng` (`packages/Angular`)

Then on npmjs.com for **each** package: Settings → Trusted Publisher → GitHub Actions →
organization `MemberJunction`, repository `bizapps-credentialing`, workflow **`publish.yml`**.

- [ ] Trusted Publisher configured on all six packages
- [ ] `bash .github/scripts/validate-npm-packages.sh` passes locally

## First release

- [ ] Land the first domain migration on `next` with a `minor` changeset — the release flow
      takes the packages from `0.0.0` to `0.1.0` with a real changelog. Do not set a version by hand.
- [ ] Merge the Version Packages PR, open `Release v0.1.0` (`next` → `main`), merge, confirm
      the workflow run, the `v0.1.0` tag, and the six packages on npm.

## Local development

- [ ] Clone MemberJunction 6.x as a lowercase `mj` sibling of this repo and link with
      `./node_modules/.bin/mj dev workspace --dir <parent>` (`docs/template-docs/linking-to-mj.md`).
```

- [ ] **Step 3: Write `CLAUDE.md`**

Keep the template's structure and rules, with these substitutions: title `# BizApps Credentialing — development guide`; remove the `TODO(template)` sentence; keep the two `@`-import lines and the lowercase-`mj` warning verbatim; in the repository-structure block list `packages/Entities` (`@mj-biz-apps/credentialing-entities`), `Actions`, `Core` (`@mj-biz-apps/credentialing-core` — shared services; may import Common/Tasks entities), `CoreEntitiesServer`, `Server`, `Angular` (`@mj-biz-apps/credentialing-ng`), plus `plans/credentialing-design.md — the proposed domain model`; keep the `docs/claude/` table and the six "rules that matter most" verbatim; add a seventh rule: `7. **Dependency schemas are read-only** — __mj_BizAppsCommon and __mj_BizAppsTasks belong to their apps; this repo never generates, migrates, or alters them (mj.config.cjs excludeSchemas + entityImportPackages).`; in the build commands replace `@mj-sample-app/ng` with `@mj-biz-apps/credentialing-ng`.

- [ ] **Step 4: Verify links and leftovers**

```bash
for f in README.md PUBLISH_SETUP.md plans/credentialing-design.md CLAUDE.md metadata/README.md; do
  for l in $(grep -oE '\]\(([^)#]+)' "$f" | sed 's/](//' | grep -v '^http'); do
    [ -e "$(dirname "$f")/$l" ] || [ -e "$l" ] || echo "BROKEN in $f: $l"; done; done; echo "link check done"
grep -in "sample" README.md CLAUDE.md PUBLISH_SETUP.md || echo "no 'sample' in the three docs"
grep -n "TODO(template)\|<Your App>" CLAUDE.md README.md || echo "no template placeholders"
```
Expected: `link check done` with no `BROKEN` lines; `no 'sample' in the three docs`; `no template placeholders`.

---

### Task 13: CHECKPOINT 2 — scaffold notes, then stop

**Files:**
- Create: `plans/scaffold-notes.md`

- [ ] **Step 1: Run the full verification battery one more time**

```bash
corepack pnpm install --frozen-lockfile 2>&1 | tail -2
corepack pnpm run build:packages 2>&1 | tail -3
grep -rn "sample-app\|sample_app\|Sample App\|SampleApp\|mj-sample-app\|MjBizapps" --exclude-dir=node_modules --exclude-dir=_reference --exclude-dir=.git --exclude=init-template.mjs . || echo "ZERO HITS"
bash .github/scripts/validate-package-repository.sh | tail -1
bash .github/scripts/validate-package-files.sh | tail -1
bash .github/scripts/validate-package-lock-case.sh | tail -1
bash .github/scripts/validate-migration-filenames.sh | tail -1
node -e "JSON.parse(require('fs').readFileSync('mj-app.json','utf8'))" && echo "manifest ok"
```
Expected: frozen install succeeds (lockfile in sync), `Tasks: 6 successful, 6 total`, `ZERO HITS`, four success lines, `manifest ok`.

- [ ] **Step 2: Write `plans/scaffold-notes.md`**

Sections, in this order, with real content drawn from `_reference/NOTES.md`:
1. `## File tree` — output of `tree -a -I 'node_modules|.git|_reference|dist|.turbo' -L 3 .` trimmed so `packages/` shows one level.
2. `## Final mj-app.json` — the file verbatim in a fenced block.
3. `## Init command` — the exact Task 2 Step 2 command, followed by the hand-fixes applied afterwards (Pascal rename, selector, prefix colon, publish guard, application record name).
4. `## Decisions` — the D1–D16 table from Checkpoint 1 with a "What was done" column; note the human accepted all sixteen as recommended and that `../credentialing` was ruled out of scope.
5. `## Where the references disagreed` — the seven bullets from Checkpoint 1 and how each was resolved.
6. `## Remaining human steps` — copied from `PUBLISH_SETUP.md`: create the repo, push `main` and `next`, set `next` default, publish placeholders, configure Trusted Publisher, link an MJ checkout with `mj dev workspace`.
7. `## Not completed, and why` — no baseline migration and no changeset (D5/D6, by decision); `validate-npm-packages.sh` not run locally (packages unpublished); `docs/template-docs/` prose still says "sample" in places describing the template's own history; the local `../mj` checkout is MJ 2.119 and cannot host a linked workspace until updated to 6.x.
8. `## Generated identifiers` — SchemaInfo UUID, Applications UUID, the two Application Roles UUIDs.

- [ ] **Step 3: Show the state and stop**

```bash
git add -A && git status --short | wc -l && git status --short | grep -E '_reference|SETUP_TASK' || echo "scaffold-only files not staged"
tree -a -I 'node_modules|.git|_reference|dist|.turbo' -L 2 .
```
Present `plans/scaffold-notes.md`, the status count, and the tree in chat. **Stop and wait for explicit approval. Do not start Task 14.**

---

### Task 14: Cleanup, single commit, branches

Only after Checkpoint 2 approval.

- [ ] **Step 1: Remove the scaffold-only artifacts and their ignore lines**

```bash
rm -rf _reference
rm -f SETUP_TASK.md
sed -i '' '/^# Scaffold-only/d; /^_reference\/$/d; /^SETUP_TASK.md$/d' .gitignore
sed -i '' '1{/^$/d;}' .gitignore
head -3 .gitignore
```
Expected: the file now starts with `# CodeGen scratch output`.

- [ ] **Step 2: Confirm ignore coverage and a clean build from the committed set**

```bash
grep -n "^node_modules/$\|^dist/$\|^\.turbo/$\|^\.angular/$\|^migrations/codegen/$" .gitignore
git add -A
git status --short | grep -E 'node_modules|/dist/|\.turbo' || echo "no build output staged"
git status --short | wc -l
```
Expected: five matching ignore lines; `no build output staged`; a count equal to the tracked file total.

- [ ] **Step 3: Commit on `main`**

```bash
git branch --show-current
git commit -q -m "Initial scaffold of bizapps-credentialing from open-app-template

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01YC9k896bvT6VKSDLnZTg8H"
git log --oneline
```
Expected: `main`; exactly one commit line.

- [ ] **Step 4: Create `next` and stay on it**

```bash
git checkout -b next
git branch
git status --short | wc -l
ls -a | grep -E '_reference|SETUP_TASK' || echo "clean"
```
Expected: `  main` and `* next`; `0`; `clean`.

- [ ] **Step 5: Print the final summary in chat**

Paste `plans/scaffold-notes.md` in full as the closing message, preceded by one line stating the commit hash, the branches, and that nothing was pushed.

---

## Self-review

**Spec coverage.** Phase 0/1: done before this plan. Phase 2 → Tasks 1–2. Phase 3 → Tasks 3–5 (manifest, package repository URLs, dependency placement, validators). Phase 4 → Task 6 (schema-info mechanism per D2/D3/D4; baseline migration and changeset intentionally omitted per D5/D6, recorded in Task 13 §7). Phase 5 → Task 9 (per D16: no empty entities/entity-relationships folders). Phase 6 → Task 10. Phase 7 → Task 11. Phase 8 → Tasks 8 and 12 (README, PUBLISH_SETUP, CLAUDE.md, template-docs kept, TEMPLATE-SPEC kept per D15). Checkpoint 2 → Task 13. Phase 9 → Task 14. CI upgrades per D10 → Task 7. Core package per D7 → Task 4. MJ baseline per D14 → Task 3.

**Placeholder scan.** No TBD/TODO steps. Task 11 and Task 12 Step 1/3 specify content by section with exact fixed strings and complete enumerations rather than full prose; the executor writes the prose to that specification. Every command is runnable as written.

**Type and name consistency.** `CredentialingOverviewResource` (class and DriverClass) appears identically in Tasks 9, 10, 12. `LoadCredentialingOverviewResource`, `LoadBizAppsCredentialingClient`, `LoadBizAppsCredentialingServer`, `LoadBizAppsCredentialingEntitiesServer`, `LoadBizAppsCredentialingActions` match across Tasks 2, 5, 10, 12. Package names match across Tasks 4, 5, 12. Six build tasks expected from Task 4 onward, five before it.
