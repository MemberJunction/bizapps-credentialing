import { LogError, RunView, type BaseEntity, type UserInfo } from '@memberjunction/core';
import { IsValidUUID } from '@memberjunction/global';
import { NOT_FOUND_REASON } from '@mj-biz-apps/credentialing-core';
import { LockedWrite } from './LockedWrite.js';
import { OPERATION_ONLY_REASON, OperationWrite } from './OperationWrite.js';

/** What a caller is told when the server could not finish preparing an applicant-data write. */
export const APPLICANT_ROW_NOT_SAVED_REASON = 'The record could not be saved. Try again in a moment.';

/** A row whose `SubjectID` is the only column read from it. */
interface SubjectRow {
    SubjectID: string;
}

/**
 * The steps the nine applicant-data entity subclasses share:
 *
 * 1. a save or delete that no operation's {@link OperationWrite} scope admitted is refused with
 *    {@link OPERATION_ONLY_REASON}, for every caller — staff and the system user included;
 * 2. an admitted save first sets the server-owned columns (`prepare`): the immutable columns are put
 *    back to the values the row was loaded with, and on a new row `SubjectID` is copied from its
 *    parent, read as the saving user (a parent the user cannot read refuses the save as not found);
 * 3. only then does the platform save run — validation, permissions and the row filters of the
 *    saving user, on the values that are actually written.
 *
 * Immutable columns are restored from the loaded snapshot. An immutable column can never change in
 * the database, so the value it was loaded with is its stored value; and because these rows are
 * saved only by server code inside an operation, the snapshot always comes from a server-side load,
 * never from a client.
 */
export class ApplicantRow {
    /**
     * Saves `entity` through `save` (the generated class's `Save`) when an operation admitted it and
     * `prepare` returned no refusal. Returns false with the refusal as the entity's latest result otherwise.
     */
    public static async Save(entity: BaseEntity, prepare: () => Promise<string | null>, save: () => Promise<boolean>): Promise<boolean> {
        const kind = entity.IsSaved ? 'update' : 'create';
        if (!OperationWrite.IsAllowed(entity)) {
            LockedWrite.Refuse(entity, kind, OPERATION_ONLY_REASON);
            return false;
        }
        let refusal: string | null;
        try {
            refusal = await prepare();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            LogError(`${entity.EntityInfo?.Name ?? 'entity'} ${kind}: setting its server-owned columns failed: ${message}`);
            refusal = APPLICANT_ROW_NOT_SAVED_REASON;
        }
        if (refusal != null) {
            LockedWrite.Refuse(entity, kind, refusal);
            return false;
        }
        return save();
    }

    /** Deletes `entity` through `remove` (the generated class's `Delete`) when an operation admitted it. */
    public static async Delete(entity: BaseEntity, remove: () => Promise<boolean>): Promise<boolean> {
        if (!OperationWrite.IsAllowed(entity)) {
            LockedWrite.Refuse(entity, 'delete', OPERATION_ONLY_REASON);
            return false;
        }
        return remove();
    }

    /**
     * The value `fieldName` was loaded with, for an immutable ID or text column of a saved row that has
     * been changed since; `current` for a new row (nothing is stored yet) and for an unchanged one.
     */
    public static Kept(entity: BaseEntity, fieldName: string, current: string | null): string | null {
        if (!entity.IsSaved || entity.GetFieldByName(fieldName)?.Dirty !== true) {
            return current;
        }
        return LockedWrite.LoadedString(entity, fieldName);
    }

    /**
     * The `SubjectID` of the parent row `parentID` of `parentEntityName`, read as the saving user
     * (`user`, the entity's own) on the entity's provider (so inside the operation's transaction);
     * null when that user cannot read it or it does not exist.
     */
    public static async SubjectOfParent(entity: BaseEntity, user: UserInfo, parentEntityName: string, parentID: string | null): Promise<string | null> {
        if (parentID == null || !IsValidUUID(parentID)) {
            return null;
        }
        const res = await RunView.FromMetadataProvider(LockedWrite.ProviderOf(entity)).RunView<SubjectRow>(
            { EntityName: parentEntityName, ExtraFilter: `ID = '${parentID}'`, Fields: ['SubjectID'], ResultType: 'simple', MaxRows: 1 },
            user,
        );
        if (!res.Success) {
            LogError(`Reading the subject of ${parentEntityName} ${parentID} failed: ${res.ErrorMessage}`);
            return null;
        }
        return res.Results[0]?.SubjectID ?? null;
    }

    /**
     * Sets a new row's `SubjectID` from its parent through `assign`, or returns the not-found sentence
     * when the parent is not readable by the saving user (`user`, the entity's own). A saved row keeps
     * its subject (`SubjectID` is immutable, restored by the caller).
     */
    public static async SubjectFromParent(
        entity: BaseEntity,
        user: UserInfo,
        parentEntityName: string,
        parentID: string | null,
        assign: (subjectID: string) => void,
    ): Promise<string | null> {
        if (entity.IsSaved) {
            return null;
        }
        const subjectID = await ApplicantRow.SubjectOfParent(entity, user, parentEntityName, parentID);
        if (subjectID == null) {
            return NOT_FOUND_REASON;
        }
        assign(subjectID);
        return null;
    }
}
