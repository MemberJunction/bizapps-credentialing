import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IMetadataProvider, RunViewParams, UserInfo } from '@memberjunction/core';
import { CredentialingEntity, NOT_FOUND_REASON } from '@mj-biz-apps/credentialing-core';

const APP_ID = '11111111-1111-4111-8111-111111111111';
const SUB_ID = '22222222-2222-4222-8222-222222222222';
const VER_ID = '33333333-3333-4333-8333-333333333333';
const PROG_ID = '44444444-4444-4444-8444-444444444444';
const RESP_ID = '55555555-5555-4555-8555-555555555555';
const STD_ID = '66666666-6666-4666-8666-666666666666';
const DOC_ID = '77777777-7777-4777-8777-777777777777';
const REQ_ID = '88888888-8888-4888-8888-888888888888';

interface BatchCall {
    kind: 'RunView' | 'RunViews';
    params: RunViewParams[];
    user: UserInfo | undefined;
}

const calls: BatchCall[] = [];
const rowsByEntity = new Map<string, object[]>();

vi.mock('@memberjunction/core', () => {
    class BaseRemotableOperation {}
    class RemoteOperationError extends Error {
        constructor(public readonly ResultCode: string, message: string) {
            super(message);
        }
    }
    const runView = {
        async RunView(param: RunViewParams, user?: UserInfo) {
            calls.push({ kind: 'RunView', params: [param], user });
            return { Success: true, Results: rowsByEntity.get(param.EntityName) ?? [] };
        },
        async RunViews(params: RunViewParams[], user?: UserInfo) {
            calls.push({ kind: 'RunViews', params, user });
            return params.map((p) => ({ Success: true, Results: rowsByEntity.get(p.EntityName) ?? [] }));
        },
    };
    return {
        BaseEntity: class {},
        BaseRemotableOperation,
        RemoteOperationError,
        LogError: vi.fn(),
        RunView: { FromMetadataProvider: () => runView },
    };
});

vi.mock('../guards/SystemUser.js', () => ({
    SystemUser: {
        Get: () => ({ ID: 'SYS-1', Email: 'system@example.test', Type: 'Owner' }),
    },
}));

const { SubjectAccess } = await import('../guards/SubjectAccess.js');
const { DocumentFreeze } = await import('../evidence/DocumentFreeze.js');

const caller = { ID: 'U-CALLER', Email: 'caller@example.test' } as UserInfo;
const provider = {} as IMetadataProvider;

beforeEach(() => {
    calls.length = 0;
    rowsByEntity.clear();
});

describe('Batched RunViews in SubjectAccess and DocumentFreeze', () => {
    it('SubjectAccess.Application loads Application + Subject in ONE caller RunViews call, then Version + Program in ONE system RunViews call', async () => {
        rowsByEntity.set(CredentialingEntity.Application, [{ ID: APP_ID, SubjectID: SUB_ID, ProgramVersionID: VER_ID }]);
        rowsByEntity.set(CredentialingEntity.Subject, [{ ID: SUB_ID }]);
        rowsByEntity.set(CredentialingEntity.ProgramVersion, [{ ID: VER_ID, ProgramID: PROG_ID }]);
        rowsByEntity.set(CredentialingEntity.Program, [{ ID: PROG_ID }]);

        const access = await SubjectAccess.Application(APP_ID, provider, caller);
        expect(access.Application.ID).toBe(APP_ID);
        expect(access.Subject.ID).toBe(SUB_ID);
        expect(access.Version.ID).toBe(VER_ID);
        expect(access.Program.ID).toBe(PROG_ID);

        expect(calls).toHaveLength(2);
        expect(calls[0].kind).toBe('RunViews');
        expect(calls[0].user).toBe(caller);
        expect(calls[0].params.map((p) => p.EntityName)).toEqual([
            CredentialingEntity.Application,
            CredentialingEntity.Subject,
        ]);
        expect(calls[1].kind).toBe('RunViews');
        expect(calls[1].user?.Email).toBe('system@example.test');
        expect(calls[1].params.map((p) => p.EntityName)).toEqual([
            CredentialingEntity.ProgramVersion,
            CredentialingEntity.Program,
        ]);
    });

    it('SubjectAccess.Application refuses before any system read when caller RLS returns no application', async () => {
        rowsByEntity.set(CredentialingEntity.Application, []);
        rowsByEntity.set(CredentialingEntity.Subject, [{ ID: SUB_ID }]);

        await expect(SubjectAccess.Application(APP_ID, provider, caller)).rejects.toThrow(NOT_FOUND_REASON);
        expect(calls).toHaveLength(1);
        expect(calls[0].user).toBe(caller);
    });

    it('SubjectAccess.Response batches Response + Application as caller, then Standard + Version as system', async () => {
        rowsByEntity.set(CredentialingEntity.StandardResponse, [{ ID: RESP_ID, ApplicationID: APP_ID, StandardID: STD_ID }]);
        rowsByEntity.set(CredentialingEntity.Application, [{ ID: APP_ID, ProgramVersionID: VER_ID }]);
        rowsByEntity.set(CredentialingEntity.Standard, [{ ID: STD_ID }]);
        rowsByEntity.set(CredentialingEntity.ProgramVersion, [{ ID: VER_ID }]);

        const access = await SubjectAccess.Response(RESP_ID, provider, caller);
        expect(access.Response.ID).toBe(RESP_ID);
        expect(access.Application.ID).toBe(APP_ID);
        expect(calls).toHaveLength(2);
        expect(calls[0].kind).toBe('RunViews');
        expect(calls[0].user).toBe(caller);
        expect(calls[1].kind).toBe('RunViews');
        expect(calls[1].user?.Email).toBe('system@example.test');
    });

    it('SubjectAccess.Document batches Document + Subject in ONE caller RunViews call', async () => {
        rowsByEntity.set(CredentialingEntity.EvidenceDocument, [{ ID: DOC_ID, SubjectID: SUB_ID }]);
        rowsByEntity.set(CredentialingEntity.Subject, [{ ID: SUB_ID }]);

        const access = await SubjectAccess.Document(DOC_ID, provider, caller);
        expect(access.Document.ID).toBe(DOC_ID);
        expect(access.Subject.ID).toBe(SUB_ID);
        expect(calls).toHaveLength(1);
        expect(calls[0].kind).toBe('RunViews');
        expect(calls[0].user).toBe(caller);
    });

    it('SubjectAccess.Requirement batches DocumentRequirement + Application hold check in ONE system RunViews call', async () => {
        rowsByEntity.set(CredentialingEntity.DocumentRequirement, [{ ID: REQ_ID, ProgramVersionID: VER_ID }]);
        rowsByEntity.set(CredentialingEntity.Application, [{ ID: APP_ID }]);

        const req = await SubjectAccess.Requirement(REQ_ID, SUB_ID, provider);
        expect(req.ID).toBe(REQ_ID);
        expect(calls).toHaveLength(1);
        expect(calls[0].kind).toBe('RunViews');
        expect(calls[0].params.map((p) => p.EntityName)).toEqual([
            CredentialingEntity.DocumentRequirement,
            CredentialingEntity.Application,
        ]);
    });

    it('DocumentFreeze.Statuses resolves frozen application statuses in a single caller RunView', async () => {
        rowsByEntity.set(CredentialingEntity.Application, [{ Status: 'Draft' }, { Status: 'Submitted' }]);

        const statuses = await DocumentFreeze.Statuses('EvidenceDocumentID', DOC_ID, provider, caller);
        expect(statuses).toEqual(['Draft', 'Submitted']);
        expect(calls).toHaveLength(1);
        expect(calls[0].user).toBe(caller);
        expect(calls[0].params[0].EntityName).toBe(CredentialingEntity.Application);
        expect(calls[0].params[0].ExtraFilter).toContain(`ad.EvidenceDocumentID = '${DOC_ID}'`);
    });
});
