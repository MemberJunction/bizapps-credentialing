import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReissueInvitationOperation } from '@mj-biz-apps/credentialing-core';
import { PipelineData, type PipelineContactRow, type PipelineSnapshot } from '../pipeline-data';
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
});
