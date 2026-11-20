/**
 * Server body of `Credentialing.GetMySubjects`: returns the subjects for which the caller holds a
 * `SubjectContact` row, together with their non-historical applications and response progress
 * counts.
 *
 * Reads the caller's subjects, applications, and responses as the caller (enforcing row-level
 * security), then reads only the referenced `ProgramVersion`, `Program`, and `Standard` count rows
 * as the system user (applicants hold no permission on authoring entities, Decision 3).
 */
import { BaseRemotableOperation, RunView, type IMetadataProvider, type RunViewParams, type UserInfo } from '@memberjunction/core';
import { EscapeSQLString, RegisterClass } from '@memberjunction/global';
import {
    CREDENTIALING_APPLICANT_ROLE,
    CredentialingEntity,
    CredentialingOperation,
    GetMySubjectsOperation,
    type ApplicationStatus,
    type GetMySubjectsInput,
    type GetMySubjectsOutput,
    type MyApplication,
    type MySubject,
} from '@mj-biz-apps/credentialing-core';
import { SystemUser } from '../guards/SystemUser.js';
import { OperationSupport } from './OperationSupport.js';

interface RawSubjectRow {
    ID: string;
    DisplayName: string;
    SubjectType: string;
}

interface RawApplicationRow {
    ID: string;
    SubjectID: string;
    ProgramVersionID: string;
    Status: ApplicationStatus;
    SubmittedAt: Date | string | null;
}

interface RawResponseCountRow {
    ApplicationID: string;
    Status: string;
}

interface RawVersionRow {
    ID: string;
    ProgramID: string;
    Label: string;
}

interface RawProgramRow {
    ID: string;
    Name: string;
    SubjectNoun: string;
    AccreditingOrganization: string;
}

interface RawStandardIdRow {
    ID: string;
    ProgramVersionID: string;
}

const SUBJECT_CONTACT_VIEW = '[__mj_BizAppsCredentialing].[vwSubjectContacts]';
const PROGRAM_VERSIONS_VIEW = '[__mj_BizAppsCredentialing].[vwProgramVersions]';

function toIsoStringOrNull(value: Date | string | null | undefined): string | null {
    if (value == null) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
    const trimmed = String(value).trim();
    return trimmed.length > 0 ? trimmed : null;
}

function sqlInUUIDs(ids: Iterable<string>): string {
    return Array.from(new Set(Array.from(ids).map((id) => `'${EscapeSQLString(id)}'`))).join(', ');
}

@RegisterClass(BaseRemotableOperation, CredentialingOperation.GetMySubjects)
export class GetMySubjectsServerOperation extends GetMySubjectsOperation {
    protected override async Authorize(_input: GetMySubjectsInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE);
    }

    protected override async InternalExecute(
        _input: GetMySubjectsInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<GetMySubjectsOutput> {
        const userFilter = `SELECT c.SubjectID FROM ${SUBJECT_CONTACT_VIEW} c WHERE c.UserID = '${EscapeSQLString(user.ID)}'`;
        const callerResults = await this.runViews(
            [
                {
                    EntityName: CredentialingEntity.Subject,
                    ExtraFilter: `ID IN (${userFilter})`,
                    Fields: ['ID', 'DisplayName', 'SubjectType'],
                    OrderBy: 'DisplayName ASC',
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.Application,
                    ExtraFilter: `SubjectID IN (${userFilter}) AND IsHistorical = 0`,
                    Fields: ['ID', 'SubjectID', 'ProgramVersionID', 'Status', 'SubmittedAt'],
                    OrderBy: '__mj_CreatedAt DESC',
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.StandardResponse,
                    ExtraFilter: `SubjectID IN (${userFilter})`,
                    Fields: ['ApplicationID', 'Status'],
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
            ],
            provider,
            user,
        );

        const rawSubjects = (callerResults[0] ?? []) as RawSubjectRow[];
        if (rawSubjects.length === 0) {
            return { Subjects: [] };
        }

        const rawApps = (callerResults[1] ?? []) as RawApplicationRow[];
        const rawResponses = (callerResults[2] ?? []) as RawResponseCountRow[];

        if (rawApps.length === 0) {
            return {
                Subjects: rawSubjects.map((s) => ({
                    SubjectID: s.ID,
                    DisplayName: s.DisplayName,
                    SubjectType: s.SubjectType,
                    Applications: [],
                })),
            };
        }

        const versionInList = sqlInUUIDs(rawApps.map((a) => a.ProgramVersionID));
        const system = SystemUser.Get('Reading program metadata for applicant subjects');
        const systemResults = await this.runViews(
            [
                {
                    EntityName: CredentialingEntity.ProgramVersion,
                    ExtraFilter: `ID IN (${versionInList})`,
                    Fields: ['ID', 'ProgramID', 'Label'],
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.Program,
                    ExtraFilter: `ID IN (SELECT v.ProgramID FROM ${PROGRAM_VERSIONS_VIEW} v WHERE v.ID IN (${versionInList}))`,
                    Fields: ['ID', 'Name', 'SubjectNoun', 'AccreditingOrganization'],
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
                {
                    EntityName: CredentialingEntity.Standard,
                    ExtraFilter: `ProgramVersionID IN (${versionInList})`,
                    Fields: ['ID', 'ProgramVersionID'],
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
            ],
            provider,
            system,
        );

        const versionsById = new Map<string, RawVersionRow>();
        for (const v of (systemResults[0] ?? []) as RawVersionRow[]) {
            versionsById.set(v.ID.toLowerCase(), v);
        }
        const programsById = new Map<string, RawProgramRow>();
        for (const p of (systemResults[1] ?? []) as RawProgramRow[]) {
            programsById.set(p.ID.toLowerCase(), p);
        }
        const standardCountByVersion = new Map<string, number>();
        for (const st of (systemResults[2] ?? []) as RawStandardIdRow[]) {
            const key = st.ProgramVersionID.toLowerCase();
            standardCountByVersion.set(key, (standardCountByVersion.get(key) ?? 0) + 1);
        }

        const responseCountsByApp = new Map<string, { Confirmed: number; Total: number }>();
        for (const r of rawResponses) {
            const key = r.ApplicationID.toLowerCase();
            const entry = responseCountsByApp.get(key) ?? { Confirmed: 0, Total: 0 };
            entry.Total += 1;
            if (r.Status === 'Confirmed') {
                entry.Confirmed += 1;
            }
            responseCountsByApp.set(key, entry);
        }

        const appsBySubject = new Map<string, MyApplication[]>();
        for (const app of rawApps) {
            const version = versionsById.get(app.ProgramVersionID.toLowerCase());
            const program = version ? programsById.get(version.ProgramID.toLowerCase()) : undefined;
            const counts = responseCountsByApp.get(app.ID.toLowerCase()) ?? { Confirmed: 0, Total: 0 };
            const standardCount = standardCountByVersion.get(app.ProgramVersionID.toLowerCase()) ?? counts.Total;
            const summary: MyApplication = {
                ApplicationID: app.ID,
                ProgramName: program?.Name ?? '',
                VersionLabel: version?.Label ?? '',
                OrganizationName: program?.AccreditingOrganization ?? '',
                SubjectNoun: program?.SubjectNoun ?? '',
                Status: app.Status,
                SubmittedAt: toIsoStringOrNull(app.SubmittedAt),
                ConfirmedCount: counts.Confirmed,
                StandardCount: standardCount,
            };
            const subjectKey = app.SubjectID.toLowerCase();
            const list = appsBySubject.get(subjectKey) ?? [];
            list.push(summary);
            appsBySubject.set(subjectKey, list);
        }

        const subjects: MySubject[] = rawSubjects.map((s) => ({
            SubjectID: s.ID,
            DisplayName: s.DisplayName,
            SubjectType: s.SubjectType,
            Applications: appsBySubject.get(s.ID.toLowerCase()) ?? [],
        }));

        return { Subjects: subjects };
    }

    private async runViews(params: RunViewParams[], provider: IMetadataProvider, user: UserInfo): Promise<unknown[][]> {
        const results = await RunView.FromMetadataProvider(provider).RunViews<unknown>(params, user);
        const failed = results.find((r) => !r.Success);
        if (failed != null) {
            throw new Error(failed.ErrorMessage || 'Could not load subject applications.');
        }
        return results.map((r) => r.Results ?? []);
    }
}
