import { Component } from '@angular/core';
import { mjBizAppsCredentialingProgramEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Programs') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingprogram-form',
    templateUrl: './mjbizappscredentialingprogram.form.component.html'
})
export class mjBizAppsCredentialingProgramFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingProgramEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCredentialingProgramVersions', sectionName: 'Program Versions', isExpanded: false }
        ]);
    }
}

