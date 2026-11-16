/**
 * Client-transport dispatcher for BizApps Credentialing.
 * GraphQLDataProvider → MJAPI. No SQL pool.
 *
 *   node test-harnesses/integration.mjs
 *   node test-harnesses/integration.mjs cred-smoke
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '..', '.env'), quiet: true });
dotenv.config({ path: path.resolve(here, '../../mj/.env'), quiet: true });

process.env.MJ_INTEGRATION_TEST = '1';
process.env.RUN_MUTATION_TESTS = process.env.RUN_MUTATION_TESTS ?? '1';

const ALL_BUNDLES = [
    'cred-smoke',
];

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('-'));

const { bootstrapIntegrationClient } = await import('@memberjunction/testing-integration/client');
const { Metadata } = await import('@memberjunction/core');
const { IntegrationCheckRegistry } = await import('@memberjunction/testing-integration/registry');

await bootstrapIntegrationClient();
await import('../packages/IntegrationTests/dist/index.js');

const provider = Metadata.Provider;
const user = provider.CurrentUser;
if (!user) throw new Error('GraphQL provider has no CurrentUser — check MJ_API_KEY and MJAPI.');

const ctx = { User: user, Provider: provider, Schema: process.env.MJ_CORE_SCHEMA || '__mj', Storage: undefined };
const registry = IntegrationCheckRegistry.Instance;
const requested = only.length ? only : ALL_BUNDLES;
let pass = 0;
let fail = 0;

console.log(`\n  Credentialing integration (GraphQL → ${process.env.MJAPI_URL ?? `http://localhost:${process.env.GRAPHQL_PORT ?? 4000}`})\n`);

for (const request of requested) {
    const [bundle, localId] = request.includes('.') ? request.split('.') : [request, null];
    const checks = registry.GetBundle(bundle).filter((c) => !localId || c.Id === request);
    if (checks.length === 0) {
        console.error(`  unknown: ${request}`);
        fail += 1;
        continue;
    }
    for (const check of checks) {
        const started = Date.now();
        try {
            await check.Fn(ctx);
            console.log(`  ok   ${check.Id.padEnd(32)} ${Date.now() - started}ms  ${check.Name}`);
            pass += 1;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`  FAIL ${check.Id.padEnd(32)} ${Date.now() - started}ms  ${message}`);
            if (process.env.IT_VERBOSE === '1' && err instanceof Error) console.error(err.stack);
            fail += 1;
        }
    }
}

console.log(`\n  ${pass} passed / ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
