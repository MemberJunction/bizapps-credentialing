import {
    BaseEntity,
    BaseEntityResult,
    LogError,
    ProviderBase,
    RunInEntityTransaction,
    RunView,
    ValidationErrorInfo,
    ValidationResult,
    type IMetadataProvider,
    type UserInfo,
} from '@memberjunction/core';
import { IsValidUUID } from '@memberjunction/global';
import { NOT_FOUND_REASON, STALE_RECORD_REASON, type RuleResult } from '@mj-biz-apps/credentialing-core';

/** What kind of write a result records. */
export type WriteKind = 'create' | 'update' | 'delete';

/** Thrown inside the transaction when the write reported `false`, so the transaction rolls back. */
class WriteNotCompleted extends Error {
    constructor() {
        super('The write did not complete.');
        this.name = 'WriteNotCompleted';
    }
}

/**
 * The shape every locked write shares: lock, check, write — in ONE transaction, so a second request
 * cannot slip in between the rules checked in validation and the write that follows them.
 */
export class LockedWrite {
    /**
     * Runs `work` (take the authoring locks, then save or delete) inside `RunInEntityTransaction`.
     * A `false` from `work` rolls the transaction back and returns `false` with the entity's
     * `LatestResult` as `work` left it. A throw rolls back too, and is recorded on the entity as a
     * failed result carrying the error's message, so callers — MJAPI's resolvers included — read it
     * from `LatestResult.CompleteMessage` like any other refusal.
     */
    public static async Run(entity: BaseEntity, kind: WriteKind, work: () => Promise<boolean>): Promise<boolean> {
        try {
            return await RunInEntityTransaction(entity.ProviderToUse, async () => {
                if (!(await work())) {
                    throw new WriteNotCompleted();
                }
                return true;
            });
        } catch (err: unknown) {
            if (err instanceof WriteNotCompleted) {
                return false;
            }
            const message = err instanceof Error ? err.message : String(err);
            LogError(`${entity.EntityInfo?.Name ?? 'entity'} ${kind} failed inside its authoring transaction: ${message}`);
            LockedWrite.Refuse(entity, kind, message);
            return false;
        }
    }

    /** The refusal a rule gave, or null when it allowed the change. */
    public static ReasonOf(rule: RuleResult): string | null {
        return 'Reason' in rule ? rule.Reason : null;
    }

    /** Records a refusal on the entity as its latest result (what `LatestResult.CompleteMessage` returns). */
    public static Refuse(entity: BaseEntity, kind: WriteKind, message: string): void {
        const result = new BaseEntityResult(false, message, kind);
        result.EndedAt = new Date();
        entity.RegisterResultHistoryEntry(result);
    }

    /**
     * The entity's provider as a metadata provider — the per-request provider on MJAPI, so reads made
     * through it run on that request's transaction. Every MJ provider derives from `ProviderBase`.
     */
    public static ProviderOf(entity: BaseEntity): IMetadataProvider {
        const provider = entity.ProviderToUse;
        if (!(provider instanceof ProviderBase)) {
            throw new Error(`${entity.EntityInfo?.Name ?? 'entity'} has no metadata provider to read its parents with.`);
        }
        return provider;
    }

    /** Names of the fields changed since the entity was loaded (all set fields, for a new record). */
    public static ChangedFields(entity: BaseEntity): string[] {
        return entity.Fields.filter((f) => f.Dirty).map((f) => f.Name);
    }

    /** Whether any of `fieldNames` changed since the entity was loaded. */
    public static AnyChanged(entity: BaseEntity, fieldNames: readonly string[]): boolean {
        return fieldNames.some((name) => entity.GetFieldByName(name)?.Dirty === true);
    }

    /**
     * The value a string field had when the entity was loaded — the stored value, once
     * {@link StaleReason} has confirmed the snapshot is current. Null for a new record.
     */
    public static LoadedString(entity: BaseEntity, fieldName: string): string | null {
        const old: unknown = entity.GetFieldByName(fieldName)?.OldValue;
        return typeof old === 'string' ? old : null;
    }

    /** Text as it is stored: without surrounding spaces, and empty rather than missing. */
    public static Trimmed(value: string | null | undefined): string {
        return (value ?? '').trim();
    }

    /** Adds a refusal to a validation result. */
    public static Fail(result: ValidationResult, source: string, message: string): ValidationResult {
        result.Success = false;
        result.Errors.push(new ValidationErrorInfo(source, message, null));
        return result;
    }

    /**
     * Why a stored row may not be written from this snapshot, or null when it may. Re-reads the row's
     * `__mj_UpdatedAt` as the caller and compares it, as an instant, with the value the entity was
     * loaded with. Called once the authoring locks are held, when the row can no longer change under
     * the caller: a row that is gone (or not readable by the caller) gives `NOT_FOUND_REASON`; a row
     * that moved since it was loaded gives {@link STALE_RECORD_REASON}.
     */
    public static async StaleReason(
        entityName: string,
        id: string,
        loadedUpdatedAt: Date | null,
        contextUser: UserInfo,
        provider: IMetadataProvider,
    ): Promise<string | null> {
        if (!IsValidUUID(id)) {
            return NOT_FOUND_REASON;
        }
        const res = await RunView.FromMetadataProvider(provider).RunView<{ ID: string; __mj_UpdatedAt: Date | string }>(
            { EntityName: entityName, ExtraFilter: `ID = '${id}'`, Fields: ['ID', '__mj_UpdatedAt'], ResultType: 'simple', MaxRows: 1 },
            contextUser,
        );
        if (!res.Success) {
            LogError(`Re-reading ${entityName} ${id} before writing it failed: ${res.ErrorMessage}`);
            return NOT_FOUND_REASON;
        }
        const row = res.Results[0];
        if (row == null) {
            return NOT_FOUND_REASON;
        }
        if (loadedUpdatedAt == null || new Date(row.__mj_UpdatedAt).getTime() !== new Date(loadedUpdatedAt).getTime()) {
            return STALE_RECORD_REASON;
        }
        return null;
    }
}
