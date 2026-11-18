# schema-info

Registers this app's schema reserved ID range and description in
`__mj.SchemaInfo`.

`.schema-info.json` is **already activated** for `__mj_BizAppsCredentialing`
(IDs `10000001`–`10099999`). Because `mj migrate --schema` runs
`spUpdateSchemaInfoFromDatabase` and inserts the `__mj.SchemaInfo` row with an
auto-generated ID first, `primaryKey.ID` uses the natural-key lookup
`@lookup:MJ: Schema Info.SchemaName=__mj_BizAppsCredentialing`. Do not commit any
`sync` block written back by `mj sync push`.

The entity name prefix (`MJ_BizApps_Credentialing: `) lives in `mj.config.cjs`
`newEntityDefaults.NameRulesBySchema` only and is intentionally omitted from
`.schema-info.json`: `__mj.SchemaInfo.EntityNamePrefix` holds at most 25
characters, while `MJ_BizApps_Credentialing: ` is 26 characters, and CodeGen
reads `NameRulesBySchema` first. Full guide:
[`docs/template-docs/metadata.md`](../../docs/template-docs/metadata.md) § Schema registration.
