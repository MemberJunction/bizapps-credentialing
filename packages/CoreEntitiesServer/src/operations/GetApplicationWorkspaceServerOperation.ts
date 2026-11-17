/**
 * Server body of `Credentialing.GetApplicationWorkspace`: authorizes the caller with
 * `SubjectAccess.Application`, reads the version's sections, standards, and response sources as the
 * system user in one `RunViews` batch (Decision 3), reads the application's responses, citations,
 * and extractions as the caller in one `RunViews` batch, and projects only the applicant-safe
 * read-model fields.
 */
import { BaseRemotableOperation, RunView, type IMetadataProvider, type RunViewParams, type UserInfo } from '@memberjunction/core';
import { EscapeSQLString, RegisterClass } from '@memberjunction/global';
import {
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_STAFF_ROLE,
    CredentialingEntity,
    CredentialingOperation,
    GetApplicationWorkspaceOperation,
    type ApplicationWorkspace,
    type GetApplicationWorkspaceInput,
    type WorkspaceSection,
    type WorkspaceStandard,
} from '@mj-biz-apps/credentialing-core';
import { SubjectAccess, type ApplicationAccess } from '../guards/SubjectAccess.js';
import { SystemUser } from '../guards/SystemUser.js';
import { OperationSupport } from './OperationSupport.js';
import {
    BuildWorkspaceResponse,
    CITATION_WORKSPACE_FIELDS,
    EXTRACTION_WORKSPACE_FIELDS,
    RESPONSE_WORKSPACE_FIELDS,
    ToIsoString,
    type RawCitationRow,
    type RawExtractionRow,
    type RawResponseRow,
} from './ResponseWorkspaceHelper.js';

interface RawSectionRow {
    ID: string;
    Number: string;
    Name: string;
    Description: string | null;
    Sequence: number;
}

interface RawStandardRow {
    ID: string;
    SectionID: string;
    Code: string;
    Statement: string;
    Guidance: string | null;
    ResponseType: string;
    IntakeMode: string;
    IsEligibility: boolean;
    IsNewForVersion: boolean;
    EvidenceHint: string | null;
    Sequence: number;
}

interface RawResponseSourceRow {
    ID: string;
    Mode: string;
}

const STANDARD_RESPONSES_VIEW = '[__mj_BizAppsCredentialing].[vwStandardResponses]';

@RegisterClass(BaseRemotableOperation, CredentialingOperation.GetApplicationWorkspace)
export class GetApplicationWorkspaceServerOperation extends GetApplicationWorkspaceOperation {
    protected override async Authorize(_input: GetApplicationWorkspaceInput, user: UserInfo): Promise<boolean> {
        return (
            OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE) ||
            OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE)
        );
    }

    protected override async InternalExecute(
        input: GetApplicationWorkspaceInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<ApplicationWorkspace> {
        const access = await SubjectAccess.Application(input.ApplicationID, provider, user);
        const versionID = EscapeSQLString(access.Version.ID);
        const applicationID = EscapeSQLString(access.Application.ID);
        const subjectID = EscapeSQLString(access.Subject.ID);

        const system = SystemUser.Get('Reading program sections and standards for an application workspace');
        const [systemResults, callerResults] = await Promise.all([
            this.runViews(
                [
                    {
                        EntityName: CredentialingEntity.Section,
                        ExtraFilter: `ProgramVersionID = '${versionID}'`,
                        Fields: ['ID', 'Number', 'Name', 'Description', 'Sequence'],
                        OrderBy: 'Sequence ASC, Number ASC',
                        ResultType: 'simple',
                        SkipTotalRowCount: true,
                    },
                    {
                        EntityName: CredentialingEntity.Standard,
                        ExtraFilter: `ProgramVersionID = '${versionID}'`,
                        Fields: [
                            'ID',
                            'SectionID',
                            'Code',
                            'Statement',
                            'Guidance',
                            'ResponseType',
                            'IntakeMode',
                            'IsEligibility',
                            'IsNewForVersion',
                            'EvidenceHint',
                            'Sequence',
                        ],
                        OrderBy: 'Sequence ASC, Code ASC',
                        ResultType: 'simple',
                        SkipTotalRowCount: true,
                    },
                    {
                        EntityName: CredentialingEntity.ResponseSource,
                        ExtraFilter: `ProgramVersionID = '${versionID}'`,
                        Fields: ['ID', 'Mode'],
                        ResultType: 'simple',
                        SkipTotalRowCount: true,
                    },
                ],
                provider,
                system,
            ),
            this.runViews(
                [
                    {
                        EntityName: CredentialingEntity.StandardResponse,
                        ExtraFilter: `ApplicationID = '${applicationID}'`,
                        Fields: RESPONSE_WORKSPACE_FIELDS,
                        ResultType: 'simple',
                        SkipTotalRowCount: true,
                    },
                    {
                        EntityName: CredentialingEntity.ResponseCitation,
                        ExtraFilter: `StandardResponseID IN (SELECT r.ID FROM ${STANDARD_RESPONSES_VIEW} r WHERE r.ApplicationID = '${applicationID}')`,
                        Fields: CITATION_WORKSPACE_FIELDS,
                        ResultType: 'simple',
                        SkipTotalRowCount: true,
                    },
                    {
                        EntityName: CredentialingEntity.Extraction,
                        ExtraFilter: `SubjectID = '${subjectID}' AND IsSuperseded = 0`,
                        Fields: EXTRACTION_WORKSPACE_FIELDS,
                        ResultType: 'simple',
                        SkipTotalRowCount: true,
                    },
                ],
                provider,
                user,
            ),
        ]);

        const rawSections = (systemResults[0] ?? []) as RawSectionRow[];
        const rawStandards = (systemResults[1] ?? []) as RawStandardRow[];
        const rawSources = (systemResults[2] ?? []) as RawResponseSourceRow[];
        const rawResponses = (callerResults[0] ?? []) as RawResponseRow[];
        const rawCitations = (callerResults[1] ?? []) as RawCitationRow[];
        const rawExtractions = (callerResults[2] ?? []) as RawExtractionRow[];

        return this.assembleWorkspace(access, rawSections, rawStandards, rawSources, rawResponses, rawCitations, rawExtractions);
    }

    private assembleWorkspace(
        access: ApplicationAccess,
        rawSections: RawSectionRow[],
        rawStandards: RawStandardRow[],
        rawSources: RawResponseSourceRow[],
        rawResponses: RawResponseRow[],
        rawCitations: RawCitationRow[],
        rawExtractions: RawExtractionRow[],
    ): ApplicationWorkspace {
        const responsesByStandard = new Map<string, RawResponseRow>();
        let confirmedCount = 0;
        for (const r of rawResponses) {
            responsesByStandard.set(r.StandardID.toLowerCase(), r);
            if (r.Status === 'Confirmed') {
                confirmedCount += 1;
            }
        }

        const citationsByResponse = new Map<string, RawCitationRow[]>();
        for (const c of rawCitations) {
            const key = c.StandardResponseID.toLowerCase();
            const list = citationsByResponse.get(key) ?? [];
            list.push(c);
            citationsByResponse.set(key, list);
        }

        const extractionsById = new Map<string, RawExtractionRow>();
        for (const ex of rawExtractions) {
            extractionsById.set(ex.ID.toLowerCase(), ex);
        }

        const standardsBySection = new Map<string, RawStandardRow[]>();
        for (const st of rawStandards) {
            const key = st.SectionID.toLowerCase();
            const list = standardsBySection.get(key) ?? [];
            list.push(st);
            standardsBySection.set(key, list);
        }

        const sectionsWithOrder = rawSections.map((sec) => {
            const sectionStandards = [...(standardsBySection.get(sec.ID.toLowerCase()) ?? [])].sort((a, b) => {
                if (Boolean(a.IsEligibility) !== Boolean(b.IsEligibility)) {
                    return a.IsEligibility ? -1 : 1;
                }
                return a.Sequence - b.Sequence || a.Code.localeCompare(b.Code);
            });
            const hasEligibility = sectionStandards.some((st) => Boolean(st.IsEligibility));
            const mappedStandards: WorkspaceStandard[] = sectionStandards.map((st) =>
                this.projectStandard(st, responsesByStandard.get(st.ID.toLowerCase()), citationsByResponse, extractionsById),
            );
            const workspaceSection: WorkspaceSection = {
                SectionID: sec.ID,
                Number: sec.Number,
                Name: sec.Name,
                Description: sec.Description ?? null,
                Standards: mappedStandards,
            };
            return { Section: workspaceSection, HasEligibility: hasEligibility, Sequence: sec.Sequence, Number: sec.Number };
        });

        sectionsWithOrder.sort((a, b) => {
            if (a.HasEligibility !== b.HasEligibility) {
                return a.HasEligibility ? -1 : 1;
            }
            return a.Sequence - b.Sequence || a.Number.localeCompare(b.Number);
        });

        const canPrefill = rawSources.some((s) => s.Mode === 'Prefill Only' || s.Mode === 'Both');

        return {
            Application: {
                ApplicationID: access.Application.ID,
                SubjectID: access.Subject.ID,
                ProgramName: access.Program.Name,
                VersionLabel: access.Version.Label,
                OrganizationName: access.Program.AccreditingOrganization,
                SubjectNoun: access.Program.SubjectNoun,
                Status: access.Application.Status,
                SubmittedAt: ToIsoString(access.Application.SubmittedAt),
                ConfirmedCount: confirmedCount,
                StandardCount: rawStandards.length,
                RequiresGoverningBodyAttestation: Boolean(access.Version.RequiresGoverningBodyAttestation),
                WithdrawalReason: access.Application.WithdrawalReason ?? null,
                CanPrefill: canPrefill,
            },
            Sections: sectionsWithOrder.map((entry) => entry.Section),
        };
    }

    private projectStandard(
        st: RawStandardRow,
        resp: RawResponseRow | undefined,
        citationsByResponse: ReadonlyMap<string, RawCitationRow[]>,
        extractionsById: ReadonlyMap<string, RawExtractionRow>,
    ): WorkspaceStandard {
        const respCitations = resp ? (citationsByResponse.get(resp.ID.toLowerCase()) ?? []) : [];
        const response: WorkspaceStandard['Response'] = resp
            ? BuildWorkspaceResponse(resp, respCitations, extractionsById)
            : {
                  ResponseID: '',
                  Status: 'Empty',
                  ResponseText: null,
                  SelfAssessment: null,
                  AuthorType: 'Human',
                  ConfirmedByName: null,
                  ConfirmedAt: null,
                  UpdatedAt: '',
                  SourceType: null,
                  SourceLabel: null,
                  SourceRetrievedAt: null,
                  IsStale: false,
                  ReopenReason: null,
                  Explanation: null,
                  Citations: [],
              };

        return {
            StandardID: st.ID,
            Code: st.Code,
            Statement: st.Statement,
            Guidance: st.Guidance ?? null,
            ResponseType: st.ResponseType,
            IntakeMode: st.IntakeMode,
            IsEligibility: Boolean(st.IsEligibility),
            IsNewForVersion: Boolean(st.IsNewForVersion),
            EvidenceHint: st.EvidenceHint ?? null,
            Response: response,
        };
    }

    private async runViews(params: RunViewParams[], provider: IMetadataProvider, user: UserInfo): Promise<unknown[][]> {
        const results = await RunView.FromMetadataProvider(provider).RunViews<unknown>(params, user);
        const failed = results.find((r) => !r.Success);
        if (failed != null) {
            throw new Error(failed.ErrorMessage || 'Could not load application workspace.');
        }
        return results.map((r) => r.Results ?? []);
    }
}
