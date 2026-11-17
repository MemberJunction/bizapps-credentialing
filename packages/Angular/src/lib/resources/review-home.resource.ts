/**
 * Review home — the Review area for reviewers and committee members. Assignments arrive with the review workflow; until then it says there are none.
 * The message is a live region (`mj-empty-state` sets `role="status"`).
 */
import { Component, OnInit } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { MJEmptyStateComponent } from '@memberjunction/ng-ui-components';

@RegisterClass(BaseResourceComponent, 'CredentialingReviewHomeResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-review-home-resource',
    imports: [MJEmptyStateComponent],
    template: `<mj-empty-state Icon="fa-solid fa-clipboard-check" Message="You have no review assignments." Role="status"></mj-empty-state>`,
    styles: [`:host { display: block; width: 100%; height: 100%; padding: var(--mj-space-6); }`],
})
export class CredentialingReviewHomeResource extends BaseResourceComponent implements OnInit {
    override ngOnInit(): void {
        super.ngOnInit();
        this.NotifyLoadComplete();
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
