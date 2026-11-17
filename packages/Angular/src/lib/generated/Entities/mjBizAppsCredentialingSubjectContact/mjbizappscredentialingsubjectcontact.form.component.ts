import { Component } from '@angular/core';
import { mjBizAppsCredentialingSubjectContactEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Subject Contacts') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingsubjectcontact-form',
    templateUrl: './mjbizappscredentialingsubjectcontact.form.component.html'
})
export class mjBizAppsCredentialingSubjectContactFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingSubjectContactEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

