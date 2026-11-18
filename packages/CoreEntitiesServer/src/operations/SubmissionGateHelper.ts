import { RunView, type IMetadataProvider, type RunViewParams, type UserInfo } from '@memberjunction/core';
import { EscapeSQLString } from '@memberjunction/global';
import {
    CredentialingEntity,
    SubmissionGate,
    type AttestationInput,
    type GateDocumentItem,
    type GateInput,
    type GateRequirement,
    type GateSection,
    type GateStandard,
} from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingDocumentRequirementEntity,
    mjBizAppsCredentialingEvidenceDocumentEntity,
} from '@mj-biz-apps/credentialing-entities';
import type { ApplicationAccess } from '../guards/SubjectAccess.js';
import { SystemUser } from '../guards/SystemUser.js';

type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;
type DocumentRequirementEntity = mjBizAppsCredentialingDocumentRequirementEntity;

export interface GateRawSection {
    ID: string;
    Number: string;
    Name: string;
    Sequence: number;
}

export interface GateRawStandard {
    ID: string;
    SectionID: string;
    Code: string;
    IsEligibility: boolean;
    Sequence: number;
}

export interface GateRawRequirement {
    ID: string;
    Name: string;
    IsRequired: boolean;
    SensitivityPolicy: DocumentRequirementEntity['SensitivityPolicy'];
    Sequence: number;
}

export interface GateRawResponse {
    ID: string;
    StandardID: string;
    Status: string;
}

export interface GateRawDocument {
    ID: string;
    DocumentRequirementID: string | null;
    FileName: string;
    Status: EvidenceDocumentEntity['Status'];
}

export interface GateRawAttestation {
    ID: string;
    DocumentRequirementID: string;
    Statement: string;
}

export interface GateRawApplicationDocument {
    ID: string;
    EvidenceDocumentID: string | null;
    DocumentAttestationID: string | null;
}

export interface LoadedGateData {
    Sections: GateRawSection[];
    Standards: GateRawStandard[];
    Requirements: GateRawRequirement[];
    Responses: GateRawResponse[];
    Documents: GateRawDocument[];
    Attestations: GateRawAttestation[];
    FrozenLinks: GateRawApplicationDocument[];
    InScopeDocuments: GateRawDocument[];
    InScopeAttestations: GateRawAttestation[];
    GateInput: GateInput;
    DocumentItems: GateDocumentItem[];
}

const PURPOSE = 'Evaluating application submission gate';

async function runBatch(params: RunViewParams[], provider: IMetadataProvider, user: UserInfo): Promise<unknown[][]> {
    const results = await RunView.FromMetadataProvider(provider).RunViews<unknown>(params, user);
    const failed = results.find((r) => !r.Success);
    if (failed != null) {
        throw new Error(failed.ErrorMessage || 'Could not evaluate submission gate.');
    }
    return results.map((r) => r.Results ?? []);
}

export function DateOnlyIso(value: Date | string | null | undefined): string | null {
    if (value == null) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
    }
    const str = String(value).trim();
    if (!str) return null;
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(str);
    return match ? match[1] : str;
}

/**
 * Loads all authoring and applicant-data rows needed for `GetSubmissionGate` and
 * `SubmitApplication`, computes `GateInput` and the in-scope (or frozen) document summary.
 */
export async function LoadSubmissionGateData(
    access: ApplicationAccess,
    provider: IMetadataProvider,
    user: UserInfo,
    attestation: AttestationInput | null,
): Promise<LoadedGateData> {
    const versionID = EscapeSQLString(access.Version.ID);
    const applicationID = EscapeSQLString(access.Application.ID);
    const subjectID = EscapeSQLString(access.Subject.ID);
    const system = SystemUser.Get(PURPOSE);

    const [systemRes, callerRes] = await Promise.all([
        runBatch(
            [
                {
                    EntityName: CredentialingEntity.Section,
                    ExtraFilter: `ProgramVersionID = '${versionID}'`,
                    Fields: ['ID', 'Number', 'Name', 'Sequence'],
                    OrderBy: 'Sequence ASC, Number ASC',
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.Standard,
                    ExtraFilter: `ProgramVersionID = '${versionID}'`,
                    Fields: ['ID', 'SectionID', 'Code', 'IsEligibility', 'Sequence'],
                    OrderBy: 'Sequence ASC, Code ASC',
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.DocumentRequirement,
                    ExtraFilter: `ProgramVersionID = '${versionID}'`,
                    Fields: ['ID', 'Name', 'IsRequired', 'SensitivityPolicy', 'Sequence'],
                    OrderBy: 'Sequence ASC, Name ASC',
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
            ],
            provider,
            system,
        ),
        runBatch(
            [
                {
                    EntityName: CredentialingEntity.StandardResponse,
                    ExtraFilter: `ApplicationID = '${applicationID}'`,
                    Fields: ['ID', 'StandardID', 'Status'],
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.EvidenceDocument,
                    ExtraFilter: `SubjectID = '${subjectID}'`,
                    Fields: ['ID', 'DocumentRequirementID', 'FileName', 'Status'],
                    OrderBy: 'UploadedAt DESC',
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.DocumentAttestation,
                    ExtraFilter: `SubjectID = '${subjectID}'`,
                    Fields: ['ID', 'DocumentRequirementID', 'Statement', 'IsSuperseded'],
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.ApplicationDocument,
                    ExtraFilter: `ApplicationID = '${applicationID}'`,
                    Fields: ['ID', 'EvidenceDocumentID', 'DocumentAttestationID'],
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
            ],
            provider,
            user,
        ),
    ]);

    const rawSections = systemRes[0] as GateRawSection[];
    const rawStandards = systemRes[1] as GateRawStandard[];
    const rawRequirements = systemRes[2] as GateRawRequirement[];
    const rawResponses = callerRes[0] as GateRawResponse[];
    const rawDocuments = callerRes[1] as GateRawDocument[];
    const allAttestations = callerRes[2] as (GateRawAttestation & { IsSuperseded: boolean })[];
    const rawFrozenLinks = callerRes[3] as GateRawApplicationDocument[];

    const currentAttestations: GateRawAttestation[] = allAttestations.filter((a) => !a.IsSuperseded);
    const reqById = new Map(rawRequirements.map((r) => [r.ID.toLowerCase(), r]));

    const nonSupersededDocs = rawDocuments.filter((d) => d.Status !== 'Superseded');
    const inScopeDocuments = nonSupersededDocs.filter(
        (d) => d.DocumentRequirementID == null || reqById.has(d.DocumentRequirementID.toLowerCase()),
    );
    const inScopeAttestations = currentAttestations.filter((a) => reqById.has(a.DocumentRequirementID.toLowerCase()));

    const gateInput = buildGateInput(
        Boolean(access.Version.RequiresGoverningBodyAttestation),
        rawSections,
        rawStandards,
        rawRequirements,
        rawResponses,
        inScopeDocuments,
        inScopeAttestations,
        attestation,
    );

    const documentItems = buildDocumentItems(
        access.Application.Status === 'Draft',
        rawDocuments,
        allAttestations,
        rawFrozenLinks,
        inScopeDocuments,
        inScopeAttestations,
        reqById,
    );

    return {
        Sections: rawSections,
        Standards: rawStandards,
        Requirements: rawRequirements,
        Responses: rawResponses,
        Documents: rawDocuments,
        Attestations: currentAttestations,
        FrozenLinks: rawFrozenLinks,
        InScopeDocuments: inScopeDocuments,
        InScopeAttestations: inScopeAttestations,
        GateInput: gateInput,
        DocumentItems: documentItems,
    };
}

function buildGateInput(
    requiresAttestation: boolean,
    rawSections: readonly GateRawSection[],
    rawStandards: readonly GateRawStandard[],
    rawRequirements: readonly GateRawRequirement[],
    rawResponses: readonly GateRawResponse[],
    inScopeDocuments: readonly GateRawDocument[],
    inScopeAttestations: readonly GateRawAttestation[],
    attestation: AttestationInput | null,
): GateInput {
    const confirmedStandardIds = new Set(
        rawResponses.filter((r) => r.Status === 'Confirmed').map((r) => r.StandardID.toLowerCase()),
    );
    const standardsBySection = new Map<string, GateRawStandard[]>();
    for (const st of rawStandards) {
        const key = st.SectionID.toLowerCase();
        const list = standardsBySection.get(key) ?? [];
        list.push(st);
        standardsBySection.set(key, list);
    }

    const sectionsWithOrder = rawSections.map((sec) => {
        const ordered = [...(standardsBySection.get(sec.ID.toLowerCase()) ?? [])].sort((a, b) => {
            if (Boolean(a.IsEligibility) !== Boolean(b.IsEligibility)) {
                return a.IsEligibility ? -1 : 1;
            }
            return a.Sequence - b.Sequence || a.Code.localeCompare(b.Code);
        });
        const gateStandards: GateStandard[] = ordered.map((st) => ({
            StandardID: st.ID,
            Code: st.Code,
            IsEligibility: Boolean(st.IsEligibility),
            Confirmed: confirmedStandardIds.has(st.ID.toLowerCase()),
        }));
        const section: GateSection = {
            SectionID: sec.ID,
            Number: sec.Number,
            Name: sec.Name,
            Standards: gateStandards,
        };
        return {
            Section: section,
            HasEligibility: ordered.some((st) => Boolean(st.IsEligibility)),
            Sequence: sec.Sequence,
            Number: sec.Number,
        };
    });

    sectionsWithOrder.sort((a, b) => {
        if (a.HasEligibility !== b.HasEligibility) return a.HasEligibility ? -1 : 1;
        return a.Sequence - b.Sequence || a.Number.localeCompare(b.Number);
    });

    const docReqIds = new Set(
        inScopeDocuments
            .map((d) => d.DocumentRequirementID?.toLowerCase())
            .filter((id): id is string => id != null),
    );
    const attestReqIds = new Set(inScopeAttestations.map((a) => a.DocumentRequirementID.toLowerCase()));

    const requirements: GateRequirement[] = rawRequirements.map((req) => ({
        RequirementID: req.ID,
        Name: req.Name,
        IsRequired: Boolean(req.IsRequired),
        SensitivityPolicy: req.SensitivityPolicy,
        HasCurrentDocument: docReqIds.has(req.ID.toLowerCase()),
        HasCurrentAttestation: attestReqIds.has(req.ID.toLowerCase()),
    }));

    return {
        Version: { RequiresGoverningBodyAttestation: requiresAttestation },
        Sections: sectionsWithOrder.map((entry) => entry.Section),
        Requirements: requirements,
        Attestation: attestation,
    };
}

function buildDocumentItems(
    isDraft: boolean,
    allDocuments: readonly GateRawDocument[],
    allAttestations: readonly GateRawAttestation[],
    frozenLinks: readonly GateRawApplicationDocument[],
    inScopeDocuments: readonly GateRawDocument[],
    inScopeAttestations: readonly GateRawAttestation[],
    reqById: ReadonlyMap<string, GateRawRequirement>,
): GateDocumentItem[] {
    if (isDraft) {
        const items: GateDocumentItem[] = inScopeDocuments.map((doc) => {
            const req = doc.DocumentRequirementID != null ? reqById.get(doc.DocumentRequirementID.toLowerCase()) : undefined;
            return {
                Kind: 'Document',
                RequirementID: doc.DocumentRequirementID,
                RequirementName: req?.Name ?? null,
                Title: doc.FileName,
                Detail: req ? `Required document · ${req.Name}` : 'General upload',
                EvidenceDocumentID: doc.ID,
                DocumentAttestationID: null,
            };
        });
        for (const att of inScopeAttestations) {
            const req = reqById.get(att.DocumentRequirementID.toLowerCase());
            items.push({
                Kind: 'Attestation',
                RequirementID: att.DocumentRequirementID,
                RequirementName: req?.Name ?? null,
                Title: req ? `Attestation for ${req.Name}` : 'Attestation in lieu',
                Detail: att.Statement,
                EvidenceDocumentID: null,
                DocumentAttestationID: att.ID,
            });
        }
        return items;
    }

    const docById = new Map(allDocuments.map((d) => [d.ID.toLowerCase(), d]));
    const attById = new Map(allAttestations.map((a) => [a.ID.toLowerCase(), a]));
    const items: GateDocumentItem[] = [];
    for (const link of frozenLinks) {
        if (link.EvidenceDocumentID != null) {
            const doc = docById.get(link.EvidenceDocumentID.toLowerCase());
            const req =
                doc?.DocumentRequirementID != null ? reqById.get(doc.DocumentRequirementID.toLowerCase()) : undefined;
            items.push({
                Kind: 'Document',
                RequirementID: doc?.DocumentRequirementID ?? null,
                RequirementName: req?.Name ?? null,
                Title: doc?.FileName ?? 'Frozen document',
                Detail: req ? `Frozen for ${req.Name}` : 'Frozen general upload',
                EvidenceDocumentID: link.EvidenceDocumentID,
                DocumentAttestationID: null,
            });
        } else if (link.DocumentAttestationID != null) {
            const att = attById.get(link.DocumentAttestationID.toLowerCase());
            const req = att != null ? reqById.get(att.DocumentRequirementID.toLowerCase()) : undefined;
            items.push({
                Kind: 'Attestation',
                RequirementID: att?.DocumentRequirementID ?? null,
                RequirementName: req?.Name ?? null,
                Title: req ? `Attestation for ${req.Name}` : 'Frozen attestation',
                Detail: att?.Statement ?? '',
                EvidenceDocumentID: null,
                DocumentAttestationID: link.DocumentAttestationID,
            });
        }
    }
    return items;
}

export function EvaluateRecordedAttestation(access: ApplicationAccess): AttestationInput | null {
    if (access.Application.AttestedAt == null) {
        return null;
    }
    return {
        OfficerName: access.Application.AttestationOfficerName,
        OfficerRole: access.Application.AttestationOfficerRole,
        ApprovalDate: DateOnlyIso(access.Application.AttestationApprovalDate),
        Accepted: true,
    };
}

export function FormatIsoTimestamp(value: Date | string | null | undefined): string | null {
    if (value == null) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

export { SubmissionGate };
