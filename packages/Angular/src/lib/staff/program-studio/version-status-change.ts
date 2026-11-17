/**
 * Activating or retiring a version changes and saves its `Status` and nothing else.
 *
 * The version entity the page holds is shared with the Settings tab, which edits it in place, so it
 * may carry unsaved settings. A status change therefore never saves that object: it loads the version
 * again and saves only `Status` on the fresh copy. Pending settings edits are neither written nor
 * reported; the page's reload after a successful change puts the stored version back in the Settings
 * tab. Pure: the caller supplies the load.
 */
import { NOT_FOUND_REASON, VersionLifecycleRules, type VersionStatus } from '@mj-biz-apps/credentialing-core';

/** What a status change needs of a freshly loaded version. */
export interface StatusWritable {
    Status: VersionStatus;
    Save(): Promise<boolean>;
    LatestResult: { CompleteMessage: string } | null;
}

export class VersionStatusChange {
    /**
     * Loads the version afresh, sets `status` on it and saves it. Returns null when the save was
     * made, otherwise the refusal: not found when it no longer loads, the transition rule's sentence
     * when the stored status no longer allows the move, or the server's refusal of the save.
     */
    public static async Apply(loadFresh: () => Promise<StatusWritable | null>, status: VersionStatus): Promise<string | null> {
        const fresh = await loadFresh();
        if (fresh == null) {
            return NOT_FOUND_REASON;
        }
        const transition = VersionLifecycleRules.CanTransition(fresh.Status, status);
        if (!transition.Allowed) {
            return transition.Reason;
        }
        fresh.Status = status;
        if (await fresh.Save()) {
            return null;
        }
        return fresh.LatestResult?.CompleteMessage || 'The version was not saved.';
    }
}
