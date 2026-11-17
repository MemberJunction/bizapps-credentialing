/**
 * Applicant home — the Applicant area's My Applications tab, rendered in MJ Explorer.
 *
 * Guarded by {@link CredentialingAreaResource}: only a holder of Credentialing Applicant opens it.
 * Carries `subjectId` on the URL via `UpdateQueryParams` and routes `Continue` / `View` to the
 * `Standards` nav item with `subjectId` and `applicationId`.
 */
import { Component, inject } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent, NavigationService } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import { CredentialingResource, type Standing } from '../application/area-nav';
import { MyApplicationsPage, type OpenApplicationIntent } from '../applicant/my-applications/my-applications.page';
import { SUBJECT_ID_PARAM } from '../shared/subject-context.service';
import { CredentialingAreaResource } from './credentialing-area-resource';

@RegisterClass(BaseResourceComponent, 'CredentialingApplicantHomeResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-applicant-home-resource',
    imports: [SharedGenericModule, MJAlertComponent, MJEmptyStateComponent, MyApplicationsPage],
    template: `
        <div class="cred-resource">
            @switch (State) {
                @case ('Loading') {
                    <mj-loading Text="Loading..."></mj-loading>
                }
                @case ('NotAvailable') {
                    <mj-empty-state Icon="fa-solid fa-lock" [Message]="NotAvailableMessage" Role="status"></mj-empty-state>
                }
                @case ('Error') {
                    <mj-alert Variant="error" Title="My Applications could not load" [Message]="ErrorMessage"></mj-alert>
                }
                @case ('Open') {
                    <bizapps-cred-my-applications
                        [Provider]="Provider"
                        [QueryParams]="QueryParams"
                        (SubjectSelected)="OnSubjectSelected($event)"
                        (OpenApplication)="OnOpenApplication($event)">
                    </bizapps-cred-my-applications>
                }
            }
        </div>
    `,
    styles: [`:host { display: block; width: 100%; height: 100%; } .cred-resource { height: 100%; padding: var(--mj-space-6); box-sizing: border-box; overflow: auto; }`],
})
export class CredentialingApplicantHomeResource extends CredentialingAreaResource {
    private readonly navigation = inject(NavigationService, { optional: true });
    public QueryParams: Record<string, string> = {};

    protected get DriverClass(): string {
        return CredentialingResource.ApplicantHome;
    }

    protected override async OnOpen(_standing: Standing): Promise<void> {
        this.QueryParams = this.GetQueryParams();
    }

    public OnSubjectSelected(subjectId: string | null): void {
        const next = { ...this.QueryParams };
        if (subjectId) {
            next[SUBJECT_ID_PARAM] = subjectId;
        } else {
            delete next[SUBJECT_ID_PARAM];
        }
        this.QueryParams = next;
        this.UpdateQueryParams({ [SUBJECT_ID_PARAM]: subjectId });
    }

    public OnOpenApplication(intent: OpenApplicationIntent): void {
        void this.navigation?.OpenNavItemByName('Standards', undefined, undefined, {
            queryParams: {
                [SUBJECT_ID_PARAM]: intent.SubjectID,
                applicationId: intent.ApplicationID,
            },
        });
    }

    protected override OnQueryParamsChanged(params: Record<string, string>, _source: 'popstate' | 'deeplink'): void {
        this.QueryParams = params;
        this.cdr.markForCheck();
    }

    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'My Applications';
    }

    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-file-signature';
    }
}

/** Tree-shaking anchor, called by the client bootstrap. */
export function LoadCredentialingApplicantHomeResource(): void {
    void CredentialingApplicantHomeResource;
}
