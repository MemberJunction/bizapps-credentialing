import type { mjBizAppsCredentialingStandardEntity } from '@mj-biz-apps/credentialing-entities';
import { RequiredTextRule, type RuleResult } from './RuleResult.js';
import type { VersionStatus } from './VersionLifecycleRules.js';

/**
 * Evaluation mode values derived from the generated Standard entity.
 */
export type EvaluationMode = mjBizAppsCredentialingStandardEntity['EvaluationMode'];

/**
 * Response type values derived from the generated Standard entity.
 */
export type ResponseType = mjBizAppsCredentialingStandardEntity['ResponseType'];

/**
 * Pure domain rules governing section/standard tree authoring, code normalization/uniqueness, and standard saves.
 */
export class StandardAuthoringRules {
    /**
     * Validates whether sections and standards may be edited on a version with the given status.
     */
    public static CanEditTree(versionStatus: VersionStatus): RuleResult {
        if (versionStatus !== 'Draft') {
            return {
                Allowed: false,
                Reason: 'Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.',
            };
        }

        return { Allowed: true };
    }

    /**
     * Normalizes a standard code by trimming surrounding whitespace.
     */
    public static NormalizeCode(code: string): string {
        return code.trim();
    }

    /**
     * Returns true when two standard codes collide after trimming and case folding.
     */
    public static CodesCollide(a: string, b: string): boolean {
        return (
            StandardAuthoringRules.NormalizeCode(a).toLowerCase() ===
            StandardAuthoringRules.NormalizeCode(b).toLowerCase()
        );
    }

    /**
     * Validates that a standard's code and statement each hold text once trimmed.
     */
    public static CheckStandardText(input: { Code: string | null | undefined; Statement: string | null | undefined }): RuleResult {
        return RequiredTextRule.FirstBlank([
            { Value: input.Code, Reason: "Enter the standard's code." },
            { Value: input.Statement, Reason: "Enter the standard's statement." },
        ]);
    }

    /**
     * Validates that a section's number and name each hold text once trimmed.
     */
    public static CheckSectionText(input: { Number: string | null | undefined; Name: string | null | undefined }): RuleResult {
        return RequiredTextRule.FirstBlank([
            { Value: input.Number, Reason: "Enter the section's number." },
            { Value: input.Name, Reason: "Enter the section's name." },
        ]);
    }

    /**
     * Validates that a document requirement's name holds text once trimmed.
     */
    public static CheckDocumentRequirementText(input: { Name: string | null | undefined }): RuleResult {
        return RequiredTextRule.FirstBlank([{ Value: input.Name, Reason: "Enter the document's name." }]);
    }

    /**
     * Validates saving a standard, checking tree editability, immutable links, evaluation mode rules, and interpretive rules in order.
     */
    public static CanSaveStandard(input: {
        IsNew: boolean;
        IsVersionClone: boolean;
        VersionStatus: VersionStatus;
        ChangedFields: readonly string[];
        EvaluationMode: EvaluationMode;
        IsInterpretive: boolean;
    }): RuleResult {
        const treeEdit = StandardAuthoringRules.CanEditTree(input.VersionStatus);
        if (!treeEdit.Allowed) {
            return treeEdit;
        }

        const immutableCheck = StandardAuthoringRules.checkImmutableFields(input.IsNew, input.ChangedFields);
        if (!immutableCheck.Allowed) {
            return immutableCheck;
        }

        const evaluationModeCheck = StandardAuthoringRules.checkEvaluationMode(input);
        if (!evaluationModeCheck.Allowed) {
            return evaluationModeCheck;
        }

        if (input.IsInterpretive && input.EvaluationMode !== 'Human Only') {
            return {
                Allowed: false,
                Reason: 'An interpretive standard is always reviewed by people.',
            };
        }

        return { Allowed: true };
    }

    private static checkImmutableFields(isNew: boolean, changedFields: readonly string[]): RuleResult {
        if (isNew) {
            return { Allowed: true };
        }

        if (changedFields.includes('SectionID')) {
            return {
                Allowed: false,
                Reason: 'A standard cannot be moved to another section.',
            };
        }

        if (changedFields.includes('ProgramVersionID')) {
            return {
                Allowed: false,
                Reason: 'A standard cannot be moved to another version.',
            };
        }

        return { Allowed: true };
    }

    private static checkEvaluationMode(input: {
        IsNew: boolean;
        IsVersionClone: boolean;
        ChangedFields: readonly string[];
        EvaluationMode: EvaluationMode;
    }): RuleResult {
        if (input.IsNew) {
            // Cloning a version carries each standard's existing EvaluationMode into the new Draft.
            if (!input.IsVersionClone && input.EvaluationMode !== 'Human Only') {
                return {
                    Allowed: false,
                    Reason: 'Evaluation mode cannot be edited here. It changes only through the Trust screen.',
                };
            }
            return { Allowed: true };
        }

        if (input.ChangedFields.includes('EvaluationMode')) {
            return {
                Allowed: false,
                Reason: 'Evaluation mode cannot be edited here. It changes only through the Trust screen.',
            };
        }

        return { Allowed: true };
    }
}
