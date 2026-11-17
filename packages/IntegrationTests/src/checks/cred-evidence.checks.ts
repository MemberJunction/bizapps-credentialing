/**
 * `cred-evidence` — client-transport checks of the evidence routes over HTTP against the running
 * MJAPI, as the world's personas (plan Task 7, checks 1–10 and 13). Applicants sign in by magic
 * link (minted by the dev Owner and redeemed, as `pnpm run persona` does), staff by dev-login; the
 * routes never see anything but the session's bearer token.
 *
 * Preconditions: the world exists, including `Sample Evidence Applicant` (`CRD-11 - Evidence` or
 * `CRD-06 - World` on the server transport, then `servers.sh restart api` so MJAPI's user cache holds
 * the evidence contact); `pnpm run dev:storage` was run (it writes the store root to `../mj/.env`,
 * which the harness loads).
 *
 * Run: `corepack pnpm run test:integration cred-evidence`.
 */
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CompositeKey, type RemoteOpResult } from '@memberjunction/core';
import { GetGlobalObjectStore } from '@memberjunction/global';
import { GraphQLDataProvider, GraphQLProviderConfigData } from '@memberjunction/graphql-dataprovider';
import { Assert, AssertEqual, IntegrationCheckRegistry, type IntegrationCheckContext, type NamedCheck } from '@memberjunction/testing-integration/registry';
import {
    AttestInLieuOperation,
    CREDENTIALING_APPLICANT_ROLE,
    CredentialingEntity,
    DOCUMENT_MUST_BE_UPLOADED_REASON,
    NOT_FOUND_REASON,
} from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingEvidenceDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import { CountRows, FindRows, Quote } from '../wire.js';

type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');
const FIXTURE_DIR = path.join(REPO_ROOT, 'packages', 'Server', 'src', 'evidence', '__fixtures__');
const FIXTURE_GENERATOR = path.join(REPO_ROOT, 'scripts', 'dev', 'make-evidence-fixtures.mjs');

const ISSUER_EMAIL = 'admin@memberjunction.org';
const EVIDENCE_CONTACT = 'applicant.evidence@example.test';
const OTHER_CONTACT = 'applicant.b@example.test';
const STAFF_A = 'staff.a@example.test';
const STAFF_B = 'staff.b@example.test';
const EVIDENCE_SUBJECT = 'Sample Evidence Applicant';
const EVIDENCE_PROGRAM = 'Sample Evidence Program';
const NORMAL_REQUIREMENT = 'Written safety policy';
const RESTRICTED_REQUIREMENT = 'Confidential board minutes';
const CREDENTIALING_APPLICATION = 'Credentialing';
const PAGE_ONE_SENTENCE = 'The practice reviews its written safety policy every twelve months.';
const OPERATION_ONLY_SENTENCE = "This record is changed only through the application's own actions.";
const GRAPHQL_PROVIDER_SINGLETON_KEY = '___SINGLETON__GraphQLDataProvider';
const MAX_BYTES = 26_214_400;

type FixtureName = 'two-page-text.pdf' | 'scanned-page.pdf' | 'review-notes.docx' | 'not-a-pdf.pdf' | 'inflation-bomb.docx';

/** An HTTP answer, read whole. */
interface HttpAnswer {
    Status: number;
    Headers: Headers;
    Body: Buffer;
    Millis: number;
}

/** The JSON body of an accepted upload. */
interface AcceptedBody {
    EvidenceDocumentID: string;
    TextStatus: string;
    TextNote: string | null;
}

interface TokenResponse {
    success?: boolean;
    token?: string;
    error?: string;
    rawToken?: string;
    redemptionUrl?: string;
}

function harnessProvider(ctx: IntegrationCheckContext): GraphQLDataProvider {
    if (!(ctx.Provider instanceof GraphQLDataProvider)) {
        throw new Error('cred-evidence runs on the client transport: corepack pnpm run test:integration cred-evidence');
    }
    return ctx.Provider;
}

function apiUrl(ctx: IntegrationCheckContext, route: string): URL {
    return new URL(route, harnessProvider(ctx).ConfigData.URL);
}

async function postJson(ctx: IntegrationCheckContext, route: string, body: object, token?: string): Promise<{ Status: number; Body: TokenResponse }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token != null) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(apiUrl(ctx, route), { method: 'POST', headers, body: JSON.stringify(body) });
    return { Status: response.status, Body: (await response.json()) as TokenResponse };
}

async function devLogin(ctx: IntegrationCheckContext, email: string): Promise<string> {
    const { Status, Body } = await postJson(ctx, '/auth/dev-login', { email });
    Assert(Status === 200 && Body.token != null, `dev-login as ${email} (${Status}): ${Body.error ?? ''}`);
    return Body.token;
}

const tokens = new Map<string, string>();

/** A magic-link session token for an applicant: an invite minted by the dev Owner, then redeemed. */
async function magicLinkToken(ctx: IntegrationCheckContext, email: string): Promise<string> {
    const cached = tokens.get(email);
    if (cached != null) return cached;
    const provider = harnessProvider(ctx);
    const application = provider.Applications.find((a) => a.Name === CREDENTIALING_APPLICATION);
    const role = provider.Roles.find((r) => r.Name === CREDENTIALING_APPLICANT_ROLE);
    Assert(application != null && role != null, 'the Credentialing application and the applicant role exist');
    const issuer = await devLogin(ctx, ISSUER_EMAIL);
    const invite = await postJson(ctx, '/magic-link/create', { email, ApplicationId: application.ID, RoleId: role.ID, ExpiresInHours: 1, MaxUses: 1, SendEmail: false }, issuer);
    const raw = invite.Body.rawToken ?? (invite.Body.redemptionUrl != null ? new URL(invite.Body.redemptionUrl).searchParams.get('token') : null);
    Assert(invite.Status === 200 && raw != null, `magic-link/create for ${email} (${invite.Status}): ${invite.Body.error ?? ''}`);
    const redeemed = await postJson(ctx, '/magic-link/redeem?format=json', { token: raw });
    Assert(redeemed.Status === 200 && redeemed.Body.token != null, `magic-link/redeem for ${email} (${redeemed.Status}): ${redeemed.Body.error ?? ''}`);
    tokens.set(email, redeemed.Body.token);
    return redeemed.Body.token;
}

async function staffToken(ctx: IntegrationCheckContext, email: string): Promise<string> {
    const cached = tokens.get(email);
    if (cached != null) return cached;
    const token = await devLogin(ctx, email);
    tokens.set(email, token);
    return token;
}

async function http(ctx: IntegrationCheckContext, method: 'GET' | 'POST', route: string, token: string | null, body?: Buffer): Promise<HttpAnswer> {
    const headers: Record<string, string> = {};
    if (token != null) headers.Authorization = `Bearer ${token}`;
    if (body != null) headers['Content-Type'] = 'application/octet-stream';
    const started = Date.now();
    const response = await fetch(apiUrl(ctx, route), { method, headers, body: body == null ? undefined : new Uint8Array(body) });
    const bytes = Buffer.from(await response.arrayBuffer());
    return { Status: response.status, Headers: response.headers, Body: bytes, Millis: Date.now() - started };
}

function jsonOf<T>(answer: HttpAnswer): T {
    return JSON.parse(answer.Body.toString('utf8')) as T;
}

function messageOf(answer: HttpAnswer): string {
    return jsonOf<{ Message?: string }>(answer).Message ?? `(no Message; status ${answer.Status}: ${answer.Body.toString('utf8').slice(0, 200)})`;
}

function sha256(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex');
}

function fixture(name: FixtureName): Buffer {
    const file = path.join(FIXTURE_DIR, name);
    if (!existsSync(file)) {
        execFileSync(process.execPath, [FIXTURE_GENERATOR, '--only', name], { stdio: 'ignore' });
    }
    return readFileSync(file);
}

/** Every file under the store root, counted recursively. */
function countStoredObjects(): number {
    const root = storeRoot();
    const walk = (dir: string): number =>
        readdirSync(dir).reduce((sum, entry) => {
            const full = path.join(dir, entry);
            return sum + (statSync(full).isDirectory() ? walk(full) : 1);
        }, 0);
    return existsSync(root) ? walk(root) : 0;
}

function storeRoot(): string {
    const root = process.env.CREDENTIALING_EVIDENCE_STORE_ROOT;
    Assert(root != null && root.length > 0, 'CREDENTIALING_EVIDENCE_STORE_ROOT is set (run pnpm run dev:storage; the harness loads ../mj/.env)');
    return root;
}

interface EvidenceTargets {
    SubjectID: string;
    NormalRequirementID: string;
    RestrictedRequirementID: string;
}

let targets: EvidenceTargets | null = null;

/** The evidence subject and its program's two requirements, read as the harness (System) user. */
async function evidenceTargets(ctx: IntegrationCheckContext): Promise<EvidenceTargets> {
    if (targets != null) return targets;
    const subjects = await FindRows<{ ID: string }>(ctx, CredentialingEntity.Subject, `DisplayName = '${Quote(EVIDENCE_SUBJECT)}'`, ['ID']);
    AssertEqual(subjects.length, 1, `${EVIDENCE_SUBJECT} exists (run CRD-11 - Evidence or CRD-06 - World first)`);
    const versionFilter = `ProgramVersionID IN (SELECT v.ID FROM [__mj_BizAppsCredentialing].[vwProgramVersions] v JOIN [__mj_BizAppsCredentialing].[vwPrograms] p ON p.ID = v.ProgramID WHERE p.Name = '${Quote(EVIDENCE_PROGRAM)}' AND v.Status = 'Active')`;
    const requirements = await FindRows<{ ID: string; Name: string }>(ctx, CredentialingEntity.DocumentRequirement, versionFilter, ['ID', 'Name']);
    const byName = (name: string): string => {
        const found = requirements.find((r) => r.Name === name);
        Assert(found != null, `${EVIDENCE_PROGRAM} has ${name}`);
        return found.ID;
    };
    targets = { SubjectID: subjects[0].ID, NormalRequirementID: byName(NORMAL_REQUIREMENT), RestrictedRequirementID: byName(RESTRICTED_REQUIREMENT) };
    return targets;
}

function uploadRoute(subjectID: string, requirementID: string | null, fileName: string): string {
    const query = new URLSearchParams({ subjectId: subjectID, fileName });
    if (requirementID != null) query.set('requirementId', requirementID);
    return `/credentialing/evidence?${query.toString()}`;
}

async function uploadAs(ctx: IntegrationCheckContext, token: string, requirementID: string | null, fileName: string, bytes: Buffer): Promise<HttpAnswer> {
    const { SubjectID } = await evidenceTargets(ctx);
    return http(ctx, 'POST', uploadRoute(SubjectID, requirementID, fileName), token, bytes);
}

async function documentOf(ctx: IntegrationCheckContext, id: string): Promise<EvidenceDocumentEntity> {
    const document = await ctx.Provider.GetEntityObject<EvidenceDocumentEntity>(CredentialingEntity.EvidenceDocument, ctx.User);
    Assert(await document.InnerLoad(CompositeKey.FromID(id)), `evidence document ${id} loads`);
    return document;
}

let uploaded: { ID: string; Bytes: Buffer } | null = null;

/** The text PDF uploaded by check 1 (or uploaded now, when check 1 did not run first). */
async function uploadedDocument(ctx: IntegrationCheckContext): Promise<{ ID: string; Bytes: Buffer }> {
    if (uploaded != null) return uploaded;
    const bytes = fixture('two-page-text.pdf');
    const { NormalRequirementID } = await evidenceTargets(ctx);
    const answer = await uploadAs(ctx, await magicLinkToken(ctx, EVIDENCE_CONTACT), NormalRequirementID, 'safety-policy.pdf', bytes);
    AssertEqual(answer.Status, 201, `upload answers 201 (${answer.Body.toString('utf8').slice(0, 200)})`);
    uploaded = { ID: jsonOf<AcceptedBody>(answer).EvidenceDocumentID, Bytes: bytes };
    return uploaded;
}

function newSecondaryProvider(): GraphQLDataProvider {
    const store = GetGlobalObjectStore();
    const singleton = store?.[GRAPHQL_PROVIDER_SINGLETON_KEY];
    if (store) delete store[GRAPHQL_PROVIDER_SINGLETON_KEY];
    try {
        return new GraphQLDataProvider();
    } finally {
        if (store) store[GRAPHQL_PROVIDER_SINGLETON_KEY] = singleton;
    }
}

async function withSession<T>(ctx: IntegrationCheckContext, token: string, work: (session: GraphQLDataProvider) => Promise<T>): Promise<T> {
    const session = newSecondaryProvider();
    const config = new GraphQLProviderConfigData(token, harnessProvider(ctx).ConfigData.URL, '', async () => token, '__mj');
    Assert(await session.Config(config, undefined, true), 'GraphQL session configured');
    try {
        return await work(session);
    } finally {
        session.DisposeWebSocketResources();
    }
}

function describe<T>(result: RemoteOpResult<T>): string {
    return `${result.Success ? 'Success' : 'Failure'} ${result.ResultCode ?? ''}: ${result.ErrorMessage ?? ''}`;
}

/** Reads `{ <field>: { Success, ErrorMessage } }` from a raw GraphQL answer. */
function resultField(answer: unknown, field: string): { Success: boolean; ErrorMessage: string | null } {
    if (answer == null || typeof answer !== 'object' || !(field in answer)) {
        return { Success: false, ErrorMessage: 'no answer' };
    }
    const value: unknown = (answer as Record<string, unknown>)[field];
    if (value == null || typeof value !== 'object') {
        return { Success: false, ErrorMessage: 'no result' };
    }
    const success = 'Success' in value ? value.Success === true : false;
    const message = 'ErrorMessage' in value && typeof value.ErrorMessage === 'string' ? value.ErrorMessage : null;
    return { Success: success, ErrorMessage: message };
}

async function gqlOutcome(session: GraphQLDataProvider, query: string, field: string, variables: Record<string, string>): Promise<{ Success: boolean; ErrorMessage: string | null }> {
    try {
        const answer: unknown = await session.ExecuteGQL(query, variables);
        return resultField(answer, field);
    } catch (err: unknown) {
        return { Success: false, ErrorMessage: err instanceof Error ? err.message : String(err) };
    }
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-evidence.1',
        Name: 'a contact (magic-link session) uploads the text PDF for a requirement: 201; the row holds the hash and the text; the object is under the store root',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const { ID, Bytes } = await uploadedDocument(ctx);
            const document = await documentOf(ctx, ID);
            AssertEqual(document.ContentHash, sha256(Bytes), 'stored SHA-256');
            AssertEqual(document.TextStatus, 'Extracted', 'text status');
            AssertEqual(document.PageCount, 2, 'page count');
            Assert((document.ExtractedText ?? '').includes(PAGE_ONE_SENTENCE), 'the extracted text holds the first page sentence');
            AssertEqual(document.ReadingStatus, 'Pending', 'reading status');
            AssertEqual(document.FileName, 'safety-policy.pdf', 'file name');
            AssertEqual(document.ContentType, 'application/pdf', 'content type');
            const files = await FindRows<{ ProviderKey: string }>(ctx, 'MJ: Files', `ID = '${Quote(document.FileID)}'`, ['ProviderKey']);
            AssertEqual(files.length, 1, 'one MJ: Files row');
            Assert(files[0].ProviderKey.startsWith('credentialing-evidence/'), `object key under the evidence prefix (${files[0].ProviderKey})`);
            const object = path.join(storeRoot(), files[0].ProviderKey);
            Assert(existsSync(object), 'the object is under the store root');
            AssertEqual(sha256(readFileSync(object)), sha256(Bytes), 'the stored object is the uploaded bytes');
        },
    },
    {
        Id: 'cred-evidence.2',
        Name: 'a renamed non-PDF answers 400 with the not-valid sentence and leaves no MJ: Files row and no object',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const { NormalRequirementID } = await evidenceTargets(ctx);
            const filesBefore = await CountRows(ctx, 'MJ: Files', `ProviderKey LIKE 'credentialing-evidence/%'`);
            const objectsBefore = countStoredObjects();
            const answer = await uploadAs(ctx, await magicLinkToken(ctx, EVIDENCE_CONTACT), NormalRequirementID, 'renamed.pdf', fixture('not-a-pdf.pdf'));
            AssertEqual(answer.Status, 400, 'status');
            AssertEqual(messageOf(answer), 'This file is not a valid PDF file.', 'sentence');
            AssertEqual(await CountRows(ctx, 'MJ: Files', `ProviderKey LIKE 'credentialing-evidence/%'`), filesBefore, 'no MJ: Files row');
            AssertEqual(countStoredObjects(), objectsBefore, 'no object');
        },
    },
    {
        Id: 'cred-evidence.3',
        Name: 'an empty body and a 26 MB body answer 400 with their sentences',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const token = await magicLinkToken(ctx, EVIDENCE_CONTACT);
            const empty = await uploadAs(ctx, token, null, 'empty.pdf', Buffer.alloc(0));
            AssertEqual(empty.Status, 400, 'empty: status');
            AssertEqual(messageOf(empty), 'This file is empty.', 'empty: sentence');
            const big = Buffer.concat([Buffer.from('%PDF-1.4\n', 'latin1'), Buffer.alloc(MAX_BYTES + 1024 * 1024 - 9, 0x20)]);
            const large = await uploadAs(ctx, token, null, 'large.pdf', big);
            AssertEqual(large.Status, 400, '26 MB: status');
            AssertEqual(messageOf(large), 'This file is larger than 25 MB.', '26 MB: sentence');
        },
    },
    {
        Id: 'cred-evidence.4',
        Name: 'an image-only PDF (general upload) answers 201 with Awaiting Recognition',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const answer = await uploadAs(ctx, await magicLinkToken(ctx, EVIDENCE_CONTACT), null, 'scanned-minutes.pdf', fixture('scanned-page.pdf'));
            AssertEqual(answer.Status, 201, `status (${answer.Body.toString('utf8').slice(0, 200)})`);
            const body = jsonOf<AcceptedBody>(answer);
            AssertEqual(body.TextStatus, 'Awaiting Recognition', 'text status');
            AssertEqual(body.TextNote, 'This is a scan. The assistant is reading it; this can take a few minutes.', 'text note');
            const document = await documentOf(ctx, body.EvidenceDocumentID);
            AssertEqual(document.DocumentRequirementID, null, 'a general upload has no requirement');
            AssertEqual(document.ReadingStatus, 'Pending', 'queued for the reader');
        },
    },
    {
        Id: 'cred-evidence.5',
        Name: 'a second upload for the same requirement supersedes the first, names it, and has a different hash',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const first = await uploadedDocument(ctx);
            const { NormalRequirementID } = await evidenceTargets(ctx);
            const answer = await uploadAs(ctx, await magicLinkToken(ctx, EVIDENCE_CONTACT), NormalRequirementID, 'safety-policy-notes.docx', fixture('review-notes.docx'));
            AssertEqual(answer.Status, 201, `status (${answer.Body.toString('utf8').slice(0, 200)})`);
            const secondID = jsonOf<AcceptedBody>(answer).EvidenceDocumentID;
            const [older, newer] = [await documentOf(ctx, first.ID), await documentOf(ctx, secondID)];
            AssertEqual(older.Status, 'Superseded', 'the first is superseded');
            AssertEqual(newer.Status, 'Current', 'the second is current');
            AssertEqual(newer.SupersedesDocumentID?.toLowerCase(), first.ID.toLowerCase(), 'the second names the first');
            Assert(older.ContentHash !== newer.ContentHash, 'the hashes differ');
            AssertEqual(newer.TextStatus, 'Extracted', 'the Word document was read');
        },
    },
    {
        Id: 'cred-evidence.6',
        Name: 'another subject\'s contact, staff-b and a random ID get byte-identical 404s; no token gets MJAPI\'s 401',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const { ID } = await uploadedDocument(ctx);
            const route = `/credentialing/evidence/${ID}/content`;
            const otherContact = await http(ctx, 'GET', route, await magicLinkToken(ctx, OTHER_CONTACT));
            const staffB = await http(ctx, 'GET', route, await staffToken(ctx, STAFF_B));
            const random = await http(ctx, 'GET', `/credentialing/evidence/${randomUUID()}/content`, await magicLinkToken(ctx, EVIDENCE_CONTACT));
            for (const [label, answer] of [['another subject\'s contact', otherContact], ['staff-b', staffB], ['a random ID', random]] as const) {
                AssertEqual(answer.Status, 404, `${label}: status`);
                AssertEqual(answer.Body.toString('utf8'), JSON.stringify({ Message: NOT_FOUND_REASON }), `${label}: body`);
            }
            Assert(otherContact.Body.equals(staffB.Body) && staffB.Body.equals(random.Body), 'the three 404 bodies are byte-identical');
            const anonymous = await http(ctx, 'GET', route, null);
            AssertEqual(anonymous.Status, 401, 'no token: MJAPI\'s authentication answers before the route');
        },
    },
    {
        Id: 'cred-evidence.7',
        Name: 'staff-a downloads the document (200, same hash, safe headers); staff-a cannot upload into the applicant\'s record (404)',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const { ID, Bytes } = await uploadedDocument(ctx);
            const token = await staffToken(ctx, STAFF_A);
            const inline = await http(ctx, 'GET', `/credentialing/evidence/${ID}/content`, token);
            AssertEqual(inline.Status, 200, 'status');
            AssertEqual(sha256(inline.Body), sha256(Bytes), 'downloaded bytes hash');
            AssertEqual(inline.Headers.get('content-type'), 'application/pdf', 'content type');
            AssertEqual(inline.Headers.get('x-content-type-options'), 'nosniff', 'nosniff');
            AssertEqual(inline.Headers.get('cache-control'), 'private, no-store', 'cache control');
            Assert((inline.Headers.get('content-disposition') ?? '').startsWith('inline;'), 'inline by default');
            const attachment = await http(ctx, 'GET', `/credentialing/evidence/${ID}/content?download=1`, token);
            Assert((attachment.Headers.get('content-disposition') ?? '').startsWith('attachment;'), 'attachment with ?download=1');
            const { NormalRequirementID } = await evidenceTargets(ctx);
            const staffUpload = await uploadAs(ctx, token, NormalRequirementID, 'staff.pdf', fixture('two-page-text.pdf'));
            AssertEqual(staffUpload.Status, 404, 'staff upload status');
            AssertEqual(staffUpload.Body.toString('utf8'), JSON.stringify({ Message: NOT_FOUND_REASON }), 'staff upload body');
        },
    },
    {
        Id: 'cred-evidence.8',
        Name: 'the contact can neither read MJ: Files nor reach the file through CreateMediaAccessToken or GetFileContents',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const { ID } = await uploadedDocument(ctx);
            const fileID = (await documentOf(ctx, ID)).FileID;
            await withSession(ctx, await magicLinkToken(ctx, EVIDENCE_CONTACT), async (session) => {
                const view = await session.RunView<{ ID: string }>({ EntityName: 'MJ: Files', ExtraFilter: `ID = '${Quote(fileID)}'`, Fields: ['ID'], ResultType: 'simple' });
                Assert(!view.Success || view.Results.length === 0, `MJ: Files read is refused or empty (${view.ErrorMessage ?? `${view.Results.length} rows`})`);
                const token = await gqlOutcome(session, 'mutation ($fileId: String!) { CreateMediaAccessToken(fileId: $fileId) { Success ErrorMessage } }', 'CreateMediaAccessToken', { fileId: fileID });
                Assert(!token.Success, `CreateMediaAccessToken is refused (${token.ErrorMessage ?? ''})`);
                const contents = await gqlOutcome(session, 'query ($fileId: String!) { GetFileContents(fileId: $fileId) { Success ErrorMessage } }', 'GetFileContents', { fileId: fileID });
                Assert(!contents.Success, `GetFileContents is refused (${contents.ErrorMessage ?? ''})`);
            });
        },
    },
    {
        Id: 'cred-evidence.9',
        Name: 'attest in lieu: refused on a Normal requirement; a row on Restricted Allowed; attesting again supersedes the first',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const { SubjectID, NormalRequirementID, RestrictedRequirementID } = await evidenceTargets(ctx);
            await withSession(ctx, await magicLinkToken(ctx, EVIDENCE_CONTACT), async (session) => {
                const attest = (requirementID: string, statement: string) =>
                    new AttestInLieuOperation().Execute({ SubjectID, DocumentRequirementID: requirementID, Statement: statement }, { provider: session });
                const normal = await attest(NormalRequirementID, 'The policy is confidential.');
                Assert(!normal.Success, 'a Normal requirement refuses');
                AssertEqual(normal.ErrorMessage, DOCUMENT_MUST_BE_UPLOADED_REASON, 'the sentence');
                const first = await attest(RestrictedRequirementID, `The board minutes are held by the secretary (${randomUUID()}).`);
                Assert(first.Success && first.Output != null, `first attestation (${describe(first)})`);
                const second = await attest(RestrictedRequirementID, `The board minutes are shown to reviewers on request (${randomUUID()}).`);
                Assert(second.Success && second.Output != null, `second attestation (${describe(second)})`);
                AssertEqual(second.Output.SupersededAttestationID?.toLowerCase(), first.Output.DocumentAttestationID.toLowerCase(), 'the second supersedes the first');
            });
            const rows = await FindRows<{ ID: string; IsSuperseded: boolean }>(
                ctx,
                CredentialingEntity.DocumentAttestation,
                `SubjectID = '${Quote(SubjectID)}' AND DocumentRequirementID = '${Quote(RestrictedRequirementID)}'`,
                ['ID', 'IsSuperseded'],
            );
            Assert(rows.length >= 2, `at least two attestation rows (${rows.length})`);
            AssertEqual(rows.filter((r) => !r.IsSuperseded).length, 1, 'exactly one current attestation');
        },
    },
    {
        Id: 'cred-evidence.10',
        Name: 'a direct entity save of an EvidenceDocument by the contact over GraphQL is refused',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const { ID } = await uploadedDocument(ctx);
            const before = await documentOf(ctx, ID);
            await withSession(ctx, await magicLinkToken(ctx, EVIDENCE_CONTACT), async (session) => {
                const document = await session.GetEntityObject<EvidenceDocumentEntity>(CredentialingEntity.EvidenceDocument);
                Assert(await document.InnerLoad(CompositeKey.FromID(ID)), 'the contact can read their document');
                document.TextNote = 'changed directly';
                const saved = await document.Save();
                Assert(!saved, 'the save is refused');
                Assert((document.LatestResult?.CompleteMessage ?? '').includes(OPERATION_ONLY_SENTENCE), `refusal: ${document.LatestResult?.CompleteMessage ?? ''}`);
            });
            AssertEqual((await documentOf(ctx, ID)).TextNote, before.TextNote, 'the row is unchanged');
        },
    },
    {
        Id: 'cred-evidence.13',
        Name: 'the inflation-bomb DOCX answers 201 Could Not Read, and a request sent while it is parsed answers within 2 s',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const { ID } = await uploadedDocument(ctx);
            const token = await magicLinkToken(ctx, EVIDENCE_CONTACT);
            const bomb = uploadAs(ctx, token, null, 'meeting-notes.docx', fixture('inflation-bomb.docx'));
            await new Promise((resolve) => setTimeout(resolve, 300));
            const meanwhile = await http(ctx, 'GET', `/credentialing/evidence/${ID}/content`, token);
            const answer = await bomb;
            AssertEqual(meanwhile.Status, 200, 'the request sent meanwhile is served');
            Assert(meanwhile.Millis < 2000, `it answered within 2 s (${meanwhile.Millis} ms)`);
            AssertEqual(answer.Status, 201, `bomb status (${answer.Body.toString('utf8').slice(0, 200)})`);
            const body = jsonOf<AcceptedBody>(answer);
            AssertEqual(body.TextStatus, 'Could Not Read', 'text status');
            AssertEqual(body.TextNote, 'This file could not be opened. It is stored, but nothing can be drafted from it.', 'text note');
            AssertEqual((await documentOf(ctx, body.EvidenceDocumentID)).ReadingStatus, 'Not Applicable', 'nothing to read');
            Assert(answer.Millis > meanwhile.Millis, `the bomb was still being parsed when the other request answered (${answer.Millis} ms vs ${meanwhile.Millis} ms)`);
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
