/**
 * One standard card in the Applicant Standards Runner (FRD FR-4.6, 4.8, 4.9).
 *
 * Displays code, statement, collapsed guidance, intake-mode explanation, state label, answer text,
 * self-assessment, and state-appropriate actions. Editing begins only when the `Edit answer` button
 * is clicked (never click-to-edit), and confirming is a deliberate second act inside a native
 * `<dialog>` opened with `showModal()`.
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
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJButtonDirective } from '@memberjunction/ng-ui-components';
import {
    ConfirmResponseOperation,
    SaveResponseOperation,
    type SelfAssessment,
    type WorkspaceApplication,
    type WorkspaceCitation,
    type WorkspaceStandard,
    type WorkspaceStandardResponse,
} from '@mj-biz-apps/credentialing-core';
import { DocumentViewerComponent, type ViewerCitation, type ViewerTab } from '../documents/document-viewer.component';
import type { UploadResult } from '../documents/evidence-client';
import { UploadDropzoneComponent } from '../documents/upload-dropzone.component';
import { ApplicantMessages } from '../shared/applicant-messages';
import {
    FormatCitationChip,
    IntakeSentence,
    LOCATED_PASSAGES_SENTENCE,
    ResolveCardActions,
    ResponseStateLabel,
    STALE_SOURCE_SENTENCE,
    type CardActions,
} from './runner-model';

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

const SELF_ASSESSMENT_OPTIONS: readonly { Value: SelfAssessment; Label: string }[] = [
    { Value: 'Met', Label: 'Met' },
    { Value: 'Partially Met', Label: 'Partially met' },
    { Value: 'Not Met', Label: 'Not met' },
];

@Component({
    standalone: true,
    selector: 'bizapps-cred-standard-card',
    imports: [
        FormsModule,
        SharedGenericModule,
        MJAlertComponent,
        MJButtonDirective,
        UploadDropzoneComponent,
        DocumentViewerComponent,
    ],
    templateUrl: './standard-card.component.html',
    styleUrls: ['./standard-card.component.scss'],
})
export class StandardCardComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private _standard!: WorkspaceStandard;

    @ViewChild('confirmDialog') public ConfirmDialogRef?: ElementRef<HTMLDialogElement>;
    @ViewChild('confirmTrigger', { read: ElementRef }) public ConfirmTriggerRef?: ElementRef<HTMLButtonElement>;

    @Input({ required: true }) public Application!: WorkspaceApplication;

    @Input({ required: true })
    public get Standard(): WorkspaceStandard {
        return this._standard;
    }
    public set Standard(value: WorkspaceStandard) {
        const previousID = this._standard?.StandardID;
        this._standard = value;
        if (previousID !== value.StandardID) {
            this.IsEditing = false;
            this.ShowEvidenceUpload = false;
            this.UploadedDocument = null;
            this.ErrorMessage = '';
            this.ConfirmErrorMessage = '';
        }
    }

    @Output() public readonly ResponseUpdated = new EventEmitter<WorkspaceStandardResponse>();

    public readonly SelfAssessmentOptions = SELF_ASSESSMENT_OPTIONS;
    public readonly StaleSourceSentence = STALE_SOURCE_SENTENCE;
    public readonly LocatedPassagesSentence = LOCATED_PASSAGES_SENTENCE;
    public IsEditing = false;
    public DraftText = '';
    public DraftSelfAssessment: SelfAssessment | null = null;
    public IsSaving = false;
    public IsConfirming = false;
    public IsConfirmDialogOpen = false;
    public ErrorMessage = '';
    public ConfirmErrorMessage = '';

    public ShowEvidenceUpload = false;
    public UploadedDocument: UploadResult | null = null;
    public ViewerOpen = false;
    public ViewerDocumentID: string | null = null;
    public ViewerFileName = '';
    public ViewerCitation: ViewerCitation | null = null;
    public ViewerInitialTab: ViewerTab = 'original';

    public get HasUnsavedEdits(): boolean {
        if (!this.IsEditing || this._standard == null) return false;
        const storedText = this._standard.Response.ResponseText ?? '';
        return (
            this.DraftText !== storedText ||
            this.DraftSelfAssessment !== this._standard.Response.SelfAssessment
        );
    }

    public get Actions(): CardActions {
        return ResolveCardActions(this.Application, this.Standard, this.IsEditing, this.HasUnsavedEdits);
    }

    public get StateLabel(): string {
        return ResponseStateLabel(this.Standard.Response.Status);
    }

    public get IntakeModeLine(): string {
        return IntakeSentence(this.Standard.IntakeMode);
    }

    public FormatSelfAssessment(value: SelfAssessment | null): string {
        if (value == null) return 'Not yet selected';
        return SELF_ASSESSMENT_OPTIONS.find((o) => o.Value === value)?.Label ?? value;
    }

    public FormatDate(iso: string | null): string {
        if (!iso) return '';
        const parsed = new Date(iso);
        return Number.isNaN(parsed.getTime()) ? iso : DATE_FORMAT.format(parsed);
    }

    public FormatChip(citation: WorkspaceCitation): string {
        return FormatCitationChip(citation);
    }

    public ToggleEvidenceUpload(): void {
        if (this.Actions.IsApplicationLocked) return;
        this.ShowEvidenceUpload = !this.ShowEvidenceUpload;
        this.cdr.markForCheck();
    }

    public OnEvidenceUploaded(result: UploadResult): void {
        this.UploadedDocument = result;
        this.ShowEvidenceUpload = false;
        this.cdr.markForCheck();
    }

    public OpenUploadedDocument(): void {
        if (!this.UploadedDocument) return;
        this.ViewerDocumentID = this.UploadedDocument.EvidenceDocumentID;
        this.ViewerFileName = '';
        this.ViewerCitation = null;
        this.ViewerInitialTab = 'original';
        this.ViewerOpen = true;
        this.cdr.markForCheck();
    }

    public OpenCitation(citation: WorkspaceCitation): void {
        this.ViewerDocumentID = citation.EvidenceDocumentID;
        this.ViewerFileName = citation.SourceLabel;
        this.ViewerCitation = {
            SourceLabel: citation.SourceLabel,
            PageReference: citation.PageReference,
            Excerpt: citation.Excerpt,
            StartOffset: citation.StartOffset,
            EndOffset: citation.EndOffset,
        };
        this.ViewerInitialTab = 'text';
        this.ViewerOpen = true;
        this.cdr.markForCheck();
    }

    public CloseViewer(): void {
        this.ViewerOpen = false;
        this.ViewerDocumentID = null;
        this.ViewerCitation = null;
        this.cdr.markForCheck();
    }

    public StartEdit(): void {
        if (this.Actions.IsApplicationLocked || this.Actions.IsConfirmed) return;
        this.DraftText = this.Standard.Response.ResponseText ?? '';
        this.DraftSelfAssessment = this.Standard.Response.SelfAssessment;
        this.IsEditing = true;
        this.ErrorMessage = '';
        this.cdr.markForCheck();
    }

    public CancelEdit(): void {
        this.IsEditing = false;
        this.ErrorMessage = '';
        this.DraftText = this.Standard.Response.ResponseText ?? '';
        this.DraftSelfAssessment = this.Standard.Response.SelfAssessment;
        this.cdr.markForCheck();
    }

    public async SaveDraft(): Promise<void> {
        if (this.IsSaving || this.Actions.SaveDisabled) return;
        this.IsSaving = true;
        this.ErrorMessage = '';
        this.cdr.markForCheck();
        try {
            const res = await new SaveResponseOperation().Execute(
                {
                    ResponseID: this.Standard.Response.ResponseID,
                    ResponseText: this.DraftText,
                    SelfAssessment: this.DraftSelfAssessment,
                    ExpectedUpdatedAt: this.Standard.Response.UpdatedAt,
                },
                { provider: this.ProviderToUse },
            );
            if (!res.Success || res.Output == null) {
                this.ErrorMessage = ApplicantMessages.ForUser(
                    res.ErrorMessage || 'Could not save this draft.',
                    'save',
                );
                return;
            }
            this.IsEditing = false;
            this.ResponseUpdated.emit(res.Output.Response);
        } catch (e) {
            this.ErrorMessage = ApplicantMessages.FromError(e, 'save');
        } finally {
            this.IsSaving = false;
            this.cdr.markForCheck();
        }
    }

    public OpenConfirmDialog(): void {
        if (this.Actions.ConfirmDisabled) return;
        this.ConfirmErrorMessage = '';
        this.IsConfirmDialogOpen = true;
        this.cdr.markForCheck();
        const dialog = this.ConfirmDialogRef?.nativeElement;
        if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
            dialog.showModal();
        }
    }

    public CloseConfirmDialog(): void {
        const dialog = this.ConfirmDialogRef?.nativeElement;
        if (dialog && dialog.open && typeof dialog.close === 'function') {
            dialog.close();
        }
        this.IsConfirmDialogOpen = false;
        this.ConfirmErrorMessage = '';
        this.ConfirmTriggerRef?.nativeElement?.focus();
        this.cdr.markForCheck();
    }

    public OnDialogCancel(event: Event): void {
        event.preventDefault();
        if (!this.IsConfirming) {
            this.CloseConfirmDialog();
        }
    }

    public OnDialogKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Tab') return;
        const dialog = this.ConfirmDialogRef?.nativeElement;
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

    public async ConfirmAnswer(): Promise<void> {
        if (this.IsConfirming) return;
        this.IsConfirming = true;
        this.ConfirmErrorMessage = '';
        this.cdr.markForCheck();
        try {
            const res = await new ConfirmResponseOperation().Execute(
                {
                    ResponseID: this.Standard.Response.ResponseID,
                    ExpectedUpdatedAt: this.Standard.Response.UpdatedAt,
                },
                { provider: this.ProviderToUse },
            );
            if (!res.Success || res.Output == null) {
                this.ConfirmErrorMessage = ApplicantMessages.ForUser(
                    res.ErrorMessage || 'Could not confirm this answer.',
                    'save',
                );
                return;
            }
            const dialog = this.ConfirmDialogRef?.nativeElement;
            if (dialog && dialog.open && typeof dialog.close === 'function') {
                dialog.close();
            }
            this.IsConfirmDialogOpen = false;
            this.ResponseUpdated.emit(res.Output.Response);
        } catch (e) {
            this.ConfirmErrorMessage = ApplicantMessages.FromError(e, 'save');
        } finally {
            this.IsConfirming = false;
            this.cdr.markForCheck();
        }
    }
}
