import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GetMySubjectsOperation, type MySubject } from '@mj-biz-apps/credentialing-core';
import { SubjectContext } from '../../../shared/subject-context.service';
import { MyApplicationsPage } from '../my-applications.page';

const S1: MySubject = {
    SubjectID: '11111111-1111-1111-1111-111111111111',
    DisplayName: 'Sample Applicant One',
    SubjectType: 'Person',
    Applications: [
        {
            ApplicationID: 'A1111111-1111-1111-1111-111111111111',
            ProgramName: 'Sample Applicant Program',
            VersionLabel: '2026',
            OrganizationName: 'Sample Accrediting Body A',
            SubjectNoun: 'professional',
            Status: 'Draft',
            SubmittedAt: null,
            ConfirmedCount: 1,
            StandardCount: 3,
        },
    ],
};

const S2: MySubject = {
    SubjectID: '22222222-2222-2222-2222-222222222222',
    DisplayName: 'Sample Applicant Two',
    SubjectType: 'Person',
    Applications: [],
};

function createPage(subjectContext = new SubjectContext()): { page: MyApplicationsPage; subjectContext: SubjectContext } {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const injector = Injector.create({
        providers: [
            { provide: ChangeDetectorRef, useValue: cdr },
            { provide: SubjectContext, useValue: subjectContext },
        ],
    });
    const page = runInInjectionContext(injector, () => new MyApplicationsPage());
    return { page, subjectContext };
}

describe('MyApplicationsPage', () => {
    afterEach(() => vi.restoreAllMocks());

    it('auto-selects a single subject, syncs subjectId, and never lands on the picker', async () => {
        vi.spyOn(GetMySubjectsOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: { Subjects: [S1] },
        });
        const { page, subjectContext } = createPage();
        const emitted: Array<string | null> = [];
        page.SubjectSelected.subscribe((v) => emitted.push(v));

        await page.Load();
        expect(page.View.Kind).toBe('Applications');
        expect(subjectContext.SubjectID()).toBe(S1.SubjectID);
        expect(emitted).toEqual([S1.SubjectID]);
    });

    it('lands on the picker when multiple subjects exist without URL or context selection', async () => {
        vi.spyOn(GetMySubjectsOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: { Subjects: [S1, S2] },
        });
        const { page, subjectContext } = createPage();

        await page.Load();
        expect(page.View.Kind).toBe('PickSubject');
        expect(subjectContext.SubjectID()).toBeNull();

        page.SelectSubject(S2);
        expect(page.View.Kind).toBe('Applications');
        expect(subjectContext.SubjectID()).toBe(S2.SubjectID);
    });

    it('shows NotAvailable when the URL carries an unowned subjectId', async () => {
        vi.spyOn(GetMySubjectsOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: { Subjects: [S1] },
        });
        const { page } = createPage();
        page.QueryParams = { subjectId: '99999999-9999-9999-9999-999999999999' };

        await page.Load();
        expect(page.View.Kind).toBe('NotAvailable');
    });

    it('sanitizes raw SQL failures through ApplicantMessages', async () => {
        vi.spyOn(GetMySubjectsOperation.prototype, 'Execute').mockResolvedValue({
            Success: false,
            ResultCode: 'EXECUTION_ERROR',
            ErrorMessage: 'Error executing SQL Error: Invalid object name foo. Query: SELECT 1',
        });
        const { page } = createPage();

        await page.Load();
        expect(page.ErrorMessage).not.toContain('Error executing SQL');
        expect(page.ErrorMessage).toContain('could not be loaded');
    });
});
