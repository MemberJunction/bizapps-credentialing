/**
 * Applicant Standards Runner (FRD FR-4.5, 4.6, 4.8, 4.9).
 *
 * Loads one application's workspace via `Credentialing.GetApplicationWorkspace`, renders the
 * section rail with confirmed/total counts, `NEW` badges, and progress bars, filters standards
 * (`Needs your review` default, `Confirmed`, `All`) with section and filter synced to the URL,
 * displays the non-prefill posture banner when `CanPrefill` is false, renders one
 * `<bizapps-cred-standard-card>` per visible standard, and supports applicant withdrawal with a
 * recorded reason.
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
    ApplicationLifecycleRules,
    GetApplicationWorkspaceOperation,
    RefreshPrefillsOperation,
    ResponseRules,
    WithdrawApplicationOperation,
    type ApplicationWorkspace,
    type MyApplication,
    type MySubject,
    type WorkspaceSection,
    type WorkspaceStandard,
    type WorkspaceStandardResponse,
} from '@mj-biz-apps/credentialing-core';
import { ApplicantMessages } from '../shared/applicant-messages';
import {
    ApplicationCounts,
    ApplyResponseUpdate,
    CANNOT_PREFILL_BANNER,
    FormatRefreshSummary,
    ParseRunnerFilter,
    RUNNER_FILTER_OPTIONS,
    ResolveRunnerSelection,
    ShowRefreshPrefills,
    type RunnerFilter,
} from './runner-model';
import { SectionRailComponent } from './section-rail.component';
import { StandardCardComponent } from './standard-card.component';

/** URL-carried navigation state of the Standards Runner. */
export interface RunnerNavigationState {
    ApplicationID: string;
    SectionID: string | null;
    Filter: RunnerFilter;
}

@Component({
    standalone: true,
    selector: 'bizapps-cred-standards-runner',
    imports: [
        FormsModule,
        SharedGenericModule,
        MJAlertComponent,
        MJButtonDirective,
        MJEmptyStateComponent,
        SectionRailComponent,
        StandardCardComponent,
    ],
    templateUrl: './standards-runner.page.html',
    styleUrls: ['./standards-runner.page.scss'],
})
export class StandardsRunnerPage extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private _subject: MySubject | null = null;
    private _applicationID: string | null = null;
    private _sectionID: string | null = null;
    private _filter: RunnerFilter = 'needs-review';
    private loadCounter = 0;

    @ViewChild('withdrawDialog') public WithdrawDialogRef?: ElementRef<HTMLDialogElement>;

    @Input({ required: true })
    public get Subject(): MySubject | null {
        return this._subject;
    }
    public set Subject(value: MySubject | null) {
        const changed = value?.SubjectID !== this._subject?.SubjectID;
        this._subject = value;
        if (changed) {
            this.Workspace = null;
            this.ErrorMessage = '';
            void this.ensureWorkspaceLoaded();
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
            if (this._subject != null) {
                void this.ensureWorkspaceLoaded();
            }
        }
    }

    @Input()
    public get SectionID(): string | null {
        return this._sectionID;
    }
    public set SectionID(value: string | null) {
        this._sectionID = value?.trim() || null;
        this.cdr.markForCheck();
    }

    @Input()
    public get Filter(): RunnerFilter {
        return this._filter;
    }
    public set Filter(value: RunnerFilter | string | null | undefined) {
        this._filter = ParseRunnerFilter(value);
        this.cdr.markForCheck();
    }

    @Output() public readonly SelectionChanged = new EventEmitter<RunnerNavigationState>();
    @Output() public readonly Withdrawn = new EventEmitter<void>();

    public readonly FilterOptions = RUNNER_FILTER_OPTIONS;
    public readonly CannotPrefillBanner = CANNOT_PREFILL_BANNER;

    public Workspace: ApplicationWorkspace | null = null;
    public IsLoading = false;
    public ErrorMessage = '';
    public NotAvailable = false;

    public IsRefreshingPrefills = false;
    public RefreshSummary = '';
    public RefreshError = '';

    public WithdrawReason = '';
    public WithdrawError = '';
    public IsWithdrawing = false;

    public get Applications(): readonly MyApplication[] {
        return this._subject?.Applications ?? [];
    }

    public get Selection(): {
        SectionID: string | null;
        Filter: RunnerFilter;
        ActiveSection: WorkspaceSection | null;
        VisibleStandards: WorkspaceStandard[];
    } {
        if (!this.Workspace) {
            return { SectionID: this._sectionID, Filter: this._filter, ActiveSection: null, VisibleStandards: [] };
        }
        return ResolveRunnerSelection(this.Workspace, this._sectionID, this._filter);
    }

    public get TotalProgress(): { Confirmed: number; Total: number; Percent: number } {
        return this.Workspace ? ApplicationCounts(this.Workspace) : { Confirmed: 0, Total: 0, Percent: 0 };
    }

    public get ApplicationLockedBanner(): string | null {
        if (!this.Workspace || this.Workspace.Application.Status === 'Draft') {
            return null;
        }
        const submittedAt = this.Workspace.Application.SubmittedAt
            ? new Date(this.Workspace.Application.SubmittedAt)
            : null;
        const rule = ResponseRules.CanEdit(
            this.Workspace.Application.Status,
            { Status: 'Drafted', AuthorType: 'Human', ResponseText: null, SelfAssessment: null },
            submittedAt,
        );
        return rule.Allowed ? null : rule.Reason;
    }

    public get CanWithdraw(): boolean {
        if (!this.Workspace) return false;
        return ApplicationLifecycleRules.CanWithdraw(this.Workspace.Application.Status, 'Applicant', 'reason').Allowed;
    }

    public get CanRefreshPrefills(): boolean {
        if (!this.Workspace) return false;
        return ShowRefreshPrefills(this.Workspace.Application);
    }

    public async RefreshPrefills(): Promise<void> {
        const ws = this.Workspace;
        if (!ws || !this.CanRefreshPrefills || this.IsRefreshingPrefills) return;
        this.IsRefreshingPrefills = true;
        this.RefreshSummary = '';
        this.RefreshError = '';
        this.cdr.markForCheck();
        try {
            const res = await new RefreshPrefillsOperation().Execute(
                { ApplicationID: ws.Application.ApplicationID },
                { provider: this.ProviderToUse },
            );
            if (!res.Success || res.Output == null) {
                this.RefreshError = ApplicantMessages.ForUser(
                    res.ErrorMessage || 'Could not refresh prefills.',
                    'save',
                );
                return;
            }
            const summary = FormatRefreshSummary(res.Output);
            await this.loadWorkspace(ws.Application.ApplicationID);
            this.RefreshSummary = summary;
        } catch (e) {
            this.RefreshError = ApplicantMessages.FromError(e, 'save');
        } finally {
            this.IsRefreshingPrefills = false;
            this.cdr.markForCheck();
        }
    }

    public OnSelectApplication(applicationID: string): void {
        if (!applicationID || (this._applicationID && UUIDsEqual(this._applicationID, applicationID))) {
            return;
        }
        this._applicationID = applicationID;
        this._sectionID = null;
        this.RefreshSummary = '';
        this.RefreshError = '';
        void this.ensureWorkspaceLoaded();
    }

    public OnSelectSection(sectionID: string): void {
        this._sectionID = sectionID;
        this.emitSelection();
        this.cdr.markForCheck();
    }

    public OnSelectFilter(filter: RunnerFilter): void {
        this._filter = filter;
        this.emitSelection();
        this.cdr.markForCheck();
    }

    public OnResponseUpdated(updated: WorkspaceStandardResponse): void {
        if (!this.Workspace) return;
        this.Workspace = ApplyResponseUpdate(this.Workspace, updated);
        this.cdr.markForCheck();
    }

    public OpenWithdrawDialog(): void {
        this.WithdrawReason = '';
        this.WithdrawError = '';
        const dialog = this.WithdrawDialogRef?.nativeElement;
        if (dialog && !dialog.open && typeof dialog.showModal === 'function') {
            dialog.showModal();
        }
    }

    public CloseWithdrawDialog(): void {
        const dialog = this.WithdrawDialogRef?.nativeElement;
        if (dialog && dialog.open && typeof dialog.close === 'function') {
            dialog.close();
        }
        this.WithdrawError = '';
    }

    public OnWithdrawDialogCancel(event: Event): void {
        event.preventDefault();
        if (!this.IsWithdrawing) {
            this.CloseWithdrawDialog();
        }
    }

    public async ConfirmWithdraw(): Promise<void> {
        if (!this.Workspace || this.IsWithdrawing) return;
        const check = ApplicationLifecycleRules.CanWithdraw(
            this.Workspace.Application.Status,
            'Applicant',
            this.WithdrawReason,
        );
        if (!check.Allowed) {
            this.WithdrawError = check.Reason;
            this.cdr.markForCheck();
            return;
        }
        this.IsWithdrawing = true;
        this.WithdrawError = '';
        this.cdr.markForCheck();
        try {
            const res = await new WithdrawApplicationOperation().Execute(
                {
                    ApplicationID: this.Workspace.Application.ApplicationID,
                    Reason: this.WithdrawReason,
                },
                { provider: this.ProviderToUse },
            );
            if (!res.Success || res.Output == null) {
                this.WithdrawError = ApplicantMessages.ForUser(
                    res.ErrorMessage || 'Could not withdraw this application.',
                    'save',
                );
                return;
            }
            this.CloseWithdrawDialog();
            await this.loadWorkspace(this.Workspace.Application.ApplicationID);
            this.Withdrawn.emit();
        } catch (e) {
            this.WithdrawError = ApplicantMessages.FromError(e, 'save');
        } finally {
            this.IsWithdrawing = false;
            this.cdr.markForCheck();
        }
    }

    private async ensureWorkspaceLoaded(): Promise<void> {
        if (!this._subject) return;
        const apps = this._subject.Applications;
        if (apps.length === 0) {
            this.Workspace = null;
            this.NotAvailable = false;
            this.IsLoading = false;
            this.cdr.markForCheck();
            return;
        }

        const targetID = this.resolveTargetApplicationID(apps);
        if (targetID == null) {
            this.Workspace = null;
            this.NotAvailable = true;
            this.IsLoading = false;
            this.cdr.markForCheck();
            return;
        }

        if (this.Workspace && UUIDsEqual(this.Workspace.Application.ApplicationID, targetID)) {
            return;
        }
        await this.loadWorkspace(targetID);
    }

    private resolveTargetApplicationID(apps: readonly MyApplication[]): string | null {
        if (this._applicationID) {
            const match = apps.find((a) => UUIDsEqual(a.ApplicationID, this._applicationID!));
            return match ? match.ApplicationID : null;
        }
        const preferred = apps.find((a) => a.Status === 'Draft') ?? apps[0];
        this._applicationID = preferred.ApplicationID;
        return preferred.ApplicationID;
    }

    private async loadWorkspace(applicationID: string): Promise<void> {
        const token = ++this.loadCounter;
        this.IsLoading = true;
        this.ErrorMessage = '';
        this.NotAvailable = false;
        this.cdr.markForCheck();
        try {
            const res = await new GetApplicationWorkspaceOperation().Execute(
                { ApplicationID: applicationID },
                { provider: this.ProviderToUse },
            );
            if (token !== this.loadCounter) return;
            if (!res.Success || res.Output == null) {
                this.ErrorMessage = ApplicantMessages.ForUser(
                    res.ErrorMessage || 'Could not load standards for this application.',
                    'load',
                );
                return;
            }
            this.Workspace = res.Output;
            const resolved = ResolveRunnerSelection(res.Output, this._sectionID, this._filter);
            this._sectionID = resolved.SectionID;
            this._filter = resolved.Filter;
            this.emitSelection();
        } catch (e) {
            if (token !== this.loadCounter) return;
            this.ErrorMessage = ApplicantMessages.FromError(e, 'load');
        } finally {
            if (token === this.loadCounter) {
                this.IsLoading = false;
                this.cdr.markForCheck();
            }
        }
    }

    private emitSelection(): void {
        const appID = this.Workspace?.Application.ApplicationID ?? this._applicationID;
        if (!appID) return;
        this.SelectionChanged.emit({
            ApplicationID: appID,
            SectionID: this._sectionID,
            Filter: this._filter,
        });
    }
}
