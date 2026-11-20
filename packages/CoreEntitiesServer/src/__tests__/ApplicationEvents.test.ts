import { describe, it, expect, beforeEach } from 'vitest';
import {
    ApplicationEvents,
    ApplicationEventsWorker,
    IsRedispatchCandidate,
    type ApplicationEventsData,
    type ApplicationSubmittedHandler,
    type DispatchApplicationPatch,
    type DispatchApplicationRecord,
} from '../events/ApplicationEvents.js';

function gate(): { Promise: Promise<void>; Open: () => void } {
    let open!: () => void;
    const PromiseObj = new Promise<void>((resolve) => {
        open = resolve;
    });
    return { Promise: PromiseObj, Open: open };
}

class MemoryEventsData implements ApplicationEventsData {
    public readonly Apps = new Map<string, DispatchApplicationRecord>();
    private lockChain: Promise<void> = Promise.resolve();

    public AddSubmitted(id = 'APP-1', overrides: Partial<DispatchApplicationRecord> = {}): DispatchApplicationRecord {
        const rec: DispatchApplicationRecord = {
            ID: id,
            SubjectID: 'SUB-1',
            ProgramVersionID: 'VER-1',
            SubmittedAt: new Date('2026-11-17T12:00:00Z'),
            SubmissionDispatchedAt: null,
            SubmissionDispatchClaimID: null,
            SubmissionDispatchClaimedAt: null,
            SubmissionDispatchAttempts: 0,
            SubmissionDispatchNote: null,
            ...overrides,
        };
        this.Apps.set(id, rec);
        return rec;
    }

    public async UnderApplicationLock<T>(
        applicationID: string,
        work: (scope: {
            Read(): Promise<DispatchApplicationRecord | null>;
            Save(patch: DispatchApplicationPatch): Promise<void>;
        }) => Promise<T>,
    ): Promise<T> {
        const prev = this.lockChain;
        let release!: () => void;
        this.lockChain = new Promise<void>((r) => {
            release = r;
        });
        await prev;
        try {
            return await work({
                Read: async () => {
                    const row = this.Apps.get(applicationID);
                    return row ? { ...row } : null;
                },
                Save: async (patch) => {
                    const current = this.Apps.get(applicationID);
                    if (!current) throw new Error(`Missing app ${applicationID}`);
                    this.Apps.set(applicationID, { ...current, ...patch });
                },
            });
        } finally {
            release();
        }
    }

    public async FindPendingRedispatch(
        staleBefore: Date,
        maxAttempts: number,
        onlyApplicationIDs: readonly string[] | null,
    ): Promise<string[]> {
        const ids: string[] = [];
        for (const app of this.Apps.values()) {
            if (onlyApplicationIDs != null && !onlyApplicationIDs.includes(app.ID)) continue;
            if (IsRedispatchCandidate(app, staleBefore, maxAttempts)) ids.push(app.ID);
        }
        return ids;
    }
}

describe('ApplicationEventsWorker', () => {
    let data: MemoryEventsData;
    let clockNow: Date;
    let claimCounter: number;
    let subscribers: Array<{ Name: string; Handler: ApplicationSubmittedHandler }>;
    let seams: { InHandler?: () => Promise<void>; Now: () => Date };
    let worker: ApplicationEventsWorker;

    beforeEach(() => {
        data = new MemoryEventsData();
        clockNow = new Date('2026-11-17T12:00:00Z');
        claimCounter = 0;
        subscribers = [];
        seams = { Now: () => clockNow };
        worker = new ApplicationEventsWorker(
            data,
            () => subscribers,
            { MaxAttempts: ApplicationEvents.MaxAttempts, ClaimStaleAfterMinutes: ApplicationEvents.ClaimStaleAfterMinutes },
            () => `CLAIM-${++claimCounter}`,
            seams,
        );
    });

    it('claims, runs handlers once, sets SubmissionDispatchedAt and clears claim', async () => {
        data.AddSubmitted('APP-1');
        const received: string[] = [];
        subscribers.push({
            Name: 'test-sub',
            Handler: async (e) => {
                received.push(e.ApplicationID);
            },
        });

        const res = await worker.Dispatch('APP-1');
        expect(res).toBe('Dispatched');
        expect(received).toEqual(['APP-1']);
        const stored = data.Apps.get('APP-1')!;
        expect(stored.SubmissionDispatchedAt).not.toBeNull();
        expect(stored.SubmissionDispatchClaimID).toBeNull();
        expect(stored.SubmissionDispatchClaimedAt).toBeNull();
        expect(stored.SubmissionDispatchAttempts).toBe(1);
    });

    it('returns Busy when a second Dispatch or Redispatch runs while a live claim holds', async () => {
        data.AddSubmitted('APP-1');
        const entered = gate();
        const release = gate();
        let runs = 0;
        subscribers.push({
            Name: 'slow',
            Handler: async () => {
                runs++;
                entered.Open();
                await release.Promise;
            },
        });

        const first = worker.Dispatch('APP-1');
        await entered.Promise;

        expect(await worker.Dispatch('APP-1')).toBe('Busy');
        expect(await worker.Redispatch()).toBe(0);

        release.Open();
        expect(await first).toBe('Dispatched');
        expect(runs).toBe(1);
    });

    it('retries a failing handler up to 5 times, then sets SubmissionDispatchNote and stops', async () => {
        data.AddSubmitted('APP-1');
        let calls = 0;
        subscribers.push({
            Name: 'always-fails',
            Handler: async () => {
                calls++;
                throw new Error('boom');
            },
        });

        for (let i = 1; i <= 5; i++) {
            const res = await worker.Dispatch('APP-1');
            expect(res).toBe('Failed');
            expect(data.Apps.get('APP-1')!.SubmissionDispatchAttempts).toBe(i);
            expect(data.Apps.get('APP-1')!.SubmissionDispatchedAt).toBeNull();
        }
        expect(calls).toBe(5);
        expect(data.Apps.get('APP-1')!.SubmissionDispatchNote).toBe(
            'Follow-up work for this submission could not be started. Tell your administrator.',
        );
        expect(await worker.Dispatch('APP-1')).toBe('GaveUp');
        expect(await worker.Redispatch()).toBe(0);
    });

    it('reclaims a stale claim after ClaimStaleAfterMinutes and discards the stale worker write', async () => {
        data.AddSubmitted('APP-1');
        const entered = gate();
        const release = gate();
        let calls = 0;
        subscribers.push({
            Name: 'reclaim',
            Handler: async () => {
                calls++;
                if (calls === 1) {
                    entered.Open();
                    await release.Promise;
                }
            },
        });

        const first = worker.Dispatch('APP-1');
        await entered.Promise;

        clockNow = new Date(clockNow.getTime() + 16 * 60_000);
        expect(await worker.Redispatch()).toBe(1);
        expect(data.Apps.get('APP-1')!.SubmissionDispatchedAt).not.toBeNull();

        release.Open();
        expect(await first).toBe('Busy');
        expect(calls).toBe(2);
    });

    it('a crash during the final attempt still gets the gave-up note from the next Redispatch once the claim is stale', async () => {
        data.AddSubmitted('APP-1', { SubmissionDispatchAttempts: 4 });
        const entered = gate();
        subscribers.push({
            Name: 'crashes',
            Handler: async () => {
                entered.Open();
                await new Promise<void>(() => undefined);
            },
        });
        void worker.Dispatch('APP-1');
        await entered.Promise;
        expect(data.Apps.get('APP-1')!.SubmissionDispatchAttempts).toBe(5);
        expect(data.Apps.get('APP-1')!.SubmissionDispatchClaimID).not.toBeNull();
        subscribers.length = 0;

        expect(await worker.Redispatch()).toBe(0);
        clockNow = new Date(clockNow.getTime() + (ApplicationEvents.ClaimStaleAfterMinutes + 1) * 60_000);
        expect(await worker.Redispatch()).toBe(1);
        const stored = data.Apps.get('APP-1')!;
        expect(stored.SubmissionDispatchNote).toBe('Follow-up work for this submission could not be started. Tell your administrator.');
        expect(stored.SubmissionDispatchClaimID).toBeNull();
        expect(stored.SubmissionDispatchedAt).toBeNull();
        expect(await data.FindPendingRedispatch(new Date(clockNow.getTime() - 15 * 60_000), ApplicationEvents.MaxAttempts, null)).toEqual([]);
        expect(await worker.Redispatch()).toBe(0);
    });

    it('a row at the cap with no claim and no note is selected once so the note is written', async () => {
        data.AddSubmitted('APP-1', { SubmissionDispatchAttempts: 5 });
        expect(await worker.Redispatch()).toBe(1);
        expect(data.Apps.get('APP-1')!.SubmissionDispatchNote).not.toBeNull();
        expect(await worker.Redispatch()).toBe(0);
    });
});
