/**
 * Organization setup — where a Credentialing administrator sets up an accrediting organization and
 * its first staff member: `Set up organization` on a database with none, `New organization` after.
 * Hosts `<bizapps-cred-organization-setup>` and reloads the user's standing when it reports a new
 * organization, so the next navigation build reflects it.
 */
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { AreaNav, type Standing } from '../application/area-nav';
import { StandingService } from '../shared/standing.service';
import { OrganizationSetupComponent } from '../staff/organization-setup/organization-setup.component';

const FIRST_RUN_HEADING = 'Set up organization';
const NEW_ORGANIZATION_HEADING = 'New organization';

@RegisterClass(BaseResourceComponent, 'CredentialingOrganizationSetupResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-organization-setup-resource',
    imports: [SharedGenericModule, OrganizationSetupComponent],
    template: `
        @if (IsLoading) {
            <mj-loading Text="Loading..."></mj-loading>
        } @else {
            <bizapps-cred-organization-setup [Heading]="Heading" [Provider]="Provider" (OrganizationCreated)="OnOrganizationCreated()"></bizapps-cred-organization-setup>
        }
    `,
    styles: [`:host { display: block; width: 100%; height: 100%; }`],
})
export class CredentialingOrganizationSetupResource extends BaseResourceComponent implements OnInit {
    private readonly cdr = inject(ChangeDetectorRef);

    public IsLoading = true;
    public Heading = FIRST_RUN_HEADING;

    override ngOnInit(): void {
        super.ngOnInit();
        void this.load();
    }

    /** The organization count changed: reload the cached standing so navigation and the heading follow. */
    public async OnOrganizationCreated(): Promise<void> {
        try {
            this.applyStanding(await this.standing().Reload());
        } catch {
            // The setup itself succeeded; a failed reload only leaves the previous standing in place.
        }
    }

    private async load(): Promise<void> {
        try {
            this.applyStanding(await this.standing().Load());
        } catch {
            // The heading is all the standing decides here; the setup works without it.
        } finally {
            this.IsLoading = false;
            this.cdr.markForCheck();
            this.NotifyLoadComplete();
        }
    }

    private applyStanding(standing: Standing): void {
        this.Heading = AreaNav.StaffState(standing) === 'FirstRunSetup' ? FIRST_RUN_HEADING : NEW_ORGANIZATION_HEADING;
        this.cdr.markForCheck();
    }

    private standing(): StandingService {
        return StandingService.ForProvider(this.ProviderToUse);
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
