import { BaseRemotableOperation } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import type { ApplicationStatus } from '../rules/ApplicationLifecycleRules.js';
import { CredentialingOperation } from './OperationKeys.js';

/** Empty input for `Credentialing.GetMySubjects`. */
export type GetMySubjectsInput = Record<string, never>;

/** One application summary shown on the applicant's My Applications screen. */
export interface MyApplication {
    ApplicationID: string;
    ProgramName: string;
    VersionLabel: string;
    OrganizationName: string;
    SubjectNoun: string;
    Status: ApplicationStatus;
    SubmittedAt: string | null;
    ConfirmedCount: number;
    StandardCount: number;
}

/** One subject the signed-in user acts for, with its applications. */
export interface MySubject {
    SubjectID: string;
    DisplayName: string;
    SubjectType: string;
    Applications: MyApplication[];
}

/** Result of `Credentialing.GetMySubjects`. */
export interface GetMySubjectsOutput {
    Subjects: MySubject[];
}

/**
 * Returns the subjects for which the signed-in caller holds a contact row, along with their
 * applications and response progress counts. Authoring metadata (program names, version labels,
 * organization names) is joined on the server because applicants hold no permission on those
 * entities (Decision 3).
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.GetMySubjects)
export class GetMySubjectsOperation extends BaseRemotableOperation<GetMySubjectsInput, GetMySubjectsOutput> {
    public readonly OperationKey: string = CredentialingOperation.GetMySubjects;
}
