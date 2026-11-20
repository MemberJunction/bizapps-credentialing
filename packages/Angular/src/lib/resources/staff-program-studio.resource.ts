/**
 * Program Studio — the Staff area's home, rendered as a tab in MJ Explorer.
 *
 * Guarded by {@link CredentialingAreaResource}: only a holder of Credentialing Staff opens it. It states
 * why there is nothing to show when the user holds Credentialing Staff without belonging to an
 * organization, instead of an empty screen. A member gets `<bizapps-cred-program-studio>`.
 *
 * The open program and version round-trip through the URL as `programId` / `versionId`: the page's
 * `SelectionChanged` — emitted after every load that found the program, including one that came from
 * a restored tab's saved params — is written with `UpdateQueryParams`, and back/forward or a pasted
 * link reaches the page through `OnQueryParamsChanged` ({@link StudioUrl} explains the restored-tab
 * case).
 */
import { Component } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import { CredentialingResource, type StaffOrganization, type Standing } from '../application/area-nav';
import { ProgramStudioPage, type StudioSelection } from '../staff/program-studio/program-studio.page';
import { PROGRAM_STUDIO_PARAMS, StudioUrl } from '../staff/program-studio/studio-url';
import { CredentialingAreaResource } from './credentialing-area-resource';

export { PROGRAM_STUDIO_PARAMS };

@RegisterClass(BaseResourceComponent, 'CredentialingProgramStudioResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-program-studio-resource',
    imports: [SharedGenericModule, MJAlertComponent, MJEmptyStateComponent, ProgramStudioPage],
    template: `
        <div class="cred-resource" [class.cred-resource--studio]="State === 'Open' && Organizations.length > 0">
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
                        <bizapps-cred-program-studio
                            [Provider]="Provider"
                            [Organizations]="Organizations"
                            [VersionID]="VersionParam"
                            [ProgramID]="ProgramParam"
                            (SelectionChanged)="OnSelectionChanged($event)">
                        </bizapps-cred-program-studio>
                    }
                }
            }
        </div>
    `,
    styles: [`
        :host { display: block; width: 100%; height: 100%; }
        .cred-resource { height: 100%; padding: var(--mj-space-6); color: var(--mj-text-primary); box-sizing: border-box; }
        .cred-resource--studio { padding: 0; }
    `],
})
export class CredentialingProgramStudioResource extends CredentialingAreaResource {
    public Organizations: readonly StaffOrganization[] = [];
    public ProgramParam: string | null = null;
    public VersionParam: string | null = null;

    protected get DriverClass(): string {
        return CredentialingResource.ProgramStudio;
    }

    protected override async OnOpen(standing: Standing): Promise<void> {
        this.Organizations = standing.StaffOrganizations;
        this.applyParams(this.GetQueryParams());
    }

    /** The page opened a program or version: keep the URL in step. */
    public OnSelectionChanged(selection: StudioSelection): void {
        this.ProgramParam = selection.ProgramID;
        this.VersionParam = selection.VersionID;
        this.UpdateQueryParams(StudioUrl.ToParams(selection));
    }

    /** Back/forward or a pasted link changed the URL: show what it names. */
    protected override OnQueryParamsChanged(params: Record<string, string>, _source: 'popstate' | 'deeplink'): void {
        this.applyParams(params);
        this.cdr.markForCheck();
    }

    private applyParams(params: Record<string, string>): void {
        const selection = StudioUrl.FromParams(params);
        this.VersionParam = selection.VersionID;
        this.ProgramParam = selection.ProgramID;
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
