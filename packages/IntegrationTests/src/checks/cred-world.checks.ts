/**
 * `cred-world` and `cred-users` — world seeding and self-repairing tree verification.
 *
 * `cred-world` runs on both transports: `pnpm run seed:dev` executes it over GraphQL as the
 * System user, and `mj test run --name "CRD-06 - World"` runs it on the server transport. The
 * applicant world (subjects, contacts, applications, responses) is written only on the server
 * transport, through the operation-only write path (`world/applicant-world.ts`); over GraphQL it is
 * found, and a missing one fails with the command that writes it.
 * `cred-users` runs `EnsureWorldUsers` only (users, roles, and app access — no organization),
 * used by `pnpm run seed:users` for first-run setup verification.
 *
 * This module imports nothing from `@mj-biz-apps/credentialing-core-entities-server`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { UserInfo } from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import { GraphQLDataProvider } from '@memberjunction/graphql-dataprovider';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import { CREDENTIALING_APPLICANT_ROLE, CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { CountRows, FindRows, Quote, RequireDelete } from '../wire.js';
import { ADMIN_ROLE, APPLICANT_ROLE, EnsureWorldUsers, GetOrLoadWorld, LoadWorld, STAFF_ROLE, UI_ROLE } from '../world/load-world.js';
import { PLACEHOLDER_PROGRAM_NAME } from '../world/placeholder-organization-program.js';
import { EnsureProgramTree, type ProgramTree, type ProgramTreeSpec, type SectionSpec, type StandardSpec } from '../world/program-tree.js';
import type { CredentialingWorld } from '../world/world.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const FIXTURE_DIR = path.join(REPO_ROOT, 'packages', 'Server', 'src', 'evidence', '__fixtures__');
const FIXTURE_GENERATOR = path.join(REPO_ROOT, 'scripts', 'dev', 'make-evidence-fixtures.mjs');
const ISSUER_EMAIL = 'admin@memberjunction.org';
const CREDENTIALING_APPLICATION = 'Credentialing';
const APPLICANT_B_EMAIL = 'applicant.b@example.test';
const APPLICANT_A_EMAIL = 'applicant.a@example.test';

interface StandardSummaryRow {
    ID: string;
    Code: string;
    ResponseType: string;
    IntakeMode: string;
    EvidenceHint: string | null;
    IsInterpretive: boolean;
    IsNewForVersion: boolean;
}

interface VersionSummaryRow {
    ID: string;
    Status: string;
}

interface RequirementSummaryRow {
    ID: string;
    Name: string;
    IsRequired: boolean;
    SensitivityPolicy: string;
}

/** cred-world.2's assertions: a partially deleted tree is repaired and its surviving rows keep their IDs. */
async function verifyRepair(ctx: IntegrationCheckContext, spec: ProgramTreeSpec, first: ProgramTree): Promise<void> {
    AssertEqual(first.Sections.length, 3, 'initial sections');
    AssertEqual(first.Sections.reduce((sum, s) => sum + s.Standards.length, 0), 6, 'initial standards');

    const deletedSection = first.Sections[1];
    for (const standard of deletedSection.Standards) {
        await RequireDelete(standard, `repair standard ${standard.Code}`);
    }
    await RequireDelete(deletedSection.Section, `repair section ${deletedSection.Section.Number}`);

    AssertEqual(
        await CountRows(ctx, CredentialingEntity.Section, `ProgramVersionID = '${Quote(first.Version.ID)}'`),
        2,
        'sections after partial delete',
    );
    AssertEqual(
        await CountRows(ctx, CredentialingEntity.Standard, `ProgramVersionID = '${Quote(first.Version.ID)}'`),
        4,
        'standards after partial delete',
    );

    const repaired = await EnsureProgramTree(ctx, spec, ctx.User);
    AssertEqual(repaired.Sections.length, 3, 'repaired sections');
    AssertEqual(repaired.Sections.reduce((sum, s) => sum + s.Standards.length, 0), 6, 'repaired standards');
    AssertEqual(
        await CountRows(ctx, CredentialingEntity.Section, `ProgramVersionID = '${Quote(first.Version.ID)}'`),
        3,
        'stored sections after repair',
    );
    AssertEqual(
        await CountRows(ctx, CredentialingEntity.Standard, `ProgramVersionID = '${Quote(first.Version.ID)}'`),
        6,
        'stored standards after repair',
    );

    Assert(UUIDsEqual(repaired.Program.ID, first.Program.ID), 'program kept its ID');
    Assert(UUIDsEqual(repaired.Version.ID, first.Version.ID), 'version kept its ID');
    for (const survivingIndex of [0, 2]) {
        Assert(
            UUIDsEqual(repaired.Sections[survivingIndex].Section.ID, first.Sections[survivingIndex].Section.ID),
            `surviving section ${survivingIndex + 1} kept its ID`,
        );
        for (let j = 0; j < 2; j++) {
            Assert(
                UUIDsEqual(repaired.Sections[survivingIndex].Standards[j].ID, first.Sections[survivingIndex].Standards[j].ID),
                `surviving standard ${survivingIndex + 1}.${j + 1} kept its ID`,
            );
        }
    }
    Assert(
        !UUIDsEqual(repaired.Sections[1].Section.ID, deletedSection.Section.ID),
        'deleted section was recreated with a new ID',
    );
}

function hasRole(user: UserInfo, roleName: string): boolean {
    return user.UserRoles.some((r) => r.Role === roleName);
}

function buildRepairSpec(organizationID: string): ProgramTreeSpec {
    const hex = randomUUID().replace(/-/g, '').slice(0, 8);
    const sections: SectionSpec[] = [];
    for (let s = 1; s <= 3; s++) {
        const standards: StandardSpec[] = [];
        for (let n = 1; n <= 2; n++) {
            standards.push({
                Code: `${s}.${n}`,
                Statement: `Repair check standard ${s}.${n}.`,
                ResponseType: 'Attestation',
                Sequence: n,
            });
        }
        sections.push({ Number: `${s}`, Name: `Repair section ${s}`, Sequence: s, Standards: standards });
    }
    return {
        AccreditingOrganizationID: organizationID,
        Program: {
            Name: `Repair ${hex}`,
            ProgramType: 'Certification',
            SubjectType: 'Person',
            SubjectNoun: 'professional',
            CredentialPrefix: `R${hex.toUpperCase()}`,
        },
        Version: { Label: '2027', CommitteeID: null },
        Sections: sections,
        DocumentRequirements: [],
    };
}

async function verifyPlaceholderProgram(ctx: IntegrationCheckContext, world: CredentialingWorld): Promise<string> {
    AssertEqual(world.PlaceholderProgram.Program.Name, PLACEHOLDER_PROGRAM_NAME, 'world placeholder program name');
    AssertEqual(world.PlaceholderProgram.Sections.length, 12, 'world placeholder sections');
    AssertEqual(
        world.PlaceholderProgram.Sections.reduce((sum, s) => sum + s.Standards.length, 0),
        36,
        'world placeholder standards',
    );
    AssertEqual(world.PlaceholderProgram.DocumentRequirements.length, 5, 'world placeholder document requirements');

    const programs = await FindRows<{ ID: string }>(
        ctx,
        CredentialingEntity.Program,
        `AccreditingOrganizationID = '${Quote(world.OrgA.ID)}' AND Name = '${Quote(PLACEHOLDER_PROGRAM_NAME)}'`,
        ['ID'],
    );
    AssertEqual(programs.length, 1, 'placeholder program count in OrgA');
    Assert(UUIDsEqual(world.PlaceholderProgram.Program.ID, programs[0].ID), 'placeholder program ID matches stored row');

    const versions = await FindRows<VersionSummaryRow>(
        ctx,
        CredentialingEntity.ProgramVersion,
        `ProgramID = '${Quote(programs[0].ID)}' AND Label = '2027'`,
        ['ID', 'Status'],
    );
    AssertEqual(versions.length, 1, 'placeholder version count');
    AssertEqual(versions[0].Status, 'Draft', 'placeholder version status');
    const versionID = versions[0].ID;

    AssertEqual(await CountRows(ctx, CredentialingEntity.Section, `ProgramVersionID = '${Quote(versionID)}'`), 12, 'placeholder sections');
    await verifyPlaceholderStandards(ctx, versionID);
    await verifyPlaceholderRequirements(ctx, versionID);
    return versionID;
}

async function verifyPlaceholderStandards(ctx: IntegrationCheckContext, versionID: string): Promise<void> {
    const standards = await FindRows<StandardSummaryRow>(
        ctx,
        CredentialingEntity.Standard,
        `ProgramVersionID = '${Quote(versionID)}'`,
        ['ID', 'Code', 'ResponseType', 'IntakeMode', 'EvidenceHint', 'IsInterpretive', 'IsNewForVersion'],
    );
    AssertEqual(standards.length, 36, 'placeholder standards');
    AssertEqual(standards.filter((s) => s.IsInterpretive).length, 1, 'interpretive standards in placeholder program');

    const s41 = standards.find((s) => s.Code === '4.1');
    Assert(s41 != null, 'standard 4.1 exists');
    AssertEqual(s41.ResponseType, 'Evidence', '4.1 response type');
    AssertEqual(s41.IntakeMode, 'Prefill', '4.1 intake mode');
    AssertEqual(s41.EvidenceHint, 'Audited financial statements, notes to the financial statements', '4.1 evidence hint');

    const s123 = standards.find((s) => s.Code === '12.3');
    Assert(s123 != null && s123.IsInterpretive, 'standard 12.3 is interpretive');
    AssertEqual(s123.ResponseType, 'Narrative', '12.3 response type');

    const section12 = standards.filter((s) => s.Code.startsWith('12.'));
    AssertEqual(section12.length, 3, 'section 12 standards');
    Assert(section12.every((s) => s.IsNewForVersion), 'section 12 standards have IsNewForVersion = true');
}

async function verifyPlaceholderRequirements(ctx: IntegrationCheckContext, versionID: string): Promise<void> {
    const requirements = await FindRows<RequirementSummaryRow>(
        ctx,
        CredentialingEntity.DocumentRequirement,
        `ProgramVersionID = '${Quote(versionID)}'`,
        ['ID', 'Name', 'IsRequired', 'SensitivityPolicy'],
    );
    AssertEqual(requirements.length, 5, 'placeholder document requirements');
    AssertEqual(requirements.filter((r) => r.IsRequired && r.SensitivityPolicy === 'Normal').length, 3, 'required Normal document requirements');
    AssertEqual(
        requirements.filter((r) => !r.IsRequired && r.SensitivityPolicy === 'Restricted Allowed').length,
        2,
        'optional Restricted Allowed document requirements',
    );
}

/** Entities whose total row count a second world load must leave unchanged (the applicant world and the committees). */
const COUNTED_ENTITIES: readonly string[] = [
    CredentialingEntity.Subject,
    CredentialingEntity.SubjectContact,
    CredentialingEntity.Application,
    CredentialingEntity.StandardResponse,
    'Committees: Committees',
    'MJ_BizApps_Common: People',
];

async function countAll(ctx: IntegrationCheckContext): Promise<number[]> {
    const counts: number[] = [];
    for (const entityName of COUNTED_ENTITIES) {
        counts.push(await CountRows(ctx, entityName, ''));
    }
    return counts;
}

/** The applicant world's shape: three subjects, subject one with two contacts, each with a Draft application on an Active version. */
function verifyApplicantWorld(world: CredentialingWorld): void {
    const { SubjectOne, SubjectTwo, SubjectOrgB } = world.Applicants;
    AssertEqual(world.ApplicantProgram.Version.Status, 'Active', 'the sample Active version (OrgA) is Active');
    AssertEqual(world.ApplicantProgramB.Version.Status, 'Active', 'OrgB applicant version is Active');
    AssertEqual(SubjectOne.Contacts.length, 2, 'Sample Applicant One contacts');
    Assert(UUIDsEqual(SubjectOne.Contacts[0].ID, world.ApplicantA.ID), 'ApplicantA is the primary contact of Sample Applicant One');
    AssertEqual(SubjectTwo.Contacts.length, 2, 'Sample Applicant Two contacts');
    AssertEqual(SubjectOrgB.Contacts.length, 1, 'Sample Applicant Org B contacts');
    AssertEqual(world.LargeProgram.Sections.length, 10, 'Sample Large Program sections');
    AssertEqual(
        world.LargeProgram.Sections.reduce((sum, s) => sum + s.Standards.length, 0),
        150,
        'Sample Large Program standards',
    );
    Assert(SubjectTwo.LargeApplicationID != null, 'Sample Applicant Two holds a LargeProgram application');
    Assert(UUIDsEqual(SubjectOne.AccreditingOrganizationID, world.OrgA.ID) && UUIDsEqual(SubjectTwo.AccreditingOrganizationID, world.OrgA.ID), 'two subjects in OrgA');
    Assert(UUIDsEqual(SubjectOrgB.AccreditingOrganizationID, world.OrgB.ID), 'one subject in OrgB');
    AssertEqual(SubjectOne.ResponseIDs.length, 3, 'responses of Sample Applicant One (one per standard)');
    AssertEqual(SubjectTwo.ResponseIDs.length, 3, 'responses of Sample Applicant Two');
    AssertEqual(SubjectOrgB.ResponseIDs.length, 2, 'responses of Sample Applicant Org B');
}

function loadFixtureBytes(fileName: string): Buffer {
    const file = path.join(FIXTURE_DIR, fileName);
    if (!existsSync(file)) {
        execFileSync(process.execPath, [FIXTURE_GENERATOR, '--only', fileName], { stdio: 'ignore' });
    }
    return readFileSync(file);
}

interface MagicTokenResponse {
    token?: string;
    error?: string;
    rawToken?: string;
    redemptionUrl?: string;
}

async function postJson(baseUrl: string, route: string, body: object, token?: string): Promise<{ Status: number; Body: MagicTokenResponse }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token != null) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(new URL(route, baseUrl), { method: 'POST', headers, body: JSON.stringify(body) });
    return { Status: response.status, Body: (await response.json()) as MagicTokenResponse };
}

async function redeemMagicLink(provider: GraphQLDataProvider, email: string): Promise<string> {
    const baseUrl = provider.ConfigData.URL;
    const application = provider.Applications.find((a) => a.Name === CREDENTIALING_APPLICATION);
    const role = provider.Roles.find((r) => r.Name === CREDENTIALING_APPLICANT_ROLE);
    Assert(application != null && role != null, 'Credentialing application and Credentialing Applicant role exist in metadata');

    const devLogin = await postJson(baseUrl, '/auth/dev-login', { email: ISSUER_EMAIL });
    Assert(devLogin.Status === 200 && devLogin.Body.token != null, `dev-login as ${ISSUER_EMAIL} (${devLogin.Status}): ${devLogin.Body.error ?? ''}`);

    const invite = await postJson(
        baseUrl,
        '/magic-link/create',
        { email, ApplicationId: application.ID, RoleId: role.ID, ExpiresInHours: 1, MaxUses: 1, SendEmail: false },
        devLogin.Body.token,
    );
    const raw = invite.Body.rawToken ?? (invite.Body.redemptionUrl != null ? new URL(invite.Body.redemptionUrl).searchParams.get('token') : null);
    Assert(invite.Status === 200 && raw != null, `magic-link/create for ${email} (${invite.Status}): ${invite.Body.error ?? ''}`);

    const redeemed = await postJson(baseUrl, '/magic-link/redeem?format=json', { token: raw });
    Assert(redeemed.Status === 200 && redeemed.Body.token != null, `magic-link/redeem for ${email} (${redeemed.Status}): ${redeemed.Body.error ?? ''}`);
    return redeemed.Body.token;
}

async function uploadSampleDocument(
    provider: GraphQLDataProvider,
    contactEmail: string,
    subjectID: string,
    requirementID: string | null,
    fileName: string,
    fixtureName: string,
): Promise<void> {
    const token = await redeemMagicLink(provider, contactEmail);
    const query = new URLSearchParams({ subjectId: subjectID, fileName });
    if (requirementID != null) query.set('requirementId', requirementID);
    const bytes = loadFixtureBytes(fixtureName);
    const response = await fetch(new URL(`/credentialing/evidence?${query.toString()}`, provider.ConfigData.URL), {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/octet-stream',
        },
        body: new Uint8Array(bytes),
    });
    const text = await response.text();
    AssertEqual(response.status, 201, `uploading ${fileName} for ${contactEmail} (${text.slice(0, 200)})`);
}

/**
 * Ensures the sample uploaded documents exist in the real evidence store when running on the client
 * transport (`pnpm run seed:dev`), idempotently:
 * - applicant-b (`Sample Applicant Two`): one requirement upload on `Degree certificate` (`two-page-text.pdf`)
 * - applicant-a (`Sample Applicant One`): one general upload (`review-notes.docx`)
 */
async function ensureSampleDocuments(ctx: IntegrationCheckContext, world: CredentialingWorld): Promise<void> {
    if (!(ctx.Provider instanceof GraphQLDataProvider)) {
        return;
    }
    const requirementID = world.ApplicantProgram.DocumentRequirements[0]?.ID ?? null;
    Assert(requirementID != null, 'Sample Applicant Program has its document requirement');

    const subjectTwoDocs = await FindRows<{ ID: string }>(
        ctx,
        CredentialingEntity.EvidenceDocument,
        `SubjectID = '${Quote(world.Applicants.SubjectTwo.ID)}' AND DocumentRequirementID = '${Quote(requirementID)}' AND Status <> 'Superseded'`,
        ['ID'],
    );
    if (subjectTwoDocs.length === 0) {
        await uploadSampleDocument(
            ctx.Provider,
            APPLICANT_B_EMAIL,
            world.Applicants.SubjectTwo.ID,
            requirementID,
            'degree-certificate.pdf',
            'two-page-text.pdf',
        );
    }

    const subjectOneDocs = await FindRows<{ ID: string }>(
        ctx,
        CredentialingEntity.EvidenceDocument,
        `SubjectID = '${Quote(world.Applicants.SubjectOne.ID)}' AND DocumentRequirementID IS NULL AND Status <> 'Superseded'`,
        ['ID'],
    );
    if (subjectOneDocs.length === 0) {
        await uploadSampleDocument(
            ctx.Provider,
            APPLICANT_A_EMAIL,
            world.Applicants.SubjectOne.ID,
            null,
            'applicant-a-notes.docx',
            'review-notes.docx',
        );
    }
}

async function verifyReloadIdempotency(ctx: IntegrationCheckContext, world: CredentialingWorld, versionID: string): Promise<void> {
    const beforePrograms = await CountRows(ctx, CredentialingEntity.Program, `AccreditingOrganizationID = '${Quote(world.OrgA.ID)}'`);
    const beforeOrgs = await CountRows(ctx, CredentialingEntity.AccreditingOrganization, '');
    const beforeUsers = await CountRows(ctx, 'MJ: Users', `Email LIKE '%@example.test'`);
    const beforeDocs = await CountRows(ctx, CredentialingEntity.EvidenceDocument, '');
    const beforeFiles = await CountRows(ctx, 'MJ: Files', '');
    const beforeCounts = await countAll(ctx);

    // Bypass the in-memory singleton cache so the full ensure pass runs against the database again.
    await LoadWorld(ctx);
    await ensureSampleDocuments(ctx, world);

    AssertEqual(
        await CountRows(ctx, CredentialingEntity.Program, `AccreditingOrganizationID = '${Quote(world.OrgA.ID)}'`),
        beforePrograms,
        'OrgA programs unchanged after second load',
    );
    AssertEqual(
        await CountRows(ctx, CredentialingEntity.Section, `ProgramVersionID = '${Quote(versionID)}'`),
        12,
        'placeholder sections unchanged after second load',
    );
    AssertEqual(
        await CountRows(ctx, CredentialingEntity.Standard, `ProgramVersionID = '${Quote(versionID)}'`),
        36,
        'placeholder standards unchanged after second load',
    );
    AssertEqual(
        await CountRows(ctx, CredentialingEntity.DocumentRequirement, `ProgramVersionID = '${Quote(versionID)}'`),
        5,
        'placeholder requirements unchanged after second load',
    );
    AssertEqual(
        await CountRows(ctx, CredentialingEntity.AccreditingOrganization, ''),
        beforeOrgs,
        'accrediting organizations unchanged after second load',
    );
    AssertEqual(
        await CountRows(ctx, 'MJ: Users', `Email LIKE '%@example.test'`),
        beforeUsers,
        'world users unchanged after second load',
    );
    AssertEqual(
        await CountRows(ctx, CredentialingEntity.EvidenceDocument, ''),
        beforeDocs,
        'evidence documents unchanged after second load',
    );
    AssertEqual(
        await CountRows(ctx, 'MJ: Files', ''),
        beforeFiles,
        'MJ: Files unchanged after second load',
    );
    const afterCounts = await countAll(ctx);
    COUNTED_ENTITIES.forEach((entityName, i) => AssertEqual(afterCounts[i], beforeCounts[i], `${entityName} rows unchanged after second load`));
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-world.1',
        Name: 'placeholder program has 12 sections, 36 standards, 5 requirements, 1 interpretive standard; the applicant world has its three subjects; both reload idempotently',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            verifyApplicantWorld(world);
            await ensureSampleDocuments(ctx, world);
            const versionID = await verifyPlaceholderProgram(ctx, world);
            await verifyReloadIdempotency(ctx, world, versionID);
        },
    },
    {
        Id: 'cred-world.2',
        Name: 'EnsureProgramTree repairs a partially deleted tree while preserving surviving IDs',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const spec = buildRepairSpec(world.OrgA.ID);
            const first = await EnsureProgramTree(ctx, spec, ctx.User);
            try {
                await verifyRepair(ctx, spec, first);
            } finally {
                // The tree is scratch: a Draft version's delete removes its sections and standards
                // (ProgramVersionEntityServer), so seeding twice leaves nothing new behind.
                await RequireDelete(first.Version, `repair version of ${spec.Program.Name}`);
                await RequireDelete(first.Program, `repair program ${spec.Program.Name}`);
            }
            AssertEqual(
                await CountRows(ctx, CredentialingEntity.Program, `Name = '${Quote(spec.Program.Name)}'`),
                0,
                'the repair check leaves no program behind',
            );
        },
    },
    {
        Id: 'cred-users.1',
        Name: 'EnsureWorldUsers provisions the six world accounts and their roles without creating organizations',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const beforeOrgs = await CountRows(ctx, CredentialingEntity.AccreditingOrganization, '');
            const users = await EnsureWorldUsers(ctx);
            Assert(hasRole(users.StaffA, STAFF_ROLE), 'StaffA holds Credentialing Staff');
            Assert(hasRole(users.StaffB, STAFF_ROLE), 'StaffB holds Credentialing Staff');
            Assert(hasRole(users.StaffNoMembership, STAFF_ROLE), 'StaffNoMembership holds Credentialing Staff');
            Assert(hasRole(users.Admin, ADMIN_ROLE), 'Admin holds Credentialing Admin');
            Assert(hasRole(users.UIOnly, UI_ROLE), 'UIOnly holds UI');
            Assert(hasRole(users.ApplicantA, APPLICANT_ROLE), 'ApplicantA holds Credentialing Applicant');
            AssertEqual(
                await CountRows(ctx, CredentialingEntity.AccreditingOrganization, ''),
                beforeOrgs,
                'EnsureWorldUsers creates no accrediting organizations',
            );
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
