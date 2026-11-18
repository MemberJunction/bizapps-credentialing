/**
 * `cred-submission` — server-transport checks of `Credentialing.GetSubmissionGate`,
 * `Credentialing.SubmitApplication`, post-submit freeze, staff notifications, and durable
 * `ApplicationEvents` dispatch / redispatch (plan Task 11, `CRD-14 - Submission`).
 */
import { randomUUID } from 'node:crypto';
import type { IMetadataProvider, RemoteOpResult, UserInfo } from '@memberjunction/core';
import type { MJUserNotificationEntity } from '@memberjunction/core-entities';
import { UUIDsEqual } from '@memberjunction/global';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import {
    AttestInLieuOperation,
    ConfirmDocumentCurrentOperation,
    ConfirmResponseOperation,
    CredentialingEntity,
    GetSubmissionGateOperation,
    ONLY_APPLICANT_SUBMIT_REASON,
    OPERATION_REFUSED,
    RefreshPrefillsOperation,
    ReopenResponseOperation,
    SaveResponseOperation,
    SUBMISSION_DISPATCH_GAVE_UP_NOTE,
    SubmissionGate,
    SubmitApplicationOperation,
    type AttestationInput,
    type SubmitApplicationOutput,
} from '@mj-biz-apps/credentialing-core';
import {
    ApplicationEvents,
    CredentialingServices,
    EvidenceIntake,
    ReadingQueue,
    SystemUser,
    type InvitationIssuer,
    type StaffNotifier,
} from '@mj-biz-apps/credentialing-core-entities-server';
import type { mjBizAppsCredentialingProgramVersionEntity } from '@mj-biz-apps/credentialing-entities';
import {
    APPLICATION_SUBMITTED_NOTIFICATION_TYPE,
    EngineStaffNotifier,
} from '@mj-biz-apps/credentialing-server/notifications';
import { FindRows, Quote, RequireSave } from '../wire.js';
import { EnsureWorldSubject } from '../world/applicant-world.js';
import {
    FixtureEvidenceStore,
    FixtureFound,
    FixtureReader,
    FixtureRecognizer,
    FixtureTextExtractor,
} from '../world/FixtureReading.js';
import { EnsureUser, GetOrLoadWorld } from '../world/load-world.js';
import { EnsureProgramTree, type ProgramTree } from '../world/program-tree.js';
import type { CredentialingWorld } from '../world/world.js';

const POLICY_SENTENCE = 'Written policy reviewed annually by the board.';
const POLICY_TEXT = `[Page 1]\n${POLICY_SENTENCE}\n`;
const FUTURE_DATE = '2099-01-15';
const VALID_ATTESTATION: AttestationInput = {
    OfficerName: 'Pat Lee',
    OfficerRole: 'Board Chair',
    ApprovalDate: '2026-11-10',
    Accepted: true,
};

interface StoredApplicationRow {
    ID: string;
    Status: string;
    SubmittedAt: Date | string | null;
    SubmittedByUserID: string | null;
    SubmissionDispatchedAt: Date | string | null;
    SubmissionDispatchClaimID: string | null;
    SubmissionDispatchClaimedAt: Date | string | null;
    SubmissionDispatchAttempts: number;
    SubmissionDispatchNote: string | null;
    SubjectSnapshot: string | null;
    AttestationOfficerName: string | null;
    AttestationOfficerRole: string | null;
    AttestationApprovalDate: Date | string | null;
    AttestationStatement: string | null;
    AttestedByUserID: string | null;
    AttestedAt: Date | string | null;
}

interface StoredApplicationDocumentRow {
    ID: string;
    ApplicationID: string;
    SubjectID: string;
    EvidenceDocumentID: string | null;
    DocumentAttestationID: string | null;
    FrozenAt: Date | string;
}

interface StoredResponseRow {
    ID: string;
    StandardID: string;
    Status: string;
    ResponseText: string | null;
    SelfAssessment: string | null;
    __mj_UpdatedAt: Date | string;
}

interface StoredEvidenceDocRow {
    ID: string;
    DocumentRequirementID: string | null;
    FileID: string;
    ContentHash: string;
    Status: string;
    SupersedesDocumentID: string | null;
    TextStatus: string;
    ExtractedText: string | null;
    ReadingStatus: string;
}

interface SubmissionScratch {
    Tree: ProgramTree;
    SubjectID: string;
    ApplicationID: string;
    Contact: UserInfo;
    RequiredUploadID: string;
    RestrictedReqID: string;
    OptionalReqID: string;
    Standards: Map<string, string>;
}

interface Fixtures {
    Reader: FixtureReader;
    Recognizer: FixtureRecognizer;
    Text: FixtureTextExtractor;
    Store: FixtureEvidenceStore;
}

function system(): UserInfo {
    return SystemUser.Get('Checking application submission and freeze');
}

function runHex(): string {
    return randomUUID().replace(/-/g, '').slice(0, 8);
}

function pdfBytes(label: string): Buffer {
    return Buffer.from(`%PDF-1.4\n% submission fixture ${label} ${randomUUID()}\n%%EOF\n`, 'latin1');
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
    return {
        async IssueApplicantLink(email: string) {
            return {
                EmailSent: false,
                InvitationUrl: `https://example.test/magic-link/redeem?token=mj_ml_sub_${encodeURIComponent(email)}`,
                ExpiresAt: new Date(Date.now() + 72 * 3600 * 1000),
            };
        },
    };
}

async function registerFixtures(
    ctx: IntegrationCheckContext,
    notifier: StaffNotifier = new EngineStaffNotifier(),
): Promise<Fixtures> {
    const providers = await FindRows<{ ID: string }>(ctx, 'MJ: File Storage Providers', `Name = 'External URL'`, ['ID'], system());
    Assert(providers.length === 1, 'External URL storage provider exists');
    const fixtures: Fixtures = {
        Reader: new FixtureReader(),
        Recognizer: new FixtureRecognizer(),
        Text: new FixtureTextExtractor(),
        Store: new FixtureEvidenceStore(ctx.Provider, providers[0].ID, system),
    };
    fixtures.Reader.Answers.set('1.1', FixtureFound(POLICY_SENTENCE, 'Policy reviewed annually.'));
    fixtures.Text.Next = { Status: 'Extracted', Text: POLICY_TEXT, PageCount: 1, Note: null };
    CredentialingServices.Register({
        Reader: fixtures.Reader,
        Recognizer: fixtures.Recognizer,
        Text: fixtures.Text,
        Store: fixtures.Store,
        Invitations: makeFixtureIssuer(),
        Notifier: notifier,
    });
    return fixtures;
}

async function createScratchApplication(
    ctx: IntegrationCheckContext,
    world: CredentialingWorld,
    options: { RequiresAttestation?: boolean; BindPolicyTo1_1?: boolean } = {},
): Promise<SubmissionScratch> {
    const hex = runHex();
    const requiresAttestation = options.RequiresAttestation ?? true;
    const tree = await EnsureProgramTree(
        ctx,
        {
            AccreditingOrganizationID: world.OrgA.ID,
            Program: {
                Name: `Submit Check ${hex}`,
                ProgramType: 'Accreditation',
                SubjectType: 'Person',
                SubjectNoun: 'applicant',
                CredentialPrefix: `SUB${hex.toUpperCase()}`,
            },
            Version: { Label: '2026', CommitteeID: world.CommitteeA.ID },
            Sections: [
                {
                    Number: '1',
                    Name: 'Eligibility & Governance',
                    Sequence: 1,
                    Standards: [
                        { Code: '1.1', Statement: 'Eligibility standard.', ResponseType: 'Narrative', IntakeMode: 'Manual', Sequence: 1 },
                        { Code: '1.2', Statement: 'Governance standard.', ResponseType: 'Narrative', IntakeMode: 'Manual', Sequence: 2 },
                    ],
                },
                {
                    Number: '2',
                    Name: 'Operations',
                    Sequence: 2,
                    Standards: [
                        { Code: '2.1', Statement: 'Operations standard.', ResponseType: 'Narrative', IntakeMode: 'Manual', Sequence: 1 },
                    ],
                },
            ],
            DocumentRequirements: [
                { Name: 'Safety Policy', IsRequired: true, SensitivityPolicy: 'Normal', Sequence: 1 },
                { Name: 'Restricted Audit', IsRequired: true, SensitivityPolicy: 'Restricted Allowed', Sequence: 2 },
                { Name: 'Optional Brochure', IsRequired: false, SensitivityPolicy: 'Normal', Sequence: 3 },
            ],
        },
        world.StaffA,
    );

    const version = await ctx.Provider.GetEntityObject<mjBizAppsCredentialingProgramVersionEntity>(
        CredentialingEntity.ProgramVersion,
        world.StaffA,
    );
    Assert(await version.Load(tree.Version.ID), 'load scratch version');
    version.RequiresGoverningBodyAttestation = requiresAttestation;
    await RequireSave(version, 'configure attestation');

    const elStd = tree.Sections[0].Standards[0];
    elStd.IsEligibility = true;
    await RequireSave(elStd, 'mark 1.1 eligibility');

    if (options.BindPolicyTo1_1) {
        elStd.IntakeMode = 'Prefill';
        await RequireSave(elStd, 'enable prefill on 1.1');
        const reqPolicy = tree.DocumentRequirements.find((r) => r.Name === 'Safety Policy');
        Assert(reqPolicy != null, 'Safety Policy requirement exists');
        const src = await ctx.Provider.GetEntityObject<
            import('@mj-biz-apps/credentialing-entities').mjBizAppsCredentialingResponseSourceEntity
        >(CredentialingEntity.ResponseSource, world.StaffA);
        src.NewRecord();
        src.StandardID = elStd.ID;
        src.ProgramVersionID = tree.Version.ID;
        src.SourceType = 'Document Extraction';
        src.DocumentRequirementID = reqPolicy.ID;
        src.Mode = 'Prefill Only';
        src.Rank = 1;
        src.Sequence = 1;
        await RequireSave(src, 'bind 1.1 while version is Draft');
    }

    version.Status = 'Active';
    await RequireSave(version, 'activate scratch version');
    tree.Version = version;

    const contact = await EnsureUser(ctx, `submit.${hex}@example.test`, `Submit${hex}`, ['Credentialing Applicant'], 'Applicant');
    const subject = await EnsureWorldSubject(ctx, {
        AccreditingOrganizationID: world.OrgA.ID,
        DisplayName: `Submit Subject ${hex}`,
        FirstName: 'Applicant',
        LastName: `Submit${hex}`,
        PrimaryEmail: contact.Email,
        Contacts: [contact],
        InvitedBy: world.StaffA,
        Program: tree,
    });

    const req = (name: string): string => {
        const found = tree.DocumentRequirements.find((r) => r.Name === name);
        Assert(found != null, `requirement ${name} exists`);
        return found.ID;
    };
    const standards = new Map(tree.Sections.flatMap((s) => s.Standards).map((s) => [s.Code, s.ID]));
    return {
        Tree: tree,
        SubjectID: subject.ID,
        ApplicationID: subject.ApplicationID,
        Contact: contact,
        RequiredUploadID: req('Safety Policy'),
        RestrictedReqID: req('Restricted Audit'),
        OptionalReqID: req('Optional Brochure'),
        Standards: standards,
    };
}

async function confirmAllStandards(ctx: IntegrationCheckContext, scratch: SubmissionScratch): Promise<void> {
    const rows = await FindRows<StoredResponseRow>(
        ctx,
        CredentialingEntity.StandardResponse,
        `ApplicationID = '${Quote(scratch.ApplicationID)}'`,
        ['ID', 'StandardID', 'Status', 'ResponseText', 'SelfAssessment', '__mj_UpdatedAt'],
        scratch.Contact,
    );
    for (const row of rows) {
        const saved = expectSuccess(
            await new SaveResponseOperation().Execute(
                {
                    ResponseID: row.ID,
                    ResponseText: `Confirmed response ${runHex()}`,
                    SelfAssessment: 'Met',
                    ExpectedUpdatedAt: toIso(row.__mj_UpdatedAt),
                },
                { provider: ctx.Provider, user: scratch.Contact },
            ),
            `save response ${row.ID}`,
        );
        expectSuccess(
            await new ConfirmResponseOperation().Execute(
                { ResponseID: row.ID, ExpectedUpdatedAt: saved.Response.UpdatedAt },
                { provider: ctx.Provider, user: scratch.Contact },
            ),
            `confirm response ${row.ID}`,
        );
    }
}

async function fulfillRequiredDocuments(
    ctx: IntegrationCheckContext,
    fixtures: Fixtures,
    scratch: SubmissionScratch,
    options: { IncludeGeneral?: boolean } = {},
): Promise<{ PolicyDocID: string; RestrictedAttestationID: string; GeneralDocID: string | null }> {
    fixtures.Text.Next = { Status: 'Extracted', Text: POLICY_TEXT, PageCount: 1, Note: null };
    const policy = await EvidenceIntake.Accept(
        { SubjectID: scratch.SubjectID, RequirementID: scratch.RequiredUploadID, FileName: 'safety-policy.pdf', Bytes: pdfBytes('policy') },
        ctx.Provider,
        scratch.Contact,
    );
    const attest = expectSuccess(
        await new AttestInLieuOperation().Execute(
            {
                SubjectID: scratch.SubjectID,
                DocumentRequirementID: scratch.RestrictedReqID,
                Statement: 'Available on site during review.',
            },
            { provider: ctx.Provider, user: scratch.Contact },
        ),
        'attest restricted requirement',
    );
    let generalDocID: string | null = null;
    if (options.IncludeGeneral) {
        fixtures.Text.Next = { Status: 'Extracted', Text: POLICY_TEXT, PageCount: 1, Note: null };
        const gen = await EvidenceIntake.Accept(
            { SubjectID: scratch.SubjectID, RequirementID: null, FileName: 'general-notes.pdf', Bytes: pdfBytes('general') },
            ctx.Provider,
            scratch.Contact,
        );
        generalDocID = gen.EvidenceDocumentID;
    }
    return {
        PolicyDocID: policy.EvidenceDocumentID,
        RestrictedAttestationID: attest.DocumentAttestationID,
        GeneralDocID: generalDocID,
    };
}

async function readApplication(ctx: IntegrationCheckContext, applicationID: string): Promise<StoredApplicationRow> {
    const rows = await FindRows<StoredApplicationRow>(
        ctx,
        CredentialingEntity.Application,
        `ID = '${Quote(applicationID)}'`,
        [
            'ID',
            'Status',
            'SubmittedAt',
            'SubmittedByUserID',
            'SubmissionDispatchedAt',
            'SubmissionDispatchClaimID',
            'SubmissionDispatchClaimedAt',
            'SubmissionDispatchAttempts',
            'SubmissionDispatchNote',
            'SubjectSnapshot',
            'AttestationOfficerName',
            'AttestationOfficerRole',
            'AttestationApprovalDate',
            'AttestationStatement',
            'AttestedByUserID',
            'AttestedAt',
        ],
        system(),
    );
    AssertEqual(rows.length, 1, `application ${applicationID} exists`);
    return rows[0];
}

async function readAppDocs(ctx: IntegrationCheckContext, applicationID: string): Promise<StoredApplicationDocumentRow[]> {
    return FindRows<StoredApplicationDocumentRow>(
        ctx,
        CredentialingEntity.ApplicationDocument,
        `ApplicationID = '${Quote(applicationID)}'`,
        ['ID', 'ApplicationID', 'SubjectID', 'EvidenceDocumentID', 'DocumentAttestationID', 'FrozenAt'],
        system(),
    );
}

async function waitForCondition(check: () => Promise<boolean>, timeoutMs = 5000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await check()) return true;
        await new Promise((r) => setTimeout(r, 40));
    }
    return check();
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-submission.1',
        Name: 'gate on a fresh application lists every section unpassed and every required document missing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            await registerFixtures(ctx);
            const scratch = await createScratchApplication(ctx, world);

            const gate = expectSuccess(
                await new GetSubmissionGateOperation().Execute(
                    { ApplicationID: scratch.ApplicationID },
                    { provider: ctx.Provider, user: scratch.Contact },
                ),
                'GetSubmissionGate on fresh application',
            );

            AssertEqual(gate.CanSubmit, false, 'CanSubmit is false');
            Assert(gate.RequiresAttestation, 'RequiresAttestation is true');
            AssertEqual(
                gate.AttestationStatement,
                SubmissionGate.FormatAttestationStatement(`Submit Subject ${scratch.Tree.Program.Name.replace('Submit Check ', '')}`),
                'AttestationStatement uses subject display name',
            );
            const sections = gate.Items.filter((i) => i.Kind === 'Section');
            AssertEqual(sections.length, 2, 'two sections listed');
            Assert(sections.every((s) => !s.Passed), 'every section unpassed');
            const docs = gate.Items.filter((i) => i.Kind === 'Document');
            AssertEqual(docs.length, 2, 'two required documents listed (optional excluded)');
            Assert(docs.every((d) => !d.Passed), 'every required document missing');
            Assert(gate.Gaps.length >= 5, 'eligibility + 2 sections + 2 docs + attestation in Gaps');
        },
    },
    {
        Id: 'cred-submission.2',
        Name: 'submit while blocked refuses with the count sentence and leaves status Draft',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            await registerFixtures(ctx);
            const scratch = await createScratchApplication(ctx, world);

            const res = await new SubmitApplicationOperation().Execute(
                { ApplicationID: scratch.ApplicationID, Attestation: null },
                { provider: ctx.Provider, user: scratch.Contact },
            );
            expectRefused(res, 'items still need attention before you can submit.', 'blocked submit');
            AssertEqual((await readApplication(ctx, scratch.ApplicationID)).Status, 'Draft', 'Status remains Draft');
        },
    },
    {
        Id: 'cred-submission.3',
        Name: 'all confirmed + documents present + attestation -> Submitted, stamps set, ApplicationDocument rows = in-scope docs with one FrozenAt',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const scratch = await createScratchApplication(ctx, world);
            await confirmAllStandards(ctx, scratch);
            const { PolicyDocID, RestrictedAttestationID, GeneralDocID } = await fulfillRequiredDocuments(ctx, fixtures, scratch, {
                IncludeGeneral: true,
            });
            // Superseded document on Safety Policy must NOT be frozen.
            fixtures.Text.Next = { Status: 'Extracted', Text: POLICY_TEXT, PageCount: 1, Note: null };
            const replacement = await EvidenceIntake.Accept(
                { SubjectID: scratch.SubjectID, RequirementID: scratch.RequiredUploadID, FileName: 'safety-policy-v2.pdf', Bytes: pdfBytes('policy-v2') },
                ctx.Provider,
                scratch.Contact,
            );
            Assert(replacement.EvidenceDocumentID !== PolicyDocID, 'replacement created new doc');

            const out = expectSuccess(
                await new SubmitApplicationOperation().Execute(
                    { ApplicationID: scratch.ApplicationID, Attestation: VALID_ATTESTATION },
                    { provider: ctx.Provider, user: scratch.Contact },
                ),
                'SubmitApplication',
            );
            Assert(out.SubmittedAt.length > 0, 'SubmittedAt returned');

            const app = await readApplication(ctx, scratch.ApplicationID);
            AssertEqual(app.Status, 'Submitted', 'Status is Submitted');
            Assert(app.SubmittedAt != null, 'SubmittedAt stamped');
            Assert(app.SubmittedByUserID != null && UUIDsEqual(app.SubmittedByUserID, scratch.Contact.ID), 'SubmittedByUserID stamped');
            Assert(app.SubjectSnapshot != null && app.SubjectSnapshot.includes(scratch.SubjectID.slice(0, 8)), 'SubjectSnapshot stored');
            AssertEqual(app.AttestationOfficerName, VALID_ATTESTATION.OfficerName, 'OfficerName stamped');
            AssertEqual(app.AttestationOfficerRole, VALID_ATTESTATION.OfficerRole, 'OfficerRole stamped');
            Assert(app.AttestationApprovalDate != null, 'ApprovalDate stamped');
            AssertEqual(
                app.AttestationStatement,
                SubmissionGate.FormatAttestationStatement(`Submit Subject ${scratch.Tree.Program.Name.replace('Submit Check ', '')}`),
                'AttestationStatement stored',
            );
            Assert(app.AttestedByUserID != null && UUIDsEqual(app.AttestedByUserID, scratch.Contact.ID), 'AttestedByUserID stamped');
            Assert(app.AttestedAt != null, 'AttestedAt stamped');

            const frozen = await readAppDocs(ctx, scratch.ApplicationID);
            AssertEqual(frozen.length, 3, '3 in-scope rows frozen (replacement doc + attestation + general upload)');
            const frozenTimes = new Set(frozen.map((f) => toIso(f.FrozenAt)));
            AssertEqual(frozenTimes.size, 1, 'all ApplicationDocument rows share one FrozenAt');
            Assert(frozen.some((f) => f.EvidenceDocumentID != null && UUIDsEqual(f.EvidenceDocumentID, replacement.EvidenceDocumentID)), 'current requirement doc frozen');
            Assert(!frozen.some((f) => f.EvidenceDocumentID != null && UUIDsEqual(f.EvidenceDocumentID, PolicyDocID)), 'superseded doc NOT frozen');
            Assert(frozen.some((f) => f.DocumentAttestationID != null && UUIDsEqual(f.DocumentAttestationID, RestrictedAttestationID)), 'attestation frozen');
            Assert(frozen.some((f) => f.EvidenceDocumentID != null && GeneralDocID != null && UUIDsEqual(f.EvidenceDocumentID, GeneralDocID)), 'general upload frozen');
        },
    },
    {
        Id: 'cred-submission.4',
        Name: 'attestation required but empty -> attestation sentence; future approval date -> same',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const scratch = await createScratchApplication(ctx, world);
            await confirmAllStandards(ctx, scratch);
            await fulfillRequiredDocuments(ctx, fixtures, scratch);

            const expected = "Give the attesting officer's name and role, or the date the governing body approved.";
            const emptyRes = await new SubmitApplicationOperation().Execute(
                { ApplicationID: scratch.ApplicationID, Attestation: null },
                { provider: ctx.Provider, user: scratch.Contact },
            );
            expectRefused(emptyRes, expected, 'empty attestation');

            const futureRes = await new SubmitApplicationOperation().Execute(
                {
                    ApplicationID: scratch.ApplicationID,
                    Attestation: { OfficerName: null, OfficerRole: null, ApprovalDate: FUTURE_DATE, Accepted: true },
                },
                { provider: ctx.Provider, user: scratch.Contact },
            );
            expectRefused(futureRes, expected, 'future approval date');
            AssertEqual((await readApplication(ctx, scratch.ApplicationID)).Status, 'Draft', 'still Draft');
        },
    },
    {
        Id: 'cred-submission.5',
        Name: 'two SubmitApplication calls in parallel -> one succeeds, the other gets An application cannot move from Submitted to Submitted; one set of ApplicationDocument rows',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const scratch = await createScratchApplication(ctx, world);
            await confirmAllStandards(ctx, scratch);
            await fulfillRequiredDocuments(ctx, fixtures, scratch);

            const p1 = await CredentialingServices.Providers.Create();
            const p2 = await CredentialingServices.Providers.Create();
            try {
                const [r1, r2] = await Promise.all([
                    new SubmitApplicationOperation().Execute(
                        { ApplicationID: scratch.ApplicationID, Attestation: VALID_ATTESTATION },
                        { provider: p1, user: scratch.Contact },
                    ),
                    new SubmitApplicationOperation().Execute(
                        { ApplicationID: scratch.ApplicationID, Attestation: VALID_ATTESTATION },
                        { provider: p2, user: scratch.Contact },
                    ),
                ]);
                const successes = [r1, r2].filter((r) => r.Success);
                const failures = [r1, r2].filter((r) => !r.Success);
                AssertEqual(successes.length, 1, 'exactly one parallel submit succeeded');
                AssertEqual(failures.length, 1, 'exactly one parallel submit failed');
                expectRefused(failures[0], 'An application cannot move from Submitted to Submitted.', 'losing parallel submit');
                AssertEqual((await readAppDocs(ctx, scratch.ApplicationID)).length, 2, 'exactly one set of ApplicationDocument rows');
            } finally {
                await CredentialingServices.Providers.Release(p1);
                await CredentialingServices.Providers.Release(p2);
            }
        },
    },
    {
        Id: 'cred-submission.6',
        Name: 'after submit: SaveResponse, ConfirmResponse, replace upload, AttestInLieu, ConfirmDocumentCurrent, RefreshPrefills, and late ReadingQueue commit are refused or no-op; frozen records unchanged',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const scratch = await createScratchApplication(ctx, world, { BindPolicyTo1_1: true });
            await confirmAllStandards(ctx, scratch);
            const { PolicyDocID } = await fulfillRequiredDocuments(ctx, fixtures, scratch);

            // Start a ReadingQueue drain that pauses at BeforeCommit while SubmitApplication commits.
            let reachedResolve!: () => void;
            let releaseResolve!: () => void;
            const reached = new Promise<void>((r) => {
                reachedResolve = r;
            });
            const release = new Promise<void>((r) => {
                releaseResolve = r;
            });
            ReadingQueue.Seams.OnlySubjectIDs = [scratch.SubjectID];
            ReadingQueue.Seams.BeforeCommit = async () => {
                reachedResolve();
                await release;
            };
            const drainPromise = ReadingQueue.DrainOnce();
            await reached;

            try {
                expectSuccess(
                    await new SubmitApplicationOperation().Execute(
                        { ApplicationID: scratch.ApplicationID, Attestation: VALID_ATTESTATION },
                        { provider: ctx.Provider, user: scratch.Contact },
                    ),
                    'submit before late reading commit',
                );
            } finally {
                releaseResolve();
                await drainPromise;
                ReadingQueue.Seams.OnlySubjectIDs = undefined;
                ReadingQueue.Seams.BeforeCommit = undefined;
            }

            const respRows = await FindRows<StoredResponseRow>(
                ctx,
                CredentialingEntity.StandardResponse,
                `ApplicationID = '${Quote(scratch.ApplicationID)}'`,
                ['ID', 'StandardID', 'Status', 'ResponseText', 'SelfAssessment', '__mj_UpdatedAt'],
                system(),
            );
            const firstResp = respRows[0];

            const saveAfter = await new SaveResponseOperation().Execute(
                {
                    ResponseID: firstResp.ID,
                    ResponseText: 'Tampered after submit',
                    SelfAssessment: 'Not Met',
                    ExpectedUpdatedAt: toIso(firstResp.__mj_UpdatedAt),
                },
                { provider: ctx.Provider, user: scratch.Contact },
            );
            expectRefused(saveAfter, 'submitted on', 'SaveResponse after submit');

            const confirmAfter = await new ConfirmResponseOperation().Execute(
                { ResponseID: firstResp.ID, ExpectedUpdatedAt: toIso(firstResp.__mj_UpdatedAt) },
                { provider: ctx.Provider, user: scratch.Contact },
            );
            expectRefused(confirmAfter, 'submitted on', 'ConfirmResponse after submit');

            let uploadRefused = '';
            try {
                fixtures.Text.Next = { Status: 'Extracted', Text: POLICY_TEXT, PageCount: 1, Note: null };
                await EvidenceIntake.Accept(
                    { SubjectID: scratch.SubjectID, RequirementID: scratch.RequiredUploadID, FileName: 'replacement.pdf', Bytes: pdfBytes('replace') },
                    ctx.Provider,
                    scratch.Contact,
                );
            } catch (err) {
                uploadRefused = err instanceof Error ? err.message : String(err);
            }
            Assert(uploadRefused.includes('submitted application'), `upload replacement refused: ${uploadRefused}`);

            const reattestAfter = await new AttestInLieuOperation().Execute(
                {
                    SubjectID: scratch.SubjectID,
                    DocumentRequirementID: scratch.RestrictedReqID,
                    Statement: 'Changed attestation',
                },
                { provider: ctx.Provider, user: scratch.Contact },
            );
            expectRefused(reattestAfter, 'submitted application', 'AttestInLieu after submit');

            const currentAfter = await new ConfirmDocumentCurrentOperation().Execute(
                { EvidenceDocumentID: PolicyDocID },
                { provider: ctx.Provider, user: scratch.Contact },
            );
            expectRefused(currentAfter, 'submitted application', 'ConfirmDocumentCurrent after submit');

            const refreshOut = expectSuccess(
                await new RefreshPrefillsOperation().Execute(
                    { ApplicationID: scratch.ApplicationID },
                    { provider: ctx.Provider, user: scratch.Contact },
                ),
                'RefreshPrefills after submit is a no-op',
            );
            AssertEqual(refreshOut.Prefilled, 0, 'Prefilled = 0');
            AssertEqual(refreshOut.Located, 0, 'Located = 0');
            AssertEqual(refreshOut.MarkedStale, 0, 'MarkedStale = 0');
            AssertEqual(refreshOut.Cleared, 0, 'Cleared = 0');
            AssertEqual(refreshOut.Unchanged, 0, 'Unchanged = 0');

            // Late reading commit must have written zero extractions for the submitted application.
            const extractions = await FindRows<{ ID: string }>(
                ctx,
                CredentialingEntity.Extraction,
                `EvidenceDocumentID = '${Quote(PolicyDocID)}'`,
                ['ID'],
                system(),
            );
            AssertEqual(extractions.length, 0, 'late reading created zero extractions on submitted app');

            const docs = await FindRows<StoredEvidenceDocRow>(
                ctx,
                CredentialingEntity.EvidenceDocument,
                `ID = '${Quote(PolicyDocID)}'`,
                ['ID', 'DocumentRequirementID', 'FileID', 'ContentHash', 'Status', 'SupersedesDocumentID', 'TextStatus', 'ExtractedText', 'ReadingStatus'],
                system(),
            );
            AssertEqual(docs.length, 1, 'frozen document still present');
            AssertEqual(docs[0].Status, 'Current', 'frozen document Status unchanged');
            AssertEqual((await readAppDocs(ctx, scratch.ApplicationID)).length, 2, 'ApplicationDocument rows unchanged');
        },
    },
    {
        Id: 'cred-submission.7',
        Name: 'staff submit is refused with Only the applicant can submit an application.',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const scratch = await createScratchApplication(ctx, world);
            await confirmAllStandards(ctx, scratch);
            await fulfillRequiredDocuments(ctx, fixtures, scratch);

            const res = await new SubmitApplicationOperation().Execute(
                { ApplicationID: scratch.ApplicationID, Attestation: VALID_ATTESTATION },
                { provider: ctx.Provider, user: world.StaffA },
            );
            expectRefused(res, ONLY_APPLICANT_SUBMIT_REASON, 'staff submit refused');
            AssertEqual((await readApplication(ctx, scratch.ApplicationID)).Status, 'Draft', 'Status remains Draft');
        },
    },
    {
        Id: 'cred-submission.8',
        Name: 'an answer reopened by staff between gate read and submit causes submit refusal from server fresh read',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx);
            const scratch = await createScratchApplication(ctx, world, { RequiresAttestation: false });
            await confirmAllStandards(ctx, scratch);
            await fulfillRequiredDocuments(ctx, fixtures, scratch);

            const gateBefore = expectSuccess(
                await new GetSubmissionGateOperation().Execute(
                    { ApplicationID: scratch.ApplicationID },
                    { provider: ctx.Provider, user: scratch.Contact },
                ),
                'gate before reopen',
            );
            Assert(gateBefore.CanSubmit, 'gate passed before reopen');

            const resp = (
                await FindRows<StoredResponseRow>(
                    ctx,
                    CredentialingEntity.StandardResponse,
                    `ApplicationID = '${Quote(scratch.ApplicationID)}'`,
                    ['ID', 'StandardID', 'Status', 'ResponseText', 'SelfAssessment', '__mj_UpdatedAt'],
                    system(),
                )
            )[0];
            expectSuccess(
                await new ReopenResponseOperation().Execute(
                    { ResponseID: resp.ID, Reason: 'Need clearer evidence' },
                    { provider: ctx.Provider, user: world.StaffA },
                ),
                'staff reopen between gate and submit',
            );

            const res = await new SubmitApplicationOperation().Execute(
                { ApplicationID: scratch.ApplicationID, Attestation: VALID_ATTESTATION },
                { provider: ctx.Provider, user: scratch.Contact },
            );
            expectRefused(res, 'items still need attention before you can submit.', 'submit after reopen');
            AssertEqual((await readApplication(ctx, scratch.ApplicationID)).Status, 'Draft', 'Status remains Draft');
        },
    },
    {
        Id: 'cred-submission.9',
        Name: 'each staff member of the organization receives one notification, staff-b none, and deleting the notification type does not block submit',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx, new EngineStaffNotifier());
            const scratch = await createScratchApplication(ctx, world, { RequiresAttestation: false });
            await confirmAllStandards(ctx, scratch);
            await fulfillRequiredDocuments(ctx, fixtures, scratch);

            const staffANotesBefore = await FindRows<MJUserNotificationEntity>(
                ctx,
                'MJ: User Notifications',
                `UserID = '${Quote(world.StaffA.ID)}' AND ResourceRecordID = '${Quote(scratch.ApplicationID)}'`,
                ['ID'],
                system(),
            );
            AssertEqual(staffANotesBefore.length, 0, 'no prior notification for this app');

            expectSuccess(
                await new SubmitApplicationOperation().Execute(
                    { ApplicationID: scratch.ApplicationID, Attestation: null },
                    { provider: ctx.Provider, user: scratch.Contact },
                ),
                'submit with EngineStaffNotifier',
            );

            const orgMembers = await FindRows<{ UserID: string }>(
                ctx,
                CredentialingEntity.OrganizationMembership,
                `AccreditingOrganizationID = '${Quote(world.OrgA.ID)}'`,
                ['UserID'],
                system(),
            );
            const uniqueStaffIDs = [...new Set(orgMembers.map((m) => m.UserID.toLowerCase()))];
            for (const staffID of uniqueStaffIDs) {
                const notes = await FindRows<{ ID: string; Message: string }>(
                    ctx,
                    'MJ: User Notifications',
                    `UserID = '${Quote(staffID)}' AND ResourceRecordID = '${Quote(scratch.ApplicationID)}'`,
                    ['ID', 'Message'],
                    system(),
                );
                AssertEqual(notes.length, 1, `staff ${staffID} got exactly one notification`);
                Assert(notes[0].Message.includes(' submitted the '), 'notification message has submitted wording');
            }

            const staffBNotes = await FindRows<{ ID: string }>(
                ctx,
                'MJ: User Notifications',
                `UserID = '${Quote(world.StaffB.ID)}' AND ResourceRecordID = '${Quote(scratch.ApplicationID)}'`,
                ['ID'],
                system(),
            );
            AssertEqual(staffBNotes.length, 0, 'staff-b got zero notifications');

            // Point notifier at a missing notification type, verify submit still succeeds without blocking.
            await registerFixtures(ctx, new EngineStaffNotifier('Credentialing: Missing Notification Type'));
            const scratch2 = await createScratchApplication(ctx, world, { RequiresAttestation: false });
            await confirmAllStandards(ctx, scratch2);
            await fulfillRequiredDocuments(ctx, fixtures, scratch2);

            const out2 = expectSuccess(
                await new SubmitApplicationOperation().Execute(
                    { ApplicationID: scratch2.ApplicationID, Attestation: null },
                    { provider: ctx.Provider, user: scratch2.Contact },
                ),
                'submit succeeds even when notification type is missing',
            );
            Assert(out2.SubmittedAt.length > 0, 'second submit stamped');
            AssertEqual((await readApplication(ctx, scratch2.ApplicationID)).Status, 'Submitted', 'second app Submitted');
        },
    },
    {
        Id: 'cred-submission.10',
        Name: 'a registered OnSubmitted handler receives the application once and SubmissionDispatchedAt is set',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx, { async ApplicationSubmitted() {} });
            const scratch = await createScratchApplication(ctx, world, { RequiresAttestation: false });
            await confirmAllStandards(ctx, scratch);
            await fulfillRequiredDocuments(ctx, fixtures, scratch);

            const received: string[] = [];
            const subName = `cred-sub-10-${runHex()}`;
            ApplicationEvents.OnSubmitted(subName, async (e) => {
                if (UUIDsEqual(e.ApplicationID, scratch.ApplicationID)) {
                    received.push(e.ApplicationID);
                }
            });
            try {
                expectSuccess(
                    await new SubmitApplicationOperation().Execute(
                        { ApplicationID: scratch.ApplicationID, Attestation: null },
                        { provider: ctx.Provider, user: scratch.Contact },
                    ),
                    'submit with subscriber',
                );
                const settled = await waitForCondition(
                    async () => (await readApplication(ctx, scratch.ApplicationID)).SubmissionDispatchedAt != null,
                );
                Assert(settled, 'SubmissionDispatchedAt was set');
                AssertEqual(received.length, 1, 'subscriber received the application once');
            } finally {
                ApplicationEvents.OffSubmitted(subName);
            }
        },
    },
    {
        Id: 'cred-submission.11',
        Name: 'handler throwing on first call leaves SubmissionDispatchedAt NULL, submit succeeds, Redispatch retries and sets it, next Redispatch does nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx, { async ApplicationSubmitted() {} });
            const scratch = await createScratchApplication(ctx, world, { RequiresAttestation: false });
            await confirmAllStandards(ctx, scratch);
            await fulfillRequiredDocuments(ctx, fixtures, scratch);

            let calls = 0;
            const subName = `cred-sub-11-${runHex()}`;
            ApplicationEvents.OnSubmitted(subName, async (e) => {
                if (!UUIDsEqual(e.ApplicationID, scratch.ApplicationID)) return;
                calls++;
                if (calls === 1) {
                    throw new Error('transient subscriber error');
                }
            });
            ApplicationEvents.Seams.OnlyApplicationIDs = [scratch.ApplicationID];
            try {
                expectSuccess(
                    await new SubmitApplicationOperation().Execute(
                        { ApplicationID: scratch.ApplicationID, Attestation: null },
                        { provider: ctx.Provider, user: scratch.Contact },
                    ),
                    'submit succeeds despite first-attempt subscriber throw',
                );
                const failedSettled = await waitForCondition(async () => {
                    const row = await readApplication(ctx, scratch.ApplicationID);
                    return row.SubmissionDispatchAttempts >= 1 && row.SubmissionDispatchClaimID == null;
                });
                Assert(failedSettled, 'first attempt failed and cleared claim');
                const afterFirst = await readApplication(ctx, scratch.ApplicationID);
                AssertEqual(afterFirst.SubmissionDispatchedAt, null, 'SubmissionDispatchedAt stayed NULL');

                const redispatched = await ApplicationEvents.Redispatch();
                AssertEqual(redispatched, 1, 'Redispatch retried the application');
                AssertEqual(calls, 2, 'handler called a second time');
                Assert((await readApplication(ctx, scratch.ApplicationID)).SubmissionDispatchedAt != null, 'SubmissionDispatchedAt set after retry');

                const again = await ApplicationEvents.Redispatch();
                AssertEqual(again, 0, 'further Redispatch selects nothing');
                AssertEqual(calls, 2, 'handler not called again');
            } finally {
                ApplicationEvents.OffSubmitted(subName);
                ApplicationEvents.Seams.OnlyApplicationIDs = undefined;
            }
        },
    },
    {
        Id: 'cred-submission.12',
        Name: 'with the notifier throwing, submit succeeds and dispatch is unaffected',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx, {
                async ApplicationSubmitted() {
                    throw new Error('notification outage');
                },
            });
            const scratch = await createScratchApplication(ctx, world, { RequiresAttestation: false });
            await confirmAllStandards(ctx, scratch);
            await fulfillRequiredDocuments(ctx, fixtures, scratch);

            let handlerCalls = 0;
            const subName = `cred-sub-12-${runHex()}`;
            ApplicationEvents.OnSubmitted(subName, async (e) => {
                if (UUIDsEqual(e.ApplicationID, scratch.ApplicationID)) handlerCalls++;
            });
            try {
                expectSuccess(
                    await new SubmitApplicationOperation().Execute(
                        { ApplicationID: scratch.ApplicationID, Attestation: null },
                        { provider: ctx.Provider, user: scratch.Contact },
                    ),
                    'submit succeeds while notifier throws',
                );
                const settled = await waitForCondition(
                    async () => (await readApplication(ctx, scratch.ApplicationID)).SubmissionDispatchedAt != null,
                );
                Assert(settled, 'dispatch completed despite notifier throwing');
                AssertEqual(handlerCalls, 1, 'subscriber ran once');
            } finally {
                ApplicationEvents.OffSubmitted(subName);
            }
        },
    },
    {
        Id: 'cred-submission.13',
        Name: 'with Seams.InHandler holding first Dispatch inside handler, Redispatch and second Dispatch return Busy and handler runs once',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx, { async ApplicationSubmitted() {} });
            const scratch = await createScratchApplication(ctx, world, { RequiresAttestation: false });
            await confirmAllStandards(ctx, scratch);
            await fulfillRequiredDocuments(ctx, fixtures, scratch);

            // Submit with a handler that fails once so we control Dispatch directly afterward,
            // or hold the initial Dispatch directly via Seams.InHandler.
            let enteredResolve!: () => void;
            let releaseResolve!: () => void;
            const entered = new Promise<void>((r) => {
                enteredResolve = r;
            });
            const release = new Promise<void>((r) => {
                releaseResolve = r;
            });
            let handlerRuns = 0;
            const subName = `cred-sub-13-${runHex()}`;
            ApplicationEvents.OnSubmitted(subName, async (e) => {
                if (UUIDsEqual(e.ApplicationID, scratch.ApplicationID)) handlerRuns++;
            });
            ApplicationEvents.Seams.InHandler = async () => {
                enteredResolve();
                await release;
            };
            ApplicationEvents.Seams.OnlyApplicationIDs = [scratch.ApplicationID];
            try {
                expectSuccess(
                    await new SubmitApplicationOperation().Execute(
                        { ApplicationID: scratch.ApplicationID, Attestation: null },
                        { provider: ctx.Provider, user: scratch.Contact },
                    ),
                    'submit enters InHandler seam',
                );
                await entered;
                AssertEqual(await ApplicationEvents.Dispatch(scratch.ApplicationID), 'Busy', 'second Dispatch returns Busy');
                AssertEqual(await ApplicationEvents.Redispatch(), 0, 'Redispatch returns 0 while claim live');

                releaseResolve();
                const settled = await waitForCondition(
                    async () => (await readApplication(ctx, scratch.ApplicationID)).SubmissionDispatchedAt != null,
                );
                Assert(settled, 'SubmissionDispatchedAt set after seam release');
                AssertEqual(handlerRuns, 1, 'handler ran once');
            } finally {
                releaseResolve();
                ApplicationEvents.OffSubmitted(subName);
                ApplicationEvents.Seams.InHandler = undefined;
                ApplicationEvents.Seams.OnlyApplicationIDs = undefined;
            }
        },
    },
    {
        Id: 'cred-submission.14',
        Name: 'handler that always throws -> after 5 attempts GaveUp, SubmissionDispatchNote set, Redispatch selects nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const fixtures = await registerFixtures(ctx, { async ApplicationSubmitted() {} });
            const scratch = await createScratchApplication(ctx, world, { RequiresAttestation: false });
            await confirmAllStandards(ctx, scratch);
            await fulfillRequiredDocuments(ctx, fixtures, scratch);

            const subName = `cred-sub-14-${runHex()}`;
            ApplicationEvents.OnSubmitted(subName, async (e) => {
                if (UUIDsEqual(e.ApplicationID, scratch.ApplicationID)) {
                    throw new Error('permanent failure');
                }
            });
            ApplicationEvents.Seams.OnlyApplicationIDs = [scratch.ApplicationID];
            try {
                expectSuccess(
                    await new SubmitApplicationOperation().Execute(
                        { ApplicationID: scratch.ApplicationID, Attestation: null },
                        { provider: ctx.Provider, user: scratch.Contact },
                    ),
                    'submit succeeds even when subscriber always fails',
                );
                const firstSettled = await waitForCondition(async () => {
                    const row = await readApplication(ctx, scratch.ApplicationID);
                    return row.SubmissionDispatchAttempts >= 1 && row.SubmissionDispatchClaimID == null;
                });
                Assert(firstSettled, 'attempt 1 settled');

                for (let attempt = 2; attempt <= ApplicationEvents.MaxAttempts; attempt++) {
                    AssertEqual(await ApplicationEvents.Dispatch(scratch.ApplicationID), 'Failed', `attempt ${attempt} Failed`);
                }

                const afterFive = await readApplication(ctx, scratch.ApplicationID);
                AssertEqual(afterFive.SubmissionDispatchAttempts, 5, 'attempts reached 5');
                AssertEqual(afterFive.SubmissionDispatchedAt, null, 'SubmissionDispatchedAt still NULL');
                AssertEqual(afterFive.SubmissionDispatchNote, SUBMISSION_DISPATCH_GAVE_UP_NOTE, 'SubmissionDispatchNote set');

                AssertEqual(await ApplicationEvents.Dispatch(scratch.ApplicationID), 'GaveUp', 'sixth Dispatch returns GaveUp');
                AssertEqual(await ApplicationEvents.Redispatch(), 0, 'Redispatch selects nothing');
            } finally {
                ApplicationEvents.OffSubmitted(subName);
                ApplicationEvents.Seams.OnlyApplicationIDs = undefined;
            }
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
