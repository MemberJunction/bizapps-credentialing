import { describe, expect, it } from 'vitest';
import type { ApplicationWorkspace, WorkspaceStandard, WorkspaceStandardResponse } from '@mj-biz-apps/credentialing-core';
import {
    ApplicationCounts,
    ApplyResponseUpdate,
    CANNOT_PREFILL_BANNER,
    CONFIRMED_LOCKED_SENTENCE,
    FormatCitationChip,
    FormatRefreshSummary,
    IntakeSentence,
    MatchesRunnerFilter,
    NO_CHANGES_TO_SAVE_REASON,
    ParseRunnerFilter,
    ResolveCardActions,
    ResolveRunnerSelection,
    ResponseStateLabel,
    SAVE_DRAFT_BEFORE_CONFIRMING_REASON,
    SectionCounts,
    ShowRefreshPrefills,
} from '../runner-model';

function makeResponse(overrides: Partial<WorkspaceStandardResponse> = {}): WorkspaceStandardResponse {
    return {
        ResponseID: 'R1111111-1111-1111-1111-111111111111',
        Status: 'Empty',
        ResponseText: null,
        SelfAssessment: null,
        AuthorType: 'Human',
        ConfirmedByName: null,
        ConfirmedAt: null,
        UpdatedAt: '2026-11-17T10:00:00.000Z',
        SourceType: null,
        SourceLabel: null,
        SourceRetrievedAt: null,
        IsStale: false,
        ReopenReason: null,
        Explanation: null,
        Citations: [],
        ...overrides,
    };
}

function makeStandard(overrides: Partial<WorkspaceStandard> = {}): WorkspaceStandard {
    return {
        StandardID: 'S1111111-1111-1111-1111-111111111111',
        Code: '1.1',
        Statement: 'Maintain a written safety plan.',
        Guidance: 'Approved annually.',
        ResponseType: 'Narrative',
        IntakeMode: 'Manual',
        IsEligibility: false,
        IsNewForVersion: false,
        EvidenceHint: null,
        Response: makeResponse(),
        ...overrides,
    };
}

function makeWorkspace(): ApplicationWorkspace {
    return {
        Application: {
            ApplicationID: 'A1111111-1111-1111-1111-111111111111',
            SubjectID: 'B1111111-1111-1111-1111-111111111111',
            ProgramName: 'Sample Applicant Program',
            VersionLabel: '2026',
            OrganizationName: 'Sample Body A',
            SubjectNoun: 'professional',
            Status: 'Draft',
            SubmittedAt: null,
            ConfirmedCount: 1,
            StandardCount: 3,
            RequiresGoverningBodyAttestation: false,
            WithdrawalReason: null,
            CanPrefill: false,
        },
        Sections: [
            {
                SectionID: 'SEC11111-1111-1111-1111-111111111111',
                Number: '1',
                Name: 'Eligibility',
                Description: null,
                Standards: [
                    makeStandard({
                        StandardID: 'ST111111-1111-1111-1111-111111111111',
                        Code: '1.1',
                        IsEligibility: true,
                        IsNewForVersion: false,
                        Response: makeResponse({ ResponseID: 'R1', Status: 'Confirmed', ConfirmedByName: 'Applicant A', ConfirmedAt: '2026-11-17T11:00:00.000Z' }),
                    }),
                    makeStandard({
                        StandardID: 'ST222222-2222-2222-2222-222222222222',
                        Code: '1.2',
                        IsNewForVersion: true,
                        Response: makeResponse({ ResponseID: 'R2', Status: 'Drafted', ResponseText: 'Draft text', SelfAssessment: 'Met' }),
                    }),
                ],
            },
            {
                SectionID: 'SEC22222-2222-2222-2222-222222222222',
                Number: '2',
                Name: 'Practice',
                Description: 'Practice standards',
                Standards: [
                    makeStandard({
                        StandardID: 'ST333333-3333-3333-3333-333333333333',
                        Code: '2.1',
                        IsNewForVersion: false,
                        Response: makeResponse({ ResponseID: 'R3', Status: 'Empty' }),
                    }),
                ],
            },
        ],
    };
}

describe('runner-model filters and counts', () => {
    it('parses filter params with Needs your review as default', () => {
        expect(ParseRunnerFilter(undefined)).toBe('needs-review');
        expect(ParseRunnerFilter('')).toBe('needs-review');
        expect(ParseRunnerFilter('unknown')).toBe('needs-review');
        expect(ParseRunnerFilter('confirmed')).toBe('confirmed');
        expect(ParseRunnerFilter('ALL')).toBe('all');
    });

    it('matches standards by filter membership', () => {
        const empty = makeStandard({ Response: makeResponse({ Status: 'Empty' }) });
        const drafted = makeStandard({ Response: makeResponse({ Status: 'Drafted' }) });
        const prefilled = makeStandard({ Response: makeResponse({ Status: 'Prefilled' }) });
        const confirmed = makeStandard({ Response: makeResponse({ Status: 'Confirmed' }) });

        expect(MatchesRunnerFilter(empty, 'needs-review')).toBe(true);
        expect(MatchesRunnerFilter(drafted, 'needs-review')).toBe(true);
        expect(MatchesRunnerFilter(prefilled, 'needs-review')).toBe(true);
        expect(MatchesRunnerFilter(confirmed, 'needs-review')).toBe(false);

        expect(MatchesRunnerFilter(confirmed, 'confirmed')).toBe(true);
        expect(MatchesRunnerFilter(drafted, 'confirmed')).toBe(false);

        expect(MatchesRunnerFilter(empty, 'all')).toBe(true);
        expect(MatchesRunnerFilter(confirmed, 'all')).toBe(true);
    });

    it('computes section counts, NEW marker, and application totals', () => {
        const ws = makeWorkspace();
        expect(SectionCounts(ws.Sections[0])).toEqual({
            SectionID: ws.Sections[0].SectionID,
            Confirmed: 1,
            Total: 2,
            HasNew: true,
            Percent: 50,
        });
        expect(SectionCounts(ws.Sections[1])).toEqual({
            SectionID: ws.Sections[1].SectionID,
            Confirmed: 0,
            Total: 1,
            HasNew: false,
            Percent: 0,
        });
        expect(ApplicationCounts(ws)).toEqual({ Confirmed: 1, Total: 3, Percent: 33 });
    });

    it('resolves section and filter selection from URL and updates counts after response changes', () => {
        const ws = makeWorkspace();
        const defaultSel = ResolveRunnerSelection(ws, null, null);
        expect(defaultSel.SectionID).toBe(ws.Sections[0].SectionID);
        expect(defaultSel.Filter).toBe('needs-review');
        expect(defaultSel.VisibleStandards.map((s) => s.Code)).toEqual(['1.2']);

        const confirmedSel = ResolveRunnerSelection(ws, ws.Sections[0].SectionID.toLowerCase(), 'confirmed');
        expect(confirmedSel.VisibleStandards.map((s) => s.Code)).toEqual(['1.1']);

        const updatedWs = ApplyResponseUpdate(
            ws,
            makeResponse({ ResponseID: 'R2', Status: 'Confirmed', ResponseText: 'Draft text', SelfAssessment: 'Met' }),
        );
        expect(updatedWs.Application.ConfirmedCount).toBe(2);
        expect(SectionCounts(updatedWs.Sections[0]).Confirmed).toBe(2);
    });
});

describe('runner-model copy and card actions', () => {
    it('returns the exact intake mode sentences and non-prefill banner', () => {
        expect(CANNOT_PREFILL_BANNER).toBe('This program does not draft answers. Every answer is written by you.');
        expect(IntakeSentence('Manual')).toBe('Nothing is drafted for this standard. Write your own answer.');
        expect(IntakeSentence('Locate')).toBe('The assistant points to passages in your documents. It does not write this answer.');
        expect(IntakeSentence('Prefill')).toBe('The assistant may draft this answer from your documents. You confirm it.');
        expect(ResponseStateLabel('Empty')).toBe('Not started');
        expect(ResponseStateLabel('Confirmed')).toBe('Confirmed');
    });

    it('allows Edit answer when not editing, disables Read and confirm with its reason when incomplete', () => {
        const emptyStd = makeStandard({ ResponseType: 'Narrative', Response: makeResponse({ Status: 'Empty' }) });
        const actions = ResolveCardActions({ Status: 'Draft', SubmittedAt: null }, emptyStd, false, false);
        expect(actions.ShowEditButton).toBe(true);
        expect(actions.ShowSaveCancel).toBe(false);
        expect(actions.ShowConfirmButton).toBe(true);
        expect(actions.ConfirmDisabled).toBe(true);
        expect(actions.ConfirmDisabledReason).toBe('Write an answer before confirming.');
    });

    it('disables Read and confirm while editing or with unsaved edits and enables it once draft is saved', () => {
        const savedDraft = makeStandard({
            ResponseType: 'Narrative',
            Response: makeResponse({ Status: 'Drafted', ResponseText: 'Saved text', SelfAssessment: 'Met' }),
        });

        const whileEditing = ResolveCardActions({ Status: 'Draft', SubmittedAt: null }, savedDraft, true, true);
        expect(whileEditing.ShowEditButton).toBe(false);
        expect(whileEditing.ShowSaveCancel).toBe(true);
        expect(whileEditing.SaveDisabled).toBe(false);
        expect(whileEditing.ConfirmDisabled).toBe(true);
        expect(whileEditing.ConfirmDisabledReason).toBe(SAVE_DRAFT_BEFORE_CONFIRMING_REASON);

        const noChanges = ResolveCardActions({ Status: 'Draft', SubmittedAt: null }, savedDraft, true, false);
        expect(noChanges.SaveDisabled).toBe(true);
        expect(noChanges.SaveDisabledReason).toBe(NO_CHANGES_TO_SAVE_REASON);

        const readyToConfirm = ResolveCardActions({ Status: 'Draft', SubmittedAt: null }, savedDraft, false, false);
        expect(readyToConfirm.ShowConfirmButton).toBe(true);
        expect(readyToConfirm.ConfirmDisabled).toBe(false);
        expect(readyToConfirm.ConfirmDisabledReason).toBeNull();
    });

    it('hides edit and confirm controls on Confirmed responses and shows the locked sentence', () => {
        const confirmed = makeStandard({
            Response: makeResponse({ Status: 'Confirmed', ResponseText: 'Final', SelfAssessment: 'Met' }),
        });
        const actions = ResolveCardActions({ Status: 'Draft', SubmittedAt: null }, confirmed, false, false);
        expect(actions.IsConfirmed).toBe(true);
        expect(actions.ShowEditButton).toBe(false);
        expect(actions.ShowSaveCancel).toBe(false);
        expect(actions.ShowConfirmButton).toBe(false);
        expect(actions.ConfirmedLockedSentence).toBe(CONFIRMED_LOCKED_SENTENCE);
    });

    it('locks all editing and confirming after submission with the Task 2 sentence', () => {
        const draftStd = makeStandard({
            Response: makeResponse({ Status: 'Drafted', ResponseText: 'Answer', SelfAssessment: 'Met' }),
        });
        const actions = ResolveCardActions(
            { Status: 'Submitted', SubmittedAt: '2026-11-17T12:00:00.000Z' },
            draftStd,
            false,
            false,
        );
        expect(actions.IsApplicationLocked).toBe(true);
        expect(actions.ShowEditButton).toBe(false);
        expect(actions.ShowConfirmButton).toBe(false);
        expect(actions.ApplicationLockedReason).toBe(
            'This application was submitted on Nov 17, 2026. Its answers and documents are locked.',
        );
    });
});

describe('runner-model prefill and citation formatting', () => {
    it('formats citation chips with optional page references', () => {
        expect(FormatCitationChip({ SourceLabel: 'safety-policy.pdf', PageReference: null })).toBe(
            'safety-policy.pdf',
        );
        expect(FormatCitationChip({ SourceLabel: 'safety-policy.pdf', PageReference: '1' })).toBe(
            'safety-policy.pdf, p. 1',
        );
        expect(FormatCitationChip({ SourceLabel: 'safety-policy.pdf', PageReference: 'p. 3' })).toBe(
            'safety-policy.pdf, p. 3',
        );
    });

    it('hides Refresh prefills when CanPrefill is false or application is not Draft', () => {
        expect(ShowRefreshPrefills({ CanPrefill: true, Status: 'Draft' })).toBe(true);
        expect(ShowRefreshPrefills({ CanPrefill: false, Status: 'Draft' })).toBe(false);
        expect(ShowRefreshPrefills({ CanPrefill: true, Status: 'Submitted' })).toBe(false);
    });

    it('formats the refresh prefills summary sentence', () => {
        expect(
            FormatRefreshSummary({ Prefilled: 1, Located: 0, MarkedStale: 0, Cleared: 0, Unchanged: 2 }),
        ).toBe('1 answer drafted, 2 unchanged.');
        expect(
            FormatRefreshSummary({ Prefilled: 3, Located: 1, MarkedStale: 0, Cleared: 0, Unchanged: 0 }),
        ).toBe('3 answers drafted, 0 unchanged.');
    });
});
