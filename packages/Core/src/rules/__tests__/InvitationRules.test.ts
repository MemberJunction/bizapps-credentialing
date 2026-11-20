import { describe, it, expect } from 'vitest';
import { InvitationRules, type InviteApplicantInput } from '../InvitationRules.js';

const validNewSubject: InviteApplicantInput = {
    ProgramVersionID: 'ver-1',
    Subject: { DisplayName: 'Harbor Transit Authority', PrimaryEmail: 'info@harbor.example' },
    Contact: { Email: 'alex@harbor.example', FirstName: 'Alex', LastName: 'Rivera' },
};

describe('InvitationRules', () => {
    describe('NormalizeEmail', () => {
        it('trims whitespace and lowercases email addresses', () => {
            expect(InvitationRules.NormalizeEmail('  Alex.Rivera@Harbor.EXAMPLE \n')).toBe(
                'alex.rivera@harbor.example'
            );
        });
    });

    describe('Validate', () => {
        it('allows valid invitations for both new and existing subjects', () => {
            expect(InvitationRules.Validate(validNewSubject)).toEqual({ Allowed: true });
            expect(
                InvitationRules.Validate({
                    ProgramVersionID: 'ver-1',
                    Subject: { ExistingSubjectID: 'sub-1' },
                    Contact: { Email: 'alex@harbor.example', FirstName: 'Alex', LastName: 'Rivera' },
                })
            ).toEqual({ Allowed: true });
        });

        it('refuses blank program version or existing subject ID', () => {
            expect(
                InvitationRules.Validate({ ...validNewSubject, ProgramVersionID: '  ' })
            ).toEqual({ Allowed: false, Reason: 'Choose a program version.' });

            expect(
                InvitationRules.Validate({
                    ...validNewSubject,
                    Subject: { ExistingSubjectID: '' },
                })
            ).toEqual({ Allowed: false, Reason: 'Choose a subject.' });
        });

        it('refuses blank or invalid subject fields for a new subject', () => {
            expect(
                InvitationRules.Validate({
                    ...validNewSubject,
                    Subject: { DisplayName: ' ', PrimaryEmail: 'info@harbor.example' },
                })
            ).toEqual({ Allowed: false, Reason: "Enter the subject's name." });

            expect(
                InvitationRules.Validate({
                    ...validNewSubject,
                    Subject: { DisplayName: 'Harbor', PrimaryEmail: '' },
                })
            ).toEqual({ Allowed: false, Reason: "Enter the subject's email address." });

            expect(
                InvitationRules.Validate({
                    ...validNewSubject,
                    Subject: { DisplayName: 'Harbor', PrimaryEmail: 'not-an-email' },
                })
            ).toEqual({ Allowed: false, Reason: 'Enter a valid email address for the subject.' });
        });

        it('refuses blank or invalid contact email and names', () => {
            expect(
                InvitationRules.Validate({
                    ...validNewSubject,
                    Contact: { ...validNewSubject.Contact, Email: '  ' },
                })
            ).toEqual({ Allowed: false, Reason: "Enter the contact's email address." });

            expect(
                InvitationRules.Validate({
                    ...validNewSubject,
                    Contact: { ...validNewSubject.Contact, Email: 'bad@' },
                })
            ).toEqual({ Allowed: false, Reason: 'Enter a valid email address for the contact.' });

            expect(
                InvitationRules.Validate({
                    ...validNewSubject,
                    Contact: { ...validNewSubject.Contact, FirstName: '' },
                })
            ).toEqual({ Allowed: false, Reason: "Enter the contact's first name." });

            expect(
                InvitationRules.Validate({
                    ...validNewSubject,
                    Contact: { ...validNewSubject.Contact, LastName: '  ' },
                })
            ).toEqual({ Allowed: false, Reason: "Enter the contact's last name." });
        });
    });
});
