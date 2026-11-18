/**
 * Shared base for Applicant-area resources other than My Applications (`Standards`, `Documents`).
 *
 * Ensures the active subject is resolved from the URL's `subjectId` or {@link SubjectContext},
 * refuses a deep link naming a subject the caller holds no contact row on (`This area is not
 * available to your account.`), shows the subject picker when multiple subjects exist without a
 * selection, and keeps `subjectId` on the URL across reloads and navigation.
 */
import { Directive, inject } from '@angular/core';
import { GetMySubjectsOperation, type MySubject } from '@mj-biz-apps/credentialing-core';
import type { Standing } from '../application/area-nav';
import { PICKER_HEADING, ResolveApplicantView, type ApplicantViewResolution } from '../applicant/my-applications/my-applications-model';
import { SUBJECT_ID_PARAM, SubjectContext } from '../shared/subject-context.service';
import { CredentialingAreaResource } from './credentialing-area-resource';

@Directive()
export abstract class ApplicantSubjectResource extends CredentialingAreaResource {
    protected readonly subjectContext = inject(SubjectContext);

    public readonly PickerHeading = PICKER_HEADING;
    public Subjects: readonly MySubject[] = [];
    public Resolution: ApplicantViewResolution = { Kind: 'NoSubjects' };
    public QueryParams: Record<string, string> = {};

    /** Called once a subject has been resolved for this resource. */
    protected async OnSubjectResolved(_subject: MySubject, _params: Record<string, string>): Promise<void> {
        // Subclasses load their subject-scoped data here.
    }

    protected override async OnOpen(_standing: Standing): Promise<void> {
        this.QueryParams = this.GetQueryParams();
        const res = await new GetMySubjectsOperation().Execute({}, { provider: this.ProviderToUse });
        if (!res.Success || res.Output == null) {
            throw new Error(res.ErrorMessage || 'Could not load your applicant context.');
        }
        this.Subjects = res.Output.Subjects;
        const freshParams = this.GetQueryParams();
        if (Object.keys(freshParams).length > 0) {
            this.QueryParams = freshParams;
        }
        await this.applyParams(this.QueryParams);
    }

    public async SelectSubject(subject: MySubject): Promise<void> {
        this.subjectContext.Choose(subject.SubjectID);
        this.QueryParams = { ...this.QueryParams, [SUBJECT_ID_PARAM]: subject.SubjectID };
        this.UpdateQueryParams({ [SUBJECT_ID_PARAM]: subject.SubjectID });
        await this.applyParams(this.QueryParams, false);
    }

    protected override OnQueryParamsChanged(params: Record<string, string>, _source: 'popstate' | 'deeplink'): void {
        this.QueryParams = params;
        if (this.State === 'Open' || this.Subjects.length > 0) {
            void this.applyParams(params);
        }
    }

    private async applyParams(params: Record<string, string>, syncUrl: boolean = true): Promise<void> {
        const resolution = ResolveApplicantView(params, this.Subjects, this.subjectContext.SubjectID());
        this.Resolution = resolution;
        if (resolution.Kind === 'NotAvailable') {
            this.subjectContext.Clear();
            this.State = 'NotAvailable';
            this.cdr.markForCheck();
            return;
        }
        if (resolution.Kind === 'Applications') {
            this.subjectContext.Choose(resolution.Subject.SubjectID);
            if (syncUrl && resolution.NeedsUrlSync) {
                this.UpdateQueryParams({ [SUBJECT_ID_PARAM]: resolution.Subject.SubjectID });
            }
            await this.OnSubjectResolved(resolution.Subject, params);
        }
        this.cdr.markForCheck();
    }
}
