/********************************************************************************
* ALL ENTITIES - TypeGraphQL Type Class Definition - AUTO GENERATED FILE
* Generated Entities and Resolvers for Server
*
*   >>> DO NOT MODIFY THIS FILE!!!!!!!!!!!!
*   >>> YOUR CHANGES WILL BE OVERWRITTEN
*   >>> THE NEXT TIME THIS FILE IS GENERATED
*
**********************************************************************************/
import { Arg, Ctx, Int, Query, Resolver, Field, Float, ObjectType, InputType, Mutation,
            PubSub, PubSubEngine, ResolverBase, RunViewByIDInput, RunViewByNameInput, RunDynamicViewInput,
            AppContext, KeyValuePairInput, DeleteOptionsInput, GraphQLTimestamp as Timestamp,
            GetReadOnlyProvider, GetReadWriteProvider, RestoreContextInput } from '@memberjunction/server';
import { Metadata, EntityPermissionType, CompositeKey, UserInfo } from '@memberjunction/core'

import { MaxLength } from 'class-validator';
import * as mj_core_schema_server_object_types from '@memberjunction/server'


import { mjBizAppsCredentialingAccreditingOrganizationEntity, mjBizAppsCredentialingApplicationDocumentEntity, mjBizAppsCredentialingApplicationEntity, mjBizAppsCredentialingDocumentAttestationEntity, mjBizAppsCredentialingDocumentRequirementEntity, mjBizAppsCredentialingEvidenceDocumentEntity, mjBizAppsCredentialingExtractionEntity, mjBizAppsCredentialingOrganizationMembershipEntity, mjBizAppsCredentialingProgramVersionEntity, mjBizAppsCredentialingProgramEntity, mjBizAppsCredentialingResponseCitationEntity, mjBizAppsCredentialingResponseSourceEntity, mjBizAppsCredentialingSectionEntity, mjBizAppsCredentialingStandardResponseEntity, mjBizAppsCredentialingStandardEntity, mjBizAppsCredentialingSubjectContactEntity, mjBizAppsCredentialingSubjectEntity } from '@mj-biz-apps/credentialing-entities';
    

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Accrediting Organizations
//****************************************************************************
@ObjectType({ description: "An accrediting body: the organization that owns credentialing programs and decides applications to them." })
export class mjBizAppsCredentialingAccreditingOrganization_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The BizApps Common organization record for this accrediting body."}) 
    @MaxLength(36)
    OrganizationID?: string;
        
    @Field({nullable: true, description: "The name of the accrediting body as shown on letters and certificates."}) 
    @MaxLength(255)
    Name?: string;
        
    @Field({nullable: true, description: "What this accrediting body does and whom it accredits."}) 
    Description?: string;
        
    @Field({nullable: true, description: "Whether the accrediting body is in use. An inactive body keeps its history but takes no new work."}) 
    @MaxLength(20)
    Status?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    Organization?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Accrediting Organizations
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingAccreditingOrganizationInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    OrganizationID?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description: string | null;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Accrediting Organizations
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingAccreditingOrganizationInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    OrganizationID?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description?: string | null;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Accrediting Organizations
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingAccreditingOrganizationViewResult {
    @Field(() => [mjBizAppsCredentialingAccreditingOrganization_])
    Results: mjBizAppsCredentialingAccreditingOrganization_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingAccreditingOrganization_)
export class mjBizAppsCredentialingAccreditingOrganizationResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingAccreditingOrganizationViewResult)
    async RunmjBizAppsCredentialingAccreditingOrganizationViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingAccreditingOrganizationViewResult)
    async RunmjBizAppsCredentialingAccreditingOrganizationViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingAccreditingOrganizationViewResult)
    async RunmjBizAppsCredentialingAccreditingOrganizationDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Accrediting Organizations';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingAccreditingOrganization_, { nullable: true })
    async mjBizAppsCredentialingAccreditingOrganization(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingAccreditingOrganization_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Accrediting Organizations', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwAccreditingOrganizations')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Accrediting Organizations', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Accrediting Organizations', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingAccreditingOrganization_)
    async CreatemjBizAppsCredentialingAccreditingOrganization(
        @Arg('input', () => CreatemjBizAppsCredentialingAccreditingOrganizationInput) input: CreatemjBizAppsCredentialingAccreditingOrganizationInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Accrediting Organizations', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingAccreditingOrganization_)
    async UpdatemjBizAppsCredentialingAccreditingOrganization(
        @Arg('input', () => UpdatemjBizAppsCredentialingAccreditingOrganizationInput) input: UpdatemjBizAppsCredentialingAccreditingOrganizationInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Accrediting Organizations', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingAccreditingOrganization_)
    async DeletemjBizAppsCredentialingAccreditingOrganization(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Accrediting Organizations', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Application Documents
//****************************************************************************
@ObjectType({ description: "Frozen join linking a submitted application to the evidence documents and attestations in effect at submission." })
export class mjBizAppsCredentialingApplicationDocument_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The submitted application this frozen document link belongs to."}) 
    @MaxLength(36)
    ApplicationID?: string;
        
    @Field({nullable: true, description: "The subject of the application, server-set to match Application.SubjectID."}) 
    @MaxLength(36)
    SubjectID?: string;
        
    @Field({nullable: true, description: "The evidence document frozen into the application, when this entry references a file."}) 
    @MaxLength(36)
    EvidenceDocumentID?: string;
        
    @Field({nullable: true, description: "The document attestation frozen into the application, when this entry references an attestation."}) 
    @MaxLength(36)
    DocumentAttestationID?: string;
        
    @Field({nullable: true, description: "Timestamp when this document link was frozen on submission."}) 
    FrozenAt?: Date;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Application Documents
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingApplicationDocumentInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    ApplicationID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    EvidenceDocumentID: string | null;

    @Field({ nullable: true })
    DocumentAttestationID: string | null;

    @Field({ nullable: true })
    FrozenAt?: Date;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Application Documents
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingApplicationDocumentInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    ApplicationID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    EvidenceDocumentID?: string | null;

    @Field({ nullable: true })
    DocumentAttestationID?: string | null;

    @Field({ nullable: true })
    FrozenAt?: Date;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Application Documents
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingApplicationDocumentViewResult {
    @Field(() => [mjBizAppsCredentialingApplicationDocument_])
    Results: mjBizAppsCredentialingApplicationDocument_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingApplicationDocument_)
export class mjBizAppsCredentialingApplicationDocumentResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingApplicationDocumentViewResult)
    async RunmjBizAppsCredentialingApplicationDocumentViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingApplicationDocumentViewResult)
    async RunmjBizAppsCredentialingApplicationDocumentViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingApplicationDocumentViewResult)
    async RunmjBizAppsCredentialingApplicationDocumentDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Application Documents';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingApplicationDocument_, { nullable: true })
    async mjBizAppsCredentialingApplicationDocument(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingApplicationDocument_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Application Documents', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwApplicationDocuments')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Application Documents', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Application Documents', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingApplicationDocument_)
    async CreatemjBizAppsCredentialingApplicationDocument(
        @Arg('input', () => CreatemjBizAppsCredentialingApplicationDocumentInput) input: CreatemjBizAppsCredentialingApplicationDocumentInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Application Documents', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingApplicationDocument_)
    async UpdatemjBizAppsCredentialingApplicationDocument(
        @Arg('input', () => UpdatemjBizAppsCredentialingApplicationDocumentInput) input: UpdatemjBizAppsCredentialingApplicationDocumentInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Application Documents', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingApplicationDocument_)
    async DeletemjBizAppsCredentialingApplicationDocument(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Application Documents', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Applications
//****************************************************************************
@ObjectType({ description: "A subject's application for a credential under a specific active program version." })
export class mjBizAppsCredentialingApplication_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The subject applying for the credential. Cannot be changed after creation."}) 
    @MaxLength(36)
    SubjectID?: string;
        
    @Field({nullable: true, description: "The program version this application is judged against. Cannot be changed after creation."}) 
    @MaxLength(36)
    ProgramVersionID?: string;
        
    @Field({nullable: true, description: "Current workflow stage of the application."}) 
    @MaxLength(30)
    Status?: string;
        
    @Field(() => Boolean, {nullable: true, description: "Whether this row represents imported historical application data."}) 
    IsHistorical?: boolean;
        
    @Field({nullable: true, description: "Server-stamped timestamp when the application was submitted."}) 
    SubmittedAt?: Date;
        
    @Field({nullable: true, description: "The contact user who submitted the application."}) 
    @MaxLength(36)
    SubmittedByUserID?: string;
        
    @Field({nullable: true, description: "Timestamp when all post-submission subscribers completed successfully."}) 
    SubmissionDispatchedAt?: Date;
        
    @Field({nullable: true, description: "Identifier of the submission-dispatch attempt currently holding the claim."}) 
    @MaxLength(36)
    SubmissionDispatchClaimID?: string;
        
    @Field({nullable: true, description: "Timestamp when the current submission-dispatch claim was taken."}) 
    SubmissionDispatchClaimedAt?: Date;
        
    @Field(() => Int, {nullable: true, description: "Number of submission-dispatch attempts made so far. Dispatch stops after 5."}) 
    SubmissionDispatchAttempts?: number;
        
    @Field({nullable: true, description: "Staff-facing explanation recorded when submission dispatch stops retrying."}) 
    @MaxLength(500)
    SubmissionDispatchNote?: string;
        
    @Field({nullable: true, description: "JSON snapshot of the subject's display name, type, email and party reference captured at submission."}) 
    SubjectSnapshot?: string;
        
    @Field({nullable: true, description: "Name of the officer who signed the governing-body attestation."}) 
    @MaxLength(255)
    AttestationOfficerName?: string;
        
    @Field({nullable: true, description: "Title or role of the officer who signed the governing-body attestation."}) 
    @MaxLength(255)
    AttestationOfficerRole?: string;
        
    @Field({nullable: true, description: "Date the governing body approved the application."}) 
    AttestationApprovalDate?: Date;
        
    @Field({nullable: true, description: "Exact attestation statement presented to and signed by the contact."}) 
    AttestationStatement?: string;
        
    @Field({nullable: true, description: "The contact user who recorded the attestation."}) 
    @MaxLength(36)
    AttestedByUserID?: string;
        
    @Field({nullable: true, description: "Timestamp when the attestation was recorded."}) 
    AttestedAt?: Date;
        
    @Field({nullable: true, description: "Timestamp when the application was withdrawn."}) 
    WithdrawnAt?: Date;
        
    @Field({nullable: true, description: "The user who withdrew the application."}) 
    @MaxLength(36)
    WithdrawnByUserID?: string;
        
    @Field({nullable: true, description: "Reason recorded when the application was withdrawn."}) 
    WithdrawalReason?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    SubmittedByUser?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    AttestedByUser?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    WithdrawnByUser?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Applications
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingApplicationInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    ProgramVersionID?: string;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => Boolean, { nullable: true })
    IsHistorical?: boolean;

    @Field({ nullable: true })
    SubmittedAt: Date | null;

    @Field({ nullable: true })
    SubmittedByUserID: string | null;

    @Field({ nullable: true })
    SubmissionDispatchedAt: Date | null;

    @Field({ nullable: true })
    SubmissionDispatchClaimID: string | null;

    @Field({ nullable: true })
    SubmissionDispatchClaimedAt: Date | null;

    @Field(() => Int, { nullable: true })
    SubmissionDispatchAttempts?: number;

    @Field({ nullable: true })
    SubmissionDispatchNote: string | null;

    @Field({ nullable: true })
    SubjectSnapshot: string | null;

    @Field({ nullable: true })
    AttestationOfficerName: string | null;

    @Field({ nullable: true })
    AttestationOfficerRole: string | null;

    @Field({ nullable: true })
    AttestationApprovalDate: Date | null;

    @Field({ nullable: true })
    AttestationStatement: string | null;

    @Field({ nullable: true })
    AttestedByUserID: string | null;

    @Field({ nullable: true })
    AttestedAt: Date | null;

    @Field({ nullable: true })
    WithdrawnAt: Date | null;

    @Field({ nullable: true })
    WithdrawnByUserID: string | null;

    @Field({ nullable: true })
    WithdrawalReason: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Applications
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingApplicationInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    ProgramVersionID?: string;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => Boolean, { nullable: true })
    IsHistorical?: boolean;

    @Field({ nullable: true })
    SubmittedAt?: Date | null;

    @Field({ nullable: true })
    SubmittedByUserID?: string | null;

    @Field({ nullable: true })
    SubmissionDispatchedAt?: Date | null;

    @Field({ nullable: true })
    SubmissionDispatchClaimID?: string | null;

    @Field({ nullable: true })
    SubmissionDispatchClaimedAt?: Date | null;

    @Field(() => Int, { nullable: true })
    SubmissionDispatchAttempts?: number;

    @Field({ nullable: true })
    SubmissionDispatchNote?: string | null;

    @Field({ nullable: true })
    SubjectSnapshot?: string | null;

    @Field({ nullable: true })
    AttestationOfficerName?: string | null;

    @Field({ nullable: true })
    AttestationOfficerRole?: string | null;

    @Field({ nullable: true })
    AttestationApprovalDate?: Date | null;

    @Field({ nullable: true })
    AttestationStatement?: string | null;

    @Field({ nullable: true })
    AttestedByUserID?: string | null;

    @Field({ nullable: true })
    AttestedAt?: Date | null;

    @Field({ nullable: true })
    WithdrawnAt?: Date | null;

    @Field({ nullable: true })
    WithdrawnByUserID?: string | null;

    @Field({ nullable: true })
    WithdrawalReason?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Applications
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingApplicationViewResult {
    @Field(() => [mjBizAppsCredentialingApplication_])
    Results: mjBizAppsCredentialingApplication_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingApplication_)
export class mjBizAppsCredentialingApplicationResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingApplicationViewResult)
    async RunmjBizAppsCredentialingApplicationViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingApplicationViewResult)
    async RunmjBizAppsCredentialingApplicationViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingApplicationViewResult)
    async RunmjBizAppsCredentialingApplicationDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Applications';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingApplication_, { nullable: true })
    async mjBizAppsCredentialingApplication(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingApplication_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Applications', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwApplications')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Applications', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Applications', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingApplication_)
    async CreatemjBizAppsCredentialingApplication(
        @Arg('input', () => CreatemjBizAppsCredentialingApplicationInput) input: CreatemjBizAppsCredentialingApplicationInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Applications', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingApplication_)
    async UpdatemjBizAppsCredentialingApplication(
        @Arg('input', () => UpdatemjBizAppsCredentialingApplicationInput) input: UpdatemjBizAppsCredentialingApplicationInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Applications', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingApplication_)
    async DeletemjBizAppsCredentialingApplication(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Applications', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Document Attestations
//****************************************************************************
@ObjectType({ description: "An attestation recorded by a subject contact in lieu of uploading a restricted document." })
export class mjBizAppsCredentialingDocumentAttestation_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The subject this attestation is recorded for."}) 
    @MaxLength(36)
    SubjectID?: string;
        
    @Field({nullable: true, description: "The document requirement satisfied by this attestation."}) 
    @MaxLength(36)
    DocumentRequirementID?: string;
        
    @Field({nullable: true, description: "The statement attested to by the contact."}) 
    Statement?: string;
        
    @Field({nullable: true, description: "The user who recorded this attestation."}) 
    @MaxLength(36)
    AttestedByUserID?: string;
        
    @Field({nullable: true, description: "Timestamp when this attestation was recorded."}) 
    AttestedAt?: Date;
        
    @Field(() => Boolean, {nullable: true, description: "Whether a later attestation or upload replaced this record."}) 
    IsSuperseded?: boolean;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    DocumentRequirement?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    AttestedByUser?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Document Attestations
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingDocumentAttestationInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    DocumentRequirementID?: string;

    @Field({ nullable: true })
    Statement?: string;

    @Field({ nullable: true })
    AttestedByUserID?: string;

    @Field({ nullable: true })
    AttestedAt?: Date;

    @Field(() => Boolean, { nullable: true })
    IsSuperseded?: boolean;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Document Attestations
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingDocumentAttestationInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    DocumentRequirementID?: string;

    @Field({ nullable: true })
    Statement?: string;

    @Field({ nullable: true })
    AttestedByUserID?: string;

    @Field({ nullable: true })
    AttestedAt?: Date;

    @Field(() => Boolean, { nullable: true })
    IsSuperseded?: boolean;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Document Attestations
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingDocumentAttestationViewResult {
    @Field(() => [mjBizAppsCredentialingDocumentAttestation_])
    Results: mjBizAppsCredentialingDocumentAttestation_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingDocumentAttestation_)
export class mjBizAppsCredentialingDocumentAttestationResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingDocumentAttestationViewResult)
    async RunmjBizAppsCredentialingDocumentAttestationViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingDocumentAttestationViewResult)
    async RunmjBizAppsCredentialingDocumentAttestationViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingDocumentAttestationViewResult)
    async RunmjBizAppsCredentialingDocumentAttestationDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Document Attestations';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingDocumentAttestation_, { nullable: true })
    async mjBizAppsCredentialingDocumentAttestation(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingDocumentAttestation_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Document Attestations', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwDocumentAttestations')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Document Attestations', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Document Attestations', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingDocumentAttestation_)
    async CreatemjBizAppsCredentialingDocumentAttestation(
        @Arg('input', () => CreatemjBizAppsCredentialingDocumentAttestationInput) input: CreatemjBizAppsCredentialingDocumentAttestationInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Document Attestations', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingDocumentAttestation_)
    async UpdatemjBizAppsCredentialingDocumentAttestation(
        @Arg('input', () => UpdatemjBizAppsCredentialingDocumentAttestationInput) input: UpdatemjBizAppsCredentialingDocumentAttestationInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Document Attestations', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingDocumentAttestation_)
    async DeletemjBizAppsCredentialingDocumentAttestation(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Document Attestations', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Document Requirements
//****************************************************************************
@ObjectType({ description: "A document every applicant to a program version is asked to supply." })
export class mjBizAppsCredentialingDocumentRequirement_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The program version this document requirement belongs to."}) 
    @MaxLength(36)
    ProgramVersionID?: string;
        
    @Field({nullable: true, description: "The name of the document, for example \"Bylaws\", unique within its version."}) 
    @MaxLength(255)
    Name?: string;
        
    @Field({nullable: true, description: "What the document is and what it should contain."}) 
    Description?: string;
        
    @Field(() => Boolean, {nullable: true, description: "Whether an application is incomplete without this document."}) 
    IsRequired?: boolean;
        
    @Field({nullable: true, description: "Whether the applicant may mark this document restricted, so that it is handled outside the system."}) 
    @MaxLength(30)
    SensitivityPolicy?: string;
        
    @Field(() => Int, {nullable: true, description: "The position of the document in the list, lowest first."}) 
    Sequence?: number;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Document Requirements
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingDocumentRequirementInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    ProgramVersionID?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description: string | null;

    @Field(() => Boolean, { nullable: true })
    IsRequired?: boolean;

    @Field({ nullable: true })
    SensitivityPolicy?: string;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Document Requirements
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingDocumentRequirementInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    ProgramVersionID?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description?: string | null;

    @Field(() => Boolean, { nullable: true })
    IsRequired?: boolean;

    @Field({ nullable: true })
    SensitivityPolicy?: string;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Document Requirements
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingDocumentRequirementViewResult {
    @Field(() => [mjBizAppsCredentialingDocumentRequirement_])
    Results: mjBizAppsCredentialingDocumentRequirement_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingDocumentRequirement_)
export class mjBizAppsCredentialingDocumentRequirementResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingDocumentRequirementViewResult)
    async RunmjBizAppsCredentialingDocumentRequirementViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingDocumentRequirementViewResult)
    async RunmjBizAppsCredentialingDocumentRequirementViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingDocumentRequirementViewResult)
    async RunmjBizAppsCredentialingDocumentRequirementDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Document Requirements';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingDocumentRequirement_, { nullable: true })
    async mjBizAppsCredentialingDocumentRequirement(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingDocumentRequirement_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Document Requirements', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwDocumentRequirements')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Document Requirements', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Document Requirements', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingDocumentRequirement_)
    async CreatemjBizAppsCredentialingDocumentRequirement(
        @Arg('input', () => CreatemjBizAppsCredentialingDocumentRequirementInput) input: CreatemjBizAppsCredentialingDocumentRequirementInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Document Requirements', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingDocumentRequirement_)
    async UpdatemjBizAppsCredentialingDocumentRequirement(
        @Arg('input', () => UpdatemjBizAppsCredentialingDocumentRequirementInput) input: UpdatemjBizAppsCredentialingDocumentRequirementInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Document Requirements', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingDocumentRequirement_)
    async DeletemjBizAppsCredentialingDocumentRequirement(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Document Requirements', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Evidence Documents
//****************************************************************************
@ObjectType({ description: "An evidence file uploaded to a subject's document library." })
export class mjBizAppsCredentialingEvidenceDocument_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The subject that owns this document. Cannot be changed after creation."}) 
    @MaxLength(36)
    SubjectID?: string;
        
    @Field({nullable: true, description: "The document requirement this upload fulfills, or NULL for a general upload."}) 
    @MaxLength(36)
    DocumentRequirementID?: string;
        
    @Field({nullable: true, description: "The underlying MemberJunction File record storing the uploaded bytes."}) 
    @MaxLength(36)
    FileID?: string;
        
    @Field({nullable: true, description: "Sanitized original file name as uploaded."}) 
    @MaxLength(255)
    FileName?: string;
        
    @Field({nullable: true, description: "MIME content type of the uploaded file."}) 
    @MaxLength(150)
    ContentType?: string;
        
    @Field(() => Int, {nullable: true, description: "Size of the uploaded file in bytes."}) 
    SizeBytes?: number;
        
    @Field({nullable: true, description: "Lowercase hex SHA-256 digest of the uploaded file bytes."}) 
    @MaxLength(64)
    ContentHash?: string;
        
    @Field({nullable: true, description: "Plain text extracted or recognized from the file. Written once and never modified afterward."}) 
    ExtractedText?: string;
        
    @Field({nullable: true, description: "Outcome of text extraction or recognition for this document."}) 
    @MaxLength(30)
    TextStatus?: string;
        
    @Field({nullable: true, description: "User-facing sentence explaining any text status other than Extracted."}) 
    @MaxLength(500)
    TextNote?: string;
        
    @Field(() => Int, {nullable: true, description: "Page count of the document when known."}) 
    PageCount?: number;
        
    @Field({nullable: true, description: "Current state of background evidence reading for this document."}) 
    @MaxLength(30)
    ReadingStatus?: string;
        
    @Field({nullable: true, description: "User-facing note describing the outcome or failure of evidence reading."}) 
    @MaxLength(500)
    ReadingNote?: string;
        
    @Field({nullable: true, description: "Identifier of the background worker claim currently processing this document."}) 
    @MaxLength(36)
    ReadingClaimID?: string;
        
    @Field({nullable: true, description: "Timestamp when the active reading claim was taken or last renewed."}) 
    ReadingClaimedAt?: Date;
        
    @Field(() => Int, {nullable: true, description: "Number of failed or attempted reading runs. Failed reads retry up to 3 attempts."}) 
    ReadingAttempts?: number;
        
    @Field({nullable: true, description: "Currency status of this document in the subject's library."}) 
    @MaxLength(20)
    Status?: string;
        
    @Field({nullable: true, description: "The prior document version that this upload replaced."}) 
    @MaxLength(36)
    SupersedesDocumentID?: string;
        
    @Field({nullable: true, description: "Timestamp when a contact most recently confirmed this document is still current."}) 
    ConfirmedCurrentAt?: Date;
        
    @Field({nullable: true, description: "The user who uploaded this document."}) 
    @MaxLength(36)
    UploadedByUserID?: string;
        
    @Field({nullable: true, description: "Timestamp when this document was uploaded."}) 
    UploadedAt?: Date;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    DocumentRequirement?: string;
        
    @Field({nullable: true}) 
    @MaxLength(500)
    File?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    UploadedByUser?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Evidence Documents
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingEvidenceDocumentInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    DocumentRequirementID: string | null;

    @Field({ nullable: true })
    FileID?: string;

    @Field({ nullable: true })
    FileName?: string;

    @Field({ nullable: true })
    ContentType?: string;

    @Field(() => Int, { nullable: true })
    SizeBytes?: number;

    @Field({ nullable: true })
    ContentHash?: string;

    @Field({ nullable: true })
    ExtractedText: string | null;

    @Field({ nullable: true })
    TextStatus?: string;

    @Field({ nullable: true })
    TextNote: string | null;

    @Field(() => Int, { nullable: true })
    PageCount: number | null;

    @Field({ nullable: true })
    ReadingStatus?: string;

    @Field({ nullable: true })
    ReadingNote: string | null;

    @Field({ nullable: true })
    ReadingClaimID: string | null;

    @Field({ nullable: true })
    ReadingClaimedAt: Date | null;

    @Field(() => Int, { nullable: true })
    ReadingAttempts?: number;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    SupersedesDocumentID: string | null;

    @Field({ nullable: true })
    ConfirmedCurrentAt: Date | null;

    @Field({ nullable: true })
    UploadedByUserID?: string;

    @Field({ nullable: true })
    UploadedAt?: Date;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Evidence Documents
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingEvidenceDocumentInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    DocumentRequirementID?: string | null;

    @Field({ nullable: true })
    FileID?: string;

    @Field({ nullable: true })
    FileName?: string;

    @Field({ nullable: true })
    ContentType?: string;

    @Field(() => Int, { nullable: true })
    SizeBytes?: number;

    @Field({ nullable: true })
    ContentHash?: string;

    @Field({ nullable: true })
    ExtractedText?: string | null;

    @Field({ nullable: true })
    TextStatus?: string;

    @Field({ nullable: true })
    TextNote?: string | null;

    @Field(() => Int, { nullable: true })
    PageCount?: number | null;

    @Field({ nullable: true })
    ReadingStatus?: string;

    @Field({ nullable: true })
    ReadingNote?: string | null;

    @Field({ nullable: true })
    ReadingClaimID?: string | null;

    @Field({ nullable: true })
    ReadingClaimedAt?: Date | null;

    @Field(() => Int, { nullable: true })
    ReadingAttempts?: number;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    SupersedesDocumentID?: string | null;

    @Field({ nullable: true })
    ConfirmedCurrentAt?: Date | null;

    @Field({ nullable: true })
    UploadedByUserID?: string;

    @Field({ nullable: true })
    UploadedAt?: Date;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Evidence Documents
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingEvidenceDocumentViewResult {
    @Field(() => [mjBizAppsCredentialingEvidenceDocument_])
    Results: mjBizAppsCredentialingEvidenceDocument_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingEvidenceDocument_)
export class mjBizAppsCredentialingEvidenceDocumentResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingEvidenceDocumentViewResult)
    async RunmjBizAppsCredentialingEvidenceDocumentViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingEvidenceDocumentViewResult)
    async RunmjBizAppsCredentialingEvidenceDocumentViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingEvidenceDocumentViewResult)
    async RunmjBizAppsCredentialingEvidenceDocumentDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Evidence Documents';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingEvidenceDocument_, { nullable: true })
    async mjBizAppsCredentialingEvidenceDocument(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingEvidenceDocument_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Evidence Documents', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwEvidenceDocuments')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Evidence Documents', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Evidence Documents', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingEvidenceDocument_)
    async CreatemjBizAppsCredentialingEvidenceDocument(
        @Arg('input', () => CreatemjBizAppsCredentialingEvidenceDocumentInput) input: CreatemjBizAppsCredentialingEvidenceDocumentInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Evidence Documents', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingEvidenceDocument_)
    async UpdatemjBizAppsCredentialingEvidenceDocument(
        @Arg('input', () => UpdatemjBizAppsCredentialingEvidenceDocumentInput) input: UpdatemjBizAppsCredentialingEvidenceDocumentInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Evidence Documents', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingEvidenceDocument_)
    async DeletemjBizAppsCredentialingEvidenceDocument(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Evidence Documents', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Extractions
//****************************************************************************
@ObjectType({ description: "An extracted answer and supporting excerpt read from one evidence document for one standard." })
export class mjBizAppsCredentialingExtraction_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The evidence document this extraction was read from."}) 
    @MaxLength(36)
    EvidenceDocumentID?: string;
        
    @Field({nullable: true, description: "The standard this extraction addresses."}) 
    @MaxLength(36)
    StandardID?: string;
        
    @Field({nullable: true, description: "The subject of the evidence document, server-set."}) 
    @MaxLength(36)
    SubjectID?: string;
        
    @Field({nullable: true, description: "The drafted answer extracted for the standard."}) 
    Value?: string;
        
    @Field({nullable: true, description: "Verbatim quote from the document's ExtractedText supporting this extraction."}) 
    Excerpt?: string;
        
    @Field(() => Int, {nullable: true, description: "Zero-based character start offset of Excerpt within ExtractedText."}) 
    StartOffset?: number;
        
    @Field(() => Int, {nullable: true, description: "Exclusive character end offset of Excerpt within ExtractedText."}) 
    EndOffset?: number;
        
    @Field({nullable: true, description: "Page number or label where the excerpt appears, when known."}) 
    @MaxLength(50)
    PageReference?: string;
        
    @Field({nullable: true, description: "Section heading path enclosing the excerpt, when known."}) 
    @MaxLength(1000)
    HeadingPath?: string;
        
    @Field(() => Float, {nullable: true, description: "Reader confidence score between 0 and 1."}) 
    Confidence?: number;
        
    @Field({nullable: true, description: "Explanation of how the excerpt supports the extracted value."}) 
    Reasoning?: string;
        
    @Field({nullable: true, description: "Review state of this extraction."}) 
    @MaxLength(20)
    Status?: string;
        
    @Field(() => Boolean, {nullable: true, description: "Whether a newer reading superseded this extraction."}) 
    IsSuperseded?: boolean;
        
    @Field({nullable: true, description: "The MemberJunction AI prompt run that produced this extraction, or NULL for test readers."}) 
    @MaxLength(36)
    AIPromptRunID?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    AIPromptRun?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Extractions
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingExtractionInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    EvidenceDocumentID?: string;

    @Field({ nullable: true })
    StandardID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    Value?: string;

    @Field({ nullable: true })
    Excerpt?: string;

    @Field(() => Int, { nullable: true })
    StartOffset?: number;

    @Field(() => Int, { nullable: true })
    EndOffset?: number;

    @Field({ nullable: true })
    PageReference: string | null;

    @Field({ nullable: true })
    HeadingPath: string | null;

    @Field(() => Float, { nullable: true })
    Confidence?: number;

    @Field({ nullable: true })
    Reasoning: string | null;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => Boolean, { nullable: true })
    IsSuperseded?: boolean;

    @Field({ nullable: true })
    AIPromptRunID: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Extractions
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingExtractionInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    EvidenceDocumentID?: string;

    @Field({ nullable: true })
    StandardID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    Value?: string;

    @Field({ nullable: true })
    Excerpt?: string;

    @Field(() => Int, { nullable: true })
    StartOffset?: number;

    @Field(() => Int, { nullable: true })
    EndOffset?: number;

    @Field({ nullable: true })
    PageReference?: string | null;

    @Field({ nullable: true })
    HeadingPath?: string | null;

    @Field(() => Float, { nullable: true })
    Confidence?: number;

    @Field({ nullable: true })
    Reasoning?: string | null;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => Boolean, { nullable: true })
    IsSuperseded?: boolean;

    @Field({ nullable: true })
    AIPromptRunID?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Extractions
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingExtractionViewResult {
    @Field(() => [mjBizAppsCredentialingExtraction_])
    Results: mjBizAppsCredentialingExtraction_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingExtraction_)
export class mjBizAppsCredentialingExtractionResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingExtractionViewResult)
    async RunmjBizAppsCredentialingExtractionViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingExtractionViewResult)
    async RunmjBizAppsCredentialingExtractionViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingExtractionViewResult)
    async RunmjBizAppsCredentialingExtractionDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Extractions';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingExtraction_, { nullable: true })
    async mjBizAppsCredentialingExtraction(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingExtraction_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Extractions', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwExtractions')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Extractions', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Extractions', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingExtraction_)
    async CreatemjBizAppsCredentialingExtraction(
        @Arg('input', () => CreatemjBizAppsCredentialingExtractionInput) input: CreatemjBizAppsCredentialingExtractionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Extractions', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingExtraction_)
    async UpdatemjBizAppsCredentialingExtraction(
        @Arg('input', () => UpdatemjBizAppsCredentialingExtractionInput) input: UpdatemjBizAppsCredentialingExtractionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Extractions', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingExtraction_)
    async DeletemjBizAppsCredentialingExtraction(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Extractions', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Organization Memberships
//****************************************************************************
@ObjectType({ description: "A staff member's membership of an accrediting organization. It is what lets that person see and author the organization's programs." })
export class mjBizAppsCredentialingOrganizationMembership_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The accrediting organization the person belongs to."}) 
    @MaxLength(36)
    AccreditingOrganizationID?: string;
        
    @Field({nullable: true, description: "The user who is a staff member of the organization."}) 
    @MaxLength(36)
    UserID?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    AccreditingOrganization?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    User?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Organization Memberships
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingOrganizationMembershipInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    AccreditingOrganizationID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Organization Memberships
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingOrganizationMembershipInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    AccreditingOrganizationID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Organization Memberships
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingOrganizationMembershipViewResult {
    @Field(() => [mjBizAppsCredentialingOrganizationMembership_])
    Results: mjBizAppsCredentialingOrganizationMembership_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingOrganizationMembership_)
export class mjBizAppsCredentialingOrganizationMembershipResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingOrganizationMembershipViewResult)
    async RunmjBizAppsCredentialingOrganizationMembershipViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingOrganizationMembershipViewResult)
    async RunmjBizAppsCredentialingOrganizationMembershipViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingOrganizationMembershipViewResult)
    async RunmjBizAppsCredentialingOrganizationMembershipDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Organization Memberships';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingOrganizationMembership_, { nullable: true })
    async mjBizAppsCredentialingOrganizationMembership(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingOrganizationMembership_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Organization Memberships', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwOrganizationMemberships')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Organization Memberships', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Organization Memberships', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingOrganizationMembership_)
    async CreatemjBizAppsCredentialingOrganizationMembership(
        @Arg('input', () => CreatemjBizAppsCredentialingOrganizationMembershipInput) input: CreatemjBizAppsCredentialingOrganizationMembershipInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Organization Memberships', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingOrganizationMembership_)
    async UpdatemjBizAppsCredentialingOrganizationMembership(
        @Arg('input', () => UpdatemjBizAppsCredentialingOrganizationMembershipInput) input: UpdatemjBizAppsCredentialingOrganizationMembershipInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Organization Memberships', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingOrganizationMembership_)
    async DeletemjBizAppsCredentialingOrganizationMembership(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Organization Memberships', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Program Versions
//****************************************************************************
@ObjectType({ description: "One edition of a program's standards and review settings. Applications are bound to the version that was active when they started." })
export class mjBizAppsCredentialingProgramVersion_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The program this version belongs to."}) 
    @MaxLength(36)
    ProgramID?: string;
        
    @Field({nullable: true, description: "The name of the version, for example \"2027\", unique within its program."}) 
    @MaxLength(50)
    Label?: string;
        
    @Field({nullable: true, description: "Where the version is in its life. A Draft can be edited, an Active version is frozen and accepts applications, a Retired version accepts none."}) 
    @MaxLength(20)
    Status?: string;
        
    @Field({nullable: true, description: "When the version was activated."}) 
    ActivatedAt?: Date;
        
    @Field({nullable: true, description: "When the version was retired."}) 
    RetiredAt?: Date;
        
    @Field({nullable: true, description: "The version this one was copied from, when it was started with \"Edit in draft\"."}) 
    @MaxLength(36)
    ClonedFromVersionID?: string;
        
    @Field({nullable: true, description: "The committee that decides applications to this version. Required before the version can be activated."}) 
    @MaxLength(36)
    CommitteeID?: string;
        
    @Field(() => Int, {nullable: true, description: "How many peer reviewers are assigned to each application. Fixed once the version is active."}) 
    PeerReviewerCount?: number;
        
    @Field(() => Int, {nullable: true, description: "How many days committee members have to object before a recommendation stands. Fixed once the version is active."}) 
    PassiveApprovalWindowDays?: number;
        
    @Field(() => Boolean, {nullable: true, description: "Whether staff screen an application for completeness before review begins. Fixed once the version is active."}) 
    RequiresScreening?: boolean;
        
    @Field(() => Boolean, {nullable: true, description: "Whether an executive must approve the decision before it is issued. Fixed once the version is active."}) 
    RequiresExecutiveApproval?: boolean;
        
    @Field(() => Boolean, {nullable: true, description: "Whether the applicant's governing body must attest to the application. Fixed once the version is active."}) 
    RequiresGoverningBodyAttestation?: boolean;
        
    @Field(() => Float, {nullable: true, description: "The share of reviewer reactions that must agree with AI findings before a standard may be promoted to a more automated evaluation mode, from 0 to 1. Fixed once the version is active."}) 
    MinimumAgreeRate?: number;
        
    @Field(() => Int, {nullable: true, description: "How many reviewed findings a standard needs before it may be promoted. Fixed once the version is active."}) 
    MinimumObservations?: number;
        
    @Field(() => Int, {nullable: true, description: "How many different reviewers must have reacted to a standard's findings before it may be promoted. Fixed once the version is active."}) 
    MinimumReviewers?: number;
        
    @Field(() => Float, {nullable: true, description: "The lowest agreement rate on replayed past decisions that still allows promotion, from 0 to 1. Fixed once the version is active."}) 
    MinimumReplayFloor?: number;
        
    @Field(() => Boolean, {nullable: true, description: "Whether reviewers see AI observations. Can be changed while the version is active."}) 
    AgentObservationsVisibleToReviewers?: boolean;
        
    @Field(() => Boolean, {nullable: true, description: "Whether standards in this version may be promoted to more automated evaluation modes. Can be changed while the version is active."}) 
    PromotionEnabled?: boolean;
        
    @Field(() => Boolean, {nullable: true, description: "Whether a renewal application starts with the answers from the previous one. Can be changed while the version is active."}) 
    AutoCarryForwardOnRenewal?: boolean;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    Program?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    Committee?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Program Versions
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingProgramVersionInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    ProgramID?: string;

    @Field({ nullable: true })
    Label?: string;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    ActivatedAt: Date | null;

    @Field({ nullable: true })
    RetiredAt: Date | null;

    @Field({ nullable: true })
    ClonedFromVersionID: string | null;

    @Field({ nullable: true })
    CommitteeID: string | null;

    @Field(() => Int, { nullable: true })
    PeerReviewerCount?: number;

    @Field(() => Int, { nullable: true })
    PassiveApprovalWindowDays?: number;

    @Field(() => Boolean, { nullable: true })
    RequiresScreening?: boolean;

    @Field(() => Boolean, { nullable: true })
    RequiresExecutiveApproval?: boolean;

    @Field(() => Boolean, { nullable: true })
    RequiresGoverningBodyAttestation?: boolean;

    @Field(() => Float, { nullable: true })
    MinimumAgreeRate?: number;

    @Field(() => Int, { nullable: true })
    MinimumObservations?: number;

    @Field(() => Int, { nullable: true })
    MinimumReviewers?: number;

    @Field(() => Float, { nullable: true })
    MinimumReplayFloor?: number;

    @Field(() => Boolean, { nullable: true })
    AgentObservationsVisibleToReviewers?: boolean;

    @Field(() => Boolean, { nullable: true })
    PromotionEnabled?: boolean;

    @Field(() => Boolean, { nullable: true })
    AutoCarryForwardOnRenewal?: boolean;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Program Versions
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingProgramVersionInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    ProgramID?: string;

    @Field({ nullable: true })
    Label?: string;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    ActivatedAt?: Date | null;

    @Field({ nullable: true })
    RetiredAt?: Date | null;

    @Field({ nullable: true })
    ClonedFromVersionID?: string | null;

    @Field({ nullable: true })
    CommitteeID?: string | null;

    @Field(() => Int, { nullable: true })
    PeerReviewerCount?: number;

    @Field(() => Int, { nullable: true })
    PassiveApprovalWindowDays?: number;

    @Field(() => Boolean, { nullable: true })
    RequiresScreening?: boolean;

    @Field(() => Boolean, { nullable: true })
    RequiresExecutiveApproval?: boolean;

    @Field(() => Boolean, { nullable: true })
    RequiresGoverningBodyAttestation?: boolean;

    @Field(() => Float, { nullable: true })
    MinimumAgreeRate?: number;

    @Field(() => Int, { nullable: true })
    MinimumObservations?: number;

    @Field(() => Int, { nullable: true })
    MinimumReviewers?: number;

    @Field(() => Float, { nullable: true })
    MinimumReplayFloor?: number;

    @Field(() => Boolean, { nullable: true })
    AgentObservationsVisibleToReviewers?: boolean;

    @Field(() => Boolean, { nullable: true })
    PromotionEnabled?: boolean;

    @Field(() => Boolean, { nullable: true })
    AutoCarryForwardOnRenewal?: boolean;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Program Versions
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingProgramVersionViewResult {
    @Field(() => [mjBizAppsCredentialingProgramVersion_])
    Results: mjBizAppsCredentialingProgramVersion_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingProgramVersion_)
export class mjBizAppsCredentialingProgramVersionResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingProgramVersionViewResult)
    async RunmjBizAppsCredentialingProgramVersionViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingProgramVersionViewResult)
    async RunmjBizAppsCredentialingProgramVersionViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingProgramVersionViewResult)
    async RunmjBizAppsCredentialingProgramVersionDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Program Versions';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingProgramVersion_, { nullable: true })
    async mjBizAppsCredentialingProgramVersion(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingProgramVersion_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Program Versions', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwProgramVersions')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Program Versions', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Program Versions', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingProgramVersion_)
    async CreatemjBizAppsCredentialingProgramVersion(
        @Arg('input', () => CreatemjBizAppsCredentialingProgramVersionInput) input: CreatemjBizAppsCredentialingProgramVersionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Program Versions', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingProgramVersion_)
    async UpdatemjBizAppsCredentialingProgramVersion(
        @Arg('input', () => UpdatemjBizAppsCredentialingProgramVersionInput) input: UpdatemjBizAppsCredentialingProgramVersionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Program Versions', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingProgramVersion_)
    async DeletemjBizAppsCredentialingProgramVersion(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Program Versions', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Programs
//****************************************************************************
@ObjectType({ description: "A credentialing program: one credential an accrediting organization offers, such as a certification or an accreditation." })
export class mjBizAppsCredentialingProgram_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The accrediting organization that owns this program. It cannot be changed after the program is created."}) 
    @MaxLength(36)
    AccreditingOrganizationID?: string;
        
    @Field({nullable: true, description: "The name of the program, unique within its organization."}) 
    @MaxLength(255)
    Name?: string;
        
    @Field({nullable: true, description: "What the program recognizes and who it is for."}) 
    Description?: string;
        
    @Field({nullable: true, description: "The kind of credential the program awards."}) 
    @MaxLength(20)
    ProgramType?: string;
        
    @Field({nullable: true, description: "Whether the program credentials people or organizations."}) 
    @MaxLength(20)
    SubjectType?: string;
        
    @Field({nullable: true, description: "The word used on screen for what is credentialed, for example \"facility\" or \"professional\"."}) 
    @MaxLength(100)
    SubjectNoun?: string;
        
    @Field({nullable: true, description: "The prefix of credential numbers issued by this program, unique within its organization."}) 
    @MaxLength(20)
    CredentialPrefix?: string;
        
    @Field({nullable: true, description: "The host system entity whose records are the subjects of this program, when subjects come from the host."}) 
    @MaxLength(36)
    HostEntityID?: string;
        
    @Field({nullable: true, description: "Whether the program is offered. A retired program keeps its history but accepts no new applications."}) 
    @MaxLength(20)
    Status?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    AccreditingOrganization?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    HostEntity?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Programs
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingProgramInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    AccreditingOrganizationID?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description: string | null;

    @Field({ nullable: true })
    ProgramType?: string;

    @Field({ nullable: true })
    SubjectType?: string;

    @Field({ nullable: true })
    SubjectNoun?: string;

    @Field({ nullable: true })
    CredentialPrefix?: string;

    @Field({ nullable: true })
    HostEntityID: string | null;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Programs
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingProgramInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    AccreditingOrganizationID?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description?: string | null;

    @Field({ nullable: true })
    ProgramType?: string;

    @Field({ nullable: true })
    SubjectType?: string;

    @Field({ nullable: true })
    SubjectNoun?: string;

    @Field({ nullable: true })
    CredentialPrefix?: string;

    @Field({ nullable: true })
    HostEntityID?: string | null;

    @Field({ nullable: true })
    Status?: string;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Programs
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingProgramViewResult {
    @Field(() => [mjBizAppsCredentialingProgram_])
    Results: mjBizAppsCredentialingProgram_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingProgram_)
export class mjBizAppsCredentialingProgramResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingProgramViewResult)
    async RunmjBizAppsCredentialingProgramViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingProgramViewResult)
    async RunmjBizAppsCredentialingProgramViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingProgramViewResult)
    async RunmjBizAppsCredentialingProgramDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Programs';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingProgram_, { nullable: true })
    async mjBizAppsCredentialingProgram(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingProgram_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Programs', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwPrograms')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Programs', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Programs', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingProgram_)
    async CreatemjBizAppsCredentialingProgram(
        @Arg('input', () => CreatemjBizAppsCredentialingProgramInput) input: CreatemjBizAppsCredentialingProgramInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Programs', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingProgram_)
    async UpdatemjBizAppsCredentialingProgram(
        @Arg('input', () => UpdatemjBizAppsCredentialingProgramInput) input: UpdatemjBizAppsCredentialingProgramInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Programs', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingProgram_)
    async DeletemjBizAppsCredentialingProgram(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Programs', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Response Citations
//****************************************************************************
@ObjectType({ description: "A document citation attached to a standard response." })
export class mjBizAppsCredentialingResponseCitation_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The standard response supported by this citation."}) 
    @MaxLength(36)
    StandardResponseID?: string;
        
    @Field({nullable: true, description: "The subject of the application, server-set."}) 
    @MaxLength(36)
    SubjectID?: string;
        
    @Field({nullable: true, description: "The evidence document cited."}) 
    @MaxLength(36)
    EvidenceDocumentID?: string;
        
    @Field({nullable: true, description: "The extraction that supplied this citation, when created by document reading."}) 
    @MaxLength(36)
    ExtractionID?: string;
        
    @Field({nullable: true, description: "Display label of the cited source, such as the document file name."}) 
    @MaxLength(500)
    SourceLabel?: string;
        
    @Field({nullable: true, description: "Page number or label where the cited excerpt appears, when known."}) 
    @MaxLength(50)
    PageReference?: string;
        
    @Field({nullable: true, description: "Verbatim excerpt cited from the document."}) 
    Excerpt?: string;
        
    @Field(() => Int, {nullable: true, description: "Zero-based character start offset of Excerpt within ExtractedText."}) 
    StartOffset?: number;
        
    @Field(() => Int, {nullable: true, description: "Exclusive character end offset of Excerpt within ExtractedText."}) 
    EndOffset?: number;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Response Citations
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingResponseCitationInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    StandardResponseID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    EvidenceDocumentID?: string;

    @Field({ nullable: true })
    ExtractionID: string | null;

    @Field({ nullable: true })
    SourceLabel?: string;

    @Field({ nullable: true })
    PageReference: string | null;

    @Field({ nullable: true })
    Excerpt?: string;

    @Field(() => Int, { nullable: true })
    StartOffset?: number;

    @Field(() => Int, { nullable: true })
    EndOffset?: number;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Response Citations
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingResponseCitationInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    StandardResponseID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    EvidenceDocumentID?: string;

    @Field({ nullable: true })
    ExtractionID?: string | null;

    @Field({ nullable: true })
    SourceLabel?: string;

    @Field({ nullable: true })
    PageReference?: string | null;

    @Field({ nullable: true })
    Excerpt?: string;

    @Field(() => Int, { nullable: true })
    StartOffset?: number;

    @Field(() => Int, { nullable: true })
    EndOffset?: number;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Response Citations
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingResponseCitationViewResult {
    @Field(() => [mjBizAppsCredentialingResponseCitation_])
    Results: mjBizAppsCredentialingResponseCitation_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingResponseCitation_)
export class mjBizAppsCredentialingResponseCitationResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingResponseCitationViewResult)
    async RunmjBizAppsCredentialingResponseCitationViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingResponseCitationViewResult)
    async RunmjBizAppsCredentialingResponseCitationViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingResponseCitationViewResult)
    async RunmjBizAppsCredentialingResponseCitationDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Response Citations';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingResponseCitation_, { nullable: true })
    async mjBizAppsCredentialingResponseCitation(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingResponseCitation_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Response Citations', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwResponseCitations')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Response Citations', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Response Citations', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingResponseCitation_)
    async CreatemjBizAppsCredentialingResponseCitation(
        @Arg('input', () => CreatemjBizAppsCredentialingResponseCitationInput) input: CreatemjBizAppsCredentialingResponseCitationInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Response Citations', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingResponseCitation_)
    async UpdatemjBizAppsCredentialingResponseCitation(
        @Arg('input', () => UpdatemjBizAppsCredentialingResponseCitationInput) input: UpdatemjBizAppsCredentialingResponseCitationInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Response Citations', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingResponseCitation_)
    async DeletemjBizAppsCredentialingResponseCitation(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Response Citations', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Response Sources
//****************************************************************************
@ObjectType({ description: "An authoring-time source rule specifying where prefill or verification data for a standard comes from." })
export class mjBizAppsCredentialingResponseSource_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The standard this response source serves."}) 
    @MaxLength(36)
    StandardID?: string;
        
    @Field({nullable: true, description: "The program version of the standard, server-set to match Standard.ProgramVersionID."}) 
    @MaxLength(36)
    ProgramVersionID?: string;
        
    @Field({nullable: true, description: "Kind of source used to prefill or verify the standard."}) 
    @MaxLength(30)
    SourceType?: string;
        
    @Field({nullable: true, description: "The document requirement read when SourceType is Document Extraction. Must belong to the same version."}) 
    @MaxLength(36)
    DocumentRequirementID?: string;
        
    @Field({nullable: true, description: "Whether this source is used for prefill, verification, or both."}) 
    @MaxLength(20)
    Mode?: string;
        
    @Field(() => Int, {nullable: true, description: "Priority rank of this source among sources for the same standard, starting at 1."}) 
    Rank?: number;
        
    @Field(() => Int, {nullable: true, description: "Declaration order of this source, used as tie-break within the same rank."}) 
    Sequence?: number;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    DocumentRequirement?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Response Sources
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingResponseSourceInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    StandardID?: string;

    @Field({ nullable: true })
    ProgramVersionID?: string;

    @Field({ nullable: true })
    SourceType?: string;

    @Field({ nullable: true })
    DocumentRequirementID: string | null;

    @Field({ nullable: true })
    Mode?: string;

    @Field(() => Int, { nullable: true })
    Rank?: number;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Response Sources
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingResponseSourceInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    StandardID?: string;

    @Field({ nullable: true })
    ProgramVersionID?: string;

    @Field({ nullable: true })
    SourceType?: string;

    @Field({ nullable: true })
    DocumentRequirementID?: string | null;

    @Field({ nullable: true })
    Mode?: string;

    @Field(() => Int, { nullable: true })
    Rank?: number;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Response Sources
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingResponseSourceViewResult {
    @Field(() => [mjBizAppsCredentialingResponseSource_])
    Results: mjBizAppsCredentialingResponseSource_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingResponseSource_)
export class mjBizAppsCredentialingResponseSourceResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingResponseSourceViewResult)
    async RunmjBizAppsCredentialingResponseSourceViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingResponseSourceViewResult)
    async RunmjBizAppsCredentialingResponseSourceViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingResponseSourceViewResult)
    async RunmjBizAppsCredentialingResponseSourceDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Response Sources';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingResponseSource_, { nullable: true })
    async mjBizAppsCredentialingResponseSource(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingResponseSource_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Response Sources', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwResponseSources')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Response Sources', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Response Sources', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingResponseSource_)
    async CreatemjBizAppsCredentialingResponseSource(
        @Arg('input', () => CreatemjBizAppsCredentialingResponseSourceInput) input: CreatemjBizAppsCredentialingResponseSourceInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Response Sources', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingResponseSource_)
    async UpdatemjBizAppsCredentialingResponseSource(
        @Arg('input', () => UpdatemjBizAppsCredentialingResponseSourceInput) input: UpdatemjBizAppsCredentialingResponseSourceInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Response Sources', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingResponseSource_)
    async DeletemjBizAppsCredentialingResponseSource(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Response Sources', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Sections
//****************************************************************************
@ObjectType({ description: "A numbered group of standards within a program version." })
export class mjBizAppsCredentialingSection_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The program version this section belongs to."}) 
    @MaxLength(36)
    ProgramVersionID?: string;
        
    @Field({nullable: true, description: "The section number shown to applicants and reviewers, unique within its version."}) 
    @MaxLength(20)
    Number?: string;
        
    @Field({nullable: true, description: "The title of the section."}) 
    @MaxLength(255)
    Name?: string;
        
    @Field({nullable: true, description: "What the standards in this section cover."}) 
    Description?: string;
        
    @Field(() => Int, {nullable: true, description: "The position of the section within its version, lowest first."}) 
    Sequence?: number;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Sections
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingSectionInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    ProgramVersionID?: string;

    @Field({ nullable: true })
    Number?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description: string | null;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Sections
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingSectionInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    ProgramVersionID?: string;

    @Field({ nullable: true })
    Number?: string;

    @Field({ nullable: true })
    Name?: string;

    @Field({ nullable: true })
    Description?: string | null;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Sections
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingSectionViewResult {
    @Field(() => [mjBizAppsCredentialingSection_])
    Results: mjBizAppsCredentialingSection_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingSection_)
export class mjBizAppsCredentialingSectionResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingSectionViewResult)
    async RunmjBizAppsCredentialingSectionViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingSectionViewResult)
    async RunmjBizAppsCredentialingSectionViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingSectionViewResult)
    async RunmjBizAppsCredentialingSectionDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Sections';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingSection_, { nullable: true })
    async mjBizAppsCredentialingSection(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingSection_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Sections', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwSections')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Sections', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Sections', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingSection_)
    async CreatemjBizAppsCredentialingSection(
        @Arg('input', () => CreatemjBizAppsCredentialingSectionInput) input: CreatemjBizAppsCredentialingSectionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Sections', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingSection_)
    async UpdatemjBizAppsCredentialingSection(
        @Arg('input', () => UpdatemjBizAppsCredentialingSectionInput) input: UpdatemjBizAppsCredentialingSectionInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Sections', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingSection_)
    async DeletemjBizAppsCredentialingSection(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Sections', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Standard Responses
//****************************************************************************
@ObjectType({ description: "An applicant's response to one standard within an application." })
export class mjBizAppsCredentialingStandardResponse_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The application this response belongs to."}) 
    @MaxLength(36)
    ApplicationID?: string;
        
    @Field({nullable: true, description: "The standard being answered."}) 
    @MaxLength(36)
    StandardID?: string;
        
    @Field({nullable: true, description: "The subject of the application, server-set to match Application.SubjectID."}) 
    @MaxLength(36)
    SubjectID?: string;
        
    @Field({nullable: true, description: "The current narrative or drafted answer text."}) 
    ResponseText?: string;
        
    @Field({nullable: true, description: "The applicant's self-assessment of whether the standard is met."}) 
    @MaxLength(20)
    SelfAssessment?: string;
        
    @Field({nullable: true, description: "Workflow status of this response."}) 
    @MaxLength(20)
    Status?: string;
        
    @Field({nullable: true, description: "Whether the current response text was written by a human or an automated reader."}) 
    @MaxLength(10)
    AuthorType?: string;
        
    @Field({nullable: true, description: "The user who most recently edited this response."}) 
    @MaxLength(36)
    LastEditedByUserID?: string;
        
    @Field({nullable: true, description: "The subject contact who confirmed this response."}) 
    @MaxLength(36)
    ConfirmedByUserID?: string;
        
    @Field({nullable: true, description: "Timestamp when this response was confirmed."}) 
    ConfirmedAt?: Date;
        
    @Field({nullable: true, description: "Kind of source that supplied a prefilled or located response."}) 
    @MaxLength(30)
    SourceType?: string;
        
    @Field({nullable: true, description: "Human-readable label of the source shown in provenance, such as the document file name."}) 
    @MaxLength(500)
    SourceLabel?: string;
        
    @Field({nullable: true, description: "Identifier of the source record, such as the extraction ID."}) 
    @MaxLength(100)
    SourceReference?: string;
        
    @Field({nullable: true, description: "Timestamp when the prefill or located value was retrieved from its source."}) 
    SourceRetrievedAt?: Date;
        
    @Field({nullable: true, description: "Original value resolved from the source, preserved if the applicant edits the text."}) 
    SourceRawValue?: string;
        
    @Field(() => Boolean, {nullable: true, description: "Whether the underlying source changed after this response was drafted."}) 
    IsStale?: boolean;
        
    @Field({nullable: true, description: "Staff explanation recorded when a confirmed response was reopened."}) 
    ReopenReason?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    LastEditedByUser?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    ConfirmedByUser?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Standard Responses
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingStandardResponseInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    ApplicationID?: string;

    @Field({ nullable: true })
    StandardID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    ResponseText: string | null;

    @Field({ nullable: true })
    SelfAssessment: string | null;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    AuthorType?: string;

    @Field({ nullable: true })
    LastEditedByUserID: string | null;

    @Field({ nullable: true })
    ConfirmedByUserID: string | null;

    @Field({ nullable: true })
    ConfirmedAt: Date | null;

    @Field({ nullable: true })
    SourceType: string | null;

    @Field({ nullable: true })
    SourceLabel: string | null;

    @Field({ nullable: true })
    SourceReference: string | null;

    @Field({ nullable: true })
    SourceRetrievedAt: Date | null;

    @Field({ nullable: true })
    SourceRawValue: string | null;

    @Field(() => Boolean, { nullable: true })
    IsStale?: boolean;

    @Field({ nullable: true })
    ReopenReason: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Standard Responses
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingStandardResponseInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    ApplicationID?: string;

    @Field({ nullable: true })
    StandardID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    ResponseText?: string | null;

    @Field({ nullable: true })
    SelfAssessment?: string | null;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    AuthorType?: string;

    @Field({ nullable: true })
    LastEditedByUserID?: string | null;

    @Field({ nullable: true })
    ConfirmedByUserID?: string | null;

    @Field({ nullable: true })
    ConfirmedAt?: Date | null;

    @Field({ nullable: true })
    SourceType?: string | null;

    @Field({ nullable: true })
    SourceLabel?: string | null;

    @Field({ nullable: true })
    SourceReference?: string | null;

    @Field({ nullable: true })
    SourceRetrievedAt?: Date | null;

    @Field({ nullable: true })
    SourceRawValue?: string | null;

    @Field(() => Boolean, { nullable: true })
    IsStale?: boolean;

    @Field({ nullable: true })
    ReopenReason?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Standard Responses
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingStandardResponseViewResult {
    @Field(() => [mjBizAppsCredentialingStandardResponse_])
    Results: mjBizAppsCredentialingStandardResponse_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingStandardResponse_)
export class mjBizAppsCredentialingStandardResponseResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingStandardResponseViewResult)
    async RunmjBizAppsCredentialingStandardResponseViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingStandardResponseViewResult)
    async RunmjBizAppsCredentialingStandardResponseViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingStandardResponseViewResult)
    async RunmjBizAppsCredentialingStandardResponseDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Standard Responses';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingStandardResponse_, { nullable: true })
    async mjBizAppsCredentialingStandardResponse(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingStandardResponse_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Standard Responses', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwStandardResponses')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Standard Responses', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Standard Responses', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingStandardResponse_)
    async CreatemjBizAppsCredentialingStandardResponse(
        @Arg('input', () => CreatemjBizAppsCredentialingStandardResponseInput) input: CreatemjBizAppsCredentialingStandardResponseInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Standard Responses', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingStandardResponse_)
    async UpdatemjBizAppsCredentialingStandardResponse(
        @Arg('input', () => UpdatemjBizAppsCredentialingStandardResponseInput) input: UpdatemjBizAppsCredentialingStandardResponseInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Standard Responses', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingStandardResponse_)
    async DeletemjBizAppsCredentialingStandardResponse(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Standard Responses', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Standards
//****************************************************************************
@ObjectType({ description: "One requirement an applicant must meet, within a section of a program version." })
export class mjBizAppsCredentialingStandard_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The section this standard belongs to. It cannot be changed after the standard is created."}) 
    @MaxLength(36)
    SectionID?: string;
        
    @Field({nullable: true, description: "The program version this standard belongs to. Always the version of its section."}) 
    @MaxLength(36)
    ProgramVersionID?: string;
        
    @Field({nullable: true, description: "The standard's code, for example \"1.2\", unique within its version and stored without surrounding spaces."}) 
    @MaxLength(50)
    Code?: string;
        
    @Field({nullable: true, description: "The text of the requirement."}) 
    Statement?: string;
        
    @Field({nullable: true, description: "Advice to applicants and reviewers on how the requirement is met and judged."}) 
    Guidance?: string;
        
    @Field({nullable: true, description: "What an applicant gives in answer: a yes or no attestation, a written narrative, supporting evidence, or a combination."}) 
    @MaxLength(20)
    ResponseType?: string;
        
    @Field({nullable: true, description: "How the answer is gathered: typed by the applicant, located in their uploaded documents, or drafted for them to confirm."}) 
    @MaxLength(20)
    IntakeMode?: string;
        
    @Field({nullable: true, description: "How far AI takes part in judging the answer. It is never edited directly; it changes only through evidence-gated promotion."}) 
    @MaxLength(20)
    EvaluationMode?: string;
        
    @Field(() => Boolean, {nullable: true, description: "Whether meeting the standard is a matter of judgment. An interpretive standard is always reviewed by people."}) 
    IsInterpretive?: boolean;
        
    @Field(() => Boolean, {nullable: true, description: "Whether the standard decides if an applicant may apply at all."}) 
    IsEligibility?: boolean;
        
    @Field(() => Boolean, {nullable: true, description: "Whether the standard was added in this version and so has no answer to carry forward from an earlier one."}) 
    IsNewForVersion?: boolean;
        
    @Field({nullable: true, description: "Where the supporting evidence is usually found, for example the name of a document."}) 
    EvidenceHint?: string;
        
    @Field({nullable: true, description: "Identifies the same requirement across versions of a program. A copy of a standard in a later version keeps this value."}) 
    @MaxLength(36)
    LineageKey?: string;
        
    @Field(() => Int, {nullable: true, description: "The position of the standard within its section, lowest first."}) 
    Sequence?: number;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    Section?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Standards
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingStandardInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    SectionID?: string;

    @Field({ nullable: true })
    ProgramVersionID?: string;

    @Field({ nullable: true })
    Code?: string;

    @Field({ nullable: true })
    Statement?: string;

    @Field({ nullable: true })
    Guidance: string | null;

    @Field({ nullable: true })
    ResponseType?: string;

    @Field({ nullable: true })
    IntakeMode?: string;

    @Field({ nullable: true })
    EvaluationMode?: string;

    @Field(() => Boolean, { nullable: true })
    IsInterpretive?: boolean;

    @Field(() => Boolean, { nullable: true })
    IsEligibility?: boolean;

    @Field(() => Boolean, { nullable: true })
    IsNewForVersion?: boolean;

    @Field({ nullable: true })
    EvidenceHint: string | null;

    @Field({ nullable: true })
    LineageKey?: string;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Standards
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingStandardInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    SectionID?: string;

    @Field({ nullable: true })
    ProgramVersionID?: string;

    @Field({ nullable: true })
    Code?: string;

    @Field({ nullable: true })
    Statement?: string;

    @Field({ nullable: true })
    Guidance?: string | null;

    @Field({ nullable: true })
    ResponseType?: string;

    @Field({ nullable: true })
    IntakeMode?: string;

    @Field({ nullable: true })
    EvaluationMode?: string;

    @Field(() => Boolean, { nullable: true })
    IsInterpretive?: boolean;

    @Field(() => Boolean, { nullable: true })
    IsEligibility?: boolean;

    @Field(() => Boolean, { nullable: true })
    IsNewForVersion?: boolean;

    @Field({ nullable: true })
    EvidenceHint?: string | null;

    @Field({ nullable: true })
    LineageKey?: string;

    @Field(() => Int, { nullable: true })
    Sequence?: number;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Standards
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingStandardViewResult {
    @Field(() => [mjBizAppsCredentialingStandard_])
    Results: mjBizAppsCredentialingStandard_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingStandard_)
export class mjBizAppsCredentialingStandardResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingStandardViewResult)
    async RunmjBizAppsCredentialingStandardViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingStandardViewResult)
    async RunmjBizAppsCredentialingStandardViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingStandardViewResult)
    async RunmjBizAppsCredentialingStandardDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Standards';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingStandard_, { nullable: true })
    async mjBizAppsCredentialingStandard(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingStandard_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Standards', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwStandards')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Standards', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Standards', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingStandard_)
    async CreatemjBizAppsCredentialingStandard(
        @Arg('input', () => CreatemjBizAppsCredentialingStandardInput) input: CreatemjBizAppsCredentialingStandardInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Standards', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingStandard_)
    async UpdatemjBizAppsCredentialingStandard(
        @Arg('input', () => UpdatemjBizAppsCredentialingStandardInput) input: UpdatemjBizAppsCredentialingStandardInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Standards', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingStandard_)
    async DeletemjBizAppsCredentialingStandard(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Standards', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Subject Contacts
//****************************************************************************
@ObjectType({ description: "A user authorized to act for a credentialing subject on its applications and evidence." })
export class mjBizAppsCredentialingSubjectContact_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The credentialing subject this contact acts for."}) 
    @MaxLength(36)
    SubjectID?: string;
        
    @Field({nullable: true, description: "The MemberJunction user account of this contact."}) 
    @MaxLength(36)
    UserID?: string;
        
    @Field({nullable: true, description: "Whether this contact is the primary applicant contact or supporting staff."}) 
    @MaxLength(20)
    ContactRole?: string;
        
    @Field({nullable: true, description: "The staff user who most recently invited this contact."}) 
    @MaxLength(36)
    InvitedByUserID?: string;
        
    @Field({nullable: true, description: "When this contact was most recently invited."}) 
    LastInvitedAt?: Date;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    User?: string;
        
    @Field({nullable: true}) 
    @MaxLength(100)
    InvitedByUser?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Subject Contacts
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingSubjectContactInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field({ nullable: true })
    ContactRole?: string;

    @Field({ nullable: true })
    InvitedByUserID?: string;

    @Field({ nullable: true })
    LastInvitedAt?: Date;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Subject Contacts
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingSubjectContactInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    SubjectID?: string;

    @Field({ nullable: true })
    UserID?: string;

    @Field({ nullable: true })
    ContactRole?: string;

    @Field({ nullable: true })
    InvitedByUserID?: string;

    @Field({ nullable: true })
    LastInvitedAt?: Date;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Subject Contacts
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingSubjectContactViewResult {
    @Field(() => [mjBizAppsCredentialingSubjectContact_])
    Results: mjBizAppsCredentialingSubjectContact_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingSubjectContact_)
export class mjBizAppsCredentialingSubjectContactResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingSubjectContactViewResult)
    async RunmjBizAppsCredentialingSubjectContactViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingSubjectContactViewResult)
    async RunmjBizAppsCredentialingSubjectContactViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingSubjectContactViewResult)
    async RunmjBizAppsCredentialingSubjectContactDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Subject Contacts';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingSubjectContact_, { nullable: true })
    async mjBizAppsCredentialingSubjectContact(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingSubjectContact_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Subject Contacts', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwSubjectContacts')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Subject Contacts', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Subject Contacts', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingSubjectContact_)
    async CreatemjBizAppsCredentialingSubjectContact(
        @Arg('input', () => CreatemjBizAppsCredentialingSubjectContactInput) input: CreatemjBizAppsCredentialingSubjectContactInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Subject Contacts', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingSubjectContact_)
    async UpdatemjBizAppsCredentialingSubjectContact(
        @Arg('input', () => UpdatemjBizAppsCredentialingSubjectContactInput) input: UpdatemjBizAppsCredentialingSubjectContactInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Subject Contacts', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingSubjectContact_)
    async DeletemjBizAppsCredentialingSubjectContact(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Subject Contacts', key, options, provider, userPayload, pubSub);
    }
    
}

//****************************************************************************
// ENTITY CLASS for MJ_BizApps_Credentialing: Subjects
//****************************************************************************
@ObjectType({ description: "A person or organization being credentialed by an accrediting organization." })
export class mjBizAppsCredentialingSubject_ {
    @Field() 
    @MaxLength(36)
    ID: string;
        
    @Field({nullable: true, description: "The accrediting organization that owns this subject record. Cannot be changed after creation."}) 
    @MaxLength(36)
    AccreditingOrganizationID?: string;
        
    @Field({nullable: true, description: "Whether this subject is a person or an organization."}) 
    @MaxLength(20)
    SubjectType?: string;
        
    @Field({nullable: true, description: "The subject's name shown on applications and certificates, unique within its accrediting organization."}) 
    @MaxLength(255)
    DisplayName?: string;
        
    @Field({nullable: true, description: "The primary contact email address for this subject."}) 
    @MaxLength(255)
    PrimaryEmail?: string;
        
    @Field({nullable: true, description: "Whether this subject is active or inactive."}) 
    @MaxLength(20)
    Status?: string;
        
    @Field({nullable: true, description: "The host system entity whose record represents this subject, when linked to a host record."}) 
    @MaxLength(36)
    PartyEntityID?: string;
        
    @Field({nullable: true, description: "The primary key value of the host system party record referenced by PartyEntityID."}) 
    @MaxLength(450)
    PartyRecordID?: string;
        
    @Field() 
    _mj__CreatedAt: Date;
        
    @Field() 
    _mj__UpdatedAt: Date;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    AccreditingOrganization?: string;
        
    @Field({nullable: true}) 
    @MaxLength(255)
    PartyEntity?: string;
        
    @Field(() => [String], { nullable: true, description: `Field-level security: when non-null, the fields on this entity the calling user may read. Any other field arriving as null was withheld by the server rather than genuinely empty. Null for callers with no field restrictions.` })
    ReadableFields___?: string[];
        
}

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Subjects
//****************************************************************************
@InputType()
export class CreatemjBizAppsCredentialingSubjectInput {
    @Field({ nullable: true })
    ID?: string;

    @Field({ nullable: true })
    AccreditingOrganizationID?: string;

    @Field({ nullable: true })
    SubjectType?: string;

    @Field({ nullable: true })
    DisplayName?: string;

    @Field({ nullable: true })
    PrimaryEmail?: string;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    PartyEntityID: string | null;

    @Field({ nullable: true })
    PartyRecordID: string | null;

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    

//****************************************************************************
// INPUT TYPE for MJ_BizApps_Credentialing: Subjects
//****************************************************************************
@InputType()
export class UpdatemjBizAppsCredentialingSubjectInput {
    @Field()
    ID: string;

    @Field({ nullable: true })
    AccreditingOrganizationID?: string;

    @Field({ nullable: true })
    SubjectType?: string;

    @Field({ nullable: true })
    DisplayName?: string;

    @Field({ nullable: true })
    PrimaryEmail?: string;

    @Field({ nullable: true })
    Status?: string;

    @Field({ nullable: true })
    PartyEntityID?: string | null;

    @Field({ nullable: true })
    PartyRecordID?: string | null;

    @Field(() => [KeyValuePairInput], { nullable: true })
    OldValues___?: KeyValuePairInput[];

    @Field(() => RestoreContextInput, { nullable: true })
    RestoreContext___?: RestoreContextInput;
}
    
//****************************************************************************
// RESOLVER for MJ_BizApps_Credentialing: Subjects
//****************************************************************************
@ObjectType()
export class RunmjBizAppsCredentialingSubjectViewResult {
    @Field(() => [mjBizAppsCredentialingSubject_])
    Results: mjBizAppsCredentialingSubject_[];

    @Field(() => String, {nullable: true})
    UserViewRunID?: string;

    @Field(() => Int, {nullable: true})
    RowCount: number;

    @Field(() => Int, {nullable: true})
    TotalRowCount: number;

    @Field(() => Int, {nullable: true})
    ExecutionTime: number;

    @Field({nullable: true})
    ErrorMessage?: string;

    @Field(() => Boolean, {nullable: false})
    Success: boolean;
}

@Resolver(mjBizAppsCredentialingSubject_)
export class mjBizAppsCredentialingSubjectResolver extends ResolverBase {
    @Query(() => RunmjBizAppsCredentialingSubjectViewResult)
    async RunmjBizAppsCredentialingSubjectViewByID(@Arg('input', () => RunViewByIDInput) input: RunViewByIDInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByIDGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingSubjectViewResult)
    async RunmjBizAppsCredentialingSubjectViewByName(@Arg('input', () => RunViewByNameInput) input: RunViewByNameInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        return super.RunViewByNameGeneric(input, provider, userPayload, pubSub);
    }

    @Query(() => RunmjBizAppsCredentialingSubjectViewResult)
    async RunmjBizAppsCredentialingSubjectDynamicView(@Arg('input', () => RunDynamicViewInput) input: RunDynamicViewInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        input.EntityName = 'MJ_BizApps_Credentialing: Subjects';
        return super.RunDynamicViewGeneric(input, provider, userPayload, pubSub);
    }
    @Query(() => mjBizAppsCredentialingSubject_, { nullable: true })
    async mjBizAppsCredentialingSubject(@Arg('ID', () => String) ID: string, @Ctx() { userPayload, providers }: AppContext, @PubSub() pubSub: PubSubEngine): Promise<mjBizAppsCredentialingSubject_ | null> {
        this.CheckUserReadPermissions('MJ_BizApps_Credentialing: Subjects', userPayload);
        const provider = GetReadOnlyProvider(providers, { allowFallbackToReadWrite: true });
        const sSQL = `SELECT * FROM ${provider.QuoteSchemaAndView('__mj_BizAppsCredentialing', 'vwSubjects')} WHERE ${provider.QuoteIdentifier('ID')}=${provider.BuildParameterPlaceholder(0)} ` + this.getRowLevelSecurityWhereClause(provider, 'MJ_BizApps_Credentialing: Subjects', userPayload, EntityPermissionType.Read, 'AND');
        const rows = await provider.ExecuteSQL(sSQL, [ID], undefined, this.GetUserFromPayload(userPayload));
        const result = await this.MapFieldNamesToCodeNames('MJ_BizApps_Credentialing: Subjects', rows && rows.length > 0 ? rows[0] : null, this.GetUserFromPayload(userPayload));
        return result;
    }
    
    @Mutation(() => mjBizAppsCredentialingSubject_)
    async CreatemjBizAppsCredentialingSubject(
        @Arg('input', () => CreatemjBizAppsCredentialingSubjectInput) input: CreatemjBizAppsCredentialingSubjectInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.CreateRecord('MJ_BizApps_Credentialing: Subjects', input, provider, userPayload, pubSub)
    }
        
    @Mutation(() => mjBizAppsCredentialingSubject_)
    async UpdatemjBizAppsCredentialingSubject(
        @Arg('input', () => UpdatemjBizAppsCredentialingSubjectInput) input: UpdatemjBizAppsCredentialingSubjectInput,
        @Ctx() { providers, userPayload }: AppContext,
        @PubSub() pubSub: PubSubEngine
    ) {
        const provider = GetReadWriteProvider(providers);
        return this.UpdateRecord('MJ_BizApps_Credentialing: Subjects', input, provider, userPayload, pubSub);
    }
    
    @Mutation(() => mjBizAppsCredentialingSubject_)
    async DeletemjBizAppsCredentialingSubject(@Arg('ID', () => String) ID: string, @Arg('options___', () => DeleteOptionsInput) options: DeleteOptionsInput, @Ctx() { providers, userPayload }: AppContext, @PubSub() pubSub: PubSubEngine) {
        const provider = GetReadWriteProvider(providers);
        const key = new CompositeKey([{FieldName: 'ID', Value: ID}]);
        return this.DeleteRecord('MJ_BizApps_Credentialing: Subjects', key, options, provider, userPayload, pubSub);
    }
    
}