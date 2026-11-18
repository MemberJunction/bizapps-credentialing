/**
 * Staff Pipeline page — lists applications across the staff member's organizations, filters by
 * status and program, pages by 50 rows, hosts the Invite Applicant wizard, and lets staff send a
 * new invitation link to any contact.
 */
import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UUIDsEqual } from '@memberjunction/global';
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
import {
    ApplicationLifecycleRules,
    GetApplicationWorkspaceOperation,
    GetDocumentLibraryOperation,
    GetSubmissionGateOperation,
    ReissueInvitationOperation,
    ReopenResponseOperation,
    ResponseRules,
    WithdrawApplicationOperation,
    type ApplicationStatus,
    type ApplicationWorkspace,
    type DocumentLedger,
    type DocumentLibrary,
    type GetSubmissionGateOutput,
    type InviteApplicantOutput,
    type LibraryDocument,
    type ResponseStatus,
    type WorkspaceCitation,
    type WorkspaceStandard,
} from '@mj-biz-apps/credentialing-core';
import { DocumentViewerComponent, type ViewerCitation, type ViewerTab } from '../../applicant/documents/document-viewer.component';
import { EvidenceClient } from '../../applicant/documents/evidence-client';
import { FormatLibraryDate, FormatWhatWasRead } from '../../applicant/documents/library-model';
import { RequirementLedgerComponent } from '../../applicant/documents/requirement-ledger.component';
import { VersionHistoryComponent } from '../../applicant/documents/version-history.component';
import {
    ApplyResponseUpdate,
    ResponseStateLabel,
} from '../../applicant/standards-runner/runner-model';
import { StudioMessages } from '../studio-messages';
import { InviteWizardComponent } from './invite-wizard.component';
import { FormatInvitationOutcome, type FormattedInvitationOutcome } from './invite-wizard-model';
import {
    FilterPipelineApplications,
    PIPELINE_PAGE_SIZE,
    PageSlice,
    PipelineData,
    type PagedSlice,
    type PipelineApplicationRow,
    type PipelineContactRow,
    type PipelineSnapshot,
} from './pipeline-data';

interface FilterChoice {
    ID: string;
    Label: string;
}

const STATUS_CHOICES: readonly FilterChoice[] = [
    { ID: 'All', Label: 'All statuses' },
    { ID: 'Draft', Label: 'Draft' },
    { ID: 'Submitted', Label: 'Submitted' },
    { ID: 'Screening', Label: 'Screening' },
    { ID: 'In Review', Label: 'In Review' },
    { ID: 'Info Requested', Label: 'Info Requested' },
    { ID: 'Committee', Label: 'Committee' },
    { ID: 'Executive Sign-Off', Label: 'Executive Sign-Off' },
    { ID: 'Decided', Label: 'Decided' },
    { ID: 'Closed', Label: 'Closed' },
    { ID: 'Withdrawn', Label: 'Withdrawn' },
];

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
});

@Component({
    standalone: true,
    selector: 'bizapps-cred-pipeline',
    imports: [
        FormsModule,
        SharedGenericModule,
        MJAlertComponent,
        MJButtonDirective,
        MJDialogComponent,
        MJDialogActionsComponent,
        MJDropdownComponent,
        MJEmptyStateComponent,
        InviteWizardComponent,
        RequirementLedgerComponent,
        DocumentViewerComponent,
        VersionHistoryComponent,
    ],
    templateUrl: './pipeline.page.html',
    styleUrls: ['./pipeline.page.scss'],
})
export class PipelinePage extends BaseAngularComponent implements OnInit {
    private readonly cdr = inject(ChangeDetectorRef);
    private _statusFilter = 'All';
    private _programFilter = 'All';
    private _requestedApplicationID: string | null = null;

    @ViewChild('detailSection') public DetailSectionRef?: ElementRef<HTMLElement>;

    @Input()
    public get SelectedApplicationID(): string | null {
        return this._requestedApplicationID;
    }
    public set SelectedApplicationID(value: string | null) {
        const normalized = value?.trim() || null;
        if (normalized !== this._requestedApplicationID) {
            this._requestedApplicationID = normalized;
            if (normalized && this.Snapshot.Applications.length > 0) {
                void this.openRequestedApplication();
            }
        }
    }

    public readonly PageSize = PIPELINE_PAGE_SIZE;
    public Snapshot: PipelineSnapshot = { Applications: [], Programs: [], ActiveTargets: [], Subjects: [] };
    public PageIndex = 0;
    public IsLoading = false;
    public ErrorMessage = '';

    public InviteDialogOpen = false;
    public ReissuingContactID: string | null = null;
    public ReissueOutcome: FormattedInvitationOutcome | null = null;
    public ReissueDialogOpen = false;
    public ReissueError = '';
    public ReissueCopied = false;

    public SelectedApplication: PipelineApplicationRow | null = null;
    public DetailWorkspace: ApplicationWorkspace | null = null;
    public DetailGate: GetSubmissionGateOutput | null = null;
    public DetailLoading = false;
    public DetailError = '';
    public DetailLibrary: DocumentLibrary | null = null;
    public DetailDocumentsError = '';
    public DownloadingDocumentID: string | null = null;

    public ViewerOpen = false;
    public ViewerDocumentID: string | null = null;
    public ViewerFileName = '';
    public ViewerContentType = '';
    public ViewerCitation: ViewerCitation | null = null;
    public ViewerInitialTab: ViewerTab = 'original';

    public VersionsOpen = false;
    public VersionsDocument: LibraryDocument | null = null;

    public ReopenDialogOpen = false;
    public ReopenTarget: WorkspaceStandard | null = null;
    public ReopenReason = '';
    public ReopenError = '';
    public IsReopening = false;

    public WithdrawDialogOpen = false;
    public WithdrawReason = '';
    public WithdrawError = '';
    public IsWithdrawing = false;

    public get StatusFilter(): string {
        return this._statusFilter;
    }
    public set StatusFilter(value: string) {
        const next = value || 'All';
        if (next !== this._statusFilter) {
            this._statusFilter = next;
            this.PageIndex = 0;
        }
    }

    public get ProgramFilter(): string {
        return this._programFilter;
    }
    public set ProgramFilter(value: string) {
        const next = value || 'All';
        if (next !== this._programFilter) {
            this._programFilter = next;
            this.PageIndex = 0;
        }
    }

    public get StatusChoices(): readonly FilterChoice[] {
        return STATUS_CHOICES;
    }

    public get ProgramChoices(): FilterChoice[] {
        return [
            { ID: 'All', Label: 'All programs' },
            ...this.Snapshot.Programs.map((p) => ({ ID: p.ID, Label: p.Name })),
        ];
    }

    public get FilteredApplications(): PipelineApplicationRow[] {
        return FilterPipelineApplications(this.Snapshot.Applications, {
            Status: this._statusFilter,
            ProgramID: this._programFilter,
        });
    }

    public get Page(): PagedSlice<PipelineApplicationRow> {
        return PageSlice(this.FilteredApplications, this.PageIndex, this.PageSize);
    }

    ngOnInit(): void {
        void this.Load();
    }

    public async Load(): Promise<void> {
        this.IsLoading = true;
        this.ErrorMessage = '';
        this.cdr.markForCheck();
        try {
            this.Snapshot = await PipelineData.FromProvider(this.ProviderToUse).Load();
            await this.openRequestedApplication();
        } catch (e) {
            this.ErrorMessage = StudioMessages.FromError(e, 'load');
        } finally {
            this.IsLoading = false;
            this.cdr.markForCheck();
        }
    }

    public PreviousPage(): void {
        if (this.Page.PageIndex > 0) {
            this.PageIndex = this.Page.PageIndex - 1;
        }
    }

    public NextPage(): void {
        const page = this.Page;
        if (page.PageIndex + 1 < page.TotalPages) {
            this.PageIndex = page.PageIndex + 1;
        }
    }

    public OpenInviteWizard(): void {
        this.InviteDialogOpen = true;
    }

    public CloseInviteWizard(): void {
        this.InviteDialogOpen = false;
    }

    public async OnInvited(_output: InviteApplicantOutput): Promise<void> {
        await this.Load();
    }

    public async Reissue(contact: PipelineContactRow): Promise<void> {
        if (this.ReissuingContactID != null) return;
        this.ReissuingContactID = contact.ID;
        this.ReissueError = '';
        this.ReissueOutcome = null;
        this.ReissueCopied = false;
        this.cdr.markForCheck();
        try {
            const result = await new ReissueInvitationOperation().Execute(
                { SubjectContactID: contact.ID },
                { provider: this.ProviderToUse },
            );
            if (result.Success && result.Output) {
                this.ReissueOutcome = FormatInvitationOutcome(contact.Email, result.Output);
                this.ReissueDialogOpen = true;
                await this.Load();
            } else {
                this.ReissueError = StudioMessages.ForUser(result.ErrorMessage || 'Could not create a new invitation link.');
            }
        } catch (e) {
            this.ReissueError = StudioMessages.FromError(e, 'save');
        } finally {
            this.ReissuingContactID = null;
            this.cdr.markForCheck();
        }
    }

    public async CopyReissueLink(): Promise<void> {
        const url = this.ReissueOutcome?.InvitationUrl;
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            this.ReissueCopied = true;
            this.cdr.markForCheck();
        } catch {
            // Leave the URL readable for manual selection.
        }
    }

    public CloseReissueDialog(): void {
        this.ReissueDialogOpen = false;
        this.ReissueOutcome = null;
        this.ReissueCopied = false;
    }

    public async OpenDetail(row: PipelineApplicationRow): Promise<void> {
        this.SelectedApplication = row;
        await this.loadDetailWorkspace(row.ID, row.SubjectID);
    }

    public CloseDetail(): void {
        this.SelectedApplication = null;
        this.DetailWorkspace = null;
        this.DetailGate = null;
        this.DetailLibrary = null;
        this.DetailError = '';
        this.DetailDocumentsError = '';
    }

    private async openRequestedApplication(): Promise<void> {
        const requested = this._requestedApplicationID;
        if (!requested) return;
        const match = this.Snapshot.Applications.find((a) => UUIDsEqual(a.ID, requested));
        if (!match) return;
        if (!this.SelectedApplication || !UUIDsEqual(this.SelectedApplication.ID, match.ID)) {
            await this.OpenDetail(match);
        }
        setTimeout(() => {
            this.DetailSectionRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 0);
    }

    public get DetailLedger(): DocumentLedger | null {
        if (!this.DetailLibrary || !this.SelectedApplication) return null;
        const appID = this.SelectedApplication.ID;
        return this.DetailLibrary.Ledgers.find((l) => UUIDsEqual(l.ApplicationID, appID)) ?? null;
    }

    public OpenDocumentViewer(doc: LibraryDocument): void {
        this.ViewerDocumentID = doc.EvidenceDocumentID;
        this.ViewerFileName = doc.FileName;
        this.ViewerContentType = doc.ContentType;
        this.ViewerCitation = null;
        this.ViewerInitialTab = 'original';
        this.ViewerOpen = true;
        this.cdr.markForCheck();
    }

    public OpenCitationViewer(citation: WorkspaceCitation): void {
        this.ViewerDocumentID = citation.EvidenceDocumentID;
        this.ViewerFileName = citation.SourceLabel;
        this.ViewerContentType = '';
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
        this.DetailDocumentsError = '';
        this.cdr.markForCheck();
        try {
            const client = new EvidenceClient(this.ProviderToUse);
            await client.Download(doc.EvidenceDocumentID, doc.FileName);
        } catch (err) {
            this.DetailDocumentsError = StudioMessages.FromError(err, 'load');
        } finally {
            this.DownloadingDocumentID = null;
            this.cdr.markForCheck();
        }
    }

    public FormatDocumentDate(iso: string | null | undefined): string {
        return FormatLibraryDate(iso);
    }

    public WhatWasRead(doc: LibraryDocument): string {
        return FormatWhatWasRead(doc);
    }

    public CanReopen(appStatus: ApplicationStatus, respStatus: ResponseStatus): boolean {
        return ResponseRules.CanReopen(
            appStatus,
            { Status: respStatus, AuthorType: 'Human', ResponseText: null, SelfAssessment: null },
            'reason',
        ).Allowed;
    }

    public CanWithdraw(appStatus: ApplicationStatus): boolean {
        return ApplicationLifecycleRules.CanWithdraw(appStatus, 'Staff', 'reason').Allowed;
    }

    public FormatResponseState(status: ResponseStatus): string {
        return ResponseStateLabel(status);
    }

    public OpenReopenDialog(standard: WorkspaceStandard): void {
        this.ReopenTarget = standard;
        this.ReopenReason = '';
        this.ReopenError = '';
        this.ReopenDialogOpen = true;
    }

    public CloseReopenDialog(): void {
        this.ReopenDialogOpen = false;
        this.ReopenTarget = null;
        this.ReopenReason = '';
        this.ReopenError = '';
    }

    public async ConfirmReopen(): Promise<void> {
        if (!this.DetailWorkspace || !this.ReopenTarget || this.IsReopening) return;
        const rule = ResponseRules.CanReopen(
            this.DetailWorkspace.Application.Status,
            {
                Status: this.ReopenTarget.Response.Status,
                AuthorType: this.ReopenTarget.Response.AuthorType,
                ResponseText: this.ReopenTarget.Response.ResponseText,
                SelfAssessment: this.ReopenTarget.Response.SelfAssessment,
            },
            this.ReopenReason,
        );
        if (!rule.Allowed) {
            this.ReopenError = rule.Reason;
            this.cdr.markForCheck();
            return;
        }
        this.IsReopening = true;
        this.ReopenError = '';
        this.cdr.markForCheck();
        try {
            const res = await new ReopenResponseOperation().Execute(
                { ResponseID: this.ReopenTarget.Response.ResponseID, Reason: this.ReopenReason },
                { provider: this.ProviderToUse },
            );
            if (!res.Success || res.Output == null) {
                this.ReopenError = StudioMessages.ForUser(res.ErrorMessage || 'Could not reopen this answer.', 'save');
                return;
            }
            this.DetailWorkspace = ApplyResponseUpdate(this.DetailWorkspace, res.Output.Response);
            this.CloseReopenDialog();
        } catch (e) {
            this.ReopenError = StudioMessages.FromError(e, 'save');
        } finally {
            this.IsReopening = false;
            this.cdr.markForCheck();
        }
    }

    public OpenWithdrawDialog(): void {
        this.WithdrawReason = '';
        this.WithdrawError = '';
        this.WithdrawDialogOpen = true;
    }

    public CloseWithdrawDialog(): void {
        this.WithdrawDialogOpen = false;
        this.WithdrawReason = '';
        this.WithdrawError = '';
    }

    public async ConfirmWithdraw(): Promise<void> {
        if (!this.DetailWorkspace || this.IsWithdrawing) return;
        const appID = this.DetailWorkspace.Application.ApplicationID;
        const rule = ApplicationLifecycleRules.CanWithdraw(
            this.DetailWorkspace.Application.Status,
            'Staff',
            this.WithdrawReason,
        );
        if (!rule.Allowed) {
            this.WithdrawError = rule.Reason;
            this.cdr.markForCheck();
            return;
        }
        this.IsWithdrawing = true;
        this.WithdrawError = '';
        this.cdr.markForCheck();
        try {
            const res = await new WithdrawApplicationOperation().Execute(
                { ApplicationID: appID, Reason: this.WithdrawReason },
                { provider: this.ProviderToUse },
            );
            if (!res.Success || res.Output == null) {
                this.WithdrawError = StudioMessages.ForUser(res.ErrorMessage || 'Could not withdraw this application.', 'save');
                return;
            }
            this.CloseWithdrawDialog();
            await Promise.all([this.Load(), this.loadDetailWorkspace(appID, this.DetailWorkspace.Application.SubjectID)]);
        } catch (e) {
            this.WithdrawError = StudioMessages.FromError(e, 'save');
        } finally {
            this.IsWithdrawing = false;
            this.cdr.markForCheck();
        }
    }

    private async loadDetailWorkspace(applicationID: string, subjectID: string): Promise<void> {
        this.DetailLoading = true;
        this.DetailError = '';
        this.DetailDocumentsError = '';
        this.DetailWorkspace = null;
        this.DetailGate = null;
        this.DetailLibrary = null;
        this.cdr.markForCheck();
        try {
            const [workspaceRes, libraryRes, gateRes] = await Promise.all([
                new GetApplicationWorkspaceOperation().Execute(
                    { ApplicationID: applicationID },
                    { provider: this.ProviderToUse },
                ),
                new GetDocumentLibraryOperation()
                    .Execute({ SubjectID: subjectID }, { provider: this.ProviderToUse })
                    .catch((err) => ({
                        Success: false,
                        ResultCode: 'EXECUTION_ERROR',
                        ErrorMessage: err instanceof Error ? err.message : String(err),
                        Output: undefined,
                    })),
                new GetSubmissionGateOperation()
                    .Execute({ ApplicationID: applicationID }, { provider: this.ProviderToUse })
                    .catch((err) => ({
                        Success: false,
                        ResultCode: 'EXECUTION_ERROR',
                        ErrorMessage: err instanceof Error ? err.message : String(err),
                        Output: undefined,
                    })),
            ]);
            if (!workspaceRes.Success || workspaceRes.Output == null) {
                this.DetailError = StudioMessages.ForUser(workspaceRes.ErrorMessage || 'Could not load application answers.', 'load');
                return;
            }
            this.DetailWorkspace = workspaceRes.Output;
            if (gateRes.Success && gateRes.Output != null) {
                this.DetailGate = gateRes.Output;
            }
            if (libraryRes.Success && libraryRes.Output != null) {
                this.DetailLibrary = libraryRes.Output;
            } else {
                this.DetailDocumentsError = StudioMessages.ForUser(libraryRes.ErrorMessage || 'Could not load applicant documents.', 'load');
            }
        } catch (e) {
            this.DetailError = StudioMessages.FromError(e, 'load');
        } finally {
            this.DetailLoading = false;
            this.cdr.markForCheck();
        }
    }

    public FormatStatus(status: ApplicationStatus | string): string {
        switch (status) {
            case 'UnderReview':
                return 'Under Review';
            case 'InformationRequested':
                return 'Information Requested';
            default:
                return status;
        }
    }

    public FormatSubmittedDate(submittedAt: string | null): string {
        if (!submittedAt) return '—';
        const parsed = new Date(submittedAt);
        return Number.isNaN(parsed.getTime()) ? submittedAt : SHORT_DATE_FORMAT.format(parsed);
    }
}
