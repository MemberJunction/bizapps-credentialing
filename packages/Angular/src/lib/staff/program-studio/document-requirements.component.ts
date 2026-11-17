/**
 * The documents a version asks applicants for (FRD FR-2.7): name, whether it is required, and
 * whether the applicant may mark it restricted. Authoring is Draft-only; on any other version the
 * list renders as read-only text and no authoring control exists. Each add, edit and delete is a
 * single-record write; a refusal is shown beside the field, row or form that caused it, as
 * {@link StudioMessages} words it. A blank name is refused here first, with the server's sentence. A
 * refusal that means the screen is out of date stays visible, closes the form and reloads the list.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { MJButtonDirective, MJConfirmService, MJDropdownComponent, MJSwitchComponent } from '@memberjunction/ng-ui-components';
import { CredentialingEntity, NOT_FOUND_REASON, StandardAuthoringRules } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingDocumentRequirementEntity } from '@mj-biz-apps/credentialing-entities';
import type { RequirementRow } from './studio-data';
import { StudioTree, type RequirementErrorField } from './studio-tree';
import { StudioMessages, type StudioMessageKind } from '../studio-messages';

type RequirementEntity = mjBizAppsCredentialingDocumentRequirementEntity;

/** Which form or row a refusal belongs beside: `new`, or a requirement ID. */
type ErrorTarget = 'new' | string;

@Component({
    standalone: true,
    selector: 'bizapps-cred-document-requirements',
    imports: [FormsModule, MJButtonDirective, MJDropdownComponent, MJSwitchComponent],
    templateUrl: './document-requirements.component.html',
    styleUrls: ['./document-requirements.component.scss'],
})
export class DocumentRequirementsComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly confirm = inject(MJConfirmService);

    @Input() VersionID = '';
    /** The program's requirements; only this version's are shown. */
    @Input() Requirements: readonly RequirementRow[] = [];
    @Input() CanAuthor = false;

    /** Emits after any write so the page reloads what is stored. */
    @Output() Changed = new EventEmitter<void>();

    /** The record in the add form or being edited, or null. */
    public Editing: RequirementEntity | null = null;
    public IsBusy = false;
    public ErrorMessage = '';
    public ErrorTarget: ErrorTarget | null = null;

    public get Rows(): RequirementRow[] {
        return StudioTree.Requirements(this.VersionID, this.Requirements);
    }

    public get IsAdding(): boolean {
        return this.Editing != null && !this.Editing.IsSaved;
    }

    public get SensitivityPolicies(): RequirementEntity['SensitivityPolicy'][] {
        const field = this.Editing?.EntityInfo.Fields.find((f) => f.Name === 'SensitivityPolicy');
        return (field?.EntityFieldValues ?? []).map((v) => v.Value as RequirementEntity['SensitivityPolicy']).sort();
    }

    /** Where the open form's refusal is shown: `new`, or the edited requirement's ID. */
    public get EditTarget(): ErrorTarget {
        return this.Editing != null && this.Editing.IsSaved ? this.Editing.ID : 'new';
    }

    public IsEditingRow(id: string): boolean {
        return this.Editing != null && this.Editing.IsSaved && this.Editing.ID.toLowerCase() === id.toLowerCase();
    }

    public ErrorFor(target: ErrorTarget): string {
        return this.ErrorTarget != null && this.ErrorTarget.toLowerCase() === target.toLowerCase() ? this.ErrorMessage : '';
    }

    /** The refusal for one field of the open form (`target` is `new` or the requirement's ID), or ''. */
    public FieldErrorFor(target: ErrorTarget, field: RequirementErrorField): string {
        const message = this.ErrorFor(target);
        return message && StudioTree.RequirementFieldFor(message) === field ? message : '';
    }

    public async StartAdd(): Promise<void> {
        await this.run('new', async () => {
            const requirement = await this.newEntity();
            requirement.NewRecord();
            requirement.ProgramVersionID = this.VersionID;
            requirement.Sequence = StudioTree.NextSequence(this.Rows);
            this.Editing = requirement;
        });
    }

    public async StartEdit(row: RequirementRow): Promise<void> {
        await this.run(
            row.ID,
            async () => {
                const requirement = await this.newEntity();
                if (!(await requirement.Load(row.ID))) {
                    throw new Error(NOT_FOUND_REASON);
                }
                this.Editing = requirement;
            },
            'load',
        );
    }

    public CancelEdit(): void {
        this.Editing = null;
        this.clearError();
    }

    public async SaveEditing(): Promise<void> {
        const requirement = this.Editing;
        if (requirement == null) {
            return;
        }
        const target: ErrorTarget = requirement.IsSaved ? requirement.ID : 'new';
        await this.run(target, async () => {
            const text = StandardAuthoringRules.CheckDocumentRequirementText({ Name: requirement.Name });
            if (!text.Allowed) {
                throw new Error(text.Reason);
            }
            if (!(await requirement.Save())) {
                throw new Error(requirement.LatestResult?.CompleteMessage || 'The document requirement was not saved.');
            }
            this.Editing = null;
            this.Changed.emit();
        });
    }

    public async Delete(row: RequirementRow): Promise<void> {
        if (!(await this.confirm.ConfirmDelete({ message: `Delete the document requirement ${row.Name}?`, confirmText: 'Delete' }))) {
            return;
        }
        await this.run(row.ID, async () => {
            const requirement = await this.newEntity();
            if (!(await requirement.Load(row.ID))) {
                throw new Error(NOT_FOUND_REASON);
            }
            if (!(await requirement.Delete())) {
                throw new Error(requirement.LatestResult?.CompleteMessage || 'The document requirement was not deleted.');
            }
            this.Changed.emit();
        });
    }

    private newEntity(): Promise<RequirementEntity> {
        return this.ProviderToUse.GetEntityObject<RequirementEntity>(CredentialingEntity.DocumentRequirement, this.ProviderToUse.CurrentUser);
    }

    /**
     * Runs one action, showing a refusal or failure beside `target`. A refusal that means the screen is
     * out of date keeps its message, closes the form and asks the page to reload what is stored.
     */
    private async run(target: ErrorTarget, work: () => Promise<void>, kind: StudioMessageKind = 'save'): Promise<void> {
        if (this.IsBusy) {
            return;
        }
        this.IsBusy = true;
        this.clearError();
        this.cdr.markForCheck();
        try {
            await work();
        } catch (e) {
            this.ErrorMessage = StudioMessages.FromError(e, kind);
            this.ErrorTarget = target;
            if (StudioMessages.MeansStaleView(this.ErrorMessage)) {
                this.Editing = null;
                this.Changed.emit();
            }
        } finally {
            this.IsBusy = false;
            this.cdr.markForCheck();
        }
    }

    private clearError(): void {
        this.ErrorMessage = '';
        this.ErrorTarget = null;
    }
}
