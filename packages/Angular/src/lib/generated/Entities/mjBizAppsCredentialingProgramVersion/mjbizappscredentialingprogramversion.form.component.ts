import { Component } from '@angular/core';
import { mjBizAppsCredentialingProgramVersionEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Program Versions') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingprogramversion-form',
    templateUrl: './mjbizappscredentialingprogramversion.form.component.html'
})
export class mjBizAppsCredentialingProgramVersionFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingProgramVersionEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCredentialingSections', sectionName: 'Sections', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingDocumentRequirements', sectionName: 'Document Requirements', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingProgramVersions', sectionName: 'Program Versions', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingStandards', sectionName: 'Standards', isExpanded: false }
        ]);
    }
}

