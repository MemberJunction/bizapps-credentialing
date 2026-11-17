import '@angular/compiler';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChangeDetectorRef, Injector, runInInjectionContext } from '@angular/core';
import { CreateCommitteeOperation } from '@mj-biz-apps/credentialing-core';
import { NewCommitteeFormComponent } from '../new-committee-form.component';
import type { CommitteeTypeRow } from '../studio-data';

function createComponent(): NewCommitteeFormComponent {
    const cdr: ChangeDetectorRef = { markForCheck: vi.fn(), detach: vi.fn(), detectChanges: vi.fn(), checkNoChanges: vi.fn(), reattach: vi.fn() };
    const injector = Injector.create({ providers: [{ provide: ChangeDetectorRef, useValue: cdr }] });
    return runInInjectionContext(injector, () => new NewCommitteeFormComponent());
}

const TYPES: CommitteeTypeRow[] = [
    { ID: 'T1', Name: 'Ad Hoc Committee' },
    { ID: 'T2', Name: 'Standing Committee' },
];
const NAME_SENTENCE = "Enter the committee's name.";
const TYPE_SENTENCE = 'Choose a committee type.';
const DUPLICATE_SENTENCE = 'A committee named Standards Committee already exists for this organization.';

/** A form for program P1 with the two types and a name typed in. */
function filled(): NewCommitteeFormComponent {
    const c = createComponent();
    c.ProgramID = 'P1';
    c.CommitteeTypes = TYPES;
    c.Name = 'Standards Committee';
    return c;
}

describe('NewCommitteeFormComponent', () => {
    afterEach(() => vi.restoreAllMocks());

    it('chooses the first committee type until the user picks another, and keeps a pick the list still has', () => {
        const c = createComponent();
        expect(c.CommitteeTypeID).toBe('');
        c.CommitteeTypes = TYPES;
        expect(c.CommitteeTypeID).toBe('T1');
        c.CommitteeTypeID = 'T2';
        c.CommitteeTypes = [...TYPES];
        expect(c.CommitteeTypeID).toBe('T2');
        c.CommitteeTypes = [TYPES[0]];
        expect(c.CommitteeTypeID).toBe('T1');
        expect(NewCommitteeFormComponent.DefaultTypeID([], 'T2')).toBe('');
    });

    it('places each refusal beside the field it concerns, and anything else under the form', () => {
        expect(NewCommitteeFormComponent.FieldFor(NAME_SENTENCE)).toBe('Name');
        expect(NewCommitteeFormComponent.FieldFor(DUPLICATE_SENTENCE)).toBe('Name');
        expect(NewCommitteeFormComponent.FieldFor(TYPE_SENTENCE)).toBe('CommitteeTypeID');
        expect(NewCommitteeFormComponent.FieldFor('Record not found.')).toBe('Form');
        expect(NewCommitteeFormComponent.FieldFor('This change could not be saved. Try again; if it keeps happening, tell your administrator.')).toBe('Form');
    });

    it('refuses a blank name, then a missing type, with the sentences the server gives', () => {
        expect(NewCommitteeFormComponent.LocalRefusal('   ', 'T1')).toBe(NAME_SENTENCE);
        expect(NewCommitteeFormComponent.LocalRefusal('', '')).toBe(NAME_SENTENCE);
        expect(NewCommitteeFormComponent.LocalRefusal('Standards Committee', '')).toBe(TYPE_SENTENCE);
        expect(NewCommitteeFormComponent.LocalRefusal('Standards Committee', 'T1')).toBeNull();
    });

    it('creates the committee for the program with the name as typed and the chosen type, and emits what the server stored', async () => {
        const execute = vi.spyOn(CreateCommitteeOperation.prototype, 'Execute').mockResolvedValue({ Success: true, ResultCode: 'SUCCESS', Output: { CommitteeID: 'C1', Name: 'Standards Committee' } });
        const c = filled();
        c.Name = '  Standards   Committee ';
        c.CommitteeTypeID = 'T2';
        const created = vi.fn();
        c.Created.subscribe(created);
        await c.Submit();
        expect(execute).toHaveBeenCalledTimes(1);
        expect(execute.mock.calls[0][0]).toEqual({ ProgramID: 'P1', Name: '  Standards   Committee ', CommitteeTypeID: 'T2' });
        expect(execute.mock.calls[0][1]).toEqual({ provider: c.ProviderToUse });
        expect(created).toHaveBeenCalledWith({ CommitteeID: 'C1', Name: 'Standards Committee' });
        expect(c.ErrorMessage).toBe('');
        expect(c.IsSubmitting).toBe(false);
    });

    it('shows a blank name beside the name without calling the server', async () => {
        const execute = vi.spyOn(CreateCommitteeOperation.prototype, 'Execute');
        const c = filled();
        c.Name = '  ';
        await c.Submit();
        expect(execute).not.toHaveBeenCalled();
        expect(c.ErrorFor('Name')).toBe(NAME_SENTENCE);
        expect(c.ErrorFor('CommitteeTypeID')).toBe('');
        expect(c.ErrorFor('Form')).toBe('');
    });

    it('shows a missing type beside the type without calling the server', async () => {
        const execute = vi.spyOn(CreateCommitteeOperation.prototype, 'Execute');
        const c = filled();
        c.CommitteeTypes = [];
        await c.Submit();
        expect(execute).not.toHaveBeenCalled();
        expect(c.ErrorFor('CommitteeTypeID')).toBe(TYPE_SENTENCE);
    });

    it('a refusal leaves the form open with the sentence beside its field, and emits nothing', async () => {
        const c = filled();
        const created = vi.fn();
        c.Created.subscribe(created);
        const refusals: Array<[string, 'Name' | 'CommitteeTypeID' | 'Form']> = [
            [DUPLICATE_SENTENCE, 'Name'],
            [NAME_SENTENCE, 'Name'],
            [TYPE_SENTENCE, 'CommitteeTypeID'],
            ['Record not found.', 'Form'],
        ];
        for (const [message, field] of refusals) {
            vi.spyOn(CreateCommitteeOperation.prototype, 'Execute').mockResolvedValue({ Success: false, ResultCode: 'REFUSED', ErrorMessage: message });
            await c.Submit();
            expect(c.ErrorFor(field)).toBe(message);
            expect(c.ErrorField).toBe(field);
        }
        expect(created).not.toHaveBeenCalled();
        expect(c.IsSubmitting).toBe(false);
    });

    it('clears the previous refusal when the next attempt succeeds', async () => {
        const execute = vi.spyOn(CreateCommitteeOperation.prototype, 'Execute');
        execute.mockResolvedValueOnce({ Success: false, ResultCode: 'REFUSED', ErrorMessage: DUPLICATE_SENTENCE });
        execute.mockResolvedValueOnce({ Success: true, ResultCode: 'SUCCESS', Output: { CommitteeID: 'C1', Name: 'Standards Review' } });
        const c = filled();
        await c.Submit();
        expect(c.ErrorFor('Name')).toBe(DUPLICATE_SENTENCE);
        c.Name = 'Standards Review';
        await c.Submit();
        expect(c.ErrorMessage).toBe('');
        expect(c.ErrorField).toBeNull();
    });

    it('never shows database text: a raw failure, returned or thrown, becomes a plain sentence under the form', async () => {
        const plain = 'This change could not be saved. Try again; if it keeps happening, tell your administrator.';
        const raw = "Error executing SQL Error: The INSERT statement conflicted with the FOREIGN KEY constraint 'FK_Committee_Type'. Query: DECLARE @ID UNIQUEIDENTIFIER";
        const c = filled();
        vi.spyOn(CreateCommitteeOperation.prototype, 'Execute').mockResolvedValue({ Success: false, ResultCode: 'EXECUTION_ERROR', ErrorMessage: raw });
        await c.Submit();
        expect(c.ErrorFor('Form')).toBe(plain);
        vi.spyOn(CreateCommitteeOperation.prototype, 'Execute').mockRejectedValue(new Error(raw));
        await c.Submit();
        expect(c.ErrorFor('Form')).toBe(plain);
        expect(c.IsSubmitting).toBe(false);
    });

    it('a failure with no message says the committee was not created', async () => {
        vi.spyOn(CreateCommitteeOperation.prototype, 'Execute').mockResolvedValue({ Success: false, ResultCode: 'FORBIDDEN', ErrorMessage: '' });
        const c = filled();
        await c.Submit();
        expect(c.ErrorFor('Form')).toBe('The committee was not created.');
    });

    it('does not send a second call while one is in flight, and does nothing without a program', async () => {
        let finish: (value: { Success: boolean; ResultCode: string; Output: { CommitteeID: string; Name: string } }) => void = () => {};
        const execute = vi.spyOn(CreateCommitteeOperation.prototype, 'Execute').mockReturnValue(new Promise((resolve) => (finish = resolve)));
        const c = filled();
        const first = c.Submit();
        expect(c.IsSubmitting).toBe(true);
        await c.Submit();
        expect(execute).toHaveBeenCalledTimes(1);
        finish({ Success: true, ResultCode: 'SUCCESS', Output: { CommitteeID: 'C1', Name: 'Standards Committee' } });
        await first;
        expect(c.IsSubmitting).toBe(false);

        const noProgram = filled();
        noProgram.ProgramID = null;
        await noProgram.Submit();
        expect(execute).toHaveBeenCalledTimes(1);
    });

    it('Cancel emits Cancelled and calls nothing', () => {
        const execute = vi.spyOn(CreateCommitteeOperation.prototype, 'Execute');
        const c = filled();
        const cancelled = vi.fn();
        c.Cancelled.subscribe(cancelled);
        c.Cancel();
        expect(cancelled).toHaveBeenCalledTimes(1);
        expect(execute).not.toHaveBeenCalled();
    });
});
