import { randomUUID } from 'node:crypto';
import { CompositeKey, LogError, RunView, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { BaseSingleton, IsValidUUID, UUIDsEqual } from '@memberjunction/global';
import { CredentialingEntity, SUBMISSION_DISPATCH_GAVE_UP_NOTE } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingApplicationEntity } from '@mj-biz-apps/credentialing-entities';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite } from '../guards/OperationWrite.js';
import { SystemUser } from '../guards/SystemUser.js';
import { CredentialingServices } from '../services/CredentialingServices.js';

type ApplicationEntity = mjBizAppsCredentialingApplicationEntity;

const PURPOSE = 'Dispatching application submission events';

/** Event payload passed to registered `ApplicationEvents.OnSubmitted` subscribers. */
export interface ApplicationSubmittedEvent {
    ApplicationID: string;
    SubjectID: string;
    ProgramVersionID: string;
    SubmittedAt: Date;
}

/** Result of one `ApplicationEvents.Dispatch` attempt. */
export type DispatchResult = 'Dispatched' | 'Busy' | 'Failed' | 'GaveUp';

/** Registered `OnSubmitted` handler callback. */
export type ApplicationSubmittedHandler = (event: ApplicationSubmittedEvent) => Promise<void>;

/** Named subscriber registration. */
export interface ApplicationSubmittedSubscriber {
    Name: string;
    Handler: ApplicationSubmittedHandler;
}

/** Test seams for controlling `ApplicationEvents.Dispatch` and `Redispatch`. */
export interface ApplicationEventsSeams {
    InHandler?: () => Promise<void>;
    Now?: () => Date;
    OnlyApplicationIDs?: readonly string[];
}

/** Minimal application fields read and updated during durable submission dispatch. */
export interface DispatchApplicationRecord {
    ID: string;
    SubjectID: string;
    ProgramVersionID: string;
    SubmittedAt: Date | null;
    SubmissionDispatchedAt: Date | null;
    SubmissionDispatchClaimID: string | null;
    SubmissionDispatchClaimedAt: Date | null;
    SubmissionDispatchAttempts: number;
    SubmissionDispatchNote: string | null;
}

/** Patch saved to the application row inside the lock. */
export type DispatchApplicationPatch = Partial<
    Pick<
        DispatchApplicationRecord,
        | 'SubmissionDispatchedAt'
        | 'SubmissionDispatchClaimID'
        | 'SubmissionDispatchClaimedAt'
        | 'SubmissionDispatchAttempts'
        | 'SubmissionDispatchNote'
    >
>;

/** Transactional lock scope over one application row. */
export interface DispatchLockScope {
    Read(): Promise<DispatchApplicationRecord | null>;
    Save(patch: DispatchApplicationPatch): Promise<void>;
}

/** Data adapter separating locking/persistence from the dispatch state machine for unit tests. */
export interface ApplicationEventsData {
    UnderApplicationLock<T>(applicationID: string, work: (scope: DispatchLockScope) => Promise<T>): Promise<T>;
    FindPendingRedispatch(
        staleBefore: Date,
        maxAttempts: number,
        onlyApplicationIDs: readonly string[] | null,
    ): Promise<string[]>;
}

/**
 * Whether `Redispatch` selects an application: submitted, not dispatched, holding no live claim, and
 * either with attempts left or at the cap without its gave-up note yet (a process that crashed during
 * the final attempt raised the attempts in `claim()` and never reached `finish()`; `claim()` then
 * writes the note). {@link ApplicationEventsData.FindPendingRedispatch} applies the same rule in SQL.
 */
export function IsRedispatchCandidate(record: DispatchApplicationRecord, staleBefore: Date, maxAttempts: number): boolean {
    if (record.SubmittedAt == null || record.SubmissionDispatchedAt != null) {
        return false;
    }
    const liveClaim =
        record.SubmissionDispatchClaimID != null &&
        record.SubmissionDispatchClaimedAt != null &&
        record.SubmissionDispatchClaimedAt.getTime() >= staleBefore.getTime();
    if (liveClaim) {
        return false;
    }
    return (
        record.SubmissionDispatchAttempts < maxAttempts ||
        record.SubmissionDispatchClaimID != null ||
        record.SubmissionDispatchNote !== SUBMISSION_DISPATCH_GAVE_UP_NOTE
    );
}

class ApplicationEventsStore extends BaseSingleton<ApplicationEventsStore> {
    public Subscribers: ApplicationSubmittedSubscriber[] = [];

    protected constructor() {
        super();
    }

    public static get Instance(): ApplicationEventsStore {
        return super.getInstance<ApplicationEventsStore>();
    }
}

type ClaimStepOutcome =
    | { Kind: 'Busy' }
    | { Kind: 'GaveUp' }
    | { Kind: 'Claimed'; ClaimID: string; Event: ApplicationSubmittedEvent };

/**
 * Pure orchestration for durable post-submission dispatch (`ApplicationEvents`).
 * Tested in memory by `ApplicationEvents.test.ts` and backed by `DatabaseEventsData` on the server.
 */
export class ApplicationEventsWorker {
    public constructor(
        private readonly data: ApplicationEventsData,
        private readonly subscribers: () => readonly ApplicationSubmittedSubscriber[],
        private readonly limits: { MaxAttempts: number; ClaimStaleAfterMinutes: number },
        private readonly newClaimID: () => string,
        private readonly seams: ApplicationEventsSeams = {},
    ) {}

    public async Dispatch(applicationID: string): Promise<DispatchResult> {
        const claim = await this.claim(applicationID);
        if (claim.Kind === 'Busy') return 'Busy';
        if (claim.Kind === 'GaveUp') return 'GaveUp';

        const failedNames = await this.runSubscribers(claim.Event);
        return this.finish(applicationID, claim.ClaimID, failedNames);
    }

    public async Redispatch(): Promise<number> {
        const ids = await this.data.FindPendingRedispatch(
            this.staleBefore(),
            this.limits.MaxAttempts,
            this.seams.OnlyApplicationIDs ?? null,
        );
        let processed = 0;
        for (const id of ids) {
            const res = await this.Dispatch(id);
            if (res !== 'Busy') {
                processed++;
            }
        }
        return processed;
    }

    private now(): Date {
        return this.seams.Now?.() ?? new Date();
    }

    private staleBefore(): Date {
        return new Date(this.now().getTime() - this.limits.ClaimStaleAfterMinutes * 60_000);
    }

    private claim(applicationID: string): Promise<ClaimStepOutcome> {
        return this.data.UnderApplicationLock(applicationID, async (scope): Promise<ClaimStepOutcome> => {
            const current = await scope.Read();
            if (current == null || current.SubmittedAt == null || current.SubmissionDispatchedAt != null) {
                return { Kind: 'Busy' };
            }
            const staleBefore = this.staleBefore();
            if (
                current.SubmissionDispatchClaimID != null &&
                current.SubmissionDispatchClaimedAt != null &&
                current.SubmissionDispatchClaimedAt.getTime() >= staleBefore.getTime()
            ) {
                return { Kind: 'Busy' };
            }
            if (current.SubmissionDispatchAttempts >= this.limits.MaxAttempts) {
                if (
                    current.SubmissionDispatchClaimID != null ||
                    current.SubmissionDispatchNote !== SUBMISSION_DISPATCH_GAVE_UP_NOTE
                ) {
                    await scope.Save({
                        SubmissionDispatchClaimID: null,
                        SubmissionDispatchClaimedAt: null,
                        SubmissionDispatchNote: SUBMISSION_DISPATCH_GAVE_UP_NOTE,
                    });
                }
                return { Kind: 'GaveUp' };
            }
            const claimID = this.newClaimID();
            const claimedAt = this.now();
            await scope.Save({
                SubmissionDispatchClaimID: claimID,
                SubmissionDispatchClaimedAt: claimedAt,
                SubmissionDispatchAttempts: current.SubmissionDispatchAttempts + 1,
            });
            return {
                Kind: 'Claimed',
                ClaimID: claimID,
                Event: {
                    ApplicationID: current.ID,
                    SubjectID: current.SubjectID,
                    ProgramVersionID: current.ProgramVersionID,
                    SubmittedAt: current.SubmittedAt,
                },
            };
        });
    }

    private async runSubscribers(event: ApplicationSubmittedEvent): Promise<string[]> {
        const failed: string[] = [];
        const snapshot = [...this.subscribers()];
        for (const sub of snapshot) {
            try {
                await sub.Handler(event);
            } catch (err: unknown) {
                failed.push(sub.Name);
                const msg = err instanceof Error ? err.message : String(err);
                LogError(`ApplicationEvents: subscriber "${sub.Name}" failed for application ${event.ApplicationID}: ${msg}`);
            }
        }
        try {
            await this.seams.InHandler?.();
        } catch (err: unknown) {
            failed.push('Seams.InHandler');
            const msg = err instanceof Error ? err.message : String(err);
            LogError(`ApplicationEvents: seam InHandler failed for application ${event.ApplicationID}: ${msg}`);
        }
        return failed;
    }

    private finish(
        applicationID: string,
        claimID: string,
        failedNames: readonly string[],
    ): Promise<DispatchResult> {
        return this.data.UnderApplicationLock(applicationID, async (scope): Promise<DispatchResult> => {
            const current = await scope.Read();
            if (current == null || current.SubmissionDispatchClaimID == null || !UUIDsEqual(current.SubmissionDispatchClaimID, claimID)) {
                return 'Busy';
            }
            if (failedNames.length === 0) {
                await scope.Save({
                    SubmissionDispatchedAt: this.now(),
                    SubmissionDispatchClaimID: null,
                    SubmissionDispatchClaimedAt: null,
                });
                return 'Dispatched';
            }
            const patch: DispatchApplicationPatch = {
                SubmissionDispatchClaimID: null,
                SubmissionDispatchClaimedAt: null,
            };
            if (current.SubmissionDispatchAttempts >= this.limits.MaxAttempts) {
                patch.SubmissionDispatchNote = SUBMISSION_DISPATCH_GAVE_UP_NOTE;
            }
            await scope.Save(patch);
            return 'Failed';
        });
    }
}

function toDispatchRecord(entity: ApplicationEntity): DispatchApplicationRecord {
    return {
        ID: entity.ID,
        SubjectID: entity.SubjectID,
        ProgramVersionID: entity.ProgramVersionID,
        SubmittedAt: entity.SubmittedAt,
        SubmissionDispatchedAt: entity.SubmissionDispatchedAt,
        SubmissionDispatchClaimID: entity.SubmissionDispatchClaimID,
        SubmissionDispatchClaimedAt: entity.SubmissionDispatchClaimedAt,
        SubmissionDispatchAttempts: entity.SubmissionDispatchAttempts,
        SubmissionDispatchNote: entity.SubmissionDispatchNote,
    };
}

function applyDispatchPatch(entity: ApplicationEntity, patch: DispatchApplicationPatch): void {
    if (patch.SubmissionDispatchedAt !== undefined) entity.SubmissionDispatchedAt = patch.SubmissionDispatchedAt;
    if (patch.SubmissionDispatchClaimID !== undefined) entity.SubmissionDispatchClaimID = patch.SubmissionDispatchClaimID;
    if (patch.SubmissionDispatchClaimedAt !== undefined) entity.SubmissionDispatchClaimedAt = patch.SubmissionDispatchClaimedAt;
    if (patch.SubmissionDispatchAttempts !== undefined) entity.SubmissionDispatchAttempts = patch.SubmissionDispatchAttempts;
    if (patch.SubmissionDispatchNote !== undefined) entity.SubmissionDispatchNote = patch.SubmissionDispatchNote;
}

class DatabaseEventsData implements ApplicationEventsData {
    public UnderApplicationLock<T>(applicationID: string, work: (scope: DispatchLockScope) => Promise<T>): Promise<T> {
        return CredentialingServices.InBackground((provider) =>
            OperationWrite.Run(provider, async (scope) => {
                const system = SystemUser.Get(PURPOSE);
                await AuthoringLock.ForApplication(applicationID, provider, system);
                let loaded: ApplicationEntity | null = null;
                return work({
                    Read: async () => {
                        if (!IsValidUUID(applicationID)) return null;
                        const entity = await provider.GetEntityObject<ApplicationEntity>(
                            CredentialingEntity.Application,
                            system,
                        );
                        loaded = (await entity.InnerLoad(CompositeKey.FromID(applicationID))) ? entity : null;
                        return loaded == null ? null : toDispatchRecord(loaded);
                    },
                    Save: async (patch) => {
                        if (loaded == null) {
                            throw new Error(`Application ${applicationID} was saved before it was read.`);
                        }
                        applyDispatchPatch(loaded, patch);
                        await scope.Save(loaded);
                    },
                });
            }),
        );
    }

    public FindPendingRedispatch(
        staleBefore: Date,
        maxAttempts: number,
        onlyApplicationIDs: readonly string[] | null,
    ): Promise<string[]> {
        return CredentialingServices.InBackground(async (provider) => {
            const staleIso = staleBefore.toISOString();
            let idFilter = '';
            if (onlyApplicationIDs != null) {
                if (onlyApplicationIDs.length === 0) return [];
                for (const id of onlyApplicationIDs) {
                    if (!IsValidUUID(id)) throw new Error(`Not a UUID: ${id}`);
                }
                idFilter = ` AND ID IN (${onlyApplicationIDs.map((id) => `'${id}'`).join(', ')})`;
            }
            const gaveUpNote = SUBMISSION_DISPATCH_GAVE_UP_NOTE.replace(/'/g, "''");
            // The rule of IsRedispatchCandidate: no live claim, and attempts left or (at the cap) the gave-up note not yet written.
            const filter =
                `SubmittedAt IS NOT NULL AND SubmissionDispatchedAt IS NULL` +
                ` AND (SubmissionDispatchClaimID IS NULL OR SubmissionDispatchClaimedAt IS NULL OR SubmissionDispatchClaimedAt < '${staleIso}')` +
                ` AND (SubmissionDispatchAttempts < ${Math.trunc(maxAttempts)} OR SubmissionDispatchClaimID IS NOT NULL` +
                ` OR SubmissionDispatchNote IS NULL OR SubmissionDispatchNote <> N'${gaveUpNote}')` +
                idFilter;
            const res = await RunView.FromMetadataProvider(provider).RunView<{ ID: string }>(
                {
                    EntityName: CredentialingEntity.Application,
                    ExtraFilter: filter,
                    Fields: ['ID'],
                    OrderBy: 'SubmittedAt ASC',
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
                SystemUser.Get(PURPOSE),
            );
            if (!res.Success) {
                throw new Error(`Finding applications to redispatch failed: ${res.ErrorMessage ?? 'unknown error'}`);
            }
            return (res.Results ?? []).map((r) => r.ID);
        });
    }
}

/**
 * Durable post-submission event dispatcher (plan Task 11, Decision 11).
 *
 * Subscribers register with {@link OnSubmitted} and must be idempotent per `ApplicationID`.
 * `Dispatch` claims the application row under `AuthoringLock.ForApplication` inside an isolated
 * background provider before running subscribers outside any transaction, then marks
 * `SubmissionDispatchedAt` (or clears the claim and records `SubmissionDispatchNote` after
 * `MaxAttempts`) under the lock again only if the claim is still its own.
 */
export class ApplicationEvents {
    public static readonly MaxAttempts = 5;
    public static readonly ClaimStaleAfterMinutes = 15;
    public static readonly Seams: ApplicationEventsSeams = {};

    /** Registers a named idempotent subscriber; re-registering the same name replaces the earlier handler. */
    public static OnSubmitted(name: string, handler: ApplicationSubmittedHandler): void {
        const store = ApplicationEventsStore.Instance;
        store.Subscribers = [...store.Subscribers.filter((s) => s.Name !== name), { Name: name, Handler: handler }];
    }

    /** Unregisters a named subscriber (used in tests). */
    public static OffSubmitted(name: string): void {
        const store = ApplicationEventsStore.Instance;
        store.Subscribers = store.Subscribers.filter((s) => s.Name !== name);
    }

    /** Attempts one claimed dispatch of `applicationID`. */
    public static Dispatch(applicationID: string): Promise<DispatchResult> {
        return ApplicationEvents.worker().Dispatch(applicationID);
    }

    /**
     * Dispatches every submitted application whose dispatch has not succeeded and has no live claim,
     * including one at the attempt cap that has no gave-up note yet (so the note gets written).
     */
    public static Redispatch(): Promise<number> {
        return ApplicationEvents.worker().Redispatch();
    }

    /** Fire-and-forget dispatch triggered after `SubmitApplication` commits; never throws into the caller. */
    public static TriggerInBackground(applicationID: string): void {
        if (!CredentialingServices.IsRegistered('Providers')) {
            return;
        }
        void ApplicationEvents.Dispatch(applicationID).catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            LogError(`ApplicationEvents: background dispatch failed for ${applicationID}: ${msg}`);
        });
    }

    private static worker(): ApplicationEventsWorker {
        return new ApplicationEventsWorker(
            new DatabaseEventsData(),
            () => ApplicationEventsStore.Instance.Subscribers,
            {
                MaxAttempts: ApplicationEvents.MaxAttempts,
                ClaimStaleAfterMinutes: ApplicationEvents.ClaimStaleAfterMinutes,
            },
            () => randomUUID().toUpperCase(),
            ApplicationEvents.Seams,
        );
    }
}
