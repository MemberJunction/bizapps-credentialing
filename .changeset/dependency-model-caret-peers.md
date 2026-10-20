---
"@mj-biz-apps/credentialing-actions": patch
"@mj-biz-apps/credentialing-core": patch
"@mj-biz-apps/credentialing-core-entities-server": patch
"@mj-biz-apps/credentialing-entities": patch
"@mj-biz-apps/credentialing-ng": patch
"@mj-biz-apps/credentialing-server": patch
---

MemberJunction and other BizApps packages are peer dependencies with caret ranges (nothing in `dependencies`), so a host keeps one copy of each. `credentialing-core`'s `common-entities` and `tasks-entities` moved from `dependencies` to `peerDependencies`; every such peer has an exact `devDependencies` anchor for local builds. Adds `check-dependency-model` to CI.
