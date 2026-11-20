import { RunView, type IMetadataProvider, type RunViewParams, type UserInfo } from '@memberjunction/core';
import { IsValidUUID } from '@memberjunction/global';
import { CredentialingEntity, type ApplicationStatus } from '@mj-biz-apps/credentialing-core';

/** The column of `ApplicationDocument` that names what an application froze. */
export type FrozenTarget = 'EvidenceDocumentID' | 'DocumentAttestationID';

/** An ID-only row. */
interface ApplicationIDRow {
    ApplicationID: string;
}

/** A status-only row. */
interface StatusRow {
    Status: ApplicationStatus;
}

/**
 * Which applications froze a document or an attestation (FRD BR-5): the statuses of the
 * applications whose `ApplicationDocument` rows name it. Read as `user` on `provider`, so the
 * caller's row filters apply and, inside an operation's transaction, the reads see its writes.
 */
export class DocumentFreeze {
    /** The statuses of the applications whose frozen set names `id` in `column`. */
    public static async Statuses(column: FrozenTarget, id: string, provider: IMetadataProvider, user: UserInfo): Promise<ApplicationStatus[]> {
        if (!IsValidUUID(id)) {
            return [];
        }
        const links = await DocumentFreeze.rows<ApplicationIDRow>(
            { EntityName: CredentialingEntity.ApplicationDocument, ExtraFilter: `${column} = '${id}'`, Fields: ['ApplicationID'], ResultType: 'simple', IgnoreMaxRows: true },
            provider,
            user,
        );
        const applicationIDs = [...new Set(links.map((l) => l.ApplicationID).filter((a) => IsValidUUID(a)))];
        if (applicationIDs.length === 0) {
            return [];
        }
        const applications = await DocumentFreeze.rows<StatusRow>(
            {
                EntityName: CredentialingEntity.Application,
                ExtraFilter: `ID IN (${applicationIDs.map((a) => `'${a}'`).join(', ')})`,
                Fields: ['Status'],
                ResultType: 'simple',
                IgnoreMaxRows: true,
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
