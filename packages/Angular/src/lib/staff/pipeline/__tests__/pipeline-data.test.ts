import { describe, expect, it } from 'vitest';
import type { RunViewParams, RunViewResult } from '@memberjunction/core';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import {
    FilterPipelineApplications,
    PIPELINE_PAGE_SIZE,
    PageSlice,
    PipelineData,
    type PipelineApplicationRow,
    type PipelineDataSource,
    PIPELINE_APPLICATION_CONFIG_KEY,
    RequestedPipelineApplicationID,
} from '../pipeline-data';

class StubPipelineSource implements PipelineDataSource {
    public readonly Calls: RunViewParams[][] = [];
    constructor(private readonly responder: (params: RunViewParams) => RunViewResult<Record<string, unknown>>) {}

    public async RunViews<T>(params: RunViewParams[]): Promise<RunViewResult<T>[]> {
        this.Calls.push(params);
        return params.map((p) => this.responder(p) as RunViewResult<T>);
    }
}

function ok(results: Record<string, unknown>[]): RunViewResult<Record<string, unknown>> {
    return { Success: true, Results: results, RowCount: results.length, TotalRowCount: results.length, ExecutionTime: 1, ErrorMessage: '' };
}

const ORG_A = 'A1111111-1111-1111-1111-111111111111';
const PROG_1 = 'F1111111-1111-1111-1111-111111111111';
const PROG_2 = 'F2222222-2222-2222-2222-222222222222';
const VER_1 = 'E1111111-1111-1111-1111-111111111111';
const VER_2 = 'E2222222-2222-2222-2222-222222222222';
const SUB_1 = 'B1111111-1111-1111-1111-111111111111';
const APP_1 = 'C1111111-1111-1111-1111-111111111111';

describe('PipelineData', () => {
    it('loads Applications, Subjects, Subject Contacts, Programs, and Program Versions in one RunViews batch with no per-row reads', async () => {
        const source = new StubPipelineSource((p) => {
            if (p.EntityName === CredentialingEntity.Application) {
                return ok([
                    {
                        ID: APP_1,
                        SubjectID: SUB_1.toLowerCase(),
                        ProgramVersionID: VER_1,
                        Status: 'Draft',
                        IsHistorical: false,
                        SubmittedAt: null,
                        __mj_CreatedAt: '2026-11-17T10:00:00.000Z',
                    },
                ]);
            }
            if (p.EntityName === CredentialingEntity.Subject) {
                return ok([
                    {
                        ID: SUB_1,
                        AccreditingOrganizationID: ORG_A,
                        SubjectType: 'Organization',
                        DisplayName: 'Sample Applicant One',
                        PrimaryEmail: 'org1@example.test',
                        Status: 'Active',
                    },
                ]);
            }
            if (p.EntityName === CredentialingEntity.SubjectContact) {
                return ok([
                    {
                        ID: 'D2222222-2222-2222-2222-222222222222',
                        SubjectID: SUB_1,
                        UserID: 'U2',
                        ContactRole: 'Staff',
                        InvitedByUserID: 'S1',
                        LastInvitedAt: null,
                        User: 'staff.contact@example.test',
                    },
                    {
                        ID: 'D1111111-1111-1111-1111-111111111111',
                        SubjectID: SUB_1,
                        UserID: 'U1',
                        ContactRole: 'Primary',
                        InvitedByUserID: 'S1',
                        LastInvitedAt: '2026-11-17T09:00:00.000Z',
                        User: 'primary.contact@example.test',
                    },
                ]);
            }
            if (p.EntityName === CredentialingEntity.Program) {
                return ok([
                    {
                        ID: PROG_1,
                        Name: 'Sample Applicant Program',
                        ProgramType: 'Recognition',
                        SubjectType: 'Organization',
                        CredentialPrefix: 'SAP',
                        AccreditingOrganizationID: ORG_A,
                        AccreditingOrganization: 'Sample Accrediting Body A',
                        Status: 'Active',
                    },
                    {
                        ID: PROG_2,
                        Name: 'Draft Program',
                        ProgramType: 'Certification',
                        SubjectType: 'Person',
                        CredentialPrefix: 'DP',
                        AccreditingOrganizationID: ORG_A,
                        AccreditingOrganization: 'Sample Accrediting Body A',
                        Status: 'Draft',
                    },
                ]);
            }
            if (p.EntityName === CredentialingEntity.ProgramVersion) {
                return ok([
                    { ID: VER_1, ProgramID: PROG_1, Label: '2026', Status: 'Active', Program: 'Sample Applicant Program' },
                    { ID: VER_2, ProgramID: PROG_2, Label: '2027', Status: 'Draft', Program: 'Draft Program' },
                ]);
            }
            return ok([]);
        });

        const snapshot = await new PipelineData(source).Load();
        expect(source.Calls).toHaveLength(1);
        expect(source.Calls[0].map((p) => p.EntityName)).toEqual([
            CredentialingEntity.Application,
            CredentialingEntity.Subject,
            CredentialingEntity.SubjectContact,
            CredentialingEntity.Program,
            CredentialingEntity.ProgramVersion,
        ]);

        expect(snapshot.Applications).toHaveLength(1);
        const app = snapshot.Applications[0];
        expect(app.SubjectName).toBe('Sample Applicant One');
        expect(app.ProgramName).toBe('Sample Applicant Program');
        expect(app.VersionLabel).toBe('2026');
        expect(app.Contacts.map((c) => c.Email)).toEqual(['primary.contact@example.test', 'staff.contact@example.test']);

        expect(snapshot.ActiveTargets).toHaveLength(1);
        expect(snapshot.ActiveTargets[0].VersionID).toBe(VER_1);
        expect(snapshot.Programs.map((p) => p.ID)).toEqual([PROG_2, PROG_1]);
        expect(snapshot.Subjects).toHaveLength(1);
    });

    it('throws when any view in the batch fails', async () => {
        const source = new StubPipelineSource((p) => {
            if (p.EntityName === CredentialingEntity.Application) {
                return { Success: false, Results: [], RowCount: 0, TotalRowCount: 0, ExecutionTime: 1, ErrorMessage: 'Permission denied.' };
            }
            return ok([]);
        });
        await expect(new PipelineData(source).Load()).rejects.toThrow('Permission denied.');
    });
});

describe('FilterPipelineApplications and PageSlice', () => {
    const sampleRows: PipelineApplicationRow[] = Array.from({ length: 120 }, (_, i) => ({
        ID: `A0000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
        SubjectID: SUB_1,
        SubjectName: `Subject ${i}`,
        SubjectType: 'Organization',
        ProgramVersionID: i % 2 === 0 ? VER_1 : VER_2,
        ProgramID: i % 2 === 0 ? PROG_1 : PROG_2,
        ProgramName: i % 2 === 0 ? 'Program One' : 'Program Two',
        VersionLabel: '2026',
        OrganizationID: ORG_A,
        Status: i % 3 === 0 ? 'Submitted' : 'Draft',
        IsHistorical: false,
        SubmittedAt: i % 3 === 0 ? '2026-11-17T12:00:00.000Z' : null,
        CreatedAt: '2026-11-17T10:00:00.000Z',
        Contacts: [],
    }));

    it('filters by Status and ProgramID using case-insensitive UUID matching', () => {
        const filtered = FilterPipelineApplications(sampleRows, {
            Status: 'Submitted',
            ProgramID: PROG_1.toLowerCase(),
        });
        expect(filtered.length).toBe(20);
        expect(filtered.every((r) => r.Status === 'Submitted' && r.ProgramID === PROG_1)).toBe(true);
    });

    it('pages rows at 50 per page with clamped page index and 1-based display bounds', () => {
        expect(PIPELINE_PAGE_SIZE).toBe(50);
        const page0 = PageSlice(sampleRows, 0);
        expect(page0.Items).toHaveLength(50);
        expect(page0.TotalPages).toBe(3);
        expect(page0.StartIndex).toBe(1);
        expect(page0.EndIndex).toBe(50);

        const page2 = PageSlice(sampleRows, 2);
        expect(page2.Items).toHaveLength(20);
        expect(page2.StartIndex).toBe(101);
        expect(page2.EndIndex).toBe(120);

        const clamped = PageSlice(sampleRows, 99);
        expect(clamped.PageIndex).toBe(2);

        const empty = PageSlice([], 0);
        expect(empty.Items).toHaveLength(0);
        expect(empty.TotalPages).toBe(1);
        expect(empty.StartIndex).toBe(0);
        expect(empty.EndIndex).toBe(0);
    });
});

describe('RequestedPipelineApplicationID', () => {
    const CREDENTIALING_APP = 'D72F9280-EAFE-4DB4-A80C-8E2092B89DD5';
    const APPLICATION = 'FFD1C514-16BB-4FC5-A9CC-15B41592F05D';

    it("ignores Explorer's own applicationId (the MJ app) in the tab configuration", () => {
        expect(RequestedPipelineApplicationID({}, { applicationId: CREDENTIALING_APP, navItemName: 'Pipeline' })).toBeNull();
    });

    it('takes the URL first, then the credentialing key the notification redirect sets', () => {
        expect(RequestedPipelineApplicationID({ applicationId: ` ${APPLICATION} ` }, { applicationId: CREDENTIALING_APP })).toBe(APPLICATION);
        expect(RequestedPipelineApplicationID({}, { applicationId: CREDENTIALING_APP, [PIPELINE_APPLICATION_CONFIG_KEY]: APPLICATION })).toBe(APPLICATION);
        expect(RequestedPipelineApplicationID({}, null)).toBeNull();
    });
});
