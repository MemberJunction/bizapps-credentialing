import { Component } from '@angular/core';
import { mjBizAppsCredentialingApplicationEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Applications') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingapplication-form',
    templateUrl: './mjbizappscredentialingapplication.form.component.html'
})
export class mjBizAppsCredentialingApplicationFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingApplicationEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCredentialingStandardResponses', sectionName: 'Standard Responses', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingApplicationDocuments', sectionName: 'Application Documents', isExpanded: false }
        ]);
    }
}

