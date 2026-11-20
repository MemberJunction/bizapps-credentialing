import { Component } from '@angular/core';
import { mjBizAppsCredentialingResponseSourceEntity } from '@mj-biz-apps/credentialing-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseFormComponent } from '@memberjunction/ng-base-forms';

@RegisterClass(BaseFormComponent, 'MJ_BizApps_Credentialing: Response Sources') // Tell MemberJunction about this class
@Component({
    standalone: false,
    selector: 'gen-mjbizappscredentialingresponsesource-form',
    templateUrl: './mjbizappscredentialingresponsesource.form.component.html'
})
export class mjBizAppsCredentialingResponseSourceFormComponent extends BaseFormComponent {
    public record!: mjBizAppsCredentialingResponseSourceEntity;

    override async ngOnInit() {
        await super.ngOnInit();
        this.initSections([
            { sectionKey: 'details', sectionName: 'Details', isExpanded: true }
        ]);
    }
}

