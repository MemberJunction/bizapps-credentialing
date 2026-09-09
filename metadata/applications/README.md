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
