/**
 * Server body of `Credentialing.CreateProgram` (FRD FR-2.1): the program and its first Draft version,
 * saved as the caller in one transaction, so both rows are written or neither is.
 */
import { BaseRemotableOperation, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import {
    CREDENTIALING_STAFF_ROLE,
    CreateProgramOperation,
    CredentialingEntity,
    CredentialingOperation,
    type CreateProgramInput,
    type CreateProgramOutput,
} from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingProgramEntity, mjBizAppsCredentialingProgramVersionEntity } from '@mj-biz-apps/credentialing-entities';
import { OperationSupport } from './OperationSupport.js';

@RegisterClass(BaseRemotableOperation, CredentialingOperation.CreateProgram)
export class CreateProgramServerOperation extends CreateProgramOperation {
    protected override async Authorize(_input: CreateProgramInput, user: UserInfo): Promise<boolean> {
        return OperationSupport.HoldsRole(user, CREDENTIALING_STAFF_ROLE);
    }

    /**
     * Saves the program (its guard refuses an organization the caller cannot read with
     * `Record not found.`), then its first version as a Draft with the default settings.
     */
    protected override async InternalExecute(input: CreateProgramInput, provider: IMetadataProvider, user: UserInfo): Promise<CreateProgramOutput> {
        return OperationSupport.InTransaction(provider, async () => {
            const program = await OperationSupport.NewRecord<mjBizAppsCredentialingProgramEntity>(provider, CredentialingEntity.Program, user);
            program.AccreditingOrganizationID = input.AccreditingOrganizationID;
            program.Name = input.Name;
            program.ProgramType = input.ProgramType;
            program.SubjectType = input.SubjectType;
            program.SubjectNoun = input.SubjectNoun;
            program.CredentialPrefix = input.CredentialPrefix;
            program.Description = input.Description;
            await OperationSupport.Save(program);

            const version = await OperationSupport.NewRecord<mjBizAppsCredentialingProgramVersionEntity>(provider, CredentialingEntity.ProgramVersion, user);
            version.ProgramID = program.ID;
            version.Label = input.FirstVersionLabel;
            version.Status = 'Draft';
            await OperationSupport.Save(version);

            return { ProgramID: program.ID, VersionID: version.ID };
        });
    }
}
