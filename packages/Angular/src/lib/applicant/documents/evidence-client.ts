/**
 * HTTP client for the server's evidence routes (`/credentialing/evidence` and
 * `/credentialing/evidence/:documentId/content`), reading MJAPI's base URL and bearer token from
 * the widget's `ProviderToUse` (`GraphQLDataProvider.ConfigData`). Never puts a token in a URL.
 */
import { Metadata, type IMetadataProvider } from '@memberjunction/core';
import type { mjBizAppsCredentialingEvidenceDocumentEntity } from '@mj-biz-apps/credentialing-entities';

type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;

/** Structural view of `GraphQLDataProvider` needed for base URL, bearer token, and refresh. */
export interface EvidenceProviderConfig {
    readonly ConfigData?: {
        readonly URL?: string;
        readonly MJAPIURL?: string;
        readonly Token?: string;
    };
    RefreshToken?(): Promise<void>;
}

/** Accepted upload payload returned by `POST /credentialing/evidence` (201). */
export interface UploadResult {
    EvidenceDocumentID: string;
    TextStatus: EvidenceDocumentEntity['TextStatus'];
    TextNote: string | null;
}

/** Fetch signature used by {@link EvidenceClient} (injectable for unit tests). */
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function isEvidenceProvider(value: unknown): value is EvidenceProviderConfig {
    return value != null && typeof value === 'object' && 'ConfigData' in value;
}

function resolveBaseUrl(provider: EvidenceProviderConfig): string {
    const config = provider.ConfigData;
    const mjapiUrl = config?.MJAPIURL?.trim();
    if (mjapiUrl) {
        return mjapiUrl.replace(/\/+$/, '');
    }
    const gqlUrl = config?.URL?.trim();
    if (gqlUrl) {
        return gqlUrl.replace(/\/graphql\/?$/i, '').replace(/\/+$/, '');
    }
    throw new Error('Server URL is not configured on this provider.');
}

async function resolveBearerToken(provider: EvidenceProviderConfig): Promise<string> {
    const existing = provider.ConfigData?.Token?.trim();
    if (existing) {
        return existing;
    }
    if (typeof provider.RefreshToken === 'function') {
        await provider.RefreshToken();
        const refreshed = provider.ConfigData?.Token?.trim();
        if (refreshed) {
            return refreshed;
        }
    }
    throw new Error('Sign in to continue.');
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const text = await response.text();
        if (text.trim().length > 0) {
            const parsed = JSON.parse(text) as { Message?: unknown; error?: unknown };
            if (typeof parsed.Message === 'string' && parsed.Message.trim().length > 0) {
                return parsed.Message;
            }
            if (typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
                return parsed.error;
            }
        }
    } catch {
        // Fall back when the body is not JSON.
    }
    return fallback;
}

export class EvidenceClient {
    private readonly providerConfig: EvidenceProviderConfig;
    private readonly fetchFn: FetchLike;

    public constructor(
        provider?: IMetadataProvider | EvidenceProviderConfig | null,
        fetchFn?: FetchLike,
    ) {
        const resolved = provider ?? Metadata.Provider;
        if (!isEvidenceProvider(resolved)) {
            throw new Error('Evidence requests require a configured server provider.');
        }
        this.providerConfig = resolved;
        this.fetchFn = fetchFn ?? ((input, init) => globalThis.fetch(input, init));
    }

    /**
     * Uploads `file` as raw bytes (`application/octet-stream`) to
     * `POST /credentialing/evidence?subjectId=&requirementId=&fileName=`.
     */
    public async Upload(subjectID: string, requirementID: string | null, file: File): Promise<UploadResult> {
        const baseUrl = resolveBaseUrl(this.providerConfig);
        const query = new URLSearchParams({ subjectId: subjectID, fileName: file.name });
        if (requirementID != null && requirementID.length > 0) {
            query.set('requirementId', requirementID);
        }
        const url = `${baseUrl}/credentialing/evidence?${query.toString()}`;
        const response = await this.sendAuthorized(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: file,
        });
        if (!response.ok) {
            const message = await readErrorMessage(response, 'The file could not be uploaded.');
            throw new Error(message);
        }
        return (await response.json()) as UploadResult;
    }

    /**
     * Fetches the raw bytes of `documentID` via `GET /credentialing/evidence/:documentId/content`.
     */
    public async Fetch(documentID: string, options?: { Download?: boolean }): Promise<Blob> {
        const baseUrl = resolveBaseUrl(this.providerConfig);
        const suffix = options?.Download ? '?download=1' : '';
        const url = `${baseUrl}/credentialing/evidence/${encodeURIComponent(documentID)}/content${suffix}`;
        const response = await this.sendAuthorized(url, { method: 'GET' });
        if (!response.ok) {
            const message = await readErrorMessage(response, 'Could not load this document.');
            throw new Error(message);
        }
        return response.blob();
    }

    /**
     * Fetches the document with `?download=1` and triggers a browser download via a temporary object
     * URL, revoking it immediately after. Keeps the bearer token strictly in headers.
     */
    public async Download(documentID: string, fileName: string): Promise<void> {
        const blob = await this.Fetch(documentID, { Download: true });
        const objectUrl = URL.createObjectURL(blob);
        try {
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    private async sendAuthorized(url: string, init: RequestInit): Promise<Response> {
        let token = await resolveBearerToken(this.providerConfig);
        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${token}`);
        let response = await this.fetchFn(url, { ...init, headers });
        if (response.status === 401 && typeof this.providerConfig.RefreshToken === 'function') {
            await this.providerConfig.RefreshToken();
            token = await resolveBearerToken(this.providerConfig);
            const retryHeaders = new Headers(init.headers);
            retryHeaders.set('Authorization', `Bearer ${token}`);
            response = await this.fetchFn(url, { ...init, headers: retryHeaders });
        }
        return response;
    }
}
