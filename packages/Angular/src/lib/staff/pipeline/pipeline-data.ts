/**
 * Read queries, joins, filtering, and 50-row paging for the Staff Pipeline screen.
 *
 * All Pipeline data arrives in a single `RunViews` batch (Applications, Subjects, Subject Contacts,
 * Programs, Program Versions) with `ResultType: 'simple'` and no per-row follow-up reads.
 */
import { RunView, type IMetadataProvider, type RunViewParams, type RunViewResult } from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import {
    CredentialingEngineBase,
    type mjBizAppsCredentialingApplicationEntity,
    type mjBizAppsCredentialingProgramEntity,
    type mjBizAppsCredentialingProgramVersionEntity,
    type mjBizAppsCredentialingSubjectContactEntity,
    type mjBizAppsCredentialingSubjectEntity,
} from '@mj-biz-apps/credentialing-entities';

/** Default page size shared by the Pipeline table and Program Studio's program list. */
export const PIPELINE_PAGE_SIZE = 50;

/** Raw batch-view source injected for unit tests or created from a browser provider. */
export interface PipelineDataSource {
    RunViews<T>(params: RunViewParams[]): Promise<RunViewResult<T>[]>;
}

/** Result of slicing a list to a single page. */
export interface PagedSlice<T> {
    Items: T[];
    PageIndex: number;
    TotalPages: number;
    TotalCount: number;
    StartIndex: number;
    EndIndex: number;
}

/** One contact row displayed under an application on the Pipeline screen. */
export interface PipelineContactRow {
    ID: string;
    SubjectID: string;
    UserID: string;
    Email: string;
    ContactRole: string;
    LastInvitedAt: string | null;
}

/** One joined application row shown in the Pipeline table. */
export interface PipelineApplicationRow {
    ID: string;
    SubjectID: string;
    SubjectName: string;
    SubjectType: string;
    ProgramVersionID: string;
    ProgramID: string;
    ProgramName: string;
    VersionLabel: string;
    OrganizationID: string;
    Status: string;
    IsHistorical: boolean;
    SubmittedAt: string | null;
    SubmissionDispatchNote: string | null;
    CreatedAt: string;
    Contacts: PipelineContactRow[];
}

/** One Active program version available as an invitation target. */
export interface PipelineActiveTarget {
    VersionID: string;
    VersionLabel: string;
    ProgramID: string;
    ProgramName: string;
    ProgramType: string;
    SubjectType: string;
    AccreditingOrganizationID: string;
    AccreditingOrganizationName: string;
}

/** Existing subject option in the Invite Applicant wizard. */
export interface PipelineSubjectOption {
    ID: string;
    DisplayName: string;
    PrimaryEmail: string;
    SubjectType: string;
    AccreditingOrganizationID: string;
    Status: string;
}

/** Filter selections applied to the Pipeline table. */
export interface PipelineFilter {
    Status: string;
    ProgramID: string;
}

/** Complete snapshot loaded by one `RunViews` batch. */
export interface PipelineSnapshot {
    Applications: PipelineApplicationRow[];
    Programs: { ID: string; Name: string }[];
    ActiveTargets: PipelineActiveTarget[];
    Subjects: PipelineSubjectOption[];
}

type RawApplicationRow = Pick<
    mjBizAppsCredentialingApplicationEntity,
    'ID' | 'SubjectID' | 'ProgramVersionID' | 'Status' | 'IsHistorical' | 'SubmittedAt' | 'SubmissionDispatchNote' | '__mj_CreatedAt'
>;
type RawSubjectRow = Pick<
    mjBizAppsCredentialingSubjectEntity,
    'ID' | 'AccreditingOrganizationID' | 'SubjectType' | 'DisplayName' | 'PrimaryEmail' | 'Status'
>;
type RawSubjectContactRow = Pick<
    mjBizAppsCredentialingSubjectContactEntity,
    'ID' | 'SubjectID' | 'UserID' | 'ContactRole' | 'InvitedByUserID' | 'LastInvitedAt' | 'User'
>;
type RawProgramRow = Pick<
    mjBizAppsCredentialingProgramEntity,
    'ID' | 'Name' | 'ProgramType' | 'SubjectType' | 'CredentialPrefix' | 'AccreditingOrganizationID' | 'AccreditingOrganization' | 'Status'
>;
type RawProgramVersionRow = Pick<
    mjBizAppsCredentialingProgramVersionEntity,
    'ID' | 'ProgramID' | 'Label' | 'Status' | 'Program'
>;

/** Slices `items` into a page of `pageSize` rows, clamping `pageIndex` to valid bounds. */
export function PageSlice<T>(items: readonly T[], pageIndex: number, pageSize: number = PIPELINE_PAGE_SIZE): PagedSlice<T> {
    const safeSize = Math.max(1, Math.floor(pageSize));
    const totalCount = items.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / safeSize));
    const safeIndex = Math.min(Math.max(0, Math.floor(pageIndex)), totalPages - 1);
    const offset = safeIndex * safeSize;
    const pageItems = items.slice(offset, offset + safeSize);
    return {
        Items: pageItems,
        PageIndex: safeIndex,
        TotalPages: totalPages,
        TotalCount: totalCount,
        StartIndex: totalCount === 0 ? 0 : offset + 1,
        EndIndex: totalCount === 0 ? 0 : offset + pageItems.length,
    };
}

/** Filters pipeline applications by status and program without mutating the source array. */
export function FilterPipelineApplications(rows: readonly PipelineApplicationRow[], filter: PipelineFilter): PipelineApplicationRow[] {
    const status = filter.Status.trim();
    const programId = filter.ProgramID.trim();
    return rows.filter((row) => {
        if (status.length > 0 && status !== 'All' && row.Status !== status) {
            return false;
        }
        if (programId.length > 0 && programId !== 'All' && !UUIDsEqual(row.ProgramID, programId)) {
            return false;
        }
        return true;
    });
}

function isoStringOrNull(value: Date | string | null | undefined): string | null {
    if (value == null) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
}

/** Optional bounded reference cache for Programs and Program Versions (`CredentialingEngineBase`). */
export interface PipelineReferenceCache {
    Load(forceRefresh: boolean): Promise<{
        Programs: readonly RawProgramRow[];
        Versions: readonly RawProgramVersionRow[];
    }>;
}

/** Reads the Pipeline screen's applications, contacts, programs, Active versions, and subjects in one batch. */
export class PipelineData {
    constructor(
        private readonly source: PipelineDataSource,
        private readonly referenceCache?: PipelineReferenceCache,
    ) {}

    public static FromProvider(provider: IMetadataProvider): PipelineData {
        const rv = RunView.FromMetadataProvider(provider);
        const engineCache: PipelineReferenceCache = {
            async Load(forceRefresh: boolean) {
                const engine = CredentialingEngineBase.Instance;
                await engine.Config(forceRefresh, undefined, provider);
                return {
                    Programs: engine.Programs,
                    Versions: engine.ProgramVersions,
                };
            },
        };
        return new PipelineData(
            { RunViews: <T>(params: RunViewParams[]) => rv.RunViews<T>(params) },
            engineCache,
        );
    }

    public async Load(forceRefresh = false): Promise<PipelineSnapshot> {
        const transactionalViews: RunViewParams[] = [
            {
                EntityName: CredentialingEntity.Application,
                Fields: ['ID', 'SubjectID', 'ProgramVersionID', 'Status', 'IsHistorical', 'SubmittedAt', 'SubmissionDispatchNote', '__mj_CreatedAt'],
                OrderBy: '__mj_CreatedAt DESC',
                ResultType: 'simple',
            },
            {
                EntityName: CredentialingEntity.Subject,
                Fields: ['ID', 'AccreditingOrganizationID', 'SubjectType', 'DisplayName', 'PrimaryEmail', 'Status'],
                OrderBy: 'DisplayName ASC',
                ResultType: 'simple',
            },
            {
                EntityName: CredentialingEntity.SubjectContact,
                Fields: ['ID', 'SubjectID', 'UserID', 'ContactRole', 'InvitedByUserID', 'LastInvitedAt', 'User'],
                OrderBy: 'LastInvitedAt DESC',
                ResultType: 'simple',
            },
        ];

        let rawApps: RawApplicationRow[];
        let rawSubjects: RawSubjectRow[];
        let rawContacts: RawSubjectContactRow[];
        let rawPrograms: readonly RawProgramRow[];
        let rawVersions: readonly RawProgramVersionRow[];

        if (this.referenceCache != null) {
            const [results, refs] = await Promise.all([
                this.source.RunViews<Record<string, unknown>>(transactionalViews),
                this.referenceCache.Load(forceRefresh),
            ]);
            for (const r of results) {
                if (!r.Success) {
                    throw new Error(r.ErrorMessage || 'Could not load pipeline data.');
                }
            }
            rawApps = (results[0].Results ?? []) as unknown as RawApplicationRow[];
            rawSubjects = (results[1].Results ?? []) as unknown as RawSubjectRow[];
            rawContacts = (results[2].Results ?? []) as unknown as RawSubjectContactRow[];
            rawPrograms = refs.Programs;
            rawVersions = refs.Versions;
        } else {
            const results = await this.source.RunViews<Record<string, unknown>>([
                ...transactionalViews,
                {
                    EntityName: CredentialingEntity.Program,
                    Fields: ['ID', 'Name', 'ProgramType', 'SubjectType', 'CredentialPrefix', 'AccreditingOrganizationID', 'AccreditingOrganization', 'Status'],
                    OrderBy: 'Name ASC',
                    ResultType: 'simple',
                },
                {
                    EntityName: CredentialingEntity.ProgramVersion,
                    Fields: ['ID', 'ProgramID', 'Label', 'Status', 'Program'],
                    OrderBy: 'Label ASC',
                    ResultType: 'simple',
                },
            ]);
            for (const r of results) {
                if (!r.Success) {
                    throw new Error(r.ErrorMessage || 'Could not load pipeline data.');
                }
            }
            rawApps = (results[0].Results ?? []) as unknown as RawApplicationRow[];
            rawSubjects = (results[1].Results ?? []) as unknown as RawSubjectRow[];
            rawContacts = (results[2].Results ?? []) as unknown as RawSubjectContactRow[];
            rawPrograms = (results[3].Results ?? []) as unknown as RawProgramRow[];
            rawVersions = (results[4].Results ?? []) as unknown as RawProgramVersionRow[];
        }

        const subjectsById = new Map<string, RawSubjectRow>();
        for (const s of rawSubjects) {
            subjectsById.set(s.ID.toLowerCase(), s);
        }

        const contactsBySubject = new Map<string, PipelineContactRow[]>();
        for (const c of rawContacts) {
            const key = c.SubjectID.toLowerCase();
            const list = contactsBySubject.get(key) ?? [];
            list.push({
                ID: c.ID,
                SubjectID: c.SubjectID,
                UserID: c.UserID,
                Email: (c.User ?? '').trim(),
                ContactRole: c.ContactRole,
                LastInvitedAt: isoStringOrNull(c.LastInvitedAt),
            });
            contactsBySubject.set(key, list);
        }
        for (const list of contactsBySubject.values()) {
            list.sort((a, b) => {
                if (a.ContactRole === 'Primary' && b.ContactRole !== 'Primary') return -1;
                if (b.ContactRole === 'Primary' && a.ContactRole !== 'Primary') return 1;
                return a.Email.localeCompare(b.Email);
            });
        }

        const programsById = new Map<string, RawProgramRow>();
        for (const p of rawPrograms) {
            programsById.set(p.ID.toLowerCase(), p);
        }

        const versionsById = new Map<string, RawProgramVersionRow>();
        const activeTargets: PipelineActiveTarget[] = [];
        for (const v of rawVersions) {
            versionsById.set(v.ID.toLowerCase(), v);
            const prog = programsById.get(v.ProgramID.toLowerCase());
            if (v.Status === 'Active' && prog != null) {
                activeTargets.push({
                    VersionID: v.ID,
                    VersionLabel: v.Label,
                    ProgramID: prog.ID,
                    ProgramName: prog.Name,
                    ProgramType: prog.ProgramType,
                    SubjectType: prog.SubjectType,
                    AccreditingOrganizationID: prog.AccreditingOrganizationID,
                    AccreditingOrganizationName: (prog.AccreditingOrganization ?? '').trim(),
                });
            }
        }
        activeTargets.sort((a, b) => a.ProgramName.localeCompare(b.ProgramName) || a.VersionLabel.localeCompare(b.VersionLabel));

        const applications: PipelineApplicationRow[] = rawApps.map((app) => {
            const subject = subjectsById.get(app.SubjectID.toLowerCase());
            const version = versionsById.get(app.ProgramVersionID.toLowerCase());
            const program = version ? programsById.get(version.ProgramID.toLowerCase()) : undefined;
            return {
                ID: app.ID,
                SubjectID: app.SubjectID,
                SubjectName: subject?.DisplayName ?? 'Unknown subject',
                SubjectType: subject?.SubjectType ?? '',
                ProgramVersionID: app.ProgramVersionID,
                ProgramID: program?.ID ?? version?.ProgramID ?? '',
                ProgramName: program?.Name ?? version?.Program ?? 'Unknown program',
                VersionLabel: version?.Label ?? '',
                OrganizationID: subject?.AccreditingOrganizationID ?? program?.AccreditingOrganizationID ?? '',
                Status: app.Status,
                IsHistorical: Boolean(app.IsHistorical),
                SubmittedAt: isoStringOrNull(app.SubmittedAt),
                SubmissionDispatchNote: app.SubmissionDispatchNote ?? null,
                CreatedAt: isoStringOrNull(app.__mj_CreatedAt) ?? '',
                Contacts: contactsBySubject.get(app.SubjectID.toLowerCase()) ?? [],
            };
        });

        const programs = [...rawPrograms]
            .sort((a, b) => a.Name.localeCompare(b.Name))
            .map((p) => ({ ID: p.ID, Name: p.Name }));

        const subjects: PipelineSubjectOption[] = [...rawSubjects]
            .sort((a, b) => a.DisplayName.localeCompare(b.DisplayName))
            .map((s) => ({
                ID: s.ID,
                DisplayName: s.DisplayName,
                PrimaryEmail: s.PrimaryEmail,
                SubjectType: s.SubjectType,
                AccreditingOrganizationID: s.AccreditingOrganizationID,
                Status: s.Status,
            }));

        return {
            Applications: applications,
            Programs: programs,
            ActiveTargets: activeTargets,
            Subjects: subjects,
        };
    }
}

/**
 * The tab-configuration key that carries the credentialing application the Pipeline opens. Explorer
 * itself writes `applicationId` into every tab's configuration — the MJ application (Credentialing)
 * the tab belongs to — so that key never names a credentialing application.
 */
export const PIPELINE_APPLICATION_CONFIG_KEY = 'credentialingApplicationId';

/** The application the Pipeline should open: the URL's `applicationId`, else {@link PIPELINE_APPLICATION_CONFIG_KEY}. */
export function RequestedPipelineApplicationID(
    params: Record<string, string>,
    configuration: Record<string, unknown> | null | undefined,
): string | null {
    const fromParams = params['applicationId']?.trim();
    if (fromParams) {
        return fromParams;
    }
    const fromConfig = configuration?.[PIPELINE_APPLICATION_CONFIG_KEY];
    return typeof fromConfig === 'string' && fromConfig.trim().length > 0 ? fromConfig.trim() : null;
}
