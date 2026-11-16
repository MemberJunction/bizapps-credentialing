/**
 * `cred-operations-wire` — the credentialing remote operations over the CLIENT transport: the shared
 * contract classes of `@mj-biz-apps/credentialing-core`, called exactly as a browser calls them, sent
 * over GraphQL to the running MJAPI, which dispatches to the server classes.
 *
 * The harness's own session is the system API key (MJAPI's `System` user). Checks that need a signed-in
 * person open a second GraphQL session with a JWT from MJAPI's local dev login (`POST /auth/dev-login`,
 * localhost only), the way Explorer signs in on a dev instance.
 *
 * Precondition: the world exists and MJAPI's user cache holds its users' roles — run
 * `CRD-04 - Operations` on the server transport once, then restart MJAPI (docs/dev-instance.md).
 */
import { randomUUID } from 'node:crypto';
import type { IMetadataProvider, RemoteOpResult } from '@memberjunction/core';
import type { MJUserEntity } from '@memberjunction/core-entities';
import { GetGlobalObjectStore } from '@memberjunction/global';
import { GraphQLDataProvider, GraphQLProviderConfigData } from '@memberjunction/graphql-dataprovider';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import {
    CreateOrganizationOperation,
    CreateProgramOperation,
    CredentialingEntity,
    type CreateProgramInput,
} from '@mj-biz-apps/credentialing-core';
import { CountRows, FindRows, Quote, RequireSave } from '../wire.js';

const ORG_A_NAME = 'Sample Accrediting Body A';
const OPERATIONS_STAFF_EMAIL = 'operations.staff@example.test';
const ADMIN_EMAIL = 'admin@example.test';
const STAFF_ROLE = 'Credentialing Staff';
const BLANK_LABEL_SENTENCE = 'Enter a label for this version.';
const GRAPHQL_PROVIDER_SINGLETON_KEY = '___SINGLETON__GraphQLDataProvider';

/** The body `POST /auth/dev-login` answers with. */
interface DevLoginResponse {
    success?: boolean;
    token?: string;
    error?: string;
    user?: { email?: string; roles?: string[] };
}

function runHex(): string {
    return randomUUID().replace(/-/g, '').slice(0, 8);
}

/** The harness's GraphQL provider; these checks run only on the client transport. */
function harnessProvider(ctx: IntegrationCheckContext): GraphQLDataProvider {
    if (!(ctx.Provider instanceof GraphQLDataProvider)) {
        throw new Error('cred-operations-wire runs on the client transport: node test-harnesses/integration.mjs cred-operations-wire');
    }
    return ctx.Provider;
}

/** Signs in as `email` through MJAPI's local dev login and returns the answer (token and the roles MJAPI's user cache holds). */
async function devLogin(ctx: IntegrationCheckContext, email: string): Promise<DevLoginResponse & { token: string }> {
    const url = new URL('/auth/dev-login', harnessProvider(ctx).ConfigData.URL);
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const body = (await response.json()) as DevLoginResponse;
    const token = body.token;
    if (!response.ok || token == null) {
        throw new Error(`dev login as ${email} failed (${response.status}): ${body.error ?? 'no token'}`);
    }
    return { ...body, token };
}

/** A second GraphQLDataProvider. It is a singleton, so the global slot is parked around construction (MJ's own wire checks do the same). */
function newSecondaryProvider(): GraphQLDataProvider {
    const store = GetGlobalObjectStore();
    const singleton = store?.[GRAPHQL_PROVIDER_SINGLETON_KEY];
    if (store) {
        delete store[GRAPHQL_PROVIDER_SINGLETON_KEY];
    }
    try {
        return new GraphQLDataProvider();
    } finally {
        if (store) {
            store[GRAPHQL_PROVIDER_SINGLETON_KEY] = singleton;
        }
    }
}

/** A separate GraphQL session signed in as `email`, as a browser of that user would be. */
async function openSession(ctx: IntegrationCheckContext, email: string): Promise<GraphQLDataProvider> {
    const login = await devLogin(ctx, email);
    const session = newSecondaryProvider();
    const config = new GraphQLProviderConfigData(
        login.token,
        harnessProvider(ctx).ConfigData.URL,
        '',
        async () => (await devLogin(ctx, email)).token,
        '__mj',
    );
    const ok = await session.Config(config, undefined, true);
    Assert(ok, `the GraphQL session as ${email} configured`);
    return session;
}

/** OrgA's ID, which the server-transport run created. */
async function orgAID(ctx: IntegrationCheckContext): Promise<string> {
    const rows = await FindRows<{ ID: string }>(ctx, CredentialingEntity.AccreditingOrganization, `Name = '${Quote(ORG_A_NAME)}'`, ['ID']);
    Assert(rows.length === 1, `${ORG_A_NAME} exists (run CRD-04 - Operations on the server transport first)`);
    return rows[0].ID;
}

function programInput(organizationID: string, label: string): CreateProgramInput {
    const hex = runHex();
    return {
        AccreditingOrganizationID: organizationID,
        Name: `Wire ${hex}`,
        ProgramType: 'Certification',
        SubjectType: 'Person',
        SubjectNoun: 'professional',
        CredentialPrefix: `W${hex.toUpperCase()}`,
        Description: null,
        FirstVersionLabel: label,
    };
}

function programsNamed(ctx: IntegrationCheckContext, organizationID: string, name: string): Promise<number> {
    return CountRows(ctx, CredentialingEntity.Program, `AccreditingOrganizationID = '${Quote(organizationID)}' AND Name = '${Quote(name)}'`);
}

function describe<T>(result: RemoteOpResult<T>): string {
    return `${result.Success ? 'Success' : 'Failure'} ${result.ResultCode ?? ''}: ${result.ErrorMessage ?? ''}`;
}

/** Creates an active user through the harness session (MJAPI's System user). */
async function createUser(ctx: IntegrationCheckContext, email: string): Promise<string> {
    const user = await ctx.Provider.GetEntityObject<MJUserEntity>('MJ: Users', ctx.User);
    user.NewRecord();
    user.Name = email;
    user.Email = email;
    user.FirstName = 'Wire';
    user.LastName = 'Staff';
    user.Type = 'User';
    user.IsActive = true;
    await RequireSave(user, `user ${email}`);
    return user.ID;
}

async function withSession<T>(ctx: IntegrationCheckContext, email: string, work: (session: IMetadataProvider) => Promise<T>): Promise<T> {
    const session = await openSession(ctx, email);
    try {
        return await work(session);
    } finally {
        session.DisposeWebSocketResources();
    }
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-operations-wire.1',
        Name: 'over GraphQL, a caller without the credentialing roles is refused with FORBIDDEN and nothing is written',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const organizationID = await orgAID(ctx);
            const input = programInput(organizationID, '2027');
            const program = await new CreateProgramOperation().Execute(input);
            Assert(!program.Success, `CreateProgram as the System user is refused (${describe(program)})`);
            AssertEqual(program.ResultCode, 'FORBIDDEN', 'CreateProgram ResultCode');
            AssertEqual(await programsNamed(ctx, organizationID, input.Name), 0, 'programs with the name');

            const name = `Wire Body ${runHex()}`;
            const organization = await new CreateOrganizationOperation().Execute({ Name: name, FirstStaffEmail: OPERATIONS_STAFF_EMAIL });
            Assert(!organization.Success, `CreateOrganization as the System user is refused (${describe(organization)})`);
            AssertEqual(organization.ResultCode, 'FORBIDDEN', 'CreateOrganization ResultCode');
            AssertEqual(await CountRows(ctx, CredentialingEntity.AccreditingOrganization, `Name = '${Quote(name)}'`), 0, 'accrediting organizations with the name');
        },
    },
    {
        Id: 'cred-operations-wire.2',
        Name: 'over GraphQL, staff create a program with its Draft; a refused unit of work reaches the browser as REFUSED and leaves no row',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const organizationID = await orgAID(ctx);
            await withSession(ctx, OPERATIONS_STAFF_EMAIL, async (session) => {
                const input = programInput(organizationID, '2027');
                const created = await new CreateProgramOperation().Execute(input, { provider: session });
                Assert(created.Success && created.Output != null, `CreateProgram as staff over GraphQL succeeds (${describe(created)})`);
                const versions = await FindRows<{ ID: string; Label: string; Status: string }>(
                    ctx,
                    CredentialingEntity.ProgramVersion,
                    `ProgramID = '${Quote(created.Output.ProgramID)}'`,
                    ['ID', 'Label', 'Status'],
                );
                AssertEqual(versions.length, 1, 'versions of the new program');
                AssertEqual(versions[0].ID.toLowerCase(), created.Output.VersionID.toLowerCase(), 'the version returned');
                AssertEqual(`${versions[0].Label} ${versions[0].Status}`, '2027 Draft', 'its label and status');

                const blank = programInput(organizationID, ' ');
                const refused = await new CreateProgramOperation().Execute(blank, { provider: session });
                Assert(!refused.Success, `CreateProgram with a blank label is refused (${describe(refused)})`);
                AssertEqual(refused.ResultCode, 'REFUSED', 'ResultCode');
                AssertEqual(refused.ErrorMessage, BLANK_LABEL_SENTENCE, 'ErrorMessage carries the guard sentence');
                AssertEqual(await programsNamed(ctx, organizationID, blank.Name), 0, 'program rows (rolled back)');
            });
        },
    },
    {
        Id: 'cred-operations-wire.3',
        Name: 'over GraphQL, an admin sets up an organization and the new staff member signs in holding the staff role at once',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const hex = runHex();
            const email = `wire.staff.${hex}@example.test`;
            const userID = await createUser(ctx, email);
            const name = `Wire Body ${hex}`;
            const output = await withSession(ctx, ADMIN_EMAIL, async (session) => {
                const result = await new CreateOrganizationOperation().Execute({ Name: name, FirstStaffEmail: email }, { provider: session });
                Assert(result.Success && result.Output != null, `CreateOrganization as the admin over GraphQL succeeds (${describe(result)})`);
                return result.Output;
            });
            // Straight after the call returns: MJAPI's user cache must already hold the new grant.
            const login = await devLogin(ctx, email);
            Assert((login.user?.roles ?? []).includes(STAFF_ROLE), `the new staff member's sign-in carries ${STAFF_ROLE} (roles: ${(login.user?.roles ?? []).join(', ')})`);
            AssertEqual(output.StaffUserID.toLowerCase(), userID.toLowerCase(), 'the staff member is the user with the email');
            AssertEqual(await CountRows(ctx, CredentialingEntity.AccreditingOrganization, `Name = '${Quote(name)}'`), 1, 'accrediting organizations with the name');
            AssertEqual(
                await CountRows(ctx, CredentialingEntity.OrganizationMembership, `ID = '${Quote(output.MembershipID)}' AND UserID = '${Quote(userID)}'`),
                1,
                'the membership returned',
            );
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
