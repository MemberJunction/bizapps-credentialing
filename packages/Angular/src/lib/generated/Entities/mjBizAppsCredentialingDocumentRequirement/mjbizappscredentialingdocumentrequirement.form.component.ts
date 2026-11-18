import { Component } from '@angular/core';
import { mjBizAppsCredentialingDocumentRequirementEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

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
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

