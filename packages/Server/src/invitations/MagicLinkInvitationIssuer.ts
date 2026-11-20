import { Metadata } from '@memberjunction/core';
import {
    SERVER_EXTENSION_CORE_SERVICE_KEYS,
    type IServerExtensionMagicLinkService,
} from '@memberjunction/server-extensions-core';
import { CREDENTIALING_APPLICANT_ROLE } from '@mj-biz-apps/credentialing-core';
import { SystemUser, type InvitationIssuer } from '@mj-biz-apps/credentialing-core-entities-server';

const CREDENTIALING_APPLICATION_NAME = 'Credentialing';

/**
 * Issues single-use applicant magic links through the host MJAPI's running `MagicLinkService`
 * (`SERVER_EXTENSION_CORE_SERVICE_KEYS.MagicLink`). The role (`Credentialing Applicant`) and the
 * application (`Credentialing`) are fixed constants here — no operation input carries either.
 *
 * `MagicLinkService.CreateInvite` saves `MJ: Magic Link Invites` as `creatingUser` and checks
 * `CanIssueInvites(creatingUser.Type, ...)`: this issuer passes the configured
 * `magicLink.contextUserForProvisioning` (falling back to the `System` user, `Type = 'Owner'`), so
 * `Credentialing Staff` never needs `inviteIssuerRoleNames` or permission on `MJ: Magic Link Invites`.
 */
export class MagicLinkInvitationIssuer implements InvitationIssuer {
    public async IssueApplicantLink(email: string): Promise<{ EmailSent: boolean; InvitationUrl: string | null; ExpiresAt: Date }> {
        const { configInfo, GetServerExtensionLoader } = await import('@memberjunction/server');
        const loader = GetServerExtensionLoader();
        const magicLink = loader?.Services.GetService<IServerExtensionMagicLinkService>(SERVER_EXTENSION_CORE_SERVICE_KEYS.MagicLink);
        if (magicLink == null) {
            throw new Error('The magic-link service is not active on this server.');
        }

        const hostRuntime = loader?.Services.GetHostRuntimeService?.();
        const creatingUser =
            hostRuntime?.ResolvePrincipal(configInfo.magicLink?.contextUserForProvisioning, 'MagicLink') ??
            SystemUser.Get('Issuing an applicant magic-link invitation');

        const md = Metadata.Provider;
        const app = md.Applications.find((a) => a.Name === CREDENTIALING_APPLICATION_NAME);
        const role = md.Roles.find((r) => r.Name === CREDENTIALING_APPLICANT_ROLE);
        if (app == null || role == null) {
            throw new Error(`Magic-link issuance needs the ${CREDENTIALING_APPLICATION_NAME} application and ${CREDENTIALING_APPLICANT_ROLE} role.`);
        }

        const result = await magicLink.CreateInvite(
            {
                email,
                ApplicationId: app.ID,
                RoleId: role.ID,
                MaxUses: 1,
            },
            creatingUser,
        );
        if (!result.success) {
            throw new Error(result.error || 'Could not create the magic-link invitation.');
        }

        const emailSent = Boolean(result.emailSent);
        const url = emailSent ? null : (result.redemptionUrl ?? null);
        if (!emailSent && url == null) {
            throw new Error('The magic-link service returned no invitation URL.');
        }

        return {
            EmailSent: emailSent,
            InvitationUrl: url,
            ExpiresAt: result.expiresAt ? new Date(result.expiresAt) : new Date(),
        };
    }
}
