/**
 * Applicant home — the Applicant area. Applications arrive with the application workflow; until then it says there are none.
 * The message is a live region (`mj-empty-state` sets `role="status"`).
 */
import { Component, OnInit } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { MJEmptyStateComponent } from '@memberjunction/ng-ui-components';

@RegisterClass(BaseResourceComponent, 'CredentialingApplicantHomeResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-applicant-home-resource',
    imports: [MJEmptyStateComponent],
    template: `<mj-empty-state Icon="fa-solid fa-file-signature" Message="You have no applications yet." Role="status"></mj-empty-state>`,
    styles: [`:host { display: block; width: 100%; height: 100%; padding: var(--mj-space-6); }`],
})
export class CredentialingApplicantHomeResource extends BaseResourceComponent implements OnInit {
    override ngOnInit(): void {
        super.ngOnInit();
        this.NotifyLoadComplete();
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
