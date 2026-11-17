import { Component } from '@angular/core';
import { mjBizAppsCredentialingStandardEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Standards') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingstandard-form',
    templateUrl: './mjbizappscredentialingstandard.form.component.html'
})
export class mjBizAppsCredentialingStandardFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingStandardEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCredentialingStandardResponses', sectionName: 'Standard Responses', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingExtractions', sectionName: 'Extractions', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingResponseSources', sectionName: 'Response Sources', isExpanded: false }
        ]);
    }
}

