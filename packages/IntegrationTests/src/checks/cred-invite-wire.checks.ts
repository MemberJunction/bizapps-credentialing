/**
 * `cred-invite-wire` — live MJAPI / client-transport checks for `Credentialing.InviteApplicant`
 * (plan Task 4, checks 7, 8 and 10).
 *
 * Precondition: the world exists and MJAPI's user cache holds its users' roles (`CRD-06 - World`
 * run on the server transport, then MJAPI restarted if users were freshly seeded).
 */
import { randomUUID } from 'node:crypto';
import type { IMetadataProvider, RemoteOpResult } from '@memberjunction/core';
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
    CREDENTIALING_APPLICANT_ROLE,
    CredentialingEntity,
    InviteApplicantOperation,
    type InviteApplicantOutput,
} from '@mj-biz-apps/credentialing-core';
import { CountRows, FindRows, Quote } from '../wire.js';

const STAFF_A_EMAIL = 'staff.a@example.test';
const STAFF_B_EMAIL = 'staff.b@example.test';
const PROGRAM_A_NAME = 'Sample Applicant Program';
const PROGRAM_B_NAME = 'Sample Program B Applicants';
const CREDENTIALING_APPLICATION = 'Credentialing';
const USERS_ENTITY = 'MJ: Users';
const MAGIC_LINK_INVITES_ENTITY = 'MJ: Magic Link Invites';
const GRAPHQL_PROVIDER_SINGLETON_KEY = '___SINGLETON__GraphQLDataProvider';

interface DevLoginResponse {
    success?: boolean;
    token?: string;
    error?: string;
}

interface RedeemResponse {
    success?: boolean;
    token?: string;
    email?: string;
    error?: string;
    errorCode?: string;
}

function runHex(): string {
    return randomUUID().replace(/-/g, '').slice(0, 8);
}

function describe<T>(result: RemoteOpResult<T>): string {
    return `${result.Success ? 'Success' : 'Failure'} ${result.ResultCode ?? ''}: ${result.ErrorMessage ?? ''}`;
}

function harnessProvider(ctx: IntegrationCheckContext): GraphQLDataProvider {
    if (!(ctx.Provider instanceof GraphQLDataProvider)) {
        throw new Error('cred-invite-wire runs on the client transport: node test-harnesses/integration.mjs cred-invite-wire');
    }
    return ctx.Provider;
}

async function devLogin(ctx: IntegrationCheckContext, email: string): Promise<string> {
    const url = new URL('/auth/dev-login', harnessProvider(ctx).ConfigData.URL);
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
    const body = (await response.json()) as DevLoginResponse;
    if (!response.ok || body.token == null) {
        throw new Error(`dev login as ${email} failed (${response.status}): ${body.error ?? 'no token'}`);
    }
    return body.token;
}

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

async function openTokenSession(ctx: IntegrationCheckContext, token: string, refresh: () => Promise<string>): Promise<GraphQLDataProvider> {
    const session = newSecondaryProvider();
    const config = new GraphQLProviderConfigData(token, harnessProvider(ctx).ConfigData.URL, '', refresh, '__mj');
    const ok = await session.Config(config, undefined, true);
    Assert(ok, 'GraphQL session configured');
    return session;
}

async function withStaffSession<T>(ctx: IntegrationCheckContext, email: string, work: (session: IMetadataProvider) => Promise<T>): Promise<T> {
    const token = await devLogin(ctx, email);
    const session = await openTokenSession(ctx, token, () => devLogin(ctx, email));
    try {
        return await work(session);
    } finally {
        session.DisposeWebSocketResources();
    }
}

async function activeVersionIDOf(ctx: IntegrationCheckContext, programName: string): Promise<string> {
    const programs = await FindRows<{ ID: string }>(ctx, CredentialingEntity.Program, `Name = '${Quote(programName)}'`, ['ID']);
    AssertEqual(programs.length, 1, `program '${programName}' exists (run CRD-06 - World first)`);
    const versions = await FindRows<{ ID: string }>(
        ctx,
        CredentialingEntity.ProgramVersion,
        `ProgramID = '${Quote(programs[0].ID)}' AND Status = 'Active'`,
        ['ID'],
    );
    Assert(versions.length > 0, `program '${programName}' has an Active version`);
    return versions[0].ID;
}

let lastWireInviteEmail: string | null = null;

const checks: NamedCheck[] = [
    {
        Id: 'cred-invite-wire.7',
        Name: 'over GraphQL, staff-a invites an applicant and the returned link redeems to a session whose user is the contact',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const hex = runHex();
            const versionID = await activeVersionIDOf(ctx, PROGRAM_A_NAME);
            const email = `wire.applicant.${hex}@example.test`;

            const output: InviteApplicantOutput = await withStaffSession(ctx, STAFF_A_EMAIL, async (session) => {
                const res = await new InviteApplicantOperation().Execute(
                    {
                        ProgramVersionID: versionID,
                        Subject: { DisplayName: `Wire Applicant ${hex}`, PrimaryEmail: email },
                        Contact: { Email: email, FirstName: 'Wire', LastName: `Applicant${hex}` },
                    },
                    { provider: session },
                );
                Assert(res.Success && res.Output != null, `InviteApplicant over GraphQL succeeds (${describe(res)})`);
                return res.Output;
            });

            lastWireInviteEmail = email;
            Assert(output.InvitationUrl != null, `InvitationUrl returned (note: ${output.InvitationNote ?? 'none'})`);
            const rawToken = new URL(output.InvitationUrl).searchParams.get('token');
            Assert(rawToken != null, 'InvitationUrl carries a token query param');

            const redeemUrl = new URL('/magic-link/redeem?format=json', harnessProvider(ctx).ConfigData.URL);
            const redeemResp = await fetch(redeemUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: rawToken }),
            });
            const redeemBody = (await redeemResp.json()) as RedeemResponse;
            Assert(redeemResp.ok && redeemBody.success && redeemBody.token != null, `redeem succeeds: ${redeemBody.error ?? redeemResp.status}`);
            AssertEqual((redeemBody.email ?? '').toLowerCase(), email.toLowerCase(), 'redeemed email matches contact');

            const redeemedSession = await openTokenSession(ctx, redeemBody.token, async () => redeemBody.token!);
            try {
                AssertEqual((redeemedSession.CurrentUser?.Email ?? '').toLowerCase(), email.toLowerCase(), 'redeemed GraphQL CurrentUser is the contact');
            } finally {
                redeemedSession.DisposeWebSocketResources();
            }
        },
    },
    {
        Id: 'cred-invite-wire.8',
        Name: 'the MJ: Magic Link Invites row issued by InviteApplicant has role Credentialing Applicant and application Credentialing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            Assert(lastWireInviteEmail != null, 'cred-invite-wire.7 ran and recorded an invite email');
            const invites = await FindRows<{ Email: string; Role: string; Application: string; Status: string }>(
                ctx,
                MAGIC_LINK_INVITES_ENTITY,
                `LOWER(Email) = '${Quote(lastWireInviteEmail.toLowerCase())}'`,
                ['Email', 'Role', 'Application', 'Status'],
            );
            AssertEqual(invites.length, 1, 'one MJ: Magic Link Invites row created');
            AssertEqual(invites[0].Role, CREDENTIALING_APPLICANT_ROLE, 'invite row Role');
            AssertEqual(invites[0].Application, CREDENTIALING_APPLICATION, 'invite row Application');
        },
    },
    {
        Id: 'cred-invite-wire.10',
        Name: 'staff-a and staff-b invite the same never-seen email to their own organization versions in parallel -> both succeed, one User, two subjects, two contacts',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const hex = runHex();
            const versionA = await activeVersionIDOf(ctx, PROGRAM_A_NAME);
            const versionB = await activeVersionIDOf(ctx, PROGRAM_B_NAME);
            const sharedEmail = `wire.race.${hex}@example.test`;

            const [resA, resB] = await withStaffSession(ctx, STAFF_A_EMAIL, (sessionA) =>
                withStaffSession(ctx, STAFF_B_EMAIL, (sessionB) =>
                    Promise.all([
                        new InviteApplicantOperation().Execute(
                            {
                                ProgramVersionID: versionA,
                                Subject: { DisplayName: `Race OrgA ${hex}`, PrimaryEmail: sharedEmail },
                                Contact: { Email: sharedEmail, FirstName: 'Shared', LastName: `Contact${hex}` },
                            },
                            { provider: sessionA },
                        ),
                        new InviteApplicantOperation().Execute(
                            {
                                ProgramVersionID: versionB,
                                Subject: { DisplayName: `Race OrgB ${hex}`, PrimaryEmail: sharedEmail },
                                Contact: { Email: sharedEmail, FirstName: 'Shared', LastName: `Contact${hex}` },
                            },
                            { provider: sessionB },
                        ),
                    ]),
                ),
            );

            Assert(resA.Success && resA.Output != null, `OrgA parallel invite succeeded (${describe(resA)})`);
            Assert(resB.Success && resB.Output != null, `OrgB parallel invite succeeded (${describe(resB)})`);
            AssertEqual(resA.Output.ContactUserID.toLowerCase(), resB.Output.ContactUserID.toLowerCase(), 'both contacts point to the same UserID');
            Assert(resA.Output.SubjectID.toLowerCase() !== resB.Output.SubjectID.toLowerCase(), 'two distinct Subjects created');
            AssertEqual(await CountRows(ctx, USERS_ENTITY, `LOWER(Email) = '${Quote(sharedEmail)}'`), 1, 'exactly one MJ: Users row');
            AssertEqual(
                await CountRows(ctx, CredentialingEntity.SubjectContact, `UserID = '${Quote(resA.Output.ContactUserID)}'`),
                2,
                'two SubjectContact rows',
            );
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
