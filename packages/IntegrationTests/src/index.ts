import { LoadGeneratedEntities as LoadCommonEntities } from '@mj-biz-apps/common-entities';
import { LoadGeneratedEntities as LoadCommitteesEntities } from '@mj-biz-apps/committees-entities';
import '@mj-biz-apps/credentialing-entities';
import '@mj-biz-apps/credentialing-core';
import { LoadBizAppsCredentialingEntitiesServer } from '@mj-biz-apps/credentialing-core-entities-server';

LoadCommonEntities();
LoadCommitteesEntities();
LoadBizAppsCredentialingEntitiesServer();

export * from './wire.js';
export * from './actors.js';
export * from './world/world.js';
export * from './world/program-tree.js';
export * from './world/load-world.js';
export * from './checks/cred-smoke.checks.js';
export * from './checks/cred-schema.checks.js';
export * from './checks/cred-version-rules.checks.js';
export * from './checks/cred-standard-rules.checks.js';
export * from './checks/cred-operations.checks.js';

export function LoadCredentialingIntegrationTests(): void {}
