# Publishing Setup — bizapps-credentialing

This repo publishes the six `@mj-biz-apps/credentialing-*` packages to npm through a
Changesets pipeline inherited from `open-app-template`. The workflows, validator scripts,
`ci/` helpers, and Changesets config are in place; the steps below are the one-time,
human-only setup that no workflow can do for itself.

## Branch model

This repo follows release lines (`guides/RELEASE_LINES.md`):

```
feature ──PR──▶ next ──backport label──▶ lts/6.2 ──(App opens Version Packages PR)──▶ main ──(publish.yml)──▶ npm
```

- `next` is built on MJ Edge and **never versions or publishes**. PRs land there first, with a
  changeset (`pnpm run change`). A migration or `metadata/` change needs at least a **`minor`**
  changeset (`migration changeset` check).
- A `backport lts/X.Y` label on the PR into `next` makes `backport.yml` open the cherry-pick PR
  into that line once it merges. The changeset travels with it.
- Every push to a line runs `version.yml`, which refreshes that line's **Version Packages PR**,
  opened by the `blue-cypress-ci-bot` App. It runs `pnpm run version:prepare`: `changeset
  version`, the `mj-app.json` version and MJ range sync (`ci/sync-mj-app-version.mjs`), and a
  lockfile refresh.
  - The newest line (`releasesThrough: main` in `release-lines.json`): `changeset-release/main`
    → `main`. Publishes as `latest`; afterwards the App opens and merges a
    `release-back-merge/vX.Y.Z` PR into the line.
  - An older line (`releasesThrough: branch`): `changeset-release/lts/X.Y` → `lts/X.Y`.
    Publishes under the dist-tag `lts-X.Y`; no back-merge.
- **Merging that PR is the release** (`Cut the Release` dispatch, `line` input empty for the
  newest line). `release-readiness.yml` gates it (`rr:` checks: no pending changesets, bump
  level, metadata shipped, Postgres counterparts, release base current, migration immutability,
  packages on npm). `publish.yml` publishes over npm OIDC under the line's dist-tag, tags
  `vX.Y.Z`, verifies the dist-tag, and opens a PR into `next` removing the changesets it released.
- There is no hand-opened PR into `main`, and nothing commits to `main` directly.

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
