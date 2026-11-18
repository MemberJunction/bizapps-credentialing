import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { NavigationService } from '@memberjunction/ng-shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CredentialingResource, type Standing } from '../../application/area-nav';
import { StandingService } from '../../shared/standing.service';
import { CredentialingAreaResource } from '../credentialing-area-resource';

const APPLICANT_STANDING: Standing = { RoleNames: ['Credentialing Applicant'], StaffOrganizations: [], OrganizationCount: null, SubjectCount: 1 };

class FixedStanding extends StandingService {
    constructor(private readonly standing: Standing) {
        super({ CurrentUser: null, RunViews: async () => [] });
    }
    public override Load(): Promise<Standing> {
        return Promise.resolve(this.standing);
    }
}

/** A resource whose own loading decides the URL names something this user cannot open. */
class RefusingResource extends CredentialingAreaResource {
    protected get DriverClass(): string {
        return CredentialingResource.ApplicantStandards;
    }
    protected override StandingLoader(): StandingService {
        return new FixedStanding(APPLICANT_STANDING);
    }
    protected override async OnOpen(_standing: Standing): Promise<void> {
        this.State = 'NotAvailable';
    }
    public Open(): Promise<void> {
        return this.GuardAndOpen();
    }
    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'Refusing';
    }
    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-lock';
    }
}

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
function injectorFor(): Injector {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    return Injector.create({
        providers: [
            { provide: ChangeDetectorRef, useValue: cdr },
            { provide: NavigationService, useValue: {} },
        ],
    });
}

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

    it('keeps the state its own loading chose (a subject in the URL the user has no contact on) instead of opening a blank page', async () => {
        const resource = runInInjectionContext(injectorFor(), () => new RefusingResource());
        await resource.Open();
        expect(resource.State).toBe('NotAvailable');
    });
});
