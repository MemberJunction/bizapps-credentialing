import type { IMetadataProvider, UserInfo } from '@memberjunction/core';
import { SQLServerDataProvider } from '@memberjunction/sqlserver-dataprovider';

/** Milliseconds a writer waits for another writer's lock before its write fails. */
const LOCK_TIMEOUT_MS = 15000;

/**
 * Transaction-owned SQL Server application locks that serialize authoring writes.
 *
 * A rule checked in validation ("only one Draft", "codes are unique", "a version is activated only
 * with standards in every section") is only true at write time if no other request can change the
 * rows it read in between. Every write able to break one of those rules takes the same lock first, so
 * the check and the write that follows it run as one step:
 *
 * - `cred-program:<id>` — taken by every `ProgramVersion` write, before the version lock.
 * - `cred-version:<id>` — taken by writes of an existing `ProgramVersion`, and by every `Section`,
 *   `Standard` and `DocumentRequirement` write. Those never take the program lock, so the order is
 *   always program → version and two writers cannot deadlock.
 *
 * The lock is `@LockOwner = 'Transaction'`: SQL Server releases it when the surrounding transaction
 * commits or rolls back, so there is no unlock call. It must be taken inside
 * `RunInEntityTransaction`. Outside a transaction `sp_getapplock` raises an error, which is not
 * caught here. Within one transaction a second request for the same resource is granted at once
 * (the owner already holds it), which is what lets a version delete's cascade delete its children.
 *
 * Why a statement issued here runs on the caller's transaction (MJ v6.2.2, verified from source):
 * - `RunInEntityTransaction` calls `provider.BeginEntityTransaction()` in its synchronous prefix
 *   (mj/packages/MJCore/src/generic/entityTransactionScope.ts:130-145), which calls
 *   `BeginTransaction()` (mj/packages/MJCore/src/generic/databaseProviderBase.ts:393-399).
 * - `GenericDatabaseProvider.BeginTransaction()` claims transaction membership for the calling async
 *   scope before its first await (mj/packages/GenericDatabaseProvider/src/GenericDatabaseProvider.ts:9177-9180,
 *   `TransactionAffinity.Claim`, mj/packages/GenericDatabaseProvider/src/TransactionAffinity.ts:64),
 *   and binds it once the physical BEGIN succeeds (GenericDatabaseProvider.ts:9255).
 * - `SQLServerDataProvider.ExecuteSQL()` → `_internalExecuteSQL()` routes the statement to the open
 *   transaction handle when `IsCallerInAmbientTransaction()` is true for the caller
 *   (mj/packages/SQLServerDataProvider/src/SQLServerDataProvider.ts:2700-2705), so the lock is taken
 *   on the transaction's connection, by the transaction.
 * - Parameters passed as an object bind as named inputs, `request.input(key, value)`
 *   (SQLServerDataProvider.ts:202-205): the resource name is `@LockResource`, never concatenated.
 *
 * The lock holds only across writers on separate provider instances (MJAPI gives each request its
 * own). Two units of work on ONE instance join one transaction, where the lock is re-entrant.
 */
export class AuthoringLock {
    /** Takes the exclusive authoring lock of a program for the rest of the caller's transaction. */
    public static async ForProgram(programID: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        await AuthoringLock.acquire(`cred-program:${programID.trim().toLowerCase()}`, provider, contextUser);
    }

    /** Takes the exclusive authoring lock of a version for the rest of the caller's transaction. */
    public static async ForVersion(versionID: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        await AuthoringLock.acquire(`cred-version:${versionID.trim().toLowerCase()}`, provider, contextUser);
    }

    private static async acquire(resource: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        if (!(provider instanceof SQLServerDataProvider)) {
            throw new Error(`The authoring lock ${resource} needs the SQL Server provider; this write is not running on the server.`);
        }
        // Resource names are compared byte for byte, so callers pass IDs lower-cased.
        const rows: Array<{ Result: number }> = await provider.ExecuteSQL(
            `DECLARE @Result INT;
             EXEC @Result = sp_getapplock @Resource = @LockResource, @LockMode = 'Exclusive', @LockOwner = 'Transaction', @LockTimeout = ${LOCK_TIMEOUT_MS};
             SELECT @Result AS Result;`,
            { LockResource: resource },
            { description: `Authoring lock ${resource}` },
            contextUser,
        );
        const result = rows?.[0]?.Result;
        if (result == null || result < 0) {
            throw new Error(
                result === -1
                    ? 'Someone else is changing this program right now. Try again in a moment.'
                    : `The authoring lock ${resource} could not be taken (sp_getapplock returned ${result ?? 'nothing'}).`,
            );
        }
    }
}
