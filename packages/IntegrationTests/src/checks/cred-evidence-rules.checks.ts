/**
 * `cred-evidence-rules` — server-transport checks of the evidence upload's rules and transaction,
 * deterministic through fixture services and the `EvidenceIntake.Seams.AfterStore` pause (plan
 * Task 7, `CRD-11 - Evidence`). The HTTP route, real storage and real text extraction are checked
 * over the wire by `cred-evidence` (client transport).
 *
 * Each check works on a run-unique subject of OrgA (`Evidence Rules <hex>`) whose contact is the
 * world's evidence contact (`applicant.evidence@example.test`), so no world subject's documents or
 * applications change. Applications are set to `Submitted` here as the system user inside
 * `OperationWrite`, because `SubmitApplication` (Task 11) does not exist yet.
 */
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { CompositeKey, type BaseEntity, type IMetadataProvider, type RemoteOpResult, type UserInfo } from '@memberjunction/core';
import { GenericDatabaseProvider } from '@memberjunction/generic-database-provider';
import type { MJFileEntity } from '@memberjunction/core-entities';
import { Assert, AssertEqual, IntegrationCheckRegistry, type IntegrationCheckContext, type NamedCheck } from '@memberjunction/testing-integration/registry';
import {
    AttestInLieuOperation,
    ConfirmDocumentCurrentOperation,
    CredentialingEntity,
    DOCUMENT_REPLACED_REASON,
    GetDocumentLibraryOperation,
    NOT_FOUND_REASON,
} from '@mj-biz-apps/credentialing-core';
import {
    CredentialingServices,
    EvidenceIntake,
    EvidenceRefusal,
    OperationWrite,
    SystemUser,
    type EvidenceStore,
    type ExtractedText,
    type TextExtractor,
} from '@mj-biz-apps/credentialing-core-entities-server';
import type {
    mjBizAppsCredentialingApplicationDocumentEntity,
    mjBizAppsCredentialingApplicationEntity,
    mjBizAppsCredentialingEvidenceDocumentEntity,
} from '@mj-biz-apps/credentialing-entities';
import { WithActors } from '../actors.js';
import { CountRows, FindRows, LoadEntity, LoadUserInfo, Quote, RequireSave } from '../wire.js';
import { EnsureWorldApplication, EnsureWorldSubject } from '../world/applicant-world.js';
import { EVIDENCE_NORMAL_REQUIREMENT, EVIDENCE_RESTRICTED_REQUIREMENT, GetOrLoadWorld } from '../world/load-world.js';
import { EnsureProgramTree, type DocumentRequirementSpec, type ProgramTree } from '../world/program-tree.js';
import type { CredentialingWorld } from '../world/world.js';

type ApplicationEntity = mjBizAppsCredentialingApplicationEntity;
type ApplicationDocumentEntity = mjBizAppsCredentialingApplicationDocumentEntity;
type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;

const SUBMITTED_SENTENCE = 'This document is part of a submitted application and cannot be replaced until that review is finished.';
const ATTESTATION_FROZEN_SENTENCE = 'This attestation is part of a submitted application and cannot be changed until that review is finished.';
const FILES_ENTITY = 'MJ: Files';
const OTHER_CONTACT_EMAIL = 'applicant.b@example.test';

function runHex(): string {
    return randomUUID().replace(/-/g, '').slice(0, 8);
}

function describe<T>(result: RemoteOpResult<T>): string {
    return `${result.Success ? 'Success' : 'Failure'} ${result.ResultCode ?? ''}: ${result.ErrorMessage ?? ''}`;
}

/** A small, valid PDF whose bytes differ per call (the hash is per file). */
function pdfBytes(label: string): Buffer {
    return Buffer.from(`%PDF-1.4\n% evidence rules fixture ${label} ${randomUUID()}\n%%EOF\n`, 'latin1');
}

/**
 * The fixture store: each Put writes a real `MJ: Files` row (the document's `FileID` is a foreign
 * key), keyed under the evidence prefix, and remembers the bytes; Remove deletes the row and
 * records the call.
 */
class RecordingStore implements EvidenceStore {
    public readonly Removed: string[] = [];
    private readonly bytes = new Map<string, Buffer>();

    public constructor(private readonly provider: IMetadataProvider, private readonly providerID: string) {}

    public async Put(bytes: Buffer, fileName: string, contentType: string): Promise<{ FileID: string }> {
        const system = SystemUser.Get('Storing a fixture evidence file');
        const file = await this.provider.GetEntityObject<MJFileEntity>(FILES_ENTITY, system);
        file.NewRecord();
        file.Name = fileName;
        file.ContentType = contentType;
        file.ProviderID = this.providerID;
        file.ProviderKey = `credentialing-evidence/fixture/${randomUUID()}/${fileName}`;
        file.Status = 'Uploaded';
        Assert(await file.Save(), `fixture MJ: Files save: ${file.LatestResult?.CompleteMessage ?? ''}`);
        this.bytes.set(file.ID.toLowerCase(), bytes);
        return { FileID: file.ID };
    }

    public async Get(fileID: string): Promise<Buffer> {
        const stored = this.bytes.get(fileID.toLowerCase());
        Assert(stored != null, `fixture store holds ${fileID}`);
        return stored;
    }

    public async Remove(fileID: string): Promise<void> {
        this.Removed.push(fileID.toLowerCase());
        const system = SystemUser.Get('Removing a fixture evidence file');
        const file = await this.provider.GetEntityObject<MJFileEntity>(FILES_ENTITY, system);
        if (await file.InnerLoad(CompositeKey.FromID(fileID))) {
            Assert(await file.Delete(), `fixture MJ: Files delete: ${file.LatestResult?.CompleteMessage ?? ''}`);
        }
        this.bytes.delete(fileID.toLowerCase());
    }

    public async RemoveOrphans(): Promise<number> {
        return 0;
    }
}

/** The fixture text extractor: every file has a text layer. */
const fixtureText: TextExtractor = {
    Extract: async (): Promise<ExtractedText> => ({ Status: 'Extracted', Text: 'Fixture evidence text.', PageCount: 1, Note: null }),
};

/** Registers the fixture store and extractor; returns the store. */
async function registerFixtures(ctx: IntegrationCheckContext): Promise<RecordingStore> {
    const providers = await FindRows<{ ID: string }>(ctx, 'MJ: File Storage Providers', `Name = 'External URL'`, ['ID'], SystemUser.Get('Reading a storage provider'));
    Assert(providers.length === 1, 'the External URL storage provider exists (fixture files point at it)');
    const store = new RecordingStore(ctx.Provider, providers[0].ID);
    CredentialingServices.Register({ Store: store, Text: fixtureText });
    return store;
}

/** A run-unique subject of OrgA, contact `applicant.evidence@example.test`, with a Draft application on each program. */
async function scratchSubject(ctx: IntegrationCheckContext, world: CredentialingWorld, programs: ProgramTree[]): Promise<{ SubjectID: string; ApplicationIDs: string[] }> {
    const contact = world.Applicants.SubjectEvidence.Contacts[0];
    const hex = runHex();
    const subject = await EnsureWorldSubject(ctx, {
        AccreditingOrganizationID: world.OrgA.ID,
        DisplayName: `Evidence Rules ${hex}`,
        FirstName: 'Evidence',
        LastName: `Rules ${hex}`,
        PrimaryEmail: contact.Email,
        Contacts: [contact],
        InvitedBy: world.StaffA,
        Program: programs[0],
    });
    const applicationIDs = [subject.ApplicationID];
    for (const program of programs.slice(1)) {
        applicationIDs.push(await EnsureWorldApplication(ctx, subject.ID, program));
    }
    return { SubjectID: subject.ID, ApplicationIDs: applicationIDs };
}

function requirementID(program: ProgramTree, name: string): string {
    const requirement = program.DocumentRequirements.find((r) => r.Name === name);
    Assert(requirement != null, `${program.Program.Name} has the requirement ${name}`);
    return requirement.ID;
}

/** Uploads one document as `contact` on `provider`; returns its ID. */
async function upload(provider: IMetadataProvider, contact: UserInfo, subjectID: string, requirement: string, label: string): Promise<string> {
    const accepted = await EvidenceIntake.Accept({ SubjectID: subjectID, RequirementID: requirement, FileName: `${label}.pdf`, Bytes: pdfBytes(label) }, provider, contact);
    return accepted.EvidenceDocumentID;
}

/** Runs `work` as the system user inside an operation write on `provider`. */
async function asSystem(ctx: IntegrationCheckContext, provider: IMetadataProvider, work: (save: (e: BaseEntity) => Promise<void>, system: UserInfo) => Promise<void>): Promise<void> {
    const system = SystemUser.Get('Writing evidence-check state');
    await OperationWrite.Run(provider, (scope) => work((e) => scope.Save(e), system));
}

/** Freezes `documentID` into `applicationID`'s document set (what `SubmitApplication` will do). */
async function freezeDocument(ctx: IntegrationCheckContext, applicationID: string, column: 'EvidenceDocumentID' | 'DocumentAttestationID', id: string): Promise<void> {
    await asSystem(ctx, ctx.Provider, async (save, system) => {
        const link = await ctx.Provider.GetEntityObject<ApplicationDocumentEntity>(CredentialingEntity.ApplicationDocument, system);
        link.NewRecord();
        link.ApplicationID = applicationID;
        if (column === 'EvidenceDocumentID') link.EvidenceDocumentID = id;
        else link.DocumentAttestationID = id;
        link.FrozenAt = new Date();
        await save(link);
    });
}

/** Sets an application to `Submitted` as the system user (Task 11 builds the real submission). */
async function submit(ctx: IntegrationCheckContext, provider: IMetadataProvider, applicationID: string, by: UserInfo): Promise<void> {
    await asSystem(ctx, provider, async (save, system) => {
        const application = await LoadEntity<ApplicationEntity>(ctx, CredentialingEntity.Application, applicationID, system, provider);
        application.Status = 'Submitted';
        application.SubmittedAt = new Date();
        application.SubmittedByUserID = by.ID;
        await save(application);
    });
}

async function documentRow(ctx: IntegrationCheckContext, id: string): Promise<EvidenceDocumentEntity> {
    return LoadEntity<EvidenceDocumentEntity>(ctx, CredentialingEntity.EvidenceDocument, id, SystemUser.Get('Reading an evidence document'));
}

async function refusalOf(work: Promise<unknown>): Promise<EvidenceRefusal> {
    try {
        await work;
    } catch (err: unknown) {
        if (err instanceof EvidenceRefusal) {
            return err;
        }
        throw new Error(`expected an EvidenceRefusal, got ${err instanceof Error ? err.message : String(err)}`);
    }
    throw new Error('expected the upload to be refused');
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-evidence-rules.14',
        Name: 'a submission that commits while an upload is paused after Put wins: the upload is refused, the frozen document stays Current, the stored file is removed',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const store = await registerFixtures(ctx);
            const contact = world.Applicants.SubjectEvidence.Contacts[0];
            const { SubjectID, ApplicationIDs } = await scratchSubject(ctx, world, [world.EvidenceProgram]);
            const requirement = requirementID(world.EvidenceProgram, EVIDENCE_NORMAL_REQUIREMENT);
            const first = await upload(ctx.Provider, contact, SubjectID, requirement, 'frozen');
            await freezeDocument(ctx, ApplicationIDs[0], 'EvidenceDocumentID', first);

            let paused!: () => void;
            let release!: () => void;
            const reachedPause = new Promise<void>((resolve) => (paused = resolve));
            const released = new Promise<void>((resolve) => (release = resolve));
            EvidenceIntake.Seams.AfterStore = async () => {
                paused();
                await released;
            };
            try {
                await WithActors(ctx, 2, async ([uploader, submitter]) => {
                    const racing = refusalOf(upload(uploader, contact, SubjectID, requirement, 'late'));
                    await reachedPause;
                    // The first CanSupersede has passed (the application was a Draft); the file is stored.
                    await submit(ctx, submitter, ApplicationIDs[0], contact);
                    release();
                    const refusal = await racing;
                    AssertEqual(refusal.Kind, 'Conflict', 'the refusal kind');
                    AssertEqual(refusal.message, SUBMITTED_SENTENCE, 'the refusal sentence');
                });
            } finally {
                EvidenceIntake.Seams.AfterStore = undefined;
            }
            AssertEqual((await documentRow(ctx, first)).Status, 'Current', 'the frozen document is still Current');
            AssertEqual(await CountRows(ctx, CredentialingEntity.EvidenceDocument, `SubjectID = '${Quote(SubjectID)}'`), 1, 'no second document row');
            AssertEqual(store.Removed.length, 1, 'Remove was called once, for the late upload');
            AssertEqual(await CountRows(ctx, FILES_ENTITY, `ID = '${Quote(store.Removed[0])}'`), 0, 'the late upload\'s MJ: Files row is gone');
        },
    },
    {
        Id: 'cred-evidence-rules.15',
        Name: 'a Submitted application on program A freezes only its own documents: a program-B document is replaced, a program-A document is refused',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            await registerFixtures(ctx);
            const contact = world.Applicants.SubjectEvidence.Contacts[0];
            const { SubjectID, ApplicationIDs } = await scratchSubject(ctx, world, [world.ApplicantProgram, world.EvidenceProgram]);
            const [applicationA, applicationB] = ApplicationIDs;
            const requirementA = requirementID(world.ApplicantProgram, 'Degree certificate');
            const requirementB = requirementID(world.EvidenceProgram, EVIDENCE_NORMAL_REQUIREMENT);
            const documentA = await upload(ctx.Provider, contact, SubjectID, requirementA, 'degree');
            const documentB = await upload(ctx.Provider, contact, SubjectID, requirementB, 'policy');
            await freezeDocument(ctx, applicationA, 'EvidenceDocumentID', documentA);
            await freezeDocument(ctx, applicationB, 'EvidenceDocumentID', documentB);
            await submit(ctx, ctx.Provider, applicationA, contact);

            const replacement = await upload(ctx.Provider, contact, SubjectID, requirementB, 'policy-v2');
            AssertEqual((await documentRow(ctx, documentB)).Status, 'Superseded', 'the program-B document is superseded');
            AssertEqual((await documentRow(ctx, replacement)).SupersedesDocumentID?.toLowerCase(), documentB.toLowerCase(), 'the replacement names it');

            const refusal = await refusalOf(upload(ctx.Provider, contact, SubjectID, requirementA, 'degree-v2'));
            AssertEqual(refusal.message, SUBMITTED_SENTENCE, 'the program-A document is frozen by the submission');
            AssertEqual((await documentRow(ctx, documentA)).Status, 'Current', 'the program-A document is still Current');
        },
    },
    {
        Id: 'cred-evidence-rules.17',
        Name: 'ConfirmDocumentCurrent sets Current and ConfirmedCurrentAt on a Confirm Current document; refused when frozen by a submission, when replaced, and for another subject',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            await registerFixtures(ctx);
            const contact = world.Applicants.SubjectEvidence.Contacts[0];
            const { SubjectID, ApplicationIDs } = await scratchSubject(ctx, world, [world.ApplicantProgram, world.EvidenceProgram]);
            const requirementA = requirementID(world.ApplicantProgram, 'Degree certificate');
            const requirementB = requirementID(world.EvidenceProgram, EVIDENCE_NORMAL_REQUIREMENT);
            const frozen = await upload(ctx.Provider, contact, SubjectID, requirementA, 'frozen');
            const open = await upload(ctx.Provider, contact, SubjectID, requirementB, 'open');
            await freezeDocument(ctx, ApplicationIDs[0], 'EvidenceDocumentID', frozen);
            await submit(ctx, ctx.Provider, ApplicationIDs[0], contact);
            await asSystem(ctx, ctx.Provider, async (save, system) => {
                for (const id of [frozen, open]) {
                    const document = await LoadEntity<EvidenceDocumentEntity>(ctx, CredentialingEntity.EvidenceDocument, id, system);
                    document.Status = 'Confirm Current';
                    await save(document);
                }
            });
            const confirm = (id: string, user: UserInfo) => new ConfirmDocumentCurrentOperation().Execute({ EvidenceDocumentID: id }, { provider: ctx.Provider, user });

            const confirmed = await confirm(open, contact);
            Assert(confirmed.Success && confirmed.Output != null, `confirming the open document succeeds (${describe(confirmed)})`);
            AssertEqual(confirmed.Output.Status, 'Current', 'returned status');
            const stored = await documentRow(ctx, open);
            AssertEqual(stored.Status, 'Current', 'stored status');
            Assert(stored.ConfirmedCurrentAt != null, 'ConfirmedCurrentAt is stamped');

            const refusedFrozen = await confirm(frozen, contact);
            Assert(!refusedFrozen.Success, 'confirming a document frozen by a submission is refused');
            AssertEqual(refusedFrozen.ErrorMessage, SUBMITTED_SENTENCE, 'the CanSupersede sentence');
            AssertEqual((await documentRow(ctx, frozen)).Status, 'Confirm Current', 'the frozen document is unchanged');

            const newer = await upload(ctx.Provider, contact, SubjectID, requirementB, 'newer');
            Assert(newer.length > 0, 'a newer upload replaced the open document');
            const refusedReplaced = await confirm(open, contact);
            AssertEqual(refusedReplaced.ErrorMessage, DOCUMENT_REPLACED_REASON, 'a replaced document');

            const other = await LoadUserInfo(ctx, OTHER_CONTACT_EMAIL);
            const foreign = await confirm(newer, other);
            AssertEqual(foreign.ErrorMessage, NOT_FOUND_REASON, 'another subject\'s contact');
        },
    },
    {
        Id: 'cred-evidence-rules.18',
        Name: 'an attestation frozen by a submitted application cannot be replaced; an unfrozen one is superseded by a new row',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const contact = world.Applicants.SubjectEvidence.Contacts[0];
            const { SubjectID, ApplicationIDs } = await scratchSubject(ctx, world, [world.EvidenceProgram]);
            const restricted = requirementID(world.EvidenceProgram, EVIDENCE_RESTRICTED_REQUIREMENT);
            const attest = (statement: string) =>
                new AttestInLieuOperation().Execute({ SubjectID, DocumentRequirementID: restricted, Statement: statement }, { provider: ctx.Provider, user: contact });

            const first = await attest('The minutes are held by the board secretary and shown on request.');
            Assert(first.Success && first.Output != null, `first attestation (${describe(first)})`);
            const second = await attest('The minutes are held by the board secretary and shown to reviewers on request.');
            Assert(second.Success && second.Output != null, `second attestation (${describe(second)})`);
            AssertEqual(second.Output.SupersededAttestationID?.toLowerCase(), first.Output.DocumentAttestationID.toLowerCase(), 'the second supersedes the first');

            await freezeDocument(ctx, ApplicationIDs[0], 'DocumentAttestationID', second.Output.DocumentAttestationID);
            await submit(ctx, ctx.Provider, ApplicationIDs[0], contact);
            const third = await attest('A changed statement.');
            Assert(!third.Success, 'a frozen attestation cannot be replaced');
            AssertEqual(third.ErrorMessage, ATTESTATION_FROZEN_SENTENCE, 'the CanReattest sentence');
            const current = await FindRows<{ ID: string }>(ctx, CredentialingEntity.DocumentAttestation, `SubjectID = '${Quote(SubjectID)}' AND IsSuperseded = 0`, ['ID'], SystemUser.Get('Reading attestations'));
            AssertEqual(current.length, 1, 'one current attestation');
            AssertEqual(current[0].ID.toLowerCase(), second.Output.DocumentAttestationID.toLowerCase(), 'the frozen attestation is still current');
        },
    },
    {
        Id: 'cred-evidence-rules.12',
        Name: 'GetDocumentLibrary returns a 30-requirement ledger in at most 4 database round trips',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            await registerFixtures(ctx);
            const requirements: DocumentRequirementSpec[] = [];
            for (let i = 1; i <= 30; i++) {
                requirements.push({
                    Name: `Library Requirement ${String(i).padStart(2, '0')}`,
                    Sequence: i,
                    IsRequired: i % 2 === 1,
                    SensitivityPolicy: i % 5 === 0 ? 'Restricted Allowed' : 'Normal',
                });
            }
            const tree = await EnsureProgramTree(
                ctx,
                {
                    AccreditingOrganizationID: world.OrgA.ID,
                    Program: {
                        Name: 'Sample Library Scale Program',
                        ProgramType: 'Certification',
                        SubjectType: 'Person',
                        SubjectNoun: 'professional',
                        CredentialPrefix: 'SLSP',
                    },
                    Version: { Label: '2026', CommitteeID: world.CommitteeA.ID },
                    Sections: [
                        {
                            Number: '1',
                            Name: 'Evidence',
                            Sequence: 1,
                            Standards: [
                                {
                                    Code: '1.1',
                                    Statement: 'The applicant provides the required evidence.',
                                    ResponseType: 'Evidence',
                                    Sequence: 1,
                                },
                            ],
                        },
                    ],
                    DocumentRequirements: requirements,
                },
                ctx.User,
            );
            if (tree.Version.Status === 'Draft') {
                tree.Version.Status = 'Active';
                await RequireSave(tree.Version, 'activating Sample Library Scale Program 2026');
            }
            const contact = world.Applicants.SubjectEvidence.Contacts[0];
            const { SubjectID } = await scratchSubject(ctx, world, [tree]);
            await upload(ctx.Provider, contact, SubjectID, tree.DocumentRequirements[0].ID, 'req-01-v1');
            await upload(ctx.Provider, contact, SubjectID, tree.DocumentRequirements[0].ID, 'req-01-v2');
            await new AttestInLieuOperation().Execute(
                {
                    SubjectID,
                    DocumentRequirementID: tree.DocumentRequirements[4].ID,
                    Statement: 'Held on file and available on request.',
                },
                { provider: ctx.Provider, user: contact },
            );

            const provider = ctx.Provider;
            if (!(provider instanceof GenericDatabaseProvider)) {
                throw new Error('server transport provider is not GenericDatabaseProvider');
            }
            const origRunView = provider.RunView;
            const origRunViews = provider.RunViews;
            let providerCalls = 0;
            provider.RunView = ((...args: Parameters<GenericDatabaseProvider['RunView']>) => {
                providerCalls++;
                return origRunView.apply(provider, args);
            }) as GenericDatabaseProvider['RunView'];
            provider.RunViews = ((...args: Parameters<GenericDatabaseProvider['RunViews']>) => {
                providerCalls++;
                return origRunViews.apply(provider, args);
            }) as GenericDatabaseProvider['RunViews'];
            const sqlLogPath = join(tmpdir(), `cred-library-sql-${randomUUID()}.log`);
            const logger = await provider.CreateSqlLogger(sqlLogPath);
            let res;
            let sqlStatements = 0;
            try {
                res = await new GetDocumentLibraryOperation().Execute({ SubjectID }, { provider: ctx.Provider, user: contact });
                sqlStatements = logger.statementCount;
            } finally {
                await logger.dispose();
                await unlink(sqlLogPath).catch(() => undefined);
                provider.RunView = origRunView;
                provider.RunViews = origRunViews;
            }

            Assert(res.Success && res.Output != null, `GetDocumentLibrary succeeds (${describe(res)})`);
            AssertEqual(res.Output.Ledgers.length, 1, 'one application ledger');
            AssertEqual(res.Output.Ledgers[0].Rows.length, 30, '30 requirements returned');
            Assert(res.Output.Ledgers[0].Rows[0].Document != null, 'first requirement has document');
            AssertEqual(res.Output.Ledgers[0].Rows[0].Document.Versions.length, 2, 'first requirement keeps 2-version history');
            Assert(res.Output.Ledgers[0].Rows[4].Attestation != null, 'fifth requirement has attestation');
            Assert(providerCalls <= 4, `library returned in ${providerCalls} RunView/RunViews round trips (limit 4; ${sqlStatements} SQL statements)`);
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
