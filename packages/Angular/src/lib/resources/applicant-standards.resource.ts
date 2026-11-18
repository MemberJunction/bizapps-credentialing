/**
 * Applicant Standards resource — guarded by {@link CredentialingAreaResource} and
 * {@link ApplicantSubjectResource}. Hosts the Standards Runner and synchronizes `subjectId`,
 * `applicationId`, `sectionId`, and `filter` with the URL.
 */
import { Component, inject } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass, UUIDsEqual } from '@memberjunction/global';
import { BaseResourceComponent, NavigationService } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import type { MySubject } from '@mj-biz-apps/credentialing-core';
import { CredentialingResource } from '../application/area-nav';
import {
    ParseRunnerFilter,
    type RunnerFilter,
} from '../applicant/standards-runner/runner-model';
import {
    StandardsRunnerPage,
    type RunnerNavigationState,
} from '../applicant/standards-runner/standards-runner.page';
import { ReviewSubmitPage } from '../applicant/submit/review-submit.page';
import type { SubmitGapLink } from '../applicant/submit/submit-model';
import { SUBJECT_ID_PARAM } from '../shared/subject-context.service';
import { ApplicantSubjectResource } from './applicant-subject-resource';

@RegisterClass(BaseResourceComponent, 'CredentialingApplicantStandardsResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-applicant-standards-resource',
    imports: [
        SharedGenericModule,
        MJAlertComponent,
        MJEmptyStateComponent,
        StandardsRunnerPage,
        ReviewSubmitPage,
    ],
    template: `
        <div class="cred-resource">
            @switch (State) {
                @case ('Loading') {
                    <mj-loading Text="Loading Standards..."></mj-loading>
                }
                @case ('NotAvailable') {
                    <mj-empty-state Icon="fa-solid fa-lock" [Message]="NotAvailableMessage" Role="status"></mj-empty-state>
                }
                @case ('Error') {
                    <mj-alert Variant="error" Title="Standards could not load" [Message]="ErrorMessage"></mj-alert>
                }
                @case ('Open') {
                    @if (Resolution.Kind === 'PickSubject') {
                        <section class="cred-picker" aria-labelledby="cred-standards-picker-heading">
                            <h1 id="cred-standards-picker-heading" class="cred-picker__title">{{ PickerHeading }}</h1>
                            <ul class="cred-picker__list">
                                @for (subject of Resolution.Subjects; track subject.SubjectID) {
                                    <li>
                                        <button type="button" class="cred-picker__btn" (click)="SelectSubject(subject)">
                                            {{ subject.DisplayName }}
                                        </button>
                                    </li>
                                }
                            </ul>
                        </section>
                    } @else if (ActiveSubject) {
                        @if (ViewMode === 'submit') {
                            <bizapps-cred-review-submit
                                [Provider]="Provider"
                                [Subject]="ActiveSubject"
                                [ApplicationID]="ApplicationID"
                                (BackToStandards)="OnBackToStandards()"
                                (NavigateToGap)="OnNavigateToGap($event)"
                                (Submitted)="OnApplicationSubmitted()">
                            </bizapps-cred-review-submit>
                        } @else {
                            <bizapps-cred-standards-runner
                                [Provider]="Provider"
                                [Subject]="ActiveSubject"
                                [ApplicationID]="ApplicationID"
                                [SectionID]="SectionID"
                                [StandardID]="StandardID"
                                [Filter]="Filter"
                                (SelectionChanged)="OnRunnerSelectionChanged($event)"
                                (Withdrawn)="OnApplicationWithdrawn()"
                                (ReviewAndSubmit)="OnReviewAndSubmit($event)">
                            </bizapps-cred-standards-runner>
                        }
                    }
                }
            }
        </div>
    `,
    styles: [`
        :host { display: block; width: 100%; height: 100%; }
        .cred-resource { height: 100%; padding: var(--mj-space-6); box-sizing: border-box; color: var(--mj-text-primary); overflow: auto; }
        .cred-picker__title { margin: 0 0 var(--mj-space-3); font-size: var(--mj-text-xl, 1.25rem); }
        .cred-picker__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--mj-space-2); max-width: 36rem; }
        .cred-picker__btn { width: 100%; min-height: 44px; padding: var(--mj-space-3); text-align: left; border: 1px solid var(--mj-border-default); border-radius: var(--mj-radius-md, 6px); background: var(--mj-bg-surface); color: var(--mj-text-primary); cursor: pointer; }
    `],
})
export class CredentialingApplicantStandardsResource extends ApplicantSubjectResource {
    private readonly navigation = inject(NavigationService, { optional: true });
    public ActiveSubject: MySubject | null = null;
    public ApplicationID: string | null = null;
    public SectionID: string | null = null;
    public StandardID: string | null = null;
    public Filter: RunnerFilter = 'needs-review';
    public ViewMode: 'standards' | 'submit' = 'standards';

    protected get DriverClass(): string {
        return CredentialingResource.ApplicantStandards;
    }

    protected override async OnSubjectResolved(subject: MySubject, params: Record<string, string>): Promise<void> {
        this.ActiveSubject = subject;
        this.applyRunnerParams(params);
    }

    protected override OnQueryParamsChanged(params: Record<string, string>, source: 'popstate' | 'deeplink'): void {
        const incomingSubject = params[SUBJECT_ID_PARAM]?.trim() || null;
        if (incomingSubject && (!this.ActiveSubject || !UUIDsEqual(incomingSubject, this.ActiveSubject.SubjectID))) {
            super.OnQueryParamsChanged(params, source);
            return;
        }
        if (!this.ActiveSubject) {
            return;
        }
        this.applyRunnerParams(params);
        this.cdr.markForCheck();
    }

    public OnRunnerSelectionChanged(state: RunnerNavigationState): void {
        this.ApplicationID = state.ApplicationID;
        this.SectionID = state.SectionID;
        this.Filter = state.Filter;
        const subjectID = this.ActiveSubject?.SubjectID ?? null;
        this.UpdateQueryParams({
            [SUBJECT_ID_PARAM]: subjectID,
            applicationId: state.ApplicationID,
            sectionId: state.SectionID,
            standardId: this.StandardID,
            filter: state.Filter,
            view: this.ViewMode === 'submit' ? 'submit' : null,
        });
    }

    public OnReviewAndSubmit(applicationID: string): void {
        this.ApplicationID = applicationID;
        this.ViewMode = 'submit';
        this.UpdateQueryParams({
            [SUBJECT_ID_PARAM]: this.ActiveSubject?.SubjectID ?? null,
            applicationId: applicationID,
            view: 'submit',
            sectionId: null,
            standardId: null,
        });
        this.cdr.markForCheck();
    }

    public OnBackToStandards(): void {
        this.ViewMode = 'standards';
        this.UpdateQueryParams({
            [SUBJECT_ID_PARAM]: this.ActiveSubject?.SubjectID ?? null,
            applicationId: this.ApplicationID,
            sectionId: this.SectionID,
            standardId: null,
            filter: this.Filter,
            view: null,
        });
        this.cdr.markForCheck();
    }

    public OnNavigateToGap(link: SubmitGapLink): void {
        const subjectID = this.ActiveSubject?.SubjectID ?? null;
        if (link.Screen === 'Documents') {
            void this.navigation?.OpenNavItemByName('Documents', undefined, undefined, {
                queryParams: {
                    [SUBJECT_ID_PARAM]: subjectID,
                    requirementId: link.RequirementID ?? null,
                },
            });
            return;
        }
        this.ViewMode = 'standards';
        this.SectionID = link.SectionID;
        this.StandardID = link.StandardID;
        this.Filter = link.StandardID ? 'all' : 'needs-review';
        this.UpdateQueryParams({
            [SUBJECT_ID_PARAM]: subjectID,
            applicationId: this.ApplicationID,
            sectionId: this.SectionID,
            standardId: this.StandardID,
            filter: this.Filter,
            view: null,
        });
        this.cdr.markForCheck();
    }

    public async OnApplicationSubmitted(): Promise<void> {
        const standing = await this.StandingLoader().Load();
        await this.OnOpen(standing);
    }

    public async OnApplicationWithdrawn(): Promise<void> {
        const standing = await this.StandingLoader().Load();
        await this.OnOpen(standing);
    }

    private applyRunnerParams(params: Record<string, string>): void {
        this.ApplicationID = params['applicationId']?.trim() || null;
        this.SectionID = params['sectionId']?.trim() || null;
        this.StandardID = params['standardId']?.trim() || null;
        this.ViewMode = params['view']?.trim() === 'submit' ? 'submit' : 'standards';
        if (params['filter']) {
            this.Filter = ParseRunnerFilter(params['filter']);
        } else if (this.StandardID) {
            this.Filter = 'all';
        } else {
            this.Filter = 'needs-review';
        }
    }

    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'Standards';
    }

    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-list-check';
    }
}

/** Tree-shaking anchor, called by the client bootstrap. */
export function LoadCredentialingApplicantStandardsResource(): void {
    void CredentialingApplicantStandardsResource;
}
