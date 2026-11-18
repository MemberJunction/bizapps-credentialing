/**
 * Applicant Review & Submit page (FRD FR-4.7, FR-5.4).
 *
 * Loads `Credentialing.GetSubmissionGate`, displays the section/eligibility/document/attestation
 * checklist with resolving gap links, lists the documents and attestations that submission freezes,
 * captures governing-body attestation when required, confirms via a native modal dialog, calls
 * `Credentialing.SubmitApplication`, and turns read-only with a `Submitted on {date}.` banner.
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
import { Metadata, type IMetadataProvider } from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import {
    MJAlertComponent,
    MJButtonDirective,
    MJEmptyStateComponent,
} from '@memberjunction/ng-ui-components';
import {
    GetSubmissionGateOperation,
    SubmitApplicationOperation,
    type AttestationInput,
    type GetSubmissionGateOutput,
    type MyApplication,
    type MySubject,
} from '@mj-biz-apps/credentialing-core';
import { ApplicantMessages } from '../shared/applicant-messages';
import { AttestationFormComponent } from './attestation-form.component';
import { GateListComponent } from './gate-list.component';
import {
    EvaluateSubmitState,
    SUBMIT_FREEZE_NOTE,
    type EvaluatedSubmitState,
    type SubmitGapLink,
} from './submit-model';

@Component({
    standalone: true,
    selector: 'bizapps-cred-review-submit',
    imports: [
        SharedGenericModule,
        MJAlertComponent,
        MJButtonDirective,
        MJEmptyStateComponent,
        GateListComponent,
        AttestationFormComponent,
    ],
    templateUrl: './review-submit.page.html',
    styleUrls: ['./review-submit.page.scss'],
})
export class ReviewSubmitPage extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private _subject: MySubject | null = null;
    private _applicationID: string | null = null;
    private loadCounter = 0;
    private _refreshKey: number | null = null;

    @ViewChild('confirmSubmitDialog')
    public ConfirmSubmitDialogRef?: ElementRef<HTMLDialogElement>;

    @Input() public Provider: IMetadataProvider | null = null;

    @Input({ required: true })
    public get Subject(): MySubject | null {
        return this._subject;
    }
    public set Subject(value: MySubject | null) {
        const changed = value?.SubjectID !== this._subject?.SubjectID;
        this._subject = value;
        if (changed) {
            this.Gate = null;
            this.ErrorMessage = '';
            this.SubmitError = '';
            void this.ensureGateLoaded();
        }
    }

    @Input()
    public get ApplicationID(): string | null {
        return this._applicationID;
    }
    public set ApplicationID(value: string | null) {
        const normalized = value?.trim() || null;
        if (normalized !== this._applicationID) {
            this._applicationID = normalized;
            void this.ensureGateLoaded();
        }
    }

    /**
     * Bumped by the hosting resource each time Explorer shows its cached tab again. A change reloads
     * what is on screen without a loading state, so work done elsewhere appears without a page reload.
     */
    @Input()
    public get RefreshKey(): number | null {
        return this._refreshKey;
    }
    public set RefreshKey(value: number | null) {
        const previous = this._refreshKey;
        this._refreshKey = value;
        if (previous != null && value !== previous && this.Gate != null) {
            void this.loadGate(this.Gate.Application.ApplicationID, true);
        }
    }

    @Output() public BackToStandards = new EventEmitter<void>();
    @Output() public NavigateToGap = new EventEmitter<SubmitGapLink>();
    @Output() public Submitted = new EventEmitter<string>();

    public Gate: GetSubmissionGateOutput | null = null;
    public Attestation: AttestationInput = {
        OfficerName: null,
        OfficerRole: null,
        ApprovalDate: null,
        Accepted: false,
    };
    public IsLoading: boolean = false;
    public IsSubmitting: boolean = false;
    public NotAvailable: boolean = false;
    public ErrorMessage: string = '';
    public SubmitError: string = '';
    public readonly FreezeNote: string = SUBMIT_FREEZE_NOTE;

    public get Applications(): readonly MyApplication[] {
        return this._subject?.Applications ?? [];
    }

    public get State(): EvaluatedSubmitState {
        return EvaluateSubmitState(this.Gate, this.Attestation);
    }

    public get ProviderToUse(): IMetadataProvider {
        return this.Provider ?? Metadata.Provider;
    }

    public OnBackToStandards(): void {
        this.BackToStandards.emit();
    }

    public OnNavigateToGap(link: SubmitGapLink): void {
        this.NavigateToGap.emit(link);
    }

    public OnAttestationChanged(next: AttestationInput): void {
        this.Attestation = next;
        this.SubmitError = '';
        this.cdr.markForCheck();
    }

    public OpenConfirmDialog(): void {
        if (!this.State.CanSubmit || this.IsSubmitting) {
            return;
        }
        this.SubmitError = '';
        const dialog = this.ConfirmSubmitDialogRef?.nativeElement;
        if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
            dialog.showModal();
        }
    }

    public CloseConfirmDialog(): void {
        const dialog = this.ConfirmSubmitDialogRef?.nativeElement;
        if (dialog && dialog.open && typeof dialog.close === 'function') {
            dialog.close();
        }
    }

    public OnConfirmDialogCancel(event: Event): void {
        event.preventDefault();
        if (!this.IsSubmitting) {
            this.CloseConfirmDialog();
        }
    }

    public async ConfirmSubmit(): Promise<void> {
        if (!this.Gate || !this.State.CanSubmit || this.IsSubmitting) {
            return;
        }
        this.IsSubmitting = true;
        this.SubmitError = '';
        this.cdr.markForCheck();
        try {
            const appID = this.Gate.Application.ApplicationID;
            const res = await new SubmitApplicationOperation().Execute(
                {
                    ApplicationID: appID,
                    Attestation: this.Gate.RequiresAttestation ? this.Attestation : null,
                },
                { provider: this.ProviderToUse },
            );
            if (!res.Success || res.Output == null) {
                this.SubmitError = ApplicantMessages.ForUser(
                    res.ErrorMessage || 'Could not submit this application.',
                    'save',
                );
                this.CloseConfirmDialog();
                await this.loadGate(appID);
                return;
            }
            const submittedAt = res.Output.SubmittedAt;
            this.CloseConfirmDialog();
            await this.loadGate(appID);
            this.Submitted.emit(submittedAt);
        } catch (e) {
            this.SubmitError = ApplicantMessages.FromError(e, 'save');
            this.CloseConfirmDialog();
        } finally {
            this.IsSubmitting = false;
            this.cdr.markForCheck();
        }
    }

    private async ensureGateLoaded(): Promise<void> {
        if (!this._subject) {
            return;
        }
        const apps = this._subject.Applications;
        if (apps.length === 0) {
            this.Gate = null;
            this.NotAvailable = false;
            this.IsLoading = false;
            this.cdr.markForCheck();
            return;
        }
        const targetID = this.resolveTargetApplicationID(apps);
        if (targetID == null) {
            this.Gate = null;
            this.NotAvailable = true;
            this.IsLoading = false;
            this.cdr.markForCheck();
            return;
        }
        if (this.Gate && UUIDsEqual(this.Gate.Application.ApplicationID, targetID)) {
            return;
        }
        await this.loadGate(targetID);
    }

    private resolveTargetApplicationID(apps: readonly MyApplication[]): string | null {
        if (this._applicationID != null) {
            const matched = apps.find((a) => UUIDsEqual(a.ApplicationID, this._applicationID));
            return matched ? matched.ApplicationID : null;
        }
        return apps[0]?.ApplicationID ?? null;
    }

    /**
     * Evaluates the gate. A `silent` load keeps the gate on screen while it runs, shows no error over
     * it, and keeps an attestation the applicant is still filling in.
     */
    private async loadGate(applicationID: string, silent = false): Promise<void> {
        const currentLoad = ++this.loadCounter;
        if (!silent) {
            this.IsLoading = true;
            this.NotAvailable = false;
            this.ErrorMessage = '';
            this.cdr.markForCheck();
        }
        try {
            const res = await new GetSubmissionGateOperation().Execute(
                { ApplicationID: applicationID },
                { provider: this.ProviderToUse },
            );
            if (currentLoad !== this.loadCounter) {
                return;
            }
            if (!res.Success || res.Output == null) {
                if (silent) {
                    return;
                }
                this.Gate = null;
                this.ErrorMessage = ApplicantMessages.ForUser(
                    res.ErrorMessage || 'Could not check submission readiness.',
                    'load',
                );
                return;
            }
            this.Gate = res.Output;
            this.Attestation = res.Output.RecordedAttestation ?? (silent ? this.Attestation : {
                OfficerName: null,
                OfficerRole: null,
                ApprovalDate: null,
                Accepted: false,
            });
        } catch (e) {
            if (currentLoad !== this.loadCounter || silent) {
                return;
            }
            this.Gate = null;
            this.ErrorMessage = ApplicantMessages.FromError(e, 'load');
        } finally {
            if (currentLoad === this.loadCounter) {
                this.IsLoading = false;
                this.cdr.markForCheck();
            }
        }
    }
}
