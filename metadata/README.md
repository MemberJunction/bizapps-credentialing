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
