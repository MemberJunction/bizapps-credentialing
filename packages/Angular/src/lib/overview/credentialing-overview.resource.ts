/**
 * Credentialing overview — the app's landing resource, rendered as a tab in MJ Explorer.
 *
 * Every link in the Explorer-visibility chain fails silently, so this page exists to
 * prove the wiring end to end:
 *   1. @RegisterClass(BaseResourceComponent, 'CredentialingOverviewResource')  <- this file
 *   2. exported from ../../public-api.ts and anchored by LoadBizAppsCredentialingClient()
 *   3. metadata/applications/ nav item with the SAME DriverClass string
 *   4. MJExplorer imports @mj-biz-apps/credentialing-ng (installed: the CLI maintains the
 *      generated bootstrap import; dev-linked: you add it yourself)
 * Chain + a "nothing shows up" checklist: docs/template-docs/explorer-visibility.md
 *
 * The cards below name the areas the FRD specifies (plans/active/credentialing-frd.md).
 * They are static copy, not data; each becomes its own nav item as it ships.
 */
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';

interface CredentialingArea {
    Title: string;
    Description: string;
    Icon: string;
}

@RegisterClass(BaseResourceComponent, 'CredentialingOverviewResource')
@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'bizapps-credentialing-overview-resource',
    template: `
        <div class="credentialing-overview">
            <h2><i class="fa-solid fa-certificate"></i> {{ AppName }}</h2>
            <p class="tagline">{{ Tagline }}</p>
            <p class="status">
                This app is a scaffold: the platform wiring is in place and the domain model is
                proposed in <code>plans/active/credentialing-frd.md</code>. The areas below arrive as
                that design is implemented.
            </p>
            <div class="areas">
                @for (area of Areas; track area.Title) {
                    <section class="area">
                        <h3><i [class]="area.Icon"></i> {{ area.Title }}</h3>
                        <p>{{ area.Description }}</p>
                    </section>
                }
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; width: 100%; height: 100%; }
        .credentialing-overview { padding: 1.5rem; max-width: 60rem; }
        .credentialing-overview h2 { margin: 0 0 .5rem; font-size: 1.25rem; }
        .tagline { margin: 0 0 1rem; line-height: 1.5; }
        .status { margin: 0 0 1.5rem; line-height: 1.5; opacity: .8; }
        .status code { padding: .1rem .3rem; border-radius: 3px; border: 1px solid; border-color: color-mix(in srgb, currentColor 25%, transparent); }
        .areas { display: grid; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); gap: 1rem; }
        .area { padding: 1rem; border-radius: 6px; border: 1px solid; border-color: color-mix(in srgb, currentColor 25%, transparent); }
        .area h3 { margin: 0 0 .5rem; font-size: 1rem; }
        .area p { margin: 0; line-height: 1.45; opacity: .85; }
    `],
})
export class CredentialingOverviewResource extends BaseResourceComponent implements OnInit {
    public readonly AppName: string = 'Credentialing';
    public readonly Tagline: string =
        'Credentialing, certification, and licensure management for MemberJunction: credential definitions, requirements, holder records, verification, expiration and renewal cycles.';
    public readonly Areas: CredentialingArea[] = [
        {
            Title: 'Credential Definitions',
            Description: 'Credential types, issuing bodies, validity periods, and the requirements to earn or renew each one.',
            Icon: 'fa-solid fa-certificate',
        },
        {
            Title: 'Holders',
            Description: 'The credentials people hold: status, credential number, issue and expiry dates, issuing organization.',
            Icon: 'fa-solid fa-id-badge',
        },
        {
            Title: 'Verifications',
            Description: 'Who verified a credential, when, by what method, and with what outcome.',
            Icon: 'fa-solid fa-clipboard-check',
        },
        {
            Title: 'Renewals',
            Description: 'Expiration tracking and renewal work items, run as BizApps Tasks linked back to the credential.',
            Icon: 'fa-solid fa-rotate',
        },
    ];

    /**
     * NotifyLoadComplete() is not optional: Explorer holds its loading state until the
     * resource signals. Always call super.ngOnInit() first.
     */
    override ngOnInit(): void {
        super.ngOnInit();
        this.NotifyLoadComplete();
    }

    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'Overview';
    }

    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-certificate';
    }
}

/**
 * Tree-shaking anchor: a decorator only runs if the module is evaluated, and a module is
 * only evaluated if something references it. The client bootstrap calls this.
 */
export function LoadCredentialingOverviewResource(): void {
    void CredentialingOverviewResource;
}
