/**
 * Creates a program with its first Draft version (FRD FR-2.1).
 *
 * One call to `Credentialing.CreateProgram` through `ProviderToUse`: the server saves the Program and
 * its first version in one transaction, so this widget saves nothing itself. With one organization the
 * program is created in it and no organization control is shown; with several, the organization is a
 * required first choice. A refusal leaves the wizard open with the server's sentence beside the field
 * it names, as {@link StudioMessages} words it. Emits {@link ProgramCreated}; navigates nowhere.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { MJButtonDirective, MJDropdownComponent } from '@memberjunction/ng-ui-components';
import { CreateProgramOperation, CredentialingEntity, type ProgramType, type SubjectType } from '@mj-biz-apps/credentialing-core';
import { StudioMessages } from '../studio-messages';

/** An organization the program can be created in. */
export interface WizardOrganization {
    ID: string;
    Name: string;
}

/** Which field a refusal concerns. */
export type WizardErrorField = 'Organization' | 'Name' | 'CredentialPrefix' | 'FirstVersionLabel' | 'SubjectNoun' | 'Form';

@Component({
    standalone: true,
    selector: 'bizapps-cred-program-wizard',
    imports: [FormsModule, MJButtonDirective, MJDropdownComponent],
    templateUrl: './program-wizard.component.html',
    styleUrls: ['./program-wizard.component.scss'],
})
export class ProgramWizardComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private _organizations: readonly WizardOrganization[] = [];

    /** The staff member's organizations (`Standing.StaffOrganizations`). */
    @Input()
    set Organizations(value: readonly WizardOrganization[]) {
        this._organizations = value ?? [];
        this.OrganizationID = this._organizations.length === 1 ? this._organizations[0].ID : '';
    }
    get Organizations(): readonly WizardOrganization[] {
        return this._organizations;
    }

    @Output() ProgramCreated = new EventEmitter<{ ProgramID: string; VersionID: string }>();
    @Output() Cancelled = new EventEmitter<void>();

    public OrganizationID = '';
    public Name = '';
    public ProgramType: ProgramType | '' = '';
    public SubjectType: SubjectType | '' = '';
    public SubjectNoun = '';
    public CredentialPrefix = '';
    public Description = '';
    public FirstVersionLabel = '';

    public IsSubmitting = false;
    public ErrorMessage = '';
    public ErrorField: WizardErrorField | null = null;

    /** The organization is chosen only when the user belongs to more than one. */
    public get ShowOrganization(): boolean {
        return this._organizations.length > 1;
    }

    public get OrganizationChoices(): WizardOrganization[] {
        return [...this._organizations];
    }

    public get ProgramTypes(): ProgramType[] {
        return this.valueList<ProgramType>('ProgramType');
    }

    public get SubjectTypes(): SubjectType[] {
        return this.valueList<SubjectType>('SubjectType');
    }

    /** Every required field holds a value and no call is in flight. */
    public get CanSubmit(): boolean {
        const filled = [this.OrganizationID, this.Name, this.ProgramType, this.SubjectType, this.SubjectNoun, this.CredentialPrefix, this.FirstVersionLabel];
        return !this.IsSubmitting && filled.every((v) => v.trim().length > 0);
    }

    public ErrorFor(field: WizardErrorField): string {
        return this.ErrorField === field ? this.ErrorMessage : '';
    }

    public async Submit(): Promise<void> {
        if (!this.CanSubmit || this.ProgramType === '' || this.SubjectType === '') {
            return;
        }
        this.IsSubmitting = true;
        this.ErrorMessage = '';
        this.ErrorField = null;
        this.cdr.markForCheck();
        try {
            const description = this.Description.trim();
            const result = await new CreateProgramOperation().Execute(
                {
                    AccreditingOrganizationID: this.OrganizationID,
                    Name: this.Name.trim(),
                    ProgramType: this.ProgramType,
                    SubjectType: this.SubjectType,
                    SubjectNoun: this.SubjectNoun.trim(),
                    CredentialPrefix: this.CredentialPrefix.trim(),
                    Description: description.length > 0 ? description : null,
                    FirstVersionLabel: this.FirstVersionLabel.trim(),
                },
                { provider: this.ProviderToUse },
            );
            if (result.Success && result.Output) {
                this.ProgramCreated.emit({ ProgramID: result.Output.ProgramID, VersionID: result.Output.VersionID });
            } else {
                this.showError(StudioMessages.ForUser(result.ErrorMessage || 'The program was not created.'));
            }
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

    private showError(message: string): void {
        this.ErrorMessage = message;
        this.ErrorField = ProgramWizardComponent.FieldFor(message);
    }

    /**
     * The field a server refusal names: `A program named … already exists in this organization.` and
     * `Enter the program's name.` beside Name, `Credential prefix … is already used in this
     * organization.` and `Enter the credential prefix.` beside Prefix, `Enter the subject noun.` beside
     * the subject noun.
     */
    public static FieldFor(message: string): WizardErrorField {
        if (/prefix/i.test(message)) {
            return 'CredentialPrefix';
        }
        if (/\blabel/i.test(message)) {
            return 'FirstVersionLabel';
        }
        if (/\bnoun\b/i.test(message)) {
            return 'SubjectNoun';
        }
        if (/name/i.test(message)) {
            return 'Name';
        }
        if (/\borganization\b/i.test(message)) {
            return 'Organization';
        }
        return 'Form';
    }

    private valueList<T extends string>(fieldName: 'ProgramType' | 'SubjectType'): T[] {
        const field = this.ProviderToUse.EntityByName(CredentialingEntity.Program)?.Fields.find((f) => f.Name === fieldName);
        return (field?.EntityFieldValues ?? []).map((v) => v.Value as T).sort();
    }
}
