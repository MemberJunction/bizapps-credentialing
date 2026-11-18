/**
 * `cred-applicant-world` (`CRD-15 - Applicant world`) — verifies the full B2 applicant world
 * (five subjects across OrgA and OrgB, party records, contacts, roles, application grants, Draft
 * applications on Active versions, reading sources) and proves reloading `LoadWorld` creates nothing.
 *
 * Server transport (`mj test run --name "CRD-15 - Applicant world"`), because the applicant world is
 * written on the server transport through `OperationWrite`. Every RunView passes `IgnoreMaxRows: true`.
 */
import { UUIDsEqual } from '@memberjunction/global';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import { CREDENTIALING_APPLICANT_ROLE, CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { CountRows, FindRows, Quote } from '../wire.js';
import { GetOrLoadWorld, LoadWorld } from '../world/load-world.js';
import type { CredentialingWorld, WorldSubject } from '../world/world.js';

interface StoredSubjectRow {
    ID: string;
    AccreditingOrganizationID: string;
    SubjectType: string;
    DisplayName: string;
    PrimaryEmail: string;
    Status: string;
    PartyEntityID: string | null;
    PartyRecordID: string | null;
}

interface StoredContactRow {
    ID: string;
    UserID: string;
    ContactRole: string;
}

const COUNTED_WORLD_ENTITIES: readonly string[] = [
    CredentialingEntity.Subject,
    CredentialingEntity.SubjectContact,
    CredentialingEntity.Application,
    CredentialingEntity.StandardResponse,
    CredentialingEntity.EvidenceDocument,
    CredentialingEntity.ResponseSource,
    CredentialingEntity.AccreditingOrganization,
    CredentialingEntity.Program,
    CredentialingEntity.ProgramVersion,
    CredentialingEntity.Section,
    CredentialingEntity.Standard,
    CredentialingEntity.DocumentRequirement,
    'MJ: Users',
    'MJ: User Roles',
    'MJ: User Applications',
    'MJ_BizApps_Common: People',
    'Committees: Committees',
];

async function verifySubjectShape(
    ctx: IntegrationCheckContext,
    subject: WorldSubject,
    expectedOrgID: string,
    expectedVersionID: string,
    expectedResponseCount: number,
    expectedContactEmails: readonly string[],
): Promise<void> {
    const peopleEntityID = ctx.Provider.EntityByName('MJ_BizApps_Common: People')?.ID ?? '';
    Assert(peopleEntityID.length > 0, 'MJ_BizApps_Common: People entity is registered');

    const rows = await FindRows<StoredSubjectRow>(
        ctx,
        CredentialingEntity.Subject,
        `ID = '${Quote(subject.ID)}'`,
        ['ID', 'AccreditingOrganizationID', 'SubjectType', 'DisplayName', 'PrimaryEmail', 'Status', 'PartyEntityID', 'PartyRecordID'],
    );
    AssertEqual(rows.length, 1, `one Subject row for ${subject.DisplayName}`);
    const row = rows[0];
    Assert(UUIDsEqual(row.AccreditingOrganizationID, expectedOrgID), `${subject.DisplayName} organization`);
    AssertEqual(row.SubjectType, 'Person', `${subject.DisplayName} subject type`);
    AssertEqual(row.Status, 'Active', `${subject.DisplayName} status`);
    Assert(row.PartyEntityID != null && UUIDsEqual(row.PartyEntityID, peopleEntityID), `${subject.DisplayName} PartyEntityID is People`);
    Assert(row.PartyRecordID != null && row.PartyRecordID.length > 0, `${subject.DisplayName} PartyRecordID is set`);

    const people = await FindRows<{ ID: string }>(ctx, 'MJ_BizApps_Common: People', `ID = '${Quote(row.PartyRecordID)}'`, ['ID']);
    AssertEqual(people.length, 1, `${subject.DisplayName} Common person exists`);

    const contacts = await FindRows<StoredContactRow>(
        ctx,
        CredentialingEntity.SubjectContact,
        `SubjectID = '${Quote(subject.ID)}'`,
        ['ID', 'UserID', 'ContactRole'],
    );
    AssertEqual(contacts.length, expectedContactEmails.length, `${subject.DisplayName} contact count`);
    AssertEqual(subject.Contacts.length, expectedContactEmails.length, `${subject.DisplayName} world contact list length`);

    const appRows = await FindRows<{ ID: string; Status: string; IsHistorical: boolean }>(
        ctx,
        CredentialingEntity.Application,
        `SubjectID = '${Quote(subject.ID)}' AND ProgramVersionID = '${Quote(expectedVersionID)}' AND Status = 'Draft' AND IsHistorical = 0`,
        ['ID', 'Status', 'IsHistorical'],
    );
    AssertEqual(appRows.length, 1, `${subject.DisplayName} has one Draft application on expected version`);
    Assert(UUIDsEqual(appRows[0].ID, subject.ApplicationID), `${subject.DisplayName} ApplicationID matches`);

    const responses = await FindRows<{ ID: string; Status: string }>(
        ctx,
        CredentialingEntity.StandardResponse,
        `ApplicationID = '${Quote(subject.ApplicationID)}'`,
        ['ID', 'Status'],
    );
    AssertEqual(responses.length, expectedResponseCount, `${subject.DisplayName} response count`);

    const apps = await FindRows<{ ID: string }>(ctx, 'MJ: Applications', `Name = 'Credentialing'`, ['ID']);
    AssertEqual(apps.length, 1, 'Credentialing application exists');
    const credAppID = apps[0].ID;

    for (const [index, email] of expectedContactEmails.entries()) {
        const contactUser = subject.Contacts[index];
        AssertEqual(contactUser.Email.toLowerCase(), email.toLowerCase(), `${subject.DisplayName} contact ${index} email`);
        Assert(
            contactUser.UserRoles.some((r) => r.Role === CREDENTIALING_APPLICANT_ROLE),
            `${email} holds ${CREDENTIALING_APPLICANT_ROLE}`,
        );
        const match = contacts.find((c) => UUIDsEqual(c.UserID, contactUser.ID));
        Assert(match != null, `${email} has SubjectContact row on ${subject.DisplayName}`);
        AssertEqual(match.ContactRole, index === 0 ? 'Primary' : 'Staff', `${email} ContactRole on ${subject.DisplayName}`);

        const userApps = await FindRows<{ ID: string }>(
            ctx,
            'MJ: User Applications',
            `UserID = '${Quote(contactUser.ID)}' AND ApplicationID = '${Quote(credAppID)}' AND IsActive = 1`,
            ['ID'],
        );
        AssertEqual(userApps.length, 1, `${email} has active Credentialing application row`);
    }
}

async function verifyProgramsAndSources(ctx: IntegrationCheckContext, world: CredentialingWorld): Promise<void> {
    AssertEqual(world.ApplicantProgram.Version.Status, 'Active', 'Sample Applicant Program 2026 is Active');
    AssertEqual(world.ApplicantProgramB.Version.Status, 'Active', 'Sample Program B Applicants 2026 is Active');
    AssertEqual(world.LargeProgram.Version.Status, 'Active', 'Sample Large Program 2026 is Active');
    AssertEqual(world.EvidenceProgram.Version.Status, 'Active', 'Sample Evidence Program 2026 is Active');
    AssertEqual(world.ReadingProgram.Version.Status, 'Active', 'Sample Reading Program 2026 is Active');

    const readingSources = await FindRows<{ ID: string; StandardID: string; SourceType: string }>(
        ctx,
        CredentialingEntity.ResponseSource,
        `ProgramVersionID = '${Quote(world.ReadingProgram.Version.ID)}'`,
        ['ID', 'StandardID', 'SourceType'],
    );
    AssertEqual(readingSources.length, 2, 'Sample Reading Program has 2 Document Extraction sources (R.1 and R.2)');
    Assert(readingSources.every((s) => s.SourceType === 'Document Extraction'), 'all reading sources are Document Extraction');

    const two = world.Applicants.SubjectTwo;
    Assert(two.LargeApplicationID != null, 'Sample Applicant Two has a LargeApplicationID');
    const largeResponses = await CountRows(
        ctx,
        CredentialingEntity.StandardResponse,
        `ApplicationID = '${Quote(two.LargeApplicationID!)}'`,
    );
    AssertEqual(largeResponses, 150, 'Sample Applicant Two LargeProgram application has 150 responses');
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-applicant-world.1',
        Name: 'applicant world has expected subjects, party records, contacts, grants, Active versions, Draft applications and reading sources',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            await verifyProgramsAndSources(ctx, world);
            await verifySubjectShape(ctx, world.Applicants.SubjectOne, world.OrgA.ID, world.ApplicantProgram.Version.ID, 3, [
                'applicant.a@example.test',
                'applicant.two@example.test',
            ]);
            await verifySubjectShape(ctx, world.Applicants.SubjectTwo, world.OrgA.ID, world.ApplicantProgram.Version.ID, 3, [
                'applicant.b@example.test',
                'applicant.two@example.test',
            ]);
            await verifySubjectShape(ctx, world.Applicants.SubjectOrgB, world.OrgB.ID, world.ApplicantProgramB.Version.ID, 2, [
                'applicant.orgb@example.test',
            ]);
            await verifySubjectShape(ctx, world.Applicants.SubjectEvidence, world.OrgA.ID, world.EvidenceProgram.Version.ID, 2, [
                'applicant.evidence@example.test',
            ]);
            await verifySubjectShape(ctx, world.Applicants.SubjectReading, world.OrgA.ID, world.ReadingProgram.Version.ID, 3, [
                'applicant.reading@example.test',
            ]);
        },
    },
    {
        Id: 'cred-applicant-world.2',
        Name: 're-running LoadWorld creates no new rows in any world or applicant-data table',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            await GetOrLoadWorld(ctx);
            const beforeCounts: number[] = [];
            for (const entityName of COUNTED_WORLD_ENTITIES) {
                beforeCounts.push(await CountRows(ctx, entityName, ''));
            }

            await LoadWorld(ctx);

            for (const [i, entityName] of COUNTED_WORLD_ENTITIES.entries()) {
                const after = await CountRows(ctx, entityName, '');
                AssertEqual(after, beforeCounts[i], `${entityName} row count unchanged after reload`);
            }
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
