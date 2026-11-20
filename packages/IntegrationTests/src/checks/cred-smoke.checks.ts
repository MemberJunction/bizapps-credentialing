import {
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import { FindRows } from '../wire.js';

const checks: NamedCheck[] = [
    {
        Id: 'cred-smoke.1',
        Name: 'schema is registered',
        Fn: async (ctx: IntegrationCheckContext) => {
            const rows = await FindRows<{ ID: string }>(
                ctx,
                'MJ: Schema Info',
                `SchemaName = '__mj_BizAppsCredentialing'`,
                ['ID'],
            );
            AssertEqual(rows.length, 1, 'one SchemaInfo row');
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
