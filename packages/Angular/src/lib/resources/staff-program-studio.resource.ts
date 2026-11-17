/**
 * Program Studio — the Staff area's home, rendered as a tab in MJ Explorer.
 *
 * Guarded by {@link CredentialingAreaResource}: only a holder of Credentialing Staff opens it. It states
 * why there is nothing to show when the user holds Credentialing Staff without belonging to an
 * organization, instead of an empty screen. The authoring widgets arrive in the Program Studio task;
 * until then a member sees their organizations here.
 */
import { Component } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import { CredentialingResource, type StaffOrganization, type Standing } from '../application/area-nav';
import { CredentialingAreaResource } from './credentialing-area-resource';

@RegisterClass(BaseResourceComponent, 'CredentialingProgramStudioResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-program-studio-resource',
    imports: [SharedGenericModule, MJAlertComponent, MJEmptyStateComponent],
    template: `
        <div class="cred-resource">
            @switch (State) {
                @case ('Loading') {
                    <mj-loading Text="Loading Program Studio..."></mj-loading>
                }
                @case ('NotAvailable') {
                    <mj-empty-state Icon="fa-solid fa-lock" [Message]="NotAvailableMessage" Role="status"></mj-empty-state>
                }
                @case ('Error') {
                    <mj-alert Variant="error" Title="Program Studio could not load" [Message]="ErrorMessage"></mj-alert>
                }
                @case ('Open') {
                    @if (Organizations.length === 0) {
                        <mj-empty-state
                            Icon="fa-solid fa-building-circle-xmark"
                            Title="You are not a member of an accrediting organization"
                            Message="Your account has the Credentialing Staff role but is not attached to an organization, so there is nothing to show and nothing can be saved. Ask a Credentialing administrator to add you.">
                        </mj-empty-state>
                    } @else {
                        <h2 class="cred-resource__heading">Program Studio</h2>
                        <ul class="cred-resource__organizations" aria-label="Your accrediting organizations">
                            @for (organization of Organizations; track organization.ID) {
                                <li>{{ organization.Name }}</li>
                            }
                        </ul>
                    }
                }
            }
        </div>
    `,
    styles: [`
        :host { display: block; width: 100%; height: 100%; }
        .cred-resource { padding: var(--mj-space-6); color: var(--mj-text-primary); }
        .cred-resource__heading { margin: 0 0 var(--mj-space-3); font-size: var(--mj-text-xl); font-weight: var(--mj-font-semibold); }
        .cred-resource__organizations { margin: 0; padding-left: var(--mj-space-5); color: var(--mj-text-secondary); line-height: 1.6; }
    `],
})
export class CredentialingProgramStudioResource extends CredentialingAreaResource {
    public Organizations: readonly StaffOrganization[] = [];

    protected get DriverClass(): string {
        return CredentialingResource.ProgramStudio;
    }

    protected override async OnOpen(standing: Standing): Promise<void> {
        this.Organizations = standing.StaffOrganizations;
    }

    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'Program Studio';
    }

    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-diagram-project';
    }
}

/** Tree-shaking anchor, called by the client bootstrap. */
export function LoadCredentialingProgramStudioResource(): void {
    void CredentialingProgramStudioResource;
}
