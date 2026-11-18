import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { NavigationService } from '@memberjunction/ng-shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CredentialingAreaResource } from '../credentialing-area-resource';

class ProbeResource extends CredentialingAreaResource {
    protected get DriverClass(): string {
        return 'ProbeResource';
    }
    public Reattach(): void {
        this.OnReattached();
    }
    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'Probe';
    }
    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-circle';
    }
}

/** Constructs the resource without running Explorer's init (`OnReattached` is what the shell's reattach calls). */
function createResource(): { resource: ProbeResource } {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const injector = Injector.create({
        providers: [
            { provide: ChangeDetectorRef, useValue: cdr },
            { provide: NavigationService, useValue: {} },
        ],
    });
    return { resource: runInInjectionContext(injector, () => new ProbeResource()) };
}

describe('CredentialingAreaResource', () => {
    afterEach(() => vi.restoreAllMocks());

    it('bumps RefreshKey when Explorer reattaches an open resource, and not before it is open', () => {
        const { resource } = createResource();
        expect(resource.RefreshKey).toBe(0);

        resource.Reattach();
        expect(resource.RefreshKey).toBe(0);

        resource.State = 'Open';
        resource.Reattach();
        resource.Reattach();
        expect(resource.RefreshKey).toBe(2);
    });
});
