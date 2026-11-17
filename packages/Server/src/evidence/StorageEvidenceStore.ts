import { randomUUID } from 'node:crypto';
import { CompositeKey, LogError, RunView, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import type { MJFileEntity, MJFileStorageAccountEntity } from '@memberjunction/core-entities';
import { FileStorageEngine, StorageObjectKeyOf } from '@memberjunction/storage';
import {
    CredentialingServices,
    EVIDENCE_OBJECT_PREFIX,
    SystemUser,
    type EvidenceStore,
} from '@mj-biz-apps/credentialing-core-entities-server';

const FILES_ENTITY = 'MJ: Files';

/** The `MJ: Files` columns the store reads. */
type FileRow = Pick<MJFileEntity, 'ID' | 'Name' | 'ProviderID' | 'ProviderKey'>;

/**
 * The server's {@link EvidenceStore}: evidence bytes kept through MJ Storage, on ONE storage account
 * named by configuration (`EvidenceStorageAccountName`), as the system user. The account is always
 * named explicitly — never MJ Storage's "first active account" fallback
 * (`FileStorageEngine.ResolveStorageAccount`) — and every object is written under
 * {@link EVIDENCE_OBJECT_PREFIX}. A file ID that is not an evidence object of that account is
 * neither read nor removed.
 *
 * No credentialing role holds a permission on `MJ: Files` (plan Decision 5): applicants and staff
 * reach the bytes only through this app's authorizing route. Each call runs on a provider of its
 * own (`CredentialingServices.InBackground`), so a store call never joins a request's transaction.
 */
export class StorageEvidenceStore implements EvidenceStore {
    public constructor(private readonly accountName: string) {}

    public async Put(bytes: Buffer, fileName: string, contentType: string): Promise<{ FileID: string }> {
        return CredentialingServices.InBackground(async (provider) => {
            const system = StorageEvidenceStore.system('Storing an evidence file');
            const account = await this.account(provider, system);
            const result = await FileStorageEngine.Instance.UploadFile({
                content: bytes,
                fileName,
                mimeType: contentType,
                contextUser: system,
                storageAccountId: account.ID,
                pathPrefix: `${EVIDENCE_OBJECT_PREFIX}${new Date().toISOString().slice(0, 10)}/${randomUUID()}`,
                provider,
            });
            return { FileID: result.FileID };
        });
    }

    public async Get(fileID: string): Promise<Buffer> {
        return CredentialingServices.InBackground(async (provider) => {
            const system = StorageEvidenceStore.system('Reading an evidence file');
            const account = await this.account(provider, system);
            const file = await StorageEvidenceStore.fileRow(fileID, provider, system);
            if (file == null || !StorageEvidenceStore.isEvidenceObject(file, account)) {
                throw new Error(`File ${fileID} is not an evidence file of the storage account "${this.accountName}".`);
            }
            const driver = await FileStorageEngine.Instance.GetDriver(account.ID, system);
            return driver.GetObject({ fullPath: StorageObjectKeyOf(file) });
        });
    }

    public async Remove(fileID: string): Promise<void> {
        try {
            await CredentialingServices.InBackground(async (provider) => {
                const system = StorageEvidenceStore.system('Removing an evidence file');
                await this.removeOne(fileID, await this.account(provider, system), provider, system);
            });
        } catch (err: unknown) {
            LogError(`StorageEvidenceStore: removing file ${fileID} failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    public async RemoveOrphans(olderThanMinutes: number, referencedFileIDs: (candidateIDs: string[]) => Promise<Set<string>>): Promise<number> {
        return CredentialingServices.InBackground(async (provider) => {
            const system = StorageEvidenceStore.system('Removing orphaned evidence files');
            const account = await this.account(provider, system);
            const candidates = await StorageEvidenceStore.orphanCandidates(account, olderThanMinutes, provider, system);
            if (candidates.length === 0) {
                return 0;
            }
            const referenced = new Set([...(await referencedFileIDs(candidates.map((c) => c.ID)))].map((id) => id.toLowerCase()));
            let removed = 0;
            for (const file of candidates) {
                if (!referenced.has(file.ID.toLowerCase()) && (await this.removeOne(file.ID, account, provider, system))) {
                    removed++;
                }
            }
            return removed;
        });
    }

    /** Deletes one evidence object and its `MJ: Files` row; false when the ID names no evidence file of the account. */
    private async removeOne(fileID: string, account: MJFileStorageAccountEntity, provider: IMetadataProvider, system: UserInfo): Promise<boolean> {
        const file = await provider.GetEntityObject<MJFileEntity>(FILES_ENTITY, system);
        if (!(await file.InnerLoad(CompositeKey.FromID(fileID))) || !StorageEvidenceStore.isEvidenceObject(file, account)) {
            return false;
        }
        const driver = await FileStorageEngine.Instance.GetDriver(account.ID, system);
        await driver.DeleteObject(StorageObjectKeyOf(file));
        if (!(await file.Delete())) {
            throw new Error(`Deleting the MJ: Files row ${fileID} failed: ${file.LatestResult?.CompleteMessage ?? 'unknown error'}`);
        }
        return true;
    }

    /** The configured account, read as the system user; refreshed once when the cache does not hold it. */
    private async account(provider: IMetadataProvider, system: UserInfo): Promise<MJFileStorageAccountEntity> {
        const engine = FileStorageEngine.Instance;
        await engine.Config(false, system, provider);
        let account = engine.GetAccountByName(this.accountName);
        if (account == null) {
            await engine.RefreshAfterMiss(provider);
            account = engine.GetAccountByName(this.accountName);
        }
        if (account == null) {
            throw new Error(`The evidence storage account "${this.accountName}" does not exist (MJ: File Storage Accounts).`);
        }
        return account;
    }

    private static async fileRow(fileID: string, provider: IMetadataProvider, system: UserInfo): Promise<FileRow | null> {
        const result = await RunView.FromMetadataProvider(provider).RunView<FileRow>(
            { EntityName: FILES_ENTITY, ExtraFilter: `ID = '${fileID.replace(/'/g, "''")}'`, Fields: ['ID', 'Name', 'ProviderID', 'ProviderKey'], ResultType: 'simple', MaxRows: 1 },
            system,
        );
        if (!result.Success) {
            throw new Error(`Reading MJ: Files ${fileID} failed: ${result.ErrorMessage ?? 'unknown error'}`);
        }
        return result.Results[0] ?? null;
    }

    private static async orphanCandidates(account: MJFileStorageAccountEntity, olderThanMinutes: number, provider: IMetadataProvider, system: UserInfo): Promise<FileRow[]> {
        const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString();
        const result = await RunView.FromMetadataProvider(provider).RunView<FileRow>(
            {
                EntityName: FILES_ENTITY,
                ExtraFilter: `ProviderID = '${account.ProviderID}' AND ProviderKey LIKE '${EVIDENCE_OBJECT_PREFIX}%' AND __mj_CreatedAt < '${cutoff}'`,
                Fields: ['ID', 'Name', 'ProviderID', 'ProviderKey'],
                ResultType: 'simple',
                IgnoreMaxRows: true,
            },
            system,
        );
        if (!result.Success) {
            throw new Error(`Listing evidence files failed: ${result.ErrorMessage ?? 'unknown error'}`);
        }
        return result.Results ?? [];
    }

    /** Whether a file row is an object this store wrote: the account's provider and the evidence prefix. */
    private static isEvidenceObject(file: FileRow, account: MJFileStorageAccountEntity): boolean {
        return file.ProviderID.toLowerCase() === account.ProviderID.toLowerCase() && (file.ProviderKey ?? '').startsWith(EVIDENCE_OBJECT_PREFIX);
    }

    private static system(purpose: string): UserInfo {
        return SystemUser.Get(purpose);
    }
}
