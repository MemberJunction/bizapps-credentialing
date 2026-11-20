import { BaseRemotableOperation, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import {
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_STAFF_ROLE,
    CredentialingOperation,
    INVALID_SELF_ASSESSMENT_REASON,
    NOT_FOUND_REASON,
    ONLY_APPLICANT_EDIT_REASON,
    ResponseRules,
    SaveResponseOperation,
    type ResponseOutput,
    type SaveResponseInput,
    type SelfAssessment,
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

const VALID_SELF_ASSESSMENTS: ReadonlySet<SelfAssessment> = new Set(['Met', 'Partially Met', 'Not Met']);

@RegisterClass(BaseRemotableOperation, CredentialingOperation.SaveResponse)
export class SaveResponseServerOperation extends SaveResponseOperation {
    protected override async Authorize(_input: SaveResponseInput, user: UserInfo): Promise<boolean> {
        return (
            OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE) ||
            OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE)
        );
    }

    protected override async InternalExecute(
        input: SaveResponseInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<ResponseOutput> {
        if (input.SelfAssessment != null && !VALID_SELF_ASSESSMENTS.has(input.SelfAssessment)) {
            OperationSupport.Refuse(INVALID_SELF_ASSESSMENT_REASON);
        }

        const initial = await SubjectAccess.Response(input.ResponseID, provider, user);
        const subject = await SubjectAccess.Subject(initial.Application.SubjectID, provider, user);
        const actor = await SubjectAccess.ActorFor(user, subject, provider);
        if (actor == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        if (actor !== 'Applicant') {
            OperationSupport.Refuse(ONLY_APPLICANT_EDIT_REASON);
        }

        return OperationWrite.Run(provider, async (scope) => {
            await AuthoringLock.ForSubject(subject.ID, provider, user);
            await AuthoringLock.ForApplication(initial.Application.ID, provider, user);

            const fresh = await SubjectAccess.Response(input.ResponseID, provider, user);
            AssertExpectedUpdatedAt(input.ExpectedUpdatedAt, fresh.Response.__mj_UpdatedAt);

            const currentState = {
                Status: fresh.Response.Status,
                AuthorType: fresh.Response.AuthorType,
                ResponseText: fresh.Response.ResponseText,
                SelfAssessment: fresh.Response.SelfAssessment,
            };
            RequireRule(
                ResponseRules.CanEdit(fresh.Application.Status, currentState, fresh.Application.SubmittedAt),
            );

            const next = ResponseRules.AfterSave(currentState, input.ResponseText, input.SelfAssessment);
            fresh.Response.ResponseText = next.ResponseText;
            fresh.Response.SelfAssessment = next.SelfAssessment;
            fresh.Response.Status = next.Status;
            fresh.Response.AuthorType = next.AuthorType;
            fresh.Response.LastEditedByUserID = user.ID;
            fresh.Response.IsStale = false;
            await scope.Save(fresh.Response);

            const loaded = await LoadWorkspaceResponseByID(fresh.Response.ID, subject.ID, provider, user);
            return { Response: loaded };
        });
    }
}
