import { describe, it, expect } from 'vitest';
import { SubmissionGate, type GateInput } from '../SubmissionGate.js';

const today = new Date('2026-11-17T12:00:00Z');

describe('SubmissionGate', () => {
    describe('Evaluate', () => {
        it('lists eligibility items first, then sections, then required documents, then attestation', () => {
            const input: GateInput = {
                Version: { RequiresGoverningBodyAttestation: true },
                Sections: [
                    {
                        SectionID: 'sec-1',
                        Number: '1',
                        Name: 'Governance',
                        Standards: [
                            { StandardID: 'std-1', Code: '1.1', IsEligibility: false, Confirmed: true },
                            { StandardID: 'std-2', Code: '1.2', IsEligibility: true, Confirmed: false },
                        ],
                    },
                    {
                        SectionID: 'sec-2',
                        Number: '2',
                        Name: 'Finance',
                        Standards: [
                            { StandardID: 'std-3', Code: '2.1', IsEligibility: false, Confirmed: false },
                        ],
                    },
                ],
                Requirements: [
                    {
                        RequirementID: 'req-1',
                        Name: 'Bylaws',
                        IsRequired: true,
                        SensitivityPolicy: 'Normal',
                        HasCurrentDocument: true,
                        HasCurrentAttestation: false,
                    },
                    {
                        RequirementID: 'req-2',
                        Name: 'Claims Manual',
                        IsRequired: true,
                        SensitivityPolicy: 'Restricted Allowed',
                        HasCurrentDocument: false,
                        HasCurrentAttestation: true,
                    },
                    {
                        RequirementID: 'req-3',
                        Name: 'Audit Report',
                        IsRequired: true,
                        SensitivityPolicy: 'Normal',
                        HasCurrentDocument: false,
                        HasCurrentAttestation: true,
                    },
                    {
                        RequirementID: 'req-4',
                        Name: 'Optional Brochure',
                        IsRequired: false,
                        SensitivityPolicy: 'Normal',
                        HasCurrentDocument: false,
                        HasCurrentAttestation: false,
                    },
                ],
                Attestation: null,
            };

            const result = SubmissionGate.Evaluate(input, today);

            expect(result.Items.map((i) => i.Kind)).toEqual([
                'Eligibility',
                'Section',
                'Section',
                'Document',
                'Document',
                'Document',
                'Attestation',
            ]);

            expect(result.Items[0]).toMatchObject({
                Kind: 'Eligibility',
                Passed: false,
                Target: { Screen: 'Standards', SectionID: 'sec-1', StandardID: 'std-2' },
            });
            expect(result.Items[1]).toMatchObject({
                Kind: 'Section',
                Passed: false,
                Detail: '1 of 2 confirmed',
                Target: { Screen: 'Standards', SectionID: 'sec-1' },
            });
            expect(result.Items[2]).toMatchObject({
                Kind: 'Section',
                Passed: false,
                Detail: '0 of 1 confirmed',
                Target: { Screen: 'Standards', SectionID: 'sec-2' },
            });
            expect(result.Items[3]).toMatchObject({
                Kind: 'Document',
                Label: 'Bylaws',
                Passed: true,
            });
            expect(result.Items[4]).toMatchObject({
                Kind: 'Document',
                Label: 'Claims Manual',
                Passed: true,
            });
            expect(result.Items[5]).toMatchObject({
                Kind: 'Document',
                Label: 'Audit Report',
                Passed: false,
                Target: { Screen: 'Documents', RequirementID: 'req-3' },
            });
            expect(result.Items[6]).toMatchObject({
                Kind: 'Attestation',
                Passed: false,
                Target: { Screen: 'Submit' },
            });

            expect(result.CanSubmit).toBe(false);
            expect(result.Gaps).toHaveLength(5);
            expect(result.Reason).toBe('5 items still need attention before you can submit.');
        });

        it('counts the gaps in a grammatical sentence, one item or several', () => {
            expect(SubmissionGate.GapsSentence(1)).toBe('1 item still needs attention before you can submit.');
            expect(SubmissionGate.GapsSentence(2)).toBe('2 items still need attention before you can submit.');
        });

        it('passes when all sections, required documents, and optional attestation are satisfied', () => {
            const result = SubmissionGate.Evaluate(
                {
                    Version: { RequiresGoverningBodyAttestation: false },
                    Sections: [
                        {
                            SectionID: 'sec-1',
                            Number: '1',
                            Name: 'Governance',
                            Standards: [
                                { StandardID: 'std-1', Code: '1.1', IsEligibility: true, Confirmed: true },
                            ],
                        },
                    ],
                    Requirements: [
                        {
                            RequirementID: 'req-1',
                            Name: 'Bylaws',
                            IsRequired: true,
                            SensitivityPolicy: 'Normal',
                            HasCurrentDocument: true,
                            HasCurrentAttestation: false,
                        },
                    ],
                    Attestation: null,
                },
                today
            );

            expect(result.CanSubmit).toBe(true);
            expect(result.Gaps).toEqual([]);
            expect(result.Reason).toBeNull();
        });
    });

    describe('ValidateAttestation', () => {
        const expectedReason =
            "Give the attesting officer's name and role, or the date the governing body approved.";

        it('allows null attestation when not required', () => {
            expect(SubmissionGate.ValidateAttestation(null, false, today)).toEqual({ Allowed: true });
        });

        it('refuses null attestation when required', () => {
            expect(SubmissionGate.ValidateAttestation(null, true, today)).toEqual({
                Allowed: false,
                Reason: expectedReason,
            });
        });

        it('allows officer name and role with accepted statement', () => {
            expect(
                SubmissionGate.ValidateAttestation(
                    { OfficerName: 'Pat Lee', OfficerRole: 'Board Chair', ApprovalDate: null, Accepted: true },
                    true,
                    today
                )
            ).toEqual({ Allowed: true });
        });

        it('allows a past or today approval date with accepted statement', () => {
            expect(
                SubmissionGate.ValidateAttestation(
                    { OfficerName: null, OfficerRole: null, ApprovalDate: '2026-11-17', Accepted: true },
                    true,
                    today
                )
            ).toEqual({ Allowed: true });
            expect(
                SubmissionGate.ValidateAttestation(
                    { OfficerName: null, OfficerRole: null, ApprovalDate: '2026-11-01', Accepted: true },
                    true,
                    today
                )
            ).toEqual({ Allowed: true });
        });

        it('refuses when only officer name is given without role or date', () => {
            expect(
                SubmissionGate.ValidateAttestation(
                    { OfficerName: 'Pat Lee', OfficerRole: ' ', ApprovalDate: null, Accepted: true },
                    true,
                    today
                )
            ).toEqual({ Allowed: false, Reason: expectedReason });
        });

        it('refuses a future approval date', () => {
            expect(
                SubmissionGate.ValidateAttestation(
                    { OfficerName: null, OfficerRole: null, ApprovalDate: '2026-11-18', Accepted: true },
                    true,
                    today
                )
            ).toEqual({ Allowed: false, Reason: expectedReason });
        });

        it('refuses when statement is not accepted', () => {
            expect(
                SubmissionGate.ValidateAttestation(
                    { OfficerName: 'Pat Lee', OfficerRole: 'Board Chair', ApprovalDate: null, Accepted: false },
                    true,
                    today
                )
            ).toEqual({
                Allowed: false,
                Reason: 'Confirm the attestation statement before submitting.',
            });
        });
    });
});
