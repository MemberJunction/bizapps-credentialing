import { BaseRemotableOperation, RunView, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import {
    ATTESTATION_STATEMENT_REQUIRED_REASON,
    AttestInLieuOperation,
    CREDENTIALING_APPLICANT_ROLE,
    CredentialingEntity,
    CredentialingOperation,
    DOCUMENT_MUST_BE_UPLOADED_REASON,
    EvidenceFileRules,
    NOT_FOUND_REASON,
    RequiredTextRule,
    type AttestInLieuInput,
    type AttestInLieuOutput,
} from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingDocumentAttestationEntity } from '@mj-biz-apps/credentialing-entities';
import { DocumentFreeze } from '../evidence/DocumentFreeze.js';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite } from '../guards/OperationWrite.js';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { OperationSupport } from './OperationSupport.js';

type DocumentAttestationEntity = mjBizAppsCredentialingDocumentAttestationEntity;

/**
 * `Credentialing.AttestInLieu` (FRD FR-5.3). The caller must act for the subject as `Applicant`.
 * Under the subject's lock it re-reads the requirement (its policy must be `Restricted Allowed`),
 * the subject's current attestation for it and the applications that froze that attestation,
 * decides `EvidenceFileRules.CanReattest`, then marks the current attestation superseded and
 * inserts the new one. A row is never edited except to set `IsSuperseded`.
 */
@RegisterClass(BaseRemotableOperation, CredentialingOperation.AttestInLieu)
export class AttestInLieuServerOperation extends AttestInLieuOperation {
    protected override async Authorize(_input: AttestInLieuInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE);
    }

    protected override async InternalExecute(input: AttestInLieuInput, provider: IMetadataProvider, user: UserInfo): Promise<AttestInLieuOutput> {
        const subject = await SubjectAccess.Subject(input.SubjectID, provider, user);
        if ((await SubjectAccess.ActorFor(user, subject, provider)) !== 'Applicant') {
            OperationSupport.Refuse(NOT_FOUND_REASON);
        }
        await SubjectAccess.Requirement(input.DocumentRequirementID, subject.ID, provider);

        return OperationWrite.Run(provider, async (scope) => {
            await AuthoringLock.ForSubject(subject.ID, provider, user);
            const requirement = await SubjectAccess.Requirement(input.DocumentRequirementID, subject.ID, provider);
            if (requirement.SensitivityPolicy !== 'Restricted Allowed') {
                OperationSupport.Refuse(DOCUMENT_MUST_BE_UPLOADED_REASON);
            }
            if (RequiredTextRule.IsBlank(input.Statement)) {
                OperationSupport.Refuse(ATTESTATION_STATEMENT_REQUIRED_REASON);
            }
            const current = await AttestInLieuServerOperation.currentAttestation(subject.ID, requirement.ID, provider, user);
            const frozenBy = current == null ? [] : await DocumentFreeze.Statuses('DocumentAttestationID', current.ID, provider, user);
            const rule = EvidenceFileRules.CanReattest(current, frozenBy);
            if ('Reason' in rule) {
                OperationSupport.Refuse(rule.Reason);
            }
            if (current != null) {
                current.IsSuperseded = true;
                await scope.Save(current);
            }
            const attestation = await OperationSupport.NewRecord<DocumentAttestationEntity>(provider, CredentialingEntity.DocumentAttestation, user);
            attestation.SubjectID = subject.ID;
            attestation.DocumentRequirementID = requirement.ID;
            attestation.Statement = input.Statement.trim();
            attestation.AttestedByUserID = user.ID;
            attestation.AttestedAt = new Date();
            attestation.IsSuperseded = false;
            await scope.Save(attestation);
            return {
                DocumentAttestationID: attestation.ID,
                SupersededAttestationID: current?.ID ?? null,
                AttestedAt: attestation.AttestedAt.toISOString(),
            };
        });
    }

    /** The subject's current (not superseded) attestation for the requirement, read as the caller. */
    private static async currentAttestation(subjectID: string, requirementID: string, provider: IMetadataProvider, user: UserInfo): Promise<DocumentAttestationEntity | null> {
        const result = await RunView.FromMetadataProvider(provider).RunView<DocumentAttestationEntity>(
            {
                EntityName: CredentialingEntity.DocumentAttestation,
                ExtraFilter: `SubjectID = '${subjectID}' AND DocumentRequirementID = '${requirementID}' AND IsSuperseded = 0`,
                ResultType: 'entity_object',
                MaxRows: 1,
            },
            user,
        );
        if (!result.Success) {
            throw new Error(`Reading the current attestation failed: ${result.ErrorMessage ?? 'unknown error'}`);
        }
        return result.Results[0] ?? null;
    }
}
