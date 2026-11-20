import { beforeEach, describe, expect, it, vi } from 'vitest';

const logged: string[] = [];

vi.mock('@memberjunction/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@memberjunction/core')>();
    return { ...actual, LogError: (message: string) => logged.push(message) };
});

const { LOAD_FAILED_MESSAGE, SAVE_FAILED_MESSAGE, StudioMessages } = await import('../studio-messages');

const STALE = 'This record was changed by someone else. Reload it and try again.';

/** The two messages a user saw during the regression run, as the screens received them. */
const CHECK_CONSTRAINT_MESSAGE =
    'Error executing SQL Error: The UPDATE statement conflicted with the CHECK constraint "CK_ProgramVersion_PassiveApprovalWindowDays". ' +
    'The conflict occurred in database "example", table "__mj_BizAppsCredentialing.ProgramVersion", column \'PassiveApprovalWindowDays\'. ' +
    'Query: DECLARE @ID UNIQUEIDENTIFIER; EXEC [__mj_BizAppsCredentialing].[spUpdateProgramVersion] @ID = @ID';
const CONVERSION_MESSAGE =
    'Error executing SQL Error: Conversion failed when converting from a character string to uniqueidentifier. ' +
    "Query: SELECT TOP 1 * FROM [__mj_BizAppsCredentialing].[vwPrograms] WHERE ID = 'not-a-uuid'";
const CONCURRENCY_MESSAGE =
    'Concurrent modification conflict on MJ_BizApps_Credentialing: Standards for field(s): Statement. Reload the record and retry your changes.';

describe('StudioMessages.ForUser', () => {
    beforeEach(() => {
        logged.length = 0;
    });

    it('passes a product sentence through unchanged and logs nothing', () => {
        const sentences = [
            'Standard code 1.1 is already used in this version.',
            'Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.',
            'Passive approval window must be at least 1 day.',
            "Enter the standard's statement.",
            'Record not found.',
            STALE,
        ];
        for (const sentence of sentences) {
            expect(StudioMessages.ForUser(sentence)).toBe(sentence);
            expect(StudioMessages.ForUser(sentence, 'load')).toBe(sentence);
        }
        expect(logged).toEqual([]);
    });

    it('replaces the CHECK constraint failure a user saw with the plain save sentence, and logs the original once', () => {
        expect(StudioMessages.ForUser(CHECK_CONSTRAINT_MESSAGE)).toBe('This change could not be saved. Try again; if it keeps happening, tell your administrator.');
        expect(logged).toEqual([CHECK_CONSTRAINT_MESSAGE]);
    });

    it('replaces the conversion failure a user saw with the plain load sentence, and logs the original once', () => {
        expect(StudioMessages.ForUser(CONVERSION_MESSAGE, 'load')).toBe('This could not be loaded. Try again; if it keeps happening, tell your administrator.');
        expect(logged).toEqual([CONVERSION_MESSAGE]);
    });

    it('never shows any fragment of database output, however it is wrapped', () => {
        const raw = [
            'The standard was not saved: its rules could not be checked (Error executing SQL Error: Invalid column name).',
            'Violation of UNIQUE KEY constraint "UQ_Program_Name". Cannot insert duplicate key in object.',
            'Cannot insert duplicate key row in object',
            'The INSERT statement conflicted with the FOREIGN KEY',
            'failed. Query: SELECT 1',
            'DECLARE @p0 INT',
            'Conversion failed when converting date',
        ];
        for (const message of raw) {
            expect(StudioMessages.ForUser(message)).toBe(SAVE_FAILED_MESSAGE);
            expect(StudioMessages.ForUser(message, 'load')).toBe(LOAD_FAILED_MESSAGE);
        }
        expect(logged).toHaveLength(raw.length * 2);
    });

    it("turns the platform's concurrency refusal into the product sentence", () => {
        expect(StudioMessages.ForUser(CONCURRENCY_MESSAGE)).toBe(STALE);
        expect(StudioMessages.ForUser(`Error: ${CONCURRENCY_MESSAGE}`)).toBe(STALE);
        expect(logged).toEqual([]);
    });

    it('reads the message of a caught error, or the thrown value as text', () => {
        expect(StudioMessages.FromError(new Error('Record not found.'))).toBe('Record not found.');
        expect(StudioMessages.FromError('Record not found.')).toBe('Record not found.');
        expect(StudioMessages.FromError(new Error(CONVERSION_MESSAGE), 'load')).toBe(LOAD_FAILED_MESSAGE);
        expect(StudioMessages.FromError(new Error(CONCURRENCY_MESSAGE))).toBe(STALE);
    });
});

describe('StudioMessages.MeansStaleView', () => {
    it('is true for the refusals that mean the version changed elsewhere', () => {
        expect(StudioMessages.MeansStaleView(STALE)).toBe(true);
        expect(StudioMessages.MeansStaleView('Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.')).toBe(true);
        expect(StudioMessages.MeansStaleView('Only a Draft version can be deleted.')).toBe(true);
        expect(StudioMessages.MeansStaleView('A version can only move from Draft to Active, or from Active to Retired.')).toBe(true);
    });

    it('is false for a refusal about what the user entered', () => {
        expect(StudioMessages.MeansStaleView('Standard code 1.1 is already used in this version.')).toBe(false);
        expect(StudioMessages.MeansStaleView('Choose the deciding committee before activating this version.')).toBe(false);
        expect(StudioMessages.MeansStaleView(SAVE_FAILED_MESSAGE)).toBe(false);
        expect(StudioMessages.MeansStaleView('')).toBe(false);
    });
});
