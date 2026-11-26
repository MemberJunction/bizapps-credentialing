# BizApps Credentialing — Agent Development Guide

This file complements [`CLAUDE.md`](CLAUDE.md) for coding agents operating in `MemberJunction/bizapps-credentialing`. Read [`CLAUDE.md`](CLAUDE.md), [`docs/claude/04-performance.md`](docs/claude/04-performance.md), and [`docs/isolation-read-paths.md`](docs/isolation-read-paths.md) before modifying code.

## Non-Negotiable Coding Standards

1. **Strong typing only**: Zero `any`, zero lazy `unknown`, zero `record.Get()` / `record.Set()` for generated entity fields. Derive union types from generated entity classes (`mjBizAppsCredentialingProgramEntity['Status']`).
2. **Singletons & startup**: Always extend `BaseSingleton<T>` or `BaseEngine<T>` (`@memberjunction/core` / `@memberjunction/global`) — never hand-roll `static _instance`. Register startup engines with `@RegisterForStartup({ deferred: true, severity: 'warn' })` and retain a tree-shaking anchor in client/server bootstraps.
3. **Modern Angular**: Standalone components for leaf widgets, `@if` / `@for` / `@switch` control flow, `inject()` for DI, `this.ProviderToUse` for all data access.
4. **No cross-package re-exports**: Each package exports only what it defines. Consumers import types and classes directly from their defining package.
5. **Never edit generated code or protected CI files**: Never hand-edit `src/generated/` or `ci/protect.mjs` protected files. Never edit applied migrations.
6. **Git & PR hygiene**: Stage files explicitly (`git add <file>`), never commit directly to `next` or `main`, and merge PRs with standard merge commits (`gh pr merge --merge`, never `--squash`).

## 5-Rule BizApps Performance & Caching Standard

Full details and code examples live in [`docs/claude/04-performance.md`](docs/claude/04-performance.md):

1. **`BaseEngine` Taxonomy & Config Caching** — Read bounded org/program metadata (`Accrediting Organizations`, `Programs`, `Program Versions`) from `CredentialingEngineBase.Instance` (`@mj-biz-apps/credentialing-entities`). It uses `@RegisterForStartup({ deferred: true })`, per-entity `CanRead` permission gating (Staff loads all 3; Admin loads `Accrediting Organizations` only; Applicant/Reviewer/Committee skip with 0 `RunView`s), and `ObserveProperty` / `AutoRefresh` auto-invalidation. Never cache unbounded applicant/transactional entities (`Subjects`, `Applications`, `Standard Responses`, `Evidence Documents`, `Extractions`, etc.) or per-version trees (`Sections`, `Standards`, `Document Requirements`, `Response Sources`) in a global `BaseEngine`.
2. **Multi-Provider, Impersonation & RLS `CacheLocal` Safety** — Always pass the active provider (`RunView.FromMetadataProvider(provider)`, `CredentialingEngineBase.Instance.Config(forceRefresh, contextUser, provider)`). Never call bare `new RunView()`. Set `CacheLocal: false` on every RLS-scoped entity config, override active `ProviderToUse`, and clear/re-`Config` whenever the provider or signed-in persona changes (`ClearCache()`).
3. **`rv.RunViews([...])` Batching** — Collapse `Promise.all([rv.RunView(...), ...])` and independent sequential `await rv.RunView(...)` waterfalls into a single `rv.RunViews([...])` call. Use `ResultType: 'simple'`, explicit `Fields`, and `SkipTotalRowCount: true` whenever entity mutation is not required; reserve `ResultType: 'entity_object'` for writes. Never run concurrent queries via `Promise.all` on a single SQL Server transaction connection.
4. **Bounded Container Caches vs. NO Arbitrary Filtered List Caching** — Cache bounded per-container state (`StandingService` per-user standing, open `ProgramBundle` in Program Studio, active application workspace) with explicit invalidation on mutation. Never cache arbitrary filtered search/list queries (e.g. Pipeline filter combinations, document libraries) in global singletons.
5. **RLS-Safe Two-Step Entity Reads** — Strictly preserve [`docs/isolation-read-paths.md`](docs/isolation-read-paths.md): always execute caller-scoped reads first (`SubjectAccess`, `ParentVersionLoader`) so platform RLS admits the owned row before any narrow `SystemUser.Get` lookup of authoring metadata by admitted IDs. Never bypass RLS, never expose raw `SystemUser` entities to clients, and keep foreign/missing ID refusals identical (`Record not found.`).

## Verification Commands

```sh
pnpm run build:packages
pnpm run test
node ./.github/scripts/check-dependency-model.mjs
```
