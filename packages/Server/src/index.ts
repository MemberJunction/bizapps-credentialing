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

// Side-effect imports fire @RegisterClass in the shared packages.
import '@mj-biz-apps/credentialing-entities';
import '@mj-biz-apps/credentialing-core';

import { LoadBizAppsCredentialingActions } from '@mj-biz-apps/credentialing-actions';

// Server-side entity subclasses register at priority 2 and must load after the
// client-shared entities so their overrides win.
import { LoadBizAppsCredentialingEntitiesServer } from '@mj-biz-apps/credentialing-core-entities-server';

/**
 * Bootstrap function named by mj-app.json packages.server[0].startupExport and called by
 * MJ's DynamicPackageLoader. Chains the sub-package anchors so one call registers everything.
 */
export function LoadBizAppsCredentialingServer(): void {
    LoadBizAppsCredentialingEntitiesServer();
    LoadBizAppsCredentialingActions();
}
