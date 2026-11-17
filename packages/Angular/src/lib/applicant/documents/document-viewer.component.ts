/**
 * Native `<dialog>` document viewer with `Original` and `Extracted text` tabs (FRD FR-5.8).
 *
 * Fetches original bytes through `EvidenceClient.Fetch` into an object URL (revoked on close and
 * destroy), loads extracted text via `RunView` on `EvidenceDocument`, renders PDFs in `<iframe>`,
 * PNG/JPEG inline in `<img>`, other types as download-only, and highlights cited excerpts safely as
 * plain text (never `[innerHTML]`).
 */
import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnDestroy,
    Output,
    ViewChild,
    inject,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl, type SafeUrl } from '@angular/platform-browser';
import { RunView } from '@memberjunction/core';
import { EscapeSQLString, IsValidUUID } from '@memberjunction/global';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJButtonDirective } from '@memberjunction/ng-ui-components';
import { CredentialingEntity, NOT_FOUND_REASON } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingEvidenceDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import { ApplicantMessages } from '../shared/applicant-messages';
import {
    DocumentPreviewKind,
    RECOGNIZED_SCAN_NOTE,
    SplitForHighlight,
    UNSUPPORTED_PREVIEW_MESSAGE,
    type HighlightSplit,
    type PreviewKind,
} from './document-viewer-model';
import { EvidenceClient } from './evidence-client';

type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;

/** Tab selection inside the document viewer. */
export type ViewerTab = 'original' | 'text';

/** Optional citation to verify and highlight inside the Extracted text tab. */
export interface ViewerCitation {
    SourceLabel?: string;
    PageReference?: string | null;
    Excerpt: string;
    StartOffset: number;
    EndOffset: number;
}

interface DocumentTextRecord {
    ID: string;
    FileName: string;
    ContentType: string;
    TextStatus: EvidenceDocumentEntity['TextStatus'];
    TextNote: string | null;
    ExtractedText: string | null;
}

@Component({
    standalone: true,
    selector: 'bizapps-cred-document-viewer',
    imports: [SharedGenericModule, MJAlertComponent, MJButtonDirective],
    templateUrl: './document-viewer.component.html',
    styleUrls: ['./document-viewer.component.scss'],
})
export class DocumentViewerComponent extends BaseAngularComponent implements OnDestroy {
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly sanitizer = inject(DomSanitizer);

    private _visible = false;
    private _documentID: string | null = null;
    private _initialTab: ViewerTab = 'original';
    private _citation: ViewerCitation | null = null;
    private rawBlobUrl: string | null = null;
    private openEpoch = 0;

    @ViewChild('viewerDialog') public DialogRef?: ElementRef<HTMLDialogElement>;
    @ViewChild('citedMark') public CitedMarkRef?: ElementRef<HTMLElement>;

    @Input() public FileNameHint = '';
    @Input() public ContentTypeHint = '';

    @Input()
    public get DocumentID(): string | null {
        return this._documentID;
    }
    public set DocumentID(value: string | null) {
        const normalized = value?.trim() || null;
        if (normalized !== this._documentID) {
            this._documentID = normalized;
            if (this._visible) {
                void this.loadForOpen();
            }
        }
    }

    @Input()
    public get Citation(): ViewerCitation | null {
        return this._citation;
    }
    public set Citation(value: ViewerCitation | null) {
        this._citation = value;
        this.recomputeHighlight();
    }

    @Input()
    public get InitialTab(): ViewerTab {
        return this._initialTab;
    }
    public set InitialTab(value: ViewerTab) {
        this._initialTab = value;
    }

    @Input()
    public get Visible(): boolean {
        return this._visible;
    }
    public set Visible(value: boolean) {
        if (value === this._visible) return;
        this._visible = value;
        if (value) {
            this.ActiveTab = this._initialTab;
            Promise.resolve().then(() => {
                this.showModal();
                void this.loadForOpen();
            });
        } else {
            this.teardown();
        }
    }

    @Output() public readonly Closed = new EventEmitter<void>();

    public readonly UnsupportedMessage = UNSUPPORTED_PREVIEW_MESSAGE;

    public ActiveTab: ViewerTab = 'original';
    public DisplayFileName = '';
    public DisplayContentType = '';
    public TextStatus: EvidenceDocumentEntity['TextStatus'] | null = null;
    public TextNote: string | null = null;
    public ExtractedText: string | null = null;
    public Highlight: HighlightSplit | null = null;

    public IsLoadingText = false;
    public TextError = '';
    public IsLoadingOriginal = false;
    public OriginalError = '';
    public IsDownloading = false;

    public SafePdfUrl: SafeResourceUrl | null = null;
    public SafeImageUrl: SafeUrl | null = null;
    public HasBlobLoaded = false;

    public get PreviewKind(): PreviewKind {
        return DocumentPreviewKind(this.DisplayContentType, this.DisplayFileName);
    }

    public get EffectiveTextNote(): string | null {
        if (this.TextNote && this.TextNote.trim().length > 0) {
            return this.TextNote;
        }
        if (this.TextStatus === 'Recognized') {
            return RECOGNIZED_SCAN_NOTE;
        }
        return null;
    }

    public ngOnDestroy(): void {
        this.revokeBlobUrl();
    }

    public SelectTab(tab: ViewerTab): void {
        if (this.ActiveTab === tab) return;
        this.ActiveTab = tab;
        this.cdr.markForCheck();
        if (tab === 'original' && !this.HasBlobLoaded && !this.IsLoadingOriginal && this._visible) {
            void this.loadOriginal(this.openEpoch);
        } else if (tab === 'text') {
            this.scheduleScrollToHighlight();
        }
    }

    public OnTabKeydown(event: KeyboardEvent): void {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            this.SelectTab(this.ActiveTab === 'original' ? 'text' : 'original');
        }
    }

    public Close(): void {
        this._visible = false;
        this.teardown();
        this.Closed.emit();
    }

    public OnDialogCancel(event: Event): void {
        event.preventDefault();
        this.Close();
    }

    public OnDialogKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Tab') return;
        const dialog = this.DialogRef?.nativeElement;
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

    public async DownloadOriginal(): Promise<void> {
        if (!this._documentID || this.IsDownloading) return;
        this.IsDownloading = true;
        this.OriginalError = '';
        this.cdr.markForCheck();
        try {
            const client = new EvidenceClient(this.ProviderToUse);
            await client.Download(this._documentID, this.DisplayFileName || 'document');
        } catch (err) {
            this.OriginalError = ApplicantMessages.FromError(err, 'load');
        } finally {
            this.IsDownloading = false;
            this.cdr.markForCheck();
        }
    }

    private async loadForOpen(): Promise<void> {
        const epoch = ++this.openEpoch;
        this.revokeBlobUrl();
        this.DisplayFileName = this.FileNameHint;
        this.DisplayContentType = this.ContentTypeHint;
        this.TextStatus = null;
        this.TextNote = null;
        this.ExtractedText = null;
        this.Highlight = null;
        this.TextError = '';
        this.OriginalError = '';
        this.HasBlobLoaded = false;

        if (!this._documentID || !IsValidUUID(this._documentID)) {
            this.TextError = NOT_FOUND_REASON;
            this.OriginalError = NOT_FOUND_REASON;
            this.cdr.markForCheck();
            return;
        }

        const tasks: Promise<void>[] = [this.loadMetadataAndText(epoch)];
        if (this.ActiveTab === 'original') {
            tasks.push(this.loadOriginal(epoch));
        }
        await Promise.all(tasks);
    }

    private async loadMetadataAndText(epoch: number): Promise<void> {
        if (!this._documentID) return;
        this.IsLoadingText = true;
        this.TextError = '';
        this.cdr.markForCheck();
        try {
            const rv = RunView.FromMetadataProvider(this.ProviderToUse);
            const result = await rv.RunView<DocumentTextRecord>({
                EntityName: CredentialingEntity.EvidenceDocument,
                ExtraFilter: `ID = '${EscapeSQLString(this._documentID)}'`,
                Fields: ['ID', 'FileName', 'ContentType', 'TextStatus', 'TextNote', 'ExtractedText'],
                ResultType: 'simple',
                MaxRows: 1,
                SkipTotalRowCount: true,
            });
            if (epoch !== this.openEpoch) return;
            if (!result.Success) {
                this.TextError = ApplicantMessages.ForUser(result.ErrorMessage || 'Could not load extracted text.', 'load');
                return;
            }
            const row = result.Results?.[0];
            if (row == null) {
                this.TextError = NOT_FOUND_REASON;
                return;
            }
            this.DisplayFileName = row.FileName;
            this.DisplayContentType = row.ContentType;
            this.TextStatus = row.TextStatus;
            this.TextNote = row.TextNote ?? null;
            this.ExtractedText = row.ExtractedText ?? null;
            this.recomputeHighlight();
            if (this.ActiveTab === 'text') {
                this.scheduleScrollToHighlight();
            }
        } catch (err) {
            if (epoch !== this.openEpoch) return;
            this.TextError = ApplicantMessages.FromError(err, 'load');
        } finally {
            if (epoch === this.openEpoch) {
                this.IsLoadingText = false;
                this.cdr.markForCheck();
            }
        }
    }

    private async loadOriginal(epoch: number): Promise<void> {
        if (!this._documentID) return;
        this.IsLoadingOriginal = true;
        this.OriginalError = '';
        this.cdr.markForCheck();
        try {
            const client = new EvidenceClient(this.ProviderToUse);
            const blob = await client.Fetch(this._documentID);
            if (epoch !== this.openEpoch) return;
            if (!this.DisplayContentType && blob.type) {
                this.DisplayContentType = blob.type;
            }
            this.HasBlobLoaded = true;
            const kind = this.PreviewKind;
            if (kind === 'pdf' || kind === 'image') {
                this.revokeBlobUrl();
                this.rawBlobUrl = URL.createObjectURL(blob);
                if (kind === 'pdf') {
                    this.SafePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.rawBlobUrl);
                    this.SafeImageUrl = null;
                } else {
                    this.SafeImageUrl = this.sanitizer.bypassSecurityTrustUrl(this.rawBlobUrl);
                    this.SafePdfUrl = null;
                }
            }
        } catch (err) {
            if (epoch !== this.openEpoch) return;
            this.OriginalError = ApplicantMessages.FromError(err, 'load');
        } finally {
            if (epoch === this.openEpoch) {
                this.IsLoadingOriginal = false;
                this.cdr.markForCheck();
            }
        }
    }

    private recomputeHighlight(): void {
        if (this.ExtractedText == null || this._citation == null) {
            this.Highlight = null;
            return;
        }
        this.Highlight = SplitForHighlight(
            this.ExtractedText,
            this._citation.StartOffset,
            this._citation.EndOffset,
            this._citation.Excerpt,
        );
    }

    private scheduleScrollToHighlight(): void {
        if (this.Highlight?.Found !== true) return;
        Promise.resolve().then(() => {
            const el = this.CitedMarkRef?.nativeElement;
            if (el && typeof el.scrollIntoView === 'function') {
                el.scrollIntoView({ block: 'center' });
            }
        });
    }

    /**
     * Opens the dialog. The open is queued a microtask after `Visible` turns true, and the host may have
     * removed the component from the page by then (Explorer restoring a saved tab and switching away):
     * `showModal` on a dialog that is not in the document throws `InvalidStateError`, so a detached
     * dialog is left closed.
     */
    private showModal(): void {
        const dialog = this.DialogRef?.nativeElement;
        if (dialog && dialog.isConnected && !dialog.open && typeof dialog.showModal === 'function') {
            dialog.showModal();
        }
        this.cdr.markForCheck();
    }

    private teardown(): void {
        this.openEpoch++;
        this.revokeBlobUrl();
        this.HasBlobLoaded = false;
        const dialog = this.DialogRef?.nativeElement;
        if (dialog && dialog.open && typeof dialog.close === 'function') {
            dialog.close();
        }
    }

    private revokeBlobUrl(): void {
        if (this.rawBlobUrl != null) {
            URL.revokeObjectURL(this.rawBlobUrl);
            this.rawBlobUrl = null;
        }
        this.SafePdfUrl = null;
        this.SafeImageUrl = null;
    }
}
