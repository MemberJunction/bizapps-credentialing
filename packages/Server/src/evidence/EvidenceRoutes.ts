import { LogError, RemoteOperationError, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { IsValidUUID } from '@memberjunction/global';
import { EvidenceFileRules, NOT_FOUND_REASON } from '@mj-biz-apps/credentialing-core';
import {
    CredentialingServices,
    EvidenceIntake,
    EvidenceRefusal,
    SubjectAccess,
    type AcceptedEvidence,
} from '@mj-biz-apps/credentialing-core-entities-server';

/** What the upload answers when no storage account is configured. */
export const STORAGE_NOT_CONFIGURED_REASON = 'Document storage is not configured on this server.';

/** What a request without a signed-in user is told (MJAPI's own middleware normally answers first). */
export const SIGN_IN_REQUIRED_REASON = 'Sign in to continue.';

/** What an upload that failed for a reason the caller cannot act on is told; the cause is logged. */
export const UPLOAD_FAILED_REASON = 'The file could not be stored. Try again in a moment.';

/** What a download that failed for a reason the caller cannot act on is told; the cause is logged. */
export const DOWNLOAD_FAILED_REASON = 'The file could not be read. Try again in a moment.';

/** The settings the evidence routes read; see `ResolveEvidenceRouteSettings`. */
export interface EvidenceRouteSettings {
    /** The `MJ: File Storage Accounts` name evidence is stored in; null when the host configured none. */
    EvidenceStorageAccountName: string | null;
}

/** A request body as the route read it: at most `MaxBytes + 1` bytes, and whether there were more. */
export interface UploadBody {
    Bytes: Buffer;
    TooLarge: boolean;
}

/** The query string of an upload (`subjectId`, `requirementId`, `fileName` on the wire). */
export interface UploadQuery {
    SubjectID: string | null;
    RequirementID: string | null;
    FileName: string | null;
}

/** A JSON body: an accepted upload, or a sentence. */
export type JsonBody = AcceptedEvidence | { Message: string };

/** What a route answers, before it is written to the HTTP response. */
export type HttpReply =
    | { Status: number; Kind: 'Json'; Body: JsonBody; Headers: Record<string, string> }
    | { Status: number; Kind: 'Bytes'; Body: Buffer; Headers: Record<string, string> };

/** Headers every answer of these routes carries: nothing is cached and nothing is sniffed. */
const BASE_HEADERS: Record<string, string> = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
};

function json(status: number, body: JsonBody): HttpReply {
    return { Status: status, Kind: 'Json', Body: body, Headers: { ...BASE_HEADERS } };
}

/** The not-found answer: byte for byte the same for a record that does not exist and one the caller may not see. */
function notFound(): HttpReply {
    return json(404, { Message: NOT_FOUND_REASON });
}

/**
 * The evidence routes, independent of Express: `EvidenceRouteExtension` reads the request, calls
 * these, and writes the reply.
 *
 * - **Upload**: the signed-in caller, then the storage setting (503 without it), then the size cap
 *   and `EvidenceFileRules.Validate` — no database call before they pass — then
 *   `EvidenceIntake.Accept` on a provider of the request's own.
 * - **Download**: the signed-in caller, then `SubjectAccess.Document` as the caller (a contact of the
 *   subject, or staff of the owning organization). Not found and not permitted answer the identical
 *   404, decided before any storage call.
 *
 * The caller always comes from MJAPI's authentication, never from the request.
 */
export class EvidenceRoutes {
    public constructor(private readonly settings: EvidenceRouteSettings) {}

    /** POST {root}/evidence?subjectId=&requirementId=&fileName= */
    public async Upload(caller: UserInfo | null, query: UploadQuery, body: UploadBody): Promise<HttpReply> {
        if (caller == null) {
            return json(401, { Message: SIGN_IN_REQUIRED_REASON });
        }
        if (this.settings.EvidenceStorageAccountName == null) {
            return json(503, { Message: STORAGE_NOT_CONFIGURED_REASON });
        }
        const refusal = EvidenceRoutes.validate(query, body);
        if (refusal != null) {
            return refusal;
        }
        const subjectID = query.SubjectID ?? '';
        const requirementID = query.RequirementID != null && query.RequirementID.length > 0 ? query.RequirementID : null;
        if (!IsValidUUID(subjectID) || (requirementID != null && !IsValidUUID(requirementID))) {
            return notFound();
        }
        return EvidenceRoutes.onOwnProvider(UPLOAD_FAILED_REASON, async (provider) => {
            const accepted = await EvidenceIntake.Accept(
                { SubjectID: subjectID, RequirementID: requirementID, FileName: query.FileName ?? '', Bytes: body.Bytes },
                provider,
                caller,
            );
            return json(201, accepted);
        });
    }

    /** GET {root}/evidence/:documentId/content[?download=1] */
    public async Download(caller: UserInfo | null, documentID: string, asAttachment: boolean): Promise<HttpReply> {
        if (caller == null) {
            return json(401, { Message: SIGN_IN_REQUIRED_REASON });
        }
        if (!IsValidUUID(documentID)) {
            return notFound();
        }
        return EvidenceRoutes.onOwnProvider(DOWNLOAD_FAILED_REASON, async (provider) => {
            const { Document, Subject } = await SubjectAccess.Document(documentID, provider, caller);
            const actor = await SubjectAccess.ActorFor(caller, Subject, provider);
            if (actor == null) {
                return notFound();
            }
            if (this.settings.EvidenceStorageAccountName == null) {
                return json(503, { Message: STORAGE_NOT_CONFIGURED_REASON });
            }
            const bytes = await CredentialingServices.Store.Get(Document.FileID);
            return {
                Status: 200,
                Kind: 'Bytes',
                Body: bytes,
                Headers: {
                    ...BASE_HEADERS,
                    'Content-Type': Document.ContentType,
                    'Content-Length': String(bytes.length),
                    'Content-Disposition': EvidenceRoutes.ContentDisposition(Document.FileName, asAttachment),
                },
            };
        });
    }

    /** `inline` or `attachment`, with an ASCII file name and the UTF-8 one (RFC 6266 / RFC 5987). */
    public static ContentDisposition(fileName: string, asAttachment: boolean): string {
        const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
        const encoded = encodeURIComponent(fileName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
        return `${asAttachment ? 'attachment' : 'inline'}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
    }

    /** The size cap and the file rules, before anything is read from the database. */
    private static validate(query: UploadQuery, body: UploadBody): HttpReply | null {
        if (body.TooLarge) {
            return json(400, { Message: 'This file is larger than 25 MB.' });
        }
        const rule = EvidenceFileRules.Validate({
            FileName: EvidenceFileRules.SanitizeName(query.FileName ?? ''),
            SizeBytes: body.Bytes.length,
            FirstBytes: body.Bytes.subarray(0, 8192),
        });
        return 'Reason' in rule ? json(400, { Message: rule.Reason }) : null;
    }

    /**
     * Runs `work` on a provider of its own (MJAPI hands extension routes none: docs/dev-instance.md),
     * released when it settles, and turns refusals into their answers.
     */
    private static async onOwnProvider(failure: string, work: (provider: IMetadataProvider) => Promise<HttpReply>): Promise<HttpReply> {
        let provider: IMetadataProvider | null = null;
        try {
            provider = await CredentialingServices.Providers.Create();
            return await work(provider);
        } catch (err: unknown) {
            return EvidenceRoutes.replyForError(err, failure);
        } finally {
            if (provider != null) {
                await CredentialingServices.Providers.Release(provider);
            }
        }
    }

    private static replyForError(err: unknown, failure: string): HttpReply {
        if (err instanceof EvidenceRefusal) {
            switch (err.Kind) {
                case 'Invalid':
                    return json(400, { Message: err.message });
                case 'NotFound':
                    return notFound();
                case 'Conflict':
                    return json(409, { Message: err.message });
            }
        }
        if (err instanceof RemoteOperationError) {
            return err.message === NOT_FOUND_REASON ? notFound() : json(409, { Message: err.message });
        }
        LogError(`Credentialing evidence route failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
        return json(500, { Message: failure });
    }
}
