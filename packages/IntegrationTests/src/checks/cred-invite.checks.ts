/**
 * `cred-invite` — server-transport checks for `Credentialing.InviteApplicant` and
 * `Credentialing.ReissueInvitation` (plan Task 4, `CRD-09 - Invitations`).
 *
 * Runs with a fixture `InvitationIssuer` registered on `CredentialingServices` (mj test run does not
 * start MJAPI's HTTP/MagicLinkService stack). Live link issuance, redemption (`POST /magic-link/redeem`),
 * invite role/application verification and parallel new-email races against MJAPI run in
 * `cred-invite-wire` on the client transport.
 */
import { randomUUID } from 'node:crypto';
import type { RemoteOpResult, UserInfo } from '@memberjunction/core';
import type { MJMagicLinkInviteEntity } from '@memberjunction/core-entities';
import { UserCache } from '@memberjunction/generic-database-provider';
import { UUIDsEqual } from '@memberjunction/global';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import {
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_REVIEWER_ROLE,
    CredentialingEntity,
    InviteApplicantOperation,
    NOT_FOUND_REASON,
    OPERATION_REFUSED,
    ReissueInvitationOperation,
    type InviteApplicantOutput,
    type ReissueInvitationOutput,
} from '@mj-biz-apps/credentialing-core';
import {
    CredentialingServices,
    type InvitationIssuer,
} from '@mj-biz-apps/credentialing-core-entities-server';
import { CountRows, FindRows, Quote } from '../wire.js';
import { EnsureUser, GetOrLoadWorld } from '../world/load-world.js';

const USERS_ENTITY = 'MJ: Users';
const USER_ROLES_ENTITY = 'MJ: User Roles';
const USER_APPLICATIONS_ENTITY = 'MJ: User Applications';
const PEOPLE_ENTITY = 'MJ_BizApps_Common: People';
const MAGIC_LINK_INVITES_ENTITY = 'MJ: Magic Link Invites';
const CREDENTIALING_APPLICATION = 'Credentialing';

const CAN_START_DRAFT_SENTENCE = 'Applications can be started only on an active version.';
const ALREADY_OPEN_SENTENCE = 'This subject already has an open application on this version.';
const INTERNAL_ACCOUNT_SENTENCE = 'This email belongs to an internal account and cannot be invited as an applicant.';
const INVITATION_FAILED_NOTE = 'The applicant was added, but the invitation link could not be created. Use Send a new link.';

function runHex(): string {
    return randomUUID().replace(/-/g, '').slice(0, 8);
}

function describe<T>(result: RemoteOpResult<T>): string {
    return `${result.Success ? 'Success' : 'Failure'} ${result.ResultCode ?? ''}: ${result.ErrorMessage ?? ''}`;
}

interface FixtureRecorder {
    Calls: string[];
    Issuer: InvitationIssuer;
}

function makeFixtureIssuer(mode: 'ok' | 'throw' = 'ok'): FixtureRecorder {
    const Calls: string[] = [];
    const Issuer: InvitationIssuer = {
        async IssueApplicantLink(email: string) {
            Calls.push(email);
            if (mode === 'throw') {
                throw new Error('simulated invitation service outage');
            }
            return {
                EmailSent: false,
                InvitationUrl: `https://example.test/magic-link/redeem?token=mj_ml_fixture_${Calls.length}_${encodeURIComponent(email)}`,
                ExpiresAt: new Date(Date.now() + 72 * 3600 * 1000),
            };
        },
    };
    return { Calls, Issuer };
}

async function withFixtureIssuer<T>(mode: 'ok' | 'throw', work: (recorder: FixtureRecorder) => Promise<T>): Promise<T> {
    const recorder = makeFixtureIssuer(mode);
    CredentialingServices.Register({ Invitations: recorder.Issuer });
    return work(recorder);
}

async function executeInvite(
    ctx: IntegrationCheckContext,
    user: UserInfo,
    programVersionID: string,
    subject: { ExistingSubjectID: string } | { DisplayName: string; PrimaryEmail: string },
    contact: { Email: string; FirstName: string; LastName: string },
): Promise<RemoteOpResult<InviteApplicantOutput>> {
    return new InviteApplicantOperation().Execute(
        { ProgramVersionID: programVersionID, Subject: subject, Contact: contact },
        { provider: ctx.Provider, user },
    );
}

async function executeReissue(
    ctx: IntegrationCheckContext,
    user: UserInfo,
    subjectContactID: string,
): Promise<RemoteOpResult<ReissueInvitationOutput>> {
    return new ReissueInvitationOperation().Execute({ SubjectContactID: subjectContactID }, { provider: ctx.Provider, user });
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-invite.1',
        Name: 'staff-a invites a new subject and contact -> Subject, party record, User with Applicant role + app row, Contact, Draft Application, N Empty responses',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const displayName = `Invited Subject ${hex}`;
            const contactEmail = `invited.${hex}@example.test`;
            const expectedStandards = world.ApplicantProgram.Sections.reduce((sum, s) => sum + s.Standards.length, 0);

            await withFixtureIssuer('ok', async (recorder) => {
                const res = await executeInvite(
                    ctx,
                    world.StaffA,
                    world.ApplicantProgram.Version.ID,
                    { DisplayName: displayName, PrimaryEmail: `subject.${hex}@example.test` },
                    { Email: contactEmail, FirstName: 'Invited', LastName: `Person${hex}` },
                );
                Assert(res.Success && res.Output != null, `InviteApplicant succeeds (${describe(res)})`);
                const out = res.Output;
                AssertEqual(out.EmailSent, false, 'EmailSent');
                Assert(out.InvitationUrl != null && out.InvitationUrl.includes(encodeURIComponent(contactEmail)), 'InvitationUrl returned from issuer');
                Assert(out.ExpiresAt != null, 'ExpiresAt returned');
                AssertEqual(out.InvitationNote, null, 'InvitationNote is null');
                AssertEqual(recorder.Calls.length, 1, 'issuer called once');
                AssertEqual(recorder.Calls[0], contactEmail.toLowerCase(), 'issuer called with normalized contact email');

                const subjects = await FindRows<{
                    ID: string;
                    AccreditingOrganizationID: string;
                    SubjectType: string;
                    DisplayName: string;
                    PrimaryEmail: string;
                    PartyEntityID: string | null;
                    PartyRecordID: string | null;
                }>(
                    ctx,
                    CredentialingEntity.Subject,
                    `ID = '${Quote(out.SubjectID)}'`,
                    ['ID', 'AccreditingOrganizationID', 'SubjectType', 'DisplayName', 'PrimaryEmail', 'PartyEntityID', 'PartyRecordID'],
                );
                AssertEqual(subjects.length, 1, 'one Subject row created');
                Assert(UUIDsEqual(subjects[0].AccreditingOrganizationID, world.OrgA.ID), 'Subject belongs to OrgA');
                AssertEqual(subjects[0].SubjectType, world.ApplicantProgram.Program.SubjectType, 'SubjectType matches program');
                AssertEqual(subjects[0].DisplayName, displayName, 'DisplayName stored');
                const peopleEntity = ctx.Provider.EntityByName(PEOPLE_ENTITY);
                Assert(peopleEntity != null, 'People entity exists');
                Assert(UUIDsEqual(subjects[0].PartyEntityID ?? '', peopleEntity.ID), 'PartyEntityID points to Common People');
                Assert(subjects[0].PartyRecordID != null, 'PartyRecordID set');
                AssertEqual(await CountRows(ctx, PEOPLE_ENTITY, `ID = '${Quote(subjects[0].PartyRecordID ?? '')}'`), 1, 'Common party record exists');

                const users = await FindRows<{ ID: string; Email: string; Type: string; LinkedEntityID: string | null; LinkedEntityRecordID: string | null }>(
                    ctx,
                    USERS_ENTITY,
                    `ID = '${Quote(out.ContactUserID)}'`,
                    ['ID', 'Email', 'Type', 'LinkedEntityID', 'LinkedEntityRecordID'],
                );
                AssertEqual(users.length, 1, 'one User row created');
                AssertEqual(users[0].Email.toLowerCase(), contactEmail.toLowerCase(), 'User email matches');
                AssertEqual(users[0].Type.trim(), 'User', 'User Type is User');
                Assert(UUIDsEqual(users[0].LinkedEntityID ?? '', peopleEntity.ID), 'User.LinkedEntityID points to Common People');
                Assert(users[0].LinkedEntityRecordID != null, 'User.LinkedEntityRecordID set');

                const roles = await FindRows<{ Role: string }>(ctx, USER_ROLES_ENTITY, `UserID = '${Quote(out.ContactUserID)}'`, ['Role']);
                AssertEqual(roles.length, 1, 'User holds one role');
                AssertEqual(roles[0].Role, CREDENTIALING_APPLICANT_ROLE, 'User holds Credentialing Applicant role');

                const apps = await FindRows<{ Application: string }>(ctx, USER_APPLICATIONS_ENTITY, `UserID = '${Quote(out.ContactUserID)}'`, ['Application']);
                AssertEqual(apps.length, 1, 'User has one application row');
                AssertEqual(apps[0].Application, CREDENTIALING_APPLICATION, 'User has Credentialing application row');

                const contacts = await FindRows<{ ID: string; SubjectID: string; UserID: string; ContactRole: string; InvitedByUserID: string }>(
                    ctx,
                    CredentialingEntity.SubjectContact,
                    `SubjectID = '${Quote(out.SubjectID)}' AND UserID = '${Quote(out.ContactUserID)}'`,
                    ['ID', 'SubjectID', 'UserID', 'ContactRole', 'InvitedByUserID'],
                );
                AssertEqual(contacts.length, 1, 'one SubjectContact created');
                AssertEqual(contacts[0].ContactRole, 'Primary', 'first contact is Primary');
                Assert(UUIDsEqual(contacts[0].InvitedByUserID, world.StaffA.ID), 'InvitedByUserID is caller');

                const applications = await FindRows<{ ID: string; Status: string; IsHistorical: boolean }>(
                    ctx,
                    CredentialingEntity.Application,
                    `ID = '${Quote(out.ApplicationID)}'`,
                    ['ID', 'Status', 'IsHistorical'],
                );
                AssertEqual(applications.length, 1, 'one Application created');
                AssertEqual(applications[0].Status, 'Draft', 'Application Status is Draft');
                AssertEqual(applications[0].IsHistorical, false, 'Application IsHistorical is false');

                const responses = await FindRows<{ Status: string; AuthorType: string }>(
                    ctx,
                    CredentialingEntity.StandardResponse,
                    `ApplicationID = '${Quote(out.ApplicationID)}'`,
                    ['Status', 'AuthorType'],
                );
                AssertEqual(responses.length, expectedStandards, 'one StandardResponse per standard of the version');
                Assert(responses.every((r) => r.Status === 'Empty' && r.AuthorType === 'Human'), 'all responses are Empty/Human');
            });
        },
    },
    {
        Id: 'cred-invite.2',
        Name: 'inviting to a Draft version is refused with CanStart sentence and creates nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const displayName = `Draft Subject ${hex}`;
            const email = `draft.invite.${hex}@example.test`;

            await withFixtureIssuer('ok', async (recorder) => {
                const res = await executeInvite(
                    ctx,
                    world.StaffA,
                    world.SampleProgram.Version.ID,
                    { DisplayName: displayName, PrimaryEmail: email },
                    { Email: email, FirstName: 'Draft', LastName: 'Person' },
                );
                Assert(!res.Success, `InviteApplicant to Draft version refused (${describe(res)})`);
                AssertEqual(res.ResultCode, OPERATION_REFUSED, 'ResultCode');
                AssertEqual(res.ErrorMessage, CAN_START_DRAFT_SENTENCE, 'CanStart sentence');
                AssertEqual(recorder.Calls.length, 0, 'issuer not called');
                AssertEqual(await CountRows(ctx, CredentialingEntity.Subject, `DisplayName = '${Quote(displayName)}'`), 0, 'no Subject created');
                AssertEqual(await CountRows(ctx, USERS_ENTITY, `LOWER(Email) = '${Quote(email)}'`), 0, 'no User created');
            });
        },
    },
    {
        Id: 'cred-invite.3',
        Name: 'staff-b inviting onto OrgA version, or staff-a inviting an OrgB subject, gets Record not found. and creates nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const email = `cross.org.${hex}@example.test`;

            await withFixtureIssuer('ok', async (recorder) => {
                const crossVersion = await executeInvite(
                    ctx,
                    world.StaffB,
                    world.ApplicantProgram.Version.ID,
                    { DisplayName: `Cross Org ${hex}`, PrimaryEmail: email },
                    { Email: email, FirstName: 'Cross', LastName: 'Org' },
                );
                Assert(!crossVersion.Success, 'staff-b on OrgA version refused');
                AssertEqual(crossVersion.ResultCode, OPERATION_REFUSED, 'ResultCode');
                AssertEqual(crossVersion.ErrorMessage, NOT_FOUND_REASON, 'not-found sentence');

                const crossSubject = await executeInvite(
                    ctx,
                    world.StaffA,
                    world.ApplicantProgram.Version.ID,
                    { ExistingSubjectID: world.Applicants.SubjectOrgB.ID },
                    { Email: email, FirstName: 'Cross', LastName: 'Subject' },
                );
                Assert(!crossSubject.Success, 'staff-a with OrgB subject refused');
                AssertEqual(crossSubject.ResultCode, OPERATION_REFUSED, 'ResultCode');
                AssertEqual(crossSubject.ErrorMessage, NOT_FOUND_REASON, 'not-found sentence');

                AssertEqual(recorder.Calls.length, 0, 'issuer not called');
                AssertEqual(await CountRows(ctx, USERS_ENTITY, `LOWER(Email) = '${Quote(email)}'`), 0, 'no User created');
            });
        },
    },
    {
        Id: 'cred-invite.4',
        Name: 'inviting the same subject onto the same active version again is refused with the open-application sentence and leaves one application',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const displayName = `Repeat Subject ${hex}`;
            const email = `repeat.${hex}@example.test`;

            await withFixtureIssuer('ok', async () => {
                const first = await executeInvite(
                    ctx,
                    world.StaffA,
                    world.ApplicantProgram.Version.ID,
                    { DisplayName: displayName, PrimaryEmail: email },
                    { Email: email, FirstName: 'Repeat', LastName: 'User' },
                );
                Assert(first.Success && first.Output != null, `first invite succeeds (${describe(first)})`);

                const second = await executeInvite(
                    ctx,
                    world.StaffA,
                    world.ApplicantProgram.Version.ID,
                    { DisplayName: displayName, PrimaryEmail: email },
                    { Email: email, FirstName: 'Repeat', LastName: 'User' },
                );
                Assert(!second.Success, 'duplicate invite refused');
                AssertEqual(second.ResultCode, OPERATION_REFUSED, 'ResultCode');
                AssertEqual(second.ErrorMessage, ALREADY_OPEN_SENTENCE, 'open-application sentence');
                AssertEqual(
                    await CountRows(
                        ctx,
                        CredentialingEntity.Application,
                        `SubjectID = '${Quote(first.Output.SubjectID)}' AND ProgramVersionID = '${Quote(world.ApplicantProgram.Version.ID)}'`,
                    ),
                    1,
                    'still one application',
                );
            });
        },
    },
    {
        Id: 'cred-invite.5',
        Name: 'inviting an internal account (staff.b@example.test) is refused with the internal-account sentence',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const displayName = `Internal Invite ${hex}`;

            await withFixtureIssuer('ok', async (recorder) => {
                const res = await executeInvite(
                    ctx,
                    world.StaffA,
                    world.ApplicantProgram.Version.ID,
                    { DisplayName: displayName, PrimaryEmail: `subj.${hex}@example.test` },
                    { Email: world.StaffB.Email, FirstName: 'Staff', LastName: 'B' },
                );
                Assert(!res.Success, 'internal email refused');
                AssertEqual(res.ResultCode, OPERATION_REFUSED, 'ResultCode');
                AssertEqual(res.ErrorMessage, INTERNAL_ACCOUNT_SENTENCE, 'internal-account sentence');
                AssertEqual(recorder.Calls.length, 0, 'issuer not called');
                AssertEqual(await CountRows(ctx, CredentialingEntity.Subject, `DisplayName = '${Quote(displayName)}'`), 0, 'no Subject created');
            });
        },
    },
    {
        Id: 'cred-invite.6',
        Name: 'an Applicant calling InviteApplicant or ReissueInvitation is refused with FORBIDDEN',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const applicant = world.Applicants.SubjectOne.Contacts[0];
            const contacts = await FindRows<{ ID: string }>(
                ctx,
                CredentialingEntity.SubjectContact,
                `SubjectID = '${Quote(world.Applicants.SubjectOne.ID)}'`,
                ['ID'],
            );
            Assert(contacts.length > 0, 'SubjectOne has a contact');

            await withFixtureIssuer('ok', async (recorder) => {
                const inv = await executeInvite(
                    ctx,
                    applicant,
                    world.ApplicantProgram.Version.ID,
                    { DisplayName: `Forbidden ${hex}`, PrimaryEmail: `forbid.${hex}@example.test` },
                    { Email: `forbid.${hex}@example.test`, FirstName: 'Forbid', LastName: 'User' },
                );
                Assert(!inv.Success, 'Applicant cannot call InviteApplicant');
                AssertEqual(inv.ResultCode, 'FORBIDDEN', 'InviteApplicant ResultCode');

                const reissue = await executeReissue(ctx, applicant, contacts[0].ID);
                Assert(!reissue.Success, 'Applicant cannot call ReissueInvitation');
                AssertEqual(reissue.ResultCode, 'FORBIDDEN', 'ReissueInvitation ResultCode');
                AssertEqual(recorder.Calls.length, 0, 'issuer not called');
            });
        },
    },
    {
        Id: 'cred-invite.9',
        Name: 'staff-a still cannot create an MJ: Magic Link Invites row by entity save',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const email = `direct.invite.${runHex()}@example.test`;
            const role = ctx.Provider.Roles.find((r) => r.Name === CREDENTIALING_APPLICANT_ROLE);
            const app = ctx.Provider.Applications.find((a) => a.Name === CREDENTIALING_APPLICATION);
            Assert(role != null && app != null, 'Credentialing role and application exist');

            const invite = await ctx.Provider.GetEntityObject<MJMagicLinkInviteEntity>(MAGIC_LINK_INVITES_ENTITY, world.StaffA);
            invite.NewRecord();
            invite.TokenHash = 'a'.repeat(43);
            invite.Email = email;
            invite.ApplicationID = app.ID;
            invite.RoleID = role.ID;
            invite.ExpiresAt = new Date(Date.now() + 3600 * 1000);
            invite.MaxUses = 1;
            invite.UseCount = 0;
            invite.CreatedByUserID = world.StaffA.ID;
            invite.Status = 'Active';

            const saved = await invite.Save();
            AssertEqual(saved, false, 'direct save of MJ: Magic Link Invites by staff-a is refused');
            AssertEqual(await CountRows(ctx, MAGIC_LINK_INVITES_ENTITY, `Email = '${Quote(email)}'`), 0, 'no invite row created');
        },
    },
    {
        Id: 'cred-invite.11',
        Name: 'if issuing fails, InviteApplicant still succeeds with InvitationNote and commits the application; ReissueInvitation then returns a link',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const displayName = `Issuer Outage ${hex}`;
            const email = `outage.${hex}@example.test`;

            const invited = await withFixtureIssuer('throw', async (recorder) => {
                const res = await executeInvite(
                    ctx,
                    world.StaffA,
                    world.ApplicantProgram.Version.ID,
                    { DisplayName: displayName, PrimaryEmail: email },
                    { Email: email, FirstName: 'Outage', LastName: 'User' },
                );
                Assert(res.Success && res.Output != null, `InviteApplicant succeeds despite issuer failure (${describe(res)})`);
                AssertEqual(recorder.Calls.length, 1, 'throwing issuer called once');
                AssertEqual(recorder.Calls[0], email.toLowerCase(), 'throwing issuer was called');
                AssertEqual(res.Output.EmailSent, false, 'EmailSent');
                AssertEqual(res.Output.InvitationUrl, null, 'InvitationUrl is null');
                AssertEqual(res.Output.ExpiresAt, null, 'ExpiresAt is null');
                AssertEqual(res.Output.InvitationNote, INVITATION_FAILED_NOTE, 'InvitationNote matches');
                return res.Output;
            });

            AssertEqual(
                await CountRows(ctx, CredentialingEntity.Application, `ID = '${Quote(invited.ApplicationID)}' AND Status = 'Draft'`),
                1,
                'Draft application committed',
            );
            const contacts = await FindRows<{ ID: string }>(
                ctx,
                CredentialingEntity.SubjectContact,
                `SubjectID = '${Quote(invited.SubjectID)}' AND UserID = '${Quote(invited.ContactUserID)}'`,
                ['ID'],
            );
            AssertEqual(contacts.length, 1, 'SubjectContact committed');

            await withFixtureIssuer('ok', async (recorder) => {
                const reissued = await executeReissue(ctx, world.StaffA, contacts[0].ID);
                Assert(reissued.Success && reissued.Output != null, `ReissueInvitation succeeds (${describe(reissued)})`);
                AssertEqual(recorder.Calls.length, 1, 'reissue issuer called once');
                AssertEqual(recorder.Calls[0], email.toLowerCase(), 'issuer called with contact email');
                Assert(reissued.Output.InvitationUrl != null, 'InvitationUrl returned');
                AssertEqual(reissued.Output.InvitationNote, null, 'InvitationNote cleared');
            });
        },
    },
    {
        Id: 'cred-invite.12',
        Name: 'inviting an existing external user creates no second user and UserCache holds Credentialing Applicant immediately',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const email = `external.reviewer.${hex}@example.test`;
            await EnsureUser(ctx, email, `Reviewer${hex}`, [CREDENTIALING_REVIEWER_ROLE], 'External');
            await UserCache.Instance.RefreshNow();

            await withFixtureIssuer('ok', async () => {
                const res = await executeInvite(
                    ctx,
                    world.StaffA,
                    world.ApplicantProgram.Version.ID,
                    { DisplayName: `Existing External ${hex}`, PrimaryEmail: email },
                    { Email: email, FirstName: 'External', LastName: `Reviewer${hex}` },
                );
                Assert(res.Success && res.Output != null, `InviteApplicant for external user succeeds (${describe(res)})`);
                AssertEqual(
                    await CountRows(ctx, USERS_ENTITY, `LOWER(Email) = '${Quote(email.toLowerCase())}'`),
                    1,
                    'no second User row created',
                );
                const cached = UserCache.Instance.Users.find((u) => (u.Email ?? '').trim().toLowerCase() === email.toLowerCase());
                Assert(cached != null, 'user is in UserCache');
                Assert(
                    cached.UserRoles.some((r) => (r.Role ?? '').trim() === CREDENTIALING_APPLICANT_ROLE),
                    'cached user immediately holds Credentialing Applicant role',
                );
            });
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
