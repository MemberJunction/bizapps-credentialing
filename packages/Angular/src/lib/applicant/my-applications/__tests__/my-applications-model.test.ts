import { describe, expect, it } from 'vitest';
import type { MySubject } from '@mj-biz-apps/credentialing-core';
import {
    FormatApplicationAction,
    FormatApplicationProgress,
    NO_APPLICATIONS_MESSAGE,
    NO_SUBJECT_MESSAGE,
    PICKER_HEADING,
    ResolveApplicantView,
} from '../my-applications-model';

const S1: MySubject = {
    SubjectID: '11111111-1111-1111-1111-111111111111',
    DisplayName: 'Sample Applicant One',
    SubjectType: 'Person',
    Applications: [],
};

const S2: MySubject = {
    SubjectID: '22222222-2222-2222-2222-222222222222',
    DisplayName: 'Sample Applicant Two',
    SubjectType: 'Person',
    Applications: [],
};

const FOREIGN = '99999999-9999-9999-9999-999999999999';

describe('ResolveApplicantView', () => {
    it('returns NotAvailable when the URL carries a subjectId the user has no contact row on', () => {
        expect(ResolveApplicantView({ subjectId: FOREIGN }, [S1], null)).toEqual({ Kind: 'NotAvailable' });
        expect(ResolveApplicantView({ subjectId: S1.SubjectID }, [], null)).toEqual({ Kind: 'NotAvailable' });
        expect(ResolveApplicantView({ subjectId: 'not-a-uuid' }, [S1, S2], S1.SubjectID)).toEqual({ Kind: 'NotAvailable' });
    });

    it('returns NoSubjects when the caller has zero subjects and no denied URL param', () => {
        expect(ResolveApplicantView({}, [], null)).toEqual({ Kind: 'NoSubjects' });
        expect(NO_SUBJECT_MESSAGE).toBe("Your account is not linked to an applicant record. Ask the program's staff to invite you.");
        expect(NO_APPLICATIONS_MESSAGE).toBe('You have no applications yet.');
        expect(PICKER_HEADING).toBe('Choose who you are working for');
    });

    it('never shows the picker when the user has a single subject and syncs subjectId to URL', () => {
        expect(ResolveApplicantView({}, [S1], null)).toEqual({
            Kind: 'Applications',
            Subject: S1,
            NeedsUrlSync: true,
            CanSwitch: false,
        });
        expect(ResolveApplicantView({ subjectId: S1.SubjectID }, [S1], S1.SubjectID)).toEqual({
            Kind: 'Applications',
            Subject: S1,
            NeedsUrlSync: false,
            CanSwitch: false,
        });
    });

    it('lands on PickSubject when the user has multiple subjects and none is selected', () => {
        expect(ResolveApplicantView({}, [S1, S2], null)).toEqual({
            Kind: 'PickSubject',
            Subjects: [S1, S2],
        });
    });

    it('opens the URL-named subject when multiple subjects exist, surviving reload and deep links', () => {
        expect(ResolveApplicantView({ subjectId: S2.SubjectID.toLowerCase() }, [S1, S2], null)).toEqual({
            Kind: 'Applications',
            Subject: S2,
            NeedsUrlSync: false,
            CanSwitch: true,
        });
    });

    it('carries the SubjectContext selection when returning to a tab without subjectId in params', () => {
        expect(ResolveApplicantView({}, [S1, S2], S2.SubjectID)).toEqual({
            Kind: 'Applications',
            Subject: S2,
            NeedsUrlSync: true,
            CanSwitch: true,
        });
    });
});

describe('application display helpers', () => {
    it('shows Continue for Draft and View for submitted statuses', () => {
        expect(FormatApplicationAction('Draft')).toBe('Continue');
        expect(FormatApplicationAction('Submitted')).toBe('View');
        expect(FormatApplicationAction('In Review')).toBe('View');
        expect(FormatApplicationAction('Decided')).toBe('View');
        expect(FormatApplicationAction('Withdrawn')).toBe('View');
    });

    it('formats confirmed progress count', () => {
        expect(FormatApplicationProgress({ ConfirmedCount: 2, StandardCount: 5 })).toBe('2 of 5 confirmed');
        expect(FormatApplicationProgress({ ConfirmedCount: 0, StandardCount: 3 })).toBe('0 of 3 confirmed');
    });
});
