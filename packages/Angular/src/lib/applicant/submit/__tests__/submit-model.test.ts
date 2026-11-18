import { describe, it, expect } from 'vitest';
import type { GateItem, GetSubmissionGateOutput } from '@mj-biz-apps/credentialing-core';
import {
    EvaluateSubmitState,
    FormatSubmittedBannerDate,
    GapLinkForItem,
    SUBMIT_FREEZE_NOTE,
} from '../submit-model';

function makeGate(overrides: Partial<GetSubmissionGateOutput> = {}): GetSubmissionGateOutput {
    return {
        Items: [
            {
                Kind: 'Eligibility',
                Label: 'Eligibility: 1.1',
                Passed: true,
                Detail: 'Confirmed',
                Target: { Screen: 'Standards', SectionID: 'SEC-1', StandardID: 'STD-1' },
            },
            {
                Kind: 'Section',
                Label: '1. Governance',
                Passed: true,
                Detail: '2 of 2 confirmed',
                Target: { Screen: 'Standards', SectionID: 'SEC-1' },
            },
            {
                Kind: 'Document',
                Label: 'Safety policy',
                Passed: true,
                Detail: 'On file',
                Target: { Screen: 'Documents', RequirementID: 'REQ-1' },
            },
            {
                Kind: 'Attestation',
                Label: 'Governing body attestation',
                Passed: false,
                Detail: "Give the attesting officer's name and role, or the date the governing body approved.",
                Target: { Screen: 'Submit' },
            },
        ],
        Gaps: [],
        CanSubmit: false,
        Reason: '1 item still needs attention before you can submit.',
        RequiresAttestation: true,
        AttestationStatement:
            "I attest that the information in this application is accurate and complete, and that Sample Applicant's governing body has approved its submission.",
        Application: {
            ApplicationID: 'APP-1',
            SubjectID: 'SUB-1',
            SubjectName: 'Sample Applicant',
            ProgramName: 'Sample Program',
            VersionLabel: '2026',
            OrganizationName: 'Sample Org',
            Status: 'Draft',
            SubmittedAt: null,
        },
        Documents: [],
        RecordedAttestation: null,
        ...overrides,
    };
}

describe('submit-model', () => {
    it('exports the exact freeze note', () => {
        expect(SUBMIT_FREEZE_NOTE).toBe(
            "Submitting locks your confirmed answers and the documents listed here. You will not be able to change them unless the program's staff reopen them.",
        );
    });

    it('disables Submit with the gate count reason when standards or documents have gaps', () => {
        const items: GateItem[] = [
            {
                Kind: 'Section',
                Label: '1. Governance',
                Passed: false,
                Detail: '1 of 2 confirmed',
                Target: { Screen: 'Standards', SectionID: 'SEC-1' },
            },
            {
                Kind: 'Document',
                Label: 'Safety policy',
                Passed: false,
                Detail: 'Missing required document',
                Target: { Screen: 'Documents', RequirementID: 'REQ-1' },
            },
        ];
        const state = EvaluateSubmitState(
            makeGate({
                Items: items,
                Gaps: items,
                CanSubmit: false,
                Reason: '2 items still need attention before you can submit.',
                RequiresAttestation: false,
            }),
            { OfficerName: null, OfficerRole: null, ApprovalDate: null, Accepted: false },
        );

        expect(state.CanSubmit).toBe(false);
        expect(state.DisabledReason).toBe('2 items still need attention before you can submit.');
        expect(state.Gaps).toHaveLength(2);
    });

    it('says "1 item still needs attention" for a single gap', () => {
        const items: GateItem[] = [
            {
                Kind: 'Section',
                Label: '1. Governance',
                Passed: false,
                Detail: '1 of 2 confirmed',
                Target: { Screen: 'Standards', SectionID: 'SEC-1' },
            },
        ];
        const state = EvaluateSubmitState(
            makeGate({ Items: items, Gaps: items, CanSubmit: false, RequiresAttestation: false }),
            { OfficerName: null, OfficerRole: null, ApprovalDate: null, Accepted: false },
        );
        expect(state.DisabledReason).toBe('1 item still needs attention before you can submit.');
    });

    it('updates attestation gate item live and surfaces the attestation reason until complete', () => {
        const gate = makeGate();
        const empty = EvaluateSubmitState(gate, {
            OfficerName: null,
            OfficerRole: null,
            ApprovalDate: null,
            Accepted: false,
        });
        expect(empty.CanSubmit).toBe(false);
        expect(empty.DisabledReason).toBe(
            "Give the attesting officer's name and role, or the date the governing body approved.",
        );

        const unchecked = EvaluateSubmitState(gate, {
            OfficerName: 'Pat Lee',
            OfficerRole: 'Board Chair',
            ApprovalDate: null,
            Accepted: false,
        });
        expect(unchecked.CanSubmit).toBe(false);
        expect(unchecked.DisabledReason).toBe('Confirm the attestation statement before submitting.');

        const ready = EvaluateSubmitState(gate, {
            OfficerName: 'Pat Lee',
            OfficerRole: 'Board Chair',
            ApprovalDate: null,
            Accepted: true,
        });
        expect(ready.CanSubmit).toBe(true);
        expect(ready.DisabledReason).toBeNull();
        expect(ready.Gaps).toEqual([]);
    });

    it('maps each gap target to the right resolving screen and URL parameters', () => {
        expect(
            GapLinkForItem({
                Kind: 'Eligibility',
                Label: 'Eligibility: 1.1',
                Passed: false,
                Detail: 'Not confirmed yet',
                Target: { Screen: 'Standards', SectionID: 'SEC-1', StandardID: 'STD-1' },
            }),
        ).toEqual({
            Screen: 'Standards',
            SectionID: 'SEC-1',
            StandardID: 'STD-1',
            RequirementID: null,
        });

        expect(
            GapLinkForItem({
                Kind: 'Document',
                Label: 'Safety policy',
                Passed: false,
                Detail: 'Missing required document',
                Target: { Screen: 'Documents', RequirementID: 'REQ-1' },
            }),
        ).toEqual({
            Screen: 'Documents',
            SectionID: null,
            StandardID: null,
            RequirementID: 'REQ-1',
        });
    });

    it('marks submitted applications read-only with a formatted Submitted on {date}. label', () => {
        const state = EvaluateSubmitState(
            makeGate({
                Application: {
                    ApplicationID: 'APP-1',
                    SubjectID: 'SUB-1',
                    SubjectName: 'Sample Applicant',
                    ProgramName: 'Sample Program',
                    VersionLabel: '2026',
                    OrganizationName: 'Sample Org',
                    Status: 'Submitted',
                    SubmittedAt: '2026-11-17T15:30:00.000Z',
                },
            }),
            { OfficerName: null, OfficerRole: null, ApprovalDate: null, Accepted: false },
        );

        expect(state.IsSubmitted).toBe(true);
        expect(state.CanSubmit).toBe(false);
        expect(state.SubmittedDateLabel).toBe('Nov 17, 2026');
        expect(FormatSubmittedBannerDate('2026-11-17T15:30:00.000Z')).toBe('Nov 17, 2026');
    });
});
