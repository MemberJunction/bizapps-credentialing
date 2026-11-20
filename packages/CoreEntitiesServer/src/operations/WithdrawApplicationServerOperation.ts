import { BaseRemotableOperation, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import {
    ApplicationLifecycleRules,
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_STAFF_ROLE,
    CredentialingOperation,
    NOT_FOUND_REASON,
    WithdrawApplicationOperation,
    type WithdrawApplicationInput,
    type WithdrawApplicationOutput,
} from '@mj-biz-apps/credentialing-core';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite } from '../guards/OperationWrite.js';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { OperationSupport } from './OperationSupport.js';
import { RequireRule } from './ResponseWorkspaceHelper.js';

@RegisterClass(BaseRemotableOperation, CredentialingOperation.WithdrawApplication)
export class WithdrawApplicationServerOperation extends WithdrawApplicationOperation {
    protected override async Authorize(_input: WithdrawApplicationInput, user: UserInfo): Promise<boolean> {
        return (
            OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE) ||
            OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE)
        );
    }

    protected override async InternalExecute(
        input: WithdrawApplicationInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<WithdrawApplicationOutput> {
        const initial = await SubjectAccess.Application(input.ApplicationID, provider, user);
        const actor = await SubjectAccess.ActorFor(user, initial.Subject, provider);
        if (actor == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }

        return OperationWrite.Run(provider, async (scope) => {
            await AuthoringLock.ForSubject(initial.Subject.ID, provider, user);
            await AuthoringLock.ForApplication(initial.Application.ID, provider, user);

            const fresh = await SubjectAccess.Application(input.ApplicationID, provider, user);
            RequireRule(ApplicationLifecycleRules.CanWithdraw(fresh.Application.Status, actor, input.Reason));

            const withdrawnAt = new Date();
            const trimmedReason = input.Reason.trim();
            fresh.Application.Status = 'Withdrawn';
            fresh.Application.WithdrawnAt = withdrawnAt;
            fresh.Application.WithdrawnByUserID = user.ID;
            fresh.Application.WithdrawalReason = trimmedReason;
            await scope.Save(fresh.Application);

            return {
                ApplicationID: fresh.Application.ID,
                Status: fresh.Application.Status,
                WithdrawnAt: withdrawnAt.toISOString(),
                WithdrawalReason: trimmedReason,
            };
        });
    }
}
