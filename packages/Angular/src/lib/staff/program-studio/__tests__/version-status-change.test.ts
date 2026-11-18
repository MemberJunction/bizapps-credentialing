import { describe, expect, it } from 'vitest';
import type { VersionStatus } from '@mj-biz-apps/credentialing-core';
import { VersionStatusChange, type StatusWritable } from '../version-status-change';

/** A version as the page shares it with the Settings tab, or as a fresh load returns it. */
class FakeVersion implements StatusWritable {
    public PeerReviewerCount = 2;
    public Saves: Array<{ Status: VersionStatus; PeerReviewerCount: number }> = [];
    public LatestResult: { CompleteMessage: string } | null = null;

    constructor(public Status: VersionStatus, private readonly refusal: string | null = null) {}

    public async Save(): Promise<boolean> {
        if (this.refusal != null) {
            this.LatestResult = { CompleteMessage: this.refusal };
            return false;
        }
        this.Saves.push({ Status: this.Status, PeerReviewerCount: this.PeerReviewerCount });
        return true;
    }
}

describe('VersionStatusChange.Apply', () => {
    it('saves only the status, on the freshly loaded version, leaving unsaved settings edits on the shared one unsaved', async () => {
        const shared = new FakeVersion('Draft');
        shared.PeerReviewerCount = 5; // an unsaved edit in the Settings tab
        const fresh = new FakeVersion('Draft');

        expect(await VersionStatusChange.Apply(async () => fresh, 'Active')).toBeNull();

        expect(fresh.Saves).toEqual([{ Status: 'Active', PeerReviewerCount: 2 }]);
        expect(shared.Saves).toEqual([]);
        expect(shared.Status).toBe('Draft');
        expect(shared.PeerReviewerCount).toBe(5);
    });

    it('retires an Active version', async () => {
        const fresh = new FakeVersion('Active');
        expect(await VersionStatusChange.Apply(async () => fresh, 'Retired')).toBeNull();
        expect(fresh.Saves).toEqual([{ Status: 'Retired', PeerReviewerCount: 2 }]);
    });

    it("returns the server's refusal of the save, which is about the activation", async () => {
        const fresh = new FakeVersion('Draft', 'Choose the deciding committee before activating this version.');
        expect(await VersionStatusChange.Apply(async () => fresh, 'Active')).toBe('Choose the deciding committee before activating this version.');
    });

    it('refuses, without saving, when the stored status no longer allows the move', async () => {
        const fresh = new FakeVersion('Active');
        expect(await VersionStatusChange.Apply(async () => fresh, 'Active')).toBe('A version can only move from Draft to Active, or from Active to Retired.');
        expect(fresh.Saves).toEqual([]);
        expect(fresh.Status).toBe('Active');
    });

    it('is not found when the version no longer loads', async () => {
        expect(await VersionStatusChange.Apply(async () => null, 'Active')).toBe('Record not found.');
    });

    it('falls back to a sentence when a refused save carries no message', async () => {
        const fresh = new FakeVersion('Draft', '');
        expect(await VersionStatusChange.Apply(async () => fresh, 'Active')).toBe('The version was not saved.');
    });
});
