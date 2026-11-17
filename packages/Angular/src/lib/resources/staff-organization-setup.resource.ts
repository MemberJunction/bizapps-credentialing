/**
 * Organization setup — where a Credentialing administrator sets up an accrediting organization and
 * its first staff member: `Set up organization` on a database with none, `New organization` after.
 * Guarded by {@link CredentialingAreaResource}: only a holder of Credentialing Admin opens it. Hosts
 * `<bizapps-cred-organization-setup>` and reloads the user's standing when it reports a new
 * organization, so the next navigation build reflects it.
 */
import { Component } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import { AreaNav, CredentialingResource, type Standing } from '../application/area-nav';
import { OrganizationSetupComponent } from '../staff/organization-setup/organization-setup.component';
import { CredentialingAreaResource } from './credentialing-area-resource';

const FIRST_RUN_HEADING = 'Set up organization';
const NEW_ORGANIZATION_HEADING = 'New organization';

@RegisterClass(BaseResourceComponent, 'CredentialingOrganizationSetupResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-organization-setup-resource',
    imports: [SharedGenericModule, MJAlertComponent, MJEmptyStateComponent, OrganizationSetupComponent],
    template: `
        @switch (State) {
            @case ('Loading') {
                <mj-loading Text="Loading..."></mj-loading>
            }
            @case ('NotAvailable') {
                <div class="cred-resource"><mj-empty-state Icon="fa-solid fa-lock" [Message]="NotAvailableMessage" Role="status"></mj-empty-state></div>
            }
            @case ('Error') {
                <div class="cred-resource"><mj-alert Variant="error" Title="Organization setup could not load" [Message]="ErrorMessage"></mj-alert></div>
            }
            @case ('Open') {
                <bizapps-cred-organization-setup [Heading]="Heading" [Provider]="Provider" (OrganizationCreated)="OnOrganizationCreated()"></bizapps-cred-organization-setup>
            }
        }
    `,
    styles: [`
        :host { display: block; width: 100%; height: 100%; }
        .cred-resource { padding: var(--mj-space-6); }
    `],
})
export class CredentialingOrganizationSetupResource extends CredentialingAreaResource {
    public Heading = FIRST_RUN_HEADING;

    protected get DriverClass(): string {
        return CredentialingResource.OrganizationSetup;
    }

    protected override async OnOpen(standing: Standing): Promise<void> {
        this.applyStanding(standing);
    }

    /** The organization count changed: reload the cached standing so navigation and the heading follow. */
    public async OnOrganizationCreated(): Promise<void> {
        try {
            this.applyStanding(await this.StandingLoader().Reload());
        } catch {
            // The setup itself succeeded; a failed reload only leaves the previous standing in place.
        }
    }

    private applyStanding(standing: Standing): void {
        this.Heading = AreaNav.StaffState(standing) === 'FirstRunSetup' ? FIRST_RUN_HEADING : NEW_ORGANIZATION_HEADING;
        this.cdr.markForCheck();
    }

    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'Organization setup';
    }

    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-building-circle-check';
    }
}

/** Tree-shaking anchor, called by the client bootstrap. */
export function LoadCredentialingOrganizationSetupResource(): void {
    void CredentialingOrganizationSetupResource;
}
