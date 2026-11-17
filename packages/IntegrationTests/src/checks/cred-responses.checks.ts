/**
 * `cred-responses` — server-transport checks for `Credentialing.SaveResponse`,
 * `Credentialing.ConfirmResponse`, `Credentialing.ReopenResponse`, and
 * `Credentialing.WithdrawApplication` (plan Task 6, `CRD-10 - Responses`).
 *
 * Check 8 exercises the generated GraphQL update mutation over the wire against the running MJAPI
 * as the subject contact to prove the entity subclass blocks direct mutations even over GraphQL.
 */
import { randomUUID } from 'node:crypto';
import { CompositeKey, type RemoteOpResult, type UserInfo } from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import {
    ConfirmResponseOperation,
    CredentialingEntity,
    InviteApplicantOperation,
    NOT_FOUND_REASON,
    OPERATION_REFUSED,
    ReopenResponseOperation,
    SaveResponseOperation,
    STALE_RECORD_REASON,
    WithdrawApplicationOperation,
    type SelfAssessment,
} from '@mj-biz-apps/credentialing-core';
import {
    CredentialingServices,
    OPERATION_ONLY_REASON,
    OperationWrite,
    SystemUser,
    type InvitationIssuer,
} from '@mj-biz-apps/credentialing-core-entities-server';
import type {
    mjBizAppsCredentialingApplicationEntity,
    mjBizAppsCredentialingStandardResponseEntity,
} from '@mj-biz-apps/credentialing-entities';
import { WithActors } from '../actors.js';
import { CountRows, FindRows, LoadUserInfo, Quote } from '../wire.js';
import { GetOrLoadWorld } from '../world/load-world.js';
import type { CredentialingWorld } from '../world/world.js';

interface StoredResponseRow {
    ID: string;
    StandardID: string;
    Status: string;
    AuthorType: string;
    ResponseText: string | null;
    SelfAssessment: SelfAssessment | null;
    LastEditedByUserID: string | null;
    ConfirmedByUserID: string | null;
    ConfirmedAt: Date | string | null;
    ReopenReason: string | null;
    __mj_UpdatedAt: Date | string;
}

interface StoredApplicationRow {
    ID: string;
    Status: string;
    SubmittedAt: Date | string | null;
    SubmittedByUserID: string | null;
    WithdrawnAt: Date | string | null;
    WithdrawnByUserID: string | null;
    WithdrawalReason: string | null;
}

function runHex(): string {
    return randomUUID().replace(/-/g, '').slice(0, 8);
}

function describe<T>(result: RemoteOpResult<T>): string {
    return `${result.Success ? 'Success' : 'Failure'} ${result.ResultCode ?? ''}: ${result.ErrorMessage ?? ''}`;
}

function toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function makeFixtureIssuer(): InvitationIssuer {
    let seq = 0;
    return {
        async IssueApplicantLink(email: string) {
            seq += 1;
            return {
                EmailSent: false,
                InvitationUrl: `https://example.test/magic-link/redeem?token=mj_ml_resp_${seq}_${encodeURIComponent(email)}`,
                ExpiresAt: new Date(Date.now() + 72 * 3600 * 1000),
            };
        },
    };
}

async function readResponse(ctx: IntegrationCheckContext, responseID: string): Promise<StoredResponseRow> {
    const rows = await FindRows<StoredResponseRow>(
        ctx,
        CredentialingEntity.StandardResponse,
        `ID = '${Quote(responseID)}'`,
        [
            'ID',
            'StandardID',
            'Status',
            'AuthorType',
            'ResponseText',
            'SelfAssessment',
            'LastEditedByUserID',
            'ConfirmedByUserID',
            'ConfirmedAt',
            'ReopenReason',
            '__mj_UpdatedAt',
        ],
    );
    AssertEqual(rows.length, 1, `response ${responseID} exists`);
    return rows[0];
}

async function resetResponse(ctx: IntegrationCheckContext, responseID: string): Promise<void> {
    const system = SystemUser.Get('Resetting response after cred-responses check');
    const entity = await ctx.Provider.GetEntityObject<mjBizAppsCredentialingStandardResponseEntity>(
        CredentialingEntity.StandardResponse,
        system,
    );
    Assert(await entity.InnerLoad(CompositeKey.FromID(responseID)), `load response ${responseID} for reset`);
    entity.ResponseText = null;
    entity.SelfAssessment = null;
    entity.Status = 'Empty';
    entity.AuthorType = 'Human';
    entity.LastEditedByUserID = null;
    entity.ConfirmedByUserID = null;
    entity.ConfirmedAt = null;
    entity.ReopenReason = null;
    entity.IsStale = false;
    await OperationWrite.Run(ctx.Provider, (scope) => scope.Save(entity));
}

async function setApplicationSubmitted(
    ctx: IntegrationCheckContext,
    applicationID: string,
    submittedByUserID: string,
    submittedAt: Date,
): Promise<void> {
    const system = SystemUser.Get('Setting application to Submitted in cred-responses check');
    const app = await ctx.Provider.GetEntityObject<mjBizAppsCredentialingApplicationEntity>(
        CredentialingEntity.Application,
        system,
    );
    Assert(await app.InnerLoad(CompositeKey.FromID(applicationID)), `load application ${applicationID}`);
    app.Status = 'Submitted';
    app.SubmittedAt = submittedAt;
    app.SubmittedByUserID = submittedByUserID;
    await OperationWrite.Run(ctx.Provider, (scope) => scope.Save(app));
}

async function restoreApplicationDraft(ctx: IntegrationCheckContext, applicationID: string): Promise<void> {
    const system = SystemUser.Get('Restoring application to Draft after cred-responses check');
    const app = await ctx.Provider.GetEntityObject<mjBizAppsCredentialingApplicationEntity>(
        CredentialingEntity.Application,
        system,
    );
    Assert(await app.InnerLoad(CompositeKey.FromID(applicationID)), `load application ${applicationID} to restore`);
    app.Status = 'Draft';
    app.SubmittedAt = null;
    app.SubmittedByUserID = null;
    await OperationWrite.Run(ctx.Provider, (scope) => scope.Save(app));
}

/** Finds a response ID on SubjectOne whose standard has `ResponseType === 'Narrative'`. */
async function narrativeResponseID(world: CredentialingWorld): Promise<string> {
    const narrativeStd = world.ApplicantProgram.Sections.flatMap((s) => s.Standards).find(
        (st) => st.ResponseType === 'Narrative',
    );
    Assert(narrativeStd != null, 'Sample Applicant Program has a Narrative standard');
    const rows = world.Applicants.SubjectOne.ResponseIDs;
    Assert(rows.length >= 2, 'SubjectOne has at least two responses');
    return rows[1];
}

async function responseIDForStandard(
    ctx: IntegrationCheckContext,
    applicationID: string,
    standardID: string,
): Promise<string> {
    const rows = await FindRows<{ ID: string }>(
        ctx,
        CredentialingEntity.StandardResponse,
        `ApplicationID = '${Quote(applicationID)}' AND StandardID = '${Quote(standardID)}'`,
        ['ID'],
    );
    AssertEqual(rows.length, 1, `one response for application ${applicationID} standard ${standardID}`);
    return rows[0].ID;
}

async function devLoginToken(apiUrl: string, email: string): Promise<string> {
    const resp = await fetch(new URL('/auth/dev-login', apiUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    const body = (await resp.json()) as { token?: string; error?: string };
    if (!resp.ok || !body.token) {
        throw new Error(`dev-login for ${email} failed (${resp.status}): ${body.error ?? 'no token'}`);
    }
    return body.token;
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-responses.1',
        Name: 'SaveResponse sets Status = Drafted, AuthorType = Human, and LastEditedByUserID = caller',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectOne.Contacts[0];
            const narrativeStd = world.ApplicantProgram.Sections.flatMap((s) => s.Standards).find(
                (st) => st.ResponseType === 'Narrative',
            );
            Assert(narrativeStd != null, 'Narrative standard exists');
            const responseID = await responseIDForStandard(ctx, world.Applicants.SubjectOne.ApplicationID, narrativeStd.ID);

            try {
                const before = await readResponse(ctx, responseID);
                const text = `Practice description ${runHex()}`;
                const res = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: text,
                        SelfAssessment: 'Met',
                        ExpectedUpdatedAt: toIso(before.__mj_UpdatedAt),
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(res.Success && res.Output != null, `SaveResponse succeeds (${describe(res)})`);
                AssertEqual(res.Output.Response.Status, 'Drafted', 'output Status is Drafted');
                AssertEqual(res.Output.Response.AuthorType, 'Human', 'output AuthorType is Human');
                AssertEqual(res.Output.Response.ResponseText, text, 'output ResponseText matches');
                AssertEqual(res.Output.Response.SelfAssessment, 'Met', 'output SelfAssessment matches');

                const after = await readResponse(ctx, responseID);
                AssertEqual(after.Status, 'Drafted', 'stored Status is Drafted');
                AssertEqual(after.AuthorType, 'Human', 'stored AuthorType is Human');
                AssertEqual(after.ResponseText, text, 'stored ResponseText matches');
                AssertEqual(after.SelfAssessment, 'Met', 'stored SelfAssessment matches');
                Assert(
                    after.LastEditedByUserID != null && UUIDsEqual(after.LastEditedByUserID, contact.ID),
                    `LastEditedByUserID is caller (got ${after.LastEditedByUserID})`,
                );
            } finally {
                await resetResponse(ctx, responseID);
            }
        },
    },
    {
        Id: 'cred-responses.2',
        Name: 'SaveResponse with both text and self-assessment blank resets Status to Empty',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectOne.Contacts[0];
            const responseID = await narrativeResponseID(world);

            try {
                const initial = await readResponse(ctx, responseID);
                const drafted = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: `Temporary draft ${runHex()}`,
                        SelfAssessment: 'Partially Met',
                        ExpectedUpdatedAt: toIso(initial.__mj_UpdatedAt),
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(drafted.Success && drafted.Output != null, `initial save succeeds (${describe(drafted)})`);

                const cleared = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: '   ',
                        SelfAssessment: null,
                        ExpectedUpdatedAt: drafted.Output.Response.UpdatedAt,
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(cleared.Success && cleared.Output != null, `clear save succeeds (${describe(cleared)})`);
                AssertEqual(cleared.Output.Response.Status, 'Empty', 'output Status is Empty');
                AssertEqual(cleared.Output.Response.ResponseText, null, 'output ResponseText is null');
                AssertEqual(cleared.Output.Response.SelfAssessment, null, 'output SelfAssessment is null');

                const stored = await readResponse(ctx, responseID);
                AssertEqual(stored.Status, 'Empty', 'stored Status is Empty');
                AssertEqual(stored.ResponseText, null, 'stored ResponseText is null');
                AssertEqual(stored.SelfAssessment, null, 'stored SelfAssessment is null');
            } finally {
                await resetResponse(ctx, responseID);
            }
        },
    },
    {
        Id: 'cred-responses.3',
        Name: 'ConfirmResponse without a self-assessment is refused with the self-assessment sentence',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectOne.Contacts[0];
            const narrativeStd = world.ApplicantProgram.Sections.flatMap((s) => s.Standards).find(
                (st) => st.ResponseType === 'Narrative',
            );
            Assert(narrativeStd != null, 'Narrative standard exists');
            const responseID = await responseIDForStandard(ctx, world.Applicants.SubjectOne.ApplicationID, narrativeStd.ID);

            try {
                const initial = await readResponse(ctx, responseID);
                const saved = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: `Answer without self-assessment ${runHex()}`,
                        SelfAssessment: null,
                        ExpectedUpdatedAt: toIso(initial.__mj_UpdatedAt),
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(saved.Success && saved.Output != null, `SaveResponse succeeds (${describe(saved)})`);

                const confirmed = await new ConfirmResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ExpectedUpdatedAt: saved.Output.Response.UpdatedAt,
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(!confirmed.Success, 'confirm without self-assessment is refused');
                AssertEqual(confirmed.ResultCode, OPERATION_REFUSED, 'ResultCode');
                AssertEqual(
                    confirmed.ErrorMessage,
                    'Choose Met, Partially met or Not met before confirming.',
                    'refusal sentence',
                );
                const stored = await readResponse(ctx, responseID);
                AssertEqual(stored.Status, 'Drafted', 'Status remains Drafted');
            } finally {
                await resetResponse(ctx, responseID);
            }
        },
    },
    {
        Id: 'cred-responses.4',
        Name: 'ConfirmResponse sets Status = Confirmed and stamps ConfirmedByUserID and ConfirmedAt',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectOne.Contacts[0];
            const narrativeStd = world.ApplicantProgram.Sections.flatMap((s) => s.Standards).find(
                (st) => st.ResponseType === 'Narrative',
            );
            Assert(narrativeStd != null, 'Narrative standard exists');
            const responseID = await responseIDForStandard(ctx, world.Applicants.SubjectOne.ApplicationID, narrativeStd.ID);

            try {
                const initial = await readResponse(ctx, responseID);
                const saved = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: `Confirmed answer ${runHex()}`,
                        SelfAssessment: 'Met',
                        ExpectedUpdatedAt: toIso(initial.__mj_UpdatedAt),
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(saved.Success && saved.Output != null, `SaveResponse succeeds (${describe(saved)})`);

                const confirmed = await new ConfirmResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ExpectedUpdatedAt: saved.Output.Response.UpdatedAt,
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(confirmed.Success && confirmed.Output != null, `ConfirmResponse succeeds (${describe(confirmed)})`);
                AssertEqual(confirmed.Output.Response.Status, 'Confirmed', 'output Status is Confirmed');
                Assert(confirmed.Output.Response.ConfirmedAt != null, 'output ConfirmedAt is stamped');

                const stored = await readResponse(ctx, responseID);
                AssertEqual(stored.Status, 'Confirmed', 'stored Status is Confirmed');
                Assert(
                    stored.ConfirmedByUserID != null && UUIDsEqual(stored.ConfirmedByUserID, contact.ID),
                    `ConfirmedByUserID is caller (got ${stored.ConfirmedByUserID})`,
                );
                Assert(stored.ConfirmedAt != null, 'stored ConfirmedAt is stamped');
            } finally {
                await resetResponse(ctx, responseID);
            }
        },
    },
    {
        Id: 'cred-responses.5',
        Name: 'SaveResponse on a Confirmed answer is refused with the confirmed sentence and leaves it unchanged',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectOne.Contacts[0];
            const narrativeStd = world.ApplicantProgram.Sections.flatMap((s) => s.Standards).find(
                (st) => st.ResponseType === 'Narrative',
            );
            Assert(narrativeStd != null, 'Narrative standard exists');
            const responseID = await responseIDForStandard(ctx, world.Applicants.SubjectOne.ApplicationID, narrativeStd.ID);

            try {
                const originalText = `Locked confirmed text ${runHex()}`;
                const initial = await readResponse(ctx, responseID);
                const saved = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: originalText,
                        SelfAssessment: 'Met',
                        ExpectedUpdatedAt: toIso(initial.__mj_UpdatedAt),
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(saved.Success && saved.Output != null, 'SaveResponse succeeds');

                const confirmed = await new ConfirmResponseOperation().Execute(
                    { ResponseID: responseID, ExpectedUpdatedAt: saved.Output.Response.UpdatedAt },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(confirmed.Success && confirmed.Output != null, 'ConfirmResponse succeeds');

                const overwrite = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: 'Attempted overwrite',
                        SelfAssessment: 'Not Met',
                        ExpectedUpdatedAt: confirmed.Output.Response.UpdatedAt,
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(!overwrite.Success, 'save on confirmed answer is refused');
                AssertEqual(overwrite.ResultCode, OPERATION_REFUSED, 'ResultCode');
                AssertEqual(
                    overwrite.ErrorMessage,
                    "This answer is confirmed. Ask the program's staff to reopen it if it must change.",
                    'confirmed refusal sentence',
                );

                const stored = await readResponse(ctx, responseID);
                AssertEqual(stored.Status, 'Confirmed', 'Status unchanged');
                AssertEqual(stored.ResponseText, originalText, 'ResponseText unchanged');
                AssertEqual(stored.SelfAssessment, 'Met', 'SelfAssessment unchanged');
            } finally {
                await resetResponse(ctx, responseID);
            }
        },
    },
    {
        Id: 'cred-responses.6',
        Name: 'Staff calling ConfirmResponse is refused with Only the applicant can confirm an answer.',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectOne.Contacts[0];
            const narrativeStd = world.ApplicantProgram.Sections.flatMap((s) => s.Standards).find(
                (st) => st.ResponseType === 'Narrative',
            );
            Assert(narrativeStd != null, 'Narrative standard exists');
            const responseID = await responseIDForStandard(ctx, world.Applicants.SubjectOne.ApplicationID, narrativeStd.ID);

            try {
                const initial = await readResponse(ctx, responseID);
                const saved = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: `Draft ready for confirm ${runHex()}`,
                        SelfAssessment: 'Met',
                        ExpectedUpdatedAt: toIso(initial.__mj_UpdatedAt),
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(saved.Success && saved.Output != null, 'SaveResponse succeeds');

                const staffConfirm = await new ConfirmResponseOperation().Execute(
                    { ResponseID: responseID, ExpectedUpdatedAt: saved.Output.Response.UpdatedAt },
                    { provider: ctx.Provider, user: world.StaffA },
                );
                Assert(!staffConfirm.Success, 'staff ConfirmResponse is refused');
                AssertEqual(staffConfirm.ResultCode, OPERATION_REFUSED, 'ResultCode');
                AssertEqual(staffConfirm.ErrorMessage, 'Only the applicant can confirm an answer.', 'staff confirm refusal');

                const stored = await readResponse(ctx, responseID);
                AssertEqual(stored.Status, 'Drafted', 'Status remains Drafted');
            } finally {
                await resetResponse(ctx, responseID);
            }
        },
    },
    {
        Id: 'cred-responses.7',
        Name: 'After application is Submitted, SaveResponse and ConfirmResponse are refused with the locked sentence',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectOne.Contacts[0];
            const narrativeStd = world.ApplicantProgram.Sections.flatMap((s) => s.Standards).find(
                (st) => st.ResponseType === 'Narrative',
            );
            Assert(narrativeStd != null, 'Narrative standard exists');
            const responseID = await responseIDForStandard(ctx, world.Applicants.SubjectOne.ApplicationID, narrativeStd.ID);
            const submittedAt = new Date('2026-11-17T12:00:00.000Z');
            const expectedLocked = 'This application was submitted on Nov 17, 2026. Its answers and documents are locked.';

            try {
                const initial = await readResponse(ctx, responseID);
                const saved = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: `Draft before submit ${runHex()}`,
                        SelfAssessment: 'Met',
                        ExpectedUpdatedAt: toIso(initial.__mj_UpdatedAt),
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(saved.Success && saved.Output != null, 'SaveResponse before submit succeeds');

                await setApplicationSubmitted(ctx, world.Applicants.SubjectOne.ApplicationID, contact.ID, submittedAt);

                const saveAfter = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: 'Edit after submit',
                        SelfAssessment: 'Not Met',
                        ExpectedUpdatedAt: saved.Output.Response.UpdatedAt,
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(!saveAfter.Success, 'SaveResponse after submit is refused');
                AssertEqual(saveAfter.ResultCode, OPERATION_REFUSED, 'save ResultCode');
                AssertEqual(saveAfter.ErrorMessage, expectedLocked, 'save locked sentence');

                const confirmAfter = await new ConfirmResponseOperation().Execute(
                    { ResponseID: responseID, ExpectedUpdatedAt: saved.Output.Response.UpdatedAt },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(!confirmAfter.Success, 'ConfirmResponse after submit is refused');
                AssertEqual(confirmAfter.ResultCode, OPERATION_REFUSED, 'confirm ResultCode');
                AssertEqual(confirmAfter.ErrorMessage, expectedLocked, 'confirm locked sentence');
            } finally {
                await restoreApplicationDraft(ctx, world.Applicants.SubjectOne.ApplicationID);
                await resetResponse(ctx, responseID);
            }
        },
    },
    {
        Id: 'cred-responses.8',
        Name: 'Generated update mutation over the wire as the contact is refused and leaves the response unchanged',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectOne.Contacts[0];
            const responseID = world.Applicants.SubjectOne.ResponseIDs[0];
            const apiUrl = process.env.MJAPI_URL ?? `http://localhost:${process.env.GRAPHQL_PORT || '4050'}`;
            const token = await devLoginToken(apiUrl, contact.Email);

            const before = await readResponse(ctx, responseID);
            const gql = `mutation ($input: UpdatemjBizAppsCredentialingStandardResponseInput!) {
                UpdatemjBizAppsCredentialingStandardResponse(input: $input) { ID Status ResponseText }
            }`;
            const resp = await fetch(new URL('/graphql', apiUrl), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    query: gql,
                    variables: {
                        input: {
                            ID: responseID,
                            ResponseText: `Wire mutation attempt ${runHex()}`,
                            Status: 'Confirmed',
                        },
                    },
                }),
            });
            const body = (await resp.json()) as {
                data?: { UpdatemjBizAppsCredentialingStandardResponse?: unknown };
                errors?: { message?: string }[];
            };
            Assert(
                Array.isArray(body.errors) && body.errors.length > 0 && body.data?.UpdatemjBizAppsCredentialingStandardResponse == null,
                `generated update mutation over the wire is refused (got ${JSON.stringify(body)})`,
            );
            const errorMsg = body.errors.map((e) => e.message ?? '').join('; ');
            Assert(
                errorMsg.includes(OPERATION_ONLY_REASON),
                `wire mutation refusal includes "${OPERATION_ONLY_REASON}", got "${errorMsg}"`,
            );

            const after = await readResponse(ctx, responseID);
            AssertEqual(after.Status, before.Status, 'Status unchanged after wire attempt');
            AssertEqual(after.ResponseText, before.ResponseText, 'ResponseText unchanged after wire attempt');
        },
    },
    {
        Id: 'cred-responses.9',
        Name: 'Two ConfirmResponse calls with the same ExpectedUpdatedAt in parallel: one succeeds, one gets STALE_RECORD_REASON',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectOne.Contacts[0];
            const narrativeStd = world.ApplicantProgram.Sections.flatMap((s) => s.Standards).find(
                (st) => st.ResponseType === 'Narrative',
            );
            Assert(narrativeStd != null, 'Narrative standard exists');
            const responseID = await responseIDForStandard(ctx, world.Applicants.SubjectOne.ApplicationID, narrativeStd.ID);

            try {
                const initial = await readResponse(ctx, responseID);
                const saved = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: `Parallel confirm ${runHex()}`,
                        SelfAssessment: 'Met',
                        ExpectedUpdatedAt: toIso(initial.__mj_UpdatedAt),
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(saved.Success && saved.Output != null, 'SaveResponse succeeds');
                const expectedUpdatedAt = saved.Output.Response.UpdatedAt;

                const [res1, res2] = await WithActors(ctx, 2, ([p1, p2]) =>
                    Promise.all([
                        new ConfirmResponseOperation().Execute(
                            { ResponseID: responseID, ExpectedUpdatedAt: expectedUpdatedAt },
                            { provider: p1, user: contact },
                        ),
                        new ConfirmResponseOperation().Execute(
                            { ResponseID: responseID, ExpectedUpdatedAt: expectedUpdatedAt },
                            { provider: p2, user: contact },
                        ),
                    ]),
                );

                const successes = [res1, res2].filter((r) => r.Success);
                const failures = [res1, res2].filter((r) => !r.Success);
                AssertEqual(successes.length, 1, `exactly one parallel confirm succeeds (got ${describe(res1)} / ${describe(res2)})`);
                AssertEqual(failures.length, 1, 'exactly one parallel confirm is refused');
                AssertEqual(failures[0].ResultCode, OPERATION_REFUSED, 'refusal ResultCode');
                AssertEqual(failures[0].ErrorMessage, STALE_RECORD_REASON, 'stale refusal reason');
            } finally {
                await resetResponse(ctx, responseID);
            }
        },
    },
    {
        Id: 'cred-responses.10',
        Name: 'ReopenResponse as staff with reason -> Drafted with ReopenReason; without reason -> sentence; as applicant -> refused',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectOne.Contacts[0];
            const narrativeStd = world.ApplicantProgram.Sections.flatMap((s) => s.Standards).find(
                (st) => st.ResponseType === 'Narrative',
            );
            Assert(narrativeStd != null, 'Narrative standard exists');
            const responseID = await responseIDForStandard(ctx, world.Applicants.SubjectOne.ApplicationID, narrativeStd.ID);

            try {
                const answerText = `Confirmed text to reopen ${runHex()}`;
                const initial = await readResponse(ctx, responseID);
                const saved = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: answerText,
                        SelfAssessment: 'Partially Met',
                        ExpectedUpdatedAt: toIso(initial.__mj_UpdatedAt),
                    },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(saved.Success && saved.Output != null, 'SaveResponse succeeds');

                const confirmed = await new ConfirmResponseOperation().Execute(
                    { ResponseID: responseID, ExpectedUpdatedAt: saved.Output.Response.UpdatedAt },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(confirmed.Success, 'ConfirmResponse succeeds');

                const applicantReopen = await new ReopenResponseOperation().Execute(
                    { ResponseID: responseID, Reason: 'Applicant cannot reopen' },
                    { provider: ctx.Provider, user: contact },
                );
                Assert(!applicantReopen.Success, 'applicant ReopenResponse is refused');

                const blankReason = await new ReopenResponseOperation().Execute(
                    { ResponseID: responseID, Reason: '   ' },
                    { provider: ctx.Provider, user: world.StaffA },
                );
                Assert(!blankReason.Success, 'reopen without reason is refused');
                AssertEqual(blankReason.ResultCode, OPERATION_REFUSED, 'blank reason ResultCode');
                AssertEqual(blankReason.ErrorMessage, 'Give the reason for reopening this answer.', 'blank reason sentence');

                const reason = `Please clarify dates ${runHex()}`;
                const reopened = await new ReopenResponseOperation().Execute(
                    { ResponseID: responseID, Reason: reason },
                    { provider: ctx.Provider, user: world.StaffA },
                );
                Assert(reopened.Success && reopened.Output != null, `staff ReopenResponse succeeds (${describe(reopened)})`);
                AssertEqual(reopened.Output.Response.Status, 'Drafted', 'output Status is Drafted');
                AssertEqual(reopened.Output.Response.ResponseText, answerText, 'ResponseText kept');
                AssertEqual(reopened.Output.Response.SelfAssessment, 'Partially Met', 'SelfAssessment kept');
                AssertEqual(reopened.Output.Response.ReopenReason, reason, 'output ReopenReason matches');

                const stored = await readResponse(ctx, responseID);
                AssertEqual(stored.Status, 'Drafted', 'stored Status is Drafted');
                AssertEqual(stored.ResponseText, answerText, 'stored ResponseText kept');
                AssertEqual(stored.ReopenReason, reason, 'stored ReopenReason matches');
                AssertEqual(stored.ConfirmedByUserID, null, 'ConfirmedByUserID cleared');
                AssertEqual(stored.ConfirmedAt, null, 'ConfirmedAt cleared');
            } finally {
                await resetResponse(ctx, responseID);
            }
        },
    },
    {
        Id: 'cred-responses.11',
        Name: 'Applicant withdraws a Draft with a reason -> Withdrawn, and a new invitation for the same subject and version then succeeds',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const email = `withdraw.${hex}@example.test`;
            CredentialingServices.Register({ Invitations: makeFixtureIssuer() });

            const invited = await new InviteApplicantOperation().Execute(
                {
                    ProgramVersionID: world.ApplicantProgram.Version.ID,
                    Subject: { DisplayName: `Withdraw Subject ${hex}`, PrimaryEmail: email },
                    Contact: { Email: email, FirstName: 'Withdraw', LastName: `User${hex}` },
                },
                { provider: ctx.Provider, user: world.StaffA },
            );
            Assert(invited.Success && invited.Output != null, `initial invite succeeds (${describe(invited)})`);
            const { SubjectID, ApplicationID, ContactUserID } = invited.Output;

            const contactUserInfo = await LoadUserInfo(ctx, email);

            const blankWithdraw = await new WithdrawApplicationOperation().Execute(
                { ApplicationID, Reason: '  ' },
                { provider: ctx.Provider, user: contactUserInfo },
            );
            Assert(!blankWithdraw.Success, 'withdraw with blank reason is refused');
            AssertEqual(blankWithdraw.ResultCode, OPERATION_REFUSED, 'blank withdraw ResultCode');
            AssertEqual(blankWithdraw.ErrorMessage, 'Give the reason for withdrawing.', 'blank withdraw sentence');

            const reason = `Deferring until next year ${hex}`;
            const withdrawn = await new WithdrawApplicationOperation().Execute(
                { ApplicationID, Reason: reason },
                { provider: ctx.Provider, user: contactUserInfo },
            );
            Assert(withdrawn.Success && withdrawn.Output != null, `WithdrawApplication succeeds (${describe(withdrawn)})`);
            AssertEqual(withdrawn.Output.Status, 'Withdrawn', 'output Status is Withdrawn');
            AssertEqual(withdrawn.Output.WithdrawalReason, reason, 'output WithdrawalReason matches');

            const apps = await FindRows<StoredApplicationRow>(
                ctx,
                CredentialingEntity.Application,
                `ID = '${Quote(ApplicationID)}'`,
                ['ID', 'Status', 'SubmittedAt', 'SubmittedByUserID', 'WithdrawnAt', 'WithdrawnByUserID', 'WithdrawalReason'],
            );
            AssertEqual(apps.length, 1, 'withdrawn application exists');
            AssertEqual(apps[0].Status, 'Withdrawn', 'stored Status is Withdrawn');
            AssertEqual(apps[0].WithdrawalReason, reason, 'stored WithdrawalReason matches');
            Assert(
                apps[0].WithdrawnByUserID != null && UUIDsEqual(apps[0].WithdrawnByUserID, contactUserInfo.ID),
                'WithdrawnByUserID stamped',
            );
            Assert(apps[0].WithdrawnAt != null, 'WithdrawnAt stamped');

            const reinvited = await new InviteApplicantOperation().Execute(
                {
                    ProgramVersionID: world.ApplicantProgram.Version.ID,
                    Subject: { ExistingSubjectID: SubjectID },
                    Contact: { Email: email, FirstName: 'Withdraw', LastName: `User${hex}` },
                },
                { provider: ctx.Provider, user: world.StaffA },
            );
            Assert(reinvited.Success && reinvited.Output != null, `re-invite after withdrawal succeeds (${describe(reinvited)})`);
            Assert(!UUIDsEqual(reinvited.Output.ApplicationID, ApplicationID), 'new Draft application created');
            AssertEqual(
                await CountRows(
                    ctx,
                    CredentialingEntity.Application,
                    `SubjectID = '${Quote(SubjectID)}' AND ProgramVersionID = '${Quote(world.ApplicantProgram.Version.ID)}'`,
                ),
                2,
                'two applications exist (one Withdrawn, one Draft)',
            );
        },
    },
    {
        Id: 'cred-responses.12',
        Name: 'A second contact of the same subject can save; a contact of another subject gets Record not found.',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const secondContactOfOne = world.Applicants.SubjectOne.Contacts[1];
            const otherSubjectContact = world.Applicants.SubjectTwo.Contacts[0];
            Assert(!UUIDsEqual(secondContactOfOne.ID, world.Applicants.SubjectOne.Contacts[0].ID), 'SubjectOne has two distinct contacts');

            const narrativeStd = world.ApplicantProgram.Sections.flatMap((s) => s.Standards).find(
                (st) => st.ResponseType === 'Narrative',
            );
            Assert(narrativeStd != null, 'Narrative standard exists');
            const responseID = await responseIDForStandard(ctx, world.Applicants.SubjectOne.ApplicationID, narrativeStd.ID);

            try {
                const initial = await readResponse(ctx, responseID);
                const foreignSave = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: 'Foreign contact attempt',
                        SelfAssessment: 'Met',
                        ExpectedUpdatedAt: toIso(initial.__mj_UpdatedAt),
                    },
                    { provider: ctx.Provider, user: otherSubjectContact },
                );
                Assert(!foreignSave.Success, 'contact of another subject refused');
                AssertEqual(foreignSave.ResultCode, OPERATION_REFUSED, 'foreign ResultCode');
                AssertEqual(foreignSave.ErrorMessage, NOT_FOUND_REASON, 'foreign refusal is Record not found.');

                const text = `Second contact draft ${runHex()}`;
                const secondSave = await new SaveResponseOperation().Execute(
                    {
                        ResponseID: responseID,
                        ResponseText: text,
                        SelfAssessment: 'Met',
                        ExpectedUpdatedAt: toIso(initial.__mj_UpdatedAt),
                    },
                    { provider: ctx.Provider, user: secondContactOfOne },
                );
                Assert(secondSave.Success && secondSave.Output != null, `second contact SaveResponse succeeds (${describe(secondSave)})`);

                const stored = await readResponse(ctx, responseID);
                AssertEqual(stored.ResponseText, text, 'stored ResponseText matches second contact edit');
                Assert(
                    stored.LastEditedByUserID != null && UUIDsEqual(stored.LastEditedByUserID, secondContactOfOne.ID),
                    'LastEditedByUserID is second contact',
                );
            } finally {
                await resetResponse(ctx, responseID);
            }
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
