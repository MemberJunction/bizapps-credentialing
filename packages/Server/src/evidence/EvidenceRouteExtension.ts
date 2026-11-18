import type { Readable } from 'node:stream';
import type { Application, Request, Response } from 'express';
import { LogStatus, UserInfo } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import {
    BaseServerExtension,
    type ExtensionHealthResult,
    type ExtensionInitResult,
    type ServerExtensionConfig,
    type ServerExtensionInitContext,
    type ServerExtensionPhase,
} from '@memberjunction/server-extensions-core';
import { EvidenceFileRules } from '@mj-biz-apps/credentialing-core';
import { CredentialingServices } from '@mj-biz-apps/credentialing-core-entities-server';
import { EvidenceRoutes, type EvidenceRouteSettings, type HttpReply, type UploadBody } from './EvidenceRoutes.js';
import { StorageEvidenceStore } from './StorageEvidenceStore.js';
import { StartBackgroundReading, StopBackgroundReading } from '../reading/background.js';

/** The `DriverClass` this extension registers under and publishes in `MJ_SERVER_EXTENSIONS`. */
export const EVIDENCE_EXTENSION_DRIVER_CLASS = 'CredentialingEvidenceExtension';

/** The environment variable read when the extension's `Settings` name no storage account. */
export const EVIDENCE_STORAGE_ACCOUNT_ENV = 'CREDENTIALING_EVIDENCE_STORAGE_ACCOUNT';

/** What the server logs at start when no storage account is configured. */
export const STORAGE_SETUP_HINT =
    `Credentialing: evidence uploads answer 503 because no storage account is configured. Set ${EVIDENCE_STORAGE_ACCOUNT_ENV} ` +
    `(or the CredentialingEvidenceExtension Settings.EvidenceStorageAccountName in mj.config.cjs serverExtensions[]) to the ` +
    `name of an MJ: File Storage Accounts row, and restart.`;

/** Bytes read past the cap before a too-large request is cut off (its answer is already decided). */
const DRAIN_LIMIT_BYTES = EvidenceFileRules.MaxBytes * 2;

/**
 * The extension's settings: `Settings.EvidenceStorageAccountName`, falling back to the environment
 * variable {@link EVIDENCE_STORAGE_ACCOUNT_ENV}. Blank is not configured.
 */
export function ResolveEvidenceRouteSettings(settings: Record<string, unknown> | undefined, env: NodeJS.ProcessEnv = process.env): EvidenceRouteSettings {
    const configured = settings?.EvidenceStorageAccountName;
    const name = typeof configured === 'string' && configured.trim().length > 0 ? configured.trim() : (env[EVIDENCE_STORAGE_ACCOUNT_ENV] ?? '').trim();
    return { EvidenceStorageAccountName: name.length > 0 ? name : null };
}

/**
 * Reads a request body of at most `limit` bytes. Past the limit nothing more is kept: the body is
 * drained (so the answer can still be written on the same connection) up to {@link DRAIN_LIMIT_BYTES},
 * after which the request is cut off.
 */
export function ReadBoundedBody(request: Readable, limit: number): Promise<UploadBody> {
    return new Promise<UploadBody>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let kept = 0;
        let seen = 0;
        let tooLarge = false;
        request.on('data', (chunk: Buffer) => {
            seen += chunk.length;
            if (!tooLarge && kept + chunk.length <= limit) {
                chunks.push(chunk);
                kept += chunk.length;
                return;
            }
            tooLarge = true;
            if (seen > DRAIN_LIMIT_BYTES) {
                request.destroy();
                resolve({ Bytes: Buffer.alloc(0), TooLarge: true });
            }
        });
        request.on('end', () => resolve({ Bytes: tooLarge ? Buffer.alloc(0) : Buffer.concat(chunks, kept), TooLarge: tooLarge }));
        request.on('error', reject);
    });
}

/** The signed-in user MJAPI's authentication attached to the request; null when there is none. */
function callerOf(request: Request): UserInfo | null {
    if (!('userPayload' in request)) {
        return null;
    }
    const payload: unknown = request.userPayload;
    if (payload == null || typeof payload !== 'object' || !('userRecord' in payload)) {
        return null;
    }
    return payload.userRecord instanceof UserInfo ? payload.userRecord : null;
}

/** One query-string value as a string; anything else (absent, repeated) is null. */
function queryValue(request: Request, name: string): string | null {
    const value: unknown = request.query[name];
    return typeof value === 'string' ? value : null;
}

function send(response: Response, reply: HttpReply): void {
    response.status(reply.Status);
    for (const [name, value] of Object.entries(reply.Headers)) {
        response.setHeader(name, value);
    }
    if (reply.Kind === 'Bytes') {
        response.end(reply.Body);
    } else {
        response.json(reply.Body);
    }
}

/**
 * Publishes the evidence routes (FRD FR-5.7, FR-5.9) behind MJAPI's authentication:
 *
 * - `POST {RootPath}/evidence?subjectId=&requirementId=&fileName=` — raw bytes,
 *   `Content-Type: application/octet-stream` → 201 `{ EvidenceDocumentID, TextStatus, TextNote }` | 4xx `{ Message }`
 * - `GET {RootPath}/evidence/:documentId/content[?download=1]` → 200 bytes | 404 `{ Message: 'Record not found.' }`
 *
 * It is published by the package itself (`MJ_SERVER_EXTENSIONS` in `index.ts`) and defaults to the
 * `post-auth` phase, so a host that installs the app mounts it behind authentication with no
 * configuration. On start it registers the evidence store for the configured storage account, or
 * logs how to configure one.
 */
@RegisterClass(BaseServerExtension, EVIDENCE_EXTENSION_DRIVER_CLASS)
export class EvidenceRouteExtension extends BaseServerExtension {
    private routes: string[] = [];
    private settings: EvidenceRouteSettings = { EvidenceStorageAccountName: null };

    public override get DefaultPhase(): ServerExtensionPhase {
        return 'post-auth';
    }

    public async Initialize(contextOrApp: ServerExtensionInitContext | Application, config?: ServerExtensionConfig): Promise<ExtensionInitResult> {
        try {
            const { App, Config } = EvidenceRouteExtension.resolveInit(contextOrApp, config);
            const root = EvidenceRouteExtension.normalizeRoot(Config.RootPath);
            this.settings = ResolveEvidenceRouteSettings(Config.Settings);
            this.registerStore();
            const routes = new EvidenceRoutes(this.settings);
            App.post(`${root}/evidence`, (request: Request, response: Response) => {
                void EvidenceRouteExtension.upload(routes, request, response);
            });
            App.get(`${root}/evidence/:documentId/content`, (request: Request<{ documentId: string }>, response: Response) => {
                void EvidenceRouteExtension.download(routes, request, response);
            });
            this.routes = [`POST ${root}/evidence`, `GET ${root}/evidence/:documentId/content`];
            const storage = this.settings.EvidenceStorageAccountName ?? 'not configured';
            return { Success: true, Message: `Credentialing evidence routes mounted at ${root} (storage account: ${storage})`, RegisteredRoutes: [...this.routes] };
        } catch (err: unknown) {
            return { Success: false, Message: err instanceof Error ? err.message : String(err) };
        }
    }

    /**
     * Once every extension is mounted the server has booted (its metadata, providers and user cache
     * are ready): the reading queue's nudge, boot sweep and sweep timer start here (plan Task 9).
     */
    public async OnAllExtensionsMounted(): Promise<void> {
        try {
            await StartBackgroundReading();
        } catch (err: unknown) {
            LogStatus(`Credentialing: the reading queue could not start: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    public async Shutdown(): Promise<void> {
        // In-flight requests finish with the HTTP server; the reading queue's timers stop here.
        StopBackgroundReading();
    }

    public async HealthCheck(): Promise<ExtensionHealthResult> {
        return {
            Healthy: true,
            Name: EVIDENCE_EXTENSION_DRIVER_CLASS,
            Details: { Routes: [...this.routes], StorageConfigured: this.settings.EvidenceStorageAccountName != null },
        };
    }

    private registerStore(): void {
        const accountName = this.settings.EvidenceStorageAccountName;
        if (accountName == null) {
            LogStatus(STORAGE_SETUP_HINT);
            return;
        }
        CredentialingServices.Register({ Store: new StorageEvidenceStore(accountName) });
    }

    private static async upload(routes: EvidenceRoutes, request: Request, response: Response): Promise<void> {
        const caller = callerOf(request);
        const body = caller == null ? { Bytes: Buffer.alloc(0), TooLarge: false } : await ReadBoundedBody(request, EvidenceFileRules.MaxBytes);
        const reply = await routes.Upload(
            caller,
            { SubjectID: queryValue(request, 'subjectId'), RequirementID: queryValue(request, 'requirementId'), FileName: queryValue(request, 'fileName') },
            body,
        );
        send(response, reply);
    }

    private static async download(routes: EvidenceRoutes, request: Request<{ documentId: string }>, response: Response): Promise<void> {
        const reply = await routes.Download(callerOf(request), request.params.documentId, queryValue(request, 'download') === '1');
        send(response, reply);
    }

    private static normalizeRoot(rootPath: string | undefined): string {
        let trimmed = (rootPath ?? '').trim();
        while (trimmed.endsWith('/')) {
            trimmed = trimmed.slice(0, -1);
        }
        return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    }

    private static resolveInit(contextOrApp: ServerExtensionInitContext | Application, config?: ServerExtensionConfig): { App: Application; Config: ServerExtensionConfig } {
        if (typeof contextOrApp === 'function') {
            if (config == null) {
                throw new Error(`${EVIDENCE_EXTENSION_DRIVER_CLASS}.Initialize(app, config) requires a config`);
            }
            return { App: contextOrApp, Config: config };
        }
        return { App: contextOrApp.app, Config: contextOrApp.config };
    }
}
