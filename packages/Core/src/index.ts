/**
 * @mj-biz-apps/credentialing-core — shared code for BizApps Credentialing, usable on both server and
 * client. It must never import server-only packages.
 *
 * - `entity-names` — the entity name constants.
 * - `rules/` — the pure ruling classes the server entity subclasses enforce.
 * - `operations/` — the contracts (key, input and output types) of the remote operations that write
 *   several records as one unit of work. A browser and server code call them the same way; the server
 *   bodies live in @mj-biz-apps/credentialing-core-entities-server.
 *
 * The functional requirements and domain model are in plans/active/credentialing-frd.md.
 */
export * from './entity-names.js';
export * from './rules/RuleResult.js';
export * from './rules/VersionLifecycleRules.js';
export * from './rules/VersionSettingsRules.js';
export * from './rules/StandardAuthoringRules.js';
export * from './rules/ProgramRules.js';
export * from './operations/OperationKeys.js';
export * from './operations/CreateProgramOperation.js';
export * from './operations/CloneVersionToDraftOperation.js';
export * from './operations/ReorderVersionTreeOperation.js';
export * from './operations/CreateOrganizationOperation.js';
