import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    GetApplicationWorkspaceOperation,
    ReissueInvitationOperation,
    ReopenResponseOperation,
    WithdrawApplicationOperation,
    type ApplicationWorkspace,
} from '@mj-biz-apps/credentialing-core';
import { PipelineData, type PipelineApplicationRow, type PipelineContactRow, type PipelineSnapshot } from '../pipeline-data';
import { PipelinePage } from '../pipeline.page';

function createPage(): PipelinePage {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const injector = Injector.create({ providers: [{ provide: ChangeDetectorRef, useValue: cdr }] });
    return runInInjectionContext(injector, () => new PipelinePage());
}

describe('PipelinePage', () => {
    afterEach(() => vi.restoreAllMocks());

    it('opens the reissue result dialog with the formatted link and reloads the pipeline', async () => {
        const emptySnapshot: PipelineSnapshot = { Applications: [], Programs: [], ActiveTargets: [], Subjects: [] };
        const loadSpy = vi.spyOn(PipelineData.prototype, 'Load').mockResolvedValue(emptySnapshot);
        vi.spyOn(ReissueInvitationOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: {
                EmailSent: false,
                InvitationUrl: 'http://localhost:4050/magic-link/redeem?token=newlink',
                ExpiresAt: '2026-11-20T12:00:00.000Z',
                InvitationNote: null,
            },
        });

        const page = createPage();
        const contact: PipelineContactRow = {
            ID: 'SC-1',
            SubjectID: 'S-1',
            UserID: 'U-1',
            Email: 'applicant.three@example.test',
            ContactRole: 'Primary',
            LastInvitedAt: null,
        };

        await page.Reissue(contact);
        expect(page.ReissueDialogOpen).toBe(true);
        expect(page.ReissueOutcome?.InvitationUrl).toBe('http://localhost:4050/magic-link/redeem?token=newlink');
        expect(page.ReissueOutcome?.PrimaryMessage).toContain('Copy this link and send it to applicant.three@example.test.');
        expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('loads application detail, reopens a confirmed answer with reason, and withdraws with reason', async () => {
        const ws: ApplicationWorkspace = {
            Application: {
                ApplicationID: 'APP-1',
                SubjectID: 'S-1',
                ProgramName: 'Sample Applicant Program',
                VersionLabel: '2026',
                OrganizationName: 'Sample Body A',
                SubjectNoun: 'professional',
                Status: 'Draft',
                SubmittedAt: null,
                ConfirmedCount: 1,
                StandardCount: 1,
                RequiresGoverningBodyAttestation: false,
                WithdrawalReason: null,
                CanPrefill: false,
            },
            Sections: [
                {
                    SectionID: 'SEC-1',
                    Number: '1',
                    Name: 'Practice',
                    Description: null,
                    Standards: [
                        {
                            StandardID: 'ST-1',
                            Code: '1.1',
                            Statement: 'Code of conduct.',
                            Guidance: null,
                            ResponseType: 'Attestation',
                            IntakeMode: 'Manual',
                            IsEligibility: false,
                            IsNewForVersion: false,
                            EvidenceHint: null,
                            Response: {
                                ResponseID: 'R-1',
                                Status: 'Confirmed',
                                ResponseText: 'Agreed',
                                SelfAssessment: 'Met',
                                AuthorType: 'Human',
                                ConfirmedByName: 'Applicant A',
                                ConfirmedAt: '2026-11-17T10:00:00.000Z',
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
            ],
        };

        vi.spyOn(GetApplicationWorkspaceOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: ws,
        });
        const reopenSpy = vi.spyOn(ReopenResponseOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: {
                Response: {
                    ...ws.Sections[0].Standards[0].Response,
                    Status: 'Drafted',
                    ConfirmedByName: null,
                    ConfirmedAt: null,
                    ReopenReason: 'Clarify scope',
                },
            },
        });
        const withdrawSpy = vi.spyOn(WithdrawApplicationOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: {
                ApplicationID: 'APP-1',
                Status: 'Withdrawn',
                WithdrawnAt: '2026-11-17T12:00:00.000Z',
                WithdrawalReason: 'Applicant requested withdrawal',
            },
        });
        vi.spyOn(PipelineData.prototype, 'Load').mockResolvedValue({
            Applications: [],
            Programs: [],
            ActiveTargets: [],
            Subjects: [],
        });

        const page = createPage();
        const row: PipelineApplicationRow = {
            ID: 'APP-1',
            SubjectID: 'S-1',
            SubjectName: 'Sample Applicant One',
            SubjectType: 'Person',
            ProgramVersionID: 'V-1',
            ProgramID: 'P-1',
            ProgramName: 'Sample Applicant Program',
            VersionLabel: '2026',
            OrganizationID: 'O-1',
            Status: 'Draft',
            IsHistorical: false,
            SubmittedAt: null,
            CreatedAt: '2026-11-17T09:00:00.000Z',
            Contacts: [],
        };

        await page.OpenDetail(row);
        expect(page.DetailWorkspace?.Application.ApplicationID).toBe('APP-1');
        expect(page.CanReopen('Draft', 'Confirmed')).toBe(true);

        page.OpenReopenDialog(ws.Sections[0].Standards[0]);
        page.ReopenReason = '   ';
        await page.ConfirmReopen();
        expect(page.ReopenError).toBe('Give the reason for reopening this answer.');
        expect(reopenSpy).not.toHaveBeenCalled();

        page.ReopenReason = 'Clarify scope';
        await page.ConfirmReopen();
        expect(reopenSpy).toHaveBeenCalledWith({ ResponseID: 'R-1', Reason: 'Clarify scope' }, expect.any(Object));
        expect(page.ReopenDialogOpen).toBe(false);
        expect(page.DetailWorkspace?.Sections[0].Standards[0].Response.Status).toBe('Drafted');

        page.OpenWithdrawDialog();
        page.WithdrawReason = 'Applicant requested withdrawal';
        await page.ConfirmWithdraw();
        expect(withdrawSpy).toHaveBeenCalledWith(
            { ApplicationID: 'APP-1', Reason: 'Applicant requested withdrawal' },
            expect.any(Object),
        );
        expect(page.WithdrawDialogOpen).toBe(false);
    });
});
