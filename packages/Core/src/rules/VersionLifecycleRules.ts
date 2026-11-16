import type { mjBizAppsCredentialingProgramVersionEntity } from '@mj-biz-apps/credentialing-entities';
import type { RuleResult } from './RuleResult.js';

/**
 * Lifecycle status values derived from the generated ProgramVersion entity.
 */
export type VersionStatus = mjBizAppsCredentialingProgramVersionEntity['Status'];

/**
 * Pure domain rules governing program version lifecycle transitions, activation, draft creation, and deletion.
 */
export class VersionLifecycleRules {
    /**
     * Validates a status transition. Only Draft -> Active and Active -> Retired are permitted.
     */
    public static CanTransition(from: VersionStatus, to: VersionStatus): RuleResult {
        const isAllowed =
            (from === 'Draft' && to === 'Active') ||
            (from === 'Active' && to === 'Retired');

        if (!isAllowed) {
            return {
                Allowed: false,
                Reason: 'A version can only move from Draft to Active, or from Active to Retired.',
            };
        }

        return { Allowed: true };
    }

    /**
     * Validates whether a program version can be activated, checking status, standards, empty sections, and committee in order.
     */
    public static CanActivate(input: {
        Status: VersionStatus;
        SectionCount: number;
        StandardCount: number;
        EmptySectionNumbers: string[];
        CommitteeID: string | null;
    }): RuleResult {
        if (input.Status !== 'Draft') {
            return {
                Allowed: false,
                Reason: 'Only a Draft version can be activated.',
            };
        }

        if (input.SectionCount <= 0 || input.StandardCount <= 0) {
            return {
                Allowed: false,
                Reason: 'This version has no standards. Add at least one standard before activating.',
            };
        }

        if (input.EmptySectionNumbers.length > 0) {
            return {
                Allowed: false,
                Reason: `Section ${input.EmptySectionNumbers.join(', ')} has no standards. Add a standard or remove the section before activating.`,
            };
        }

        if (input.CommitteeID == null || input.CommitteeID.trim() === '') {
            return {
                Allowed: false,
                Reason: 'Choose the deciding committee before activating this version.',
            };
        }

        return { Allowed: true };
    }

    /**
     * Validates whether a new Draft version can be started for a program.
     */
    public static CanStartDraft(input: { ExistingDraftLabel: string | null }): RuleResult {
        if (input.ExistingDraftLabel != null) {
            return {
                Allowed: false,
                Reason: `This program already has a draft version (${input.ExistingDraftLabel}). Finish or delete it before starting another.`,
            };
        }

        return { Allowed: true };
    }

    /**
     * Validates whether a program version in the given status can be deleted.
     */
    public static CanDelete(status: VersionStatus): RuleResult {
        if (status !== 'Draft') {
            return {
                Allowed: false,
                Reason: 'Only a Draft version can be deleted.',
            };
        }

        return { Allowed: true };
    }
}
