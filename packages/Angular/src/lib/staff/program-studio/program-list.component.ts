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
import { StudioData, type ProgramListRow } from './studio-data';
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
                void this.Load();
            }
        }
    }
    get RefreshToken(): number {
        return this._refreshToken;
    }

    @Output() ProgramSelected = new EventEmitter<string>();
    @Output() NewProgramRequested = new EventEmitter<void>();

    public Programs: ProgramListRow[] = [];
    public Filter = '';
    public IsLoading = false;
    public ErrorMessage = '';

    public get Visible(): ProgramListRow[] {
        const f = this.Filter.trim().toLowerCase();
        if (f.length === 0) {
            return this.Programs;
        }
        return this.Programs.filter((p) => p.Name.toLowerCase().includes(f) || p.CredentialPrefix.toLowerCase().includes(f));
    }

    ngOnInit(): void {
        this.initialized = true;
        void this.Load();
    }

    public async Load(): Promise<void> {
        this.IsLoading = true;
        this.ErrorMessage = '';
        this.cdr.markForCheck();
        try {
            this.Programs = await StudioData.ForProvider(this.ProviderToUse).ProgramList();
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
