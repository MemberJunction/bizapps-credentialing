/**
 * Applicant home — the Applicant area. Applications arrive with the application workflow; until then it says there are none.
 * Guarded by {@link CredentialingAreaResource}: only a holder of Credentialing Applicant opens it.
 * Each message is a live region (`mj-empty-state` with `role="status"`).
 */
import { Component } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import { CredentialingResource } from '../application/area-nav';
import { CredentialingAreaResource } from './credentialing-area-resource';

@RegisterClass(BaseResourceComponent, 'CredentialingApplicantHomeResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-applicant-home-resource',
    imports: [SharedGenericModule, MJAlertComponent, MJEmptyStateComponent],
    template: `
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
                <mj-empty-state Icon="fa-solid fa-file-signature" Message="You have no applications yet." Role="status"></mj-empty-state>
            }
        }
    `,
    styles: [`:host { display: block; width: 100%; height: 100%; padding: var(--mj-space-6); }`],
})
export class CredentialingApplicantHomeResource extends CredentialingAreaResource {
    protected get DriverClass(): string {
        return CredentialingResource.ApplicantHome;
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
