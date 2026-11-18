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


import { mjBizAppsCredentialingAccreditingOrganizationEntity, mjBizAppsCredentialingDocumentRequirementEntity, mjBizAppsCredentialingOrganizationMembershipEntity, mjBizAppsCredentialingProgramVersionEntity, mjBizAppsCredentialingProgramEntity, mjBizAppsCredentialingSectionEntity, mjBizAppsCredentialingStandardEntity } from '@mj-biz-apps/credentialing-entities';
    

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