import type { RuleResult } from './RuleResult.js';

/**
 * Pure domain rules governing credentialing program records.
 */
export class ProgramRules {
    public static readonly ImmutableFields: readonly string[] = ['AccreditingOrganizationID'];

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
