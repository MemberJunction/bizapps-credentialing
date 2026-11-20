import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LOCAL_DISK_PRODUCTION_REASON, LocalDiskFileStorage } from '../LocalDiskFileStorage.js';

describe('LocalDiskFileStorage', () => {
    let root: string;
    let outside: string;
    let storage: LocalDiskFileStorage;

    beforeEach(async () => {
        root = await mkdtemp(path.join(tmpdir(), 'cred-store-'));
        outside = await mkdtemp(path.join(tmpdir(), 'cred-outside-'));
        storage = new LocalDiskFileStorage();
        await storage.initialize({ accountId: 'account', accountName: 'Evidence', RootDirectory: root });
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
        await rm(outside, { recursive: true, force: true });
    });

    it('round-trips an object and deletes it', async () => {
        const bytes = Buffer.from('sample evidence bytes', 'utf8');
        expect(await storage.PutObject('credentialing-evidence/2026-11-17/abc/policy.pdf', bytes, 'application/pdf')).toBe(true);
        expect(await storage.ObjectExists('credentialing-evidence/2026-11-17/abc/policy.pdf')).toBe(true);
        expect((await storage.GetObject({ fullPath: 'credentialing-evidence/2026-11-17/abc/policy.pdf' })).equals(bytes)).toBe(true);
        const listed = await storage.ListObjects('credentialing-evidence/2026-11-17/abc');
        expect(listed.objects.map((o) => o.fullPath)).toEqual(['credentialing-evidence/2026-11-17/abc/policy.pdf']);
        expect(await storage.DeleteObject('credentialing-evidence/2026-11-17/abc/policy.pdf')).toBe(true);
        expect(await storage.ObjectExists('credentialing-evidence/2026-11-17/abc/policy.pdf')).toBe(false);
    });

    it.each(['../escape.txt', 'credentialing-evidence/../../escape.txt', '/etc/passwd', 'a\0b'])('refuses the name %s, which escapes the root', async (name) => {
        await expect(storage.PutObject(name, Buffer.from('x'))).rejects.toThrow('resolves outside the storage root');
        await expect(storage.GetObject({ fullPath: name })).rejects.toThrow('resolves outside the storage root');
    });

    it('refuses a name that leads out through a symbolic link inside the root', async () => {
        await writeFile(path.join(outside, 'secret.txt'), 'outside');
        await symlink(outside, path.join(root, 'link'));
        await expect(storage.GetObject({ fullPath: 'link/secret.txt' })).rejects.toThrow('resolves outside the storage root');
        await expect(storage.PutObject('link/new.txt', Buffer.from('x'))).rejects.toThrow('resolves outside the storage root');
    });

    it('hands out no pre-authorized URL', async () => {
        await expect(storage.CreatePreAuthDownloadUrl('a.pdf')).rejects.toThrow("Operation 'CreatePreAuthDownloadUrl' is not supported");
        await expect(storage.CreatePreAuthUploadUrl('a.pdf')).rejects.toThrow("Operation 'CreatePreAuthUploadUrl' is not supported");
    });

    it('is not configured, and refuses every object, without a root', async () => {
        const bare = new LocalDiskFileStorage();
        await bare.initialize({ accountId: 'account' });
        expect(bare.IsConfigured).toBe(false);
        await expect(bare.GetObject({ fullPath: 'a.pdf' })).rejects.toThrow('has no root directory');
    });

    it('refuses to run in production', () => {
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            expect(() => new LocalDiskFileStorage()).toThrow(LOCAL_DISK_PRODUCTION_REASON);
        } finally {
            process.env.NODE_ENV = previous;
        }
    });
});
