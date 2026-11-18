/**
 * Staff Pipeline resource — rendered as a tab in MJ Explorer.
 *
 * Guarded by {@link CredentialingAreaResource}: only a holder of Credentialing Staff opens it.
 */
import { Component } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import { CredentialingResource, type StaffOrganization, type Standing } from '../application/area-nav';
import { RequestedPipelineApplicationID } from '../staff/pipeline/pipeline-data';
import { PipelinePage } from '../staff/pipeline/pipeline.page';
import { CredentialingAreaResource } from './credentialing-area-resource';

@RegisterClass(BaseResourceComponent, 'CredentialingPipelineResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-pipeline-resource',
    imports: [SharedGenericModule, MJAlertComponent, MJEmptyStateComponent, PipelinePage],
    template: `
        <div class="cred-resource">
            @switch (State) {
                @case ('Loading') {
                    <mj-loading Text="Loading Pipeline..."></mj-loading>
                }
                @case ('NotAvailable') {
                    <mj-empty-state Icon="fa-solid fa-lock" [Message]="NotAvailableMessage" Role="status"></mj-empty-state>
                }
                @case ('Error') {
                    <mj-alert Variant="error" Title="Pipeline could not load" [Message]="ErrorMessage"></mj-alert>
                }
                @case ('Open') {
                    @if (Organizations.length === 0) {
                        <mj-empty-state
                            Icon="fa-solid fa-building-circle-xmark"
                            Title="You are not a member of an accrediting organization"
                            Message="Your account has the Credentialing Staff role but is not attached to an organization, so there is nothing to show and nothing can be saved. Ask a Credentialing administrator to add you.">
                        </mj-empty-state>
                    } @else {
                        <bizapps-cred-pipeline
                            [Provider]="Provider"
                            [SelectedApplicationID]="SelectedApplicationID"
                            [RefreshKey]="RefreshKey">
                        </bizapps-cred-pipeline>
                    }
                }
            }
        </div>
    `,
    styles: [`:host { display: block; height: 100%; } .cred-resource { padding: var(--mj-space-4, 1rem); height: 100%; overflow: auto; }`],
})
export class CredentialingPipelineResource extends CredentialingAreaResource {
    public Organizations: StaffOrganization[] = [];
    public SelectedApplicationID: string | null = null;

    protected override get DriverClass(): string {
        return CredentialingResource.Pipeline;
    }

    protected override async OnOpen(standing: Standing): Promise<void> {
        this.Organizations = [...standing.StaffOrganizations];
        this.SelectedApplicationID = this.resolveRequestedApplicationID(this.GetQueryParams());
    }

    protected override OnQueryParamsChanged(params: Record<string, string>, _source: 'popstate' | 'deeplink'): void {
        this.SelectedApplicationID = this.resolveRequestedApplicationID(params);
        this.cdr.markForCheck();
    }

    private resolveRequestedApplicationID(params: Record<string, string>): string | null {
        return RequestedPipelineApplicationID(params, this.Data?.Configuration);
    }

    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'Pipeline';
    }

    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-inbox';
    }
}

export function LoadCredentialingPipelineResource(): void {
    // Module import registers @RegisterClass(BaseResourceComponent, 'CredentialingPipelineResource').
}
