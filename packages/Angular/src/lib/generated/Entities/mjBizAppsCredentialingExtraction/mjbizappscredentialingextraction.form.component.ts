import { Component } from '@angular/core';
import { mjBizAppsCredentialingExtractionEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Extractions') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingextraction-form',
    templateUrl: './mjbizappscredentialingextraction.form.component.html'
})
export class mjBizAppsCredentialingExtractionFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingExtractionEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCredentialingResponseCitations', sectionName: 'Response Citations', isExpanded: false }
        ]);
    }
}

