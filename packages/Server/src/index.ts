/**
 * @mj-biz-apps/credentialing-server — the SERVER BOOTSTRAP package for BizApps Credentialing.
 *
 * Named in mj-app.json under packages.server with role "bootstrap". At startup MJAPI
 * dynamically imports this package and calls LoadBizAppsCredentialingServer(). That call,
 * plus the imports below, fires every @RegisterClass decorator in the app's server-side
 * packages — entities, server-side entity subclasses, actions, and (after CodeGen)
 * GraphQL resolvers.
 *
 * WHAT LIVES HERE
 *   src/generated/  — CodeGen GraphQLServer output (resolvers; never hand-edited).
 *                     After the first codegen run add `export * from './generated/generated';`
 *                     and export RESOLVER_PATHS as bizapps-issues and bizapps-tasks do.
 *   src/            — hand-written resolvers, event handlers, scheduled jobs
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Side-effect imports fire @RegisterClass in the shared packages.
import '@mj-biz-apps/credentialing-entities';
import '@mj-biz-apps/credentialing-core';

import { LoadBizAppsCredentialingActions } from '@mj-biz-apps/credentialing-actions';

// Server-side entity subclasses register at priority 2 and must load after the
// client-shared entities so their overrides win.
import { LoadBizAppsCredentialingEntitiesServer } from '@mj-biz-apps/credentialing-core-entities-server';
import type { ServerExtensionConfig } from '@memberjunction/server-extensions-core';
import { RegisterCredentialingServices } from './services/register.js';
import { EVIDENCE_EXTENSION_DRIVER_CLASS, EvidenceRouteExtension } from './evidence/EvidenceRouteExtension.js';
import { LocalDiskFileStorage } from './storage/LocalDiskFileStorage.js';

export * from './generated/generated.js';
export { MagicLinkInvitationIssuer } from './invitations/MagicLinkInvitationIssuer.js';
export { RegisterCredentialingServices } from './services/register.js';
export {
    EVIDENCE_EXTENSION_DRIVER_CLASS,
    EVIDENCE_STORAGE_ACCOUNT_ENV,
    EvidenceRouteExtension,
    ReadBoundedBody,
    ResolveEvidenceRouteSettings,
    STORAGE_SETUP_HINT,
} from './evidence/EvidenceRouteExtension.js';
export {
    DOWNLOAD_FAILED_REASON,
    EvidenceRoutes,
    SIGN_IN_REQUIRED_REASON,
    STORAGE_NOT_CONFIGURED_REASON,
    UPLOAD_FAILED_REASON,
    type EvidenceRouteSettings,
    type HttpReply,
    type UploadBody,
    type UploadQuery,
} from './evidence/EvidenceRoutes.js';
export { StorageEvidenceStore } from './evidence/StorageEvidenceStore.js';
export { WorkerTextExtractor, MAX_EXTRACTED_CHARACTERS, EXTRACTION_TIME_LIMIT_MS, EXTRACTION_HEAP_LIMIT_MB, TEXT_NOTE } from './evidence/WorkerTextExtractor.js';
export { LocalDiskFileStorage, LOCAL_DISK_STORAGE_DRIVER_KEY, LOCAL_DISK_PRODUCTION_REASON } from './storage/LocalDiskFileStorage.js';
export { CouldNotRunReason, FailedRunResult, MJStoredPromptRunner, type StoredPromptRequest, type StoredPromptRun, type StoredPromptRunner } from './reading/PromptRunner.js';
export { CountMarkedPages, IsEmptyTranscription, MAX_RECOGNIZED_CHARACTERS, NOT_A_SCAN_REASON, PromptTextRecognizer, SCAN_READER_PROMPT } from './reading/PromptTextRecognizer.js';
export {
    EVIDENCE_READER_PROMPT,
    ParseReaderAnswer,
    PromptEvidenceReader,
    SINGLE_READ_CHARACTERS,
    TextWindows,
    WINDOW_CHARACTERS,
    WINDOW_OVERLAP_CHARACTERS,
    WindowNote,
    type TextWindow,
} from './reading/PromptEvidenceReader.js';
export { BOOT_SWEEP_DELAY_MS, StartBackgroundReading, StopBackgroundReading } from './reading/background.js';

/**
 * The server extensions this package publishes; MJAPI reads this export from every installed Open
 * App server package (`mj/packages/ServerBootstrap/src/index.ts`, `collectServerExtensions`) and
 * mounts each entry with no host configuration. A host may overlay an entry by `DriverClass` in its
 * `mj.config.cjs` `serverExtensions[]` (for example to set `Settings.EvidenceStorageAccountName`, or
 * `Enabled: false`).
 */
export const MJ_SERVER_EXTENSIONS: ServerExtensionConfig[] = [
    { Enabled: true, DriverClass: EVIDENCE_EXTENSION_DRIVER_CLASS, RootPath: '/credentialing', Phase: 'post-auth', Settings: {} },
];

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Resolver paths for TypeGraphQL schema building.
 * Includes the CodeGen-generated entity resolvers so MJAPI loads them at startup.
 */
export const RESOLVER_PATHS: string[] = [resolve(__dirname, 'generated/*.js')];

/**
 * Bootstrap function named by mj-app.json packages.server[0].startupExport and called by
 * MJ's DynamicPackageLoader. Chains the sub-package anchors so one call registers everything.
 */
export function LoadBizAppsCredentialingServer(): void {
    LoadBizAppsCredentialingEntitiesServer();
    LoadBizAppsCredentialingActions();
    RegisterCredentialingServices();
    // Anti-tree-shaking: the evidence extension and the development storage driver register through
    // @RegisterClass, which runs only when their modules are part of the bundle.
    if (EvidenceRouteExtension == null || LocalDiskFileStorage == null) {
        throw new Error('credentialing server extension or storage driver missing');
    }
}
