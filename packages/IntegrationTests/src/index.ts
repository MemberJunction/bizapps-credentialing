import '@mj-biz-apps/credentialing-entities';
import '@mj-biz-apps/credentialing-core';
import { LoadBizAppsCredentialingEntitiesServer } from '@mj-biz-apps/credentialing-core-entities-server';

LoadBizAppsCredentialingEntitiesServer();

export * from './wire.js';
export * from './world/world.js';
export * from './world/load-world.js';
export * from './checks/cred-smoke.checks.js';

export function LoadCredentialingIntegrationTests(): void {}
