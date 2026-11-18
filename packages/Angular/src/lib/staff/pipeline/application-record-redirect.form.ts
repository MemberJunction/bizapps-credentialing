/**
 * Custom form override for `MJ_BizApps_Credentialing: Applications`.
 *
 * `UserNotificationsComponent` in MJ Explorer opens entity-backed notifications using the
 * `Records` resource type (`OpenEntityRecord('MJ_BizApps_Credentialing: Applications', key)`).
 * When a credentialing staff user opens an application record through that route, this
 * override routes straight into the Credentialing app's Pipeline tab with that application
 * selected and closes the temporary record tab.
 *
 * MJ 6.2.2 stores bare UUIDs in `MJ: User Notifications.ResourceRecordID` (`uniqueidentifier`),
 * while `UserNotificationsComponent.navigateToResource` parses with `SimpleLoadFromURLSegment`,
 * which produces an empty key for bare UUIDs and opens the `/new` record route. When `record.ID`
 * is absent on that route, we fall back to the most recently read/updated notification targeting
 * `MJ_BizApps_Credentialing: Applications` in `SharedService.UserNotifications`.
 */
import { Component, inject } from '@angular/core';
import { Metadata } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { ApplicationManager, WorkspaceStateManager } from '@memberjunction/ng-base-application';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import { NavigationService, SharedService } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingApplicationEntity } from '@mj-biz-apps/credentialing-entities';
import { CredentialingRole } from '../../application/area-nav';
import { StandingService } from '../../shared/standing.service';

@RegisterClass(BaseFormComponent, CredentialingEntity.Application, 100)
@Component({
    standalone: true,
    selector: 'bizapps-cred-application-record-redirect-form',
    imports: [SharedGenericModule, MJEmptyStateComponent],
    template: `
        <div class="cred-record-redirect">
            @if (Redirecting) {
                <mj-loading Text="Opening application in Pipeline..."></mj-loading>
            } @else {
                <mj-empty-state
                    Icon="fa-solid fa-inbox"
                    Title="Application record"
                    Message="Open the Pipeline tab in Credentialing to review this application."
                    Role="status">
                </mj-empty-state>
            }
        </div>
    `,
    styles: [`:host { display: block; height: 100%; } .cred-record-redirect { padding: var(--mj-space-6, 1.5rem); }`],
})
export class ApplicationRecordRedirectFormComponent extends BaseFormComponent {
    private readonly appManager = inject(ApplicationManager, { optional: true });
    private readonly navigation = inject(NavigationService, { optional: true });
    private readonly workspace = inject(WorkspaceStateManager, { optional: true });

    public override record!: mjBizAppsCredentialingApplicationEntity;
    public Redirecting: boolean = false;

    public override async ngOnInit(): Promise<void> {
        await super.ngOnInit();
        const applicationID = this.resolveTargetApplicationID();
        if (!applicationID || !this.navigation) {
            return;
        }
        try {
            const standing = await StandingService.ForProvider(Metadata.Provider).Load();
            const isStaff =
                standing.RoleNames.includes(CredentialingRole.Staff) &&
                standing.StaffOrganizations.length > 0;
            if (!isStaff) {
                return;
            }
            this.Redirecting = true;
            const credApp = this.appManager?.GetAppByName('Credentialing');
            await this.navigation.OpenNavItemByName(
                'Pipeline',
                { applicationId: applicationID },
                credApp?.ID,
                { queryParams: { applicationId: applicationID } },
            );
            this.closeApplicationRecordTabs();
        } finally {
            this.Redirecting = false;
        }
    }

    private closeApplicationRecordTabs(): void {
        const tabs = this.workspace?.GetConfiguration()?.tabs ?? [];
        for (const tab of tabs) {
            if (tab.configuration?.['Entity'] === CredentialingEntity.Application) {
                this.workspace?.CloseTab(tab.id);
            }
        }
    }

    private resolveTargetApplicationID(): string | null {
        const directID = this.record?.IsSaved ? this.record.ID?.trim() : null;
        if (directID) {
            return directID;
        }
        const candidates = SharedService.UserNotifications.filter(
            (n) =>
                Boolean(n.ResourceRecordID) &&
                (n.ResourceConfiguration ?? '').includes(CredentialingEntity.Application),
        );
        if (candidates.length === 0) {
            return null;
        }
        const justClicked = candidates.find((n) => n.Dirty && !n.Unread);
        if (justClicked?.ResourceRecordID) {
            return justClicked.ResourceRecordID.toString().trim() || null;
        }
        const sorted = [...candidates].sort((a, b) => {
            const aRead = a.Unread ? 0 : 1;
            const bRead = b.Unread ? 0 : 1;
            if (bRead !== aRead) {
                return bRead - aRead;
            }
            const aTime = new Date(a.ReadAt ?? a.__mj_UpdatedAt ?? a.__mj_CreatedAt ?? 0).getTime();
            const bTime = new Date(b.ReadAt ?? b.__mj_UpdatedAt ?? b.__mj_CreatedAt ?? 0).getTime();
            return bTime - aTime;
        });
        return sorted[0]?.ResourceRecordID?.toString().trim() || null;
    }
}

/** Tree-shaking anchor, called by the client bootstrap. */
export function LoadApplicationRecordRedirectForm(): void {
    void ApplicationRecordRedirectFormComponent;
}
