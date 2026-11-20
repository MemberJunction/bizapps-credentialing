import { Component } from '@angular/core';
import { mjBizAppsCredentialingDocumentRequirementEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Document Requirements') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingdocumentrequirement-form',
    templateUrl: './mjbizappscredentialingdocumentrequirement.form.component.html'
})
export class mjBizAppsCredentialingDocumentRequirementFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingDocumentRequirementEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCredentialingDocumentAttestations', sectionName: 'Document Attestations', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingEvidenceDocuments', sectionName: 'Evidence Documents', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingResponseSources', sectionName: 'Response Sources', isExpanded: false }
        ]);
    }
}

