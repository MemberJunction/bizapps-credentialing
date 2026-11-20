import { describe, expect, it } from 'vitest';
import { PROGRAM_STUDIO_PARAMS, StudioUrl } from '../studio-url';

const PROGRAM = 'F51696DA-8346-4E81-B17C-3781D00F8B83';
const VERSION = 'B89A630F-6753-4E66-B35F-5231C70AB233';

describe('StudioUrl', () => {
    it('names the URL parameters programId and versionId', () => {
        expect(PROGRAM_STUDIO_PARAMS).toEqual({ Program: 'programId', Version: 'versionId' });
    });

    it('reads the program and version from query params, treating blanks as absent', () => {
        expect(StudioUrl.FromParams({ programId: PROGRAM, versionId: VERSION })).toEqual({ ProgramID: PROGRAM, VersionID: VERSION });
        expect(StudioUrl.FromParams({ programId: ` ${PROGRAM} `, versionId: '  ' })).toEqual({ ProgramID: PROGRAM, VersionID: null });
        expect(StudioUrl.FromParams({})).toEqual({ ProgramID: null, VersionID: null });
    });

    it('treats a version that is not a UUID as absent, and keeps such a program so the page shows it as not found', () => {
        expect(StudioUrl.FromParams({ programId: PROGRAM, versionId: 'not-a-uuid' })).toEqual({ ProgramID: PROGRAM, VersionID: null });
        expect(StudioUrl.FromParams({ programId: PROGRAM, versionId: `${VERSION}' OR 1=1 --` })).toEqual({ ProgramID: PROGRAM, VersionID: null });
        expect(StudioUrl.FromParams({ programId: 'not-a-uuid', versionId: VERSION })).toEqual({ ProgramID: 'not-a-uuid', VersionID: VERSION });
    });

    it('writes both parameters for an open program and version', () => {
        expect(StudioUrl.ToParams({ ProgramID: PROGRAM, VersionID: VERSION })).toEqual({ programId: PROGRAM, versionId: VERSION });
    });

    it('removes the version parameter when no program is open, so the URL never names a version alone', () => {
        expect(StudioUrl.ToParams({ ProgramID: null, VersionID: VERSION })).toEqual({ programId: null, versionId: null });
    });

    it('round-trips a selection through the URL parameters', () => {
        const selection = { ProgramID: PROGRAM, VersionID: VERSION };
        const written = StudioUrl.ToParams(selection);
        const asUrl: Record<string, string> = {};
        for (const [k, v] of Object.entries(written)) {
            if (v != null) asUrl[k] = v;
        }
        expect(StudioUrl.FromParams(asUrl)).toEqual(selection);
    });

    it('publishes what was loaded — including a program that came from a restored tab rather than a click', () => {
        // The load found the program; the version shown is the one PickVersion resolved.
        expect(StudioUrl.SelectionAfterLoad(true, PROGRAM, VERSION)).toEqual({ ProgramID: PROGRAM, VersionID: VERSION });
    });

    it('publishes nothing when the program was not found, so a pasted URL stays as pasted', () => {
        expect(StudioUrl.SelectionAfterLoad(false, PROGRAM, null)).toBeNull();
    });

    it('publishes nothing when no program is open', () => {
        expect(StudioUrl.SelectionAfterLoad(true, null, null)).toBeNull();
    });
});
