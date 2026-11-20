import type {
    mjBizAppsCredentialingStandardEntity,
    mjBizAppsCredentialingStandardResponseEntity,
} from '@mj-biz-apps/credentialing-entities';
import type { ApplicationStatus } from './ApplicationLifecycleRules.js';
import { RequiredTextRule, type RuleResult } from './RuleResult.js';

/** Response workflow status values derived from the generated StandardResponse entity. */
export type ResponseStatus = mjBizAppsCredentialingStandardResponseEntity['Status'];

/** Self-assessment values derived from the generated StandardResponse entity. */
export type SelfAssessment = NonNullable<
    mjBizAppsCredentialingStandardResponseEntity['SelfAssessment']
>;

/** Author type values derived from the generated StandardResponse entity. */
export type ResponseAuthorType = mjBizAppsCredentialingStandardResponseEntity['AuthorType'];

/** Intake mode values derived from the generated Standard entity. */
export type IntakeMode = mjBizAppsCredentialingStandardEntity['IntakeMode'];

/** Minimal response state evaluated by response rules. */
export interface ResponseState {
    Status: ResponseStatus;
    AuthorType: ResponseAuthorType;
    ResponseText: string | null;
    SelfAssessment: SelfAssessment | null;
}

const UTC_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
});

/**
 * Pure domain rules governing editing, saving, confirming, and reopening standard responses.
 */
export class ResponseRules {
    /**
     * Validates whether a response may be edited by an applicant.
     */
    public static CanEdit(
        application: ApplicationStatus,
        response: ResponseState,
        submittedAt: Date | null
    ): RuleResult {
        const appCheck = ResponseRules.checkDraftApplication(application, submittedAt);
        if (!appCheck.Allowed) {
            return appCheck;
        }
        if (response.Status === 'Confirmed') {
            return {
                Allowed: false,
                Reason: "This answer is confirmed. Ask the program's staff to reopen it if it must change.",
            };
        }
        return { Allowed: true };
    }

    /**
     * Computes the new response state after a human saves a draft.
     */
    public static AfterSave(
        _response: ResponseState,
        text: string | null,
        self: SelfAssessment | null
    ): ResponseState {
        const textBlank = RequiredTextRule.IsBlank(text);
        const normalizedText = textBlank ? null : text;
        if (textBlank && self == null) {
            return {
                Status: 'Empty',
                AuthorType: 'Human',
                ResponseText: null,
                SelfAssessment: null,
            };
        }
        return {
            Status: 'Drafted',
            AuthorType: 'Human',
            ResponseText: normalizedText,
            SelfAssessment: self,
        };
    }

    /**
     * Validates whether a response has everything required to be confirmed by an applicant.
     */
    public static CanConfirm(
        application: ApplicationStatus,
        response: ResponseState,
        standard: { ResponseType: string; IntakeMode: string },
        citationCount: number,
        submittedAt: Date | null
    ): RuleResult {
        const editCheck = ResponseRules.CanEdit(application, response, submittedAt);
        if (!editCheck.Allowed) {
            return editCheck;
        }

        const textBlank = RequiredTextRule.IsBlank(response.ResponseText);
        if (
            (standard.ResponseType === 'Narrative' || standard.ResponseType === 'Composite') &&
            textBlank
        ) {
            return {
                Allowed: false,
                Reason: 'Write an answer before confirming.',
            };
        }

        if (standard.ResponseType === 'Evidence' && citationCount === 0 && textBlank) {
            return {
                Allowed: false,
                Reason: 'Point to a document or write an answer before confirming.',
            };
        }

        if (response.SelfAssessment == null) {
            return {
                Allowed: false,
                Reason: 'Choose Met, Partially met or Not met before confirming.',
            };
        }

        return { Allowed: true };
    }

    /**
     * Validates whether staff may reopen a confirmed response. Caller checks staff authority.
     */
    public static CanReopen(
        application: ApplicationStatus,
        response: ResponseState,
        reason: string | null
    ): RuleResult {
        if (application !== 'Draft' && application !== 'Info Requested') {
            return {
                Allowed: false,
                Reason: 'Answers can be reopened only while an application is Draft or Info Requested.',
            };
        }
        if (response.Status !== 'Confirmed') {
            return {
                Allowed: false,
                Reason: 'Only a confirmed answer can be reopened.',
            };
        }
        if (RequiredTextRule.IsBlank(reason)) {
            return {
                Allowed: false,
                Reason: 'Give the reason for reopening this answer.',
            };
        }
        return { Allowed: true };
    }

    private static checkDraftApplication(
        application: ApplicationStatus,
        submittedAt: Date | null
    ): RuleResult {
        if (application === 'Draft') {
            return { Allowed: true };
        }
        if (submittedAt != null) {
            return {
                Allowed: false,
                // The same sentence is built by the server and the browser, so the date is UTC and says so:
                // an evening submission west of UTC falls on the next UTC day.
                Reason: `This application was submitted on ${UTC_DATE_FORMATTER.format(submittedAt)} (UTC). Its answers and documents are locked.`,
            };
        }
        return {
            Allowed: false,
            Reason: `This application is ${application}. Its answers are locked.`,
        };
    }
}
