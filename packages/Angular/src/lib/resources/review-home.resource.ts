/**
 * Review home — the Review area for reviewers and committee members. Assignments arrive with the review workflow; until then it says there are none.
 * Guarded by {@link CredentialingAreaResource}: only a holder of Credentialing Reviewer or Credentialing Committee opens it.
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

@RegisterClass(BaseResourceComponent, 'CredentialingReviewHomeResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-review-home-resource',
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
                <mj-alert Variant="error" Title="Assignments could not load" [Message]="ErrorMessage"></mj-alert>
            }
            @case ('Open') {
                <mj-empty-state Icon="fa-solid fa-clipboard-check" Message="You have no review assignments." Role="status"></mj-empty-state>
            }
        }
    `,
    styles: [`:host { display: block; width: 100%; height: 100%; padding: var(--mj-space-6); }`],
})
export class CredentialingReviewHomeResource extends CredentialingAreaResource {
    protected get DriverClass(): string {
        return CredentialingResource.ReviewHome;
    }

    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'Assignments';
    }

    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-clipboard-check';
    }
}

/** Tree-shaking anchor, called by the client bootstrap. */
export function LoadCredentialingReviewHomeResource(): void {
    void CredentialingReviewHomeResource;
}
