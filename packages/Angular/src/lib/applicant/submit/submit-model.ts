import {
    SubmissionGate,
    type AttestationInput,
    type GateItem,
    type GetSubmissionGateOutput,
} from '@mj-biz-apps/credentialing-core';

export const SUBMIT_FREEZE_NOTE =
    "Submitting locks your confirmed answers and the documents listed here. You will not be able to change them unless the program's staff reopen them.";

export interface SubmitGapLink {
    Screen: 'Standards' | 'Documents' | 'Submit';
    SectionID: string | null;
    StandardID: string | null;
    RequirementID: string | null;
}

export interface EvaluatedSubmitState {
    Items: GateItem[];
    Gaps: GateItem[];
    CanSubmit: boolean;
    DisabledReason: string | null;
    IsSubmitted: boolean;
    SubmittedDateLabel: string | null;
}

const SUBMITTED_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
});

/** Formats an ISO timestamp into a short readable UTC date such as `Nov 17, 2026`. */
export function FormatSubmittedBannerDate(iso: string | null): string | null {
    if (iso == null || iso.trim().length === 0) {
        return null;
    }
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return SUBMITTED_DATE_FORMAT.format(parsed);
}

/** Extracts the resolving navigation screen and parameters for a gate item. */
export function GapLinkForItem(item: GateItem): SubmitGapLink {
    return {
        Screen: item.Target.Screen,
        SectionID: item.Target.SectionID ?? null,
        StandardID: item.Target.StandardID ?? null,
        RequirementID: item.Target.RequirementID ?? null,
    };
}

/**
 * Combines the server-evaluated gate with live client attestation inputs so the UI displays
 * real-time pass/gap indicators and the exact disabled reason before submission.
 */
export function EvaluateSubmitState(
    gate: GetSubmissionGateOutput | null,
    attestation: AttestationInput,
    today: Date = new Date(),
): EvaluatedSubmitState {
    if (gate == null) {
        return {
            Items: [],
            Gaps: [],
            CanSubmit: false,
            DisabledReason: 'Loading submission readiness…',
            IsSubmitted: false,
            SubmittedDateLabel: null,
        };
    }

    const isSubmitted = gate.Application.Status !== 'Draft';
    const submittedDateLabel = isSubmitted
        ? FormatSubmittedBannerDate(gate.Application.SubmittedAt)
        : null;

    const attestationResult = gate.RequiresAttestation
        ? SubmissionGate.ValidateAttestation(attestation, true, today)
        : ({ Allowed: true } as const);

    const items: GateItem[] = gate.Items.map((item) => {
        if (item.Kind !== 'Attestation' || !gate.RequiresAttestation) {
            return item;
        }
        if (isSubmitted && gate.RecordedAttestation != null) {
            return { ...item, Passed: true, Detail: 'Signed' };
        }
        if (!('Reason' in attestationResult)) {
            return { ...item, Passed: true, Detail: 'Signed' };
        }
        return { ...item, Passed: false, Detail: attestationResult.Reason };
    });

    const gaps = items.filter((item) => !item.Passed);
    if (isSubmitted) {
        return {
            Items: items,
            Gaps: gaps,
            CanSubmit: false,
            DisabledReason: null,
            IsSubmitted: true,
            SubmittedDateLabel: submittedDateLabel,
        };
    }

    const nonAttestationGaps = gaps.filter((item) => item.Kind !== 'Attestation');
    let disabledReason: string | null = null;
    if (nonAttestationGaps.length > 0) {
        disabledReason = SubmissionGate.GapsSentence(gaps.length);
    } else if (gaps.length > 0) {
        disabledReason = gaps[0].Detail;
    }

    return {
        Items: items,
        Gaps: gaps,
        CanSubmit: gaps.length === 0,
        DisabledReason: disabledReason,
        IsSubmitted: false,
        SubmittedDateLabel: null,
    };
}
