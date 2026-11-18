import type { IMetadataProvider, UserInfo } from '@memberjunction/core';
import { NOT_FOUND_REASON, StandardAuthoringRules } from '@mj-biz-apps/credentialing-core';
import { AuthoringLock } from './AuthoringLock.js';
import { LockedWrite } from './LockedWrite.js';
import { ParentVersionLoader, type LoadedVersion } from './ParentVersionLoader.js';

/** The steps every row under a version (section, standard, document requirement) shares. */
export class VersionTree {
    /**
     * Loads the version as the caller and, when it loads, takes its authoring lock. A version the
     * caller cannot read is not locked: the write is refused as not found during validation.
     */
    public static async LockVersion(versionID: string | null, contextUser: UserInfo, provider: IMetadataProvider): Promise<LoadedVersion | null> {
        if (versionID == null) {
            return null;
        }
        const version = await ParentVersionLoader.LoadVersion(versionID, contextUser, provider);
        if (version != null) {
            await AuthoringLock.ForVersion(version.ID, provider, contextUser);
        }
        return version;
    }

    /** Why the tree of `versionID` may not be edited by the caller, or null: not found, or not a Draft. */
    public static async EditRefusal(versionID: string, contextUser: UserInfo, provider: IMetadataProvider): Promise<string | null> {
        const version = await ParentVersionLoader.LoadVersion(versionID, contextUser, provider);
        if (version == null) {
            return NOT_FOUND_REASON;
        }
        const edit = StandardAuthoringRules.CanEditTree(version.Status);
        return LockedWrite.ReasonOf(edit);
    }
}
