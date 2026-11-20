import {
    Assert,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';

const checks: NamedCheck[] = [
    {
        Id: 'cred-schema.1',
        Name: 'all seven entities are registered',
        Fn: async (ctx: IntegrationCheckContext) => {
            for (const name of Object.values(CredentialingEntity)) {
                Assert(ctx.Provider.EntityByName(name) != null, `entity registered: ${name}`);
            }
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
