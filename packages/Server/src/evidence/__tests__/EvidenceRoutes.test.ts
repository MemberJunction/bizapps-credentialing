import { Readable } from 'node:stream';
import { UserInfo, type IMetadataProvider } from '@memberjunction/core';
import { NOT_FOUND_REASON } from '@mj-biz-apps/credentialing-core';
import { CredentialingServices, type IsolatedProviderFactory } from '@mj-biz-apps/credentialing-core-entities-server';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReadBoundedBody, ResolveEvidenceRouteSettings } from '../EvidenceRouteExtension.js';
import { EvidenceRoutes, SIGN_IN_REQUIRED_REASON, STORAGE_NOT_CONFIGURED_REASON, type HttpReply } from '../EvidenceRoutes.js';
import { Fixture } from './fixtures.js';

const SUBJECT = '0F0E0D0C-0000-4000-8000-000000000001';
const caller = new UserInfo(null, { ID: '0F0E0D0C-0000-4000-8000-0000000000AA', Email: 'contact@example.test', UserRoles: [] });

/** A provider factory that counts what it was asked for: none of these answers may reach a database. */
class CountingFactory implements IsolatedProviderFactory {
    public Created = 0;

    public async Create(): Promise<IMetadataProvider> {
        this.Created++;
        throw new Error('no database in this test');
    }

    public async Release(): Promise<void> {}
}

function messageOf(reply: HttpReply): string {
    if (reply.Kind !== 'Json' || !('Message' in reply.Body)) {
        throw new Error('expected a JSON sentence');
    }
    return reply.Body.Message;
}

describe('EvidenceRoutes', () => {
    let factory: CountingFactory;
    const configured = new EvidenceRoutes({ EvidenceStorageAccountName: 'Credentialing Evidence' });

    beforeEach(() => {
        factory = new CountingFactory();
        CredentialingServices.Register({ Providers: factory });
    });

    it('answers 503 with its sentence when no storage account is configured, before anything else', async () => {
        const routes = new EvidenceRoutes({ EvidenceStorageAccountName: null });
        const reply = await routes.Upload(caller, { SubjectID: SUBJECT, RequirementID: null, FileName: 'policy.pdf' }, { Bytes: Fixture('two-page-text.pdf'), TooLarge: false });
        expect(reply.Status).toBe(503);
        expect(messageOf(reply)).toBe(STORAGE_NOT_CONFIGURED_REASON);
        expect(factory.Created).toBe(0);
    });

    it('answers 401 without a signed-in caller', async () => {
        const reply = await configured.Upload(null, { SubjectID: SUBJECT, RequirementID: null, FileName: 'policy.pdf' }, { Bytes: Buffer.alloc(1), TooLarge: false });
        expect(reply.Status).toBe(401);
        expect(messageOf(reply)).toBe(SIGN_IN_REQUIRED_REASON);
    });

    it.each([
        ['an empty body', 'policy.pdf', Buffer.alloc(0), false, 'This file is empty.'],
        ['a body over 25 MB', 'policy.pdf', Buffer.alloc(0), true, 'This file is larger than 25 MB.'],
        ['a renamed non-PDF', 'not-a-pdf.pdf', Fixture('not-a-pdf.pdf'), false, 'This file is not a valid PDF file.'],
        ['an unknown type', 'tool.exe', Buffer.from('MZ'), false, 'This file type cannot be read. Upload a PDF, Word (.docx), Excel (.xlsx), text, Markdown, PNG or JPEG file.'],
    ])('refuses %s with 400 and its sentence, before any database call', async (_label, fileName, bytes, tooLarge, sentence) => {
        const reply = await configured.Upload(caller, { SubjectID: SUBJECT, RequirementID: null, FileName: fileName }, { Bytes: bytes, TooLarge: tooLarge });
        expect(reply.Status).toBe(400);
        expect(messageOf(reply)).toBe(sentence);
        expect(factory.Created).toBe(0);
    });

    it('answers a malformed subject or document ID exactly like any record it cannot see', async () => {
        const upload = await configured.Upload(caller, { SubjectID: 'not-an-id', RequirementID: null, FileName: 'policy.pdf' }, { Bytes: Fixture('two-page-text.pdf'), TooLarge: false });
        const download = await configured.Download(caller, 'not-an-id', false);
        for (const reply of [upload, download]) {
            expect(reply.Status).toBe(404);
            expect(reply.Kind === 'Json' ? reply.Body : null).toEqual({ Message: NOT_FOUND_REASON });
            expect(reply.Headers['Cache-Control']).toBe('private, no-store');
            expect(reply.Headers['X-Content-Type-Options']).toBe('nosniff');
        }
        expect(factory.Created).toBe(0);
    });

    it('names the file inline or as an attachment, with an ASCII and a UTF-8 name', () => {
        expect(EvidenceRoutes.ContentDisposition('Évaluation "2026".pdf', false)).toBe(
            `inline; filename="_valuation _2026_.pdf"; filename*=UTF-8''%C3%89valuation%20%222026%22.pdf`,
        );
        expect(EvidenceRoutes.ContentDisposition('policy.pdf', true)).toBe(`attachment; filename="policy.pdf"; filename*=UTF-8''policy.pdf`);
    });
});

describe('ResolveEvidenceRouteSettings', () => {
    it('takes the account from Settings, then from the environment, and treats blank as not configured', () => {
        expect(ResolveEvidenceRouteSettings({ EvidenceStorageAccountName: ' Evidence ' }, {})).toEqual({ EvidenceStorageAccountName: 'Evidence' });
        expect(ResolveEvidenceRouteSettings({}, { CREDENTIALING_EVIDENCE_STORAGE_ACCOUNT: 'From Env' })).toEqual({ EvidenceStorageAccountName: 'From Env' });
        expect(ResolveEvidenceRouteSettings({ EvidenceStorageAccountName: '  ' }, { CREDENTIALING_EVIDENCE_STORAGE_ACCOUNT: '' })).toEqual({ EvidenceStorageAccountName: null });
    });
});

describe('ReadBoundedBody', () => {
    it('keeps a body within the limit', async () => {
        const body = await ReadBoundedBody(Readable.from([Buffer.from('abc'), Buffer.from('def')]), 6);
        expect(body).toEqual({ Bytes: Buffer.from('abcdef'), TooLarge: false });
    });

    it('keeps nothing of a body past the limit and says so', async () => {
        const body = await ReadBoundedBody(Readable.from([Buffer.from('abc'), Buffer.from('defg')]), 6);
        expect(body.TooLarge).toBe(true);
        expect(body.Bytes.length).toBe(0);
    });
});
