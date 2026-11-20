import '@angular/compiler';
import { ChangeDetectorRef, ElementRef, Injector, runInInjectionContext } from '@angular/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    ConfirmResponseOperation,
    SaveResponseOperation,
    type WorkspaceApplication,
    type WorkspaceStandard,
} from '@mj-biz-apps/credentialing-core';
import { StandardCardComponent } from '../standard-card.component';

function createCard(app: WorkspaceApplication, standard: WorkspaceStandard): StandardCardComponent {
    const cdr: ChangeDetectorRef = {
        markForCheck: vi.fn(),
        detach: vi.fn(),
        detectChanges: vi.fn(),
        checkNoChanges: vi.fn(),
        reattach: vi.fn(),
    };
    const injector = Injector.create({ providers: [{ provide: ChangeDetectorRef, useValue: cdr }] });
    const card = runInInjectionContext(injector, () => new StandardCardComponent());
    card.Application = app;
    card.Standard = standard;
    return card;
}

const APP_DRAFT: WorkspaceApplication = {
    ApplicationID: 'A1111111-1111-1111-1111-111111111111',
    SubjectID: 'B1111111-1111-1111-1111-111111111111',
    ProgramName: 'Sample Applicant Program',
    VersionLabel: '2026',
    OrganizationName: 'Sample Body A',
    SubjectNoun: 'professional',
    Status: 'Draft',
    SubmittedAt: null,
    ConfirmedCount: 0,
    StandardCount: 1,
    RequiresGoverningBodyAttestation: false,
    WithdrawalReason: null,
    CanPrefill: false,
};

function makeStandard(status: WorkspaceStandard['Response']['Status'] = 'Empty'): WorkspaceStandard {
    return {
        StandardID: 'S1111111-1111-1111-1111-111111111111',
        Code: '1.2',
        Statement: 'Describe current practice.',
        Guidance: 'Include years of experience.',
        ResponseType: 'Narrative',
        IntakeMode: 'Manual',
        IsEligibility: false,
        IsNewForVersion: false,
        EvidenceHint: null,
        Response: {
            ResponseID: 'R1111111-1111-1111-1111-111111111111',
            Status: status,
            ResponseText: status === 'Empty' ? null : 'Saved answer',
            SelfAssessment: status === 'Empty' ? null : 'Met',
            AuthorType: 'Human',
            ConfirmedByName: status === 'Confirmed' ? 'applicant.a@example.test' : null,
            ConfirmedAt: status === 'Confirmed' ? '2026-11-17T12:00:00.000Z' : null,
            UpdatedAt: '2026-11-17T10:00:00.000Z',
            SourceType: null,
            SourceLabel: null,
            SourceRetrievedAt: null,
            IsStale: false,
            ReopenReason: null,
            Explanation: null,
            Citations: [],
        },
    };
}

describe('StandardCardComponent', () => {
    afterEach(() => vi.restoreAllMocks());

    it('enters edit mode only via StartEdit, saves draft via SaveResponseOperation, and emits updated response', async () => {
        const card = createCard(APP_DRAFT, makeStandard('Empty'));
        const updated = {
            ...makeStandard('Drafted').Response,
            ResponseText: 'Updated draft text',
            SelfAssessment: 'Met' as const,
            UpdatedAt: '2026-11-17T10:05:00.000Z',
        };
        const execSpy = vi.spyOn(SaveResponseOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: { Response: updated },
        });
        const emitted = vi.fn();
        card.ResponseUpdated.subscribe(emitted);

        card.StartEdit();
        expect(card.IsEditing).toBe(true);
        card.DraftText = 'Updated draft text';
        card.DraftSelfAssessment = 'Met';
        expect(card.HasUnsavedEdits).toBe(true);

        await card.SaveDraft();
        expect(execSpy).toHaveBeenCalledWith(
            {
                ResponseID: 'R1111111-1111-1111-1111-111111111111',
                ResponseText: 'Updated draft text',
                SelfAssessment: 'Met',
                ExpectedUpdatedAt: '2026-11-17T10:00:00.000Z',
            },
            expect.any(Object),
        );
        expect(card.IsEditing).toBe(false);
        expect(emitted).toHaveBeenCalledWith(updated);
    });

    it('sanitizes SQL/concurrency failures on SaveDraft through ApplicantMessages', async () => {
        const card = createCard(APP_DRAFT, makeStandard('Empty'));
        vi.spyOn(SaveResponseOperation.prototype, 'Execute').mockResolvedValue({
            Success: false,
            ResultCode: 'REFUSED',
            ErrorMessage: 'Concurrent modification conflict on StandardResponse',
        });

        card.StartEdit();
        card.DraftText = 'Text';
        await card.SaveDraft();
        expect(card.ErrorMessage).toBe('This record was changed by someone else. Reload it and try again.');
        expect(card.IsEditing).toBe(true);
    });

    it('confirms a saved draft inside the confirm dialog and emits Confirmed response', async () => {
        const card = createCard(APP_DRAFT, makeStandard('Drafted'));
        const confirmed = makeStandard('Confirmed').Response;
        const confirmSpy = vi.spyOn(ConfirmResponseOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: { Response: confirmed },
        });
        const emitted = vi.fn();
        card.ResponseUpdated.subscribe(emitted);

        card.OpenConfirmDialog();
        expect(card.IsConfirmDialogOpen).toBe(true);

        await card.ConfirmAnswer();
        expect(confirmSpy).toHaveBeenCalledWith(
            {
                ResponseID: 'R1111111-1111-1111-1111-111111111111',
                ExpectedUpdatedAt: '2026-11-17T10:00:00.000Z',
            },
            expect.any(Object),
        );
        expect(card.IsConfirmDialogOpen).toBe(false);
        expect(emitted).toHaveBeenCalledWith(confirmed);
    });

    it('moves keyboard focus into the answer box on Edit answer and back to Edit answer on Cancel', () => {
        vi.useFakeTimers();
        try {
            const card = createCard(APP_DRAFT, makeStandard('Drafted'));
            const answerBox = { focus: vi.fn() };
            const editButton = { focus: vi.fn() };
            card.AnswerInputRef = new ElementRef(answerBox);
            card.EditTriggerRef = new ElementRef(editButton);

            card.StartEdit();
            vi.runAllTimers();
            expect(answerBox.focus).toHaveBeenCalledTimes(1);

            card.CancelEdit();
            vi.runAllTimers();
            expect(editButton.focus).toHaveBeenCalledTimes(1);
        } finally {
            vi.useRealTimers();
        }
    });

    it('refuses StartEdit when response is Confirmed or application is Submitted', () => {
        const confirmedCard = createCard(APP_DRAFT, makeStandard('Confirmed'));
        confirmedCard.StartEdit();
        expect(confirmedCard.IsEditing).toBe(false);

        const submittedCard = createCard(
            { ...APP_DRAFT, Status: 'Submitted', SubmittedAt: '2026-11-17T12:00:00.000Z' },
            makeStandard('Drafted'),
        );
        submittedCard.StartEdit();
        expect(submittedCard.IsEditing).toBe(false);
    });

    it('toggles evidence upload on an Evidence standard and opens citation viewer on text tab', () => {
        const evidenceStd: WorkspaceStandard = {
            ...makeStandard('Located'),
            ResponseType: 'Evidence',
            Response: {
                ...makeStandard('Located').Response,
                Citations: [
                    {
                        CitationID: 'C-1',
                        EvidenceDocumentID: 'D1111111-1111-1111-1111-111111111111',
                        SourceLabel: 'safety-policy.pdf',
                        PageReference: 'p. 1',
                        Excerpt: 'Quoted passage.',
                        StartOffset: 0,
                        EndOffset: 15,
                    },
                ],
            },
        };
        const card = createCard(APP_DRAFT, evidenceStd);

        card.ToggleEvidenceUpload();
        expect(card.ShowEvidenceUpload).toBe(true);
        card.OnEvidenceUploaded({ EvidenceDocumentID: 'D-2', TextStatus: 'Extracted', TextNote: null });
        expect(card.ShowEvidenceUpload).toBe(false);
        expect(card.UploadedDocument?.EvidenceDocumentID).toBe('D-2');

        card.OpenCitation(evidenceStd.Response.Citations[0]);
        expect(card.ViewerOpen).toBe(true);
        expect(card.ViewerInitialTab).toBe('text');
        expect(card.ViewerDocumentID).toBe('D1111111-1111-1111-1111-111111111111');
        expect(card.ViewerCitation?.Excerpt).toBe('Quoted passage.');
        card.CloseViewer();
        expect(card.ViewerOpen).toBe(false);
    });

    it('exposes Task 10 provenance, stale, located, and citation chip copy helpers', () => {
        const card = createCard(APP_DRAFT, makeStandard('Prefilled'));
        expect(card.StaleSourceSentence).toBe('Source changed since this was drafted');
        expect(card.LocatedPassagesSentence).toBe('The assistant found these passages. Write your answer.');
        expect(
            card.FormatChip({
                CitationID: 'C-1',
                EvidenceDocumentID: 'D-1',
                SourceLabel: 'safety-policy.pdf',
                PageReference: '2',
                Excerpt: 'Excerpt.',
                StartOffset: 0,
                EndOffset: 8,
            }),
        ).toBe('safety-policy.pdf, p. 2');
    });
});
