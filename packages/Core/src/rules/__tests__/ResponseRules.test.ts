import { describe, it, expect } from 'vitest';
import { ResponseRules, type ResponseState } from '../ResponseRules.js';

const draftResponse: ResponseState = {
    Status: 'Drafted',
    AuthorType: 'Human',
    ResponseText: 'We maintain a written policy approved annually.',
    SelfAssessment: 'Met',
};

const submittedAt = new Date('2026-11-17T12:00:00Z');
const expectedSubmittedLock =
    'This application was submitted on Nov 17, 2026. Its answers and documents are locked.';

describe('ResponseRules', () => {
    describe('CanEdit', () => {
        it('allows editing an unconfirmed response on a Draft application', () => {
            expect(ResponseRules.CanEdit('Draft', draftResponse, null)).toEqual({ Allowed: true });
        });

        it('Review Focus 2: refuses editing after submission with the locked sentence naming the submission date', () => {
            expect(ResponseRules.CanEdit('Submitted', draftResponse, submittedAt)).toEqual({
                Allowed: false,
                Reason: expectedSubmittedLock,
            });
        });

        it('refuses editing on a non-Draft application without a submission date using the status sentence', () => {
            expect(ResponseRules.CanEdit('Withdrawn', draftResponse, null)).toEqual({
                Allowed: false,
                Reason: 'This application is Withdrawn. Its answers are locked.',
            });
        });

        it('refuses editing a Confirmed response on a Draft application', () => {
            expect(
                ResponseRules.CanEdit('Draft', { ...draftResponse, Status: 'Confirmed' }, null)
            ).toEqual({
                Allowed: false,
                Reason: 'This answer is confirmed. Ask the program\'s staff to reopen it if it must change.',
            });
        });
    });

    describe('AfterSave', () => {
        it('yields Drafted and Human when text is provided, including from a Prefilled answer', () => {
            const prefilled: ResponseState = {
                Status: 'Prefilled',
                AuthorType: 'Agent',
                ResponseText: 'Drafted from bylaws.',
                SelfAssessment: null,
            };
            expect(ResponseRules.AfterSave(prefilled, 'Edited by applicant.', 'Met')).toEqual({
                Status: 'Drafted',
                AuthorType: 'Human',
                ResponseText: 'Edited by applicant.',
                SelfAssessment: 'Met',
            });
        });

        it('yields Drafted and Human when only self-assessment is set', () => {
            expect(ResponseRules.AfterSave(draftResponse, '   ', 'Partially Met')).toEqual({
                Status: 'Drafted',
                AuthorType: 'Human',
                ResponseText: null,
                SelfAssessment: 'Partially Met',
            });
        });

        it('yields Empty and Human when both text and self-assessment are blank', () => {
            expect(ResponseRules.AfterSave(draftResponse, '   ', null)).toEqual({
                Status: 'Empty',
                AuthorType: 'Human',
                ResponseText: null,
                SelfAssessment: null,
            });
            expect(ResponseRules.AfterSave(draftResponse, null, null)).toEqual({
                Status: 'Empty',
                AuthorType: 'Human',
                ResponseText: null,
                SelfAssessment: null,
            });
        });
    });

    describe('CanConfirm', () => {
        it('Review Focus 2: refuses confirming after submission with the locked sentence', () => {
            expect(
                ResponseRules.CanConfirm(
                    'In Review',
                    draftResponse,
                    { ResponseType: 'Narrative', IntakeMode: 'Manual' },
                    0,
                    submittedAt
                )
            ).toEqual({
                Allowed: false,
                Reason: expectedSubmittedLock,
            });
        });

        it('refuses confirming an already Confirmed response', () => {
            expect(
                ResponseRules.CanConfirm(
                    'Draft',
                    { ...draftResponse, Status: 'Confirmed' },
                    { ResponseType: 'Narrative', IntakeMode: 'Manual' },
                    0,
                    null
                )
            ).toEqual({
                Allowed: false,
                Reason: 'This answer is confirmed. Ask the program\'s staff to reopen it if it must change.',
            });
        });

        it.each(['Narrative', 'Composite'] as const)(
            'refuses confirming %s with blank text',
            (responseType) => {
                expect(
                    ResponseRules.CanConfirm(
                        'Draft',
                        { ...draftResponse, ResponseText: '  ' },
                        { ResponseType: responseType, IntakeMode: 'Manual' },
                        2,
                        null
                    )
                ).toEqual({
                    Allowed: false,
                    Reason: 'Write an answer before confirming.',
                });
            }
        );

        it('refuses confirming an Evidence standard with no citations and blank text', () => {
            expect(
                ResponseRules.CanConfirm(
                    'Draft',
                    { ...draftResponse, ResponseText: null },
                    { ResponseType: 'Evidence', IntakeMode: 'Locate' },
                    0,
                    null
                )
            ).toEqual({
                Allowed: false,
                Reason: 'Point to a document or write an answer before confirming.',
            });
        });

        it('allows confirming an Evidence standard with a citation and no text when self-assessed', () => {
            expect(
                ResponseRules.CanConfirm(
                    'Draft',
                    { ...draftResponse, ResponseText: null, SelfAssessment: 'Met' },
                    { ResponseType: 'Evidence', IntakeMode: 'Locate' },
                    1,
                    null
                )
            ).toEqual({ Allowed: true });
        });

        it('refuses confirming with no self-assessment', () => {
            expect(
                ResponseRules.CanConfirm(
                    'Draft',
                    { ...draftResponse, SelfAssessment: null },
                    { ResponseType: 'Narrative', IntakeMode: 'Manual' },
                    0,
                    null
                )
            ).toEqual({
                Allowed: false,
                Reason: 'Choose Met, Partially met or Not met before confirming.',
            });
            expect(
                ResponseRules.CanConfirm(
                    'Draft',
                    { Status: 'Empty', AuthorType: 'Human', ResponseText: null, SelfAssessment: null },
                    { ResponseType: 'Attestation', IntakeMode: 'Manual' },
                    0,
                    null
                )
            ).toEqual({
                Allowed: false,
                Reason: 'Choose Met, Partially met or Not met before confirming.',
            });
        });

        it('allows confirming a Narrative standard with text and self-assessment', () => {
            expect(
                ResponseRules.CanConfirm(
                    'Draft',
                    draftResponse,
                    { ResponseType: 'Narrative', IntakeMode: 'Prefill' },
                    0,
                    null
                )
            ).toEqual({ Allowed: true });
        });
    });

    describe('CanReopen', () => {
        const confirmed: ResponseState = { ...draftResponse, Status: 'Confirmed' };

        it('allows reopening a Confirmed response on Draft or Info Requested with a reason', () => {
            expect(ResponseRules.CanReopen('Draft', confirmed, 'Applicant asked to update')).toEqual({
                Allowed: true,
            });
            expect(
                ResponseRules.CanReopen('Info Requested', confirmed, 'Clarification needed')
            ).toEqual({ Allowed: true });
        });

        it('refuses reopening when application is not Draft or Info Requested', () => {
            expect(ResponseRules.CanReopen('Submitted', confirmed, 'Update')).toEqual({
                Allowed: false,
                Reason: 'Answers can be reopened only while an application is Draft or Info Requested.',
            });
        });

        it('refuses reopening an unconfirmed response', () => {
            expect(ResponseRules.CanReopen('Draft', draftResponse, 'Update')).toEqual({
                Allowed: false,
                Reason: 'Only a confirmed answer can be reopened.',
            });
        });

        it('refuses reopening without a reason', () => {
            expect(ResponseRules.CanReopen('Draft', confirmed, '   ')).toEqual({
                Allowed: false,
                Reason: 'Give the reason for reopening this answer.',
            });
        });
    });
});
