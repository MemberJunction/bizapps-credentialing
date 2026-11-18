import {
    BaseRemotableOperation,
    LogError,
    RunView,
    type IMetadataProvider,
    type UserInfo,
} from '@memberjunction/core';
import { EscapeSQLString, RegisterClass } from '@memberjunction/global';
import {
    ApplicationLifecycleRules,
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_STAFF_ROLE,
    CredentialingEntity,
    CredentialingOperation,
    NOT_FOUND_REASON,
    ONLY_APPLICANT_SUBMIT_REASON,
    SubmissionGate,
    SubmitApplicationOperation,
    type AttestationInput,
    type SubmitApplicationInput,
    type SubmitApplicationOutput,
} from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingApplicationDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import { ApplicationEvents } from '../events/ApplicationEvents.js';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite, type OperationWriteScope } from '../guards/OperationWrite.js';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { SystemUser } from '../guards/SystemUser.js';
import { CredentialingServices } from '../services/CredentialingServices.js';
import { OperationSupport } from './OperationSupport.js';
import { RequireRule } from './ResponseWorkspaceHelper.js';
import { LoadSubmissionGateData } from './SubmissionGateHelper.js';

type ApplicationDocumentEntity = mjBizAppsCredentialingApplicationDocumentEntity;

interface CommittedSubmission {
    ApplicationID: string;
    SubjectName: string;
    ProgramName: string;
    VersionLabel: string;
    OrganizationID: string;
    SubmittedAt: string;
}

function trimmedOrNull(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function parseApprovalDate(raw: string | null | undefined): Date | null {
    const trimmed = trimmedOrNull(raw);
    if (trimmed == null) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (match != null) {
        return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

@RegisterClass(BaseRemotableOperation, CredentialingOperation.SubmitApplication)
export class SubmitApplicationServerOperation extends SubmitApplicationOperation {
    protected override async Authorize(_input: SubmitApplicationInput, user: UserInfo): Promise<boolean> {
        return (
            OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE) ||
            OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE)
        );
    }

    protected override async InternalExecute(
        input: SubmitApplicationInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<SubmitApplicationOutput> {
        const initial = await SubjectAccess.Application(input.ApplicationID, provider, user);
        const actor = await SubjectAccess.ActorFor(user, initial.Subject, provider);
        if (actor == null) {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        if (actor !== 'Applicant') {
            OperationSupport.Refuse(ONLY_APPLICANT_SUBMIT_REASON);
        }

        const committed = await OperationWrite.Run(provider, async (scope) => {
            await AuthoringLock.ForSubject(initial.Subject.ID, provider, user);
            await AuthoringLock.ForApplication(initial.Application.ID, provider, user);

            const fresh = await SubjectAccess.Application(input.ApplicationID, provider, user);
            RequireRule(
                ApplicationLifecycleRules.CanTransition(
                    fresh.Application.Status,
                    'Submitted',
                    'Applicant',
                    {
                        RequiresScreening: Boolean(fresh.Version.RequiresScreening),
                        RequiresExecutiveApproval: Boolean(fresh.Version.RequiresExecutiveApproval),
                    },
                ),
            );

            const now = new Date();
            const loaded = await LoadSubmissionGateData(fresh, provider, user, input.Attestation);
            const evaluation = SubmissionGate.Evaluate(loaded.GateInput, now);
            const nonAttestationGaps = evaluation.Gaps.filter((g) => g.Kind !== 'Attestation');
            if (nonAttestationGaps.length > 0 && !evaluation.CanSubmit) {
                OperationSupport.Refuse(evaluation.Reason ?? 'This application cannot be submitted yet.');
            }

            const requiresAttestation = Boolean(fresh.Version.RequiresGoverningBodyAttestation);
            RequireRule(SubmissionGate.ValidateAttestation(input.Attestation, requiresAttestation, now));

            await this.applySubmissionWrites(
                scope,
                provider,
                user,
                fresh,
                loaded.InScopeDocuments,
                loaded.InScopeAttestations,
                requiresAttestation,
                input.Attestation,
                now,
            );

            return {
                ApplicationID: fresh.Application.ID,
                SubjectName: fresh.Subject.DisplayName,
                ProgramName: fresh.Program.Name,
                VersionLabel: fresh.Version.Label,
                OrganizationID: fresh.Program.AccreditingOrganizationID,
                SubmittedAt: now.toISOString(),
            } satisfies CommittedSubmission;
        });

        // Post-commit work: neither may change the operation's result (NFR-4.2, Decision 11).
        ApplicationEvents.TriggerInBackground(committed.ApplicationID);
        await this.notifyStaffBestEffort(committed, provider);

        return { SubmittedAt: committed.SubmittedAt };
    }

    private async applySubmissionWrites(
        scope: OperationWriteScope,
        provider: IMetadataProvider,
        user: UserInfo,
        fresh: Awaited<ReturnType<typeof SubjectAccess.Application>>,
        inScopeDocuments: readonly { ID: string }[],
        inScopeAttestations: readonly { ID: string }[],
        requiresAttestation: boolean,
        attestation: AttestationInput | null,
        now: Date,
    ): Promise<void> {
        fresh.Application.Status = 'Submitted';
        fresh.Application.SubmittedAt = now;
        fresh.Application.SubmittedByUserID = user.ID;
        fresh.Application.SubjectSnapshot = JSON.stringify({
            ID: fresh.Subject.ID,
            DisplayName: fresh.Subject.DisplayName,
            SubjectType: fresh.Subject.SubjectType,
            PrimaryEmail: fresh.Subject.PrimaryEmail,
            PartyEntityID: fresh.Subject.PartyEntityID,
            PartyRecordID: fresh.Subject.PartyRecordID,
        });

        if (requiresAttestation && attestation != null) {
            fresh.Application.AttestationOfficerName = trimmedOrNull(attestation.OfficerName);
            fresh.Application.AttestationOfficerRole = trimmedOrNull(attestation.OfficerRole);
            fresh.Application.AttestationApprovalDate = parseApprovalDate(attestation.ApprovalDate);
            fresh.Application.AttestationStatement = SubmissionGate.FormatAttestationStatement(fresh.Subject.DisplayName);
            fresh.Application.AttestedByUserID = user.ID;
            fresh.Application.AttestedAt = now;
        }

        await scope.Save(fresh.Application);

        for (const doc of inScopeDocuments) {
            const freeze = await OperationSupport.NewRecord<ApplicationDocumentEntity>(
                provider,
                CredentialingEntity.ApplicationDocument,
                user,
            );
            freeze.ApplicationID = fresh.Application.ID;
            freeze.SubjectID = fresh.Subject.ID;
            freeze.EvidenceDocumentID = doc.ID;
            freeze.DocumentAttestationID = null;
            freeze.FrozenAt = now;
            await scope.Save(freeze);
        }

        for (const att of inScopeAttestations) {
            const freeze = await OperationSupport.NewRecord<ApplicationDocumentEntity>(
                provider,
                CredentialingEntity.ApplicationDocument,
                user,
            );
            freeze.ApplicationID = fresh.Application.ID;
            freeze.SubjectID = fresh.Subject.ID;
            freeze.EvidenceDocumentID = null;
            freeze.DocumentAttestationID = att.ID;
            freeze.FrozenAt = now;
            await scope.Save(freeze);
        }
    }

    private async notifyStaffBestEffort(
        committed: CommittedSubmission,
        provider: IMetadataProvider,
    ): Promise<void> {
        if (!CredentialingServices.IsRegistered('Notifier')) {
            return;
        }
        try {
            const system = SystemUser.Get('Reading organization staff for submission notification');
            const res = await RunView.FromMetadataProvider(provider).RunView<{ UserID: string }>(
                {
                    EntityName: CredentialingEntity.OrganizationMembership,
                    ExtraFilter: `AccreditingOrganizationID = '${EscapeSQLString(committed.OrganizationID)}'`,
                    Fields: ['UserID'],
                    ResultType: 'simple',
                    IgnoreMaxRows: true,
                    SkipTotalRowCount: true,
                },
                system,
            );
            if (!res.Success) {
                LogError(`Reading staff memberships for notification failed: ${res.ErrorMessage ?? 'unknown error'}`);
                return;
            }
            const staffUserIDs = [...new Set((res.Results ?? []).map((r) => r.UserID).filter(Boolean))];
            if (staffUserIDs.length === 0) {
                return;
            }
            await CredentialingServices.Notifier.ApplicationSubmitted({
                ApplicationID: committed.ApplicationID,
                SubjectName: committed.SubjectName,
                ProgramName: committed.ProgramName,
                VersionLabel: committed.VersionLabel,
                StaffUserIDs: staffUserIDs,
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            LogError(`Staff submission notification failed for application ${committed.ApplicationID}: ${msg}`);
        }
    }
}
