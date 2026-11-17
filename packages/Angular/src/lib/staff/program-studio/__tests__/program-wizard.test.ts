import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { CreateProgramOperation } from '@mj-biz-apps/credentialing-core';
import { ProgramWizardComponent } from '../program-wizard.component';

function createComponent(): ProgramWizardComponent {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const injector = Injector.create({ providers: [{ provide: ChangeDetectorRef, useValue: cdr }] });
    return runInInjectionContext(injector, () => new ProgramWizardComponent());
}

const ORG_A = { ID: 'A1', Name: 'Body A' };
const ORG_B = { ID: 'B1', Name: 'Body B' };

function fill(c: ProgramWizardComponent): void {
    c.Name = ' Field Technician ';
    c.ProgramType = 'Certification';
    c.SubjectType = 'Person';
    c.SubjectNoun = 'technician';
    c.CredentialPrefix = 'SFT';
    c.FirstVersionLabel = '2027';
}

describe('ProgramWizardComponent', () => {
    afterEach(() => vi.restoreAllMocks());

    it('with one organization shows no organization control and creates the program in it', async () => {
        const execute = vi.spyOn(CreateProgramOperation.prototype, 'Execute').mockResolvedValue({ Success: true, ResultCode: 'SUCCESS', Output: { ProgramID: 'P1', VersionID: 'V1' } });
        const c = createComponent();
        c.Organizations = [ORG_A];
        expect(c.ShowOrganization).toBe(false);
        const emitted = vi.fn();
        c.ProgramCreated.subscribe(emitted);
        fill(c);
        await c.Submit();
        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute.mock.calls[0][0]).toEqual({
            AccreditingOrganizationID: 'A1', Name: 'Field Technician', ProgramType: 'Certification', SubjectType: 'Person',
            SubjectNoun: 'technician', CredentialPrefix: 'SFT', Description: null, FirstVersionLabel: '2027',
        });
        expect(execute.mock.calls[0][1]).toEqual({ provider: c.ProviderToUse });
        expect(emitted).toHaveBeenCalledWith({ ProgramID: 'P1', VersionID: 'V1' });
    });

    it('with several organizations requires one to be chosen first', () => {
        const c = createComponent();
        c.Organizations = [ORG_A, ORG_B];
        expect(c.ShowOrganization).toBe(true);
        fill(c);
        expect(c.CanSubmit).toBe(false);
        c.OrganizationID = 'B1';
        expect(c.CanSubmit).toBe(true);
    });

    it('a refusal leaves the wizard open with the sentence beside the field it names, and emits nothing', async () => {
        const message = "Violation of UNIQUE KEY constraint 'UQ_Program_AccreditingOrganizationID_Name'. Cannot insert duplicate key.";
        vi.spyOn(CreateProgramOperation.prototype, 'Execute').mockResolvedValue({ Success: false, ResultCode: 'REFUSED', ErrorMessage: message });
        const c = createComponent();
        c.Organizations = [ORG_A];
        const emitted = vi.fn();
        c.ProgramCreated.subscribe(emitted);
        fill(c);
        await c.Submit();
        expect(c.ErrorMessage).toBe(message);
        expect(c.ErrorFor('Name')).toBe(message);
        expect(c.IsSubmitting).toBe(false);
        expect(emitted).not.toHaveBeenCalled();
    });

    it('places refusals by the field they name', () => {
        expect(ProgramWizardComponent.FieldFor("Violation of UNIQUE KEY constraint 'UQ_Program_AccreditingOrganizationID_CredentialPrefix'.")).toBe('CredentialPrefix');
        expect(ProgramWizardComponent.FieldFor('Enter a label for this version.')).toBe('FirstVersionLabel');
        expect(ProgramWizardComponent.FieldFor('Record not found.')).toBe('Form');
    });
});
