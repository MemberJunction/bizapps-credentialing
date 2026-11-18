import { DatabaseProviderBase, Metadata } from '@memberjunction/core';
import { LoadGeneratedEntities as LoadCommonEntities } from '@mj-biz-apps/common-entities';
import { LoadGeneratedEntities as LoadCommitteesEntities } from '@mj-biz-apps/committees-entities';
import '@mj-biz-apps/credentialing-entities';
import '@mj-biz-apps/credentialing-core';
import {
    CredentialingServices,
    LoadBizAppsCredentialingEntitiesServer,
    OperationWrite,
    SystemUser,
} from '@mj-biz-apps/credentialing-core-entities-server';
import { SetApplicantWorldWriter } from './world/applicant-world.js';

LoadCommonEntities();
LoadCommitteesEntities();
LoadBizAppsCredentialingEntitiesServer();
// Registers isolated provider creation directly against Metadata.Provider (matching CreateIsolatedProvider)
// so mj test run exercises real isolated providers without pulling MJServer's top-level LoadConfig() into Vitest.
CredentialingServices.Register({
    Providers: {
        Create: async () => {
            if (!(Metadata.Provider instanceof DatabaseProviderBase)) {
                throw new Error('Expected DatabaseProviderBase for isolated provider creation.');
            }
            return Metadata.Provider.CreateIndependentInstance();
        },
        Release: async (provider) => {
            if (provider instanceof DatabaseProviderBase) {
                await provider.ReleaseIndependentInstance();
            }
        },
    },
});
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
export * from './world/FixtureReading.js';
export * from './checks/cred-smoke.checks.js';
export * from './checks/cred-schema.checks.js';
export * from './checks/cred-applicant-schema.checks.js';
export * from './checks/cred-version-rules.checks.js';
export * from './checks/cred-standard-rules.checks.js';
export * from './checks/cred-operations.checks.js';
export * from './checks/cred-isolation.checks.js';
export * from './checks/cred-world.checks.js';
export * from './checks/cred-applicant-world.checks.js';
export * from './checks/cred-subject-isolation.checks.js';
export * from './checks/cred-invite.checks.js';
export * from './checks/cred-responses.checks.js';
export * from './checks/cred-evidence-rules.checks.js';
export * from './checks/cred-reader.checks.js';
export * from './checks/cred-prefill.checks.js';
export * from './checks/cred-submission.checks.js';

export function LoadCredentialingIntegrationTests(): void {}
