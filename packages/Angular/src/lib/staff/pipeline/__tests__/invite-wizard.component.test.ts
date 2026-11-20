import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InviteApplicantOperation } from '@mj-biz-apps/credentialing-core';
import { InviteWizardComponent } from '../invite-wizard.component';
import type { PipelineActiveTarget } from '../pipeline-data';

function createWizard(): InviteWizardComponent {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const injector = Injector.create({ providers: [{ provide: ChangeDetectorRef, useValue: cdr }] });
    return runInInjectionContext(injector, () => new InviteWizardComponent());
}

const TARGET: PipelineActiveTarget = {
    VersionID: 'E1111111-1111-1111-1111-111111111111',
    VersionLabel: '2026',
    ProgramID: 'F1111111-1111-1111-1111-111111111111',
    ProgramName: 'Sample Applicant Program',
    ProgramType: 'Recognition',
    SubjectType: 'Organization',
    AccreditingOrganizationID: 'A1111111-1111-1111-1111-111111111111',
    AccreditingOrganizationName: 'Sample Accrediting Body A',
};

describe('InviteWizardComponent', () => {
    afterEach(() => vi.restoreAllMocks());

    it('submits the invite operation and moves to the Result step with the manual copy message', async () => {
        const execute = vi.spyOn(InviteApplicantOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: {
                SubjectID: 'S1',
                ApplicationID: 'A1',
                ContactUserID: 'U1',
                EmailSent: false,
                InvitationUrl: 'http://localhost:4050/magic-link/redeem?token=xyz',
                ExpiresAt: '2026-11-20T12:00:00.000Z',
                InvitationNote: null,
            },
        });

        const w = createWizard();
        w.Targets = [TARGET];
        w.Visible = true;
        expect(w.Model.VersionID).toBe(TARGET.VersionID);

        w.Next();
        expect(w.Model.Step).toBe('Subject');
        w.Model.NewSubjectDisplayName = 'Sample Applicant Three';
        w.Model.NewSubjectPrimaryEmail = 'applicant.three@example.test';
        w.Next();
        expect(w.Model.Step).toBe('Contact');
        w.Model.ContactFirstName = 'Alex';
        w.Model.ContactLastName = 'Applicant';
        w.Model.ContactEmail = 'applicant.three@example.test';
        w.Next();
        expect(w.Model.Step).toBe('Review');

        const emitted = vi.fn();
        w.Invited.subscribe(emitted);
        await w.Submit();

        expect(execute).toHaveBeenCalledTimes(1);
        expect(w.Model.Step).toBe('Result');
        expect(w.Outcome?.InvitationUrl).toBe('http://localhost:4050/magic-link/redeem?token=xyz');
        expect(w.Outcome?.PrimaryMessage).toContain('Copy this link and send it to applicant.three@example.test.');
        expect(emitted).toHaveBeenCalledTimes(1);
    });

    it('keeps the wizard on Review and translates raw errors through StudioMessages', async () => {
        vi.spyOn(InviteApplicantOperation.prototype, 'Execute').mockResolvedValue({
            Success: false,
            ResultCode: 'REFUSED',
            ErrorMessage: 'This email belongs to an internal account and cannot be invited as an applicant.',
        });

        const w = createWizard();
        w.Targets = [TARGET];
        w.Visible = true;
        w.Model.Step = 'Review';
        w.Model.NewSubjectDisplayName = 'Bad';
        w.Model.NewSubjectPrimaryEmail = 'staff.b@example.test';
        w.Model.ContactFirstName = 'Staff';
        w.Model.ContactLastName = 'B';
        w.Model.ContactEmail = 'staff.b@example.test';

        await w.Submit();
        expect(w.Model.Step).toBe('Review');
        expect(w.ErrorMessage).toBe('This email belongs to an internal account and cannot be invited as an applicant.');
    });
});
