import type { mjBizAppsCredentialingDocumentRequirementEntity } from '@mj-biz-apps/credentialing-entities';
import { RequiredTextRule, type RuleResult } from './RuleResult.js';

/** Sensitivity policy values derived from the generated DocumentRequirement entity. */
export type SensitivityPolicy = mjBizAppsCredentialingDocumentRequirementEntity['SensitivityPolicy'];

/** Standard summary evaluated by the submission gate. */
export interface GateStandard {
    StandardID: string;
    Code: string;
    IsEligibility: boolean;
    Confirmed: boolean;
}

/** Section summary evaluated by the submission gate. */
export interface GateSection {
    SectionID: string;
    Number: string;
    Name: string;
    Standards: readonly GateStandard[];
}

/** Document requirement summary evaluated by the submission gate. */
export interface GateRequirement {
    RequirementID: string;
    Name: string;
    IsRequired: boolean;
    SensitivityPolicy: SensitivityPolicy;
    HasCurrentDocument: boolean;
    HasCurrentAttestation: boolean;
}

/** Governing-body attestation fields captured before submission. */
export interface AttestationInput {
    OfficerName: string | null;
    OfficerRole: string | null;
    ApprovalDate: string | null;
    Accepted: boolean;
}

/** Complete input to {@link SubmissionGate.Evaluate}. */
export interface GateInput {
    Version: { RequiresGoverningBodyAttestation: boolean };
    Sections: readonly GateSection[];
    Requirements: readonly GateRequirement[];
    Attestation: AttestationInput | null;
}

/** One item shown on the submission gate checklist. */
export interface GateItem {
    Kind: 'Section' | 'Document' | 'Eligibility' | 'Attestation';
    Label: string;
    Passed: boolean;
    Detail: string;
    Target: {
        Screen: 'Standards' | 'Documents' | 'Submit';
        SectionID?: string;
        StandardID?: string;
        RequirementID?: string;
    };
}

/** Result of evaluating the full submission gate. */
export interface GateEvaluation {
    Items: GateItem[];
    Gaps: GateItem[];
    CanSubmit: boolean;
    Reason: string | null;
}

const ATTESTATION_WHO_OR_DATE_REASON =
    "Give the attesting officer's name and role, or the date the governing body approved.";
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Pure domain rules evaluating whether an application meets all submission gates and attestation requirements.
 */
export class SubmissionGate {
    /**
     * Formats the fixed governing-body attestation statement with the subject's display name.
     */
    /** The sentence under a blocked Submit button: how many gate items still need attention. */
    public static GapsSentence(count: number): string {
        return count === 1
            ? '1 item still needs attention before you can submit.'
            : `${count} items still need attention before you can submit.`;
    }

    public static FormatAttestationStatement(subjectName: string): string {
        const name = subjectName.trim() || 'the applicant';
        return `I attest that the information in this application is accurate and complete, and that ${name}'s governing body has approved its submission.`;
    }

    /**
     * Evaluates eligibility standards, sections, required documents, and optional governing-body attestation.
     */
    public static Evaluate(input: GateInput, today: Date = new Date()): GateEvaluation {
        const eligibilityItems = SubmissionGate.buildEligibilityItems(input.Sections);
        const sectionItems = input.Sections.map((section) => SubmissionGate.buildSectionItem(section));
        const documentItems = input.Requirements.filter((req) => req.IsRequired).map((req) =>
            SubmissionGate.buildDocumentItem(req)
        );
        const items: GateItem[] = [...eligibilityItems, ...sectionItems, ...documentItems];

        if (input.Version.RequiresGoverningBodyAttestation) {
            items.push(SubmissionGate.buildAttestationItem(input.Attestation, today));
        }

        const gaps = items.filter((item) => !item.Passed);
        const canSubmit = gaps.length === 0;
        return {
            Items: items,
            Gaps: gaps,
            CanSubmit: canSubmit,
            Reason: canSubmit
                ? null
                : SubmissionGate.GapsSentence(gaps.length),
        };
    }

    /**
     * Validates a governing-body attestation against officer/date and acceptance rules.
     */
    public static ValidateAttestation(
        attestation: AttestationInput | null,
        required: boolean,
        today: Date
    ): RuleResult {
        if (!required) {
            return { Allowed: true };
        }
        if (attestation == null) {
            return { Allowed: false, Reason: ATTESTATION_WHO_OR_DATE_REASON };
        }

        const hasDate = !RequiredTextRule.IsBlank(attestation.ApprovalDate);
        if (hasDate && !SubmissionGate.isValidNonFutureDate(attestation.ApprovalDate!, today)) {
            return { Allowed: false, Reason: ATTESTATION_WHO_OR_DATE_REASON };
        }

        const hasOfficer =
            !RequiredTextRule.IsBlank(attestation.OfficerName) &&
            !RequiredTextRule.IsBlank(attestation.OfficerRole);

        if (!hasOfficer && !hasDate) {
            return { Allowed: false, Reason: ATTESTATION_WHO_OR_DATE_REASON };
        }

        if (!attestation.Accepted) {
            return {
                Allowed: false,
                Reason: 'Confirm the attestation statement before submitting.',
            };
        }

        return { Allowed: true };
    }

    private static buildEligibilityItems(sections: readonly GateSection[]): GateItem[] {
        const items: GateItem[] = [];
        for (const section of sections) {
            for (const standard of section.Standards) {
                if (!standard.IsEligibility) {
                    continue;
                }
                items.push({
                    Kind: 'Eligibility',
                    Label: `Eligibility: ${standard.Code}`,
                    Passed: standard.Confirmed,
                    Detail: standard.Confirmed ? 'Confirmed' : 'Not confirmed yet',
                    Target: {
                        Screen: 'Standards',
                        SectionID: section.SectionID,
                        StandardID: standard.StandardID,
                    },
                });
            }
        }
        return items;
    }

    private static buildSectionItem(section: GateSection): GateItem {
        const total = section.Standards.length;
        const confirmed = section.Standards.filter((s) => s.Confirmed).length;
        return {
            Kind: 'Section',
            Label: `${section.Number}. ${section.Name}`,
            Passed: total > 0 && confirmed === total,
            Detail: `${confirmed} of ${total} confirmed`,
            Target: {
                Screen: 'Standards',
                SectionID: section.SectionID,
            },
        };
    }

    private static buildDocumentItem(requirement: GateRequirement): GateItem {
        const passed =
            requirement.HasCurrentDocument ||
            (requirement.SensitivityPolicy === 'Restricted Allowed' &&
                requirement.HasCurrentAttestation);
        const detail = requirement.HasCurrentDocument
            ? 'On file'
            : passed
              ? 'Attested'
              : 'Missing required document';
        return {
            Kind: 'Document',
            Label: requirement.Name,
            Passed: passed,
            Detail: detail,
            Target: {
                Screen: 'Documents',
                RequirementID: requirement.RequirementID,
            },
        };
    }

    private static buildAttestationItem(
        attestation: AttestationInput | null,
        today: Date
    ): GateItem {
        const check = SubmissionGate.ValidateAttestation(attestation, true, today);
        if (!('Reason' in check)) {
            return {
                Kind: 'Attestation',
                Label: 'Governing body attestation',
                Passed: true,
                Detail: 'Signed',
                Target: { Screen: 'Submit' },
            };
        }
        return {
            Kind: 'Attestation',
            Label: 'Governing body attestation',
            Passed: false,
            Detail: check.Reason,
            Target: { Screen: 'Submit' },
        };
    }

    private static isValidNonFutureDate(rawDate: string, today: Date): boolean {
        const trimmed = rawDate.trim();
        const isoMatch = ISO_DATE_PATTERN.exec(trimmed);
        let dateString: string;
        if (isoMatch != null) {
            const year = Number(isoMatch[1]);
            const month = Number(isoMatch[2]);
            const day = Number(isoMatch[3]);
            const parsed = new Date(Date.UTC(year, month - 1, day));
            if (
                parsed.getUTCFullYear() !== year ||
                parsed.getUTCMonth() !== month - 1 ||
                parsed.getUTCDate() !== day
            ) {
                return false;
            }
            dateString = trimmed;
        } else {
            const parsed = new Date(trimmed);
            if (Number.isNaN(parsed.getTime())) {
                return false;
            }
            dateString = parsed.toISOString().slice(0, 10);
        }

        const todayString = today.toISOString().slice(0, 10);
        return dateString <= todayString;
    }
}
