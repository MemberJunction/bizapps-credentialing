import { BaseRemotableOperation, RunView, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { EscapeSQLString, RegisterClass } from '@memberjunction/global';
import {
    ConfirmResponseOperation,
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_STAFF_ROLE,
    CredentialingEntity,
    CredentialingOperation,
    NOT_FOUND_REASON,
    ONLY_APPLICANT_CONFIRM_REASON,
    ResponseRules,
    type ConfirmResponseInput,
    type ResponseOutput,
} from '@mj-biz-apps/credentialing-core';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite } from '../guards/OperationWrite.js';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { OperationSupport } from './OperationSupport.js';
import {
    AssertExpectedUpdatedAt,
    LoadWorkspaceResponseByID,
    RequireRule,
} from './ResponseWorkspaceHelper.js';

@RegisterClass(BaseRemotableOperation, CredentialingOperation.ConfirmResponse)
export class ConfirmResponseServerOperation extends ConfirmResponseOperation {
    protected override async Authorize(_input: ConfirmResponseInput, user: UserInfo): Promise<boolean> {
        return (
            OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE) ||
            OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE)
        );
    }

    protected override async InternalExecute(
        input: ConfirmResponseInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<ResponseOutput> {
        const initial = await SubjectAccess.Response(input.ResponseID, provider, user);
        const subject = await SubjectAccess.Subject(initial.Application.SubjectID, provider, user);
        const actor = await SubjectAccess.ActorFor(user, subject, provider);
        if (actor == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        if (actor !== 'Applicant') {
            OperationSupport.Refuse(ONLY_APPLICANT_CONFIRM_REASON);
        }

        return OperationWrite.Run(provider, async (scope) => {
            await AuthoringLock.ForSubject(subject.ID, provider, user);
            await AuthoringLock.ForApplication(initial.Application.ID, provider, user);

            const fresh = await SubjectAccess.Response(input.ResponseID, provider, user);
            AssertExpectedUpdatedAt(input.ExpectedUpdatedAt, fresh.Response.__mj_UpdatedAt);

            const citationRes = await RunView.FromMetadataProvider(provider).RunView<{ ID: string }>(
                {
                    EntityName: CredentialingEntity.ResponseCitation,
                    ExtraFilter: `StandardResponseID = '${EscapeSQLString(fresh.Response.ID)}'`,
                    Fields: ['ID'],
                    ResultType: 'simple',
                    SkipTotalRowCount: true,
                },
                user,
            );
            if (!citationRes.Success) {
                throw new Error(citationRes.ErrorMessage || 'Could not verify citations for confirmation.');
            }
            const citationCount = citationRes.Results?.length ?? 0;

            RequireRule(
                ResponseRules.CanConfirm(
                    fresh.Application.Status,
                    {
                        Status: fresh.Response.Status,
                        AuthorType: fresh.Response.AuthorType,
                        ResponseText: fresh.Response.ResponseText,
                        SelfAssessment: fresh.Response.SelfAssessment,
                    },
                    { ResponseType: fresh.Standard.ResponseType, IntakeMode: fresh.Standard.IntakeMode },
                    citationCount,
                    fresh.Application.SubmittedAt,
                ),
            );

            fresh.Response.Status = 'Confirmed';
            fresh.Response.ConfirmedByUserID = user.ID;
            fresh.Response.ConfirmedAt = new Date();
            fresh.Response.IsStale = false;
            await scope.Save(fresh.Response);

            const loaded = await LoadWorkspaceResponseByID(fresh.Response.ID, subject.ID, provider, user);
            return { Response: loaded };
        });
    }
}
