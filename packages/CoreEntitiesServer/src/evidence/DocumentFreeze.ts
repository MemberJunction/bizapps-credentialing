import { RunView, type IMetadataProvider, type RunViewParams, type UserInfo } from '@memberjunction/core';
import { IsValidUUID } from '@memberjunction/global';
import { CredentialingEntity, type ApplicationStatus } from '@mj-biz-apps/credentialing-core';

/** The column of `ApplicationDocument` that names what an application froze. */
export type FrozenTarget = 'EvidenceDocumentID' | 'DocumentAttestationID';

/** A status-only row. */
interface StatusRow {
    Status: ApplicationStatus;
}

const APPLICATION_DOCUMENTS_VIEW = '[__mj_BizAppsCredentialing].[vwApplicationDocuments]';

/**
 * Which applications froze a document or an attestation (FRD BR-5): the statuses of the
 * applications whose `ApplicationDocument` rows name it. Read as `user` on `provider` in a single
 * `RunView`, so the caller's row filters apply and, inside an operation's transaction, the read
 * sees its writes.
 */
export class DocumentFreeze {
    /** The statuses of the applications whose frozen set names `id` in `column`. */
    public static async Statuses(column: FrozenTarget, id: string, provider: IMetadataProvider, user: UserInfo): Promise<ApplicationStatus[]> {
        if (!IsValidUUID(id)) {
            return [];
        }
        const applications = await DocumentFreeze.rows<StatusRow>(
            {
                EntityName: CredentialingEntity.Application,
                ExtraFilter: `ID IN (SELECT ad.ApplicationID FROM ${APPLICATION_DOCUMENTS_VIEW} ad WHERE ad.${column} = '${id}')`,
                Fields: ['Status'],
                ResultType: 'simple',
                IgnoreMaxRows: true,
                SkipTotalRowCount: true,
            },
            provider,
            user,
        );
        return applications.map((a) => a.Status);
    }

    /** The rows of one read; a failed read throws, so no decision is made from a partial picture. */
    private static async rows<T>(params: RunViewParams, provider: IMetadataProvider, user: UserInfo): Promise<T[]> {
        const result = await RunView.FromMetadataProvider(provider).RunView<T>(params, user);
        if (!result.Success) {
            throw new Error(`Reading ${params.EntityName} to decide what froze a document failed: ${result.ErrorMessage ?? 'unknown error'}`);
        }
        return result.Results ?? [];
    }
}
