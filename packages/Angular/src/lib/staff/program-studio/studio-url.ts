/**
 * How Program Studio's open program and version map to the URL (`?programId=…&versionId=…`).
 *
 * The address bar must always name what is open. MJ Explorer (v6.2.2) restores a saved tab with its
 * own saved query params when the page is loaded from a URL that carries none (`ApplyDeepLinkToRestoredWorkspace`,
 * `explorer-core/src/lib/shell/deep-link-workspace.ts`: "a bare deep link to an open tab keeps that
 * tab's saved state"), and the shell does not write the URL during that start
 * (`ShellComponent.syncUrlWithWorkspace` returns while `urlBasedNavigation` is set). The resource then
 * receives the saved program through its inputs, so it must write the selection back itself. It does
 * so after every load that found the program: `UpdateQueryParams` updates the tab configuration,
 * whose change makes the shell rebuild the URL from it (`buildResourceUrl`).
 *
 * An ID in the URL is whatever someone typed. One that is not a UUID is treated exactly like one that
 * does not exist: such a version is dropped here, so the page falls back to one of the program's own
 * versions; such a program is kept, so the page shows its not-found state, and `StudioData.LoadProgram`
 * sends no query with it.
 */
import { IsValidUUID } from '@memberjunction/global';
import type { StudioSelection } from './program-studio.page';

/** The query parameters Program Studio keeps in the URL. */
export const PROGRAM_STUDIO_PARAMS = { Program: 'programId', Version: 'versionId' } as const;

export class StudioUrl {
    /**
     * The selection a set of query params names; blank values count as absent, and so does a version
     * that is not a UUID (no version has it, so the page shows one the program does have).
     */
    public static FromParams(params: Record<string, string>): StudioSelection {
        const versionID = params[PROGRAM_STUDIO_PARAMS.Version]?.trim() || null;
        return {
            ProgramID: params[PROGRAM_STUDIO_PARAMS.Program]?.trim() || null,
            VersionID: IsValidUUID(versionID) ? versionID : null,
        };
    }

    /** The query-param update that makes the URL name `selection` (null removes a parameter). */
    public static ToParams(selection: StudioSelection): Record<string, string | null> {
        return {
            [PROGRAM_STUDIO_PARAMS.Program]: selection.ProgramID,
            [PROGRAM_STUDIO_PARAMS.Version]: selection.ProgramID ? selection.VersionID : null,
        };
    }

    /**
     * What to publish once a program load finished: the program and the version actually shown, or
     * null when nothing was found (a program the user cannot read keeps the URL it was opened with,
     * so the not-found state and the address bar agree).
     */
    public static SelectionAfterLoad(found: boolean, programID: string | null, shownVersionID: string | null): StudioSelection | null {
        if (!found || programID == null) {
            return null;
        }
        return { ProgramID: programID, VersionID: shownVersionID };
    }
}
