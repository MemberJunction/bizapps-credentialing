/**
 * Native `<dialog>` showing a document's version chain (FRD FR-5.5): upload date, uploader,
 * SHA-256 hash (first 12 characters visible, full hash on focus), recorded vs inferred ordering,
 * and authorized download per version.
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
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJButtonDirective } from '@memberjunction/ng-ui-components';
import type { DocumentVersionInfo, LibraryDocument } from '@mj-biz-apps/credentialing-core';
import { ApplicantMessages } from '../shared/applicant-messages';
import { EvidenceClient } from './evidence-client';
import { FormatHashShort, FormatLibraryDate } from './library-model';

@Component({
    standalone: true,
    selector: 'bizapps-cred-version-history',
    imports: [SharedGenericModule, MJAlertComponent, MJButtonDirective],
    templateUrl: './version-history.component.html',
    styleUrls: ['./version-history.component.scss'],
})
export class VersionHistoryComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private _visible = false;

    @ViewChild('versionsDialog') public DialogRef?: ElementRef<HTMLDialogElement>;

    @Input() public Document: LibraryDocument | null = null;

    @Input()
    public get Visible(): boolean {
        return this._visible;
    }
    public set Visible(value: boolean) {
        if (value === this._visible) return;
        this._visible = value;
        if (value) {
            this.ErrorMessage = '';
            this.ExpandedHashID = null;
            Promise.resolve().then(() => this.showModal());
        } else {
            this.closeModal();
        }
    }

    @Output() public readonly Closed = new EventEmitter<void>();

    public DownloadingID: string | null = null;
    public ExpandedHashID: string | null = null;
    public ErrorMessage = '';

    public FormatDate(iso: string): string {
        return FormatLibraryDate(iso);
    }

    public ShortHash(hash: string): string {
        return FormatHashShort(hash);
    }

    public OnHashFocus(versionID: string): void {
        this.ExpandedHashID = versionID;
        this.cdr.markForCheck();
    }

    public OnHashBlur(versionID: string): void {
        if (this.ExpandedHashID === versionID) {
            this.ExpandedHashID = null;
            this.cdr.markForCheck();
        }
    }

    public Close(): void {
        this._visible = false;
        this.closeModal();
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

    public async DownloadVersion(version: DocumentVersionInfo): Promise<void> {
        if (!this.Document || this.DownloadingID != null) return;
        this.DownloadingID = version.EvidenceDocumentID;
        this.ErrorMessage = '';
        this.cdr.markForCheck();
        try {
            const client = new EvidenceClient(this.ProviderToUse);
            await client.Download(version.EvidenceDocumentID, this.Document.FileName);
        } catch (err) {
            this.ErrorMessage = ApplicantMessages.FromError(err, 'load');
        } finally {
            this.DownloadingID = null;
            this.cdr.markForCheck();
        }
    }

    private showModal(): void {
        const dialog = this.DialogRef?.nativeElement;
        if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
            dialog.showModal();
        }
        this.cdr.markForCheck();
    }

    private closeModal(): void {
        const dialog = this.DialogRef?.nativeElement;
        if (dialog && dialog.open && typeof dialog.close === 'function') {
            dialog.close();
        }
    }
}
