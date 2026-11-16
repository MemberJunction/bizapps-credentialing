import { Component } from '@angular/core';
import { mjBizAppsCredentialingAccreditingOrganizationEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Accrediting Organizations') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingaccreditingorganization-form',
    templateUrl: './mjbizappscredentialingaccreditingorganization.form.component.html'
})
export class mjBizAppsCredentialingAccreditingOrganizationFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingAccreditingOrganizationEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCredentialingPrograms', sectionName: 'Programs', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingOrganizationMemberships', sectionName: 'Organization Memberships', isExpanded: false }
        ]);
    }
}

