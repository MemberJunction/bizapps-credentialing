---
"@mj-biz-apps/credentialing-entities": minor
"@mj-biz-apps/credentialing-core-entities-server": patch
"@mj-biz-apps/credentialing-ng": patch
"@mj-biz-apps/credentialing-server": patch
---

Add `CredentialingEngineBase` (`@RegisterForStartup`, `BaseEngine`) caching bounded reference metadata (`Accrediting Organizations`, `Programs`, `Program Versions`) with active `ProviderToUse`, `CacheLocal: false`, and per-entity `CanRead` gating; wire Program Studio and Pipeline to reuse it; collapse unbatched server `RunView` waterfalls into `rv.RunViews([...])` while preserving all isolation invariants; document the 5-Rule BizApps Performance & Caching Standard in `CLAUDE.md`, `AGENTS.md`, and `docs/claude/04-performance.md`.
