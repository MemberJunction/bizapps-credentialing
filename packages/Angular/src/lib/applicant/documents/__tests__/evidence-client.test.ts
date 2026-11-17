import { describe, expect, it } from 'vitest';
import { EvidenceClient, type EvidenceProviderConfig } from '../evidence-client';

function makeProvider(url: string, token: string, mjapiUrl?: string): EvidenceProviderConfig {
    return {
        ConfigData: {
            URL: url,
            MJAPIURL: mjapiUrl,
            Token: token,
        },
    };
}

describe('EvidenceClient', () => {
    it('POSTs raw bytes to /credentialing/evidence with bearer header and no token in the URL', async () => {
        const calls: Array<{ url: string; init: RequestInit }> = [];
        const fakeFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
            calls.push({ url: String(input), init: init ?? {} });
            return new Response(
                JSON.stringify({
                    EvidenceDocumentID: 'DOC-1',
                    TextStatus: 'Extracted',
                    TextNote: null,
                }),
                { status: 201, headers: { 'Content-Type': 'application/json' } },
            );
        };

        const client = new EvidenceClient(makeProvider('http://localhost:4050/graphql', 'jwt-secret-token'), fakeFetch);
        const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'policy.pdf', { type: 'application/pdf' });
        const result = await client.Upload('SUB-1', 'REQ-1', file);

        expect(result).toEqual({
            EvidenceDocumentID: 'DOC-1',
            TextStatus: 'Extracted',
            TextNote: null,
        });
        expect(calls).toHaveLength(1);
        const parsedUrl = new URL(calls[0].url);
        expect(parsedUrl.origin).toBe('http://localhost:4050');
        expect(parsedUrl.pathname).toBe('/credentialing/evidence');
        expect(parsedUrl.searchParams.get('subjectId')).toBe('SUB-1');
        expect(parsedUrl.searchParams.get('requirementId')).toBe('REQ-1');
        expect(parsedUrl.searchParams.get('fileName')).toBe('policy.pdf');
        expect(calls[0].url).not.toContain('jwt-secret-token');

        const headers = new Headers(calls[0].init.headers);
        expect(calls[0].init.method).toBe('POST');
        expect(headers.get('Authorization')).toBe('Bearer jwt-secret-token');
        expect(headers.get('Content-Type')).toBe('application/octet-stream');
    });

    it('omits requirementId for a general upload and throws the server Message on 4xx refusal', async () => {
        const calls: Array<{ url: string; init: RequestInit }> = [];
        const fakeFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
            calls.push({ url: String(input), init: init ?? {} });
            return new Response(JSON.stringify({ Message: 'This file is not a valid PDF file.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        };

        const client = new EvidenceClient(makeProvider('http://localhost:4050/', 'jwt-token', 'http://localhost:4050'), fakeFetch);
        const file = new File(['not pdf'], 'bad.pdf', { type: 'application/pdf' });

        await expect(client.Upload('SUB-1', null, file)).rejects.toThrow('This file is not a valid PDF file.');
        const parsedUrl = new URL(calls[0].url);
        expect(parsedUrl.searchParams.has('requirementId')).toBe(false);
    });

    it('GETs /credentialing/evidence/:documentId/content with bearer header and no token in the URL', async () => {
        const calls: Array<{ url: string; init: RequestInit }> = [];
        const fakeFetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
            calls.push({ url: String(input), init: init ?? {} });
            return new Response(new Uint8Array([1, 2, 3]), {
                status: 200,
                headers: { 'Content-Type': 'application/pdf' },
            });
        };

        const client = new EvidenceClient(makeProvider('http://localhost:4050/', 'jwt-magic'), fakeFetch);
        const blob = await client.Fetch('DOC-42');

        expect(blob.size).toBe(3);
        expect(calls).toHaveLength(1);
        expect(calls[0].url).toBe('http://localhost:4050/credentialing/evidence/DOC-42/content');
        expect(calls[0].url).not.toContain('jwt-magic');
        const headers = new Headers(calls[0].init.headers);
        expect(calls[0].init.method).toBe('GET');
        expect(headers.get('Authorization')).toBe('Bearer jwt-magic');
    });

    it('appends ?download=1 when Download option is set', async () => {
        const calls: string[] = [];
        const fakeFetch = async (input: string | URL | Request): Promise<Response> => {
            calls.push(String(input));
            return new Response(new Uint8Array([1]), { status: 200 });
        };

        const client = new EvidenceClient(makeProvider('http://localhost:4050/graphql', 'jwt-token'), fakeFetch);
        await client.Fetch('DOC-42', { Download: true });

        expect(calls[0]).toBe('http://localhost:4050/credentialing/evidence/DOC-42/content?download=1');
    });
});
