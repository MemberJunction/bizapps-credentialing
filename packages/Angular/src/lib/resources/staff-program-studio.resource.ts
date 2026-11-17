/**
 * Program Studio — the Staff area's home, rendered as a tab in MJ Explorer.
 *
 * Loads the user's standing and states why there is nothing to show when the user holds Credentialing
 * Staff without belonging to an organization, instead of an empty screen. The authoring widgets
 * arrive in the Program Studio task; until then a member sees their organizations here.
 */
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import { type StaffOrganization } from '../application/area-nav';
import { StandingService } from '../shared/standing.service';

/** What the page shows. */
type ProgramStudioView = 'Loading' | 'Error' | 'NoMembership' | 'Ready';

@RegisterClass(BaseResourceComponent, 'CredentialingProgramStudioResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-program-studio-resource',
    imports: [SharedGenericModule, MJAlertComponent, MJEmptyStateComponent],
    template: `
        <div class="cred-resource">
            @switch (View) {
                @case ('Loading') {
                    <mj-loading Text="Loading Program Studio..."></mj-loading>
                }
                @case ('Error') {
                    <mj-alert Variant="error" Title="Program Studio could not load" [Message]="ErrorMessage"></mj-alert>
                }
                @case ('NoMembership') {
                    <mj-empty-state
                        Icon="fa-solid fa-building-circle-xmark"
                        Title="You are not a member of an accrediting organization"
                        Message="Your account has the Credentialing Staff role but is not attached to an organization, so there is nothing to show and nothing can be saved. Ask a Credentialing administrator to add you.">
                    </mj-empty-state>
                }
                @case ('Ready') {
                    <h2 class="cred-resource__heading">Program Studio</h2>
                    <ul class="cred-resource__organizations" aria-label="Your accrediting organizations">
                        @for (organization of Organizations; track organization.ID) {
                            <li>{{ organization.Name }}</li>
                        }
                    </ul>
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
export class CredentialingProgramStudioResource extends BaseResourceComponent implements OnInit {
    private readonly cdr = inject(ChangeDetectorRef);

    public View: ProgramStudioView = 'Loading';
    public ErrorMessage = '';
    public Organizations: readonly StaffOrganization[] = [];

    override ngOnInit(): void {
        super.ngOnInit();
        void this.load();
    }

    private async load(): Promise<void> {
        try {
            const standing = await StandingService.ForProvider(this.ProviderToUse).Load();
            this.Organizations = standing.StaffOrganizations;
            this.View = standing.StaffOrganizations.length === 0 ? 'NoMembership' : 'Ready';
        } catch (e) {
            this.ErrorMessage = e instanceof Error ? e.message : String(e);
            this.View = 'Error';
        } finally {
            this.cdr.markForCheck();
            this.NotifyLoadComplete();
        }
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
