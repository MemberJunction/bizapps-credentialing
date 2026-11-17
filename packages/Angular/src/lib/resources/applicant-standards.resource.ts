/**
 * Applicant Standards resource — guarded by {@link CredentialingAreaResource} and
 * {@link ApplicantSubjectResource}. Hosts the Standards Runner and synchronizes `subjectId`,
 * `applicationId`, `sectionId`, and `filter` with the URL.
 */
import { Component } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
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
import { SUBJECT_ID_PARAM } from '../shared/subject-context.service';
import { ApplicantSubjectResource } from './applicant-subject-resource';

@RegisterClass(BaseResourceComponent, 'CredentialingApplicantStandardsResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-applicant-standards-resource',
    imports: [SharedGenericModule, MJAlertComponent, MJEmptyStateComponent, StandardsRunnerPage],
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
                        <bizapps-cred-standards-runner
                            [Provider]="Provider"
                            [Subject]="ActiveSubject"
                            [ApplicationID]="ApplicationID"
                            [SectionID]="SectionID"
                            [Filter]="Filter"
                            (SelectionChanged)="OnRunnerSelectionChanged($event)"
                            (Withdrawn)="OnApplicationWithdrawn()">
                        </bizapps-cred-standards-runner>
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
    public ActiveSubject: MySubject | null = null;
    public ApplicationID: string | null = null;
    public SectionID: string | null = null;
    public Filter: RunnerFilter = 'needs-review';

    protected get DriverClass(): string {
        return CredentialingResource.ApplicantStandards;
    }

    protected override async OnSubjectResolved(subject: MySubject, params: Record<string, string>): Promise<void> {
        this.ActiveSubject = subject;
        this.ApplicationID = params['applicationId']?.trim() || null;
        this.SectionID = params['sectionId']?.trim() || null;
        this.Filter = ParseRunnerFilter(params['filter']);
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
            filter: state.Filter,
        });
    }

    public async OnApplicationWithdrawn(): Promise<void> {
        const standing = await this.StandingLoader().Load();
        await this.OnOpen(standing);
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
