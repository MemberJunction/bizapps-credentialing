/**
 * Pure view-model logic for the Applicant `My Applications` screen and subject picker.
 *
 * Separates URL/context resolution, empty-state copy, progress formatting, and action-label choice
 * from Angular templates so every rule is unit-tested without a DOM.
 */
import { UUIDsEqual } from '@memberjunction/global';
import type { ApplicationStatus, MyApplication, MySubject } from '@mj-biz-apps/credentialing-core';
import { SUBJECT_ID_PARAM, SUBJECT_NOT_AVAILABLE_MESSAGE, SubjectContext } from '../../shared/subject-context.service';

export const NO_SUBJECT_MESSAGE = "Your account is not linked to an applicant record. Ask the program's staff to invite you.";
export const NO_APPLICATIONS_MESSAGE = 'You have no applications yet.';
export const PICKER_HEADING = 'Choose who you are working for';
export const APPLICANT_NOT_AVAILABLE_MESSAGE = SUBJECT_NOT_AVAILABLE_MESSAGE;

/** Discriminated state of the My Applications view once subjects have loaded. */
export type ApplicantViewResolution =
    | { Kind: 'NotAvailable' }
    | { Kind: 'NoSubjects' }
    | { Kind: 'PickSubject'; Subjects: readonly MySubject[] }
    | { Kind: 'Applications'; Subject: MySubject; NeedsUrlSync: boolean; CanSwitch: boolean };

/**
 * Resolves which state the Applicant area shows given URL `params`, the caller's `subjects`, and
 * any previously chosen `contextSubjectID` from {@link SubjectContext}.
 */
export function ResolveApplicantView(
    params: Readonly<Record<string, string | undefined>>,
    subjects: readonly MySubject[],
    contextSubjectID: string | null,
): ApplicantViewResolution {
    if (SubjectContext.HasDeniedSubject(params, subjects)) {
        return { Kind: 'NotAvailable' };
    }
    if (subjects.length === 0) {
        return { Kind: 'NoSubjects' };
    }

    const urlRaw = (params[SUBJECT_ID_PARAM] ?? '').trim();
    const fromUrl = SubjectContext.FromUrl(params, subjects);
    if (fromUrl != null) {
        const subject = subjects.find((s) => UUIDsEqual(s.SubjectID, fromUrl))!;
        const needsUrlSync = urlRaw.length === 0 || !UUIDsEqual(urlRaw, subject.SubjectID);
        return {
            Kind: 'Applications',
            Subject: subject,
            NeedsUrlSync: needsUrlSync,
            CanSwitch: subjects.length > 1,
        };
    }

    if (contextSubjectID != null) {
        const fromContext = subjects.find((s) => UUIDsEqual(s.SubjectID, contextSubjectID));
        if (fromContext != null) {
            return {
                Kind: 'Applications',
                Subject: fromContext,
                NeedsUrlSync: true,
                CanSwitch: subjects.length > 1,
            };
        }
    }

    return { Kind: 'PickSubject', Subjects: subjects };
}

/** Button label for one application row: `Continue` while Draft, `View` once submitted or closed. */
export function FormatApplicationAction(status: ApplicationStatus): 'Continue' | 'View' {
    return status === 'Draft' ? 'Continue' : 'View';
}

/** Progress line for one application row. */
export function FormatApplicationProgress(app: Pick<MyApplication, 'ConfirmedCount' | 'StandardCount'>): string {
    return `${app.ConfirmedCount} of ${app.StandardCount} confirmed`;
}
