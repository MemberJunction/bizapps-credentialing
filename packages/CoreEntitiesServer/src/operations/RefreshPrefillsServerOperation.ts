import { BaseRemotableOperation, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import {
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_STAFF_ROLE,
    CredentialingOperation,
    NOT_FOUND_REASON,
    RefreshPrefillsOperation,
    type RefreshPrefillsInput,
    type RefreshPrefillsOutput,
} from '@mj-biz-apps/credentialing-core';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { PrefillRunner } from '../prefill/PrefillRunner.js';
import { OperationSupport } from './OperationSupport.js';

@RegisterClass(BaseRemotableOperation, CredentialingOperation.RefreshPrefills)
export class RefreshPrefillsServerOperation extends RefreshPrefillsOperation {
    protected override async Authorize(_input: RefreshPrefillsInput, user: UserInfo): Promise<boolean> {
        return (
            OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE) ||
            OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE)
        );
    }

    protected override async InternalExecute(
        input: RefreshPrefillsInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<RefreshPrefillsOutput> {
        const access = await SubjectAccess.Application(input.ApplicationID, provider, user);
        const actor = await SubjectAccess.ActorFor(user, access.Subject, provider);
        if (actor == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        return PrefillRunner.RunForApplication(access.Application.ID, provider, user);
    }
}
