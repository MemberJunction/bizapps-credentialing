/**
 * The reads Program Studio makes, and the row shapes its widgets display.
 *
 * Three calls in all: the program list (one view), then a program in two `RunViews` calls — first
 * the program, its versions and the user's accrediting organizations; then every version's sections,
 * standards and document requirements, and the committees of the program's organization. It takes two
 * because the second read is filtered by IDs the first returns: MJAPI refuses a browser filter that
 * reads a row-level-security filtered view in a subquery (`Invalid ExtraFilter: entity … is
 * row-level-security filtered for you`), so the filters carry literal ID lists instead.
 *
 * Display rows are `simple` with only the fields shown; versions are entity objects because their
 * settings and status are edited and saved here. A section, standard or document requirement is
 * loaded as an entity object only when it is opened for editing.
 */
import { RunView, type IMetadataProvider, type RunViewParams, type RunViewResult } from '@memberjunction/core';
import { EscapeSQLString } from '@memberjunction/global';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingAccreditingOrganizationEntity,
    mjBizAppsCredentialingDocumentRequirementEntity,
    mjBizAppsCredentialingProgramEntity,
    mjBizAppsCredentialingProgramVersionEntity,
    mjBizAppsCredentialingSectionEntity,
    mjBizAppsCredentialingStandardEntity,
} from '@mj-biz-apps/credentialing-entities';
import type { mjBizAppsCommitteesCommitteeEntity } from '@mj-biz-apps/committees-entities';

/** The committees entity, owned by BizApps Committees. */
export const COMMITTEE_ENTITY = 'Committees: Committees';

export type ProgramListRow = Pick<
    mjBizAppsCredentialingProgramEntity,
    'ID' | 'Name' | 'ProgramType' | 'CredentialPrefix' | 'AccreditingOrganization' | 'Status'
>;
export type ProgramRow = Pick<
    mjBizAppsCredentialingProgramEntity,
    'ID' | 'Name' | 'Description' | 'ProgramType' | 'SubjectType' | 'SubjectNoun' | 'CredentialPrefix' | 'AccreditingOrganizationID' | 'AccreditingOrganization' | 'Status'
>;
export type SectionRow = Pick<mjBizAppsCredentialingSectionEntity, 'ID' | 'ProgramVersionID' | 'Number' | 'Name' | 'Description' | 'Sequence'>;
export type StandardRow = Pick<
    mjBizAppsCredentialingStandardEntity,
    'ID' | 'SectionID' | 'ProgramVersionID' | 'Code' | 'Statement' | 'ResponseType' | 'IntakeMode' | 'EvaluationMode' | 'IsInterpretive' | 'IsEligibility' | 'Sequence'
>;
export type RequirementRow = Pick<
    mjBizAppsCredentialingDocumentRequirementEntity,
    'ID' | 'ProgramVersionID' | 'Name' | 'Description' | 'IsRequired' | 'SensitivityPolicy' | 'Sequence'
>;
export type OrganizationRow = Pick<mjBizAppsCredentialingAccreditingOrganizationEntity, 'ID' | 'OrganizationID'>;
export type CommitteeRow = Pick<mjBizAppsCommitteesCommitteeEntity, 'ID' | 'Name' | 'Status'>;

const PROGRAM_LIST_FIELDS: (keyof ProgramListRow)[] = ['ID', 'Name', 'ProgramType', 'CredentialPrefix', 'AccreditingOrganization', 'Status'];
const PROGRAM_FIELDS: (keyof ProgramRow)[] = [
    'ID', 'Name', 'Description', 'ProgramType', 'SubjectType', 'SubjectNoun', 'CredentialPrefix', 'AccreditingOrganizationID', 'AccreditingOrganization', 'Status',
];
const SECTION_FIELDS: (keyof SectionRow)[] = ['ID', 'ProgramVersionID', 'Number', 'Name', 'Description', 'Sequence'];
const STANDARD_FIELDS: (keyof StandardRow)[] = [
    'ID', 'SectionID', 'ProgramVersionID', 'Code', 'Statement', 'ResponseType', 'IntakeMode', 'EvaluationMode', 'IsInterpretive', 'IsEligibility', 'Sequence',
];
const REQUIREMENT_FIELDS: (keyof RequirementRow)[] = ['ID', 'ProgramVersionID', 'Name', 'Description', 'IsRequired', 'SensitivityPolicy', 'Sequence'];
const ORGANIZATION_FIELDS: (keyof OrganizationRow)[] = ['ID', 'OrganizationID'];
const COMMITTEE_FIELDS: (keyof CommitteeRow)[] = ['ID', 'Name', 'Status'];

/** Everything Program Studio shows for one program. */
export interface ProgramBundle {
    Program: ProgramRow;
    /** Newest first. */
    Versions: mjBizAppsCredentialingProgramVersionEntity[];
    Sections: SectionRow[];
    Standards: StandardRow[];
    Requirements: RequirementRow[];
    Committees: CommitteeRow[];
}

/** What a program load found: the program, or that it does not exist for this user. */
export type ProgramLoad = { Found: true; Bundle: ProgramBundle } | { Found: false };

/** A way to run views as the signed-in user. A `RunView` over `ProviderToUse` satisfies it. */
export interface StudioDataSource {
    RunViews<T>(params: RunViewParams[]): Promise<RunViewResult<T>[]>;
}

/** One row of any view the program load reads. */
type BundleRow = ProgramRow | OrganizationRow | mjBizAppsCredentialingProgramVersionEntity | SectionRow | StandardRow | RequirementRow | CommitteeRow;

export class StudioData {
    constructor(private readonly source: StudioDataSource) {}

    /** Reads through `provider` (a component's `ProviderToUse`). */
    public static ForProvider(provider: IMetadataProvider): StudioData {
        const runView = RunView.FromMetadataProvider(provider);
        return new StudioData({ RunViews: <T>(params: RunViewParams[]) => runView.RunViews<T>(params) });
    }

    /** The programs the user can read (the row filter limits them to the user's organizations), by name. */
    public async ProgramList(): Promise<ProgramListRow[]> {
        const [result] = await this.source.RunViews<ProgramListRow>([
            { EntityName: CredentialingEntity.Program, Fields: PROGRAM_LIST_FIELDS, OrderBy: 'Name', ResultType: 'simple' },
        ]);
        StudioData.throwIfFailed([result]);
        return result.Results;
    }

    /** The program and everything under it, in two calls. A program the user cannot read is not found. */
    public async LoadProgram(programID: string): Promise<ProgramLoad> {
        const first = await this.source.RunViews<BundleRow>(StudioData.ProgramParams(programID));
        StudioData.throwIfFailed(first);
        const [program, versions, organizations] = first;
        if (program.Results.length === 0) {
            return { Found: false };
        }
        const programRow = program.Results[0] as ProgramRow;
        const versionRows = versions.Results as mjBizAppsCredentialingProgramVersionEntity[];
        const organization = (organizations.Results as OrganizationRow[]).find((o) => o.ID.toLowerCase() === programRow.AccreditingOrganizationID.toLowerCase());
        const second = await this.source.RunViews<BundleRow>(StudioData.TreeParams(versionRows.map((v) => v.ID), organization?.OrganizationID ?? null));
        StudioData.throwIfFailed(second);
        const [sections, standards, requirements, committees] = second;
        return {
            Found: true,
            Bundle: {
                Program: programRow,
                Versions: versionRows,
                Sections: sections.Results as SectionRow[],
                Standards: standards.Results as StandardRow[],
                Requirements: requirements.Results as RequirementRow[],
                Committees: committees.Results as CommitteeRow[],
            },
        };
    }

    /** The first call: the program, its versions, and the accrediting organizations the user can read. */
    public static ProgramParams(programID: string): RunViewParams[] {
        const id = EscapeSQLString(programID);
        return [
            { EntityName: CredentialingEntity.Program, Fields: PROGRAM_FIELDS, ExtraFilter: `ID = '${id}'`, ResultType: 'simple' },
            { EntityName: CredentialingEntity.ProgramVersion, ExtraFilter: `ProgramID = '${id}'`, OrderBy: '__mj_CreatedAt DESC', ResultType: 'entity_object' },
            { EntityName: CredentialingEntity.AccreditingOrganization, Fields: ORGANIZATION_FIELDS, ResultType: 'simple' },
        ];
    }

    /**
     * The second call: the versions' sections, standards and requirements, and the committees owned by
     * the program's Common organization (none when it is unknown).
     */
    public static TreeParams(versionIDs: readonly string[], commonOrganizationID: string | null): RunViewParams[] {
        const underVersions = StudioData.inList('ProgramVersionID', versionIDs);
        const committees = commonOrganizationID ? `OrganizationID = '${EscapeSQLString(commonOrganizationID)}'` : '1 = 0';
        return [
            { EntityName: CredentialingEntity.Section, Fields: SECTION_FIELDS, ExtraFilter: underVersions, OrderBy: 'Sequence, Number', ResultType: 'simple' },
            { EntityName: CredentialingEntity.Standard, Fields: STANDARD_FIELDS, ExtraFilter: underVersions, OrderBy: 'Sequence, Code', ResultType: 'simple' },
            { EntityName: CredentialingEntity.DocumentRequirement, Fields: REQUIREMENT_FIELDS, ExtraFilter: underVersions, OrderBy: 'Sequence, Name', ResultType: 'simple' },
            { EntityName: COMMITTEE_ENTITY, Fields: COMMITTEE_FIELDS, ExtraFilter: committees, OrderBy: 'Name', ResultType: 'simple' },
        ];
    }

    /** `column IN ('a', 'b')`, or a filter matching nothing for an empty list. */
    private static inList(column: string, ids: readonly string[]): string {
        if (ids.length === 0) {
            return '1 = 0';
        }
        return `${column} IN (${ids.map((id) => `'${EscapeSQLString(id)}'`).join(', ')})`;
    }

    private static throwIfFailed<T>(results: RunViewResult<T>[]): void {
        const failed = results.find((r) => !r || !r.Success);
        if (failed) {
            throw new Error(failed.ErrorMessage || 'Program Studio could not load its data.');
        }
    }
}
