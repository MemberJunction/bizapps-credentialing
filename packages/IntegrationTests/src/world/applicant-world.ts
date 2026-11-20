import { CompositeKey, type BaseEntity, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { Assert, type IntegrationCheckContext } from '@memberjunction/testing-integration/registry';
import type { mjBizAppsCommonPersonEntity } from '@mj-biz-apps/common-entities';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingApplicationEntity,
    mjBizAppsCredentialingStandardResponseEntity,
    mjBizAppsCredentialingSubjectContactEntity,
    mjBizAppsCredentialingSubjectEntity,
} from '@mj-biz-apps/credentialing-entities';
import { FindRows, Quote } from '../wire.js';
import type { ProgramTree } from './program-tree.js';
import type { WorldSubject } from './world.js';

type SubjectEntity = mjBizAppsCredentialingSubjectEntity;
type SubjectContactEntity = mjBizAppsCredentialingSubjectContactEntity;
type ApplicationEntity = mjBizAppsCredentialingApplicationEntity;
type StandardResponseEntity = mjBizAppsCredentialingStandardResponseEntity;
type PersonEntity = mjBizAppsCommonPersonEntity;

/** The BizApps Common entity a person subject's party record lives in. */
const PEOPLE_ENTITY = 'MJ_BizApps_Common: People';

/** The one write the applicant world makes through the server's operation-only path. */
export interface ApplicantWorldScope {
    Save(entity: BaseEntity): Promise<void>;
}

/**
 * How the applicant world is written. Applicant data is saved only inside an operation's write scope
 * (`OperationWrite` in `@mj-biz-apps/credentialing-core-entities-server`), which exists only in the
 * server process. The package barrel (`src/index.ts`, loaded by `mj test run`) registers the writer;
 * the client harness (`seed:dev`) never loads the barrel, so there the applicant world is found, not
 * written.
 */
export interface ApplicantWorldWriter {
    /** The user the world's applicant rows are written as: the system user, as an invitation would. */
    WriterUser(): UserInfo;
    /** Runs `work` in one transaction on `provider`, with its saves admitted as operation writes. */
    Run<T>(provider: IMetadataProvider, work: (scope: ApplicantWorldScope) => Promise<T>): Promise<T>;
}

let writer: ApplicantWorldWriter | null = null;

/** Registers the applicant-world writer (server process only). */
export function SetApplicantWorldWriter(applicantWriter: ApplicantWorldWriter): void {
    writer = applicantWriter;
}

/** What one world subject is made of. */
export interface WorldSubjectSpec {
    AccreditingOrganizationID: string;
    DisplayName: string;
    FirstName: string;
    LastName: string;
    PrimaryEmail: string;
    /** Contact users, primary first. */
    Contacts: UserInfo[];
    /** The staff member recorded as having invited the contacts. */
    InvitedBy: UserInfo;
    /** The Active version the Draft application is on. */
    Program: ProgramTree;
}

/** The rows of one world subject that already exist, as the context user reads them. */
interface FoundSubject {
    Subject: { ID: string; PartyRecordID: string | null } | null;
    ContactUserIDs: string[];
    ApplicationID: string | null;
    AnsweredStandardIDs: string[];
}

/**
 * Finds or creates one world subject by (organization, display name): its Common person (party
 * record, found by email), the subject, each contact, the Draft application on `spec.Program`'s
 * Active version and one Empty response per standard. Missing rows are written in one transaction
 * as the system user, through the registered {@link ApplicantWorldWriter}; a run that finds every
 * row writes nothing, so loading the world twice creates nothing the second time.
 */
export async function EnsureWorldSubject(ctx: IntegrationCheckContext, spec: WorldSubjectSpec): Promise<WorldSubject> {
    Assert(spec.Program.Version.Status === 'Active', `the application version of ${spec.DisplayName} is Active`);
    const standardIDs = spec.Program.Sections.flatMap((s) => s.Standards.map((st) => st.ID));
    let found = await findSubject(ctx, spec);
    if (!isComplete(found, spec, standardIDs)) {
        if (writer == null) {
            throw new Error(
                `The applicant world (${spec.DisplayName}) is incomplete, and it is written only on the server transport: run ` +
                    `MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "CRD-06 - World" first.`,
            );
        }
        await writeSubject(ctx, writer, spec, found, standardIDs);
        found = await findSubject(ctx, spec);
        Assert(isComplete(found, spec, standardIDs), `the applicant world subject ${spec.DisplayName} is complete after writing it`);
    }
    const subjectID = found.Subject?.ID ?? '';
    const responses = await FindRows<{ ID: string }>(ctx, CredentialingEntity.StandardResponse, `ApplicationID = '${Quote(found.ApplicationID ?? '')}'`, ['ID']);
    return {
        ID: subjectID,
        DisplayName: spec.DisplayName,
        AccreditingOrganizationID: spec.AccreditingOrganizationID,
        Contacts: spec.Contacts,
        ApplicationID: found.ApplicationID ?? '',
        ResponseIDs: responses.map((r) => r.ID),
    };
}

function isComplete(found: FoundSubject, spec: WorldSubjectSpec, standardIDs: string[]): boolean {
    const contacts = new Set(found.ContactUserIDs.map((id) => id.toLowerCase()));
    const answered = new Set(found.AnsweredStandardIDs.map((id) => id.toLowerCase()));
    return (
        found.Subject != null &&
        found.Subject.PartyRecordID != null &&
        spec.Contacts.every((c) => contacts.has(c.ID.toLowerCase())) &&
        found.ApplicationID != null &&
        standardIDs.every((id) => answered.has(id.toLowerCase()))
    );
}

async function findSubject(ctx: IntegrationCheckContext, spec: WorldSubjectSpec): Promise<FoundSubject> {
    const subjects = await FindRows<{ ID: string; PartyRecordID: string | null }>(
        ctx,
        CredentialingEntity.Subject,
        `AccreditingOrganizationID = '${Quote(spec.AccreditingOrganizationID)}' AND DisplayName = '${Quote(spec.DisplayName)}'`,
        ['ID', 'PartyRecordID'],
    );
    const subject = subjects[0] ?? null;
    if (subject == null) {
        return { Subject: null, ContactUserIDs: [], ApplicationID: null, AnsweredStandardIDs: [] };
    }
    const contacts = await FindRows<{ UserID: string }>(ctx, CredentialingEntity.SubjectContact, `SubjectID = '${Quote(subject.ID)}'`, ['UserID']);
    const applications = await FindRows<{ ID: string }>(
        ctx,
        CredentialingEntity.Application,
        `SubjectID = '${Quote(subject.ID)}' AND ProgramVersionID = '${Quote(spec.Program.Version.ID)}' AND Status = 'Draft' AND IsHistorical = 0`,
        ['ID'],
    );
    const applicationID = applications[0]?.ID ?? null;
    const responses =
        applicationID == null
            ? []
            : await FindRows<{ StandardID: string }>(ctx, CredentialingEntity.StandardResponse, `ApplicationID = '${Quote(applicationID)}'`, ['StandardID']);
    return {
        Subject: subject,
        ContactUserIDs: contacts.map((c) => c.UserID),
        ApplicationID: applicationID,
        AnsweredStandardIDs: responses.map((r) => r.StandardID),
    };
}

/** A new entity object of `entityName` for the writer user. */
async function newRecord<T extends BaseEntity>(ctx: IntegrationCheckContext, entityName: string, user: UserInfo): Promise<T> {
    const entity = await ctx.Provider.GetEntityObject<T>(entityName, user);
    entity.NewRecord();
    return entity;
}

/** Writes every missing row of one world subject in one transaction. */
async function writeSubject(
    ctx: IntegrationCheckContext,
    applicantWriter: ApplicantWorldWriter,
    spec: WorldSubjectSpec,
    found: FoundSubject,
    standardIDs: string[],
): Promise<void> {
    const user = applicantWriter.WriterUser();
    await applicantWriter.Run(ctx.Provider, async (scope) => {
        const subjectID = await ensureSubjectRow(ctx, scope, user, spec, found);
        await ensureContacts(ctx, scope, user, spec, subjectID, found);
        const applicationID = found.ApplicationID ?? (await createApplication(ctx, scope, user, spec, subjectID));
        const answered = new Set(found.AnsweredStandardIDs.map((id) => id.toLowerCase()));
        for (const standardID of standardIDs.filter((id) => !answered.has(id.toLowerCase()))) {
            const response = await newRecord<StandardResponseEntity>(ctx, CredentialingEntity.StandardResponse, user);
            response.ApplicationID = applicationID;
            response.StandardID = standardID;
            response.SubjectID = subjectID;
            response.Status = 'Empty';
            response.AuthorType = 'Human';
            await scope.Save(response);
        }
    });
}

/** The subject's ID: the found subject (given a party record when it lacks one), or a new subject with its party record. */
async function ensureSubjectRow(ctx: IntegrationCheckContext, scope: ApplicantWorldScope, user: UserInfo, spec: WorldSubjectSpec, found: FoundSubject): Promise<string> {
    if (found.Subject != null && found.Subject.PartyRecordID != null) {
        return found.Subject.ID;
    }
    const personID = await ensurePerson(ctx, scope, user, spec);
    const peopleEntity = ctx.Provider.EntityByName(PEOPLE_ENTITY);
    Assert(peopleEntity != null, `the entity ${PEOPLE_ENTITY} is registered`);
    const subject = await ctx.Provider.GetEntityObject<SubjectEntity>(CredentialingEntity.Subject, user);
    if (found.Subject != null) {
        Assert(await subject.InnerLoad(CompositeKey.FromID(found.Subject.ID)), `loading subject ${spec.DisplayName}`);
    } else {
        subject.NewRecord();
        subject.AccreditingOrganizationID = spec.AccreditingOrganizationID;
        subject.SubjectType = 'Person';
        subject.DisplayName = spec.DisplayName;
        subject.PrimaryEmail = spec.PrimaryEmail;
        subject.Status = 'Active';
    }
    subject.PartyEntityID = peopleEntity.ID;
    subject.PartyRecordID = personID;
    await scope.Save(subject);
    return subject.ID;
}

/** The Common person of the subject's primary email, found or created (the party record an invitation creates). */
async function ensurePerson(ctx: IntegrationCheckContext, scope: ApplicantWorldScope, user: UserInfo, spec: WorldSubjectSpec): Promise<string> {
    const people = await FindRows<{ ID: string }>(ctx, PEOPLE_ENTITY, `Email = '${Quote(spec.PrimaryEmail)}'`, ['ID']);
    if (people.length > 0) {
        return people[0].ID;
    }
    const person = await newRecord<PersonEntity>(ctx, PEOPLE_ENTITY, user);
    person.FirstName = spec.FirstName;
    person.LastName = spec.LastName;
    person.Email = spec.PrimaryEmail;
    await scope.Save(person);
    return person.ID;
}

async function ensureContacts(
    ctx: IntegrationCheckContext,
    scope: ApplicantWorldScope,
    user: UserInfo,
    spec: WorldSubjectSpec,
    subjectID: string,
    found: FoundSubject,
): Promise<void> {
    const existing = new Set(found.ContactUserIDs.map((id) => id.toLowerCase()));
    for (const [index, contactUser] of spec.Contacts.entries()) {
        if (existing.has(contactUser.ID.toLowerCase())) continue;
        const contact = await newRecord<SubjectContactEntity>(ctx, CredentialingEntity.SubjectContact, user);
        contact.SubjectID = subjectID;
        contact.UserID = contactUser.ID;
        contact.ContactRole = index === 0 ? 'Primary' : 'Staff';
        contact.InvitedByUserID = spec.InvitedBy.ID;
        contact.LastInvitedAt = new Date();
        await scope.Save(contact);
    }
}

async function createApplication(ctx: IntegrationCheckContext, scope: ApplicantWorldScope, user: UserInfo, spec: { Program: ProgramTree }, subjectID: string): Promise<string> {
    const application = await newRecord<ApplicationEntity>(ctx, CredentialingEntity.Application, user);
    application.SubjectID = subjectID;
    application.ProgramVersionID = spec.Program.Version.ID;
    application.Status = 'Draft';
    application.IsHistorical = false;
    await scope.Save(application);
    return application.ID;
}

/**
 * Ensures `subjectID` holds a Draft application on `program.Version.ID` with one Empty
 * `StandardResponse` per standard, idempotently. Returns the application ID.
 */
export async function EnsureWorldApplication(
    ctx: IntegrationCheckContext,
    subjectID: string,
    program: ProgramTree,
): Promise<string> {
    Assert(program.Version.Status === 'Active', `the application version of ${program.Program.Name} is Active`);
    const standardIDs = program.Sections.flatMap((s) => s.Standards.map((st) => st.ID));
    const existingApps = await FindRows<{ ID: string }>(
        ctx,
        CredentialingEntity.Application,
        `SubjectID = '${Quote(subjectID)}' AND ProgramVersionID = '${Quote(program.Version.ID)}' AND Status = 'Draft' AND IsHistorical = 0`,
        ['ID'],
    );
    let applicationID = existingApps[0]?.ID ?? null;
    const existingResponses =
        applicationID == null
            ? []
            : await FindRows<{ StandardID: string }>(ctx, CredentialingEntity.StandardResponse, `ApplicationID = '${Quote(applicationID)}'`, ['StandardID']);
    const answered = new Set(existingResponses.map((r) => r.StandardID.toLowerCase()));
    const missingStandards = standardIDs.filter((id) => !answered.has(id.toLowerCase()));
    if (applicationID != null && missingStandards.length === 0) {
        return applicationID;
    }
    if (writer == null) {
        throw new Error(
            `The applicant world application (${program.Program.Name}) is incomplete, and it is written only on the server transport: run ` +
                `MJ_INTEGRATION_TEST=1 RUN_MUTATION_TESTS=1 corepack pnpm mj test run --name "CRD-06 - World" first.`,
        );
    }
    const activeWriter = writer;
    const user = activeWriter.WriterUser();
    await activeWriter.Run(ctx.Provider, async (scope) => {
        const appID = applicationID ?? (await createApplication(ctx, scope, user, { Program: program }, subjectID));
        applicationID = appID;
        for (const standardID of missingStandards) {
            const response = await newRecord<StandardResponseEntity>(ctx, CredentialingEntity.StandardResponse, user);
            response.ApplicationID = appID;
            response.StandardID = standardID;
            response.SubjectID = subjectID;
            response.Status = 'Empty';
            response.AuthorType = 'Human';
            await scope.Save(response);
        }
    });
    return applicationID!;
}
