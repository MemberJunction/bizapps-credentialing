import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import type { RemoteOpResult } from '@memberjunction/core';
import { CreateOrganizationOperation, type CreateOrganizationOutput } from '@mj-biz-apps/credentialing-core';
import { OrganizationSetupComponent } from '../organization-setup.component';

function createComponent(): OrganizationSetupComponent {
    const cdr: ChangeDetectorRef = {
        markForCheck: vi.fn(),
        detach: vi.fn(),
        detectChanges: vi.fn(),
        checkNoChanges: vi.fn(),
        reattach: vi.fn(),
    };
    const injector = Injector.create({ providers: [{ provide: ChangeDetectorRef, useValue: cdr }] });
    return runInInjectionContext(injector, () => new OrganizationSetupComponent());
}

const SUCCESS: RemoteOpResult<CreateOrganizationOutput> = {
    Success: true,
    ResultCode: 'SUCCESS',
    Output: { AccreditingOrganizationID: 'A1', MembershipID: 'M1', StaffUserID: 'U1' },
};

describe('OrganizationSetupComponent', () => {
    afterEach(() => vi.restoreAllMocks());

    it('cannot submit while the name or the email is blank', () => {
        const component = createComponent();
        expect(component.CanSubmit).toBe(false);
        component.OrganizationName = 'Body A';
        expect(component.CanSubmit).toBe(false);
        component.StaffEmail = '   ';
        expect(component.CanSubmit).toBe(false);
        component.StaffEmail = 'first@example.test';
        expect(component.CanSubmit).toBe(true);
        component.OrganizationName = '  ';
        expect(component.CanSubmit).toBe(false);
    });

    it('cannot submit while a call is in flight, so a double click sends one call', async () => {
        let release: (r: RemoteOpResult<CreateOrganizationOutput>) => void = () => undefined;
        const execute = vi
            .spyOn(CreateOrganizationOperation.prototype, 'Execute')
            .mockImplementation(() => new Promise((resolve) => (release = resolve)));
        const component = createComponent();
        component.OrganizationName = 'Body A';
        component.StaffEmail = 'first@example.test';
        const first = component.Submit();
        expect(component.IsSubmitting).toBe(true);
        expect(component.CanSubmit).toBe(false);
        const second = component.Submit();
        release(SUCCESS);
        await Promise.all([first, second]);
        expect(execute).toHaveBeenCalledTimes(1);
        expect(component.CanSubmit).toBe(true);
    });

    it('a failed operation sets ErrorMessage to the operation ErrorMessage and does not emit', async () => {
        const message = 'No user has the email address nobody@example.test. Create the user first, then set up the organization.';
        vi.spyOn(CreateOrganizationOperation.prototype, 'Execute').mockResolvedValue({ Success: false, ResultCode: 'REFUSED', ErrorMessage: message });
        const component = createComponent();
        const emitted = vi.fn();
        component.OrganizationCreated.subscribe(emitted);
        component.OrganizationName = 'Body A';
        component.StaffEmail = 'nobody@example.test';
        await component.Submit();
        expect(component.ErrorMessage).toBe(message);
        expect(component.ErrorField).toBe('Email');
        expect(component.SuccessMessage).toBe('');
        expect(emitted).not.toHaveBeenCalled();
    });

    it('a refusal about the name is placed beside the name field', async () => {
        vi.spyOn(CreateOrganizationOperation.prototype, 'Execute').mockResolvedValue({ Success: false, ResultCode: 'REFUSED', ErrorMessage: "Enter the organization's name." });
        const component = createComponent();
        component.OrganizationName = 'x';
        component.StaffEmail = 'first@example.test';
        await component.Submit();
        expect(component.ErrorField).toBe('Name');
    });

    it('passes the trimmed input and the component provider, then shows the sentence and emits the organization ID', async () => {
        const execute = vi.spyOn(CreateOrganizationOperation.prototype, 'Execute').mockResolvedValue(SUCCESS);
        const component = createComponent();
        const emitted = vi.fn();
        component.OrganizationCreated.subscribe(emitted);
        component.OrganizationName = '  Body A ';
        component.StaffEmail = ' first@example.test ';
        await component.Submit();
        expect(execute).toHaveBeenCalledWith({ Name: 'Body A', FirstStaffEmail: 'first@example.test' }, { provider: component.ProviderToUse });
        expect(component.SuccessMessage).toBe(
            'Body A is set up. first@example.test can now sign in; if they are already signed in, they need to sign out and in again.',
        );
        expect(component.ErrorMessage).toBe('');
        expect(emitted).toHaveBeenCalledWith('A1');
    });

    it('a thrown call is shown as an error and does not emit', async () => {
        vi.spyOn(CreateOrganizationOperation.prototype, 'Execute').mockRejectedValue(new Error('Network down'));
        const component = createComponent();
        const emitted = vi.fn();
        component.OrganizationCreated.subscribe(emitted);
        component.OrganizationName = 'Body A';
        component.StaffEmail = 'first@example.test';
        await component.Submit();
        expect(component.ErrorMessage).toBe('Network down');
        expect(component.IsSubmitting).toBe(false);
        expect(emitted).not.toHaveBeenCalled();
    });
});
