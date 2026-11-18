import '@angular/compiler';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { NavigationService } from '@memberjunction/ng-shared';
import type { MySubject } from '@mj-biz-apps/credentialing-core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CredentialingResource } from '../../application/area-nav';
import { SubjectContext } from '../../shared/subject-context.service';
import { ApplicantSubjectResource } from '../applicant-subject-resource';

const OWN: MySubject = { SubjectID: '11111111-1111-1111-1111-111111111111', DisplayName: 'Sample Applicant Two', SubjectType: 'Person', Applications: [] };
const FOREIGN_ID = '22222222-2222-2222-2222-222222222222';

class ProbeApplicantResource extends ApplicantSubjectResource {
    public Resolved: MySubject | null = null;
    protected get DriverClass(): string {
        return CredentialingResource.ApplicantStandards;
    }
    protected override async OnSubjectResolved(subject: MySubject): Promise<void> {
        this.Resolved = subject;
    }
    public Navigate(params: Record<string, string>): void {
        this.OnQueryParamsChanged(params, 'deeplink');
    }
    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'Probe';
    }
    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-circle';
    }
}

function createResource(): ProbeApplicantResource {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const injector = Injector.create({
        providers: [
            { provide: ChangeDetectorRef, useValue: cdr },
            { provide: NavigationService, useValue: {} },
            { provide: SubjectContext, useValue: new SubjectContext() },
        ],
    });
    return runInInjectionContext(injector, () => new ProbeApplicantResource());
}

describe('ApplicantSubjectResource', () => {
    afterEach(() => vi.restoreAllMocks());

    it('shows not-available for a foreign subject in the URL, and opens again when the URL names its own subject', async () => {
        const resource = createResource();
        resource.Subjects = [OWN];
        resource.State = 'Open';

        resource.Navigate({ subjectId: FOREIGN_ID });
        await Promise.resolve();
        expect(resource.State).toBe('NotAvailable');
        expect(resource.Resolved).toBeNull();

        resource.Navigate({ subjectId: OWN.SubjectID });
        await Promise.resolve();
        expect(resource.State).toBe('Open');
        expect(resource.Resolved?.SubjectID).toBe(OWN.SubjectID);
    });
});
