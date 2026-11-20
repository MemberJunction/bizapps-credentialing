import { DatabaseProviderBase, RemoteOperationError, RunInEntityTransaction, type BaseEntity, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { OPERATION_REFUSED } from '@mj-biz-apps/credentialing-core';

/**
 * The steps the credentialing server operations share. Each operation saves entity objects as its
 * caller, so every guard of the entity subclasses runs; these helpers turn the first refusal into a
 * thrown {@link RemoteOperationError}, which rolls the operation's transaction back and reaches the
 * caller as `Success: false`, `ResultCode: 'REFUSED'` and the guard's sentence in `ErrorMessage`.
 */
export class OperationSupport {
    /** Whether `user` holds the role named `roleName` (names compared trimmed, ignoring case). */
    public static HoldsRole(user: UserInfo | null | undefined, roleName: string): boolean {
        const wanted = roleName.trim().toLowerCase();
        return (user?.UserRoles ?? []).some((r) => (r.Role ?? '').trim().toLowerCase() === wanted);
    }

    /**
     * Runs `work` as one unit of work on `provider`'s transaction: commits when it returns, rolls back
     * when it throws (a refusal included). Only a database provider holds a transaction — without one,
     * `RunInEntityTransaction` would run the work unprotected — so any other provider is an error.
     */
    public static InTransaction<T>(provider: IMetadataProvider, work: () => Promise<T>): Promise<T> {
        if (!(provider instanceof DatabaseProviderBase)) {
            throw new Error('This operation runs only on the server, inside a database transaction.');
        }
        return RunInEntityTransaction(provider, work);
    }

    /** Refuses the operation with `message`; the surrounding transaction rolls back. */
    public static Refuse(message: string): never {
        throw new RemoteOperationError(OPERATION_REFUSED, message);
    }

    /** Saves `entity` and refuses the operation with the save's complete message when it fails. */
    public static async Save(entity: BaseEntity): Promise<void> {
        if (!(await entity.Save())) {
            OperationSupport.Refuse(entity.LatestResult?.CompleteMessage || `The ${entity.EntityInfo?.Name ?? 'record'} was not saved.`);
        }
    }

    /** A new entity object of `entityName`, acting as `user` on `provider`. */
    public static async NewRecord<T extends BaseEntity>(provider: IMetadataProvider, entityName: string, user: UserInfo): Promise<T> {
        const entity = await provider.GetEntityObject<T>(entityName, user);
        entity.NewRecord();
        return entity;
    }
}
