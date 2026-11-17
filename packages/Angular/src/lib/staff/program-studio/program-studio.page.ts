/**
 * Program Studio — composes the program list, the wizard, the version tree, the standard editor,
 * the settings and the document requirements, and holds what is selected.
 *
 * It reads a program with everything under it in ONE `RunViews` call ({@link StudioData.LoadProgram})
 * and passes the rows down; each widget writes its own single records (or calls a remote operation)
 * through `ProviderToUse` and asks the page to reload. A program the user cannot read shows a
 * not-found state, never another organization's program and never an empty tree; a failed load
 * shows its error. The page navigates nowhere: it emits {@link SelectionChanged} and its host keeps
 * the URL in step.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJButtonDirective, MJDropdownComponent, MJEmptyStateComponent, MJTabNavComponent, type TabConfig } from '@memberjunction/ng-ui-components';
import type { mjBizAppsCredentialingProgramVersionEntity } from '@mj-biz-apps/credentialing-entities';
import { DocumentRequirementsComponent } from './document-requirements.component';
import { ProgramListComponent } from './program-list.component';
import { ProgramWizardComponent, type WizardOrganization } from './program-wizard.component';
import { StandardEditorComponent, type NewStandardTarget } from './standard-editor.component';
import { StudioData, type ProgramBundle } from './studio-data';
import { StudioViewModel, type StudioVersionView } from './studio-view-model';
import { VersionSettingsComponent } from './version-settings.component';
import { VersionTreeComponent } from './version-tree.component';

/** What the page selects; the host mirrors it in the URL. */
export interface StudioSelection {
    ProgramID: string | null;
    VersionID: string | null;
}

export type StudioMode = 'Empty' | 'Wizard' | 'Program';
export type ProgramLoadState = 'Loading' | 'Loaded' | 'NotFound' | 'Error';
export type StudioTab = 'Standards' | 'Settings' | 'Documents';

/** The not-found sentence: the same for a program that does not exist and one the user cannot read. */
export const PROGRAM_NOT_FOUND_MESSAGE = 'This program does not exist, or you do not have access to it.';

@Component({
    standalone: true,
    selector: 'bizapps-cred-program-studio',
    imports: [
        FormsModule,
        SharedGenericModule,
        MJAlertComponent,
        MJButtonDirective,
        MJDropdownComponent,
        MJEmptyStateComponent,
        MJTabNavComponent,
        ProgramListComponent,
        ProgramWizardComponent,
        VersionTreeComponent,
        StandardEditorComponent,
        VersionSettingsComponent,
        DocumentRequirementsComponent,
    ],
    templateUrl: './program-studio.page.html',
    styleUrls: ['./program-studio.page.scss'],
})
export class ProgramStudioPage extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private loadToken = 0;
    private _programID: string | null = null;
    private requestedVersionID: string | null = null;

    /** The staff member's organizations (`Standing.StaffOrganizations`), for the wizard. */
    @Input() Organizations: readonly WizardOrganization[] = [];

    /** The program to open (from the URL); setting it loads the program. */
    @Input()
    set ProgramID(value: string | null) {
        const id = value?.trim() || null;
        if (id == null) {
            this._programID = null;
            this.Mode = this.Mode === 'Wizard' ? 'Wizard' : 'Empty';
            return;
        }
        if (this._programID?.toLowerCase() !== id.toLowerCase()) {
            void this.openProgram(id, this.requestedVersionID, false);
        }
    }
    get ProgramID(): string | null {
        return this._programID;
    }

    /** The version to show (from the URL). Set before {@link ProgramID} when both change. */
    @Input()
    set VersionID(value: string | null) {
        this.requestedVersionID = value?.trim() || null;
        if (this.requestedVersionID && this.Bundle) {
            this.selectVersion(this.requestedVersionID, false);
        }
    }
    get VersionID(): string | null {
        return this.SelectedVersionID;
    }

    @Output() SelectionChanged = new EventEmitter<StudioSelection>();

    public Mode: StudioMode = 'Empty';
    public LoadState: ProgramLoadState = 'Loading';
    public LoadError = '';
    public readonly NotFoundMessage = PROGRAM_NOT_FOUND_MESSAGE;
    public Bundle: ProgramBundle | null = null;
    public SelectedVersionID: string | null = null;
    public SelectedStandardID: string | null = null;
    public NewStandard: NewStandardTarget | null = null;
    public Tab: StudioTab = 'Standards';
    public ListRefresh = 0;
    public IsRefreshing = false;

    public get Tabs(): TabConfig[] {
        const docs = this.Bundle && this.SelectedVersionID ? this.Bundle.Requirements.filter((r) => r.ProgramVersionID.toLowerCase() === this.SelectedVersionID?.toLowerCase()).length : 0;
        return [
            { key: 'Standards', label: 'Sections and standards', icon: 'fa-solid fa-list-ol' },
            { key: 'Settings', label: 'Settings', icon: 'fa-solid fa-sliders' },
            { key: 'Documents', label: 'Document requirements', icon: 'fa-solid fa-file-lines', badge: docs || null },
        ];
    }

    public get SelectedVersion(): mjBizAppsCredentialingProgramVersionEntity | null {
        const id = this.SelectedVersionID?.toLowerCase();
        return this.Bundle?.Versions.find((v) => v.ID.toLowerCase() === id) ?? null;
    }

    public get View(): StudioVersionView {
        return StudioViewModel.For({ Status: this.SelectedVersion?.Status ?? 'Retired' });
    }

    public get VersionChoices(): { ID: string; Text: string }[] {
        return (this.Bundle?.Versions ?? []).map((v) => ({ ID: v.ID, Text: `${v.Label} (${v.Status})` }));
    }

    public get EditorOpen(): boolean {
        return this.SelectedStandardID != null || this.NewStandard != null;
    }

    // ---- Events from the widgets ---------------------------------------------------------------

    public OnProgramSelected(programID: string): void {
        void this.openProgram(programID, null, true);
    }

    public OnNewProgramRequested(): void {
        this.Mode = 'Wizard';
        this.cdr.markForCheck();
    }

    public OnWizardCancelled(): void {
        this.Mode = this._programID ? 'Program' : 'Empty';
        this.cdr.markForCheck();
    }

    public OnProgramCreated(created: { ProgramID: string; VersionID: string }): void {
        this.ListRefresh++;
        void this.openProgram(created.ProgramID, created.VersionID, true);
    }

    public OnVersionPicked(versionID: string | null): void {
        if (versionID) {
            this.selectVersion(versionID, true);
        }
    }

    public OnTabChange(key: string): void {
        this.Tab = key === 'Settings' || key === 'Documents' ? key : 'Standards';
        this.cdr.markForCheck();
    }

    /** A version action finished: reload, then show `versionID` (or the default after a delete). */
    public async OnVersionChanged(versionID: string): Promise<void> {
        this.closeEditor();
        await this.reload(versionID || null);
        this.emitSelection();
    }

    public async OnReloadRequested(): Promise<void> {
        await this.reload(this.SelectedVersionID);
    }

    public OnStandardSelected(standardID: string): void {
        this.NewStandard = null;
        this.SelectedStandardID = standardID;
        this.cdr.markForCheck();
    }

    public OnStandardAddRequested(target: NewStandardTarget): void {
        this.SelectedStandardID = null;
        this.NewStandard = target;
        this.cdr.markForCheck();
    }

    public async OnStandardSaved(standardID: string): Promise<void> {
        this.NewStandard = null;
        this.SelectedStandardID = standardID;
        await this.reload(this.SelectedVersionID);
    }

    public OnEditorClosed(): void {
        this.closeEditor();
        this.cdr.markForCheck();
    }

    // ---- Loading ---------------------------------------------------------------------------------

    private async openProgram(programID: string, versionID: string | null, emit: boolean): Promise<void> {
        this._programID = programID;
        this.Mode = 'Program';
        this.LoadState = 'Loading';
        this.Bundle = null;
        this.Tab = 'Standards';
        this.closeEditor();
        this.cdr.markForCheck();
        await this.load(versionID);
        if (emit) {
            this.emitSelection();
        }
    }

    /** Reloads the open program without clearing the screen, then shows `versionID`. */
    private async reload(versionID: string | null): Promise<void> {
        this.IsRefreshing = true;
        this.cdr.markForCheck();
        try {
            await this.load(versionID);
        } finally {
            this.IsRefreshing = false;
            this.cdr.markForCheck();
        }
    }

    private async load(versionID: string | null): Promise<void> {
        const programID = this._programID;
        if (programID == null) {
            return;
        }
        const token = ++this.loadToken;
        try {
            const result = await StudioData.ForProvider(this.ProviderToUse).LoadProgram(programID);
            if (token !== this.loadToken) {
                return;
            }
            if (!result.Found) {
                this.Bundle = null;
                this.LoadState = 'NotFound';
                return;
            }
            this.Bundle = result.Bundle;
            this.SelectedVersionID = StudioViewModel.PickVersion(result.Bundle.Versions, versionID)?.ID ?? null;
            this.LoadState = 'Loaded';
        } catch (e) {
            if (token === this.loadToken) {
                this.Bundle = null;
                this.LoadError = e instanceof Error ? e.message : String(e);
                this.LoadState = 'Error';
            }
        } finally {
            if (token === this.loadToken) {
                this.cdr.markForCheck();
            }
        }
    }

    private selectVersion(versionID: string, emit: boolean): void {
        const picked = StudioViewModel.PickVersion(this.Bundle?.Versions ?? [], versionID);
        if (picked == null || picked.ID === this.SelectedVersionID) {
            return;
        }
        this.SelectedVersionID = picked.ID;
        this.closeEditor();
        this.cdr.markForCheck();
        if (emit) {
            this.emitSelection();
        }
    }

    private closeEditor(): void {
        this.SelectedStandardID = null;
        this.NewStandard = null;
    }

    private emitSelection(): void {
        this.SelectionChanged.emit({ ProgramID: this._programID, VersionID: this.SelectedVersionID });
    }
}
