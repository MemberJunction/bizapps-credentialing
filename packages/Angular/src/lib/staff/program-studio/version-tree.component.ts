/**
 * One version of a program: its lifecycle actions and its sections with their standards
 * (FRD FR-2.2, FR-2.3, FR-2.5).
 *
 * On a Draft every section and standard can be added, edited, reordered and deleted; add, edit and
 * delete are single-record writes, and a reorder is one `ReorderVersionTreeOperation` call carrying
 * every changed `Sequence`. On an Active or Retired version none of those controls exists in the DOM;
 * `Edit in draft` copies the version into a new Draft through `CloneVersionToDraftOperation`.
 * Activate and Retire are each one save of the version's `Status`; deleting a Draft is one `Delete()`
 * of the version (the server removes everything under it in the same transaction).
 *
 * Every refusal is shown verbatim beside the control that caused it. The tree reads nothing itself:
 * the page passes the program's loaded rows and reloads them when this widget asks.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import {
    MJButtonDirective,
    MJConfirmService,
    MJDialogActionsComponent,
    MJDialogComponent,
} from '@memberjunction/ng-ui-components';
import { CloneVersionToDraftOperation, CredentialingEntity, ReorderVersionTreeOperation } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingProgramVersionEntity, mjBizAppsCredentialingSectionEntity } from '@mj-biz-apps/credentialing-entities';
import type { mjBizAppsCredentialingStandardEntity } from '@mj-biz-apps/credentialing-entities';
import type { ProgramBundle, SectionRow, StandardRow } from './studio-data';
import type { NewStandardTarget } from './standard-editor.component';
import { StudioTree, type SectionErrorField, type SequenceChange, type TreeSection } from './studio-tree';
import { StudioViewModel, type StudioVersionView } from './studio-view-model';

type VersionEntity = mjBizAppsCredentialingProgramVersionEntity;
type SectionEntity = mjBizAppsCredentialingSectionEntity;
type StandardEntity = mjBizAppsCredentialingStandardEntity;

/** Where a refusal is shown: a version action, the new-section form, or a section or standard row (its ID). */
export type TreeErrorTarget = 'version' | 'draft' | 'new-section' | string;

@Component({
    standalone: true,
    selector: 'bizapps-cred-version-tree',
    imports: [FormsModule, MJButtonDirective, MJDialogComponent, MJDialogActionsComponent],
    templateUrl: './version-tree.component.html',
    styleUrls: ['./version-tree.component.scss'],
})
export class VersionTreeComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly confirm = inject(MJConfirmService);

    /** The version shown. */
    @Input() VersionID = '';
    /** The program's loaded rows; only this version's are shown. */
    @Input() Bundle: ProgramBundle | null = null;
    /** The standard open in the editor, highlighted in the tree. */
    @Input() SelectedStandardID: string | null = null;

    @Output() StandardSelected = new EventEmitter<string>();
    /** Asks the page to open the editor on a new standard in a section. */
    @Output() StandardAddRequested = new EventEmitter<NewStandardTarget>();
    /** The version to show next: a new Draft, this version after a status change, or '' after a delete. */
    @Output() VersionChanged = new EventEmitter<string>();
    /** Something under this version was written (or refused): reload what is stored. */
    @Output() ReloadRequested = new EventEmitter<void>();

    public IsBusy = false;
    public ErrorMessage = '';
    public ErrorTarget: TreeErrorTarget | null = null;

    /** The section in the add form or being edited inline. */
    public EditingSection: SectionEntity | null = null;

    public DraftDialogOpen = false;
    public DraftLabel = '';

    public get Version(): VersionEntity | null {
        const id = this.VersionID.toLowerCase();
        return this.Bundle?.Versions.find((v) => v.ID.toLowerCase() === id) ?? null;
    }

    public get View(): StudioVersionView {
        return StudioViewModel.For({ Status: this.Version?.Status ?? 'Retired' });
    }

    public get Tree(): TreeSection[] {
        return this.Bundle ? StudioTree.Build(this.VersionID, this.Bundle.Sections, this.Bundle.Standards) : [];
    }

    public get IsAddingSection(): boolean {
        return this.EditingSection != null && !this.EditingSection.IsSaved;
    }

    public IsEditingSection(id: string): boolean {
        return this.EditingSection != null && this.EditingSection.IsSaved && this.EditingSection.ID.toLowerCase() === id.toLowerCase();
    }

    public IsSelected(id: string): boolean {
        return this.SelectedStandardID != null && this.SelectedStandardID.toLowerCase() === id.toLowerCase();
    }

    public ErrorFor(target: TreeErrorTarget): string {
        return this.ErrorTarget != null && this.ErrorTarget.toLowerCase() === target.toLowerCase() ? this.ErrorMessage : '';
    }

    /** The refusal for a section form's field (`target` is `new-section` or the section's ID), or ''. */
    public SectionErrorFor(target: TreeErrorTarget, field: SectionErrorField): string {
        const message = this.ErrorFor(target);
        return message && StudioTree.SectionFieldFor(message) === field ? message : '';
    }

    public SelectStandard(standard: StandardRow): void {
        this.StandardSelected.emit(standard.ID);
    }

    public AddStandard(node: TreeSection): void {
        this.StandardAddRequested.emit({ SectionID: node.Section.ID, VersionID: this.VersionID, Sequence: StudioTree.NextSequence(node.Standards) });
    }

    // ---- Version lifecycle -------------------------------------------------------------------

    public async Activate(): Promise<void> {
        await this.changeStatus('Active');
    }

    public async Retire(): Promise<void> {
        const label = this.Version?.Label ?? '';
        const ok = await this.confirm.Confirm({
            title: 'Retire version',
            message: `Retire version ${label}?`,
            detail: 'A retired version accepts no new applications. This cannot be undone.',
            confirmText: 'Retire',
            type: 'warning',
        });
        if (ok) {
            await this.changeStatus('Retired');
        }
    }

    public async DeleteDraft(): Promise<void> {
        const version = this.Version;
        if (version == null) {
            return;
        }
        const ok = await this.confirm.ConfirmDelete({
            message: `Delete draft version ${version.Label}?`,
            detail: 'Its sections, standards and document requirements are deleted with it.',
            confirmText: 'Delete draft',
        });
        if (!ok) {
            return;
        }
        await this.run('version', async () => {
            if (!(await version.Delete())) {
                throw new Error(version.LatestResult?.CompleteMessage || 'The version was not deleted.');
            }
            this.VersionChanged.emit('');
        });
    }

    public OpenDraftDialog(): void {
        this.DraftLabel = '';
        this.clearError();
        this.DraftDialogOpen = true;
    }

    public CloseDraftDialog(): void {
        this.DraftDialogOpen = false;
        if (this.ErrorTarget === 'draft') {
            this.clearError();
        }
    }

    /** Copies this version into a new Draft with the label given. */
    public async CreateDraft(): Promise<void> {
        const label = this.DraftLabel.trim();
        if (label.length === 0) {
            this.showError('draft', 'Enter a label for this version.');
            return;
        }
        await this.run('draft', async () => {
            const result = await new CloneVersionToDraftOperation().Execute({ SourceVersionID: this.VersionID, NewLabel: label }, { provider: this.ProviderToUse });
            if (!result.Success || !result.Output) {
                throw new Error(result.ErrorMessage || 'The draft was not created.');
            }
            this.DraftDialogOpen = false;
            this.VersionChanged.emit(result.Output.VersionID);
        });
    }

    // ---- Sections ----------------------------------------------------------------------------

    public async StartAddSection(): Promise<void> {
        await this.run('new-section', async () => {
            const section = await this.entity<SectionEntity>(CredentialingEntity.Section);
            section.NewRecord();
            section.ProgramVersionID = this.VersionID;
            section.Sequence = StudioTree.NextSequence(this.Tree.map((n) => n.Section));
            this.EditingSection = section;
        });
    }

    public async StartEditSection(row: SectionRow): Promise<void> {
        await this.run(row.ID, async () => {
            this.EditingSection = await this.loaded<SectionEntity>(CredentialingEntity.Section, row.ID);
        });
    }

    public CancelSection(): void {
        this.EditingSection = null;
        this.clearError();
    }

    public async SaveSection(): Promise<void> {
        const section = this.EditingSection;
        if (section == null) {
            return;
        }
        await this.run(section.IsSaved ? section.ID : 'new-section', async () => {
            if (!(await section.Save())) {
                throw new Error(section.LatestResult?.CompleteMessage || 'The section was not saved.');
            }
            this.EditingSection = null;
            this.ReloadRequested.emit();
        });
    }

    public async DeleteSection(row: SectionRow): Promise<void> {
        if (!(await this.confirm.ConfirmDelete({ message: `Delete section ${row.Number} ${row.Name}?`, confirmText: 'Delete section' }))) {
            return;
        }
        await this.deleteRow<SectionEntity>(CredentialingEntity.Section, row.ID, 'The section was not deleted.');
    }

    public async MoveSection(row: SectionRow, delta: -1 | 1): Promise<void> {
        const changes = StudioTree.Move(this.Tree.map((n) => n.Section), row.ID, delta);
        await this.reorder(row.ID, changes, []);
    }

    // ---- Standards ---------------------------------------------------------------------------

    public async MoveStandard(node: TreeSection, row: StandardRow, delta: -1 | 1): Promise<void> {
        const changes = StudioTree.Move(node.Standards, row.ID, delta);
        await this.reorder(row.ID, [], changes);
    }

    public async DeleteStandard(row: StandardRow): Promise<void> {
        if (!(await this.confirm.ConfirmDelete({ message: `Delete standard ${row.Code}?`, confirmText: 'Delete standard' }))) {
            return;
        }
        await this.deleteRow<StandardEntity>(CredentialingEntity.Standard, row.ID, 'The standard was not deleted.');
    }

    // ---- Helpers -----------------------------------------------------------------------------

    private async changeStatus(status: VersionEntity['Status']): Promise<void> {
        const version = this.Version;
        if (version == null) {
            return;
        }
        const previous = version.Status;
        await this.run('version', async () => {
            version.Status = status;
            if (!(await version.Save())) {
                version.Status = previous;
                throw new Error(version.LatestResult?.CompleteMessage || 'The version was not saved.');
            }
            this.VersionChanged.emit(version.ID);
        });
    }

    /** One reorder call with every changed `Sequence`; on a refusal the tree reloads to show what is stored. */
    private async reorder(target: string, sections: SequenceChange[], standards: SequenceChange[]): Promise<void> {
        if (sections.length === 0 && standards.length === 0) {
            return;
        }
        await this.run(target, async () => {
            try {
                const result = await new ReorderVersionTreeOperation().Execute(
                    { VersionID: this.VersionID, Sections: sections, Standards: standards },
                    { provider: this.ProviderToUse },
                );
                if (!result.Success) {
                    throw new Error(result.ErrorMessage || 'The new order was not saved.');
                }
            } finally {
                this.ReloadRequested.emit();
            }
        });
    }

    private async deleteRow<T extends SectionEntity | StandardEntity>(entityName: string, id: string, fallback: string): Promise<void> {
        await this.run(id, async () => {
            const row = await this.loaded<T>(entityName, id);
            if (!(await row.Delete())) {
                throw new Error(row.LatestResult?.CompleteMessage || fallback);
            }
            this.ReloadRequested.emit();
        });
    }

    private entity<T extends SectionEntity | StandardEntity>(entityName: string): Promise<T> {
        return this.ProviderToUse.GetEntityObject<T>(entityName, this.ProviderToUse.CurrentUser);
    }

    private async loaded<T extends SectionEntity | StandardEntity>(entityName: string, id: string): Promise<T> {
        const row = await this.entity<T>(entityName);
        if (!(await row.Load(id))) {
            throw new Error('Record not found.');
        }
        return row;
    }

    /** Runs one action at a time, showing its refusal or failure beside `target`. */
    private async run(target: TreeErrorTarget, work: () => Promise<void>): Promise<void> {
        if (this.IsBusy) {
            return;
        }
        this.IsBusy = true;
        this.clearError();
        this.cdr.markForCheck();
        try {
            await work();
        } catch (e) {
            this.showError(target, e instanceof Error ? e.message : String(e));
        } finally {
            this.IsBusy = false;
            this.cdr.markForCheck();
        }
    }

    private showError(target: TreeErrorTarget, message: string): void {
        this.ErrorTarget = target;
        this.ErrorMessage = message;
        this.cdr.markForCheck();
    }

    private clearError(): void {
        this.ErrorTarget = null;
        this.ErrorMessage = '';
    }
}
