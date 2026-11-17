import { DatabaseProviderBase } from '@memberjunction/core';
import { CredentialingServices } from '@mj-biz-apps/credentialing-core-entities-server';
import { MagicLinkInvitationIssuer } from '../invitations/MagicLinkInvitationIssuer.js';

/**
 * Registers the server-side implementations (`@memberjunction/server`, magic-link service, storage,
 * parsing, AI, notifications) into {@link CredentialingServices}. Called at server startup from
 * `LoadBizAppsCredentialingServer()`.
 */
export function RegisterCredentialingServices(): void {
    CredentialingServices.Register({
        Providers: {
            // Dynamic import keeps importing @mj-biz-apps/credentialing-server safe in unit tests
            // where MJServer's top-level LoadConfig() has no mj.config.cjs.
            Create: async () => {
                const { CreateIsolatedProvider } = await import('@memberjunction/server');
                return CreateIsolatedProvider();
            },
            Release: async (provider) => {
                if (provider instanceof DatabaseProviderBase) {
                    await provider.ReleaseIndependentInstance();
                }
            },
        },
        Invitations: new MagicLinkInvitationIssuer(),
    });
}
