import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RunView } from '@memberjunction/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    AttestInLieuOperation,
    ConfirmDocumentCurrentOperation,
    GetDocumentLibraryOperation,
    RequeueReadingOperation,
    type DocumentLibrary,
    type MySubject,
} from '@mj-biz-apps/credentialing-core';
import { DocumentLibraryPage } from '../document-library.page';
import { DocumentViewerComponent } from '../document-viewer.component';
import { EvidenceClient } from '../evidence-client';

const SUBJECT: MySubject = {
    SubjectID: 'S1111111-1111-1111-1111-111111111111',
    DisplayName: 'Sample Evidence Applicant',
    SubjectType: 'Person',
    Applications: [],
};

const LIBRARY: DocumentLibrary = {
    Ledgers: [
        {
            ProgramName: 'Sample Evidence Program',
            VersionLabel: '2026',
            ApplicationID: 'A1111111-1111-1111-1111-111111111111',
            ApplicationStatus: 'Draft',
            Rows: [
                {
                    RequirementID: 'REQ-1',
                    Name: 'Written safety policy',
                    Description: null,
                    IsRequired: true,
                    RestrictedAllowed: false,
                    Document: {
                        EvidenceDocumentID: 'D1111111-1111-1111-1111-111111111111',
                        FileName: 'safety-policy.pdf',
                        ContentType: 'application/pdf',
                        UploadedAt: '2026-11-17T10:00:00.000Z',
                        UploadedByName: 'Applicant Evidence',
                        Status: 'Confirm Current',
                        ContentHash: 'b'.repeat(64),
                        TextStatus: 'Extracted',
                        TextNote: null,
                        ReadingStatus: 'Pending',
                        ReadingNote: null,
                        CitationCount: 0,
                        Versions: [
                            {
                                EvidenceDocumentID: 'D1111111-1111-1111-1111-111111111111',
                                UploadedAt: '2026-11-17T10:00:00.000Z',
                                UploadedByName: 'Applicant Evidence',
                                ContentHash: 'b'.repeat(64),
                                OrderIsRecorded: true,
                            },
                        ],
                    },
                    Attestation: null,
                    Locked: false,
                    LockedReason: null,
                },
                {
                    RequirementID: 'REQ-2',
                    Name: 'Confidential board minutes',
                    Description: null,
                    IsRequired: true,
                    RestrictedAllowed: true,
                    Document: null,
                    Attestation: null,
                    Locked: false,
                    LockedReason: null,
                },
            ],
        },
    ],
    General: [],
};

function createLibraryPage(): DocumentLibraryPage {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const injector = Injector.create({ providers: [{ provide: ChangeDetectorRef, useValue: cdr }] });
    return runInInjectionContext(injector, () => new DocumentLibraryPage());
}

function createViewer(): DocumentViewerComponent {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const sanitizer = {
        bypassSecurityTrustResourceUrl: (v: string) => v,
        bypassSecurityTrustUrl: (v: string) => v,
    };
    const injector = Injector.create({
        providers: [
            { provide: ChangeDetectorRef, useValue: cdr },
            { provide: DomSanitizer, useValue: sanitizer },
        ],
    });
    return runInInjectionContext(injector, () => new DocumentViewerComponent());
}

describe('DocumentLibraryPage and DocumentViewerComponent', () => {
    afterEach(() => vi.restoreAllMocks());

    it('loads library on Subject set, confirms current document, and records attestation', async () => {
        const libSpy = vi.spyOn(GetDocumentLibraryOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: LIBRARY,
        });
        const confirmSpy = vi.spyOn(ConfirmDocumentCurrentOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: {
                EvidenceDocumentID: 'D1111111-1111-1111-1111-111111111111',
                Status: 'Current',
                ConfirmedCurrentAt: '2026-11-17T12:00:00.000Z',
            },
        });
        const attestSpy = vi.spyOn(AttestInLieuOperation.prototype, 'Execute').mockResolvedValue({
            Success: true,
            ResultCode: 'SUCCESS',
            Output: {
                DocumentAttestationID: 'ATT-1',
                SupersededAttestationID: null,
                AttestedAt: '2026-11-17T12:05:00.000Z',
            },
        });

        const page = createLibraryPage();
        page.Subject = SUBJECT;
        await Promise.resolve();
        await Promise.resolve();

        expect(libSpy).toHaveBeenCalledWith({ SubjectID: SUBJECT.SubjectID }, expect.any(Object));
        expect(page.Library?.Ledgers[0].Rows).toHaveLength(2);

        await page.OnStillCurrent(LIBRARY.Ledgers[0].Rows[0].Document!);
        expect(confirmSpy).toHaveBeenCalledWith(
            { EvidenceDocumentID: 'D1111111-1111-1111-1111-111111111111' },
            expect.any(Object),
        );
        expect(page.ActionSuccessMessage).toContain('confirmed current');

        page.OpenAttestDialog(LIBRARY.Ledgers[0].Rows[1]);
        expect(page.AttestStatement).toBe(
            'I attest that Confidential board minutes exists and is maintained, and can be shown to a reviewer on request.',
        );
        await page.ConfirmAttest();
        expect(attestSpy).toHaveBeenCalledWith(
            {
                SubjectID: SUBJECT.SubjectID,
                DocumentRequirementID: 'REQ-2',
                Statement: 'I attest that Confidential board minutes exists and is maintained, and can be shown to a reviewer on request.',
            },
            expect.any(Object),
        );
        expect(page.ActionSuccessMessage).toContain('Attestation recorded');
        page.ngOnDestroy();
    });

    it('reloads the library silently when RefreshKey changes', async () => {
        const settled: DocumentLibrary = { ...LIBRARY, Ledgers: [] };
        const libSpy = vi
            .spyOn(GetDocumentLibraryOperation.prototype, 'Execute')
            .mockResolvedValueOnce({ Success: true, ResultCode: 'SUCCESS', Output: settled })
            .mockResolvedValueOnce({ Success: true, ResultCode: 'SUCCESS', Output: LIBRARY });

        const page = createLibraryPage();
        page.RefreshKey = 0;
        page.Subject = SUBJECT;
        await Promise.resolve();
        await Promise.resolve();
        expect(libSpy).toHaveBeenCalledTimes(1);

        page.RefreshKey = 1;
        expect(page.IsLoading).toBe(false);
        await Promise.resolve();
        await Promise.resolve();
        expect(libSpy).toHaveBeenCalledTimes(2);
        expect(page.Library?.Ledgers).toHaveLength(1);
        page.ngOnDestroy();
    });

    it('reloads every 5 seconds while a document is being read, stops when none is, and Read again requeues and reloads', async () => {
        vi.useFakeTimers();
        try {
            const withStatus = (status: 'Pending' | 'Running' | 'Complete' | 'Could Not Run'): DocumentLibrary => ({
                ...LIBRARY,
                Ledgers: [
                    {
                        ...LIBRARY.Ledgers[0],
                        Rows: [{ ...LIBRARY.Ledgers[0].Rows[0], Document: { ...LIBRARY.Ledgers[0].Rows[0].Document!, ReadingStatus: status, ReadingNote: status === 'Could Not Run' ? 'No AI model is available on this server.' : null } }],
                    },
                ],
            });
            const answers = [withStatus('Pending'), withStatus('Running'), withStatus('Complete'), withStatus('Could Not Run'), withStatus('Pending'), withStatus('Complete')];
            const libSpy = vi.spyOn(GetDocumentLibraryOperation.prototype, 'Execute').mockImplementation(async () => ({ Success: true, ResultCode: 'SUCCESS', Output: answers.shift() ?? withStatus('Complete') }));
            const requeueSpy = vi.spyOn(RequeueReadingOperation.prototype, 'Execute').mockResolvedValue({
                Success: true,
                ResultCode: 'SUCCESS',
                Output: { EvidenceDocumentID: 'D1111111-1111-1111-1111-111111111111', ReadingStatus: 'Pending', ReadingNote: null },
            });
            const page = createLibraryPage();
            page.Subject = SUBJECT;
            await vi.advanceTimersByTimeAsync(0);
            expect(libSpy).toHaveBeenCalledTimes(1);
            await vi.advanceTimersByTimeAsync(4999);
            expect(libSpy).toHaveBeenCalledTimes(1);
            await vi.advanceTimersByTimeAsync(1);
            expect(libSpy).toHaveBeenCalledTimes(2);
            await vi.advanceTimersByTimeAsync(5000);
            expect(libSpy).toHaveBeenCalledTimes(3);
            expect(page.Library?.Ledgers[0].Rows[0].Document?.ReadingStatus).toBe('Complete');
            await vi.advanceTimersByTimeAsync(20000);
            expect(libSpy).toHaveBeenCalledTimes(3);

            // A Could Not Run document: Read again requeues it and polling resumes until it completes.
            page.Subject = null;
            page.Subject = SUBJECT;
            await vi.advanceTimersByTimeAsync(0);
            const couldNot = page.Library?.Ledgers[0].Rows[0].Document;
            expect(couldNot?.ReadingStatus).toBe('Could Not Run');
            expect(page.CanReadAgain(couldNot!)).toBe(true);
            await page.OnReadAgain(couldNot!);
            expect(requeueSpy).toHaveBeenCalledWith({ EvidenceDocumentID: 'D1111111-1111-1111-1111-111111111111' }, expect.any(Object));
            expect(page.ActionSuccessMessage).toBe('The assistant will read safety-policy.pdf again.');
            expect(page.Library?.Ledgers[0].Rows[0].Document?.ReadingStatus).toBe('Pending');
            await vi.advanceTimersByTimeAsync(5000);
            expect(page.Library?.Ledgers[0].Rows[0].Document?.ReadingStatus).toBe('Complete');
            const calls = libSpy.mock.calls.length;
            page.ngOnDestroy();
            await vi.advanceTimersByTimeAsync(30000);
            expect(libSpy.mock.calls.length).toBe(calls);
        } finally {
            vi.useRealTimers();
        }
    });

    it('opens the viewer dialog only while it is in the document', async () => {
        vi.spyOn(EvidenceClient.prototype, 'Fetch').mockResolvedValue(new Blob([]));
        vi.spyOn(RunView, 'FromMetadataProvider').mockReturnValue({
            RunView: vi.fn().mockResolvedValue({ Success: true, Results: [] }),
        } as unknown as ReturnType<typeof RunView.FromMetadataProvider>);
        for (const connected of [false, true]) {
            const viewer = createViewer();
            viewer.Provider = { ConfigData: { URL: 'http://localhost:4050/', Token: 'tok' } } as unknown as DocumentViewerComponent['Provider'];
            const showModal = vi.fn();
            viewer.DialogRef = { nativeElement: { isConnected: connected, open: false, showModal } as unknown as HTMLDialogElement };
            viewer.DocumentID = 'D1111111-1111-1111-1111-111111111111';
            viewer.Visible = true;
            await new Promise((r) => setTimeout(r, 0));
            expect(showModal).toHaveBeenCalledTimes(connected ? 1 : 0);
        }
    });

    it('revokes blob URLs on viewer close and highlights matching cited text', async () => {
        const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost:4251/doc-1');
        const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

        vi.spyOn(EvidenceClient.prototype, 'Fetch').mockResolvedValue(
            new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46])], { type: 'application/pdf' }),
        );
        vi.spyOn(RunView, 'FromMetadataProvider').mockReturnValue({
            RunView: vi.fn().mockResolvedValue({
                Success: true,
                Results: [
                    {
                        ID: 'D1111111-1111-1111-1111-111111111111',
                        FileName: 'safety-policy.pdf',
                        ContentType: 'application/pdf',
                        TextStatus: 'Extracted',
                        TextNote: null,
                        ExtractedText: 'Intro. The practice reviews its policy annually. End.',
                    },
                ],
            }),
        } as unknown as ReturnType<typeof RunView.FromMetadataProvider>);

        const viewer = createViewer();
        viewer.Provider = { ConfigData: { URL: 'http://localhost:4050/', Token: 'tok' } } as unknown as DocumentViewerComponent['Provider'];
        viewer.DocumentID = 'D1111111-1111-1111-1111-111111111111';
        viewer.Citation = {
            Excerpt: 'The practice reviews its policy annually.',
            StartOffset: 7,
            EndOffset: 48,
        };
        viewer.InitialTab = 'original';
        viewer.Visible = true;

        await new Promise((r) => setTimeout(r, 10));
        expect(createUrlSpy).toHaveBeenCalledTimes(1);
        expect(viewer.HasBlobLoaded).toBe(true);
        expect(viewer.Highlight).toEqual({
            Found: true,
            Before: 'Intro. ',
            Match: 'The practice reviews its policy annually.',
            After: ' End.',
        });

        viewer.Close();
        expect(revokeUrlSpy).toHaveBeenCalledWith('blob:http://localhost:4251/doc-1');
        expect(viewer.SafePdfUrl).toBeNull();
    });
});
