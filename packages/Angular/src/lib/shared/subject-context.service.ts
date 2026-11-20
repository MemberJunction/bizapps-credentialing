/**
 * Tracks the applicant's active subject across every Applicant-area screen (FRD FR-3.4), carrying
 * it as `subjectId` on the URL so reload and deep links stay on the chosen subject.
 */
import { Injectable, signal, type Signal } from '@angular/core';
import { UUIDsEqual } from '@memberjunction/global';

/** Query parameter name carrying the active subject on every Applicant-area URL. */
export const SUBJECT_ID_PARAM = 'subjectId';

/** Sentence shown when a deep link names a subject the caller holds no contact row on. */
export const SUBJECT_NOT_AVAILABLE_MESSAGE = 'This area is not available to your account.';

/** Any subject item carrying an ID for URL resolution. */
export interface SubjectIdentity {
    SubjectID: string;
}

@Injectable({ providedIn: 'root' })
export class SubjectContext {
    private readonly _subjectID = signal<string | null>(null);

    /** Currently selected subject ID, or null when unchosen. */
    public readonly SubjectID: Signal<string | null> = this._subjectID.asReadonly();

    /** Selects `subjectID` as the active subject for the Applicant area. */
    public Choose(subjectID: string): void {
        const trimmed = (subjectID ?? '').trim();
        this._subjectID.set(trimmed.length > 0 ? trimmed : null);
    }

    /** Clears the active subject selection so a multi-subject user returns to the picker. */
    public Clear(): void {
        this._subjectID.set(null);
    }

    /**
     * Resolves the subject ID from URL `params` against `subjects` the caller acts for:
     * - When `subjectId` is present and matches a subject in `subjects`, returns that subject's ID.
     * - When `subjectId` is present and matches none, returns `null` (caller shows not-available).
     * - When `subjectId` is absent and `subjects` has exactly one item, selects it automatically.
     * - When `subjectId` is absent and `subjects` has 0 or >1 items, returns `null` (picker or empty).
     */
    public static FromUrl(
        params: Readonly<Record<string, string | undefined>>,
        subjects: readonly SubjectIdentity[],
    ): string | null {
        const raw = (params[SUBJECT_ID_PARAM] ?? '').trim();
        if (raw.length > 0) {
            return subjects.find((s) => UUIDsEqual(s.SubjectID, raw))?.SubjectID ?? null;
        }
        return subjects.length === 1 ? subjects[0].SubjectID : null;
    }

    /**
     * Whether URL `params` explicitly carry a `subjectId` that matches none of `subjects`.
     * Distinguishes a denied deep link from an unchosen multi-subject session.
     */
    public static HasDeniedSubject(
        params: Readonly<Record<string, string | undefined>>,
        subjects: readonly SubjectIdentity[],
    ): boolean {
        const raw = (params[SUBJECT_ID_PARAM] ?? '').trim();
        return raw.length > 0 && !subjects.some((s) => UUIDsEqual(s.SubjectID, raw));
    }
}
