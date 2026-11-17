import { Component } from '@angular/core';
import { mjBizAppsCredentialingStandardResponseEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Standard Responses') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingstandardresponse-form',
    templateUrl: './mjbizappscredentialingstandardresponse.form.component.html'
})
export class mjBizAppsCredentialingStandardResponseFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingStandardResponseEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCredentialingResponseCitations', sectionName: 'Response Citations', isExpanded: false }
        ]);
    }
}

