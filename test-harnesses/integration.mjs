/**
 * Client-transport dispatcher for BizApps Credentialing.
 * GraphQLDataProvider → MJAPI. No SQL pool.
 *
 *   node test-harnesses/integration.mjs
 *   node test-harnesses/integration.mjs cred-smoke
 *
 * Browser fidelity: this process loads only what a browser client loads. It imports the
 * server-free client bootstrap and the CLIENT entity classes, then each requested bundle's own
 * module through the package's `./checks/*` subpath — never the package barrel, which registers
 * the server entity subclasses (`@mj-biz-apps/credentialing-core-entities-server`) and would make
 * every "client" check exercise server code a browser never has
 * (mj/packages/TestingFramework/testing-integration/src/registry.ts, B32).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '..', '.env'), quiet: true });
dotenv.config({ path: path.resolve(here, '../../mj/.env'), quiet: true });

process.env.MJ_INTEGRATION_TEST = '1';
process.env.RUN_MUTATION_TESTS = process.env.RUN_MUTATION_TESTS ?? '1';

/** Bundles that run on this transport. */
const ALL_BUNDLES = [
    'cred-smoke',
    'cred-schema',
    'cred-operations-wire',
    'cred-invite-wire',
    'cred-world',
    'cred-users',
    'cred-evidence',
];

/** Bundles registered inside another bundle's `.checks.js` module. */
const BUNDLE_MODULES = {
    'cred-users': 'cred-world',
};

/**
 * Bundles that need the server transport (`mj test run`): they use the server entity subclasses'
 * own seams and separate provider instances (CreateIndependentInstance) for their concurrency checks.
 */
const SERVER_ONLY_BUNDLES = {
    'cred-version-rules': 'CRD-02 - Version rules',
    'cred-standard-rules': 'CRD-03 - Standard rules',
    'cred-operations': 'CRD-04 - Operations',
    'cred-isolation': 'CRD-05 - Isolation',
    'cred-invite': 'CRD-09 - Invitations',
    'cred-evidence-rules': 'CRD-11 - Evidence',
    'cred-reader': 'CRD-12 - Reader',
};

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('-'));

const { bootstrapIntegrationClient } = await import('@memberjunction/testing-integration/client');
const { Metadata } = await import('@memberjunction/core');
const { IntegrationCheckRegistry } = await import('@memberjunction/testing-integration/registry');

await bootstrapIntegrationClient();
// The client entity classes, as Explorer loads them (by path: the repo root does not depend on the package).
await import('../packages/Entities/dist/index.js');

const requested = only.length ? only : ALL_BUNDLES;
const bundleNames = [...new Set(requested.map((r) => r.split('.')[0]))];
const moduleNames = [...new Set(
    bundleNames
        .filter((bundle) => !(bundle in SERVER_ONLY_BUNDLES) && ALL_BUNDLES.includes(bundle))
        .map((bundle) => BUNDLE_MODULES[bundle] ?? bundle),
)];
for (const moduleName of moduleNames) {
    await import(`../packages/IntegrationTests/dist/checks/${moduleName}.checks.js`);
}

const provider = Metadata.Provider;
const user = provider.CurrentUser;
if (!user) throw new Error('GraphQL provider has no CurrentUser — check MJ_API_KEY and MJAPI.');

const ctx = { User: user, Provider: provider, Schema: process.env.MJ_CORE_SCHEMA || '__mj', Storage: undefined };
const registry = IntegrationCheckRegistry.Instance;
let pass = 0;
let fail = 0;

console.log(`\n  Credentialing integration (GraphQL → ${process.env.MJAPI_URL ?? `http://localhost:${process.env.GRAPHQL_PORT ?? 4000}`})\n`);

for (const request of requested) {
    const [bundle, localId] = request.includes('.') ? request.split('.') : [request, null];
    if (bundle in SERVER_ONLY_BUNDLES) {
        console.error(`  server-only: ${request} — run it with: mj test run --name "${SERVER_ONLY_BUNDLES[bundle]}"`);
        fail += 1;
        continue;
    }
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
