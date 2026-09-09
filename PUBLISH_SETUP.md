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
