import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { RegisterClass } from '@memberjunction/global';
import {
    FileStorageBase,
    type CreatePreAuthUploadUrlPayload,
    type FileSearchOptions,
    type FileSearchResultSet,
    type GetObjectMetadataParams,
    type GetObjectParams,
    type StorageListResult,
    type StorageObjectMetadata,
    type StorageProviderConfig,
} from '@memberjunction/storage';

/** The `ServerDriverKey` of the development storage provider row (`scripts/dev/ensure-dev-storage.mjs`). */
export const LOCAL_DISK_STORAGE_DRIVER_KEY = 'Credentialing Local Disk Storage';

/** What the constructor says when it is asked to run in production. */
export const LOCAL_DISK_PRODUCTION_REASON =
    'Credentialing Local Disk Storage is a development-only storage driver and does not run when NODE_ENV is production.';

/** What a call says before `initialize` has been given a root directory. */
const NOT_CONFIGURED_REASON = 'Credentialing Local Disk Storage has no root directory; its credential must carry RootDirectory.';

/** The name of an object whose resolved path is not inside the root. */
function escapeReason(objectName: string): string {
    return `The object name '${objectName}' resolves outside the storage root and is refused.`;
}

/**
 * A development-only MJ Storage driver that keeps objects as files under one root directory. The
 * root comes from the account's credential (`RootDirectory`), passed in through `initialize` by
 * MJ Storage's `InitializeDriverWithAccountCredentials`.
 *
 * - Every object name is resolved under the root; a name that escapes it (`..`, an absolute path,
 *   a symbolic link that points out) is refused.
 * - Bytes move only through {@link PutObject} and {@link GetObject}: the pre-authorized URL methods
 *   throw, so no client is ever handed a way around the server.
 * - The constructor throws when `NODE_ENV` is `production`.
 */
@RegisterClass(FileStorageBase, LOCAL_DISK_STORAGE_DRIVER_KEY)
export class LocalDiskFileStorage extends FileStorageBase {
    protected readonly providerName = LOCAL_DISK_STORAGE_DRIVER_KEY;
    private root: string | null = null;

    public constructor() {
        super();
        if (process.env.NODE_ENV === 'production') {
            throw new Error(LOCAL_DISK_PRODUCTION_REASON);
        }
    }

    /** Takes `RootDirectory` (an absolute path) from the account's configuration. */
    public override async initialize(config?: StorageProviderConfig): Promise<void> {
        await super.initialize(config);
        const configured = config?.RootDirectory;
        if (typeof configured === 'string' && configured.trim().length > 0) {
            if (!path.isAbsolute(configured.trim())) {
                throw new Error('Credentialing Local Disk Storage needs an absolute RootDirectory.');
            }
            this.root = path.resolve(configured.trim());
            await fs.mkdir(this.root, { recursive: true });
        }
    }

    public get IsConfigured(): boolean {
        return this.root != null;
    }

    public async CreatePreAuthUploadUrl(_objectName: string): Promise<CreatePreAuthUploadUrlPayload> {
        this.throwUnsupportedOperationError('CreatePreAuthUploadUrl');
    }

    public async CreatePreAuthDownloadUrl(_objectName: string): Promise<string> {
        this.throwUnsupportedOperationError('CreatePreAuthDownloadUrl');
    }

    public async PutObject(objectName: string, data: Buffer, _contentType?: string, _metadata?: Record<string, string>): Promise<boolean> {
        const target = await this.resolveObject(objectName);
        await fs.mkdir(path.dirname(target), { recursive: true });
        // Written beside the target and renamed, so a reader never sees half a file.
        const partial = `${target}.${process.pid}.partial`;
        await fs.writeFile(partial, data, { flag: 'w' });
        await fs.rename(partial, target);
        return true;
    }

    public async GetObject(params: GetObjectParams): Promise<Buffer> {
        const target = await this.resolveObject(this.objectNameOf(params));
        return fs.readFile(target);
    }

    public async DeleteObject(objectName: string): Promise<boolean> {
        const target = await this.resolveObject(objectName);
        try {
            await fs.unlink(target);
            return true;
        } catch (err: unknown) {
            if (isMissing(err)) {
                return true;
            }
            throw err;
        }
    }

    public async ObjectExists(objectName: string): Promise<boolean> {
        const target = await this.resolveObject(objectName);
        return (await statOrNull(target))?.isFile() === true;
    }

    public async GetObjectMetadata(params: GetObjectMetadataParams): Promise<StorageObjectMetadata> {
        const objectName = this.objectNameOf(params);
        const target = await this.resolveObject(objectName);
        const stat = await fs.stat(target);
        return this.metadataOf(objectName, stat);
    }

    public async MoveObject(oldObjectName: string, newObjectName: string): Promise<boolean> {
        const from = await this.resolveObject(oldObjectName);
        const to = await this.resolveObject(newObjectName);
        await fs.mkdir(path.dirname(to), { recursive: true });
        await fs.rename(from, to);
        return true;
    }

    public async CopyObject(sourceObjectName: string, destinationObjectName: string): Promise<boolean> {
        const from = await this.resolveObject(sourceObjectName);
        const to = await this.resolveObject(destinationObjectName);
        await fs.mkdir(path.dirname(to), { recursive: true });
        await fs.copyFile(from, to);
        return true;
    }

    public async ListObjects(prefix: string, _delimiter?: string): Promise<StorageListResult> {
        const directory = await this.resolveObject(prefix, true);
        const entries = await fs.readdir(directory, { withFileTypes: true }).catch((err: unknown) => {
            if (isMissing(err)) {
                return [];
            }
            throw err;
        });
        const objects: StorageObjectMetadata[] = [];
        const prefixes: string[] = [];
        for (const entry of entries) {
            const objectName = this.joinObjectName(prefix, entry.name);
            if (entry.isDirectory()) {
                prefixes.push(`${objectName}/`);
            } else if (entry.isFile() && !entry.name.endsWith('.partial')) {
                objects.push(this.metadataOf(objectName, await fs.stat(path.join(directory, entry.name))));
            }
        }
        return { objects, prefixes };
    }

    public async CreateDirectory(directoryPath: string): Promise<boolean> {
        await fs.mkdir(await this.resolveObject(directoryPath, true), { recursive: true });
        return true;
    }

    public async DeleteDirectory(directoryPath: string, recursive?: boolean): Promise<boolean> {
        const directory = await this.resolveObject(directoryPath, true);
        if (directory === this.requireRoot()) {
            throw new Error('The storage root itself cannot be deleted.');
        }
        await fs.rm(directory, { recursive: recursive === true, force: false });
        return true;
    }

    public async DirectoryExists(directoryPath: string): Promise<boolean> {
        const directory = await this.resolveObject(directoryPath, true);
        return (await statOrNull(directory))?.isDirectory() === true;
    }

    public async SearchFiles(_query: string, _options?: FileSearchOptions): Promise<FileSearchResultSet> {
        this.throwUnsupportedOperationError('SearchFiles');
    }

    /**
     * The absolute path of `objectName` under the root, refusing any name that resolves outside it.
     * The check is made on the lexical path and again on the real path of the deepest part that
     * exists, so a symbolic link inside the root cannot lead out of it.
     */
    private async resolveObject(objectName: string, allowRoot = false): Promise<string> {
        const root = this.requireRoot();
        const name = (objectName ?? '').replace(/\\/g, '/');
        if (name.includes('\0') || path.isAbsolute(name)) {
            throw new Error(escapeReason(objectName));
        }
        const resolved = path.resolve(root, name);
        if (!isInside(root, resolved, allowRoot)) {
            throw new Error(escapeReason(objectName));
        }
        const realRoot = await fs.realpath(root);
        const realExisting = await realpathOfDeepestExisting(resolved);
        if (realExisting != null && !isInside(realRoot, realExisting, true)) {
            throw new Error(escapeReason(objectName));
        }
        return resolved;
    }

    private requireRoot(): string {
        if (this.root == null) {
            throw new Error(NOT_CONFIGURED_REASON);
        }
        return this.root;
    }

    private objectNameOf(params: GetObjectParams | GetObjectMetadataParams): string {
        const name = params.fullPath ?? params.objectId;
        if (name == null || name.length === 0) {
            throw new Error('Credentialing Local Disk Storage needs an object name (fullPath).');
        }
        return name;
    }

    private joinObjectName(prefix: string, entryName: string): string {
        const trimmed = (prefix ?? '').replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
        return trimmed.length > 0 ? `${trimmed}/${entryName}` : entryName;
    }

    private metadataOf(objectName: string, stat: { size: number; mtime: Date; isDirectory(): boolean }): StorageObjectMetadata {
        const normalized = objectName.replace(/\\/g, '/');
        const slash = normalized.lastIndexOf('/');
        return {
            name: slash >= 0 ? normalized.slice(slash + 1) : normalized,
            path: slash >= 0 ? normalized.slice(0, slash) : '',
            fullPath: normalized,
            size: stat.size,
            contentType: 'application/octet-stream',
            lastModified: stat.mtime,
            isDirectory: stat.isDirectory(),
            etag: createHash('sha1').update(`${stat.size}:${stat.mtime.getTime()}`).digest('hex'),
        };
    }
}

/** Whether `candidate` is `root` itself (when allowed) or a path below it. */
function isInside(root: string, candidate: string, allowRoot: boolean): boolean {
    if (candidate === root) {
        return allowRoot;
    }
    const relative = path.relative(root, candidate);
    return relative.length > 0 && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/** The real path of `target`, or of its deepest ancestor that exists; null when none does. */
async function realpathOfDeepestExisting(target: string): Promise<string | null> {
    let current = target;
    for (;;) {
        try {
            return await fs.realpath(current);
        } catch (err: unknown) {
            if (!isMissing(err)) {
                throw err;
            }
            const parent = path.dirname(current);
            if (parent === current) {
                return null;
            }
            current = parent;
        }
    }
}

async function statOrNull(target: string): Promise<{ isFile(): boolean; isDirectory(): boolean } | null> {
    try {
        return await fs.stat(target);
    } catch (err: unknown) {
        if (isMissing(err)) {
            return null;
        }
        throw err;
    }
}

function isMissing(err: unknown): boolean {
    return err instanceof Error && 'code' in err && err.code === 'ENOENT';
}
