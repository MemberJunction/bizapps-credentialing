import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    GetApplicationWorkspaceOperation,
    WithdrawApplicationOperation,
    type ApplicationWorkspace,
    type MySubject,
} from '@mj-biz-apps/credentialing-core';
import { StandardsRunnerPage } from '../standards-runner.page';

function createPage(): StandardsRunnerPage {
    const cdr: ChangeDetectorRef = {
        markForCheck: vi.fn(),
        detach: vi.fn(),
        detectChanges: vi.fn(),
        checkNoChanges: vi.fn(),
        reattach: vi.fn(),
    };
    const injector = Injector.create({ providers: [{ provide: ChangeDetectorRef, useValue: cdr }] });
    return runInInjectionContext(injector, () => new StandardsRunnerPage());
}

const APP_ID = 'A1111111-1111-1111-1111-111111111111';
const SEC_1 = 'SEC11111-1111-1111-1111-111111111111';
const SEC_2 = 'SEC22222-2222-2222-2222-222222222222';

const SUBJECT: MySubject = {
    SubjectID: 'B1111111-1111-1111-1111-111111111111',
    DisplayName: 'Sample Applicant One',
    SubjectType: 'Person',
    Applications: [
        {
            ApplicationID: APP_ID,
            ProgramName: 'Sample Applicant Program',
            VersionLabel: '2026',
            OrganizationName: 'Sample Body A',
            SubjectNoun: 'professional',
            Status: 'Draft',
            SubmittedAt: null,
            ConfirmedCount: 0,
            StandardCount: 2,
        },
    ],
};

function makeWorkspace(): ApplicationWorkspace {
    return {
        Application: {
            ...SUBJECT.Applications[0],
            SubjectID: SUBJECT.SubjectID,
            RequiresGoverningBodyAttestation: false,
            WithdrawalReason: null,
            CanPrefill: false,
        },
        Sections: [
            {
                SectionID: SEC_1,
                Number: '1',
                Name: 'Eligibility',
                Description: null,
                Standards: [
                    {
                        StandardID: 'ST1',
                        Code: '1.1',
                        Statement: 'Code of conduct.',
                        Guidance: null,
                        ResponseType: 'Attestation',
                        IntakeMode: 'Manual',
                        IsEligibility: true,
                        IsNewForVersion: false,
                        EvidenceHint: null,
                        Response: {
                            ResponseID: 'R1',
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
                        },
                    },
                ],
            },
            {
                SectionID: SEC_2,
                Number: '2',
                Name: 'Practice',
                Description: null,
                Standards: [],
            },
        ],
    };
}

describe('StandardsRunnerPage', () => {
    afterEach(() => vi.restoreAllMocks());

    it('loads workspace for subject, resolves section & filter, and emits URL navigation state', async () => {
        const ws = makeWorkspace();
        vi.spyOn(GetApplicationWorkspaceOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: ws,
        });

        const page = createPage();
        const navStates: unknown[] = [];
        page.SelectionChanged.subscribe((s) => navStates.push(s));
        page.Subject = SUBJECT;
        await Promise.resolve();
        await Promise.resolve();

        expect(page.Workspace?.Application.ApplicationID).toBe(APP_ID);
        expect(page.Selection.SectionID).toBe(SEC_1);
        expect(page.Selection.Filter).toBe('needs-review');
        expect(navStates).toContainEqual({
            ApplicationID: APP_ID,
            SectionID: SEC_1,
            Filter: 'needs-review',
        });

        page.OnSelectSection(SEC_2);
        page.OnSelectFilter('all');
        expect(navStates[navStates.length - 1]).toEqual({
            ApplicationID: APP_ID,
            SectionID: SEC_2,
            Filter: 'all',
        });
    });

    it('marks NotAvailable when URL names an application the subject does not hold', async () => {
        const execSpy = vi.spyOn(GetApplicationWorkspaceOperation.prototype, 'Execute');
        const page = createPage();
        page.ApplicationID = '99999999-9999-9999-9999-999999999999';
        page.Subject = SUBJECT;
        await Promise.resolve();

        expect(page.NotAvailable).toBe(true);
        expect(execSpy).not.toHaveBeenCalled();
    });

    it('updates workspace response counts in place on ResponseUpdated and supports withdrawal with reason', async () => {
        const ws = makeWorkspace();
        vi.spyOn(GetApplicationWorkspaceOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: ws,
        });
        const withdrawSpy = vi.spyOn(WithdrawApplicationOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: {
                ApplicationID: APP_ID,
                Status: 'Withdrawn',
                WithdrawnAt: '2026-11-17T12:30:00.000Z',
                WithdrawalReason: 'Deferring',
            },
        });

        const page = createPage();
        page.Subject = SUBJECT;
        await Promise.resolve();
        await Promise.resolve();

        page.OnResponseUpdated({
            ...ws.Sections[0].Standards[0].Response,
            Status: 'Confirmed',
            ConfirmedByName: 'Applicant A',
            ConfirmedAt: '2026-11-17T12:00:00.000Z',
        });
        expect(page.TotalProgress.Confirmed).toBe(1);

        page.WithdrawReason = '   ';
        await page.ConfirmWithdraw();
        expect(page.WithdrawError).toBe('Give the reason for withdrawing.');
        expect(withdrawSpy).not.toHaveBeenCalled();

        page.WithdrawReason = 'Deferring';
        await page.ConfirmWithdraw();
        expect(withdrawSpy).toHaveBeenCalledWith({ ApplicationID: APP_ID, Reason: 'Deferring' }, expect.any(Object));
    });
});
