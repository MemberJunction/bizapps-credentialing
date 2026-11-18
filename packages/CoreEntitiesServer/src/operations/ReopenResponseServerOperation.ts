import { BaseRemotableOperation, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import {
    CREDENTIALING_STAFF_ROLE,
    CredentialingOperation,
    NOT_FOUND_REASON,
    ReopenResponseOperation,
    ResponseRules,
    type ReopenResponseInput,
    type ResponseOutput,
} from '@mj-biz-apps/credentialing-core';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite } from '../guards/OperationWrite.js';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { OperationSupport } from './OperationSupport.js';
import { LoadWorkspaceResponseByID, RequireRule } from './ResponseWorkspaceHelper.js';

const ONLY_STAFF_REOPEN_REASON = "Only the program's staff can reopen a confirmed answer.";

@RegisterClass(BaseRemotableOperation, CredentialingOperation.ReopenResponse)
export class ReopenResponseServerOperation extends ReopenResponseOperation {
    protected override async Authorize(_input: ReopenResponseInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE);
    }

    protected override async InternalExecute(
        input: ReopenResponseInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<ResponseOutput> {
        const initial = await SubjectAccess.Response(input.ResponseID, provider, user);
        const subject = await SubjectAccess.Subject(initial.Application.SubjectID, provider, user);
        const actor = await SubjectAccess.ActorFor(user, subject, provider);
        if (actor == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        if (actor !== 'Staff') {
            OperationSupport.Refuse(ONLY_STAFF_REOPEN_REASON);
        }

        return OperationWrite.Run(provider, async (scope) => {
            await AuthoringLock.ForSubject(subject.ID, provider, user);
            await AuthoringLock.ForApplication(initial.Application.ID, provider, user);

            const fresh = await SubjectAccess.Response(input.ResponseID, provider, user);
            RequireRule(
                ResponseRules.CanReopen(
                    fresh.Application.Status,
                    {
                        Status: fresh.Response.Status,
                        AuthorType: fresh.Response.AuthorType,
                        ResponseText: fresh.Response.ResponseText,
                        SelfAssessment: fresh.Response.SelfAssessment,
                    },
                    input.Reason,
                ),
            );

            fresh.Response.Status = 'Drafted';
            fresh.Response.ReopenReason = input.Reason.trim();
            fresh.Response.ConfirmedByUserID = null;
            fresh.Response.ConfirmedAt = null;
            fresh.Response.IsStale = false;
            await scope.Save(fresh.Response);

            const loaded = await LoadWorkspaceResponseByID(fresh.Response.ID, subject.ID, provider, user);
            return { Response: loaded };
        });
    }
}
