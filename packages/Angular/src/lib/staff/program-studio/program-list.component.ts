/**
 * The programs the staff member can read (the row filter limits them to the user's organizations),
 * filterable by name or prefix. One view, read through `ProviderToUse`. Emits a selection or a
 * request for a new program; navigates nowhere.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJButtonDirective } from '@memberjunction/ng-ui-components';
import { CredentialingEngineBase } from '@mj-biz-apps/credentialing-entities';
import { PIPELINE_PAGE_SIZE, PageSlice, type PagedSlice } from '../pipeline/pipeline-data';
import type { ProgramListRow } from './studio-data';
import { StudioMessages } from '../studio-messages';

@Component({
    standalone: true,
    selector: 'bizapps-cred-program-list',
    imports: [FormsModule, SharedGenericModule, MJButtonDirective],
    templateUrl: './program-list.component.html',
    styleUrls: ['./program-list.component.scss'],
})
export class ProgramListComponent extends BaseAngularComponent implements OnInit {
    private readonly cdr = inject(ChangeDetectorRef);
    private _refreshToken = 0;
    private initialized = false;

    @Input() SelectedProgramID: string | null = null;

    /** Change this to reload the list (after a program is created). */
    @Input()
    set RefreshToken(value: number) {
        if (value !== this._refreshToken) {
            this._refreshToken = value;
            if (this.initialized) {
                void this.Load(true);
            }
        }
    }
    get RefreshToken(): number {
        return this._refreshToken;
    }

    @Output() ProgramSelected = new EventEmitter<string>();
    @Output() NewProgramRequested = new EventEmitter<void>();

    private _filter = '';
    public readonly PageSize = PIPELINE_PAGE_SIZE;
    public Programs: ProgramListRow[] = [];
    public PageIndex = 0;
    public IsLoading = false;
    public ErrorMessage = '';

    public get Filter(): string {
        return this._filter;
    }

    public set Filter(value: string) {
        if (value !== this._filter) {
            this._filter = value;
            this.PageIndex = 0;
        }
    }

    public get Visible(): ProgramListRow[] {
        const f = this._filter.trim().toLowerCase();
        if (f.length === 0) {
            return this.Programs;
        }
        return this.Programs.filter((p) => p.Name.toLowerCase().includes(f) || p.CredentialPrefix.toLowerCase().includes(f));
    }

    public get Page(): PagedSlice<ProgramListRow> {
        return PageSlice(this.Visible, this.PageIndex, this.PageSize);
    }

    public PreviousPage(): void {
        if (this.Page.PageIndex > 0) {
            this.PageIndex = this.Page.PageIndex - 1;
        }
    }

    public NextPage(): void {
        const page = this.Page;
        if (page.PageIndex + 1 < page.TotalPages) {
            this.PageIndex = page.PageIndex + 1;
        }
    }

    ngOnInit(): void {
        this.initialized = true;
        void this.Load();
    }

    public async Load(forceRefresh = false): Promise<void> {
        this.IsLoading = true;
        this.ErrorMessage = '';
        this.cdr.markForCheck();
        try {
            const engine = CredentialingEngineBase.Instance;
            await engine.Config(forceRefresh, undefined, this.ProviderToUse);
            this.Programs = [...engine.Programs]
                .sort((a, b) => a.Name.localeCompare(b.Name))
                .map((p) => ({
                    ID: p.ID,
                    Name: p.Name,
                    ProgramType: p.ProgramType,
                    CredentialPrefix: p.CredentialPrefix,
                    AccreditingOrganization: p.AccreditingOrganization,
                    Status: p.Status,
                }));
        } catch (e) {
            this.ErrorMessage = StudioMessages.FromError(e, 'load');
        } finally {
            this.IsLoading = false;
            this.cdr.markForCheck();
        }
    }

    public IsSelected(id: string): boolean {
        return this.SelectedProgramID != null && this.SelectedProgramID.toLowerCase() === id.toLowerCase();
    }

    public Select(program: ProgramListRow): void {
        this.ProgramSelected.emit(program.ID);
    }

    public RequestNew(): void {
        this.NewProgramRequested.emit();
    }
}
