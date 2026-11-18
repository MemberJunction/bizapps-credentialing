/**
 * Server body of `Credentialing.GetDocumentLibrary`: authorizes the caller with
 * `SubjectAccess.Subject` + `SubjectAccess.ActorFor`, reads the subject's applications, evidence
 * documents (omitting `ExtractedText`), current attestations, frozen application-document links,
 * and citations in one `RunViews` batch as the caller, then reads the referenced program versions
 * and document requirements in one `RunViews` batch as the system user (at most 4 round trips total).
 */
import { BaseRemotableOperation, RunView, type IMetadataProvider, type RunViewParams, type UserInfo } from '@memberjunction/core';
import { EscapeSQLString, RegisterClass } from '@memberjunction/global';
import {
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_STAFF_ROLE,
    CredentialingEntity,
    CredentialingOperation,
    EvidenceFileRules,
    GetDocumentLibraryOperation,
    NOT_FOUND_REASON,
    type ApplicationStatus,
    type DocumentLedger,
    type DocumentLibrary,
    type DocumentVersionInfo,
    type GetDocumentLibraryInput,
    type LedgerRow,
    type LibraryAttestation,
    type LibraryDocument,
} from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingDocumentRequirementEntity,
    mjBizAppsCredentialingEvidenceDocumentEntity,
} from '@mj-biz-apps/credentialing-entities';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { SystemUser } from '../guards/SystemUser.js';
import { OperationSupport } from './OperationSupport.js';
import { ToIsoString } from './ResponseWorkspaceHelper.js';

type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;
type DocumentRequirementEntity = mjBizAppsCredentialingDocumentRequirementEntity;

interface RawApplicationRow {
    ID: string;
    ProgramVersionID: string;
    Status: ApplicationStatus;
}

interface RawEvidenceDocumentRow {
    ID: string;
    DocumentRequirementID: string | null;
    FileName: string;
    ContentType: string;
    ContentHash: string;
    TextStatus: EvidenceDocumentEntity['TextStatus'];
    TextNote: string | null;
    ReadingStatus: EvidenceDocumentEntity['ReadingStatus'];
    ReadingNote: string | null;
    Status: EvidenceDocumentEntity['Status'];
    SupersedesDocumentID: string | null;
    UploadedByUser: string | null;
    UploadedAt: Date | string;
}

interface RawAttestationRow {
    ID: string;
    DocumentRequirementID: string;
    Statement: string;
    AttestedByUser: string | null;
    AttestedAt: Date | string;
}

interface RawApplicationDocumentRow {
    ApplicationID: string;
    EvidenceDocumentID: string | null;
    DocumentAttestationID: string | null;
}

interface RawCitationRow {
    ID: string;
    EvidenceDocumentID: string;
}

interface RawProgramVersionRow {
    ID: string;
    Label: string;
    Program: string;
}

interface RawRequirementRow {
    ID: string;
    ProgramVersionID: string;
    Name: string;
    Description: string | null;
    IsRequired: boolean;
    SensitivityPolicy: DocumentRequirementEntity['SensitivityPolicy'];
    Sequence: number;
}

@RegisterClass(BaseRemotableOperation, CredentialingOperation.GetDocumentLibrary)
export class GetDocumentLibraryServerOperation extends GetDocumentLibraryOperation {
    protected override async Authorize(_input: GetDocumentLibraryInput, user: UserInfo): Promise<boolean> {
        return (
            OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE) ||
            OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE)
        );
    }

    protected override async InternalExecute(
        input: GetDocumentLibraryInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<DocumentLibrary> {
        const subject = await SubjectAccess.Subject(input.SubjectID, provider, user);
        const actor = await SubjectAccess.ActorFor(user, subject, provider);
        if (actor == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }

        const subjectID = EscapeSQLString(subject.ID);
        const callerResults = await this.runViews(
            [
                {
                    EntityName: CredentialingEntity.Application,
                    ExtraFilter: `SubjectID = '${subjectID}'`,
                    Fields: ['ID', 'ProgramVersionID', 'Status'],
                    OrderBy: '__mj_CreatedAt DESC',
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.EvidenceDocument,
                    ExtraFilter: `SubjectID = '${subjectID}'`,
                    Fields: [
                        'ID',
                        'DocumentRequirementID',
                        'FileName',
                        'ContentType',
                        'ContentHash',
                        'TextStatus',
                        'TextNote',
                        'ReadingStatus',
                        'ReadingNote',
                        'Status',
                        'SupersedesDocumentID',
                        'UploadedByUser',
                        'UploadedAt',
                    ],
                    OrderBy: 'UploadedAt DESC',
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.DocumentAttestation,
                    ExtraFilter: `SubjectID = '${subjectID}' AND IsSuperseded = 0`,
                    Fields: ['ID', 'DocumentRequirementID', 'Statement', 'AttestedByUser', 'AttestedAt'],
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.ApplicationDocument,
                    ExtraFilter: `SubjectID = '${subjectID}'`,
                    Fields: ['ApplicationID', 'EvidenceDocumentID', 'DocumentAttestationID'],
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.ResponseCitation,
                    ExtraFilter: `SubjectID = '${subjectID}'`,
                    Fields: ['ID', 'EvidenceDocumentID'],
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
            ],
            provider,
            user,
        );

        const rawApps = callerResults[0] as RawApplicationRow[];
        const rawDocs = callerResults[1] as RawEvidenceDocumentRow[];
        const rawAttestations = callerResults[2] as RawAttestationRow[];
        const rawFrozenLinks = callerResults[3] as RawApplicationDocumentRow[];
        const rawCitations = callerResults[4] as RawCitationRow[];

        const versionIDs = [...new Set(rawApps.map((a) => a.ProgramVersionID))];
        let rawVersions: RawProgramVersionRow[] = [];
        let rawRequirements: RawRequirementRow[] = [];

        if (versionIDs.length > 0) {
            const versionList = versionIDs.map((id) => `'${EscapeSQLString(id)}'`).join(', ');
            const system = SystemUser.Get('Reading document requirements for a subject library');
            const systemResults = await this.runViews(
                [
                    {
                        EntityName: CredentialingEntity.ProgramVersion,
                        ExtraFilter: `ID IN (${versionList})`,
                        Fields: ['ID', 'Label', 'Program'],
                        ResultType: 'simple',
                        SkipTotalRowCount: true,
                    },
                    {
                        EntityName: CredentialingEntity.DocumentRequirement,
                        ExtraFilter: `ProgramVersionID IN (${versionList})`,
                        Fields: ['ID', 'ProgramVersionID', 'Name', 'Description', 'IsRequired', 'SensitivityPolicy', 'Sequence'],
                        OrderBy: 'Sequence ASC, Name ASC',
                        ResultType: 'simple',
                        SkipTotalRowCount: true,
                    },
                ],
                provider,
                system,
            );
            rawVersions = systemResults[0] as RawProgramVersionRow[];
            rawRequirements = systemResults[1] as RawRequirementRow[];
        }

        return this.assembleLibrary(
            rawApps,
            rawDocs,
            rawAttestations,
            rawFrozenLinks,
            rawCitations,
            rawVersions,
            rawRequirements,
        );
    }

    private assembleLibrary(
        rawApps: readonly RawApplicationRow[],
        rawDocs: readonly RawEvidenceDocumentRow[],
        rawAttestations: readonly RawAttestationRow[],
        rawFrozenLinks: readonly RawApplicationDocumentRow[],
        rawCitations: readonly RawCitationRow[],
        rawVersions: readonly RawProgramVersionRow[],
        rawRequirements: readonly RawRequirementRow[],
    ): DocumentLibrary {
        const appStatusById = new Map<string, ApplicationStatus>();
        for (const app of rawApps) {
            appStatusById.set(app.ID.toLowerCase(), app.Status);
        }

        const frozenDocStatuses = new Map<string, ApplicationStatus[]>();
        const frozenAttestStatuses = new Map<string, ApplicationStatus[]>();
        for (const link of rawFrozenLinks) {
            const status = appStatusById.get(link.ApplicationID.toLowerCase());
            if (status == null) continue;
            if (link.EvidenceDocumentID != null) {
                const key = link.EvidenceDocumentID.toLowerCase();
                const list = frozenDocStatuses.get(key) ?? [];
                list.push(status);
                frozenDocStatuses.set(key, list);
            }
            if (link.DocumentAttestationID != null) {
                const key = link.DocumentAttestationID.toLowerCase();
                const list = frozenAttestStatuses.get(key) ?? [];
                list.push(status);
                frozenAttestStatuses.set(key, list);
            }
        }

        const citationsByDoc = new Map<string, number>();
        for (const c of rawCitations) {
            const key = c.EvidenceDocumentID.toLowerCase();
            citationsByDoc.set(key, (citationsByDoc.get(key) ?? 0) + 1);
        }

        const docsById = new Map<string, RawEvidenceDocumentRow>();
        const docsByRequirement = new Map<string, RawEvidenceDocumentRow[]>();
        const generalDocs: RawEvidenceDocumentRow[] = [];
        for (const doc of rawDocs) {
            docsById.set(doc.ID.toLowerCase(), doc);
            if (doc.DocumentRequirementID == null) {
                if (doc.Status !== 'Superseded') {
                    generalDocs.push(doc);
                }
            } else {
                const key = doc.DocumentRequirementID.toLowerCase();
                const list = docsByRequirement.get(key) ?? [];
                list.push(doc);
                docsByRequirement.set(key, list);
            }
        }

        const attestationByRequirement = new Map<string, RawAttestationRow>();
        for (const att of rawAttestations) {
            attestationByRequirement.set(att.DocumentRequirementID.toLowerCase(), att);
        }

        const versionById = new Map<string, RawProgramVersionRow>();
        for (const v of rawVersions) {
            versionById.set(v.ID.toLowerCase(), v);
        }

        const requirementsByVersion = new Map<string, RawRequirementRow[]>();
        for (const req of rawRequirements) {
            const key = req.ProgramVersionID.toLowerCase();
            const list = requirementsByVersion.get(key) ?? [];
            list.push(req);
            requirementsByVersion.set(key, list);
        }

        const ledgers: DocumentLedger[] = rawApps.map((app) => {
            const version = versionById.get(app.ProgramVersionID.toLowerCase());
            const reqs = requirementsByVersion.get(app.ProgramVersionID.toLowerCase()) ?? [];
            const rows: LedgerRow[] = reqs.map((req) =>
                this.buildLedgerRow(
                    req,
                    docsByRequirement.get(req.ID.toLowerCase()) ?? [],
                    attestationByRequirement.get(req.ID.toLowerCase()) ?? null,
                    docsById,
                    citationsByDoc,
                    frozenDocStatuses,
                    frozenAttestStatuses,
                ),
            );
            return {
                ProgramName: version?.Program ?? 'Program',
                VersionLabel: version?.Label ?? '',
                ApplicationID: app.ID,
                ApplicationStatus: app.Status,
                Rows: rows,
            };
        });

        const general = generalDocs.map((doc) =>
            this.projectDocument(doc, [doc], docsById, citationsByDoc),
        );

        return { Ledgers: ledgers, General: general };
    }

    private buildLedgerRow(
        req: RawRequirementRow,
        reqDocs: readonly RawEvidenceDocumentRow[],
        rawAttestation: RawAttestationRow | null,
        docsById: ReadonlyMap<string, RawEvidenceDocumentRow>,
        citationsByDoc: ReadonlyMap<string, number>,
        frozenDocStatuses: ReadonlyMap<string, ApplicationStatus[]>,
        frozenAttestStatuses: ReadonlyMap<string, ApplicationStatus[]>,
    ): LedgerRow {
        const currentDoc = reqDocs.find((d) => d.Status !== 'Superseded') ?? null;
        const document = currentDoc != null ? this.projectDocument(currentDoc, reqDocs, docsById, citationsByDoc) : null;

        const attestation: LibraryAttestation | null =
            document == null && rawAttestation != null
                ? {
                      Statement: rawAttestation.Statement,
                      AttestedAt: ToIsoString(rawAttestation.AttestedAt) ?? '',
                      AttestedByName: (rawAttestation.AttestedByUser ?? '').trim() || 'Applicant',
                  }
                : null;

        let locked = false;
        let lockedReason: string | null = null;
        if (currentDoc != null) {
            const frozenBy = frozenDocStatuses.get(currentDoc.ID.toLowerCase()) ?? [];
            const rule = EvidenceFileRules.CanSupersede(currentDoc, frozenBy);
            if ('Reason' in rule) {
                locked = true;
                lockedReason = rule.Reason;
            }
        } else if (rawAttestation != null) {
            const frozenBy = frozenAttestStatuses.get(rawAttestation.ID.toLowerCase()) ?? [];
            const rule = EvidenceFileRules.CanReattest({ IsSuperseded: false }, frozenBy);
            if ('Reason' in rule) {
                locked = true;
                lockedReason = rule.Reason;
            }
        }

        return {
            RequirementID: req.ID,
            Name: req.Name,
            Description: req.Description ?? null,
            IsRequired: Boolean(req.IsRequired),
            RestrictedAllowed: req.SensitivityPolicy === 'Restricted Allowed',
            Document: document,
            Attestation: attestation,
            Locked: locked,
            LockedReason: lockedReason,
        };
    }

    private projectDocument(
        current: RawEvidenceDocumentRow,
        allInScope: readonly RawEvidenceDocumentRow[],
        docsById: ReadonlyMap<string, RawEvidenceDocumentRow>,
        citationsByDoc: ReadonlyMap<string, number>,
    ): LibraryDocument {
        const versions = this.buildVersions(current, allInScope, docsById);
        return {
            EvidenceDocumentID: current.ID,
            FileName: current.FileName,
            ContentType: current.ContentType,
            UploadedAt: ToIsoString(current.UploadedAt) ?? '',
            UploadedByName: (current.UploadedByUser ?? '').trim() || 'Applicant',
            Status: current.Status,
            ContentHash: current.ContentHash,
            TextStatus: current.TextStatus,
            TextNote: current.TextNote ?? null,
            ReadingStatus: current.ReadingStatus,
            ReadingNote: current.ReadingNote ?? null,
            CitationCount: citationsByDoc.get(current.ID.toLowerCase()) ?? 0,
            Versions: versions,
        };
    }

    private buildVersions(
        current: RawEvidenceDocumentRow,
        allInScope: readonly RawEvidenceDocumentRow[],
        docsById: ReadonlyMap<string, RawEvidenceDocumentRow>,
    ): DocumentVersionInfo[] {
        const inScopeIds = new Set(allInScope.map((d) => d.ID.toLowerCase()));
        const visited = new Set<string>();
        const versions: DocumentVersionInfo[] = [];

        let cursor: RawEvidenceDocumentRow | undefined = current;
        while (cursor != null && !visited.has(cursor.ID.toLowerCase())) {
            visited.add(cursor.ID.toLowerCase());
            versions.push({
                EvidenceDocumentID: cursor.ID,
                UploadedAt: ToIsoString(cursor.UploadedAt) ?? '',
                UploadedByName: (cursor.UploadedByUser ?? '').trim() || 'Applicant',
                ContentHash: cursor.ContentHash,
                OrderIsRecorded: true,
            });
            const nextId = cursor.SupersedesDocumentID?.toLowerCase();
            cursor = nextId != null && inScopeIds.has(nextId) ? docsById.get(nextId) : undefined;
        }

        const unlinked = allInScope.filter((d) => !visited.has(d.ID.toLowerCase()));
        for (const doc of unlinked) {
            versions.push({
                EvidenceDocumentID: doc.ID,
                UploadedAt: ToIsoString(doc.UploadedAt) ?? '',
                UploadedByName: (doc.UploadedByUser ?? '').trim() || 'Applicant',
                ContentHash: doc.ContentHash,
                OrderIsRecorded: false,
            });
        }

        return versions;
    }

    private async runViews(params: RunViewParams[], provider: IMetadataProvider, user: UserInfo): Promise<unknown[][]> {
        const results = await RunView.FromMetadataProvider(provider).RunViews<unknown>(params, user);
        const failed = results.find((r) => !r.Success);
        if (failed != null) {
            throw new Error(failed.ErrorMessage || 'Could not load document library.');
        }
        return results.map((r) => r.Results ?? []);
    }
}
