/**
 * The one place a refusal or failure becomes the text an Applicant-area screen shows.
 *
 * Every server message passes through {@link ApplicantMessages.ForUser}: product sentences pass
 * unchanged, platform concurrency conflicts become the product's stale-record sentence, and any
 * raw database or SQL output is replaced with a plain sentence and logged once.
 */
import { LogError } from '@memberjunction/core';
import { STALE_RECORD_REASON } from '@mj-biz-apps/credentialing-core';

/** What was happening when the error arose. */
export type ApplicantMessageKind = 'save' | 'load';

/** Plain sentence shown instead of raw database output on a failed applicant save. */
export const APPLICANT_SAVE_FAILED_MESSAGE = 'This change could not be saved. Try again; if it keeps happening, tell the program\'s staff.';

/** Plain sentence shown instead of raw database output on a failed applicant load. */
export const APPLICANT_LOAD_FAILED_MESSAGE = 'This could not be loaded. Try again; if it keeps happening, tell the program\'s staff.';

const RAW_OUTPUT_MARKERS: readonly string[] = [
    'error executing sql',
    'constraint',
    'query:',
    'declare @',
    'conflicted with',
    'duplicate key',
    'conversion failed',
    'invalid object name',
    'invalid column name',
];

const CONCURRENT_CHANGE_MARKER = 'concurrent modification conflict';

export class ApplicantMessages {
    /**
     * Converts `message` into safe applicant-facing text: product sentences pass unchanged,
     * concurrent modification conflicts become {@link STALE_RECORD_REASON}, and raw SQL/database
     * output is logged once and replaced by a plain sentence.
     */
    public static ForUser(message: string, kind: ApplicantMessageKind = 'load'): string {
        const lowered = message.toLowerCase();
        if (lowered.includes(CONCURRENT_CHANGE_MARKER)) {
            return STALE_RECORD_REASON;
        }
        if (RAW_OUTPUT_MARKERS.some((marker) => lowered.includes(marker))) {
            LogError(message);
            return kind === 'save' ? APPLICANT_SAVE_FAILED_MESSAGE : APPLICANT_LOAD_FAILED_MESSAGE;
        }
        return message;
    }

    /** {@link ForUser} for a caught error or thrown value. */
    public static FromError(error: unknown, kind: ApplicantMessageKind = 'load'): string {
        return ApplicantMessages.ForUser(error instanceof Error ? error.message : String(error), kind);
    }
}
