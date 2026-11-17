/**
 * `cred-subject-isolation` — the subject boundary of the nine applicant-data entities (plan Task 3,
 * Review Focus 1). A subject contact reads only its own subject's rows; staff read only the rows of
 * their organization's subjects; another subject's ID is refused exactly like a random one; a direct
 * save is refused for every caller and an operation write succeeds as the caller; a contact holds no
 * read on authoring entities or memberships; `SubjectAccess` reads authoring rows as the system user
 * only after the caller's own filter admitted the owned row; the subject lock refuses a waiter with
 * the applicant sentence; and background units on isolated providers serialize on it.
 *
 * Server transport only, and the one bundle that imports server guards as values: `SubjectAccess`,
 * `OperationWrite`, `AuthoringLock` and `CredentialingServices` are server code with no wire path of
 * their own (the operations of Tasks 4–11 are their wire path), and the client harness never loads
 * this module. Every read runs in-process as the world user under test, so the provider applies that
 * user's permissions and row filters exactly as MJAPI does for that user's requests.
 *
 * Checks 1 and 2 add one row of each of the five evidence entities (document, attestation, frozen
 * document link, extraction, citation) to each world subject, as the system user through
 * `OperationWrite`, and delete them when the check ends.
 */
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { CompositeKey, type BaseEntity, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import type { MJFileEntity } from '@memberjunction/core-entities';
import { UUIDsEqual } from '@memberjunction/global';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    SkipCheck,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import { CredentialingEntity, NOT_FOUND_REASON } from '@mj-biz-apps/credentialing-core';
import {
    APPLICATION_LOCK_BUSY_REASON,
    AuthoringLock,
    CredentialingServices,
    LOCK_TIMEOUT_MS,
    OPERATION_ONLY_REASON,
    OperationWrite,
    SubjectAccess,
    SystemUser,
} from '@mj-biz-apps/credentialing-core-entities-server';
import type {
    mjBizAppsCredentialingApplicationDocumentEntity,
    mjBizAppsCredentialingDocumentAttestationEntity,
    mjBizAppsCredentialingEvidenceDocumentEntity,
    mjBizAppsCredentialingExtractionEntity,
    mjBizAppsCredentialingResponseCitationEntity,
    mjBizAppsCredentialingStandardResponseEntity,
} from '@mj-biz-apps/credentialing-entities';
import { WithActors } from '../actors.js';
import { FindRows, Quote, RequireDelete, RequireSave, View } from '../wire.js';
import { GetOrLoadWorld } from '../world/load-world.js';
import type { ProgramTree } from '../world/program-tree.js';
import type { CredentialingWorld, WorldSubject } from '../world/world.js';

type StandardResponseEntity = mjBizAppsCredentialingStandardResponseEntity;

/** The nine applicant-data entities, with the column that names a row's subject. */
const APPLICANT_ENTITIES: readonly { Name: string; SubjectColumn: string }[] = [
    { Name: CredentialingEntity.Subject, SubjectColumn: 'ID' },
    { Name: CredentialingEntity.SubjectContact, SubjectColumn: 'SubjectID' },
    { Name: CredentialingEntity.Application, SubjectColumn: 'SubjectID' },
    { Name: CredentialingEntity.StandardResponse, SubjectColumn: 'SubjectID' },
    { Name: CredentialingEntity.ResponseCitation, SubjectColumn: 'SubjectID' },
    { Name: CredentialingEntity.EvidenceDocument, SubjectColumn: 'SubjectID' },
    { Name: CredentialingEntity.DocumentAttestation, SubjectColumn: 'SubjectID' },
    { Name: CredentialingEntity.ApplicationDocument, SubjectColumn: 'SubjectID' },
    { Name: CredentialingEntity.Extraction, SubjectColumn: 'SubjectID' },
];

/** Entities a contact holds no permission on (plan Global Constraints). */
const AUTHORING_ENTITIES: readonly string[] = [
    CredentialingEntity.Program,
    CredentialingEntity.ProgramVersion,
    CredentialingEntity.Section,
    CredentialingEntity.Standard,
    CredentialingEntity.DocumentRequirement,
    CredentialingEntity.ResponseSource,
    CredentialingEntity.OrganizationMembership,
];

const RECORD_CHANGES_ENTITY = 'MJ: Record Changes';

/** The subject IDs of the rows `user` reads from `entity`, lower-cased; a refused read fails the check. */
async function subjectsRead(ctx: IntegrationCheckContext, entity: { Name: string; SubjectColumn: string }, user: UserInfo): Promise<string[]> {
    const res = await View(ctx).RunView<Record<string, string>>(
        { EntityName: entity.Name, Fields: [entity.SubjectColumn], ResultType: 'simple' },
        user,
    );
    Assert(res.Success, `${user.Email} reads ${entity.Name} (got "${res.ErrorMessage ?? ''}")`);
    return (res.Results ?? []).map((r) => String(r[entity.SubjectColumn]).toLowerCase());
}

/** Asserts `user` reads rows of every subject in `mine` and of no subject outside it, from all nine entities. */
async function expectReadsOnly(ctx: IntegrationCheckContext, user: UserInfo, mine: readonly WorldSubject[], label: string): Promise<void> {
    const allowed = new Set(mine.map((s) => s.ID.toLowerCase()));
    for (const entity of APPLICANT_ENTITIES) {
        const seen = await subjectsRead(ctx, entity, user);
        const foreign = seen.filter((id) => !allowed.has(id));
        AssertEqual(foreign.length, 0, `${label}: rows of ${entity.Name} belonging to another subject`);
        for (const subject of mine) {
            Assert(seen.includes(subject.ID.toLowerCase()), `${label}: reads ${subject.DisplayName}'s ${entity.Name} rows`);
        }
    }
}

/** Runs `work` inside one admitted transaction on the context provider; returns its result. */
function admitted<T>(ctx: IntegrationCheckContext, work: (save: (entity: BaseEntity) => Promise<void>) => Promise<T>): Promise<T> {
    return OperationWrite.Run(ctx.Provider, (scope) => work((entity) => scope.Save(entity)));
}

/** The rows one evidence fixture adds to a subject, deleted again in reverse order. */
interface EvidenceFixture {
    Rows: BaseEntity[];
    File: MJFileEntity;
}

/** A new entity object of `entityName` for `user`. */
async function newRecord<T extends BaseEntity>(ctx: IntegrationCheckContext, entityName: string, user: UserInfo): Promise<T> {
    const entity = await ctx.Provider.GetEntityObject<T>(entityName, user);
    entity.NewRecord();
    return entity;
}

/** A scratch `MJ: Files` row for an evidence document (as the context user, who may write files). */
async function scratchFile(ctx: IntegrationCheckContext): Promise<MJFileEntity> {
    const providers = await FindRows<{ ID: string }>(ctx, 'MJ: File Storage Providers', '', ['ID']);
    Assert(providers.length > 0, 'at least one file storage provider exists');
    const file = await newRecord<MJFileEntity>(ctx, 'MJ: Files', ctx.User);
    file.Name = `subject-isolation-${randomUUID().slice(0, 8)}.pdf`;
    file.ProviderID = providers[0].ID;
    file.Status = 'Pending';
    await RequireSave(file, 'scratch file');
    return file;
}

/** One document, attestation, frozen link, extraction and citation for `subject`, written as the system user. */
async function addEvidence(ctx: IntegrationCheckContext, subject: WorldSubject, program: ProgramTree): Promise<EvidenceFixture> {
    const system = SystemUser.Get('Writing subject-isolation fixtures');
    const file = await scratchFile(ctx);
    const text = 'The applicant holds a qualifying degree.';
    const standardID = program.Sections[0].Standards[0].ID;
    const responseID = await responseOf(ctx, subject, standardID);
    const rows = await admitted(ctx, async (save) => {
        const doc = await newRecord<mjBizAppsCredentialingEvidenceDocumentEntity>(ctx, CredentialingEntity.EvidenceDocument, system);
        doc.SubjectID = subject.ID;
        doc.FileID = file.ID;
        doc.FileName = file.Name;
        doc.ContentType = 'application/pdf';
        doc.SizeBytes = 128;
        doc.ContentHash = 'b'.repeat(64);
        doc.ExtractedText = text;
        doc.TextStatus = 'Extracted';
        doc.ReadingStatus = 'Pending';
        doc.Status = 'Current';
        doc.UploadedByUserID = subject.Contacts[0].ID;
        doc.UploadedAt = new Date();
        await save(doc);
        const attestation = await newRecord<mjBizAppsCredentialingDocumentAttestationEntity>(ctx, CredentialingEntity.DocumentAttestation, system);
        attestation.SubjectID = subject.ID;
        attestation.DocumentRequirementID = program.DocumentRequirements[0].ID;
        attestation.Statement = 'The document is held and can be shown on request.';
        attestation.AttestedByUserID = subject.Contacts[0].ID;
        attestation.AttestedAt = new Date();
        attestation.IsSuperseded = false;
        await save(attestation);
        const link = await newRecord<mjBizAppsCredentialingApplicationDocumentEntity>(ctx, CredentialingEntity.ApplicationDocument, system);
        link.ApplicationID = subject.ApplicationID;
        link.EvidenceDocumentID = doc.ID;
        link.FrozenAt = new Date();
        await save(link);
        const extraction = await newRecord<mjBizAppsCredentialingExtractionEntity>(ctx, CredentialingEntity.Extraction, system);
        extraction.EvidenceDocumentID = doc.ID;
        extraction.StandardID = standardID;
        extraction.Value = 'Qualifying degree held.';
        extraction.Excerpt = text;
        extraction.StartOffset = 0;
        extraction.EndOffset = text.length;
        extraction.Confidence = 0.9;
        extraction.Status = 'Proposed';
        extraction.IsSuperseded = false;
        await save(extraction);
        const citation = await newRecord<mjBizAppsCredentialingResponseCitationEntity>(ctx, CredentialingEntity.ResponseCitation, system);
        citation.StandardResponseID = responseID;
        citation.EvidenceDocumentID = doc.ID;
        citation.ExtractionID = extraction.ID;
        citation.SourceLabel = file.Name;
        citation.Excerpt = text;
        citation.StartOffset = 0;
        citation.EndOffset = text.length;
        await save(citation);
        return [doc, attestation, link, extraction, citation];
    });
    return { Rows: rows, File: file };
}

async function responseOf(ctx: IntegrationCheckContext, subject: WorldSubject, standardID: string): Promise<string> {
    const rows = await FindRows<{ ID: string }>(
        ctx,
        CredentialingEntity.StandardResponse,
        `ApplicationID = '${Quote(subject.ApplicationID)}' AND StandardID = '${Quote(standardID)}'`,
        ['ID'],
    );
    Assert(rows.length === 1, `${subject.DisplayName} has one response to standard ${standardID}`);
    return rows[0].ID;
}

async function removeEvidence(ctx: IntegrationCheckContext, fixture: EvidenceFixture): Promise<void> {
    await OperationWrite.Run(ctx.Provider, async (scope) => {
        for (const row of [...fixture.Rows].reverse()) {
            await scope.Delete(row);
        }
    });
    await RequireDelete(fixture.File, 'scratch file');
}

/** Runs `work` with an evidence fixture on each of the three world subjects. */
async function withEvidence(ctx: IntegrationCheckContext, world: CredentialingWorld, work: () => Promise<void>): Promise<void> {
    const { SubjectOne, SubjectTwo, SubjectOrgB } = world.Applicants;
    const fixtures: EvidenceFixture[] = [];
    try {
        fixtures.push(await addEvidence(ctx, SubjectOne, world.ApplicantProgram));
        fixtures.push(await addEvidence(ctx, SubjectTwo, world.ApplicantProgram));
        fixtures.push(await addEvidence(ctx, SubjectOrgB, world.ApplicantProgramB));
        await work();
    } finally {
        for (const fixture of fixtures) {
            await removeEvidence(ctx, fixture);
        }
    }
}

/** The message a call threw, or null when it returned. */
async function thrownBy(call: () => Promise<unknown>): Promise<string | null> {
    try {
        await call();
        return null;
    } catch (err: unknown) {
        return err instanceof Error ? err.message : String(err);
    }
}

/** Asserts the refusal for another subject's ID equals the refusal for a random one, and is the not-found sentence. */
async function expectNotFoundLikeRandom(foreign: () => Promise<unknown>, random: () => Promise<unknown>, label: string): Promise<void> {
    const foreignMessage = await thrownBy(foreign);
    const randomMessage = await thrownBy(random);
    AssertEqual(foreignMessage, NOT_FOUND_REASON, `${label}: another subject's ID`);
    AssertEqual(randomMessage, NOT_FOUND_REASON, `${label}: a random ID`);
}

/** A world response loaded as `user` (whose own filter must admit it). */
async function responseAs(ctx: IntegrationCheckContext, id: string, user: UserInfo): Promise<StandardResponseEntity> {
    const response = await ctx.Provider.GetEntityObject<StandardResponseEntity>(CredentialingEntity.StandardResponse, user);
    Assert(await response.InnerLoad(CompositeKey.FromID(id)), `${user.Email} loads response ${id}`);
    return response;
}

/** The stored status and text of a response, read as the context user. */
async function storedResponse(ctx: IntegrationCheckContext, id: string): Promise<{ Status: string; ResponseText: string | null }> {
    const rows = await FindRows<{ Status: string; ResponseText: string | null }>(ctx, CredentialingEntity.StandardResponse, `ID = '${Quote(id)}'`, ['Status', 'ResponseText']);
    Assert(rows.length === 1, `response ${id} is stored`);
    return rows[0];
}

/** Puts a world response's text back to empty, through an operation write as the system user. */
async function resetResponseText(ctx: IntegrationCheckContext, id: string): Promise<void> {
    const response = await responseAs(ctx, id, SystemUser.Get('Resetting a world response'));
    if (response.ResponseText == null) return;
    response.ResponseText = null;
    await admitted(ctx, (save) => save(response));
}

/** Asserts a direct save of `id` by `user` is refused with the operation-only sentence and leaves the row unchanged. */
async function expectDirectSaveRefused(ctx: IntegrationCheckContext, id: string, user: UserInfo, label: string): Promise<void> {
    const before = await storedResponse(ctx, id);
    const response = await responseAs(ctx, id, user);
    response.Status = 'Confirmed';
    response.ResponseText = `Direct save ${randomUUID()}`;
    const saved = await response.Save();
    AssertEqual(saved, false, `${label}: the direct save is refused`);
    AssertEqual(response.LatestResult?.CompleteMessage ?? '', OPERATION_ONLY_REASON, `${label}: the refusal`);
    const after = await storedResponse(ctx, id);
    AssertEqual(after.Status, before.Status, `${label}: Status unchanged`);
    AssertEqual(after.ResponseText, before.ResponseText, `${label}: ResponseText unchanged`);
}

/** What one background unit of check 8 observed. */
interface UnitTiming {
    LockedAt: number;
    FinishedAt: number;
}

/**
 * One background unit of check 8: on its own isolated provider, takes the subject lock, holds it
 * `holdMs`, writes `text` into the response, and either commits or throws (rolling back).
 */
async function backgroundUnit(subjectID: string, responseID: string, text: string, holdMs: number, fail: boolean): Promise<UnitTiming> {
    return CredentialingServices.InBackground(async (provider: IMetadataProvider) => {
        const system = SystemUser.Get('A background unit of the subject-lock check');
        const timing: UnitTiming = { LockedAt: 0, FinishedAt: 0 };
        await OperationWrite.Run(provider, async (scope) => {
            await AuthoringLock.ForSubject(subjectID, provider, system);
            timing.LockedAt = Date.now();
            const response = await provider.GetEntityObject<StandardResponseEntity>(CredentialingEntity.StandardResponse, system);
            Assert(await response.InnerLoad(CompositeKey.FromID(responseID)), 'the background unit loads the response');
            response.ResponseText = text;
            await scope.Save(response);
            await delay(holdMs);
            timing.FinishedAt = Date.now();
            if (fail) {
                throw new Error('background unit rolled back on purpose');
            }
        }).catch((err: unknown) => {
            if (!fail) throw err;
        });
        return timing;
    });
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-subject-isolation.1',
        Name: "a subject contact reads only its own subject's rows of the nine applicant-data entities",
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const { SubjectOne, SubjectTwo, SubjectOrgB } = world.Applicants;
            await withEvidence(ctx, world, async () => {
                await expectReadsOnly(ctx, SubjectOne.Contacts[0], [SubjectOne], 'contact of Sample Applicant One');
                await expectReadsOnly(ctx, SubjectOne.Contacts[1], [SubjectOne], 'second contact of Sample Applicant One');
                await expectReadsOnly(ctx, SubjectTwo.Contacts[0], [SubjectTwo], 'contact of Sample Applicant Two');
                await expectReadsOnly(ctx, SubjectOrgB.Contacts[0], [SubjectOrgB], 'contact of the OrgB subject');
            });
        },
    },
    {
        Id: 'cred-subject-isolation.2',
        Name: "staff read the applicant data of their organization's subjects and none of another organization's",
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const { SubjectOne, SubjectTwo, SubjectOrgB } = world.Applicants;
            await withEvidence(ctx, world, async () => {
                await expectReadsOnly(ctx, world.StaffA, [SubjectOne, SubjectTwo], 'staff-a');
                await expectReadsOnly(ctx, world.StaffB, [SubjectOrgB], 'staff-b');
                for (const entity of APPLICANT_ENTITIES) {
                    AssertEqual((await subjectsRead(ctx, entity, world.StaffNoMembership)).length, 0, `staff with no membership: rows of ${entity.Name}`);
                }
            });
        },
    },
    {
        Id: 'cred-subject-isolation.3',
        Name: "SubjectAccess refuses another subject's application, response and document exactly like a random ID",
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const { SubjectOne, SubjectTwo } = world.Applicants;
            const contact = SubjectOne.Contacts[0];
            const p = ctx.Provider;
            await expectNotFoundLikeRandom(
                () => SubjectAccess.Application(SubjectTwo.ApplicationID, p, contact),
                () => SubjectAccess.Application(randomUUID(), p, contact),
                'Application',
            );
            await expectNotFoundLikeRandom(
                () => SubjectAccess.Response(SubjectTwo.ResponseIDs[0], p, contact),
                () => SubjectAccess.Response(randomUUID(), p, contact),
                'Response',
            );
            await expectNotFoundLikeRandom(() => SubjectAccess.Subject(SubjectTwo.ID, p, contact), () => SubjectAccess.Subject(randomUUID(), p, contact), 'Subject');
            await expectNotFoundLikeRandom(() => SubjectAccess.Document(randomUUID(), p, contact), () => SubjectAccess.Document('not-a-uuid', p, contact), 'Document');
            await expectNotFoundLikeRandom(
                () => SubjectAccess.Requirement(world.ApplicantProgramB.DocumentRequirements[0].ID, SubjectOne.ID, p),
                () => SubjectAccess.Requirement(randomUUID(), SubjectOne.ID, p),
                "Requirement of a version the subject holds no application on",
            );
            const own = await SubjectAccess.Requirement(world.ApplicantProgram.DocumentRequirements[0].ID, SubjectOne.ID, p);
            Assert(UUIDsEqual(own.ID, world.ApplicantProgram.DocumentRequirements[0].ID), "the requirement of the subject's own version is admitted");
        },
    },
    {
        Id: 'cred-subject-isolation.4',
        Name: 'a direct save of a response is refused for its own contact and for staff, and leaves the row unchanged',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const { SubjectOne } = world.Applicants;
            const id = SubjectOne.ResponseIDs[0];
            await expectDirectSaveRefused(ctx, id, SubjectOne.Contacts[0], 'contact');
            await expectDirectSaveRefused(ctx, id, world.StaffA, 'staff-a');
            await expectDirectSaveRefused(ctx, id, SystemUser.Get('The direct-save check'), 'system user');
            const response = await responseAs(ctx, id, world.StaffA);
            AssertEqual(await response.Delete(), false, 'a direct delete by staff is refused');
            AssertEqual(response.LatestResult?.CompleteMessage ?? '', OPERATION_ONLY_REASON, 'the delete refusal');
        },
    },
    {
        Id: 'cred-subject-isolation.5',
        Name: "inside OperationWrite the contact's own text change succeeds, and its record change names that contact",
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const { SubjectOne } = world.Applicants;
            const contact = SubjectOne.Contacts[0];
            const id = SubjectOne.ResponseIDs[1];
            const text = `Operation write ${randomUUID()}`;
            try {
                const response = await responseAs(ctx, id, contact);
                response.ResponseText = text;
                response.SubjectID = world.Applicants.SubjectTwo.ID; // an attempt to move it: the subclass restores the loaded value
                await OperationWrite.Run(ctx.Provider, (scope) => scope.Save(response));
                const stored = await FindRows<{ ResponseText: string | null; SubjectID: string }>(ctx, CredentialingEntity.StandardResponse, `ID = '${Quote(id)}'`, [
                    'ResponseText',
                    'SubjectID',
                ]);
                AssertEqual(stored[0]?.ResponseText ?? null, text, 'the stored text');
                Assert(UUIDsEqual(stored[0]?.SubjectID ?? '', SubjectOne.ID), 'SubjectID is immutable: restored from the loaded row');
                const entityID = ctx.Provider.EntityByName(CredentialingEntity.StandardResponse)?.ID ?? '';
                const changes = await FindRows<{ UserID: string; Type: string }>(
                    ctx,
                    RECORD_CHANGES_ENTITY,
                    `EntityID = '${Quote(entityID)}' AND RecordID = 'ID|${Quote(id)}' AND Type = 'Update' AND ChangesDescription LIKE '%${Quote(text)}%'`,
                    ['UserID', 'Type'],
                );
                AssertEqual(changes.length, 1, 'record changes of the operation write');
                Assert(UUIDsEqual(changes[0].UserID, contact.ID), `the record change names the contact (got ${changes[0].UserID})`);
            } finally {
                await resetResponseText(ctx, id);
            }
        },
    },
    {
        Id: 'cred-subject-isolation.6',
        Name: 'a contact reads nothing from the authoring entities and memberships',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectOne.Contacts[0];
            for (const entityName of AUTHORING_ENTITIES) {
                const res = await View(ctx).RunView<{ ID: string }>({ EntityName: entityName, Fields: ['ID'], ResultType: 'simple' }, contact);
                const rows = res.Success ? (res.Results ?? []).length : 0;
                AssertEqual(rows, 0, `rows of ${entityName} the contact reads`);
                Assert(
                    !res.Success && (res.ErrorMessage ?? '').includes(`does not have read permissions on ${entityName}`),
                    `the contact's read of ${entityName} is refused for want of permission (got ${res.Success ? 'a successful read' : res.ErrorMessage})`,
                );
            }
        },
    },
    {
        Id: 'cred-subject-isolation.7',
        Name: 'SubjectAccess returns the version and program to server code and decides the actor; staff of another organization stop at the subject',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const { SubjectOne } = world.Applicants;
            const p = ctx.Provider;
            const asContact = await SubjectAccess.Application(SubjectOne.ApplicationID, p, SubjectOne.Contacts[0]);
            Assert(UUIDsEqual(asContact.Version.ID, world.ApplicantProgram.Version.ID), 'the contact gets the application version');
            Assert(UUIDsEqual(asContact.Program.ID, world.ApplicantProgram.Program.ID), 'the contact gets the program');
            Assert(UUIDsEqual(asContact.Subject.ID, SubjectOne.ID), 'the contact gets the subject');
            AssertEqual(await SubjectAccess.ActorFor(SubjectOne.Contacts[0], asContact.Subject, p), 'Applicant', 'actor of the contact');
            AssertEqual(await SubjectAccess.ActorFor(SubjectOne.Contacts[1], asContact.Subject, p), 'Applicant', 'actor of the second contact');

            const response = await SubjectAccess.Response(SubjectOne.ResponseIDs[0], p, SubjectOne.Contacts[0]);
            Assert(UUIDsEqual(response.Version.ID, world.ApplicantProgram.Version.ID), "the response's version");
            Assert(
                world.ApplicantProgram.Sections.some((s) => s.Standards.some((st) => UUIDsEqual(st.ID, response.Standard.ID))),
                "the response's standard is one of the version's",
            );

            const asStaff = await SubjectAccess.Application(SubjectOne.ApplicationID, p, world.StaffA);
            AssertEqual(await SubjectAccess.ActorFor(world.StaffA, asStaff.Subject, p), 'Staff', 'actor of staff-a');
            AssertEqual(await SubjectAccess.ActorFor(world.StaffB, asStaff.Subject, p), null, 'actor of staff-b on an OrgA subject');

            const refused = await thrownBy(() => SubjectAccess.Subject(SubjectOne.ID, p, world.StaffB));
            AssertEqual(refused, NOT_FOUND_REASON, 'staff-b loading an OrgA subject');
        },
    },
    {
        Id: 'cred-subject-isolation.8',
        Name: 'two background units on isolated providers serialize on the subject lock, and a rolled-back first leaves the second\'s write',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            if (!CredentialingServices.IsRegistered('Providers')) {
                SkipCheck(
                    'not runnable here: no IsolatedProviderFactory is registered in this process. packages/Server registers the real ' +
                        'factory (plan Task 4); this check runs where it is registered.',
                );
            }
            const world = await GetOrLoadWorld(ctx);
            const { SubjectOne } = world.Applicants;
            const id = SubjectOne.ResponseIDs[2];
            const second = `Second unit ${randomUUID()}`;
            try {
                const firstRun = backgroundUnit(SubjectOne.ID, id, `First unit ${randomUUID()}`, 500, true);
                await delay(50);
                const secondRun = backgroundUnit(SubjectOne.ID, id, second, 500, false);
                const [a, b] = await Promise.all([firstRun, secondRun]);
                Assert(b.LockedAt >= a.FinishedAt, `the second unit took the lock after the first finished (${b.LockedAt - a.FinishedAt} ms)`);
                AssertEqual((await storedResponse(ctx, id)).ResponseText, second, "the second unit's write survives the first's rollback");
            } finally {
                await resetResponseText(ctx, id);
            }
        },
    },
    {
        Id: 'cred-subject-isolation.9',
        Name: 'a caller waiting on the subject lock past its timeout is refused with the applicant sentence',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const subjectID = world.Applicants.SubjectOne.ID;
            const system = SystemUser.Get('The subject-lock timeout check');
            await WithActors(ctx, 2, async ([holder, waiter]) => {
                let held!: () => void;
                const locked = new Promise<void>((resolve) => {
                    held = resolve;
                });
                const holding = OperationWrite.Run(holder, async () => {
                    await AuthoringLock.ForSubject(subjectID, holder, system);
                    held();
                    await delay(16000);
                });
                await locked;
                const started = Date.now();
                const refusal = await thrownBy(() => OperationWrite.Run(waiter, () => AuthoringLock.ForSubject(subjectID, waiter, system)));
                const waited = Date.now() - started;
                await holding;
                AssertEqual(refusal, APPLICATION_LOCK_BUSY_REASON, 'the waiter is refused');
                Assert(waited >= LOCK_TIMEOUT_MS - 500, `the waiter waited for the lock's timeout of ${LOCK_TIMEOUT_MS} ms (${waited} ms)`);
            });
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
