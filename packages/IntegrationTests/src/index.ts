import { LoadGeneratedEntities as LoadCommonEntities } from '@mj-biz-apps/common-entities';
import { LoadGeneratedEntities as LoadCommitteesEntities } from '@mj-biz-apps/committees-entities';
import '@mj-biz-apps/credentialing-entities';
import '@mj-biz-apps/credentialing-core';
import { LoadBizAppsCredentialingEntitiesServer, OperationWrite, SystemUser } from '@mj-biz-apps/credentialing-core-entities-server';
import { SetApplicantWorldWriter } from './world/applicant-world.js';

LoadCommonEntities();
LoadCommitteesEntities();
LoadBizAppsCredentialingEntitiesServer();
// The server process (mj test run) writes the applicant world through the operation-only path, as the
// system user. The client harness never imports this barrel, so it only finds that world.
SetApplicantWorldWriter({
    WriterUser: () => SystemUser.Get('Writing the applicant world'),
    Run: (provider, work) => OperationWrite.Run(provider, work),
});

export * from './wire.js';
export * from './actors.js';
export * from './world/world.js';
export * from './world/program-tree.js';
export * from './world/placeholder-organization-program.js';
export * from './world/load-world.js';
export * from './world/applicant-world.js';
export * from './checks/cred-smoke.checks.js';
export * from './checks/cred-schema.checks.js';
export * from './checks/cred-applicant-schema.checks.js';
export * from './checks/cred-version-rules.checks.js';
export * from './checks/cred-standard-rules.checks.js';
export * from './checks/cred-operations.checks.js';
export * from './checks/cred-isolation.checks.js';
export * from './checks/cred-world.checks.js';
export * from './checks/cred-subject-isolation.checks.js';

export function LoadCredentialingIntegrationTests(): void {}
