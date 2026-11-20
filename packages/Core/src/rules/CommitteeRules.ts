import { RequiredTextRule, type RuleResult } from './RuleResult.js';

/** The field of the new-committee form a refusal is about. */
export type CommitteeFormField = 'Name' | 'CommitteeTypeID';

const NAME_REQUIRED_REASON = "Enter the committee's name.";
const TYPE_REQUIRED_REASON = 'Choose a committee type.';
const DUPLICATE_NAME_START = 'A committee named ';
const DUPLICATE_NAME_END = ' already exists for this organization.';

/**
 * Pure rules for a committee created from Program Studio for a program's accrediting organization
 * (`Credentialing.CreateCommittee`). The committee itself is a BizApps Committees record; these rules
 * are only what this app requires of one it creates.
 */
export class CommitteeRules {
    /** The refusal given for a name that is empty once trimmed. */
    public static readonly NameRequiredReason: string = NAME_REQUIRED_REASON;

    /** The refusal given when no committee type, or one that does not exist, is chosen. */
    public static readonly TypeRequiredReason: string = TYPE_REQUIRED_REASON;

    /** The name as it is stored: trimmed, with every run of inner whitespace collapsed to one space. */
    public static NormalizeName(name: string | null | undefined): string {
        return (name ?? '').trim().replace(/\s+/g, ' ');
    }

    /** The refusal given when the organization already has a committee of this name. */
    public static DuplicateNameReason(name: string): string {
        return `${DUPLICATE_NAME_START}${name}${DUPLICATE_NAME_END}`;
    }

    /** Validates that the committee's name holds text once trimmed. */
    public static CheckName(name: string | null | undefined): RuleResult {
        return RequiredTextRule.FirstBlank([{ Value: name, Reason: NAME_REQUIRED_REASON }]);
    }

    /** Validates that the chosen committee type exists. */
    public static CheckType(typeExists: boolean): RuleResult {
        return typeExists ? { Allowed: true } : { Allowed: false, Reason: TYPE_REQUIRED_REASON };
    }

    /**
     * Validates that none of the organization's committees already has this name. Names are compared
     * normalized (see {@link NormalizeName}) and ignoring case.
     */
    public static CheckUnique(name: string, existingNames: readonly string[]): RuleResult {
        const wanted = CommitteeRules.comparable(name);
        const taken = existingNames.some((existing) => CommitteeRules.comparable(existing) === wanted);
        return taken ? { Allowed: false, Reason: CommitteeRules.DuplicateNameReason(CommitteeRules.NormalizeName(name)) } : { Allowed: true };
    }

    /** The form field a refusal sentence of these rules is about, or null for any other text. */
    public static FieldFor(message: string): CommitteeFormField | null {
        if (message.includes(NAME_REQUIRED_REASON) || CommitteeRules.isDuplicateName(message)) {
            return 'Name';
        }
        return message.includes(TYPE_REQUIRED_REASON) ? 'CommitteeTypeID' : null;
    }

    private static comparable(name: string): string {
        return CommitteeRules.NormalizeName(name).toLowerCase();
    }

    private static isDuplicateName(message: string): boolean {
        const start = message.indexOf(DUPLICATE_NAME_START);
        return start >= 0 && message.indexOf(DUPLICATE_NAME_END, start + DUPLICATE_NAME_START.length) >= 0;
    }
}
