/**
 * Pure wizard state, step validation, and invitation outcome formatting for Invite Applicant.
 */
import { UUIDsEqual } from '@memberjunction/global';
import {
    INVITATION_FAILED_NOTE,
    InvitationRules,
    type InviteApplicantInput,
    type InviteApplicantOutput,
} from '@mj-biz-apps/credentialing-core';
import type { PipelineActiveTarget, PipelineSubjectOption } from './pipeline-data';

export type InviteWizardStep = 'Version' | 'Subject' | 'Contact' | 'Review' | 'Result';
export type InviteSubjectMode = 'existing' | 'new';

/** Formatted result copy shown after InviteApplicant or ReissueInvitation completes. */
export interface FormattedInvitationOutcome {
    PrimaryMessage: string;
    InvitationUrl: string | null;
    Note: string | null;
}

const EXPIRES_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

function formatExpiry(expiresAt: string | null): string {
    if (expiresAt == null || expiresAt.trim().length === 0) {
        return 'its expiration date';
    }
    const parsed = new Date(expiresAt);
    if (Number.isNaN(parsed.getTime())) {
        return expiresAt;
    }
    return EXPIRES_DATE_FORMAT.format(parsed);
}

/** Formats the staff-facing outcome message for an issued or deferred invitation. */
export function FormatInvitationOutcome(
    contactEmail: string,
    outcome: Pick<InviteApplicantOutput, 'EmailSent' | 'InvitationUrl' | 'ExpiresAt' | 'InvitationNote'>,
): FormattedInvitationOutcome {
    const email = contactEmail.trim().toLowerCase();
    if (outcome.EmailSent) {
        return {
            PrimaryMessage: `Invitation emailed to ${email}.`,
            InvitationUrl: outcome.InvitationUrl,
            Note: outcome.InvitationNote,
        };
    }
    if (outcome.InvitationUrl != null && outcome.InvitationUrl.trim().length > 0) {
        return {
            PrimaryMessage: `No email was sent from this server. Copy this link and send it to ${email}. It works once and expires on ${formatExpiry(outcome.ExpiresAt)}.`,
            InvitationUrl: outcome.InvitationUrl,
            Note: outcome.InvitationNote,
        };
    }
    return {
        PrimaryMessage: outcome.InvitationNote ?? INVITATION_FAILED_NOTE,
        InvitationUrl: null,
        Note: outcome.InvitationNote ?? INVITATION_FAILED_NOTE,
    };
}

/** Filters existing subjects to those belonging to the chosen version's organization and subject type. */
export function EligibleSubjectsForTarget(
    subjects: readonly PipelineSubjectOption[],
    target: PipelineActiveTarget | null | undefined,
): PipelineSubjectOption[] {
    if (!target) return [];
    return subjects.filter(
        (s) =>
            UUIDsEqual(s.AccreditingOrganizationID, target.AccreditingOrganizationID) &&
            s.SubjectType === target.SubjectType,
    );
}

/** Mutable model driving the Invite Applicant multi-step wizard. */
export class InviteWizardModel {
    public Step: InviteWizardStep = 'Version';
    public VersionID = '';
    public SubjectMode: InviteSubjectMode = 'new';
    public ExistingSubjectID = '';
    public NewSubjectDisplayName = '';
    public NewSubjectPrimaryEmail = '';
    public ContactEmail = '';
    public ContactFirstName = '';
    public ContactLastName = '';

    public ValidationMessage(step: InviteWizardStep = this.Step): string | null {
        switch (step) {
            case 'Version': {
                const res = InvitationRules.Validate({
                    ProgramVersionID: this.VersionID,
                    Subject: { ExistingSubjectID: 'check' },
                    Contact: { Email: 'check@example.test', FirstName: 'Check', LastName: 'Check' },
                });
                return res.Allowed ? null : res.Reason;
            }
            case 'Subject': {
                const res = InvitationRules.Validate({
                    ProgramVersionID: 'check',
                    Subject: this.rawSubjectInput(),
                    Contact: { Email: 'check@example.test', FirstName: 'Check', LastName: 'Check' },
                });
                return res.Allowed ? null : res.Reason;
            }
            case 'Contact': {
                const res = InvitationRules.Validate({
                    ProgramVersionID: 'check',
                    Subject: { ExistingSubjectID: 'check' },
                    Contact: { Email: this.ContactEmail, FirstName: this.ContactFirstName, LastName: this.ContactLastName },
                });
                return res.Allowed ? null : res.Reason;
            }
            case 'Review': {
                const res = InvitationRules.Validate(this.rawInput());
                return res.Allowed ? null : res.Reason;
            }
            case 'Result':
                return null;
        }
    }

    public StepValid(step: InviteWizardStep): boolean {
        return this.ValidationMessage(step) == null;
    }

    public CanProceed(): boolean {
        return this.StepValid(this.Step);
    }

    public BuildInput(): InviteApplicantInput {
        const validationError = this.ValidationMessage('Review');
        if (validationError != null) {
            throw new Error(validationError);
        }
        return {
            ProgramVersionID: this.VersionID.trim(),
            Subject:
                this.SubjectMode === 'existing'
                    ? { ExistingSubjectID: this.ExistingSubjectID.trim() }
                    : {
                          DisplayName: this.NewSubjectDisplayName.trim(),
                          PrimaryEmail: this.NewSubjectPrimaryEmail.trim(),
                      },
            Contact: {
                Email: this.ContactEmail.trim(),
                FirstName: this.ContactFirstName.trim(),
                LastName: this.ContactLastName.trim(),
            },
        };
    }

    private rawSubjectInput(): InviteApplicantInput['Subject'] {
        return this.SubjectMode === 'existing'
            ? { ExistingSubjectID: this.ExistingSubjectID }
            : { DisplayName: this.NewSubjectDisplayName, PrimaryEmail: this.NewSubjectPrimaryEmail };
    }

    private rawInput(): InviteApplicantInput {
        return {
            ProgramVersionID: this.VersionID,
            Subject: this.rawSubjectInput(),
            Contact: { Email: this.ContactEmail, FirstName: this.ContactFirstName, LastName: this.ContactLastName },
        };
    }
}
