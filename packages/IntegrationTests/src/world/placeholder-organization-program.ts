import type { ProgramTreeSpec } from './program-tree.js';

export const PLACEHOLDER_PROGRAM_NAME = 'Placeholder Organization Program (sample data)';

/**
 * Sample organization-level recognition program for development and demonstration.
 * Not real standards catalog content and never shipped in release migrations.
 */
export function PlaceholderOrganizationProgramSpec(accreditingOrganizationID: string): ProgramTreeSpec {
    return {
        AccreditingOrganizationID: accreditingOrganizationID,
        Program: {
            Name: PLACEHOLDER_PROGRAM_NAME,
            ProgramType: 'Recognition',
            SubjectType: 'Organization',
            SubjectNoun: 'organization',
            CredentialPrefix: 'PLH',
            Description:
                'Sample data for development and demonstration. Not a real standards catalog. Twelve sections covering governance, operations, finance, underwriting, claims, vendor oversight, security, and artificial intelligence.',
        },
        Version: { Label: '2027', CommitteeID: null },
        Sections: [
            {
                Number: '1',
                Name: 'Governance and Bylaws',
                Sequence: 1,
                Standards: [
                    {
                        Code: '1.1',
                        Statement: 'The organization maintains current bylaws that define its governance structure and decision-making authority.',
                        ResponseType: 'Attestation',
                        Sequence: 1,
                    },
                    {
                        Code: '1.2',
                        Statement: 'The organization reviews its governing documents on a regular schedule and records any amendments approved by its members.',
                        ResponseType: 'Narrative',
                        Sequence: 2,
                    },
                    {
                        Code: '1.3',
                        Statement: 'The organization documents its legal formation and current good standing in its jurisdiction of domicile.',
                        ResponseType: 'Evidence',
                        Sequence: 3,
                    },
                ],
            },
            {
                Number: '2',
                Name: 'Board Operations',
                Sequence: 2,
                Standards: [
                    {
                        Code: '2.1',
                        Statement: 'The organization holds regular meetings of its governing board with a documented quorum and recorded minutes.',
                        ResponseType: 'Attestation',
                        Sequence: 1,
                    },
                    {
                        Code: '2.2',
                        Statement: 'The organization describes how board members are nominated, oriented, and evaluated for ongoing service.',
                        ResponseType: 'Narrative',
                        Sequence: 2,
                    },
                    {
                        Code: '2.3',
                        Statement: 'The organization maintains signed annual conflict-of-interest disclosures for every voting member of its governing board.',
                        ResponseType: 'Evidence',
                        Sequence: 3,
                    },
                ],
            },
            {
                Number: '3',
                Name: 'Financial Reporting',
                Sequence: 3,
                Standards: [
                    {
                        Code: '3.1',
                        Statement: 'The organization prepares annual financial statements in accordance with generally accepted accounting principles.',
                        ResponseType: 'Attestation',
                        Sequence: 1,
                    },
                    {
                        Code: '3.2',
                        Statement: 'The organization explains how its audit committee selects the independent auditor and reviews audit findings.',
                        ResponseType: 'Narrative',
                        Sequence: 2,
                    },
                    {
                        Code: '3.3',
                        Statement: 'The organization obtains an annual independent audit of its financial statements and presents the report to its board.',
                        ResponseType: 'Evidence',
                        Sequence: 3,
                    },
                ],
            },
            {
                Number: '4',
                Name: 'Net Position and Reserves',
                Sequence: 4,
                Standards: [
                    {
                        Code: '4.1',
                        Statement: 'The organization has adopted a written net position policy that states a target range.',
                        ResponseType: 'Evidence',
                        IntakeMode: 'Prefill',
                        EvidenceHint: 'Audited financial statements, notes to the financial statements',
                        Sequence: 1,
                    },
                    {
                        Code: '4.2',
                        Statement: 'The organization engages a credentialed actuary at least annually to evaluate unpaid claim liabilities and reserve adequacy.',
                        ResponseType: 'Attestation',
                        Sequence: 2,
                    },
                    {
                        Code: '4.3',
                        Statement: 'The organization describes how it monitors changes in net position relative to its target range and addresses shortfalls.',
                        ResponseType: 'Narrative',
                        Sequence: 3,
                    },
                ],
            },
            {
                Number: '5',
                Name: 'Investment Policy',
                Sequence: 5,
                Standards: [
                    {
                        Code: '5.1',
                        Statement: 'The organization operates under a board-approved written investment policy that sets asset allocation and quality limits.',
                        ResponseType: 'Attestation',
                        Sequence: 1,
                    },
                    {
                        Code: '5.2',
                        Statement: 'The organization explains how it monitors investment managers and evaluates portfolio performance against policy benchmarks.',
                        ResponseType: 'Narrative',
                        Sequence: 2,
                    },
                    {
                        Code: '5.3',
                        Statement: 'The organization provides quarterly investment compliance reports reviewed by its finance committee or governing board.',
                        ResponseType: 'Evidence',
                        Sequence: 3,
                    },
                ],
            },
            {
                Number: '6',
                Name: 'Underwriting and Rating',
                Sequence: 6,
                Standards: [
                    {
                        Code: '6.1',
                        Statement: 'The organization applies written underwriting guidelines consistently when evaluating applicants and renewing members.',
                        ResponseType: 'Attestation',
                        Sequence: 1,
                    },
                    {
                        Code: '6.2',
                        Statement: 'The organization describes the rating methodology it uses to set contributions and maintain equity across participants.',
                        ResponseType: 'Narrative',
                        Sequence: 2,
                    },
                    {
                        Code: '6.3',
                        Statement: 'The organization retains underwriting worksheets and rate-adequacy analyses supporting its current contribution schedule.',
                        ResponseType: 'Evidence',
                        Sequence: 3,
                    },
                ],
            },
            {
                Number: '7',
                Name: 'Claims Administration',
                Sequence: 7,
                Standards: [
                    {
                        Code: '7.1',
                        Statement: 'The organization maintains written claims-handling standards that establish timelines for acknowledgment, investigation, and reserve setting.',
                        ResponseType: 'Attestation',
                        Sequence: 1,
                    },
                    {
                        Code: '7.2',
                        Statement: 'The organization describes how it oversees third-party claims administrators and audits claim files for quality and consistency.',
                        ResponseType: 'Narrative',
                        Sequence: 2,
                    },
                    {
                        Code: '7.3',
                        Statement: 'The organization conducts periodic independent claims audits and tracks corrective actions to completion.',
                        ResponseType: 'Evidence',
                        Sequence: 3,
                    },
                ],
            },
            {
                Number: '8',
                Name: 'Risk Control Services',
                Sequence: 8,
                Standards: [
                    {
                        Code: '8.1',
                        Statement: 'The organization provides loss-prevention and risk-control resources tailored to the exposures of its participating members.',
                        ResponseType: 'Attestation',
                        Sequence: 1,
                    },
                    {
                        Code: '8.2',
                        Statement: 'The organization explains how it identifies recurring loss trends and measures the effectiveness of its risk-control programs.',
                        ResponseType: 'Narrative',
                        Sequence: 2,
                    },
                    {
                        Code: '8.3',
                        Statement: 'The organization documents member site assessments, safety recommendations, and follow-up completion records.',
                        ResponseType: 'Evidence',
                        Sequence: 3,
                    },
                ],
            },
            {
                Number: '9',
                Name: 'Coverage Documents',
                Sequence: 9,
                Standards: [
                    {
                        Code: '9.1',
                        Statement: 'The organization issues clear written coverage agreements that state covered perils, limits, exclusions, and member obligations.',
                        ResponseType: 'Attestation',
                        Sequence: 1,
                    },
                    {
                        Code: '9.2',
                        Statement: 'The organization describes its process for reviewing coverage wording changes with legal counsel and communicating updates to members.',
                        ResponseType: 'Narrative',
                        Sequence: 2,
                    },
                    {
                        Code: '9.3',
                        Statement: 'The organization maintains a controlled schedule of current coverage forms and endorsements issued to participating members.',
                        ResponseType: 'Evidence',
                        Sequence: 3,
                    },
                ],
            },
            {
                Number: '10',
                Name: 'Vendor and Contract Management',
                Sequence: 10,
                Standards: [
                    {
                        Code: '10.1',
                        Statement: 'The organization evaluates prospective service providers for financial stability, qualifications, and operational controls before contracting.',
                        ResponseType: 'Attestation',
                        Sequence: 1,
                    },
                    {
                        Code: '10.2',
                        Statement: 'The organization describes how it monitors key vendors against service-level agreements and manages contract renewals.',
                        ResponseType: 'Narrative',
                        Sequence: 2,
                    },
                    {
                        Code: '10.3',
                        Statement: 'The organization maintains executed agreements and annual performance reviews for its critical operational vendors.',
                        ResponseType: 'Evidence',
                        Sequence: 3,
                    },
                ],
            },
            {
                Number: '11',
                Name: 'Information Security',
                Sequence: 11,
                Standards: [
                    {
                        Code: '11.1',
                        Statement: 'The organization maintains a written information security program that protects confidential member and claimant records.',
                        ResponseType: 'Attestation',
                        Sequence: 1,
                    },
                    {
                        Code: '11.2',
                        Statement: 'The organization describes its incident-response plan, access-control reviews, and annual staff security training.',
                        ResponseType: 'Narrative',
                        Sequence: 2,
                    },
                    {
                        Code: '11.3',
                        Statement: 'The organization completes an annual security assessment or penetration test and documents remediation of findings.',
                        ResponseType: 'Evidence',
                        Sequence: 3,
                    },
                ],
            },
            {
                Number: '12',
                Name: 'Artificial Intelligence Policy and Practice',
                Sequence: 12,
                Standards: [
                    {
                        Code: '12.1',
                        Statement: 'The organization has adopted a written policy governing the permitted use, human oversight, and validation of artificial intelligence tools.',
                        ResponseType: 'Attestation',
                        IsNewForVersion: true,
                        Sequence: 1,
                    },
                    {
                        Code: '12.2',
                        Statement: 'The organization maintains an inventory of artificial intelligence systems used in operations along with documented accuracy and bias reviews.',
                        ResponseType: 'Evidence',
                        IsNewForVersion: true,
                        Sequence: 2,
                    },
                    {
                        Code: '12.3',
                        Statement: "The organization's use of artificial intelligence in underwriting is consistent with the law of its jurisdiction.",
                        ResponseType: 'Narrative',
                        IsInterpretive: true,
                        IsNewForVersion: true,
                        Sequence: 3,
                    },
                ],
            },
        ],
        DocumentRequirements: [
            { Name: 'Bylaws', IsRequired: true, SensitivityPolicy: 'Normal', Sequence: 1 },
            { Name: 'Articles of Incorporation', IsRequired: true, SensitivityPolicy: 'Normal', Sequence: 2 },
            { Name: 'Audited Financial Statements', IsRequired: true, SensitivityPolicy: 'Normal', Sequence: 3 },
            { Name: 'Claims Manual', IsRequired: false, SensitivityPolicy: 'Restricted Allowed', Sequence: 4 },
            { Name: 'Underwriting Manual', IsRequired: false, SensitivityPolicy: 'Restricted Allowed', Sequence: 5 },
        ],
    };
}
