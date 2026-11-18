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
        const message = 'A program named Field Technician already exists in this organization.';
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

    it('never shows database text: a raw failure becomes a plain sentence on the form', async () => {
        const raw = "Error executing SQL Error: Violation of UNIQUE KEY constraint 'UQ_Program_AccreditingOrganizationID_CredentialPrefix'. Query: DECLARE @ID UNIQUEIDENTIFIER";
        vi.spyOn(CreateProgramOperation.prototype, 'Execute').mockResolvedValue({ Success: false, ResultCode: 'ERROR', ErrorMessage: raw });
        const c = createComponent();
        c.Organizations = [ORG_A];
        fill(c);
        await c.Submit();
        expect(c.ErrorFor('Form')).toBe('This change could not be saved. Try again; if it keeps happening, tell your administrator.');
    });

    it('places each required-text refusal beside its field', () => {
        expect(ProgramWizardComponent.FieldFor("Enter the program's name.")).toBe('Name');
        expect(ProgramWizardComponent.FieldFor('Enter the credential prefix.')).toBe('CredentialPrefix');
        expect(ProgramWizardComponent.FieldFor('Enter the subject noun.')).toBe('SubjectNoun');
    });

    it('places refusals by the field they name', () => {
        expect(ProgramWizardComponent.FieldFor("Violation of UNIQUE KEY constraint 'UQ_Program_AccreditingOrganizationID_CredentialPrefix'.")).toBe('CredentialPrefix');
        expect(ProgramWizardComponent.FieldFor('Enter a label for this version.')).toBe('FirstVersionLabel');
        expect(ProgramWizardComponent.FieldFor('A program named Field Technician already exists in this organization.')).toBe('Name');
        expect(ProgramWizardComponent.FieldFor('Credential prefix SFT is already used in this organization.')).toBe('CredentialPrefix');
        expect(ProgramWizardComponent.FieldFor('Record not found.')).toBe('Form');
    });
});
