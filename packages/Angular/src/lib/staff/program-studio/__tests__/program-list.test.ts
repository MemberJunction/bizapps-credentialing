import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { ProgramListComponent } from '../program-list.component';
import type { ProgramListRow } from '../studio-data';

function createComponent(): ProgramListComponent {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const injector = Injector.create({ providers: [{ provide: ChangeDetectorRef, useValue: cdr }] });
    return runInInjectionContext(injector, () => new ProgramListComponent());
}

function makeProgramRows(count: number): ProgramListRow[] {
    return Array.from({ length: count }, (_, i) => ({
        ID: `P-${i}`,
        Name: `Program ${String(i + 1).padStart(3, '0')}`,
        ProgramType: 'Certification',
        CredentialPrefix: `PRG${i}`,
        AccreditingOrganization: 'Org A',
        Status: 'Draft',
    }));
}

describe('ProgramListComponent 50-row paging', () => {
    it('pages Visible programs at 50 per page and resets to page 0 when Filter changes', () => {
        const component = createComponent();
        component.Programs = makeProgramRows(120);

        expect(component.PageSize).toBe(50);
        expect(component.Page.Items).toHaveLength(50);
        expect(component.Page.TotalPages).toBe(3);
        expect(component.Page.StartIndex).toBe(1);
        expect(component.Page.EndIndex).toBe(50);

        component.NextPage();
        expect(component.Page.PageIndex).toBe(1);
        expect(component.Page.StartIndex).toBe(51);
        expect(component.Page.EndIndex).toBe(100);

        component.PreviousPage();
        expect(component.Page.PageIndex).toBe(0);

        component.NextPage();
        expect(component.Page.PageIndex).toBe(1);
        component.Filter = 'Program 00';
        expect(component.Page.PageIndex).toBe(0);
        expect(component.Visible.length).toBe(9);
    });
});
