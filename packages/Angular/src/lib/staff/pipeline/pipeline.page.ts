/**
 * Staff Pipeline page — lists applications across the staff member's organizations, filters by
 * status and program, pages by 50 rows, hosts the Invite Applicant wizard, and lets staff send a
 * new invitation link to any contact.
 */
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
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
import {
    ReissueInvitationOperation,
    type ApplicationStatus,
    type InviteApplicantOutput,
} from '@mj-biz-apps/credentialing-core';
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
    { ID: 'UnderReview', Label: 'Under Review' },
    { ID: 'InformationRequested', Label: 'Information Requested' },
    { ID: 'Decided', Label: 'Decided' },
    { ID: 'Withdrawn', Label: 'Withdrawn' },
    { ID: 'Expired', Label: 'Expired' },
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
    ],
    templateUrl: './pipeline.page.html',
    styleUrls: ['./pipeline.page.scss'],
})
export class PipelinePage extends BaseAngularComponent implements OnInit {
    private readonly cdr = inject(ChangeDetectorRef);
    private _statusFilter = 'All';
    private _programFilter = 'All';

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
