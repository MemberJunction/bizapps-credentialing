/**
 * My Applications — the Applicant area's home screen (FRD FR-3.4).
 *
 * Loads the signed-in caller's subjects and applications via `Credentialing.GetMySubjects`,
 * automatically opens the single subject when there is only one, lands on the subject picker when
 * there are two or more without a selection, refuses a foreign `subjectId` on the URL, and emits
 * navigation intents when the applicant chooses a subject or opens an application.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJButtonDirective, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import { GetMySubjectsOperation, type ApplicationStatus, type MyApplication, type MySubject } from '@mj-biz-apps/credentialing-core';
import { SubjectContext } from '../../shared/subject-context.service';
import { ApplicantMessages } from '../shared/applicant-messages';
import {
    APPLICANT_NOT_AVAILABLE_MESSAGE,
    FormatApplicationAction,
    FormatApplicationProgress,
    NO_APPLICATIONS_MESSAGE,
    NO_SUBJECT_MESSAGE,
    PICKER_HEADING,
    ResolveApplicantView,
    type ApplicantViewResolution,
} from './my-applications-model';

/** Intent emitted when the applicant clicks `Continue` or `View` on an application. */
export interface OpenApplicationIntent {
    SubjectID: string;
    ApplicationID: string;
}

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
});

@Component({
    standalone: true,
    selector: 'bizapps-cred-my-applications',
    imports: [SharedGenericModule, MJAlertComponent, MJButtonDirective, MJEmptyStateComponent],
    templateUrl: './my-applications.page.html',
    styleUrls: ['./my-applications.page.scss'],
})
export class MyApplicationsPage extends BaseAngularComponent implements OnInit {
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly subjectContext = inject(SubjectContext);
    private _queryParams: Record<string, string> = {};
    private loaded = false;

    public readonly NoSubjectMessage = NO_SUBJECT_MESSAGE;
    public readonly NoApplicationsMessage = NO_APPLICATIONS_MESSAGE;
    public readonly PickerHeading = PICKER_HEADING;
    public readonly NotAvailableMessage = APPLICANT_NOT_AVAILABLE_MESSAGE;

    public Subjects: readonly MySubject[] = [];
    public View: ApplicantViewResolution = { Kind: 'NoSubjects' };
    public IsLoading = false;
    public ErrorMessage = '';

    @Input()
    public get QueryParams(): Record<string, string> {
        return this._queryParams;
    }
    public set QueryParams(value: Record<string, string> | null | undefined) {
        this._queryParams = value ?? {};
        if (this.loaded) {
            this.resolveView();
        }
    }

    /** Emitted whenever the active subject should be written to or cleared from the URL. */
    @Output() public readonly SubjectSelected = new EventEmitter<string | null>();

    /** Emitted when the applicant clicks `Continue` or `View` on an application row. */
    @Output() public readonly OpenApplication = new EventEmitter<OpenApplicationIntent>();

    ngOnInit(): void {
        void this.Load();
    }

    public async Load(): Promise<void> {
        this.IsLoading = true;
        this.ErrorMessage = '';
        this.cdr.markForCheck();
        try {
            const result = await new GetMySubjectsOperation().Execute({}, { provider: this.ProviderToUse });
            if (!result.Success || result.Output == null) {
                this.ErrorMessage = ApplicantMessages.ForUser(result.ErrorMessage || 'Could not load your applications.', 'load');
                return;
            }
            this.Subjects = result.Output.Subjects;
            this.loaded = true;
            this.resolveView();
        } catch (e) {
            this.ErrorMessage = ApplicantMessages.FromError(e, 'load');
        } finally {
            this.IsLoading = false;
            this.cdr.markForCheck();
        }
    }

    public SelectSubject(subject: MySubject): void {
        this.subjectContext.Choose(subject.SubjectID);
        this._queryParams = { ...this._queryParams, subjectId: subject.SubjectID };
        this.resolveView(false);
        this.SubjectSelected.emit(subject.SubjectID);
    }

    public SwitchSubject(): void {
        this.subjectContext.Clear();
        const next = { ...this._queryParams };
        delete next['subjectId'];
        this._queryParams = next;
        this.resolveView(false);
        this.SubjectSelected.emit(null);
    }

    public OpenApp(subject: MySubject, app: MyApplication): void {
        this.OpenApplication.emit({ SubjectID: subject.SubjectID, ApplicationID: app.ApplicationID });
    }

    public ActionLabel(status: ApplicationStatus): 'Continue' | 'View' {
        return FormatApplicationAction(status);
    }

    public ProgressText(app: MyApplication): string {
        return FormatApplicationProgress(app);
    }

    public FormatSubmitted(submittedAt: string | null): string | null {
        if (!submittedAt) return null;
        const parsed = new Date(submittedAt);
        return Number.isNaN(parsed.getTime()) ? submittedAt : SHORT_DATE_FORMAT.format(parsed);
    }

    public StatusIcon(status: ApplicationStatus): string {
        switch (status) {
            case 'Draft':
                return 'fa-solid fa-pen-to-square';
            case 'Submitted':
            case 'Screening':
            case 'In Review':
                return 'fa-solid fa-hourglass-half';
            case 'Info Requested':
                return 'fa-solid fa-circle-question';
            case 'Committee':
            case 'Executive Sign-Off':
                return 'fa-solid fa-scale-balanced';
            case 'Decided':
            case 'Closed':
                return 'fa-solid fa-circle-check';
            case 'Withdrawn':
                return 'fa-solid fa-ban';
        }
    }

    private resolveView(emitSync: boolean = true): void {
        const resolution = ResolveApplicantView(this._queryParams, this.Subjects, this.subjectContext.SubjectID());
        this.View = resolution;
        if (resolution.Kind === 'Applications') {
            this.subjectContext.Choose(resolution.Subject.SubjectID);
            if (emitSync && resolution.NeedsUrlSync) {
                this.SubjectSelected.emit(resolution.Subject.SubjectID);
            }
        } else if (resolution.Kind === 'NotAvailable') {
            this.subjectContext.Clear();
        }
        this.cdr.markForCheck();
    }
}
