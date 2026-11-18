/**
 * Pure view-model logic for the Applicant Standards Runner (FRD FR-4.5, 4.6, 4.8, 4.9).
 *
 * Keeps filter membership, section counts, intake-mode copy, URL state resolution, and card action
 * availability/disabled-reason computation independent of Angular templates so every rule is
 * unit-tested without a DOM.
 */
import { UUIDsEqual } from '@memberjunction/global';
import {
    ResponseRules,
    type ApplicationWorkspace,
    type RefreshPrefillsOutput,
    type ResponseState,
    type ResponseStatus,
    type WorkspaceApplication,
    type WorkspaceCitation,
    type WorkspaceSection,
    type WorkspaceStandard,
    type WorkspaceStandardResponse,
} from '@mj-biz-apps/credentialing-core';

/** Filter tabs for the Standards Runner. */
export type RunnerFilter = 'needs-review' | 'confirmed' | 'all';

export interface RunnerFilterOption {
    ID: RunnerFilter;
    Label: string;
}

export const RUNNER_FILTER_OPTIONS: readonly RunnerFilterOption[] = [
    { ID: 'needs-review', Label: 'Needs your review' },
    { ID: 'confirmed', Label: 'Confirmed' },
    { ID: 'all', Label: 'All' },
];

export const CANNOT_PREFILL_BANNER = 'This program does not draft answers. Every answer is written by you.';
export const CONFIRMED_LOCKED_SENTENCE = "Confirmed answers are locked. Ask the program's staff to reopen one if it must change.";
export const SAVE_DRAFT_BEFORE_CONFIRMING_REASON = 'Save your draft before confirming.';
export const NO_CHANGES_TO_SAVE_REASON = 'Make a change before saving.';
export const STALE_SOURCE_SENTENCE = 'Source changed since this was drafted';
export const LOCATED_PASSAGES_SENTENCE = 'The assistant found these passages. Write your answer.';

const INTAKE_SENTENCES: Readonly<Record<string, string>> = {
    Manual: 'Nothing is drafted for this standard. Write your own answer.',
    Locate: 'The assistant points to passages in your documents. It does not write this answer.',
    Prefill: 'The assistant may draft this answer from your documents. You confirm it.',
};

const RESPONSE_STATUS_LABELS: Readonly<Record<ResponseStatus, string>> = {
    Empty: 'Not started',
    Drafted: 'Draft saved',
    Prefilled: 'Drafted by assistant',
    Located: 'Passages located',
    Confirmed: 'Confirmed',
    Flagged: 'Flagged for attention',
};

/** Per-section progress summary for the left rail. */
export interface SectionProgressSummary {
    SectionID: string;
    Confirmed: number;
    Total: number;
    HasNew: boolean;
    Percent: number;
}

/** Actions and disabled-reason copy allowed on one standard card. */
export interface CardActions {
    IsApplicationLocked: boolean;
    IsConfirmed: boolean;
    ApplicationLockedReason: string | null;
    ConfirmedLockedSentence: string | null;
    ShowEditButton: boolean;
    ShowSaveCancel: boolean;
    SaveDisabled: boolean;
    SaveDisabledReason: string | null;
    ShowConfirmButton: boolean;
    ConfirmDisabled: boolean;
    ConfirmDisabledReason: string | null;
}

/** Resolved section, filter, and visible standards for the current URL params. */
export interface RunnerSelection {
    SectionID: string | null;
    Filter: RunnerFilter;
    ActiveSection: WorkspaceSection | null;
    VisibleStandards: WorkspaceStandard[];
}

/** Parses a `filter` query param, defaulting to `needs-review`. */
export function ParseRunnerFilter(value: string | null | undefined): RunnerFilter {
    const normalized = (value ?? '').trim().toLowerCase();
    if (normalized === 'confirmed') return 'confirmed';
    if (normalized === 'all') return 'all';
    return 'needs-review';
}

/** Whether `standard` appears under `filter`. */
export function MatchesRunnerFilter(standard: Pick<WorkspaceStandard, 'Response'>, filter: RunnerFilter): boolean {
    switch (filter) {
        case 'needs-review':
            return standard.Response.Status !== 'Confirmed';
        case 'confirmed':
            return standard.Response.Status === 'Confirmed';
        case 'all':
            return true;
    }
}

/** Plain-language intake-mode sentence shown on each card. */
export function IntakeSentence(intakeMode: string): string {
    return INTAKE_SENTENCES[intakeMode] ?? INTAKE_SENTENCES['Manual'];
}

/** Human-readable state label in words for a response status. */
export function ResponseStateLabel(status: ResponseStatus): string {
    return RESPONSE_STATUS_LABELS[status] ?? status;
}

/** Counts confirmed/total standards, NEW badge presence, and progress percentage for one section. */
export function SectionCounts(section: Pick<WorkspaceSection, 'SectionID' | 'Standards'>): SectionProgressSummary {
    const total = section.Standards.length;
    const confirmed = section.Standards.filter((s) => s.Response.Status === 'Confirmed').length;
    const hasNew = section.Standards.some((s) => s.IsNewForVersion);
    const percent = total === 0 ? 0 : Math.round((confirmed / total) * 100);
    return {
        SectionID: section.SectionID,
        Confirmed: confirmed,
        Total: total,
        HasNew: hasNew,
        Percent: percent,
    };
}

/** Overall confirmed/total counts across all sections in the workspace. */
export function ApplicationCounts(workspace: Pick<ApplicationWorkspace, 'Sections'>): {
    Confirmed: number;
    Total: number;
    Percent: number;
} {
    let confirmed = 0;
    let total = 0;
    for (const section of workspace.Sections) {
        const s = SectionCounts(section);
        confirmed += s.Confirmed;
        total += s.Total;
    }
    return {
        Confirmed: confirmed,
        Total: total,
        Percent: total === 0 ? 0 : Math.round((confirmed / total) * 100),
    };
}

/**
 * Computes which buttons a card renders and why any disabled control is disabled.
 * Every disabled control carries its reason as visible text.
 */
export function ResolveCardActions(
    application: Pick<WorkspaceApplication, 'Status' | 'SubmittedAt'>,
    standard: Pick<WorkspaceStandard, 'ResponseType' | 'IntakeMode' | 'Response'>,
    isEditing: boolean,
    hasUnsavedEdits: boolean,
): CardActions {
    const submittedAt = application.SubmittedAt ? new Date(application.SubmittedAt) : null;
    const responseState: ResponseState = {
        Status: standard.Response.Status,
        AuthorType: standard.Response.AuthorType,
        ResponseText: standard.Response.ResponseText,
        SelfAssessment: standard.Response.SelfAssessment,
    };

    const editRule = ResponseRules.CanEdit(application.Status, responseState, submittedAt);
    if (application.Status !== 'Draft') {
        return {
            IsApplicationLocked: true,
            IsConfirmed: standard.Response.Status === 'Confirmed',
            ApplicationLockedReason: editRule.Allowed ? null : editRule.Reason,
            ConfirmedLockedSentence: null,
            ShowEditButton: false,
            ShowSaveCancel: false,
            SaveDisabled: true,
            SaveDisabledReason: null,
            ShowConfirmButton: false,
            ConfirmDisabled: true,
            ConfirmDisabledReason: null,
        };
    }

    if (standard.Response.Status === 'Confirmed') {
        return {
            IsApplicationLocked: false,
            IsConfirmed: true,
            ApplicationLockedReason: null,
            ConfirmedLockedSentence: CONFIRMED_LOCKED_SENTENCE,
            ShowEditButton: false,
            ShowSaveCancel: false,
            SaveDisabled: true,
            SaveDisabledReason: null,
            ShowConfirmButton: false,
            ConfirmDisabled: true,
            ConfirmDisabledReason: null,
        };
    }

    const confirmRule = ResponseRules.CanConfirm(
        application.Status,
        responseState,
        { ResponseType: standard.ResponseType, IntakeMode: standard.IntakeMode },
        standard.Response.Citations.length,
        submittedAt,
    );

    const confirmDisabled = isEditing || hasUnsavedEdits || !confirmRule.Allowed;
    let confirmDisabledReason: string | null = null;
    if (isEditing || hasUnsavedEdits) {
        confirmDisabledReason = SAVE_DRAFT_BEFORE_CONFIRMING_REASON;
    } else if (!confirmRule.Allowed) {
        confirmDisabledReason = confirmRule.Reason;
    }

    const saveDisabled = !hasUnsavedEdits;
    return {
        IsApplicationLocked: false,
        IsConfirmed: false,
        ApplicationLockedReason: null,
        ConfirmedLockedSentence: null,
        ShowEditButton: !isEditing,
        ShowSaveCancel: isEditing,
        SaveDisabled: saveDisabled,
        SaveDisabledReason: saveDisabled ? NO_CHANGES_TO_SAVE_REASON : null,
        ShowConfirmButton: true,
        ConfirmDisabled: confirmDisabled,
        ConfirmDisabledReason: confirmDisabledReason,
    };
}

/** Resolves the active section and filtered standards list from URL query params. */
export function ResolveRunnerSelection(
    workspace: Pick<ApplicationWorkspace, 'Sections'>,
    sectionIdParam: string | null | undefined,
    filterParam: string | null | undefined,
): RunnerSelection {
    const filter = ParseRunnerFilter(filterParam);
    if (workspace.Sections.length === 0) {
        return { SectionID: null, Filter: filter, ActiveSection: null, VisibleStandards: [] };
    }
    const wanted = (sectionIdParam ?? '').trim();
    const matched = wanted.length > 0 ? workspace.Sections.find((s) => UUIDsEqual(s.SectionID, wanted)) : undefined;
    const activeSection = matched ?? workspace.Sections[0];
    return {
        SectionID: activeSection.SectionID,
        Filter: filter,
        ActiveSection: activeSection,
        VisibleStandards: activeSection.Standards.filter((s) => MatchesRunnerFilter(s, filter)),
    };
}

/** Replaces the updated response inside `workspace` and recomputes `ConfirmedCount`. */
export function ApplyResponseUpdate(
    workspace: ApplicationWorkspace,
    updatedResponse: WorkspaceStandardResponse,
): ApplicationWorkspace {
    const sections = workspace.Sections.map((section) => ({
        ...section,
        Standards: section.Standards.map((st) =>
            UUIDsEqual(st.Response.ResponseID, updatedResponse.ResponseID)
                ? { ...st, Response: updatedResponse }
                : st,
        ),
    }));
    const counts = ApplicationCounts({ Sections: sections });
    return {
        ...workspace,
        Application: {
            ...workspace.Application,
            ConfirmedCount: counts.Confirmed,
            StandardCount: counts.Total,
        },
        Sections: sections,
    };
}

/** Formats a citation chip label as `{SourceLabel}{, p. N}` (FR-4.7). */
export function FormatCitationChip(
    citation: Pick<WorkspaceCitation, 'SourceLabel' | 'PageReference'>,
): string {
    const page = citation.PageReference?.trim() ?? '';
    if (!page) return citation.SourceLabel;
    if (/^(p\.|page\b)/i.test(page)) return `${citation.SourceLabel}, ${page}`;
    return `${citation.SourceLabel}, p. ${page}`;
}

/** Whether `Refresh prefills` is shown above the standards list (FR-4.10). */
export function ShowRefreshPrefills(
    application: Pick<WorkspaceApplication, 'CanPrefill' | 'Status'>,
): boolean {
    return application.CanPrefill && application.Status === 'Draft';
}

/** Plain-language summary reported after `Refresh prefills` completes. */
export function FormatRefreshSummary(output: RefreshPrefillsOutput): string {
    const noun = output.Prefilled === 1 ? 'answer' : 'answers';
    return `${output.Prefilled} ${noun} drafted, ${output.Unchanged} unchanged.`;
}
