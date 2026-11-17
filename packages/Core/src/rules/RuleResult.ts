/**
 * Result of evaluating a pure domain rule.
 */
export type RuleResult = { Allowed: true } | { Allowed: false; Reason: string };

/**
 * Shared refusal reason used when a referenced record does not exist or is not visible to the caller.
 */
export const NOT_FOUND_REASON = 'Record not found.';

/**
 * Shared refusal reason used when a row changed after it was loaded — by another session, or since the
 * caller's screen read it. The server gives it; the screens show it for every concurrent-change refusal.
 */
export const STALE_RECORD_REASON = 'This record was changed by someone else. Reload it and try again.';

/** A piece of required text, with the refusal given when it is blank. */
export interface RequiredText {
    Value: string | null | undefined;
    Reason: string;
}

/**
 * Required text is blank when it is missing or holds only whitespace.
 */
export class RequiredTextRule {
    /** True when `value` is null, undefined, empty or whitespace only. */
    public static IsBlank(value: string | null | undefined): boolean {
        return value == null || value.trim().length === 0;
    }

    /** Refuses with the reason of the first blank entry, in the order given. */
    public static FirstBlank(entries: readonly RequiredText[]): RuleResult {
        const blank = entries.find((entry) => RequiredTextRule.IsBlank(entry.Value));
        return blank == null ? { Allowed: true } : { Allowed: false, Reason: blank.Reason };
    }
}
