/**
 * Organization setup — where a Credentialing administrator sets up an accrediting organization and
 * its first staff member: `Set up organization` on a database with none, `New organization` after.
 * Guarded by {@link CredentialingAreaResource}: only a holder of Credentialing Admin opens it. Hosts
 * `<bizapps-cred-organization-setup>` and reloads the user's standing when it reports a new
 * organization.
 *
 * After the first organization the area's nav item is `New organization`, not `Set up organization`.
 * MJ Explorer (v6.2.2) has no call that tells the shell an application's nav items changed; its nav
 * bar calls `GetNavItems()` again on every workspace configuration change
 * (`AppNavComponent.ngOnInit`, `explorer-core/src/lib/shell/components/header/app-nav.component.ts`).
 * So once the standing is reloaded, this resource retargets ITS OWN tab to the new item
 * (`navItemName` and title, through `WorkspaceStateManager`): that configuration change makes the nav
 * bar rebuild from the reloaded standing, marks the new item active, and the shell rewrites the URL
 * to `/app/credentialing/New%20organization`. The tab keeps its component (the tab container's
 * content signature does not include `navItemName`), so the success sentence stays on screen.
 */
import { Component, inject } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { WorkspaceStateManager } from '@memberjunction/ng-base-application';
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
    private readonly workspace = inject(WorkspaceStateManager);
    public Heading = FIRST_RUN_HEADING;

    protected get DriverClass(): string {
        return CredentialingResource.OrganizationSetup;
    }

    protected override async OnOpen(standing: Standing): Promise<void> {
        this.applyStanding(standing);
    }

    /** The organization count changed: reload the cached standing so navigation and the heading follow. */
    public async OnOrganizationCreated(): Promise<void> {
        let standing: Standing;
        try {
            standing = await this.StandingLoader().Reload();
        } catch {
            // The setup itself succeeded; a failed reload only leaves the previous standing in place.
            return;
        }
        this.applyStanding(standing);
        this.retargetOwnTab(standing);
    }

    /** Makes this tab the nav item the reloaded standing shows for organization setup (see the file header). */
    private retargetOwnTab(standing: Standing): void {
        const tabId = this.getTabId();
        const tab = tabId ? this.workspace.GetTab(tabId) : undefined;
        if (!tab) {
            return;
        }
        const current = tab.configuration?.['navItemName'];
        const label = AreaNav.RetargetTab(typeof current === 'string' ? current : null, this.DriverClass, standing);
        if (label == null) {
            return;
        }
        this.workspace.UpdateTabTitle(tabId, label);
        this.workspace.UpdateTabConfiguration(tabId, { navItemName: label });
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
