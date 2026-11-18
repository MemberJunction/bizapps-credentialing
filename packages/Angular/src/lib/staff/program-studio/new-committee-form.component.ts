/**
 * Creates a committee for the organization of the open program, from the Settings tab.
 *
 * One call to `Credentialing.CreateCommittee` through `ProviderToUse`. The caller names the program,
 * never an organization: the server finds the owning organization from the program as it reads it for
 * this user, and writes the committee itself (staff hold no Create permission on committees). A blank
 * name or a missing type is refused here first, with the sentence the server gives; every refusal is
 * shown beside the field it concerns, or under the form, as {@link StudioMessages} words it. Emits
 * {@link Created} or {@link Cancelled}; selects nothing and navigates nowhere.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { MJButtonDirective, MJDropdownComponent } from '@memberjunction/ng-ui-components';
import { CommitteeRules, CreateCommitteeOperation, type CommitteeFormField, type CreateCommitteeOutput, type RuleResult } from '@mj-biz-apps/credentialing-core';
import type { CommitteeTypeRow } from './studio-data';
import { StudioMessages } from '../studio-messages';

/** Where a refusal is shown: beside one of the two fields, or under the form. */
export type CommitteeErrorField = CommitteeFormField | 'Form';

/** Shown when the call fails without a message of its own. */
export const COMMITTEE_NOT_CREATED_MESSAGE = 'The committee was not created.';

@Component({
    standalone: true,
    selector: 'bizapps-cred-new-committee-form',
    imports: [FormsModule, MJButtonDirective, MJDropdownComponent],
    templateUrl: './new-committee-form.component.html',
    styleUrls: ['./new-committee-form.component.scss'],
})
export class NewCommitteeFormComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private _committeeTypes: readonly CommitteeTypeRow[] = [];

    /** The program whose organization will own the committee. */
    @Input() ProgramID: string | null = null;

    /** The committee types to choose from; the first is chosen until the user picks another. */
    @Input()
    set CommitteeTypes(value: readonly CommitteeTypeRow[]) {
        this._committeeTypes = value ?? [];
        this.CommitteeTypeID = NewCommitteeFormComponent.DefaultTypeID(this._committeeTypes, this.CommitteeTypeID);
    }
    get CommitteeTypes(): readonly CommitteeTypeRow[] {
        return this._committeeTypes;
    }

    /** The committee the server created, with its name as stored. */
    @Output() Created = new EventEmitter<CreateCommitteeOutput>();
    @Output() Cancelled = new EventEmitter<void>();

    public Name = '';
    public CommitteeTypeID = '';
    public IsSubmitting = false;
    public ErrorMessage = '';
    public ErrorField: CommitteeErrorField | null = null;

    /** The type to show chosen: the current one while the list still has it, otherwise the first; '' for an empty list. */
    public static DefaultTypeID(types: readonly CommitteeTypeRow[], currentID: string): string {
        const current = currentID.toLowerCase();
        return (types.find((t) => t.ID.toLowerCase() === current) ?? types[0])?.ID ?? '';
    }

    /** Where a refusal is shown: beside the field `CommitteeRules` says it is about, otherwise under the form. */
    public static FieldFor(message: string): CommitteeErrorField {
        return CommitteeRules.FieldFor(message) ?? 'Form';
    }

    /** What the server would refuse without being asked: a blank name, then a missing type. Null when neither. */
    public static LocalRefusal(name: string, committeeTypeID: string): string | null {
        const rules: RuleResult[] = [CommitteeRules.CheckName(name), CommitteeRules.CheckType(committeeTypeID.trim().length > 0)];
        for (const rule of rules) {
            if ('Reason' in rule) {
                return rule.Reason;
            }
        }
        return null;
    }

    public get TypeChoices(): CommitteeTypeRow[] {
        return [...this._committeeTypes];
    }

    public ErrorFor(field: CommitteeErrorField): string {
        return this.ErrorField === field ? this.ErrorMessage : '';
    }

    public async Submit(): Promise<void> {
        const programID = this.ProgramID;
        if (this.IsSubmitting || programID == null) {
            return;
        }
        this.clearError();
        const refusal = NewCommitteeFormComponent.LocalRefusal(this.Name, this.CommitteeTypeID);
        if (refusal != null) {
            this.showError(refusal);
            return;
        }
        this.IsSubmitting = true;
        this.cdr.markForCheck();
        try {
            await this.create(programID);
        } catch (e) {
            this.showError(StudioMessages.FromError(e));
        } finally {
            this.IsSubmitting = false;
            this.cdr.markForCheck();
        }
    }

    public Cancel(): void {
        this.Cancelled.emit();
    }

    private async create(programID: string): Promise<void> {
        const result = await new CreateCommitteeOperation().Execute(
            { ProgramID: programID, Name: this.Name, CommitteeTypeID: this.CommitteeTypeID },
            { provider: this.ProviderToUse },
        );
        if (result.Success && result.Output) {
            this.Created.emit(result.Output);
        } else {
            this.showError(StudioMessages.ForUser(result.ErrorMessage || COMMITTEE_NOT_CREATED_MESSAGE));
        }
    }

    private clearError(): void {
        this.ErrorMessage = '';
        this.ErrorField = null;
    }

    private showError(message: string): void {
        this.ErrorMessage = message;
        this.ErrorField = NewCommitteeFormComponent.FieldFor(message);
        this.cdr.markForCheck();
    }
}
