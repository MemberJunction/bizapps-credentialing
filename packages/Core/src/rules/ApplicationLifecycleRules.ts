import type { mjBizAppsCredentialingApplicationEntity } from '@mj-biz-apps/credentialing-entities';
import { RequiredTextRule, type RuleResult } from './RuleResult.js';
import type { VersionStatus } from './VersionLifecycleRules.js';

/** Lifecycle status values derived from the generated Application entity. */
export type ApplicationStatus = mjBizAppsCredentialingApplicationEntity['Status'];

/** Who is performing an application lifecycle action. */
export type ApplicationActor = 'Applicant' | 'Staff';

const TERMINAL_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
    'Decided',
    'Closed',
    'Withdrawn',
]);

const STAFF_WITHDRAWABLE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
    'Draft',
    'Submitted',
    'Screening',
    'In Review',
    'Info Requested',
    'Committee',
    'Executive Sign-Off',
]);

const APPLICANT_WITHDRAWABLE_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
    'Draft',
    'Submitted',
    'Screening',
    'In Review',
    'Info Requested',
]);

/**
 * Pure domain rules governing application lifecycle transitions, withdrawal, and starting new applications.
 */
export class ApplicationLifecycleRules {
    /** True when an application is still active (not Decided, Closed, or Withdrawn). */
    public static IsLive(status: ApplicationStatus): boolean {
        return !TERMINAL_STATUSES.has(status);
    }

    /**
     * Validates a workflow status transition for the given actor and version toggle settings.
     */
    public static CanTransition(
        from: ApplicationStatus,
        to: ApplicationStatus,
        actor: ApplicationActor,
        version: { RequiresScreening: boolean; RequiresExecutiveApproval: boolean }
    ): RuleResult {
        if (ApplicationLifecycleRules.isTransitionAllowed(from, to, actor, version)) {
            return { Allowed: true };
        }
        return {
            Allowed: false,
            Reason: `An application cannot move from ${from} to ${to}.`,
        };
    }

    /**
     * Validates whether the given actor may withdraw an application from `from` with `reason`.
     */
    public static CanWithdraw(
        from: ApplicationStatus,
        actor: ApplicationActor,
        reason: string | null
    ): RuleResult {
        const allowedStatuses =
            actor === 'Staff' ? STAFF_WITHDRAWABLE_STATUSES : APPLICANT_WITHDRAWABLE_STATUSES;
        if (!allowedStatuses.has(from)) {
            return {
                Allowed: false,
                Reason: 'This application can no longer be withdrawn.',
            };
        }
        if (RequiredTextRule.IsBlank(reason)) {
            return {
                Allowed: false,
                Reason: 'Give the reason for withdrawing.',
            };
        }
        return { Allowed: true };
    }

    /**
     * Validates whether a subject may start a new application on a program version.
     */
    public static CanStart(
        existing: readonly { Status: ApplicationStatus; IsHistorical: boolean }[],
        versionStatus: VersionStatus,
        programSubjectType: string,
        subjectType: string
    ): RuleResult {
        if (versionStatus !== 'Active') {
            return {
                Allowed: false,
                Reason: 'Applications can be started only on an active version.',
            };
        }
        if (programSubjectType !== subjectType) {
            return {
                Allowed: false,
                Reason: `This program credentials ${programSubjectType} subjects.`,
            };
        }
        const hasOpen = existing.some(
            (app) => !app.IsHistorical && ApplicationLifecycleRules.IsLive(app.Status)
        );
        if (hasOpen) {
            return {
                Allowed: false,
                Reason: 'This subject already has an open application on this version.',
            };
        }
        return { Allowed: true };
    }

    private static isTransitionAllowed(
        from: ApplicationStatus,
        to: ApplicationStatus,
        actor: ApplicationActor,
        version: { RequiresScreening: boolean; RequiresExecutiveApproval: boolean }
    ): boolean {
        if (from === 'Draft' && to === 'Submitted') {
            return actor === 'Applicant';
        }
        if (actor !== 'Staff') {
            return false;
        }
        if (from === 'Submitted') {
            return version.RequiresScreening ? to === 'Screening' : to === 'In Review';
        }
        if (from === 'Committee') {
            return version.RequiresExecutiveApproval ? to === 'Executive Sign-Off' : to === 'Decided';
        }
        return (
            (from === 'Screening' && to === 'In Review') ||
            (from === 'In Review' && (to === 'Info Requested' || to === 'Committee')) ||
            (from === 'Info Requested' && to === 'In Review') ||
            (from === 'Executive Sign-Off' && to === 'Decided') ||
            (from === 'Decided' && to === 'Closed')
        );
    }
}
