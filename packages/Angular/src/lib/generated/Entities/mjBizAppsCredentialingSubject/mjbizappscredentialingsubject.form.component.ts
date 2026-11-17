import { Component } from '@angular/core';
import { mjBizAppsCredentialingSubjectEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';
import {  } from "@memberjunction/ng-entity-viewer"

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Subjects') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingsubject-form',
    templateUrl: './mjbizappscredentialingsubject.form.component.html'
})
export class mjBizAppsCredentialingSubjectFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingSubjectEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true },
            { sectionKey: 'mJBizAppsCredentialingDocumentAttestations', sectionName: 'Document Attestations', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingStandardResponses', sectionName: 'Standard Responses', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingSubjectContacts', sectionName: 'Subject Contacts', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingApplications', sectionName: 'Applications', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingResponseCitations', sectionName: 'Response Citations', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingApplicationDocuments', sectionName: 'Application Documents', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingEvidenceDocuments', sectionName: 'Evidence Documents', isExpanded: false },
            { sectionKey: 'mJBizAppsCredentialingExtractions', sectionName: 'Extractions', isExpanded: false }
        ]);
    }
}

