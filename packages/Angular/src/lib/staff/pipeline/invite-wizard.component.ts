/**
 * Invite Applicant dialog wizard (Staff Pipeline).
 *
 * Guides staff through Active program version -> Subject (existing or new) -> Contact -> Review
 * -> Result, calling `Credentialing.InviteApplicant` through `ProviderToUse`.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import {
    MJAlertComponent,
    MJButtonDirective,
    MJDialogActionsComponent,
    MJDialogComponent,
    MJDropdownComponent,
    MJEmptyStateComponent,
} from '@memberjunction/ng-ui-components';
import { InviteApplicantOperation, type InviteApplicantOutput } from '@mj-biz-apps/credentialing-core';
import { StudioMessages } from '../studio-messages';
import {
    EligibleSubjectsForTarget,
    FormatInvitationOutcome,
    InviteWizardModel,
    type FormattedInvitationOutcome,
    type InviteWizardStep,
} from './invite-wizard-model';
import type { PipelineActiveTarget, PipelineSubjectOption } from './pipeline-data';

interface TargetChoice {
    VersionID: string;
    DisplayLabel: string;
}

@Component({
    standalone: true,
    selector: 'bizapps-cred-invite-wizard',
    imports: [
        FormsModule,
        SharedGenericModule,
        MJAlertComponent,
        MJButtonDirective,
        MJDialogComponent,
        MJDialogActionsComponent,
        MJDropdownComponent,
        MJEmptyStateComponent,
    ],
    templateUrl: './invite-wizard.component.html',
    styleUrls: ['./invite-wizard.component.scss'],
})
export class InviteWizardComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private _visible = false;
    private _targets: readonly PipelineActiveTarget[] = [];

    @Input()
    set Visible(value: boolean) {
        if (value && !this._visible) {
            this.resetWizard();
        }
        this._visible = value;
    }
    get Visible(): boolean {
        return this._visible;
    }

    @Input()
    set Targets(value: readonly PipelineActiveTarget[]) {
        this._targets = value ?? [];
        if (this._visible && this.Model.VersionID === '' && this._targets.length === 1) {
            this.Model.VersionID = this._targets[0].VersionID;
            this.syncSubjectModeForTarget();
        }
    }
    get Targets(): readonly PipelineActiveTarget[] {
        return this._targets;
    }

    @Input() Subjects: readonly PipelineSubjectOption[] = [];

    @Output() Closed = new EventEmitter<void>();
    @Output() Invited = new EventEmitter<InviteApplicantOutput>();

    public Model = new InviteWizardModel();
    public IsSubmitting = false;
    public ErrorMessage = '';
    public Outcome: FormattedInvitationOutcome | null = null;
    public CopiedLink = false;

    public get TargetChoices(): TargetChoice[] {
        return this._targets.map((t) => ({
            VersionID: t.VersionID,
            DisplayLabel: `${t.ProgramName} — ${t.VersionLabel} (${t.SubjectType})`,
        }));
    }

    public get SelectedTarget(): PipelineActiveTarget | null {
        const id = this.Model.VersionID.trim().toLowerCase();
        if (!id) return null;
        return this._targets.find((t) => t.VersionID.toLowerCase() === id) ?? null;
    }

    public get EligibleSubjects(): PipelineSubjectOption[] {
        return EligibleSubjectsForTarget(this.Subjects, this.SelectedTarget);
    }

    public get SelectedExistingSubject(): PipelineSubjectOption | null {
        const id = this.Model.ExistingSubjectID.trim().toLowerCase();
        if (!id) return null;
        return this.EligibleSubjects.find((s) => s.ID.toLowerCase() === id) ?? null;
    }

    public get StepNumber(): number {
        const order: readonly InviteWizardStep[] = ['Version', 'Subject', 'Contact', 'Review', 'Result'];
        return order.indexOf(this.Model.Step) + 1;
    }

    public OnVersionChange(versionID: string): void {
        this.Model.VersionID = versionID ?? '';
        this.Model.ExistingSubjectID = '';
        this.syncSubjectModeForTarget();
        this.ErrorMessage = '';
    }

    public Next(): void {
        this.ErrorMessage = '';
        if (!this.Model.CanProceed()) {
            this.ErrorMessage = this.Model.ValidationMessage() ?? 'Complete the required fields.';
            return;
        }
        const order: readonly InviteWizardStep[] = ['Version', 'Subject', 'Contact', 'Review'];
        const idx = order.indexOf(this.Model.Step);
        if (idx >= 0 && idx + 1 < order.length) {
            this.Model.Step = order[idx + 1];
            if (this.Model.Step === 'Subject') {
                this.syncSubjectModeForTarget();
            }
        }
    }

    public Back(): void {
        this.ErrorMessage = '';
        const order: readonly InviteWizardStep[] = ['Version', 'Subject', 'Contact', 'Review'];
        const idx = order.indexOf(this.Model.Step);
        if (idx > 0) {
            this.Model.Step = order[idx - 1];
        }
    }

    public async Submit(): Promise<void> {
        if (this.IsSubmitting) return;
        const validation = this.Model.ValidationMessage('Review');
        if (validation != null) {
            this.ErrorMessage = validation;
            return;
        }
        this.IsSubmitting = true;
        this.ErrorMessage = '';
        this.cdr.markForCheck();
        try {
            const input = this.Model.BuildInput();
            const result = await new InviteApplicantOperation().Execute(input, { provider: this.ProviderToUse });
            if (result.Success && result.Output) {
                this.Outcome = FormatInvitationOutcome(input.Contact.Email, result.Output);
                this.Model.Step = 'Result';
                this.CopiedLink = false;
                this.Invited.emit(result.Output);
            } else {
                this.ErrorMessage = StudioMessages.ForUser(result.ErrorMessage || 'The invitation could not be sent.');
            }
        } catch (e) {
            this.ErrorMessage = StudioMessages.FromError(e, 'save');
        } finally {
            this.IsSubmitting = false;
            this.cdr.markForCheck();
        }
    }

    public async CopyLink(): Promise<void> {
        const url = this.Outcome?.InvitationUrl;
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            this.CopiedLink = true;
            this.cdr.markForCheck();
        } catch {
            // Leave the link selectable for manual copy.
        }
    }

    public Close(): void {
        if (this.IsSubmitting) return;
        this.Closed.emit();
    }

    private resetWizard(): void {
        this.Model = new InviteWizardModel();
        if (this._targets.length === 1) {
            this.Model.VersionID = this._targets[0].VersionID;
        }
        this.syncSubjectModeForTarget();
        this.IsSubmitting = false;
        this.ErrorMessage = '';
        this.Outcome = null;
        this.CopiedLink = false;
    }

    private syncSubjectModeForTarget(): void {
        if (this.EligibleSubjects.length === 0) {
            this.Model.SubjectMode = 'new';
            this.Model.ExistingSubjectID = '';
        }
    }
}
