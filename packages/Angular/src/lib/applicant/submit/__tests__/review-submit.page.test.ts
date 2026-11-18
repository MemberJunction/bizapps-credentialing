import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GetSubmissionGateOperation, type GetSubmissionGateOutput, type MySubject } from '@mj-biz-apps/credentialing-core';
import { ReviewSubmitPage } from '../review-submit.page';

const APP_ID = 'A1111111-1111-1111-1111-111111111111';

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
            StandardCount: 1,
        },
    ],
};

function makeGate(canSubmit: boolean): GetSubmissionGateOutput {
    const section = {
        Kind: 'Section' as const,
        Label: '1 Eligibility',
        Passed: canSubmit,
        Detail: canSubmit ? 'All answers confirmed.' : '1 answer not confirmed.',
        Target: { Screen: 'Standards' as const, SectionID: 'SEC-1' },
    };
    return {
        Items: [section],
        Gaps: canSubmit ? [] : [section],
        CanSubmit: canSubmit,
        Reason: canSubmit ? null : 'Confirm every answer before submitting.',
        RequiresAttestation: true,
        AttestationStatement: 'Our governing body approved this application.',
        Application: {
            ApplicationID: APP_ID,
            SubjectID: SUBJECT.SubjectID,
            SubjectName: SUBJECT.DisplayName,
            ProgramName: 'Sample Applicant Program',
            VersionLabel: '2026',
            OrganizationName: 'Sample Body A',
            Status: 'Draft',
            SubmittedAt: null,
        },
        Documents: [],
        RecordedAttestation: null,
    };
}

function createPage(): ReviewSubmitPage {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const injector = Injector.create({ providers: [{ provide: ChangeDetectorRef, useValue: cdr }] });
    return runInInjectionContext(injector, () => new ReviewSubmitPage());
}

describe('ReviewSubmitPage', () => {
    afterEach(() => vi.restoreAllMocks());

    it('re-evaluates the gate silently when RefreshKey changes and keeps the attestation being typed', async () => {
        const spy = vi
            .spyOn(GetSubmissionGateOperation.prototype, 'Execute')
            .mockResolvedValueOnce({ Success: true, ResultCode: 'SUCCESS', Output: makeGate(false) })
            .mockResolvedValueOnce({ Success: true, ResultCode: 'SUCCESS', Output: makeGate(true) });

        const page = createPage();
        page.RefreshKey = 0;
        page.Subject = SUBJECT;
        await Promise.resolve();
        await Promise.resolve();
        expect(page.Gate?.CanSubmit).toBe(false);

        page.OnAttestationChanged({ OfficerName: 'Board Chair', OfficerRole: 'Chair', ApprovalDate: '2026-11-17', Accepted: true });
        page.RefreshKey = 1;
        expect(page.IsLoading).toBe(false);
        await Promise.resolve();
        await Promise.resolve();

        expect(spy).toHaveBeenCalledTimes(2);
        expect(page.Gate?.CanSubmit).toBe(true);
        expect(page.Attestation.OfficerName).toBe('Board Chair');
    });
});
