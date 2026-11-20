import { Component } from '@angular/core';
import { mjBizAppsCredentialingEvidenceDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Evidence Documents') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingevidencedocument-form',
    templateUrl: './mjbizappscredentialingevidencedocument.form.component.html'
})
export class mjBizAppsCredentialingEvidenceDocumentFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingEvidenceDocumentEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCredentialingResponseCitations', sectionName: 'Response Citations', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingApplicationDocuments', sectionName: 'Application Documents', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingEvidenceDocuments', sectionName: 'Evidence Documents', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingExtractions', sectionName: 'Extractions', isExpanded: false }
        ]);
    }
}

