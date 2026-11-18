import { RequiredTextRule, type RuleResult } from './RuleResult.js';

/**
 * Pure domain rules governing credentialing program records.
 */
export class ProgramRules {
    public static readonly ImmutableFields: readonly string[] = ['AccreditingOrganizationID'];

    /** The text fields a program must hold; changing any of them runs {@link CheckRequiredText}. */
    public static readonly RequiredTextFields: readonly string[] = ['Name', 'CredentialPrefix', 'SubjectNoun'];

    /**
     * Validates that a program's name, credential prefix and subject noun each hold text once trimmed.
     */
    public static CheckRequiredText(input: {
        Name: string | null | undefined;
        CredentialPrefix: string | null | undefined;
        SubjectNoun: string | null | undefined;
    }): RuleResult {
        return RequiredTextRule.FirstBlank([
            { Value: input.Name, Reason: "Enter the program's name." },
            { Value: input.CredentialPrefix, Reason: 'Enter the credential prefix.' },
            { Value: input.SubjectNoun, Reason: 'Enter the subject noun.' },
        ]);
    }

    /**
     * Validates whether the given changed fields may be modified on a new or existing program.
     */
    public static CanChangeFields(isNew: boolean, changedFields: readonly string[]): RuleResult {
        if (isNew) {
            return { Allowed: true };
        }

        const ownershipChanged = changedFields.some((field) =>
            ProgramRules.ImmutableFields.includes(field)
        );

        if (ownershipChanged) {
            return {
                Allowed: false,
                Reason: 'A program cannot be moved to another organization.',
            };
        }

        return { Allowed: true };
    }
}
