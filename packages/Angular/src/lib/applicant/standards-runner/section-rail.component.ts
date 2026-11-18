import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { UUIDsEqual } from '@memberjunction/global';
import type { WorkspaceSection } from '@mj-biz-apps/credentialing-core';
import { SectionCounts, type SectionProgressSummary } from './runner-model';

@Component({
    standalone: true,
    selector: 'bizapps-cred-section-rail',
    imports: [SharedGenericModule],
    templateUrl: './section-rail.component.html',
    styleUrls: ['./section-rail.component.scss'],
})
export class SectionRailComponent {
    @Input() public Sections: readonly WorkspaceSection[] = [];
    @Input() public ActiveSectionID: string | null = null;
    @Output() public readonly SectionSelected = new EventEmitter<string>();

    public CountsFor(section: WorkspaceSection): SectionProgressSummary {
        return SectionCounts(section);
    }

    public IsActive(sectionID: string): boolean {
        return this.ActiveSectionID != null && UUIDsEqual(this.ActiveSectionID, sectionID);
    }

    public SelectSection(sectionID: string): void {
        this.SectionSelected.emit(sectionID);
    }
}
