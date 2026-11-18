import { beforeEach, describe, expect, it, vi } from 'vitest';

const logged: string[] = [];

vi.mock('@memberjunction/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@memberjunction/core')>();
    return { ...actual, LogError: (message: string) => logged.push(message) };
});

const {
    APPLICANT_LOAD_FAILED_MESSAGE,
    APPLICANT_SAVE_FAILED_MESSAGE,
    ApplicantMessages,
} = await import('../applicant-messages');

const STALE = 'This record was changed by someone else. Reload it and try again.';

const RAW_SQL_ERROR =
    'Error executing SQL Error: The UPDATE statement conflicted with the CHECK constraint "CK_StandardResponse_Status". ' +
    'Query: DECLARE @ID UNIQUEIDENTIFIER; EXEC [__mj_BizAppsCredentialing].[spUpdateStandardResponse] @ID = @ID';

const CONCURRENCY_ERROR =
    'Concurrent modification conflict on MJ_BizApps_Credentialing: Standard Responses for field(s): ResponseText.';

describe('ApplicantMessages', () => {
    beforeEach(() => {
        logged.length = 0;
    });

    it('passes product sentences through unchanged without logging', () => {
        const sentences = [
            'Record not found.',
            'This area is not available to your account.',
            'This application was submitted on Nov 17, 2026 (UTC). Its answers and documents are locked.',
            'Write an answer before confirming.',
            STALE,
        ];
        for (const sentence of sentences) {
            expect(ApplicantMessages.ForUser(sentence)).toBe(sentence);
            expect(ApplicantMessages.ForUser(sentence, 'save')).toBe(sentence);
        }
        expect(logged).toEqual([]);
    });

    it('replaces raw database or platform output with a plain sentence and logs the original once', () => {
        expect(ApplicantMessages.ForUser(RAW_SQL_ERROR, 'load')).toBe(APPLICANT_LOAD_FAILED_MESSAGE);
        expect(ApplicantMessages.ForUser(RAW_SQL_ERROR, 'save')).toBe(APPLICANT_SAVE_FAILED_MESSAGE);
        expect(logged).toEqual([RAW_SQL_ERROR, RAW_SQL_ERROR]);
    });

    it('replaces SQL conversion, duplicate key, and invalid object errors', () => {
        const raw = [
            'Conversion failed when converting from a character string to uniqueidentifier.',
            'Violation of UNIQUE KEY constraint "UQ_Application_OneLive". Cannot insert duplicate key in object.',
            'Invalid object name \'__mj_BizAppsCredentialing.Missing\'.',
            'failed. Query: SELECT 1',
            'DECLARE @p0 INT',
        ];
        for (const message of raw) {
            expect(ApplicantMessages.ForUser(message, 'load')).toBe(APPLICANT_LOAD_FAILED_MESSAGE);
            expect(ApplicantMessages.ForUser(message, 'save')).toBe(APPLICANT_SAVE_FAILED_MESSAGE);
        }
        expect(logged).toHaveLength(raw.length * 2);
    });

    it('converts concurrent modification conflicts to the stale-record sentence without logging', () => {
        expect(ApplicantMessages.ForUser(CONCURRENCY_ERROR, 'save')).toBe(STALE);
        expect(logged).toEqual([]);
    });

    it('formats caught errors via FromError', () => {
        expect(ApplicantMessages.FromError(new Error('Record not found.'), 'load')).toBe('Record not found.');
        expect(ApplicantMessages.FromError('Record not found.', 'load')).toBe('Record not found.');
        expect(ApplicantMessages.FromError(new Error(RAW_SQL_ERROR), 'load')).toBe(APPLICANT_LOAD_FAILED_MESSAGE);
        expect(ApplicantMessages.FromError(new Error(CONCURRENCY_ERROR), 'save')).toBe(STALE);
    });
});
