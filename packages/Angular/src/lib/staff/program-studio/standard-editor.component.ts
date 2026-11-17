/**
 * Adds or edits one standard (FRD FR-2.2, FR-2.3). A save is a single-record `Save()`; the server
 * guard normalizes the code, refuses a duplicate and decides every rule, and its refusal is shown
 * beside the field it names, as {@link StudioMessages} words it. A blank code or statement is refused
 * here first, with the same sentence the server gives. A refusal that means the screen is out of date
 * stays visible while the stored standard is loaded again and the page reloads the version.
 *
 * Evaluation mode is shown, never edited: it changes only through the Trust screen of a later plan,
 * so no control here writes it and a save never sends it changed. On a version that cannot be
 * authored the editor renders read-only text and no input at all.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJButtonDirective, MJDropdownComponent, MJSwitchComponent } from '@memberjunction/ng-ui-components';
import { CredentialingEntity, NOT_FOUND_REASON, StandardAuthoringRules } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingStandardEntity } from '@mj-biz-apps/credentialing-entities';
import { StudioTree, type StandardErrorField } from './studio-tree';
import { StudioMessages } from '../studio-messages';

type StandardEntity = mjBizAppsCredentialingStandardEntity;

/** The sentence beside the read-only evaluation mode. */
export const EVALUATION_MODE_NOTE = 'Changes only through the Trust screen.';

/** Where a new standard goes. */
export interface NewStandardTarget {
    SectionID: string;
    VersionID: string;
    Sequence: number;
}

@Component({
    standalone: true,
    selector: 'bizapps-cred-standard-editor',
    imports: [FormsModule, SharedGenericModule, MJButtonDirective, MJDropdownComponent, MJSwitchComponent],
    templateUrl: './standard-editor.component.html',
    styleUrls: ['./standard-editor.component.scss'],
})
export class StandardEditorComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private _standardID: string | null = null;
    private _newTarget: NewStandardTarget | null = null;
    private loadToken = 0;

    /** Sections and standards of this version can be edited. False renders read-only text. */
    @Input() CanAuthor = false;

    /** The standard to show; setting it loads the record. */
    @Input()
    set StandardID(value: string | null) {
        if (value && value !== this._standardID) {
            this._standardID = value;
            this._newTarget = null;
            void this.load(() => this.loadExisting(value));
        }
    }
    get StandardID(): string | null {
        return this._standardID;
    }

    /** Set instead of {@link StandardID} to add a standard to a section. */
    @Input()
    set NewStandard(value: NewStandardTarget | null) {
        if (value && value !== this._newTarget) {
            this._newTarget = value;
            this._standardID = null;
            void this.load(() => this.createNew(value));
        }
    }
    get NewStandard(): NewStandardTarget | null {
        return this._newTarget;
    }

    /** Emits the standard's ID after it was saved. */
    @Output() Saved = new EventEmitter<string>();
    @Output() Closed = new EventEmitter<void>();
    /** A save was refused because the version changed elsewhere: the page should reload what is stored. */
    @Output() ReloadRequested = new EventEmitter<void>();

    public Standard: StandardEntity | null = null;
    public IsLoading = false;
    public IsSaving = false;
    public LoadError = '';
    public ErrorMessage = '';
    public ErrorField: StandardErrorField | null = null;
    public readonly EvaluationModeNote = EVALUATION_MODE_NOTE;

    public get IsNew(): boolean {
        return this.Standard != null && !this.Standard.IsSaved;
    }

    public get CanSave(): boolean {
        return this.CanAuthor && !this.IsSaving && this.Standard != null && (this.IsNew || this.Standard.Dirty);
    }

    public get ResponseTypes(): StandardEntity['ResponseType'][] {
        return this.valueList<StandardEntity['ResponseType']>('ResponseType');
    }

    public get IntakeModes(): StandardEntity['IntakeMode'][] {
        return this.valueList<StandardEntity['IntakeMode']>('IntakeMode');
    }

    public ErrorFor(field: StandardErrorField): string {
        return this.ErrorField === field ? this.ErrorMessage : '';
    }

    public async Save(): Promise<void> {
        const standard = this.Standard;
        if (!this.CanSave || standard == null) {
            return;
        }
        this.clearError();
        const text = StandardAuthoringRules.CheckStandardText({ Code: standard.Code, Statement: standard.Statement });
        if (!text.Allowed) {
            this.showError(text.Reason);
            this.cdr.markForCheck();
            return;
        }
        this.IsSaving = true;
        try {
            if (await standard.Save()) {
                this.Saved.emit(standard.ID);
            } else {
                await this.refused(StudioMessages.ForUser(standard.LatestResult?.CompleteMessage || 'The standard was not saved.'));
            }
        } catch (e) {
            await this.refused(StudioMessages.FromError(e));
        } finally {
            this.IsSaving = false;
            this.cdr.markForCheck();
        }
    }

    public Close(): void {
        this.Closed.emit();
    }

    /**
     * Shows a refused save. When it means the screen is out of date, the message stays, a saved
     * standard is loaded again so the editor shows what is stored, and the page is asked to reload.
     */
    private async refused(message: string): Promise<void> {
        this.showError(message);
        if (!StudioMessages.MeansStaleView(message)) {
            return;
        }
        const id = this._standardID;
        if (id != null && this.Standard?.IsSaved) {
            await this.load(() => this.loadExisting(id), true);
        }
        this.ReloadRequested.emit();
    }

    private async load(work: () => Promise<StandardEntity>, keepError = false): Promise<void> {
        const token = ++this.loadToken;
        this.IsLoading = true;
        this.LoadError = '';
        if (!keepError) {
            this.clearError();
        }
        this.Standard = null;
        this.cdr.markForCheck();
        try {
            const standard = await work();
            if (token === this.loadToken) {
                this.Standard = standard;
            }
        } catch (e) {
            if (token === this.loadToken) {
                this.LoadError = StudioMessages.FromError(e, 'load');
            }
        } finally {
            if (token === this.loadToken) {
                this.IsLoading = false;
                this.cdr.markForCheck();
            }
        }
    }

    private async loadExisting(id: string): Promise<StandardEntity> {
        const standard = await this.ProviderToUse.GetEntityObject<StandardEntity>(CredentialingEntity.Standard, this.ProviderToUse.CurrentUser);
        if (!(await standard.Load(id))) {
            throw new Error(NOT_FOUND_REASON);
        }
        return standard;
    }

    private async createNew(target: NewStandardTarget): Promise<StandardEntity> {
        const standard = await this.ProviderToUse.GetEntityObject<StandardEntity>(CredentialingEntity.Standard, this.ProviderToUse.CurrentUser);
        standard.NewRecord();
        standard.SectionID = target.SectionID;
        // The server sets this from the section; it is sent equal to the section's version all the same.
        standard.ProgramVersionID = target.VersionID;
        standard.Sequence = target.Sequence;
        standard.ResponseType = this.valueList<StandardEntity['ResponseType']>('ResponseType', standard)[0];
        standard.IsNewForVersion = true;
        return standard;
    }

    /** A value-list field's values, from the entity's metadata, so the screen follows the CHECK constraint. */
    private valueList<T extends string>(fieldName: 'ResponseType' | 'IntakeMode', entity: StandardEntity | null = this.Standard): T[] {
        const field = entity?.EntityInfo.Fields.find((f) => f.Name === fieldName);
        return (field?.EntityFieldValues ?? []).map((v) => v.Value as T).sort();
    }

    private clearError(): void {
        this.ErrorMessage = '';
        this.ErrorField = null;
    }

    private showError(message: string): void {
        this.ErrorMessage = message;
        this.ErrorField = StudioTree.StandardFieldFor(message);
    }
}
