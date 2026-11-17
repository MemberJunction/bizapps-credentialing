import type { mjBizAppsCredentialingProgramVersionEntity } from '@mj-biz-apps/credentialing-entities';
import type { RuleResult } from './RuleResult.js';
import type { VersionStatus } from './VersionLifecycleRules.js';

type VersionField = keyof mjBizAppsCredentialingProgramVersionEntity;

/** The settings of a version that hold a number. */
export type VersionNumberSetting = Extract<
    VersionField,
    'PeerReviewerCount' | 'PassiveApprovalWindowDays' | 'MinimumAgreeRate' | 'MinimumObservations' | 'MinimumReviewers' | 'MinimumReplayFloor'
>;

/** Every setting of a version. */
export type VersionSetting =
    | VersionNumberSetting
    | Extract<
          VersionField,
          | 'RequiresScreening'
          | 'RequiresExecutiveApproval'
          | 'RequiresGoverningBodyAttestation'
          | 'CommitteeID'
          | 'AgentObservationsVisibleToReviewers'
          | 'PromotionEnabled'
          | 'AutoCarryForwardOnRenewal'
      >;

/** The values a number setting may hold (the database CHECK constraints), and the refusal outside them. */
export interface NumberSettingRange {
    Min: number;
    /** Null when the setting has no upper bound. */
    Max: number | null;
    OutOfRangeReason: string;
}

/** The number settings of a version, as the range rule reads them. */
export type VersionNumberValues = Readonly<Record<VersionNumberSetting, number | null | undefined>>;

/** A number setting that is missing or out of range, with the sentence that says so. */
export interface SettingProblem {
    Field: VersionNumberSetting;
    Reason: string;
}

const LABELS: Readonly<Record<VersionSetting, string>> = {
    PeerReviewerCount: 'Peer reviewers per application',
    PassiveApprovalWindowDays: 'Passive approval window',
    RequiresScreening: 'Staff screen applications before review',
    RequiresExecutiveApproval: 'Executive approves decisions',
    RequiresGoverningBodyAttestation: "Applicant's governing body attests",
    CommitteeID: 'Deciding committee',
    MinimumAgreeRate: 'Minimum agree rate',
    MinimumObservations: 'Minimum observations',
    MinimumReviewers: 'Minimum reviewers',
    MinimumReplayFloor: 'Minimum replay agreement',
    AgentObservationsVisibleToReviewers: 'Reviewers see AI observations',
    PromotionEnabled: 'Standards may be promoted',
    AutoCarryForwardOnRenewal: 'Renewals start from the previous answers',
};

const NUMBER_RANGES: Readonly<Record<VersionNumberSetting, NumberSettingRange>> = {
    PeerReviewerCount: { Min: 0, Max: null, OutOfRangeReason: `${LABELS.PeerReviewerCount} cannot be negative.` },
    PassiveApprovalWindowDays: { Min: 1, Max: null, OutOfRangeReason: `${LABELS.PassiveApprovalWindowDays} must be at least 1 day.` },
    MinimumAgreeRate: { Min: 0, Max: 1, OutOfRangeReason: `${LABELS.MinimumAgreeRate} must be between 0 and 1.` },
    MinimumObservations: { Min: 1, Max: null, OutOfRangeReason: `${LABELS.MinimumObservations} must be at least 1.` },
    MinimumReviewers: { Min: 1, Max: null, OutOfRangeReason: `${LABELS.MinimumReviewers} must be at least 1.` },
    MinimumReplayFloor: { Min: 0, Max: 1, OutOfRangeReason: `${LABELS.MinimumReplayFloor} must be between 0 and 1.` },
};

/** The number settings in the order they appear on screen, which is the order problems are reported in. */
const NUMBER_SETTINGS: readonly VersionNumberSetting[] = [
    'PeerReviewerCount',
    'PassiveApprovalWindowDays',
    'MinimumAgreeRate',
    'MinimumObservations',
    'MinimumReviewers',
    'MinimumReplayFloor',
];

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

    /** The label each setting has on screen; the sentences of {@link CheckRanges} name settings by it. */
    public static readonly Labels: Readonly<Record<VersionSetting, string>> = LABELS;

    /** The range each number setting must stay in, mirroring the database CHECK constraints. */
    public static readonly NumberRanges: Readonly<Record<VersionNumberSetting, NumberSettingRange>> = NUMBER_RANGES;

    /** The number settings, in screen order. */
    public static readonly NumberSettingFields: readonly VersionNumberSetting[] = NUMBER_SETTINGS;

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

    /** The sentence given for a number setting that holds no value. */
    public static MissingValueReason(field: VersionNumberSetting): string {
        return `Enter a value for ${LABELS[field]}.`;
    }

    /**
     * The first number setting, in screen order, that is missing or outside its range — or null when
     * every one is acceptable.
     */
    public static FirstRangeProblem(values: VersionNumberValues): SettingProblem | null {
        for (const field of NUMBER_SETTINGS) {
            const reason = VersionSettingsRules.rangeReason(field, values[field]);
            if (reason != null) {
                return { Field: field, Reason: reason };
            }
        }
        return null;
    }

    /**
     * Validates that every number setting holds a value inside its range, refusing with the sentence
     * of the first one that does not.
     */
    public static CheckRanges(values: VersionNumberValues): RuleResult {
        const problem = VersionSettingsRules.FirstRangeProblem(values);
        return problem == null ? { Allowed: true } : { Allowed: false, Reason: problem.Reason };
    }

    /** The number setting a refusal sentence of {@link CheckRanges} is about, or null for any other text. */
    public static NumberSettingFor(message: string): VersionNumberSetting | null {
        return (
            NUMBER_SETTINGS.find(
                (field) => message.includes(NUMBER_RANGES[field].OutOfRangeReason) || message.includes(VersionSettingsRules.MissingValueReason(field)),
            ) ?? null
        );
    }

    private static rangeReason(field: VersionNumberSetting, value: number | null | undefined): string | null {
        if (value == null || !Number.isFinite(value)) {
            return VersionSettingsRules.MissingValueReason(field);
        }
        const range = NUMBER_RANGES[field];
        const inRange = value >= range.Min && (range.Max == null || value <= range.Max);
        return inRange ? null : range.OutOfRangeReason;
    }
}
