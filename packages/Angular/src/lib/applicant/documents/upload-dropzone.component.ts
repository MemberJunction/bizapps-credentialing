/**
 * Drag-and-drop and file-picker upload dropzone for evidence files (FRD FR-5.2).
 *
 * Always displays the sentence "Uploading does not submit anything.", posts raw bytes through
 * `EvidenceClient.Upload`, and surfaces the server's exact sentence on refusal.
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
import { EvidenceFileRules } from '@mj-biz-apps/credentialing-core';
import { ApplicantMessages } from '../shared/applicant-messages';
import { EvidenceClient, type UploadResult } from './evidence-client';
import { UPLOAD_DOES_NOT_SUBMIT_SENTENCE } from './library-model';

const ACCEPTED_EXTENSIONS = EvidenceFileRules.Accepted.map((a) => `.${a.Extension}`).join(',');

@Component({
    standalone: true,
    selector: 'bizapps-cred-upload-dropzone',
    imports: [SharedGenericModule, MJAlertComponent, MJButtonDirective],
    templateUrl: './upload-dropzone.component.html',
    styleUrls: ['./upload-dropzone.component.scss'],
})
export class UploadDropzoneComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);

    @ViewChild('fileInput') public FileInputRef?: ElementRef<HTMLInputElement>;

    @Input({ required: true }) public SubjectID!: string;
    @Input() public RequirementID: string | null = null;
    @Input() public Label = 'Choose a file or drop it here';
    @Input() public Disabled = false;

    @Output() public readonly Uploaded = new EventEmitter<UploadResult>();

    public readonly AcceptedTypes = ACCEPTED_EXTENSIONS;
    public readonly DoesNotSubmitSentence = UPLOAD_DOES_NOT_SUBMIT_SENTENCE;

    public IsDragging = false;
    public IsUploading = false;
    public SelectedFileName = '';
    public ErrorMessage = '';

    public OpenPicker(): void {
        if (this.Disabled || this.IsUploading) return;
        this.FileInputRef?.nativeElement?.click();
    }

    public OnFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement | null;
        const file = input?.files?.[0] ?? null;
        if (input) {
            input.value = '';
        }
        if (file != null) {
            void this.uploadFile(file);
        }
    }

    public OnDragOver(event: DragEvent): void {
        if (this.Disabled || this.IsUploading) return;
        event.preventDefault();
        if (!this.IsDragging) {
            this.IsDragging = true;
            this.cdr.markForCheck();
        }
    }

    public OnDragLeave(event: DragEvent): void {
        event.preventDefault();
        if (this.IsDragging) {
            this.IsDragging = false;
            this.cdr.markForCheck();
        }
    }

    public OnDrop(event: DragEvent): void {
        event.preventDefault();
        this.IsDragging = false;
        if (this.Disabled || this.IsUploading) {
            this.cdr.markForCheck();
            return;
        }
        const file = event.dataTransfer?.files?.[0] ?? null;
        if (file != null) {
            void this.uploadFile(file);
        } else {
            this.cdr.markForCheck();
        }
    }

    private async uploadFile(file: File): Promise<void> {
        if (!this.SubjectID || this.IsUploading) return;
        this.IsUploading = true;
        this.SelectedFileName = file.name;
        this.ErrorMessage = '';
        this.cdr.markForCheck();
        try {
            const client = new EvidenceClient(this.ProviderToUse);
            const result = await client.Upload(this.SubjectID, this.RequirementID, file);
            this.Uploaded.emit(result);
        } catch (err) {
            this.ErrorMessage = ApplicantMessages.FromError(err, 'save');
        } finally {
            this.IsUploading = false;
            this.cdr.markForCheck();
        }
    }
}
