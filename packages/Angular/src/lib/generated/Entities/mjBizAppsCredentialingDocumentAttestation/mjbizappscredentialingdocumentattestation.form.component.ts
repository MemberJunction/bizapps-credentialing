import { Component } from '@angular/core';
import { mjBizAppsCredentialingDocumentAttestationEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Document Attestations') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingdocumentattestation-form',
    templateUrl: './mjbizappscredentialingdocumentattestation.form.component.html'
})
export class mjBizAppsCredentialingDocumentAttestationFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingDocumentAttestationEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCredentialingApplicationDocuments', sectionName: 'Application Documents', isExpanded: false }
        ]);
    }
}

