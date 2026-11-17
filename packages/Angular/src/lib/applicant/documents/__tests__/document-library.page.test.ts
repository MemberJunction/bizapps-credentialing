import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RunView } from '@memberjunction/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    AttestInLieuOperation,
    ConfirmDocumentCurrentOperation,
    GetDocumentLibraryOperation,
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
