import type { RuleResult } from './RuleResult.js';
import type { VersionStatus } from './VersionLifecycleRules.js';

/**
 * Pure domain rules governing the three tiers of program version configuration settings.
 */
export class VersionSettingsRules {
    public static readonly WorkflowToggleFields: readonly string[] = [
        'PeerReviewerCount',
        'PassiveApprovalWindowDays',
        'RequiresScreening',
        'RequiresExecutiveApproval',
        'RequiresGoverningBodyAttestation',
        'CommitteeID',
    ];

    public static readonly PromotionThresholdFields: readonly string[] = [
        'MinimumAgreeRate',
        'MinimumObservations',
        'MinimumReviewers',
        'MinimumReplayFloor',
    ];

    public static readonly RolloutFlagFields: readonly string[] = [
        'AgentObservationsVisibleToReviewers',
        'PromotionEnabled',
        'AutoCarryForwardOnRenewal',
    ];

    private static readonly draftOnlyFields: ReadonlySet<string> = new Set([
        ...VersionSettingsRules.WorkflowToggleFields,
        ...VersionSettingsRules.PromotionThresholdFields,
    ]);

    /**
     * Validates whether the given changed fields may be modified on a version with the specified status.
     */
    public static CanChangeFields(status: VersionStatus, changedFields: readonly string[]): RuleResult {
        if (status === 'Draft') {
            return { Allowed: true };
        }

        const offendingField = changedFields.find((field) =>
            VersionSettingsRules.draftOnlyFields.has(field)
        );

        if (offendingField != null) {
            return {
                Allowed: false,
                Reason: `${offendingField} can only be changed on a Draft version. It defines what a review means for applications already in progress.`,
            };
        }

        return { Allowed: true };
    }
}
