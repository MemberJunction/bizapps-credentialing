import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { IMetadataProvider } from '@memberjunction/core';
import { CredentialingEngineBase } from '@mj-biz-apps/credentialing-entities';
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

    it('loads sorted programs from CredentialingEngineBase with active ProviderToUse and forwards forceRefresh', async () => {
        const component = createComponent();
        const fakeProvider = { CurrentUser: { ID: 'U1' } } as unknown as IMetadataProvider;
        component.Provider = fakeProvider;

        const engine = CredentialingEngineBase.Instance;
        const configSpy = vi.spyOn(engine, 'Config').mockResolvedValue(undefined);
        const programsSpy = vi.spyOn(engine, 'Programs', 'get').mockReturnValue([
            {
                ID: 'P2',
                Name: 'Zeta Program',
                ProgramType: 'Certification',
                CredentialPrefix: 'ZP',
                AccreditingOrganization: 'Org A',
                Status: 'Active',
            },
            {
                ID: 'P1',
                Name: 'Alpha Program',
                ProgramType: 'Accreditation',
                CredentialPrefix: 'AP',
                AccreditingOrganization: 'Org A',
                Status: 'Draft',
            },
        ] as unknown as typeof engine.Programs);

        try {
            await component.Load(false);
            expect(configSpy).toHaveBeenCalledWith(false, undefined, fakeProvider);
            expect(component.Programs.map((p) => p.ID)).toEqual(['P1', 'P2']);

            await component.Load(true);
            expect(configSpy).toHaveBeenCalledWith(true, undefined, fakeProvider);
        } finally {
            configSpy.mockRestore();
            programsSpy.mockRestore();
        }
    });
});
