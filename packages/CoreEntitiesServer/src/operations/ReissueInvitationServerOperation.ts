/**
 * Server body of `Credentialing.ReissueInvitation`: stamps `LastInvitedAt`/`InvitedByUserID` on an
 * existing `SubjectContact`, ensures applicant grants, refreshes the user cache, and issues a fresh
 * single-use magic link after commit.
 */
import { BaseRemotableOperation, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { EscapeSQLString, IsValidUUID, RegisterClass } from '@memberjunction/global';
import {
    CREDENTIALING_STAFF_ROLE,
    CredentialingEntity,
    CredentialingOperation,
    InvitationRules,
    NOT_FOUND_REASON,
    ReissueInvitationOperation,
    type ReissueInvitationInput,
    type ReissueInvitationOutput,
} from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingSubjectContactEntity } from '@mj-biz-apps/credentialing-entities';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite } from '../guards/OperationWrite.js';
import { SystemUser } from '../guards/SystemUser.js';
import { InvitationSupport, USERS_ENTITY, type UserAccountRow } from './InvitationSupport.js';
import { OperationSupport } from './OperationSupport.js';

@RegisterClass(BaseRemotableOperation, CredentialingOperation.ReissueInvitation)
export class ReissueInvitationServerOperation extends ReissueInvitationOperation {
    protected override async Authorize(_input: ReissueInvitationInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE);
    }

    protected override async InternalExecute(
        input: ReissueInvitationInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<ReissueInvitationOutput> {
        if (input.SubjectContactID == null || !IsValidUUID(input.SubjectContactID)) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }

        const initialContact = await this.loadContact(input.SubjectContactID, provider, user);
        const system = SystemUser.Get('Reissuing an applicant invitation');
        const userRow = await this.loadUserAccount(initialContact.UserID, provider, system);
        await InvitationSupport.AssertExternalAccount(userRow, provider, system);
        const email = InvitationRules.NormalizeEmail(userRow.Email);

        await OperationWrite.Run(provider, async (scope) => {
            await AuthoringLock.ForUserEmail(email, provider, user);
            await AuthoringLock.ForSubject(initialContact.SubjectID, provider, user);

            const contact = await this.loadContact(input.SubjectContactID, provider, user);
            await InvitationSupport.EnsureApplicantGrants(userRow.ID, provider, system);
            contact.InvitedByUserID = user.ID;
            contact.LastInvitedAt = new Date();
            await scope.Save(contact);
        });

        await InvitationSupport.RefreshUserCache();
        return InvitationSupport.IssueLinkAfterCommit(email);
    }

    private async loadContact(
        contactID: string,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<mjBizAppsCredentialingSubjectContactEntity> {
        const [contacts] = await InvitationSupport.Read<mjBizAppsCredentialingSubjectContactEntity>(
            [
                {
                    EntityName: CredentialingEntity.SubjectContact,
                    ExtraFilter: `ID = '${EscapeSQLString(contactID)}'`,
                    ResultType: 'entity_object',
                    MaxRows: 1,
                },
            ],
            provider,
            user,
            'subject contact',
        );
        if (contacts[0] == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        return contacts[0];
    }

    private async loadUserAccount(userID: string, provider: IMetadataProvider, system: UserInfo): Promise<UserAccountRow> {
        const [users] = await InvitationSupport.Read<UserAccountRow>(
            [
                {
                    EntityName: USERS_ENTITY,
                    ExtraFilter: `ID = '${EscapeSQLString(userID)}'`,
                    Fields: ['ID', 'Email', 'Type'],
                    ResultType: 'simple',
                    MaxRows: 1,
                },
            ],
            provider,
            system,
            'contact user',
        );
        if (users[0] == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        return users[0];
    }
}
