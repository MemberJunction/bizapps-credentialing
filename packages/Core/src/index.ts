/**
 * @mj-biz-apps/credentialing-core — shared services for BizApps Credentialing.
 *
 * WHAT WILL LIVE HERE
 *   Engines and services that run on both server and client: credential
 *   lifecycle orchestration, renewal scheduling that spawns BizApps Tasks
 *   records, requirement evaluation, and the typed helpers UI packages call.
 *   This package may import entity classes from @mj-biz-apps/credentialing-entities,
 *   @mj-biz-apps/common-entities (People, Organizations) and
 *   @mj-biz-apps/tasks-entities (Tasks, Task Links) — it must never import
 *   server-only packages.
 *
 * Nothing is implemented yet. The domain model is proposed in
 * plans/active/credentialing-design.md; code lands with the first schema migration.
 */
export {};
