import type { IMetadataProvider, UserInfo } from '@memberjunction/core';
import { SQLServerDataProvider } from '@memberjunction/sqlserver-dataprovider';

/**
 * Milliseconds a writer waits for another writer's lock before its write fails with the lock's
 * sentence. It must expire before the database driver gives up on the statement, or the caller gets
 * the driver's timeout text instead of the sentence: mssql's default request timeout is 15 000 ms
 * (`node_modules/mssql/lib/tedious/connection-pool.js`, used by any pool that sets none, such as the
 * `mj test` harness's), MJAPI's is 30 000 ms (`mj/packages/MJServer/src/config.ts`,
 * `databaseSettings.requestTimeout`). Measured: with a 15 000 ms wait, a waiter on the test harness
 * pool failed with `Timeout: Request failed to complete in 15000ms` (`cred-subject-isolation.9`).
 */
export const LOCK_TIMEOUT_MS = 14000;

/** What a writer is told when an authoring lock (organization, program, version) was not free within the wait. */
export const AUTHORING_LOCK_BUSY_REASON = 'Someone else is changing this program right now. Try again in a moment.';

/** What an inviter is told when another invitation of the same email held its lock past the wait. */
export const USER_EMAIL_LOCK_BUSY_REASON = 'Someone else is inviting this person right now. Try again in a moment.';

/**
 * What a subject contact or staff member is told when another change to the same subject, application
 * or document held its lock past the wait. It names no program: an applicant reads it.
 */
export const APPLICATION_LOCK_BUSY_REASON = 'This application is being updated right now. Try again in a moment.';

/**
 * Transaction-owned SQL Server application locks that serialize authoring writes and writes of a
 * subject's application data.
 *
 * A rule checked in validation ("only one Draft", "codes are unique", "a version is activated only
 * with standards in every section") is only true at write time if no other request can change the
 * rows it read in between. Every write able to break one of those rules takes the same lock first, so
 * the check and the write that follows it run as one step:
 *
 * - `cred-user-email:<normalized email>` — taken by an invitation before it finds or creates the user
 *   of that email, so two organizations inviting one new person at once create one user.
 * - `cred-accrediting-organization:<id>` — taken by a `Program` create, by a `Program` update that
 *   changes `Name` or `CredentialPrefix`, so the names and prefixes unique within an organization are
 *   checked and written as one step, by an `AccreditingOrganization` delete, so its "no programs"
 *   check and the delete are one step against a program being created, and by
 *   `Credentialing.CreateCommittee`, so its "no committee of this name in the organization" check and
 *   the committee insert are one step.
 * - `cred-program:<id>` — taken by every `ProgramVersion` write, before the version lock.
 * - `cred-version:<id>` — taken by writes of an existing `ProgramVersion`, by every `Section`,
 *   `Standard`, `DocumentRequirement` and `ResponseSource` write.
 * - `cred-subject:<id>`, `cred-application:<id>`, `cred-document:<id>` — taken by the operations that
 *   write a subject's application data (Tasks 4–11), so a decision made from rows re-read under the
 *   lock still holds when the rows are written.
 *
 * Lock order is always user email → organization → program → version → subject → application →
 * document, so two writers cannot deadlock. Confirmed from every writer in this package: `Program`
 * saves take only the organization lock; an
 * `AccreditingOrganization` delete takes only the organization lock, first, and deletes nothing but
 * its own row (it refuses while programs or members exist, so it cascades into no child); `ProgramVersion`
 * saves take program then version; `Section`, `Standard`, `DocumentRequirement` and `ResponseSource`
 * writes take only the version lock; no writer takes a program or version lock and then saves a
 * `Program` or deletes an `AccreditingOrganization`. The applicant-data entity subclasses take no lock
 * themselves (their writes happen only inside an operation, which takes its locks in the order above).
 * `Credentialing.CreateProgram` saves the program (organization lock) and then its first version
 * (program lock, and no version lock for a new version) in one transaction: organization → program.
 * `CloneVersionToDraft` and `ReorderVersionTree` save no `Program`, so they never take the
 * organization lock. `CreateCommittee` takes only the organization lock, first (it reads the program
 * before it, which takes no lock), and then saves one BizApps Committees row, which takes none of
 * these locks: organization, and nothing after it. `CreateOrganization`'s `cred-org:<name>` lock is a
 * separate resource held by a body that writes no program, version or tree row.
 *
 * Each lock family has its own sentence when its wait expires: an applicant must never read a
 * sentence about changing a program.
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
 * own; background work takes one per unit through `CredentialingServices.InBackground`). Two units of
 * work on ONE instance join one transaction, where the lock is re-entrant.
 */
export class AuthoringLock {
    /**
     * Takes the exclusive authoring lock of an accrediting organization for the rest of the caller's
     * transaction — first in the lock order, before any program or version lock.
     */
    public static async ForOrganization(accreditingOrganizationID: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        await AuthoringLock.acquire(`cred-accrediting-organization:${AuthoringLock.key(accreditingOrganizationID)}`, AUTHORING_LOCK_BUSY_REASON, provider, contextUser);
    }

    /** Takes the exclusive authoring lock of a program for the rest of the caller's transaction. */
    public static async ForProgram(programID: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        await AuthoringLock.acquire(`cred-program:${AuthoringLock.key(programID)}`, AUTHORING_LOCK_BUSY_REASON, provider, contextUser);
    }

    /** Takes the exclusive authoring lock of a version for the rest of the caller's transaction. */
    public static async ForVersion(versionID: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        await AuthoringLock.acquire(`cred-version:${AuthoringLock.key(versionID)}`, AUTHORING_LOCK_BUSY_REASON, provider, contextUser);
    }

    /**
     * Takes the exclusive setup lock of an accrediting organization's name (`cred-org:<name>`) for the
     * rest of the caller's transaction, so two simultaneous setups of the same organization run one
     * after the other and the second finds the rows the first created. `normalizedName` is the name
     * as organization setup normalizes it (trimmed, inner whitespace collapsed); it is lower-cased
     * here because names compare ignoring case.
     */
    public static async ForOrganizationName(normalizedName: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        await AuthoringLock.acquire(`cred-org:${AuthoringLock.key(normalizedName)}`, AUTHORING_LOCK_BUSY_REASON, provider, contextUser);
    }

    /**
     * Takes the lock of one email address (`cred-user-email:<email>`) for the rest of the caller's
     * transaction — first in the lock order. `normalizedEmail` is the address as invitations normalize
     * it; it is lower-cased here because addresses compare ignoring case.
     */
    public static async ForUserEmail(normalizedEmail: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        await AuthoringLock.acquire(`cred-user-email:${AuthoringLock.key(normalizedEmail)}`, USER_EMAIL_LOCK_BUSY_REASON, provider, contextUser);
    }

    /** Takes the lock of a subject for the rest of the caller's transaction — after any version lock. */
    public static async ForSubject(subjectID: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        await AuthoringLock.acquire(`cred-subject:${AuthoringLock.key(subjectID)}`, APPLICATION_LOCK_BUSY_REASON, provider, contextUser);
    }

    /** Takes the lock of an application for the rest of the caller's transaction — after its subject's lock. */
    public static async ForApplication(applicationID: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        await AuthoringLock.acquire(`cred-application:${AuthoringLock.key(applicationID)}`, APPLICATION_LOCK_BUSY_REASON, provider, contextUser);
    }

    /** Takes the lock of an evidence document for the rest of the caller's transaction — last in the lock order. */
    public static async ForDocument(documentID: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        await AuthoringLock.acquire(`cred-document:${AuthoringLock.key(documentID)}`, APPLICATION_LOCK_BUSY_REASON, provider, contextUser);
    }

    /** Resource names are compared byte for byte, so every key is trimmed and lower-cased. */
    private static key(value: string): string {
        return value.trim().toLowerCase();
    }

    /**
     * Takes `resource` exclusively for the caller's transaction, waiting at most {@link LOCK_TIMEOUT_MS}.
     * A wait that expires throws `busySentence`; any other failure throws a sentence naming the resource.
     */
    private static async acquire(resource: string, busySentence: string, provider: IMetadataProvider, contextUser: UserInfo): Promise<void> {
        if (!(provider instanceof SQLServerDataProvider)) {
            throw new Error(`The authoring lock ${resource} needs the SQL Server provider; this write is not running on the server.`);
        }
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
                result === -1 ? busySentence : `The authoring lock ${resource} could not be taken (sp_getapplock returned ${result ?? 'nothing'}).`,
            );
        }
    }
}
