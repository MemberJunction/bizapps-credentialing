import { RemoteOperationError, type BaseEntity, type EntitySaveOptions, type IMetadataProvider } from '@memberjunction/core';
import { OPERATION_REFUSED } from '@mj-biz-apps/credentialing-core';
import { OperationSupport } from '../operations/OperationSupport.js';

/**
 * What every caller is told when it saves or deletes a row of a subject's application data outside
 * one of the application's own operations (a generated GraphQL mutation, a stray entity save).
 */
export const OPERATION_ONLY_REASON = 'This record is changed only through the application\'s own actions.';

/**
 * The entity objects an operation is saving or deleting right now. Module-private: nothing outside
 * this module can add to it, and nothing a request sends reaches it. A `WeakSet` holds no entity
 * alive after its operation lets go of it.
 */
const marked = new WeakMap<BaseEntity, Scope>();

/** The two writes an operation makes through {@link OperationWrite.Run}. */
export interface OperationWriteScope {
    /** Saves `entity` as an operation write; throws the entity's refusal as a `REFUSED` operation error. */
    Save(entity: BaseEntity, options?: EntitySaveOptions): Promise<void>;
    /** Deletes `entity` as an operation write; throws the entity's refusal as a `REFUSED` operation error. */
    Delete(entity: BaseEntity): Promise<void>;
    /**
     * Records a parent row's `SubjectID` already read inside this locked operation's transaction so
     * bulk child inserts in the same operation do not re-query the parent row one by one.
     */
    CacheParentSubject(parentEntityName: string, parentID: string, subjectID: string): void;
}

/** The scope one {@link OperationWrite.Run} hands its work; it stops writing once the run has settled. */
class Scope implements OperationWriteScope {
    private open = true;
    private readonly parentSubjects = new Map<string, string>();

    public Close(): void {
        this.open = false;
        this.parentSubjects.clear();
    }

    public CacheParentSubject(parentEntityName: string, parentID: string, subjectID: string): void {
        if (!this.open) {
            return;
        }
        this.parentSubjects.set(`${parentEntityName}:${parentID.toLowerCase()}`, subjectID);
    }

    public KnownParentSubject(parentEntityName: string, parentID: string): string | null {
        return this.parentSubjects.get(`${parentEntityName}:${parentID.toLowerCase()}`) ?? null;
    }

    public async Save(entity: BaseEntity, options?: EntitySaveOptions): Promise<void> {
        await this.write(entity, () => entity.Save(options), 'saved');
    }

    public async Delete(entity: BaseEntity): Promise<void> {
        await this.write(entity, () => entity.Delete(), 'deleted');
    }

    /** Marks the entity for the length of one write, so its subclass admits exactly that write. */
    private async write(entity: BaseEntity, run: () => Promise<boolean>, done: string): Promise<void> {
        if (!this.open) {
            throw new Error('An operation write was attempted after its operation had finished.');
        }
        marked.set(entity, this);
        let succeeded: boolean;
        try {
            succeeded = await run();
        } finally {
            marked.delete(entity);
        }
        if (!succeeded) {
            throw new RemoteOperationError(
                OPERATION_REFUSED,
                entity.LatestResult?.CompleteMessage || `The ${entity.EntityInfo?.Name ?? 'record'} was not ${done}.`,
            );
        }
    }
}

/**
 * The only door to a subject's application data (the nine applicant-data entities: subjects, their
 * contacts, applications, responses, citations, documents, attestations, frozen document links and
 * extractions). Their server subclasses refuse every save and delete that {@link IsAllowed} does not
 * admit, for every caller — staff and the system user included — so the generated create, update and
 * delete mutations are not a write path; field rules (who may confirm, what freezes) are proved once,
 * in the operation.
 *
 * An operation runs its whole unit of work in {@link Run}: one transaction on `provider`
 * (`OperationSupport.InTransaction`), with every write made through the scope. Entities must be
 * created on that same `provider` (for MJAPI, the request's own provider), so their statements join
 * the transaction. Writes save as the entity's own user, so the change history names the person who
 * acted, and the platform's permissions and row filters still apply to each write.
 */
export class OperationWrite {
    /** Runs `work` in one transaction on `provider`; it commits when `work` returns and rolls back when it throws. */
    public static async Run<T>(provider: IMetadataProvider, work: (scope: OperationWriteScope) => Promise<T>): Promise<T> {
        const scope = new Scope();
        try {
            return await OperationSupport.InTransaction(provider, () => work(scope));
        } finally {
            scope.Close();
        }
    }

    /** Whether `entity` is being saved or deleted by an operation's scope at this moment. */
    public static IsAllowed(entity: BaseEntity): boolean {
        return marked.has(entity);
    }

    /** Returns a parent row's `SubjectID` already verified by the active operation's scope, if present. */
    public static KnownParentSubject(entity: BaseEntity, parentEntityName: string, parentID: string | null): string | null {
        if (parentID == null) {
            return null;
        }
        return marked.get(entity)?.KnownParentSubject(parentEntityName, parentID) ?? null;
    }
}
