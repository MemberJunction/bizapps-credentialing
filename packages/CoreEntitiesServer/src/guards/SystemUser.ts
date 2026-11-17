import type { UserInfo } from '@memberjunction/core';
import { UserCache } from '@memberjunction/generic-database-provider';

/**
 * The server's system user, for the few steps of this app that act as it. Each is listed
 * with its reason in `docs/isolation-read-paths.md` ("System-user work"):
 *
 * - `Credentialing.CreateOrganization` writes platform rows the calling admin has no permission on;
 * - deleting an accrediting organization reads whether the organization still has a program, because the
 *   only role that may delete one (`Credentialing Admin`) has no permission on programs;
 * - `Credentialing.CreateCommittee` writes one BizApps Committees committee for the organization of a
 *   program the calling staff member can read, because staff must not be able to write that entity
 *   freely; the operation fixes the owning organization itself;
 * - `SubjectAccess` (guards/SubjectAccess.ts) reads, after the caller's own row filter admitted the
 *   owned row, the authoring rows an applicant holds no permission on (version, program, standard,
 *   requirement) and the contact and membership rows that decide how a user acts for a subject
 *   ("B2: applicant data" in that document);
 * - the evidence store (`StorageEvidenceStore` in `@mj-biz-apps/credentialing-server`) writes, reads
 *   and removes evidence files and their `MJ: Files` rows, because no credentialing role holds a
 *   permission on `MJ: Files` or the storage account: the app's evidence route is the only door to
 *   the bytes (plan Decision 5);
 * - the reading queue (`reading/DatabaseReadingData.ts`) claims, reads and commits documents, and the
 *   recognizer and reader run their prompts, as the system user, because background work has no caller.
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
