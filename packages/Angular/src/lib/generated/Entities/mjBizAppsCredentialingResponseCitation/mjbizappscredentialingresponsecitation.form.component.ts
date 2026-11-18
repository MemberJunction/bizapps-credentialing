import { Component } from '@angular/core';
import { mjBizAppsCredentialingResponseCitationEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Response Citations') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingresponsecitation-form',
    templateUrl: './mjbizappscredentialingresponsecitation.form.component.html'
})
export class mjBizAppsCredentialingResponseCitationFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingResponseCitationEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

