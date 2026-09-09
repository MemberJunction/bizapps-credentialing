# Repository setup — branches, defaults, and services

## 1. Create the repository

1. Create a new GitHub repository from this template (or clone + re-init).
2. Push the initial commit to `main`.
3. Create `next` from `main` and **make `next` the default branch**
   (GitHub → Settings → General → Default branch). All feature PRs target
   `next`; `main` is only touched by release PRs.

```sh
git checkout -b next
git push -u origin next
# then set next as default in GitHub settings
```

## 2. Why two branches?

- **`next`** — integration. Feature work merges here; CI (`build.yml`,
  `changes.yml`) gates every PR. Changesets accumulate here between releases.
- **`main`** — release. A push to `main` triggers `publish.yml`, which validates,
  builds, publishes to npm, and tags. Versioning happens earlier, in the
  "Version Packages" PR that `version.yml` maintains on `next`.

Full flow: [branching.md](branching.md) and [publishing.md](publishing.md).

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

## 4. Services to connect

| Service | What to set up | Doc |
|---|---|---|
| npm | Own the org/scope; publish a `0.0.0` placeholder for each package (a package must exist before it can be configured, and CI refuses to publish until they all do); configure **Trusted Publisher** per package | [publishing.md](publishing.md) § first publish bootstrap |
| GitHub Actions | Ships enabled; workflows live in `.github/workflows/` | [publishing.md](publishing.md) |
| GitHub Releases | The publish workflow tags `vX.Y.Z`; `mj app install` resolves versions from these tags | [publishing.md](publishing.md) |

## 5. Local prerequisites

Node ≥ 18 and pnpm ≥ 10 (`corepack pnpm --version`; this repo and MJ 6.x are pnpm monorepos). A SQL Server database is only needed once you develop
schema/metadata against a MemberJunction instance — see
[linking-to-mj.md](linking-to-mj.md) for exactly when.
