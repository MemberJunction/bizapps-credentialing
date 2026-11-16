/**
 * Result of evaluating a pure domain rule.
 */
export type RuleResult = { Allowed: true } | { Allowed: false; Reason: string };

/**
 * Shared refusal reason used when a referenced record does not exist or is not visible to the caller.
 */
export const NOT_FOUND_REASON = 'Record not found.';
