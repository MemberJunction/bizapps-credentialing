import { RequiredTextRule, type RuleResult } from './RuleResult.js';

/** Input payload for inviting an applicant contact onto an active program version. */
export interface InviteApplicantInput {
    ProgramVersionID: string;
    Subject: { ExistingSubjectID: string } | { DisplayName: string; PrimaryEmail: string };
    Contact: { Email: string; FirstName: string; LastName: string };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 255;

/**
 * Pure domain rules validating applicant invitation fields and email normalization.
 */
export class InvitationRules {
    /**
     * Normalizes an email address by trimming whitespace and lowercasing.
     */
    public static NormalizeEmail(email: string): string {
        return email.trim().toLowerCase();
    }

    /**
     * Validates version, subject, and contact fields on an applicant invitation.
     */
    public static Validate(input: InviteApplicantInput): RuleResult {
        if (RequiredTextRule.IsBlank(input.ProgramVersionID)) {
            return { Allowed: false, Reason: 'Choose a program version.' };
        }

        const subjectCheck = InvitationRules.validateSubject(input.Subject);
        if (!subjectCheck.Allowed) {
            return subjectCheck;
        }

        return InvitationRules.validateContact(input.Contact);
    }

    private static validateSubject(subject: InviteApplicantInput['Subject']): RuleResult {
        if ('ExistingSubjectID' in subject) {
            return RequiredTextRule.IsBlank(subject.ExistingSubjectID)
                ? { Allowed: false, Reason: 'Choose a subject.' }
                : { Allowed: true };
        }

        if (RequiredTextRule.IsBlank(subject.DisplayName)) {
            return { Allowed: false, Reason: "Enter the subject's name." };
        }
        if (RequiredTextRule.IsBlank(subject.PrimaryEmail)) {
            return { Allowed: false, Reason: "Enter the subject's email address." };
        }
        if (!InvitationRules.isValidEmail(subject.PrimaryEmail)) {
            return { Allowed: false, Reason: 'Enter a valid email address for the subject.' };
        }
        return { Allowed: true };
    }

    private static validateContact(contact: InviteApplicantInput['Contact']): RuleResult {
        if (RequiredTextRule.IsBlank(contact.Email)) {
            return { Allowed: false, Reason: "Enter the contact's email address." };
        }
        if (!InvitationRules.isValidEmail(contact.Email)) {
            return { Allowed: false, Reason: 'Enter a valid email address for the contact.' };
        }
        const namesCheck = RequiredTextRule.FirstBlank([
            { Value: contact.FirstName, Reason: "Enter the contact's first name." },
            { Value: contact.LastName, Reason: "Enter the contact's last name." },
        ]);
        return namesCheck;
    }

    private static isValidEmail(email: string): boolean {
        const normalized = InvitationRules.NormalizeEmail(email);
        return normalized.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(normalized);
    }
}
