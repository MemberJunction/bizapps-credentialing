import { Component } from '@angular/core';
import { mjBizAppsCredentialingApplicationDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Application Documents') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingapplicationdocument-form',
    templateUrl: './mjbizappscredentialingapplicationdocument.form.component.html'
})
export class mjBizAppsCredentialingApplicationDocumentFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingApplicationDocumentEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

