import { UUIDsEqual } from '@memberjunction/global';
import type { mjBizAppsCredentialingResponseSourceEntity } from '@mj-biz-apps/credentialing-entities';
import { NOT_FOUND_REASON, type RuleResult } from './RuleResult.js';
import { StandardAuthoringRules } from './StandardAuthoringRules.js';
import type { VersionStatus } from './VersionLifecycleRules.js';

/** Source type values derived from the generated ResponseSource entity. */
export type ResponseSourceType = mjBizAppsCredentialingResponseSourceEntity['SourceType'];

/** Source mode values derived from the generated ResponseSource entity. */
export type ResponseSourceMode = mjBizAppsCredentialingResponseSourceEntity['Mode'];

/** Authoring draft of one response source on a standard. */
export interface SourceDraft {
    ID?: string;
    SourceType?: ResponseSourceType;
    DocumentRequirementID: string | null;
    Mode: ResponseSourceMode;
    Rank?: number;
    Sequence?: number;
}

/**
 * Pure domain rules validating response sources authored on a standard.
 */
export class ResponseSourceRules {
    /**
     * Validates a standard's list of response sources against version editability, intake mode,
     * version-scoped document requirements, and duplicate prevention.
     */
    public static Validate(
        sources: readonly SourceDraft[],
        standard: { IntakeMode: string },
        versionStatus: VersionStatus,
        requirementIDsOfVersion: readonly string[]
    ): RuleResult {
        const treeEdit = StandardAuthoringRules.CanEditTree(versionStatus);
        if (!treeEdit.Allowed) {
            return treeEdit;
        }

        if (standard.IntakeMode === 'Manual' && sources.length > 0) {
            return {
                Allowed: false,
                Reason: 'Manual standards have no sources.',
            };
        }

        const seenRequirements: string[] = [];
        for (const source of sources) {
            if (source.Rank != null && source.Rank < 1) {
                return { Allowed: false, Reason: 'Source rank must be at least 1.' };
            }

            const reqID = source.DocumentRequirementID;
            if (
                reqID == null ||
                !requirementIDsOfVersion.some((versionReqID) => UUIDsEqual(versionReqID, reqID))
            ) {
                return { Allowed: false, Reason: NOT_FOUND_REASON };
            }

            if (seenRequirements.some((seen) => UUIDsEqual(seen, reqID))) {
                return {
                    Allowed: false,
                    Reason: 'This document is already a source for this standard.',
                };
            }
            seenRequirements.push(reqID);
        }

        return { Allowed: true };
    }
}
