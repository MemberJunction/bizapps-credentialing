import type { UserInfo } from '@memberjunction/core';
import { UserCache } from '@memberjunction/generic-database-provider';

/**
 * The server's system user, for the few steps of this app that act as it. There are three, each listed
 * with its reason in `docs/isolation-read-paths.md` ("System-user work"):
 *
 * - `Credentialing.CreateOrganization` writes platform rows the calling admin has no permission on;
 * - deleting an accrediting organization reads whether the organization still has a program, because the
 *   only role that may delete one (`Credentialing Admin`) has no permission on programs;
 * - `Credentialing.CreateCommittee` writes one BizApps Committees committee for the organization of a
 *   program the calling staff member can read, because staff must not be able to write that entity
 *   freely; the operation fixes the owning organization itself.
 *
 * Any new use must be added to that list.
 */
export class SystemUser {
    /**
     * The system user from the server's user cache. Throws when the cache does not hold it; `purpose`
     * names the step that needed it, as the start of that error's sentence.
     */
    public static Get(purpose: string): UserInfo {
        const system = UserCache.Instance.GetSystemUser();
        if (system == null) {
            throw new Error(`${purpose} needs the system user, and the server user cache does not hold it.`);
        }
        return system;
    }
}
