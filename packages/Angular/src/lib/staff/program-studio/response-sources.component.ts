/**
 * Manages the ordered list of response sources ("Where the assistant looks") inside Program Studio's
 * standard editor (FR-7.1, Decision 7). Editable on a Draft version for Locate/Prefill standards;
 * read-only text with `Sources are part of the standards and change only in a draft version.` on
 * Active/Retired; shows `Manual standards have no sources.` when IntakeMode is Manual.
 *
 * Uses its own `Save sources` button calling `Credentialing.SaveResponseSources` so refusals name
 * the sources list rather than the standard's other fields.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RunView } from '@memberjunction/core';
import { EscapeSQLString } from '@memberjunction/global';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJButtonDirective } from '@memberjunction/ng-ui-components';
import {
    CredentialingEntity,
    SaveResponseSourcesOperation,
    type ResponseSourceMode,
    type ResponseSourceType,
    type VersionStatus,
} from '@mj-biz-apps/credentialing-core';
import { StudioMessages } from '../studio-messages';
import type { RequirementRow } from './studio-data';
import {
    AddSourceItem,
    AvailableRequirements,
    FormatSourceSentence,
    MoveSourceItem,
    RemoveSourceItem,
    ResolveSourcesViewState,
    SourcesListsEqual,
    type SourceListItem,
    type SourcesViewState,
} from './response-sources-model';

interface StoredSourceRow {
    ID: string;
    SourceType: ResponseSourceType;
    DocumentRequirementID: string | null;
    DocumentRequirement: string | null;
    Mode: ResponseSourceMode;
    Rank: number;
    Sequence: number;
}

@Component({
    standalone: true,
    selector: 'bizapps-cred-response-sources',
    imports: [FormsModule, SharedGenericModule, MJAlertComponent, MJButtonDirective],
    templateUrl: './response-sources.component.html',
    styleUrls: ['./response-sources.component.scss'],
})
export class ResponseSourcesComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);
    private _standardID: string | null = null;
    private _isNew = false;
    private _intakeMode = 'Manual';
    private _versionStatus: VersionStatus = 'Draft';
    private _requirements: readonly RequirementRow[] = [];
    private loadToken = 0;

    @Input()
    public get StandardID(): string | null {
        return this._standardID;
    }
    public set StandardID(value: string | null) {
        const normalized = value?.trim() || null;
        if (normalized !== this._standardID) {
            this._standardID = normalized;
            if (normalized != null && !this._isNew) {
                void this.loadSources(normalized);
            } else {
                this.resetState();
            }
        }
    }

    @Input()
    public get IsNew(): boolean {
        return this._isNew;
    }
    public set IsNew(value: boolean) {
        this._isNew = value;
        if (value) {
            this.resetState();
        }
        this.cdr.markForCheck();
    }

    @Input()
    public get IntakeMode(): string {
        return this._intakeMode;
    }
    public set IntakeMode(value: string) {
        this._intakeMode = value || 'Manual';
        this.cdr.markForCheck();
    }

    @Input()
    public get VersionStatus(): VersionStatus {
        return this._versionStatus;
    }
    public set VersionStatus(value: VersionStatus) {
        this._versionStatus = value || 'Draft';
        this.cdr.markForCheck();
    }

    @Input()
    public get Requirements(): readonly RequirementRow[] {
        return this._requirements;
    }
    public set Requirements(value: readonly RequirementRow[]) {
        this._requirements = value ?? [];
        this.cdr.markForCheck();
    }

    @Output() public readonly SourcesSaved = new EventEmitter<void>();
    @Output() public readonly ReloadRequested = new EventEmitter<void>();

    public Items: SourceListItem[] = [];
    public SavedItems: SourceListItem[] = [];
    public SelectedRequirementID = '';
    public IsLoading = false;
    public IsSaving = false;
    public LoadError = '';
    public ErrorMessage = '';
    public SavedNotice = '';

    public get ViewState(): SourcesViewState {
        return ResolveSourcesViewState(this._versionStatus, this._intakeMode);
    }

    public get AvailableToAdd(): RequirementRow[] {
        return AvailableRequirements(this._requirements, this.Items);
    }

    public get Dirty(): boolean {
        return !SourcesListsEqual(this.Items, this.SavedItems);
    }

    public get CanSave(): boolean {
        return this.ViewState.CanEdit && !this._isNew && !this.IsSaving && this.Dirty;
    }

    public SentenceFor(index: number, item: SourceListItem): string {
        return FormatSourceSentence(index + 1, item.RequirementName, this._intakeMode);
    }

    public AddSelected(): void {
        if (!this.ViewState.CanEdit || !this.SelectedRequirementID) return;
        const req = this.AvailableToAdd.find(
            (r) => r.ID.toLowerCase() === this.SelectedRequirementID.toLowerCase(),
        );
        if (!req) return;
        this.Items = AddSourceItem(this.Items, req);
        this.SelectedRequirementID = '';
        this.ErrorMessage = '';
        this.SavedNotice = '';
        this.cdr.markForCheck();
    }

    public Move(index: number, delta: -1 | 1): void {
        if (!this.ViewState.CanEdit) return;
        this.Items = MoveSourceItem(this.Items, index, delta);
        this.ErrorMessage = '';
        this.SavedNotice = '';
        this.cdr.markForCheck();
    }

    public Remove(index: number): void {
        if (!this.ViewState.CanEdit) return;
        this.Items = RemoveSourceItem(this.Items, index);
        this.ErrorMessage = '';
        this.SavedNotice = '';
        this.cdr.markForCheck();
    }

    public async SaveSources(): Promise<void> {
        if (!this.CanSave || !this._standardID) return;
        this.IsSaving = true;
        this.ErrorMessage = '';
        this.SavedNotice = '';
        this.cdr.markForCheck();
        try {
            const res = await new SaveResponseSourcesOperation().Execute(
                {
                    StandardID: this._standardID,
                    Sources: this.Items.map((item) => ({
                        ID: item.ID,
                        DocumentRequirementID: item.DocumentRequirementID,
                        Mode: item.Mode,
                    })),
                },
                { provider: this.ProviderToUse },
            );
            if (!res.Success || res.Output == null) {
                const msg = StudioMessages.ForUser(
                    res.ErrorMessage || 'The sources could not be saved.',
                    'save',
                );
                this.ErrorMessage = msg;
                if (StudioMessages.MeansStaleView(msg)) {
                    this.ReloadRequested.emit();
                }
                return;
            }
            const next: SourceListItem[] = res.Output.Sources.map((s) => ({
                ID: s.ID,
                SourceType: s.SourceType,
                DocumentRequirementID: s.DocumentRequirementID ?? '',
                RequirementName:
                    s.DocumentRequirement ??
                    this.requirementName(s.DocumentRequirementID ?? ''),
                Mode: s.Mode,
            }));
            this.Items = next;
            this.SavedItems = next.map((i) => ({ ...i }));
            this.SavedNotice = 'Sources saved.';
            this.SourcesSaved.emit();
        } catch (e) {
            this.ErrorMessage = StudioMessages.FromError(e, 'save');
        } finally {
            this.IsSaving = false;
            this.cdr.markForCheck();
        }
    }

    private async loadSources(standardID: string): Promise<void> {
        const token = ++this.loadToken;
        this.IsLoading = true;
        this.LoadError = '';
        this.ErrorMessage = '';
        this.SavedNotice = '';
        this.SelectedRequirementID = '';
        this.cdr.markForCheck();
        try {
            const res = await RunView.FromMetadataProvider(this.ProviderToUse).RunView<StoredSourceRow>({
                EntityName: CredentialingEntity.ResponseSource,
                ExtraFilter: `StandardID = '${EscapeSQLString(standardID)}'`,
                Fields: [
                    'ID',
                    'SourceType',
                    'DocumentRequirementID',
                    'DocumentRequirement',
                    'Mode',
                    'Rank',
                    'Sequence',
                ],
                OrderBy: 'Rank ASC, Sequence ASC',
                ResultType: 'simple',
                SkipTotalRowCount: true,
            });
            if (token !== this.loadToken) return;
            if (!res.Success) {
                this.LoadError = StudioMessages.ForUser(
                    res.ErrorMessage || 'Could not load sources.',
                    'load',
                );
                return;
            }
            const loaded: SourceListItem[] = (res.Results ?? [])
                .filter((row) => row.DocumentRequirementID != null)
                .map((row) => ({
                    ID: row.ID,
                    SourceType: row.SourceType,
                    DocumentRequirementID: row.DocumentRequirementID!,
                    RequirementName:
                        row.DocumentRequirement ?? this.requirementName(row.DocumentRequirementID!),
                    Mode: row.Mode,
                }));
            this.Items = loaded;
            this.SavedItems = loaded.map((i) => ({ ...i }));
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

    private requirementName(requirementID: string): string {
        return (
            this._requirements.find((r) => r.ID.toLowerCase() === requirementID.toLowerCase())
                ?.Name ?? 'required document'
        );
    }

    private resetState(): void {
        this.Items = [];
        this.SavedItems = [];
        this.SelectedRequirementID = '';
        this.LoadError = '';
        this.ErrorMessage = '';
        this.SavedNotice = '';
    }
}
