import { Component, EventEmitter, Input, Output } from '@angular/core';
import type { GateItem } from '@mj-biz-apps/credentialing-core';
import { MJButtonDirective } from '@memberjunction/ng-ui-components';
import { GapLinkForItem, type SubmitGapLink } from './submit-model';

@Component({
    standalone: true,
    selector: 'bizapps-cred-gate-list',
    imports: [MJButtonDirective],
    templateUrl: './gate-list.component.html',
    styleUrls: ['./gate-list.component.scss'],
})
export class GateListComponent {
    @Input() public Items: readonly GateItem[] = [];
    @Input() public IsSubmitted: boolean = false;
    @Output() public NavigateToGap = new EventEmitter<SubmitGapLink>();

    public CanNavigate(item: GateItem): boolean {
        return !item.Passed && !this.IsSubmitted && item.Target.Screen !== 'Submit';
    }

    public OnOpenGap(item: GateItem): void {
        if (!this.CanNavigate(item)) {
            return;
        }
        this.NavigateToGap.emit(GapLinkForItem(item));
    }

    public ActionLabel(item: GateItem): string {
        if (item.Target.Screen === 'Documents') {
            return 'Go to Documents';
        }
        return 'Go to Standards';
    }
}
