/**
 * @mj-biz-apps/credentialing-entities — the ENTITY package for BizApps Credentialing.
 *
 * WHAT WILL LIVE HERE
 *   src/generated/entity_subclasses.ts — written by MemberJunction CodeGen
 *   (`pnpm run mj:codegen` at the repo root): one strongly-typed BaseEntity subclass
 *   plus zod schema per table in __mj_BizAppsCredentialing, named with the
 *   `MJ_BizApps_Credentialing: ` prefix. Committed generated code is the source of
 *   truth consumers install; CodeGen on a clean branch is a no-op.
 *   src/custom/ — hand-written entity subclasses shared by server and client
 *   (client-safe validation, computed helpers). Never edit src/generated/.
 *
 * @memberjunction/core and @memberjunction/global are PEER dependencies: exactly one
 * copy of each may exist in a host process (docs/template-docs/versioning-and-peer-deps.md).
 *
 * No tables exist yet — the model is specified in plans/active/credentialing-frd.md.
 */
export * from './generated/entity_subclasses';
