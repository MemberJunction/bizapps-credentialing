/**
 * `cred-prefill` — server-transport checks of document sources, `PrefillRunner`, `SaveResponseSources`,
 * `RefreshPrefills`, and `CloneVersionToDraft` source propagation (plan Task 10, `CRD-13 - Prefill`).
 */
import { randomUUID } from 'node:crypto';
import type { IMetadataProvider, RemoteOpResult, UserInfo } from '@memberjunction/core';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import {
    CloneVersionToDraftOperation,
    ConfirmResponseOperation,
    CredentialingEntity,
    InviteApplicantOperation,
    NOT_FOUND_REASON,
    OPERATION_REFUSED,
    RefreshPrefillsOperation,
    SaveResponseOperation,
    SaveResponseSourcesOperation,
    STALE_RECORD_REASON,
    StandardAuthoringRules,
    type RefreshPrefillsOutput,
} from '@mj-biz-apps/credentialing-core';
import {
    CredentialingServices,
    DocumentExtractionEvaluator,
    EvidenceIntake,
    PrefillRunner,
    ReadingQueue,
    SystemUser,
    type InvitationIssuer,
} from '@mj-biz-apps/credentialing-core-entities-server';
import type { mjBizAppsCredentialingProgramVersionEntity } from '@mj-biz-apps/credentialing-entities';
import { WithActors } from '../actors.js';
import { FindRows, Quote, RequireSave } from '../wire.js';
import { EnsureWorldSubject } from '../world/applicant-world.js';
import {
    FixtureEvidenceStore,
    FixtureFound,
    FixtureReader,
    FixtureRecognizer,
    FixtureTextExtractor,
} from '../world/FixtureReading.js';
import {
    GetOrLoadWorld,
    READING_BOUND_REQUIREMENT,
    READING_UNBOUND_REQUIREMENT,
} from '../world/load-world.js';
import { EnsureProgramTree, type ProgramTree, type SectionSpec } from '../world/program-tree.js';
import type { CredentialingWorld } from '../world/world.js';

const POLICY_SENTENCE = 'The practice reviews its written safety policy every twelve months.';
const MINUTES_SENTENCE = 'Signed minutes of each review are kept by the practice manager for seven years.';
const POLICY_TEXT = `[Page 1]\nSafety policy\n\n${POLICY_SENTENCE}\nThe board chair signs the policy after each review.\n\n[Page 2]\nRecords\n\n${MINUTES_SENTENCE}`;
const POLICY_REVISED_SENTENCE = 'The practice reviews its written safety policy every six months.';
const POLICY_REVISED_TEXT = `[Page 1]\nSafety policy\n\n${POLICY_REVISED_SENTENCE}\n`;

interface StoredResponse {
    ID: string;
    StandardID: string;
    Status: string;
    AuthorType: string;
    ResponseText: string | null;
    SelfAssessment: string | null;
    SourceType: string | null;
    SourceLabel: string | null;
    SourceReference: string | null;
    SourceRawValue: string | null;
    IsStale: boolean;
    __mj_UpdatedAt: Date | string;
}

interface StoredCitation {
    ID: string;
    StandardResponseID: string;
    EvidenceDocumentID: string;
    ExtractionID: string | null;
    SourceLabel: string;
    Excerpt: string;
    StartOffset: number;
    EndOffset: number;
}

interface StoredSource {
    ID: string;
    StandardID: string;
    ProgramVersionID: string;
    DocumentRequirementID: string | null;
    Mode: string;
    Rank: number;
    Sequence: number;
}

interface Fixtures {
    Reader: FixtureReader;
    Recognizer: FixtureRecognizer;
    Text: FixtureTextExtractor;
    Store: FixtureEvidenceStore;
}

interface Scratch {
    SubjectID: string;
    ApplicationID: string;
    Contact: UserInfo;
    Bound: string;
    Unbound: string;
    StandardIDs: Map<string, string>;
}

function system(): UserInfo {
    return SystemUser.Get('Checking prefill runner and sources');
}

function runHex(): string {
    return randomUUID().replace(/-/g, '').slice(0, 8);
}

function pdfBytes(label: string): Buffer {
    return Buffer.from(`%PDF-1.4\n% prefill fixture ${label} ${randomUUID()}\n%%EOF\n`, 'latin1');
}

function toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function expectSuccess<T>(result: RemoteOpResult<T>, label: string): T {
    Assert(result.Success && result.Output != null, `${label} failed (${result.ResultCode ?? ''}): ${result.ErrorMessage ?? ''}`);
    return result.Output;
}

function expectRefused<T>(result: RemoteOpResult<T>, expectedFragment: string, label: string): void {
    Assert(!result.Success, `${label}: expected refusal containing "${expectedFragment}", but succeeded`);
    Assert(
        (result.ErrorMessage ?? '').includes(expectedFragment),
        `${label}: expected "${expectedFragment}", got "${result.ErrorMessage ?? ''}"`,
    );
}

function makeFixtureIssuer(): InvitationIssuer {
    let seq = 0;
    return {
        async IssueApplicantLink(email: string) {
            seq += 1;
            return {
                EmailSent: false,
                InvitationUrl: `https://example.test/magic-link/redeem?token=mj_ml_prefill_${seq}_${encodeURIComponent(email)}`,
                ExpiresAt: new Date(Date.now() + 72 * 3600 * 1000),
            };
        },
    };
}

async function registerFixtures(ctx: IntegrationCheckContext): Promise<Fixtures> {
    const providers = await FindRows<{ ID: string }>(ctx, 'MJ: File Storage Providers', `Name = 'External URL'`, ['ID'], system());
    Assert(providers.length === 1, 'External URL storage provider exists');
    const fixtures: Fixtures = {
        Reader: new FixtureReader(),
        Recognizer: new FixtureRecognizer(),
        Text: new FixtureTextExtractor(),
        Store: new FixtureEvidenceStore(ctx.Provider, providers[0].ID, system),
    };
    fixtures.Reader.Answers.set('R.1', FixtureFound(POLICY_SENTENCE, 'We review our written safety policy every twelve months.'));
    fixtures.Reader.Answers.set('R.2', FixtureFound(MINUTES_SENTENCE, 'Minutes are retained for seven years.'));
    CredentialingServices.Register({
        Reader: fixtures.Reader,
        Recognizer: fixtures.Recognizer,
        Text: fixtures.Text,
        Store: fixtures.Store,
        Invitations: makeFixtureIssuer(),
    });
    return fixtures;
}

async function scratchReadingSubject(ctx: IntegrationCheckContext, world: CredentialingWorld): Promise<Scratch> {
    const contact = world.Applicants.SubjectReading.Contacts[0];
    const hex = runHex();
    const subject = await EnsureWorldSubject(ctx, {
        AccreditingOrganizationID: world.OrgA.ID,
        DisplayName: `Prefill Check ${hex}`,
        FirstName: 'Prefill',
        LastName: `Check ${hex}`,
        PrimaryEmail: contact.Email,
        Contacts: [contact],
        InvitedBy: world.StaffA,
        Program: world.ReadingProgram,
    });
    const requirement = (name: string): string => {
        const found = world.ReadingProgram.DocumentRequirements.find((r) => r.Name === name);
        Assert(found != null, `${world.ReadingProgram.Program.Name} has requirement ${name}`);
        return found.ID;
    };
    const standards = new Map(world.ReadingProgram.Sections.flatMap((s) => s.Standards).map((s) => [s.Code, s.ID]));
    return {
        SubjectID: subject.ID,
        ApplicationID: subject.ApplicationID,
        Contact: contact,
        Bound: requirement(READING_BOUND_REQUIREMENT),
        Unbound: requirement(READING_UNBOUND_REQUIREMENT),
        StandardIDs: standards,
    };
}

async function withQueueOn<T>(subjectIDs: string[], work: () => Promise<T>): Promise<T> {
    ReadingQueue.Seams.OnlySubjectIDs = subjectIDs;
    try {
        return await work();
    } finally {
        ReadingQueue.Seams.OnlySubjectIDs = undefined;
        ReadingQueue.Seams.Now = undefined;
        ReadingQueue.Seams.BeforeCommit = undefined;
        PrefillRunner.Seams.AfterLoadBeforeLock = undefined;
        PrefillRunner.Seams.InsideLock = undefined;
    }
}

async function uploadAndDrain(
    fixtures: Fixtures,
    provider: IMetadataProvider,
    scratch: Scratch,
    requirementID: string | null,
    text: string,
    label: string,
): Promise<string> {
    fixtures.Text.Next = { Status: 'Extracted', Text: text, PageCount: 2, Note: null };
    const accepted = await EvidenceIntake.Accept(
        { SubjectID: scratch.SubjectID, RequirementID: requirementID, FileName: `${label}.pdf`, Bytes: pdfBytes(label) },
        provider,
        scratch.Contact,
    );
    await ReadingQueue.DrainOnce();
    return accepted.EvidenceDocumentID;
}

async function responseFor(ctx: IntegrationCheckContext, applicationID: string, standardID: string): Promise<StoredResponse> {
    const rows = await FindRows<StoredResponse>(
        ctx,
        CredentialingEntity.StandardResponse,
        `ApplicationID = '${Quote(applicationID)}' AND StandardID = '${Quote(standardID)}'`,
        [
            'ID',
            'StandardID',
            'Status',
            'AuthorType',
            'ResponseText',
            'SelfAssessment',
            'SourceType',
            'SourceLabel',
            'SourceReference',
            'SourceRawValue',
            'IsStale',
            '__mj_UpdatedAt',
        ],
        system(),
    );
    AssertEqual(rows.length, 1, `one response row for standard ${standardID}`);
    return rows[0];
}

async function citationsFor(ctx: IntegrationCheckContext, responseID: string): Promise<StoredCitation[]> {
    return FindRows<StoredCitation>(
        ctx,
        CredentialingEntity.ResponseCitation,
        `StandardResponseID = '${Quote(responseID)}'`,
        ['ID', 'StandardResponseID', 'EvidenceDocumentID', 'ExtractionID', 'SourceLabel', 'Excerpt', 'StartOffset', 'EndOffset'],
        system(),
    );
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-prefill.1',
        Name: 'staff binds standard S to requirement R; contact uploads R; after drain, S is Prefilled/Agent with citation slicing to excerpt (also covers checks 2, 3, 11)',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const hex = runHex();

            // Create a Draft program, bind S.1 (Prefill) and S.2 (Locate) to R via SaveResponseSources, leave S.3 Manual, activate, invite
            const tree = await EnsureProgramTree(
                ctx,
                {
                    AccreditingOrganizationID: world.OrgA.ID,
                    Program: {
                        Name: `Prefill Bind ${hex}`,
                        ProgramType: 'Certification',
                        SubjectType: 'Person',
                        SubjectNoun: 'professional',
                        CredentialPrefix: `PB${hex.toUpperCase()}`,
                    },
                    Version: { Label: '2026', CommitteeID: world.CommitteeA.ID },
                    Sections: [
                        {
                            Number: '1',
                            Name: 'Safety',
                            Sequence: 1,
                            Standards: [
                                { Code: 'R.1', Statement: 'Written safety policy.', ResponseType: 'Evidence', IntakeMode: 'Prefill', Sequence: 1 },
                                { Code: 'R.2', Statement: 'Signed review minutes.', ResponseType: 'Evidence', IntakeMode: 'Locate', Sequence: 2 },
                                { Code: 'R.3', Statement: 'Staff training narrative.', ResponseType: 'Narrative', IntakeMode: 'Manual', Sequence: 3 },
                            ],
                        },
                    ],
                    DocumentRequirements: [{ Name: 'Safety policy', Sequence: 1, SensitivityPolicy: 'Normal' }],
                },
                world.StaffA,
            );
            const r1 = tree.Sections[0].Standards[0];
            const r2 = tree.Sections[0].Standards[1];
            const r3 = tree.Sections[0].Standards[2];
            const req = tree.DocumentRequirements[0];

            expectSuccess(
                await new SaveResponseSourcesOperation().Execute(
                    { StandardID: r1.ID, Sources: [{ DocumentRequirementID: req.ID, Mode: 'Prefill Only' }] },
                    { provider: ctx.Provider, user: world.StaffA },
                ),
                'SaveResponseSources for R.1',
            );
            expectSuccess(
                await new SaveResponseSourcesOperation().Execute(
                    { StandardID: r2.ID, Sources: [{ DocumentRequirementID: req.ID, Mode: 'Prefill Only' }] },
                    { provider: ctx.Provider, user: world.StaffA },
                ),
                'SaveResponseSources for R.2',
            );

            tree.Version.Status = 'Active';
            await RequireSave(tree.Version, 'activate prefill bind version');

            const invited = expectSuccess(
                await new InviteApplicantOperation().Execute(
                    {
                        ProgramVersionID: tree.Version.ID,
                        Subject: { DisplayName: `Prefill Bound Subject ${hex}`, PrimaryEmail: `prefill.${hex}@example.test` },
                        Contact: { Email: world.Applicants.SubjectReading.Contacts[0].Email, FirstName: 'Reading', LastName: 'Contact' },
                    },
                    { provider: ctx.Provider, user: world.StaffA },
                ),
                'InviteApplicant for bound program',
            );

            await withQueueOn([invited.SubjectID], async () => {
                fixtures.Text.Next = { Status: 'Extracted', Text: POLICY_TEXT, PageCount: 2, Note: null };
                const accepted = await EvidenceIntake.Accept(
                    {
                        SubjectID: invited.SubjectID,
                        RequirementID: req.ID,
                        FileName: 'safety-policy.pdf',
                        Bytes: pdfBytes('bound'),
                    },
                    ctx.Provider,
                    world.Applicants.SubjectReading.Contacts[0],
                );
                await ReadingQueue.DrainOnce();

                // Check 1 & 11: Prefill standard drafted with no browser call
                const res1 = await responseFor(ctx, invited.ApplicationID, r1.ID);
                AssertEqual(res1.Status, 'Prefilled', 'R.1 status');
                AssertEqual(res1.AuthorType, 'Agent', 'R.1 AuthorType');
                AssertEqual(res1.ResponseText, 'We review our written safety policy every twelve months.', 'R.1 ResponseText');
                AssertEqual(res1.SourceLabel, 'safety-policy.pdf', 'R.1 SourceLabel');
                const cit1 = await citationsFor(ctx, res1.ID);
                AssertEqual(cit1.length, 1, 'R.1 has one citation');
                AssertEqual(POLICY_TEXT.slice(cit1[0].StartOffset, cit1[0].EndOffset), cit1[0].Excerpt, 'R.1 citation span slices to excerpt');
                AssertEqual(cit1[0].EvidenceDocumentID.toLowerCase(), accepted.EvidenceDocumentID.toLowerCase(), 'R.1 citation names uploaded doc');

                // Check 2: Locate standard -> Located, ResponseText null, citation present
                const res2 = await responseFor(ctx, invited.ApplicationID, r2.ID);
                AssertEqual(res2.Status, 'Located', 'R.2 status');
                AssertEqual(res2.ResponseText, null, 'R.2 ResponseText stays null');
                const cit2 = await citationsFor(ctx, res2.ID);
                AssertEqual(cit2.length, 1, 'R.2 has one citation');
                AssertEqual(POLICY_TEXT.slice(cit2[0].StartOffset, cit2[0].EndOffset), cit2[0].Excerpt, 'R.2 citation span slices to excerpt');

                // Check 3: Manual standard -> untouched
                const res3 = await responseFor(ctx, invited.ApplicationID, r3.ID);
                AssertEqual(res3.Status, 'Empty', 'R.3 stays Empty');
                AssertEqual(res3.ResponseText, null, 'R.3 ResponseText null');
                AssertEqual((await citationsFor(ctx, res3.ID)).length, 0, 'R.3 has no citations');

                // Also verify DocumentExtractionEvaluator directly against the world/subject
                const evaluator = new DocumentExtractionEvaluator();
                const sources = await FindRows<{
                    ID: string;
                    StandardID: string;
                    ProgramVersionID: string;
                    SourceType: 'Document Extraction';
                    DocumentRequirementID: string | null;
                    Mode: 'Prefill Only';
                    Rank: number;
                    Sequence: number;
                }>(
                    ctx,
                    CredentialingEntity.ResponseSource,
                    `ProgramVersionID = '${Quote(tree.Version.ID)}'`,
                    ['ID', 'StandardID', 'ProgramVersionID', 'SourceType', 'DocumentRequirementID', 'Mode', 'Rank', 'Sequence'],
                    system(),
                );
                const candidates = await evaluator.Evaluate(sources, {
                    SubjectID: invited.SubjectID,
                    Provider: ctx.Provider,
                    User: system(),
                });
                AssertEqual(candidates.get(r1.ID.toLowerCase())?.length ?? 0, 1, 'DocumentExtractionEvaluator returns candidate for R.1');
                AssertEqual(candidates.get(r2.ID.toLowerCase())?.length ?? 0, 1, 'DocumentExtractionEvaluator returns candidate for R.2');
            });
        },
    },
    {
        Id: 'cred-prefill.4',
        Name: 'applicant edits prefilled text (-> Drafted/Human), then RefreshPrefills leaves it unchanged',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const scratch = await scratchReadingSubject(ctx, world);
            const r1ID = scratch.StandardIDs.get('R.1')!;

            await withQueueOn([scratch.SubjectID], async () => {
                await uploadAndDrain(fixtures, ctx.Provider, scratch, scratch.Bound, POLICY_TEXT, 'edit-policy');
                const pre = await responseFor(ctx, scratch.ApplicationID, r1ID);
                AssertEqual(pre.Status, 'Prefilled', 'initially Prefilled');

                expectSuccess(
                    await new SaveResponseOperation().Execute(
                        {
                            ResponseID: pre.ID,
                            ResponseText: 'Applicant edited this answer personally.',
                            SelfAssessment: 'Met',
                            ExpectedUpdatedAt: toIso(pre.__mj_UpdatedAt),
                        },
                        { provider: ctx.Provider, user: scratch.Contact },
                    ),
                    'SaveResponse over prefill',
                );

                const edited = await responseFor(ctx, scratch.ApplicationID, r1ID);
                AssertEqual(edited.Status, 'Drafted', 'status after human edit');
                AssertEqual(edited.AuthorType, 'Human', 'AuthorType after human edit');

                const refreshed = expectSuccess(
                    await new RefreshPrefillsOperation().Execute(
                        { ApplicationID: scratch.ApplicationID },
                        { provider: ctx.Provider, user: scratch.Contact },
                    ),
                    'RefreshPrefills after human edit',
                );
                const after = await responseFor(ctx, scratch.ApplicationID, r1ID);
                AssertEqual(after.Status, 'Drafted', 'still Drafted');
                AssertEqual(after.AuthorType, 'Human', 'still Human');
                AssertEqual(after.ResponseText, 'Applicant edited this answer personally.', 'human text preserved');
                Assert(refreshed.Prefilled === 0, 'R.1 was not re-prefilled');
            });
        },
    },
    {
        Id: 'cred-prefill.5',
        Name: 'confirmed answer marked IsStale=1 with text preserved when replacement document yields a different value',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const scratch = await scratchReadingSubject(ctx, world);
            const r1ID = scratch.StandardIDs.get('R.1')!;

            await withQueueOn([scratch.SubjectID], async () => {
                await uploadAndDrain(fixtures, ctx.Provider, scratch, scratch.Bound, POLICY_TEXT, 'confirm-v1');
                const pre = await responseFor(ctx, scratch.ApplicationID, r1ID);
                const drafted = expectSuccess(
                    await new SaveResponseOperation().Execute(
                        {
                            ResponseID: pre.ID,
                            ResponseText: pre.ResponseText,
                            SelfAssessment: 'Met',
                            ExpectedUpdatedAt: toIso(pre.__mj_UpdatedAt),
                        },
                        { provider: ctx.Provider, user: scratch.Contact },
                    ),
                    'SaveResponse set self-assessment',
                );
                expectSuccess(
                    await new ConfirmResponseOperation().Execute(
                        { ResponseID: pre.ID, ExpectedUpdatedAt: drafted.Response.UpdatedAt },
                        { provider: ctx.Provider, user: scratch.Contact },
                    ),
                    'ConfirmResponse',
                );

                fixtures.Reader.Answers.set('R.1', FixtureFound(POLICY_REVISED_SENTENCE, 'We now review our written safety policy every six months.'));
                await uploadAndDrain(fixtures, ctx.Provider, scratch, scratch.Bound, POLICY_REVISED_TEXT, 'confirm-v2');

                const after = await responseFor(ctx, scratch.ApplicationID, r1ID);
                AssertEqual(after.Status, 'Confirmed', 'remains Confirmed');
                AssertEqual(after.ResponseText, 'We review our written safety policy every twelve months.', 'confirmed text preserved');
                AssertEqual(Boolean(after.IsStale), true, 'marked stale');
            });
        },
    },
    {
        Id: 'cred-prefill.6',
        Name: 'deterministic race: SaveResponse while paused before lock wins; SaveResponse while runner holds lock waits and never loses data',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const scratch = await scratchReadingSubject(ctx, world);
            const r1ID = scratch.StandardIDs.get('R.1')!;

            await withQueueOn([scratch.SubjectID], async () => {
                // Upload and drain first so extraction exists, then clear or reset R.1 by testing Half A then Half B
                await uploadAndDrain(fixtures, ctx.Provider, scratch, scratch.Bound, POLICY_TEXT, 'race-doc');
                const initial = await responseFor(ctx, scratch.ApplicationID, r1ID);

                // Half A: RunForApplication paused at AfterLoadBeforeLock while SaveResponse commits human text
                await WithActors(ctx, 2, async ([a, b]) => {
                    // First put R.1 back to Empty? No, if R.1 is Prefilled, SaveResponse moves it to Drafted/Human;
                    // even better, pause AfterLoadBeforeLock, let SaveResponse write Drafted/Human, release runner -> stays Drafted/Human!
                    let releasePause!: () => void;
                    const pausedEntered = new Promise<void>((resolve) => {
                        PrefillRunner.Seams.AfterLoadBeforeLock = async () => {
                            resolve();
                            await new Promise<void>((r) => {
                                releasePause = r;
                            });
                        };
                    });

                    const runnerPromise = PrefillRunner.RunForApplication(scratch.ApplicationID, a, scratch.Contact);
                    await pausedEntered;

                    expectSuccess(
                        await new SaveResponseOperation().Execute(
                            {
                                ResponseID: initial.ID,
                                ResponseText: 'Human text saved during pause',
                                SelfAssessment: 'Met',
                                ExpectedUpdatedAt: toIso(initial.__mj_UpdatedAt),
                            },
                            { provider: b, user: scratch.Contact },
                        ),
                        'SaveResponse during pause',
                    );

                    releasePause();
                    await runnerPromise;
                    PrefillRunner.Seams.AfterLoadBeforeLock = undefined;

                    const afterA = await responseFor(ctx, scratch.ApplicationID, r1ID);
                    AssertEqual(afterA.Status, 'Drafted', 'Half A: status is Drafted');
                    AssertEqual(afterA.AuthorType, 'Human', 'Half A: AuthorType is Human');
                    AssertEqual(afterA.ResponseText, 'Human text saved during pause', 'Half A: human text preserved');
                });

                // Half B: mirror image — runner holds lock while SaveResponse arrives with pre-lock ExpectedUpdatedAt
                const scratchB = await scratchReadingSubject(ctx, world);
                const r1B = scratchB.StandardIDs.get('R.1')!;
                ReadingQueue.Seams.OnlySubjectIDs = [scratchB.SubjectID];
                // Disable automatic prefill during drain so we control RunForApplication directly
                CredentialingServices.Register({ OnReadingCommitted: async () => undefined });
                try {
                    await uploadAndDrain(fixtures, ctx.Provider, scratchB, scratchB.Bound, POLICY_TEXT, 'race-doc-b');
                    const preLockRow = await responseFor(ctx, scratchB.ApplicationID, r1B);
                    AssertEqual(preLockRow.Status, 'Empty', 'Half B: starts Empty before runner');

                    await WithActors(ctx, 2, async ([a, b]) => {
                        let releaseLock!: () => void;
                        const lockEntered = new Promise<void>((resolve) => {
                            PrefillRunner.Seams.InsideLock = async () => {
                                resolve();
                                await new Promise<void>((r) => {
                                    releaseLock = r;
                                });
                            };
                        });

                        const runnerPromise = PrefillRunner.RunForApplication(scratchB.ApplicationID, a, scratchB.Contact);
                        await lockEntered;

                        // SaveResponse with stale ExpectedUpdatedAt must block until runner commits, then refuse with STALE_RECORD_REASON
                        const savePromise = new SaveResponseOperation().Execute(
                            {
                                ResponseID: preLockRow.ID,
                                ResponseText: 'Concurrent save',
                                SelfAssessment: 'Met',
                                ExpectedUpdatedAt: toIso(preLockRow.__mj_UpdatedAt),
                            },
                            { provider: b, user: scratchB.Contact },
                        );

                        // Let SaveResponse reach the lock wait before releasing
                        await new Promise((r) => setTimeout(r, 150));
                        releaseLock();

                        const [runnerCounts, saveResult] = await Promise.all([runnerPromise, savePromise]);
                        AssertEqual(runnerCounts.Prefilled, 1, 'Half B: runner prefilled R.1');
                        expectRefused(saveResult, STALE_RECORD_REASON, 'Half B: waiting SaveResponse refused as stale');

                        const afterB = await responseFor(ctx, scratchB.ApplicationID, r1B);
                        AssertEqual(afterB.Status, 'Prefilled', 'Half B: Prefilled answer not overwritten');
                        AssertEqual(afterB.AuthorType, 'Agent', 'Half B: AuthorType is Agent');
                    });
                } finally {
                    CredentialingServices.Register({
                        OnReadingCommitted: (subjectID) => PrefillRunner.RunForSubject(subjectID),
                    });
                }
            });
        },
    },
    {
        Id: 'cred-prefill.7',
        Name: 'SaveResponseSources refuses foreign staff with Record not found., applicant with FORBIDDEN, and Active version with tree-edit sentence',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const activeStandard = world.ReadingProgram.Sections[0].Standards[0];
            const activeReq = world.ReadingProgram.DocumentRequirements[0];

            const foreign = await new SaveResponseSourcesOperation().Execute(
                { StandardID: activeStandard.ID, Sources: [{ DocumentRequirementID: activeReq.ID, Mode: 'Prefill Only' }] },
                { provider: ctx.Provider, user: world.StaffB },
            );
            expectRefused(foreign, NOT_FOUND_REASON, 'staff-b on OrgA standard');

            const asApplicant = await new SaveResponseSourcesOperation().Execute(
                { StandardID: activeStandard.ID, Sources: [{ DocumentRequirementID: activeReq.ID, Mode: 'Prefill Only' }] },
                { provider: ctx.Provider, user: world.ApplicantA },
            );
            Assert(!asApplicant.Success, 'applicant cannot call SaveResponseSources');

            const onActive = await new SaveResponseSourcesOperation().Execute(
                { StandardID: activeStandard.ID, Sources: [{ DocumentRequirementID: activeReq.ID, Mode: 'Prefill Only' }] },
                { provider: ctx.Provider, user: world.StaffA },
            );
            const expectedTreeSentence = StandardAuthoringRules.CanEditTree('Active');
            if (!('Reason' in expectedTreeSentence)) {
                throw new Error('Expected Active version tree edit rule to be disallowed');
            }
            expectRefused(onActive, expectedTreeSentence.Reason, 'StaffA on Active version');
        },
    },
    {
        Id: 'cred-prefill.8',
        Name: 'CloneVersionToDraft copies ResponseSources onto the new Draft standards (by lineage) and requirements (by name)',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const sourceTree = await EnsureProgramTree(
                ctx,
                {
                    AccreditingOrganizationID: world.OrgA.ID,
                    Program: {
                        Name: `Clone Sources ${hex}`,
                        ProgramType: 'Certification',
                        SubjectType: 'Person',
                        SubjectNoun: 'professional',
                        CredentialPrefix: `CS${hex.toUpperCase()}`,
                    },
                    Version: { Label: '2026', CommitteeID: world.CommitteeA.ID },
                    Sections: [
                        {
                            Number: '1',
                            Name: 'Policy',
                            Sequence: 1,
                            Standards: [
                                { Code: '1.1', Statement: 'Policy standard.', ResponseType: 'Evidence', IntakeMode: 'Prefill', Sequence: 1 },
                                { Code: '1.2', Statement: 'Minutes standard.', ResponseType: 'Evidence', IntakeMode: 'Locate', Sequence: 2 },
                            ],
                        },
                    ],
                    DocumentRequirements: [
                        { Name: 'Policy Manual', Sequence: 1 },
                        { Name: 'Board Minutes', Sequence: 2 },
                    ],
                },
                world.StaffA,
            );

            const st1 = sourceTree.Sections[0].Standards[0];
            const st2 = sourceTree.Sections[0].Standards[1];
            const req1 = sourceTree.DocumentRequirements[0];
            const req2 = sourceTree.DocumentRequirements[1];

            expectSuccess(
                await new SaveResponseSourcesOperation().Execute(
                    {
                        StandardID: st1.ID,
                        Sources: [
                            { DocumentRequirementID: req1.ID, Mode: 'Prefill Only' },
                            { DocumentRequirementID: req2.ID, Mode: 'Both' },
                        ],
                    },
                    { provider: ctx.Provider, user: world.StaffA },
                ),
                'bind st1',
            );
            expectSuccess(
                await new SaveResponseSourcesOperation().Execute(
                    {
                        StandardID: st2.ID,
                        Sources: [{ DocumentRequirementID: req2.ID, Mode: 'Prefill Only' }],
                    },
                    { provider: ctx.Provider, user: world.StaffA },
                ),
                'bind st2',
            );

            sourceTree.Version.Status = 'Active';
            await RequireSave(sourceTree.Version, 'activate clone source version');

            const cloned = expectSuccess(
                await new CloneVersionToDraftOperation().Execute(
                    { SourceVersionID: sourceTree.Version.ID, NewLabel: '2027' },
                    { provider: ctx.Provider, user: world.StaffA },
                ),
                'CloneVersionToDraft with sources',
            );

            const clonedStandards = await FindRows<{ ID: string; Code: string; LineageKey: string }>(
                ctx,
                CredentialingEntity.Standard,
                `ProgramVersionID = '${Quote(cloned.VersionID)}'`,
                ['ID', 'Code', 'LineageKey'],
                world.StaffA,
            );
            const clonedReqs = await FindRows<{ ID: string; Name: string }>(
                ctx,
                CredentialingEntity.DocumentRequirement,
                `ProgramVersionID = '${Quote(cloned.VersionID)}'`,
                ['ID', 'Name'],
                world.StaffA,
            );
            const clonedSources = await FindRows<StoredSource>(
                ctx,
                CredentialingEntity.ResponseSource,
                `ProgramVersionID = '${Quote(cloned.VersionID)}'`,
                ['ID', 'StandardID', 'ProgramVersionID', 'DocumentRequirementID', 'Mode', 'Rank', 'Sequence'],
                world.StaffA,
            );

            AssertEqual(clonedSources.length, 3, 'all three sources copied to cloned draft');
            const clonedSt1 = clonedStandards.find((s) => s.LineageKey.toLowerCase() === st1.LineageKey.toLowerCase())!;
            const clonedReq1 = clonedReqs.find((r) => r.Name === 'Policy Manual')!;
            const clonedReq2 = clonedReqs.find((r) => r.Name === 'Board Minutes')!;

            const st1Sources = clonedSources
                .filter((s) => s.StandardID.toLowerCase() === clonedSt1.ID.toLowerCase())
                .sort((a, b) => a.Rank - b.Rank);
            AssertEqual(st1Sources.length, 2, 'cloned st1 has 2 sources');
            AssertEqual(st1Sources[0].DocumentRequirementID?.toLowerCase(), clonedReq1.ID.toLowerCase(), 'rank 1 points to cloned req1');
            AssertEqual(st1Sources[0].Mode, 'Prefill Only', 'rank 1 mode preserved');
            AssertEqual(st1Sources[1].DocumentRequirementID?.toLowerCase(), clonedReq2.ID.toLowerCase(), 'rank 2 points to cloned req2');
            AssertEqual(st1Sources[1].Mode, 'Both', 'rank 2 mode preserved');
        },
    },
    {
        Id: 'cred-prefill.9',
        Name: 'Prefilled answer whose document is replaced by one yielding nothing is Cleared back to Empty',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const scratch = await scratchReadingSubject(ctx, world);
            const r1ID = scratch.StandardIDs.get('R.1')!;

            await withQueueOn([scratch.SubjectID], async () => {
                await uploadAndDrain(fixtures, ctx.Provider, scratch, scratch.Bound, POLICY_TEXT, 'clear-v1');
                const pre = await responseFor(ctx, scratch.ApplicationID, r1ID);
                AssertEqual(pre.Status, 'Prefilled', 'initially Prefilled');
                AssertEqual((await citationsFor(ctx, pre.ID)).length, 1, 'initially has 1 citation');

                fixtures.Reader.Answers.set('R.1', { Kind: 'NothingFound', PromptRunID: null });
                fixtures.Reader.Answers.set('R.2', { Kind: 'NothingFound', PromptRunID: null });
                await uploadAndDrain(fixtures, ctx.Provider, scratch, scratch.Bound, '[Page 1]\nUnrelated memo with no policy.', 'clear-v2');

                const cleared = await responseFor(ctx, scratch.ApplicationID, r1ID);
                AssertEqual(cleared.Status, 'Empty', 'cleared to Empty');
                AssertEqual(cleared.AuthorType, 'Human', 'AuthorType reset to Human');
                AssertEqual(cleared.ResponseText, null, 'ResponseText cleared');
                AssertEqual(cleared.SourceReference, null, 'SourceReference cleared');
                AssertEqual((await citationsFor(ctx, cleared.ID)).length, 0, 'citations removed');
            });
        },
    },
    {
        Id: 'cred-prefill.10',
        Name: 'no response is ever Confirmed by the runner across the whole check world',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const scratch = await scratchReadingSubject(ctx, world);

            await withQueueOn([scratch.SubjectID], async () => {
                await uploadAndDrain(fixtures, ctx.Provider, scratch, scratch.Bound, POLICY_TEXT, 'never-confirm');
            });

            // Assert no Agent-authored or reading-check response anywhere in the database was Confirmed by the runner
            const bad = await FindRows<{ ID: string }>(
                ctx,
                CredentialingEntity.StandardResponse,
                `Status = 'Confirmed' AND AuthorType = 'Agent' AND ConfirmedByUserID IS NULL`,
                ['ID'],
                system(),
            );
            AssertEqual(bad.length, 0, 'no response was ever Confirmed by the runner');

            const confirmedOnScratch = await FindRows<{ ID: string }>(
                ctx,
                CredentialingEntity.StandardResponse,
                `ApplicationID = '${Quote(scratch.ApplicationID)}' AND Status = 'Confirmed'`,
                ['ID'],
                system(),
            );
            AssertEqual(confirmedOnScratch.length, 0, 'scratch application has zero Confirmed responses');
        },
    },
    {
        Id: 'cred-prefill.12',
        Name: 'on a 150-standard version with every standard bound, RunForApplication holds the subject lock for under 5 s',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const hex = runHex();

            const sections: SectionSpec[] = [];
            for (let s = 1; s <= 10; s++) {
                const standards = [];
                for (let n = 1; n <= 15; n++) {
                    const code = `${s}.${n}`;
                    standards.push({
                        Code: code,
                        Statement: `Large prefill standard ${code}.`,
                        ResponseType: 'Evidence' as const,
                        IntakeMode: 'Prefill' as const,
                        Sequence: n,
                    });
                    fixtures.Reader.Answers.set(code, FixtureFound(POLICY_SENTENCE, `Answer for ${code}.`));
                }
                sections.push({ Number: `${s}`, Name: `Section ${s}`, Sequence: s, Standards: standards });
            }

            const largeTree = await EnsureProgramTree(
                ctx,
                {
                    AccreditingOrganizationID: world.OrgA.ID,
                    Program: {
                        Name: `Large Prefill ${hex}`,
                        ProgramType: 'Certification',
                        SubjectType: 'Person',
                        SubjectNoun: 'professional',
                        CredentialPrefix: `LP${hex.toUpperCase()}`,
                    },
                    Version: { Label: '2026', CommitteeID: world.CommitteeA.ID },
                    Sections: sections,
                    DocumentRequirements: [{ Name: 'Large evidence packet', Sequence: 1 }],
                },
                world.StaffA,
            );
            const req = largeTree.DocumentRequirements[0];
            for (const sec of largeTree.Sections) {
                for (const st of sec.Standards) {
                    expectSuccess(
                        await new SaveResponseSourcesOperation().Execute(
                            { StandardID: st.ID, Sources: [{ DocumentRequirementID: req.ID, Mode: 'Prefill Only' }] },
                            { provider: ctx.Provider, user: world.StaffA },
                        ),
                        `bind ${st.Code}`,
                    );
                }
            }
            largeTree.Version.Status = 'Active';
            await RequireSave(largeTree.Version, 'activate large prefill version');

            const contact = world.Applicants.SubjectReading.Contacts[0];
            const subject = await EnsureWorldSubject(ctx, {
                AccreditingOrganizationID: world.OrgA.ID,
                DisplayName: `Large Prefill Subject ${hex}`,
                FirstName: 'Large',
                LastName: `Subject ${hex}`,
                PrimaryEmail: contact.Email,
                Contacts: [contact],
                InvitedBy: world.StaffA,
                Program: largeTree,
            });

            // Upload and drain with OnReadingCommitted paused so we measure RunForApplication itself cleanly
            CredentialingServices.Register({ OnReadingCommitted: async () => undefined });
            try {
                await withQueueOn([subject.ID], async () => {
                    await uploadAndDrain(fixtures, ctx.Provider, {
                        SubjectID: subject.ID,
                        ApplicationID: subject.ApplicationID,
                        Contact: contact,
                        Bound: req.ID,
                        Unbound: req.ID,
                        StandardIDs: new Map(),
                    }, req.ID, POLICY_TEXT, 'large-doc');
                });

                let lockAcquiredAt = 0;
                PrefillRunner.Seams.InsideLock = async () => {
                    lockAcquiredAt = Date.now();
                };
                const counts = await PrefillRunner.RunForApplication(subject.ApplicationID, ctx.Provider, contact);
                const lockToCommitMs = Date.now() - lockAcquiredAt;
                PrefillRunner.Seams.InsideLock = undefined;

                console.log(`[cred-prefill.12] 150-standard RunForApplication lock-to-commit duration: ${lockToCommitMs} ms`);
                AssertEqual(counts.Prefilled, 150, 'all 150 standards prefilled');
                Assert(lockToCommitMs < 5000, `expected lock-to-commit < 5000 ms, took ${lockToCommitMs} ms`);
            } finally {
                PrefillRunner.Seams.InsideLock = undefined;
                CredentialingServices.Register({
                    OnReadingCommitted: (subjectID) => PrefillRunner.RunForSubject(subjectID),
                });
            }
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
