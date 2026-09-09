# Plans & Architecture Documentation

This directory contains design documents, RFCs, and implementation plans for `bizapps-credentialing`.

## Directory Structure

```
plans/
├── README.md       # This guide and lifecycle policy
├── active/         # Current proposals, active RFCs, and plans under development
├── completed/      # Shipped implementation plans whose code is merged
└── archive/        # Historical setup notes, bootstrap reports, and superseded designs
```

| Subdirectory | Purpose |
|---|---|
| `active/` | Ongoing designs and proposals under review or active implementation. The source of truth for upcoming schema, entities, and features. |
| `completed/` | Successfully executed implementation plans (e.g. scaffolding, major feature phases) preserved for historical context. |
| `archive/` | Bootstrap notes, exploratory spikes, or superseded proposals that are retained for reference but no longer active. |

---

## Plan Lifecycle & Moving Files

1. **Drafting / In Progress:** New plans start in `plans/active/<name>.md`.
2. **Implementation:** When an implementation starts, the plan remains in `plans/active/`.
3. **Completion:** When the plan is fully executed, merged, and verified, move it to `plans/completed/<name>.md`.

---

> [!CAUTION]
> ### Mandatory Rule: Avoid Broken Links When Moving Plans
> Moving or renaming a plan file breaks relative and absolute markdown links, documentation cross-references, and code docstrings.
>
> **Whenever you move or rename a file in `plans/`, you MUST search the repository and update all references before committing:**
>
> ```bash
> # 1. Search for any references to the old filename across the repo
> git grep "plans/<old-filename>"
>
> # 2. Verify all references have been updated to the new path
> git grep "plans/active/<new-filename>"
> ```
>
> Typical locations that link to plans include:
> - `README.md` (Design badges, links, and overview sections)
> - `CLAUDE.md` (Domain model pointers and project guide)
> - `packages/*/src/**` (TypeScript package header comments and component docstrings)
> - `metadata/README.md` (Metadata directory guides)
> - `docs/**` (Template and architectural documentation)
