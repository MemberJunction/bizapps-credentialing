import { BaseRemotableOperation, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import {
    CREDENTIALING_APPLICANT_ROLE,
    CREDENTIALING_STAFF_ROLE,
    CredentialingOperation,
    GetSubmissionGateOperation,
    SubmissionGate,
    type GetSubmissionGateInput,
    type GetSubmissionGateOutput,
} from '@mj-biz-apps/credentialing-core';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { OperationSupport } from './OperationSupport.js';
import {
    EvaluateRecordedAttestation,
    FormatIsoTimestamp,
    LoadSubmissionGateData,
} from './SubmissionGateHelper.js';

@RegisterClass(BaseRemotableOperation, CredentialingOperation.GetSubmissionGate)
export class GetSubmissionGateServerOperation extends GetSubmissionGateOperation {
    protected override async Authorize(_input: GetSubmissionGateInput, user: UserInfo): Promise<boolean> {
        return (
            OperationSupport.HoldsRole(user, CREDENTIALING_APPLICANT_ROLE) ||
            OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE)
        );
    }

    protected override async InternalExecute(
        input: GetSubmissionGateInput,
        provider: IMetadataProvider,
        user: UserInfo,
    ): Promise<GetSubmissionGateOutput> {
        const access = await SubjectAccess.Application(input.ApplicationID, provider, user);
        const recorded = EvaluateRecordedAttestation(access);
        const loaded = await LoadSubmissionGateData(access, provider, user, recorded);
        const evaluation = SubmissionGate.Evaluate(loaded.GateInput);
        const statement =
            access.Application.AttestationStatement ??
            SubmissionGate.FormatAttestationStatement(access.Subject.DisplayName);

        return {
            Items: evaluation.Items,
            Gaps: evaluation.Gaps,
            CanSubmit: evaluation.CanSubmit,
            Reason: evaluation.Reason,
            RequiresAttestation: Boolean(access.Version.RequiresGoverningBodyAttestation),
            AttestationStatement: statement,
            Application: {
                ApplicationID: access.Application.ID,
                SubjectID: access.Subject.ID,
                SubjectName: access.Subject.DisplayName,
                ProgramName: access.Program.Name,
                VersionLabel: access.Version.Label,
                OrganizationName: access.Program.AccreditingOrganization,
                Status: access.Application.Status,
                SubmittedAt: FormatIsoTimestamp(access.Application.SubmittedAt),
            },
            Documents: loaded.DocumentItems,
            RecordedAttestation: recorded,
        };
    }
}
