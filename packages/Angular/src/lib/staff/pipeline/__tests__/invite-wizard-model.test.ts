import { describe, expect, it } from 'vitest';
import { INVITATION_FAILED_NOTE } from '@mj-biz-apps/credentialing-core';
import { EligibleSubjectsForTarget, FormatInvitationOutcome, InviteWizardModel } from '../invite-wizard-model';
import type { PipelineActiveTarget, PipelineSubjectOption } from '../pipeline-data';

const TARGET: PipelineActiveTarget = {
    VersionID: 'E1111111-1111-1111-1111-111111111111',
    VersionLabel: '2026',
    ProgramID: 'F1111111-1111-1111-1111-111111111111',
    ProgramName: 'Sample Applicant Program',
    ProgramType: 'Recognition',
    SubjectType: 'Organization',
    AccreditingOrganizationID: 'A1111111-1111-1111-1111-111111111111',
    AccreditingOrganizationName: 'Sample Accrediting Body A',
};

describe('InviteWizardModel', () => {
    it('validates each step before allowing progression and builds trimmed input', () => {
        const model = new InviteWizardModel();
        expect(model.StepValid('Version')).toBe(false);
        expect(model.StepValid('Subject')).toBe(false);
        expect(model.StepValid('Contact')).toBe(false);

        model.VersionID = TARGET.VersionID;
        expect(model.StepValid('Version')).toBe(true);

        model.SubjectMode = 'new';
        model.NewSubjectDisplayName = 'Sample Applicant Three';
        model.NewSubjectPrimaryEmail = 'invalid-email';
        expect(model.StepValid('Subject')).toBe(false);
        model.NewSubjectPrimaryEmail = 'applicant.three@example.test';
        expect(model.StepValid('Subject')).toBe(true);

        model.ContactFirstName = 'Alex';
        model.ContactLastName = 'Applicant';
        model.ContactEmail = '  Applicant.Three@example.test ';
        expect(model.StepValid('Contact')).toBe(true);
        expect(model.StepValid('Review')).toBe(true);

        expect(model.BuildInput()).toEqual({
            ProgramVersionID: TARGET.VersionID,
            Subject: {
                DisplayName: 'Sample Applicant Three',
                PrimaryEmail: 'applicant.three@example.test',
            },
            Contact: {
                Email: 'Applicant.Three@example.test',
                FirstName: 'Alex',
                LastName: 'Applicant',
            },
        });
    });

    it('supports choosing an existing subject', () => {
        const model = new InviteWizardModel();
        model.VersionID = TARGET.VersionID;
        model.SubjectMode = 'existing';
        expect(model.StepValid('Subject')).toBe(false);

        model.ExistingSubjectID = 'B1111111-1111-1111-1111-111111111111';
        model.ContactFirstName = 'Chris';
        model.ContactLastName = 'Contact';
        model.ContactEmail = 'chris@example.test';
        expect(model.BuildInput().Subject).toEqual({
            ExistingSubjectID: 'B1111111-1111-1111-1111-111111111111',
        });
    });

    it('filters eligible subjects by owning organization and SubjectType', () => {
        const subjects: PipelineSubjectOption[] = [
            { ID: '1', DisplayName: 'Matching Org', PrimaryEmail: 'a@x.test', SubjectType: 'Organization', AccreditingOrganizationID: TARGET.AccreditingOrganizationID.toLowerCase(), Status: 'Active' },
            { ID: '2', DisplayName: 'Person Subject', PrimaryEmail: 'b@x.test', SubjectType: 'Person', AccreditingOrganizationID: TARGET.AccreditingOrganizationID, Status: 'Active' },
            { ID: '3', DisplayName: 'Other Org', PrimaryEmail: 'c@x.test', SubjectType: 'Organization', AccreditingOrganizationID: 'A2222222-2222-2222-2222-222222222222', Status: 'Active' },
        ];
        expect(EligibleSubjectsForTarget(subjects, TARGET).map((s) => s.ID)).toEqual(['1']);
    });
});

describe('FormatInvitationOutcome', () => {
    it('formats the sent sentence when EmailSent is true', () => {
        const out = FormatInvitationOutcome('Applicant.Three@example.test', {
            EmailSent: true,
            InvitationUrl: 'http://localhost:4050/magic-link/redeem?token=abc',
            ExpiresAt: '2026-11-20T12:00:00.000Z',
            InvitationNote: null,
        });
        expect(out.PrimaryMessage).toBe('Invitation emailed to applicant.three@example.test.');
        expect(out.InvitationUrl).toBe('http://localhost:4050/magic-link/redeem?token=abc');
    });

    it('formats the manual copy sentence when EmailSent is false and a URL was created', () => {
        const out = FormatInvitationOutcome('applicant.three@example.test', {
            EmailSent: false,
            InvitationUrl: 'http://localhost:4050/magic-link/redeem?token=abc',
            ExpiresAt: '2026-11-20T12:00:00.000Z',
            InvitationNote: null,
        });
        expect(out.PrimaryMessage).toMatch(/^No email was sent from this server\. Copy this link and send it to applicant\.three@example\.test\. It works once and expires on /);
        expect(out.InvitationUrl).toBe('http://localhost:4050/magic-link/redeem?token=abc');
    });

    it('falls back to InvitationNote when link issuance failed', () => {
        const out = FormatInvitationOutcome('applicant.three@example.test', {
            EmailSent: false,
            InvitationUrl: null,
            ExpiresAt: null,
            InvitationNote: INVITATION_FAILED_NOTE,
        });
        expect(out.PrimaryMessage).toBe(INVITATION_FAILED_NOTE);
        expect(out.InvitationUrl).toBeNull();
        expect(out.Note).toBe(INVITATION_FAILED_NOTE);
    });
});
