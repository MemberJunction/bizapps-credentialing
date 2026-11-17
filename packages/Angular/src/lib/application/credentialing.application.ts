/**
 * The Credentialing application in MJ Explorer: navigation by area, decided per user.
 *
 * Selected by `ClassName: "CredentialingApplication"` on the `MJ: Applications` record. Each user
 * sees only the areas their roles serve (see {@link AreaNav}).
 *
 * The record's `DefaultNavItems` lists EVERY item this app can show, because Explorer's route guard
 * resolves `/app/credentialing/<item>` from that list alone; an item missing from it makes a deep link
 * (and the query parameters it carries) fail. That list is therefore not least-privilege: each
 * resource guards itself through `AreaNav.CanOpen` (`CredentialingAreaResource`) and shows
 * `This area is not available to your account.` to a user whose roles do not serve it.
 */
import { LogError } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { BaseApplication, type NavItem } from '@memberjunction/ng-base-application';
import { StandingService } from '../shared/standing.service';
import { AreaNav, type AreaNavItem, type Standing } from './area-nav';

@RegisterClass(BaseApplication, 'CredentialingApplication')
export class CredentialingApplication extends BaseApplication {
    override async GetNavItems(): Promise<NavItem[]> {
        const standing = await this.loadStanding();
        return AreaNav.ItemsFor(standing).map((item) => CredentialingApplication.toNavItem(item));
    }

    /** The cached standing; when it cannot load, the roles alone still decide the areas. */
    private async loadStanding(): Promise<Standing> {
        const service = StandingService.ForProvider(this.Provider);
        try {
            return await service.Load();
        } catch (e) {
            LogError(`Credentialing navigation could not load the user's standing: ${e instanceof Error ? e.message : String(e)}`);
            const roleNames = (this.Provider.CurrentUser?.UserRoles ?? []).map((r) => r.Role);
            return { RoleNames: roleNames, StaffOrganizations: [], OrganizationCount: null };
        }
    }

    private static toNavItem(item: AreaNavItem): NavItem {
        return {
            Label: item.Label,
            Icon: item.Icon,
            ResourceType: 'Custom',
            DriverClass: item.DriverClass,
            isDefault: item.IsDefault,
        };
    }
}

/** Tree-shaking anchor, called by the client bootstrap. */
export function LoadCredentialingApplication(): void {
    void CredentialingApplication;
}
