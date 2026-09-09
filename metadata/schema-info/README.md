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
