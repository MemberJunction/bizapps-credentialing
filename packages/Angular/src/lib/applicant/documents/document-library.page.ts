/**
 * Applicant Document Library page (FRD FR-5.1 – 5.8).
 *
 * Loads `Credentialing.GetDocumentLibrary` for the active subject, renders one requirement ledger
 * per application followed by General uploads (with a drag-and-drop / picker dropzone), and hosts
 * the Document Viewer, Version History, and Attest in Lieu native dialogs.
 */
import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UUIDsEqual } from '@memberjunction/global';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import {
    MJAlertComponent,
    MJButtonDirective,
    MJEmptyStateComponent,
} from '@memberjunction/ng-ui-components';
import {
    AttestInLieuOperation,
    ConfirmDocumentCurrentOperation,
    GetDocumentLibraryOperation,
    type DocumentLibrary,
    type LedgerRow,
    type LibraryDocument,
    type MySubject,
} from '@mj-biz-apps/credentialing-core';
import { ApplicantMessages } from '../shared/applicant-messages';
import { DocumentViewerComponent } from './document-viewer.component';
import { EvidenceClient, type UploadResult } from './evidence-client';
import {
    DefaultAttestationStatement,
    FormatLibraryDate,
    FormatWhatWasRead,
} from './library-model';
import { RequirementLedgerComponent } from './requirement-ledger.component';
import { UploadDropzoneComponent } from './upload-dropzone.component';
import { VersionHistoryComponent } from './version-history.component';

@Component({
    standalone: true,
    selector: 'bizapps-cred-document-library',
    imports: [
        FormsModule,
        SharedGenericModule,
        MJAlertComponent,
        MJButtonDirective,
        MJEmptyStateComponent,
        RequirementLedgerComponent,
        UploadDropzoneComponent,
        DocumentViewerComponent,
        VersionHistoryComponent,
    ],
    templateUrl: './document-library.page.html',
    styleUrls: ['./document-library.page.scss'],
})
export class DocumentLibraryPage extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private _subject: MySubject | null = null;
    private _requestedDocumentID: string | null = null;
    private loadCounter = 0;

    @ViewChild('attestDialog') public AttestDialogRef?: ElementRef<HTMLDialogElement>;

    @Input({ required: true })
    public get Subject(): MySubject | null {
        return this._subject;
    }
    public set Subject(value: MySubject | null) {
        const changed = value?.SubjectID !== this._subject?.SubjectID;
        this._subject = value;
        if (changed) {
            this.Library = null;
            this.ErrorMessage = '';
            this.ActionErrorMessage = '';
            this.ActionSuccessMessage = '';
            this.ActiveUploadRequirementID = null;
            void this.loadLibrary();
        }
    }

    @Input()
    public get RequestedDocumentID(): string | null {
        return this._requestedDocumentID;
    }
    public set RequestedDocumentID(value: string | null) {
        const normalized = value?.trim() || null;
        if (normalized !== this._requestedDocumentID) {
            this._requestedDocumentID = normalized;
            if (normalized && this.Library) {
                this.openRequestedDocument(normalized);
            }
        }
    }

    @Output() public readonly DocumentViewed = new EventEmitter<string | null>();

    public Library: DocumentLibrary | null = null;
    public IsLoading = false;
    public ErrorMessage = '';
    public ActionErrorMessage = '';
    public ActionSuccessMessage = '';

    public ActiveUploadRequirementID: string | null = null;
    public ConfirmingDocumentID: string | null = null;
    public DownloadingDocumentID: string | null = null;

    public ViewerOpen = false;
    public ViewerDocumentID: string | null = null;
    public ViewerFileName = '';
    public ViewerContentType = '';

    public VersionsOpen = false;
    public VersionsDocument: LibraryDocument | null = null;

    public AttestTarget: LedgerRow | null = null;
    public AttestStatement = '';
    public AttestError = '';
    public IsAttesting = false;

    public FormatDate(iso: string): string {
        return FormatLibraryDate(iso);
    }

    public WhatWasRead(doc: LibraryDocument): string {
        return FormatWhatWasRead(doc);
    }

    public OnToggleUpload(requirementID: string | null): void {
        this.ActiveUploadRequirementID = requirementID;
        this.ActionErrorMessage = '';
        this.ActionSuccessMessage = '';
    }

    public async OnUploaded(result: UploadResult): Promise<void> {
        this.ActiveUploadRequirementID = null;
        this.ActionErrorMessage = '';
        this.ActionSuccessMessage = result.TextNote
            ? `Document uploaded. ${result.TextNote}`
            : 'Document uploaded.';
        await this.loadLibrary();
    }

    public async OnStillCurrent(doc: LibraryDocument): Promise<void> {
        if (this.ConfirmingDocumentID != null) return;
        this.ConfirmingDocumentID = doc.EvidenceDocumentID;
        this.ActionErrorMessage = '';
        this.ActionSuccessMessage = '';
        this.cdr.markForCheck();
        try {
            const res = await new ConfirmDocumentCurrentOperation().Execute(
                { EvidenceDocumentID: doc.EvidenceDocumentID },
                { provider: this.ProviderToUse },
            );
            if (!res.Success) {
                this.ActionErrorMessage = ApplicantMessages.ForUser(
                    res.ErrorMessage || 'Could not confirm this document.',
                    'save',
                );
                return;
            }
            this.ActionSuccessMessage = `${doc.FileName} confirmed current.`;
            await this.loadLibrary();
        } catch (err) {
            this.ActionErrorMessage = ApplicantMessages.FromError(err, 'save');
        } finally {
            this.ConfirmingDocumentID = null;
            this.cdr.markForCheck();
        }
    }

    public OpenViewer(doc: LibraryDocument): void {
        this.ViewerDocumentID = doc.EvidenceDocumentID;
        this.ViewerFileName = doc.FileName;
        this.ViewerContentType = doc.ContentType;
        this.ViewerOpen = true;
        this.DocumentViewed.emit(doc.EvidenceDocumentID);
        this.cdr.markForCheck();
    }

    public CloseViewer(): void {
        this.ViewerOpen = false;
        this.ViewerDocumentID = null;
        this.DocumentViewed.emit(null);
        this.cdr.markForCheck();
    }

    public OpenVersions(doc: LibraryDocument): void {
        this.VersionsDocument = doc;
        this.VersionsOpen = true;
        this.cdr.markForCheck();
    }

    public CloseVersions(): void {
        this.VersionsOpen = false;
        this.VersionsDocument = null;
        this.cdr.markForCheck();
    }

    public async DownloadDocument(doc: LibraryDocument): Promise<void> {
        if (this.DownloadingDocumentID != null) return;
        this.DownloadingDocumentID = doc.EvidenceDocumentID;
        this.ActionErrorMessage = '';
        this.cdr.markForCheck();
        try {
            const client = new EvidenceClient(this.ProviderToUse);
            await client.Download(doc.EvidenceDocumentID, doc.FileName);
        } catch (err) {
            this.ActionErrorMessage = ApplicantMessages.FromError(err, 'load');
        } finally {
            this.DownloadingDocumentID = null;
            this.cdr.markForCheck();
        }
    }

    public OpenAttestDialog(row: LedgerRow): void {
        this.AttestTarget = row;
        this.AttestStatement = row.Attestation?.Statement ?? DefaultAttestationStatement(row.Name);
        this.AttestError = '';
        this.cdr.markForCheck();
        const dialog = this.AttestDialogRef?.nativeElement;
        if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
            dialog.showModal();
        }
    }

    public CloseAttestDialog(): void {
        const dialog = this.AttestDialogRef?.nativeElement;
        if (dialog && dialog.open && typeof dialog.close === 'function') {
            dialog.close();
        }
        this.AttestTarget = null;
        this.AttestError = '';
        this.cdr.markForCheck();
    }

    public OnAttestDialogCancel(event: Event): void {
        event.preventDefault();
        if (!this.IsAttesting) {
            this.CloseAttestDialog();
        }
    }

    public OnAttestDialogKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Tab') return;
        const dialog = this.AttestDialogRef?.nativeElement;
        if (!dialog) return;
        const focusable = Array.from(
            dialog.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    public async ConfirmAttest(): Promise<void> {
        if (!this._subject || !this.AttestTarget || this.IsAttesting) return;
        this.IsAttesting = true;
        this.AttestError = '';
        this.cdr.markForCheck();
        try {
            const res = await new AttestInLieuOperation().Execute(
                {
                    SubjectID: this._subject.SubjectID,
                    DocumentRequirementID: this.AttestTarget.RequirementID,
                    Statement: this.AttestStatement,
                },
                { provider: this.ProviderToUse },
            );
            if (!res.Success || res.Output == null) {
                this.AttestError = ApplicantMessages.ForUser(
                    res.ErrorMessage || 'Could not record this attestation.',
                    'save',
                );
                return;
            }
            const requirementName = this.AttestTarget.Name;
            this.CloseAttestDialog();
            this.ActionSuccessMessage = `Attestation recorded for ${requirementName}.`;
            await this.loadLibrary();
        } catch (err) {
            this.AttestError = ApplicantMessages.FromError(err, 'save');
        } finally {
            this.IsAttesting = false;
            this.cdr.markForCheck();
        }
    }

    private async loadLibrary(): Promise<void> {
        if (!this._subject) return;
        const token = ++this.loadCounter;
        this.IsLoading = true;
        this.ErrorMessage = '';
        this.cdr.markForCheck();
        try {
            const res = await new GetDocumentLibraryOperation().Execute(
                { SubjectID: this._subject.SubjectID },
                { provider: this.ProviderToUse },
            );
            if (token !== this.loadCounter) return;
            if (!res.Success || res.Output == null) {
                this.ErrorMessage = ApplicantMessages.ForUser(
                    res.ErrorMessage || 'Could not load your document library.',
                    'load',
                );
                return;
            }
            this.Library = res.Output;
            if (this._requestedDocumentID) {
                this.openRequestedDocument(this._requestedDocumentID);
            }
        } catch (err) {
            if (token !== this.loadCounter) return;
            this.ErrorMessage = ApplicantMessages.FromError(err, 'load');
        } finally {
            if (token === this.loadCounter) {
                this.IsLoading = false;
                this.cdr.markForCheck();
            }
        }
    }

    private openRequestedDocument(documentID: string): void {
        if (!this.Library) return;
        for (const ledger of this.Library.Ledgers) {
            for (const row of ledger.Rows) {
                if (row.Document && UUIDsEqual(row.Document.EvidenceDocumentID, documentID)) {
                    this.OpenViewer(row.Document);
                    return;
                }
            }
        }
        const general = this.Library.General.find((d) => UUIDsEqual(d.EvidenceDocumentID, documentID));
        if (general) {
            this.OpenViewer(general);
            return;
        }
        this.ViewerDocumentID = documentID;
        this.ViewerFileName = '';
        this.ViewerContentType = '';
        this.ViewerOpen = true;
    }
}
