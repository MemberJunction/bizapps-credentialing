import { Component } from '@angular/core';
import { mjBizAppsCredentialingOrganizationMembershipEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Organization Memberships') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingorganizationmembership-form',
    templateUrl: './mjbizappscredentialingorganizationmembership.form.component.html'
})
export class mjBizAppsCredentialingOrganizationMembershipFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingOrganizationMembershipEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

