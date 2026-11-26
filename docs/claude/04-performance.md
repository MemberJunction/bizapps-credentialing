# 4 · Performance & Caching Standard

All BizApps Credentialing client and server code follows the **5-Rule BizApps Performance & Caching Standard** below. Every rule works hand-in-hand with the tenant/subject isolation invariants in [`docs/isolation-read-paths.md`](../isolation-read-paths.md).

---

## Rule 1 · `BaseEngine` Taxonomy & Config Caching

Use `CredentialingEngineBase.Instance` (`@mj-biz-apps/credentialing-entities`) for the bounded org/program reference catalog — **never** re-query these tables per widget or per tab switch when the engine cache is already warm:

| Tier | Entities | Where Cached |
|---|---|---|
| **Bounded reference catalog** | `Accrediting Organizations`, `Programs`, `Program Versions` | `CredentialingEngineBase` (`@RegisterForStartup({ deferred: true, severity: 'warn' })`) |
| **Per-version authoring trees** | `Sections`, `Standards`, `Document Requirements`, `Response Sources` | Loaded per `ProgramVersionID` in batched `RunViews` (`StudioData.LoadProgram`, `GetApplicationWorkspace`, `GetDocumentLibrary`); never bulk-loaded globally (carry long text columns) |
| **Membership / security** | `Organization Memberships` | Targeted RLS-filtered reads (`StandingService`, `SubjectAccess.ActorFor`) |
| **Unbounded applicant / transactional data** | `Subjects`, `Subject Contacts`, `Applications`, `Standard Responses`, `Response Citations`, `Evidence Documents`, `Document Attestations`, `Application Documents`, `Extractions` | **NEVER** cached in a global `BaseEngine` (unbounded, PII/evidence bytes & `ExtractedText`, subject-scoped RLS) |

- **Entry-point contract**: Always call `await CredentialingEngineBase.Instance.Config(false, contextUser, provider)` before reading `.AccreditingOrganizations`, `.Programs`, or `.ProgramVersions`. Pass `forceRefresh = true` after server-side remote operations (`CreateProgram`, `CloneVersionToDraft`, `CreateOrganization`) or on tab re-entry refreshes.
- **Per-entity `CanRead` gating**: `CredentialingEngineBase` checks `EntityInfo.GetUserPermisions(user).CanRead` per entity before calling `Load(...)`:
  - `Credentialing Staff` loads all three (platform RLS scopes rows to their organizations).
  - `Credentialing Admin` loads `Accrediting Organizations` only (`Programs` and `ProgramVersions` remain `[]`, zero errors).
  - `Credentialing Applicant`, `Credentialing Reviewer`, and `Credentialing Committee` execute **zero** `RunView` calls and never throw at startup.
- **Reactive updates**: Subscribe to `CredentialingEngineBase.Instance.ObserveProperty<T>(CREDENTIALING_ENGINE_PROPERTIES.Programs)` (auto-re-emits on local `BaseEntity` save/delete events via `AutoRefresh: true`) instead of polling loops.

---

## Rule 2 · Multi-Provider, Impersonation & RLS `CacheLocal` Safety

- **Never call bare `new RunView()`** when a provider is available. Always bind to the active provider via `RunView.FromMetadataProvider(provider)` (or `this.ProviderToUse` in Angular components, `LockedWrite.ProviderOf(this)` in entity servers, and `Metadata.Provider` in process-level services like `EngineStaffNotifier`).
- **Always set `CacheLocal: false` on RLS-scoped entities.** Every entity in `CredentialingEngineBase` carries row-level security filters for `Credentialing Staff`. Local IndexedDB/browser caching (`CacheLocal: true`) is forbidden on RLS-scoped entities because cached rows must never leak across persona switches, impersonation, or org membership changes.
- **Active `ProviderToUse` & persona switch invalidation**: `CredentialingEngineBase` overrides `ProviderToUse` to track the most recently passed provider instead of pinning forever to the first provider. Switching `provider` or changing the effective user ID automatically clears all backing arrays and forces a fresh RLS-filtered load. Call `CredentialingEngineBase.Instance.ClearCache()` (and `StandingService.ClearCache()`) on sign-out or persona switch.

---

## Rule 3 · `rv.RunViews([...])` Batching & `simple` Projections

Collapse every `Promise.all([rv.RunView(...), ...])` and every set of independent sequential `await rv.RunView(...)` calls sharing the same `contextUser` into a **single `rv.RunViews([...])` batch**:

```typescript
// ✅ GOOD — single batched round trip with narrow read-only projections
const [versionRes, siblingsRes] = await RunView.FromMetadataProvider(provider).RunViews<
    LoadedVersion | SiblingRow
>(
    [
        ParentVersionLoader.VersionParams(versionID),
        {
            EntityName: CredentialingEntity.Section,
            ExtraFilter: `ProgramVersionID = '${versionID}'`,
            Fields: ['ID', 'Number'],
            ResultType: 'simple',
            SkipTotalRowCount: true,
        },
    ],
    user,
);
```

- **Transaction safety**: Inside a SQL Server transaction (`RunInEntityTransaction` / `OperationWrite.Run`), never run concurrent queries via `Promise.all` against the same transaction connection — combine same-user reads into one `RunViews([...])` call instead.
- **`entity_object` vs `simple`**:

| Use | When | Notes |
|---|---|---|
| `ResultType: 'entity_object'` | You will **mutate and save/delete** the records | Full `BaseEntity` instances. `Fields` is ignored (all columns load so saves are whole) |
| `ResultType: 'simple'` + `Fields: [...]` + `SkipTotalRowCount: true` | Read/display/validation checks | Plain objects, minimal payload, skips large text columns (`ExtractedText`, `ResponseText`, `Statement`) and omits unused `COUNT(*)` queries |

Anti-pattern: loading `entity_object` just to read `.ID` or `.Status`, or running `RunView` inside a `for` loop.

---

## Rule 4 · Bounded Container Caches vs. NO Arbitrary Filtered List Caching

- **Allowed — bounded per-container caches** (the `ConversationEngine` pattern):
  - Per-user session standing (`StandingService`, keyed by `UserID`, explicitly cleared on `Reload()` / `ClearCache()`).
  - The currently open program bundle in Program Studio (`StudioData.LoadProgram`, reloaded on version/standard writes; committees alone refreshed after `CreateCommittee`).
  - The currently open application workspace / submission gate in Standards Runner or Pipeline detail drawer.
- **Forbidden — arbitrary filtered list caches in global singletons**:
  - Never store unbounded or arbitrarily filtered search/list results (e.g., Pipeline filtered by status/program, subject document libraries, extraction lists) in a global singleton map.
  - Load them fresh per screen/action in a single batched `RunViews([...])` with `ResultType: 'simple'` and client-side or keyset pagination (`PIPELINE_PAGE_SIZE = 50`).

---

## Rule 5 · RLS-Safe Two-Step Entity Reads

Every read path must obey [`docs/isolation-read-paths.md`](../isolation-read-paths.md):

1. **Step 1 (caller-scoped gate first)**: Load the caller-owned row(s) **as the caller** (`SubjectAccess.Application`, `SubjectAccess.Response`, `SubjectAccess.Document`, `ParentVersionLoader`, `StandingService`). Platform RLS filters (`Credentialing: Applicant Subjects`, `Credentialing: Staff Rows By Subject`, etc.) run on every view in the batch. If nothing loads, refuse immediately with the identical `NOT_FOUND_REASON` (`Record not found.`) — indistinguishable from a nonexistent UUID.
2. **Step 2 (narrow `SystemUser` read only after admission)**: Only *after* Step 1 has admitted the caller's row may server code read authoring metadata the caller lacks permission on (`Program`, `ProgramVersion`, `Section`, `Standard`, `DocumentRequirement`, `ResponseSource`) via `SystemUser.Get(purpose)`, filtered strictly to the admitted IDs and batched in one `RunViews([...])` call.
3. **Never bypass RLS**: Never return raw `SystemUser` entities directly to the client (project only safe read-model DTOs), never attach unfiltered `MJ: Query Permissions` to credentialing roles, and never use client-side subqueries against RLS-filtered views (`StudioData` passes literal ID lists from Step 1 into Step 2).

---

## Deep Pagination — Keyset, Not Offset

Background jobs iterating an entity (such as sweeps or backfill tasks) must use `RunViewParams.AfterKey` (keyset/seek — O(log N) per page at any depth), not `StartRow` (which re-scans skipped rows):

```typescript
let last: CompositeKey | undefined;
while (true) {
    const r = await RunView.FromMetadataProvider(provider).RunView<MyEntity>(
        { EntityName: 'X', AfterKey: last, MaxRows: 500, ResultType: 'entity_object' },
        user,
    );
    if (!r.Success || r.Results.length === 0) break;
    /* process */
    if (r.Results.length < 500) break;
    last = CompositeKey.FromID(r.Results[r.Results.length - 1].ID);
}
```

## MJ's Deep-Dive Guides

- [`guides/CACHING_AND_PUBSUB_GUIDE.md`](https://github.com/MemberJunction/MJ/blob/next/guides/CACHING_AND_PUBSUB_GUIDE.md) — full caching + pub/sub doctrine
- [`guides/KEYSET_PAGINATION_GUIDE.md`](https://github.com/MemberJunction/MJ/blob/next/guides/KEYSET_PAGINATION_GUIDE.md) — pagination that stays fast at depth
- [`guides/LAZY_LOADING_GUIDE.md`](https://github.com/MemberJunction/MJ/blob/next/guides/LAZY_LOADING_GUIDE.md) — deferring work until it is needed
- [`guides/RECORD_SET_PROCESSING_GUIDE.md`](https://github.com/MemberJunction/MJ/blob/next/guides/RECORD_SET_PROCESSING_GUIDE.md) — bulk processing patterns
