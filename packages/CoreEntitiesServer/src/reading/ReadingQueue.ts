import { randomUUID } from 'node:crypto';
import { LogError } from '@memberjunction/core';
import { BaseSingleton } from '@memberjunction/global';
import { SystemUser } from '../guards/SystemUser.js';
import { CredentialingServices } from '../services/CredentialingServices.js';
import { DatabaseReadingData } from './DatabaseReadingData.js';
import { ReadingWorker, type DrainCounts, type ReadingQueueSeams } from './ReadingWorker.js';

/** Minutes after which an uploaded file that no document references is removed by the sweep. */
export const ORPHAN_FILE_MINUTES = 60;

/** The process's one worker, held in a `BaseSingleton` so a second loaded copy of this module shares it. */
class ReadingQueueStore extends BaseSingleton<ReadingQueueStore> {
    public Worker: ReadingWorker | null = null;

    protected constructor() {
        super();
    }

    public static get Instance(): ReadingQueueStore {
        return super.getInstance<ReadingQueueStore>();
    }
}

/**
 * The reading queue (plan Task 9): recognizes scans and reads uploaded evidence into located
 * extractions, from a queue kept on the document row and arbitrated by the database.
 *
 * - {@link Nudge}: after an upload commits (fire and forget).
 * - {@link DrainOnce}: claim and read every candidate; single-flight per process.
 * - {@link Sweep}: at boot and every {@link SweepEveryMinutes}: contributed steps, the requeue rules,
 *   orphan removal, the drain.
 *
 * Every database write is an entity save under an application lock after a re-read, made as the
 * system user on a fresh isolated provider per unit of work (`DatabaseReadingData`); the model calls
 * run outside any transaction. The logic lives in {@link ReadingWorker}, which the unit tests run over
 * in-memory services.
 */
export class ReadingQueue {
    /** A `Running` claim older than this is taken over by the next claim (its worker is gone). */
    public static readonly StaleAfterMinutes = 15;
    /** The sweep's period. */
    public static readonly SweepEveryMinutes = 5;
    /** A document is tried this many times before it stays `Failed`. */
    public static readonly MaxAttempts = 3;
    /** Test seams (see {@link ReadingQueueSeams}). */
    public static readonly Seams: ReadingQueueSeams = {};

    /** Starts a drain without waiting for it; never throws into the caller. */
    public static Nudge(): void {
        try {
            if (!CredentialingServices.IsRegistered('Providers')) {
                return;
            }
            void ReadingQueue.worker()
                .DrainOnce()
                .catch((err: unknown) => LogError(`ReadingQueue: a nudged drain failed: ${err instanceof Error ? err.message : String(err)}`));
        } catch (err: unknown) {
            LogError(`ReadingQueue: the nudge failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }

    /** Claims and reads every candidate document; see {@link ReadingWorker.DrainOnce}. */
    public static DrainOnce(): Promise<DrainCounts> {
        return ReadingQueue.worker().DrainOnce();
    }

    /** Runs the sweep once; `AtBoot` also sets every `Could Not Run` document back to `Pending`. */
    public static Sweep(options: { AtBoot: boolean } = { AtBoot: false }): Promise<void> {
        return ReadingQueue.worker().Sweep(options.AtBoot);
    }

    private static worker(): ReadingWorker {
        const store = ReadingQueueStore.Instance;
        if (store.Worker == null) {
            store.Worker = new ReadingWorker({
                Data: new DatabaseReadingData(),
                Recognizer: () => CredentialingServices.Recognizer,
                Reader: () => CredentialingServices.Reader,
                Bytes: (fileID) => CredentialingServices.Store.Get(fileID),
                ContextUser: () => SystemUser.Get('Reading uploaded evidence'),
                NewClaimID: () => randomUUID().toUpperCase(),
                Seams: ReadingQueue.Seams,
                Limits: { StaleAfterMinutes: ReadingQueue.StaleAfterMinutes, MaxAttempts: ReadingQueue.MaxAttempts },
                Committed: (subjectID) => CredentialingServices.NotifyReadingCommitted(subjectID),
                SweepSteps: () => CredentialingServices.SweepSteps,
                RemoveOrphans: () => DatabaseReadingData.RemoveOrphans(ORPHAN_FILE_MINUTES),
            });
        }
        return store.Worker;
    }
}
