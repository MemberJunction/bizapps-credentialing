import type { BaseEntity, UserInfo } from '@memberjunction/core';
import type { MJUserEntity } from '@memberjunction/core-entities';
import { Assert, type IntegrationCheckContext } from '@memberjunction/testing-integration/registry';
import type { mjBizAppsCommonOrganizationEntity } from '@mj-biz-apps/common-entities';
import type { mjBizAppsCommitteesCommitteeEntity } from '@mj-biz-apps/committees-entities';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingAccreditingOrganizationEntity,
    mjBizAppsCredentialingOrganizationMembershipEntity,
} from '@mj-biz-apps/credentialing-entities';
import { FindRows, LoadUserInfo, Quote, RequireSave, View } from '../wire.js';
import { EnsureProgramTree, type ProgramTreeSpec } from './program-tree.js';
import {
    GetWorld,
    SetWorld,
    type CredentialingWorld,
    type WorldCommittee,
    type WorldData,
    type WorldOrganization,
    type WorldUsers,
} from './world.js';

const USERS_ENTITY = 'MJ: Users';
const COMMON_ORGANIZATIONS_ENTITY = 'MJ_BizApps_Common: Organizations';
const COMMITTEES_ENTITY = 'Committees: Committees';
const COMMITTEE_TYPES_ENTITY = 'Committees: Types';
/** A committee type shipped in BizApps Committees' own seed data. */
const COMMITTEE_TYPE_NAME = 'Standing Committee';

const STAFF_A_EMAIL = 'staff.a@example.test';
const STAFF_B_EMAIL = 'staff.b@example.test';
const STAFF_NONE_EMAIL = 'staff.none@example.test';

const ORG_A_NAME = 'Sample Accrediting Body A';
const ORG_B_NAME = 'Sample Accrediting Body B';
const COMMITTEE_A_NAME = 'Sample Accrediting Body A Standards Committee';

/** Finds the first row of `entityName` matching `filter` as an entity object of the context user, or null. */
async function findEntity<T extends BaseEntity>(ctx: IntegrationCheckContext, entityName: string, filter: string): Promise<T | null> {
    const res = await View(ctx).RunView<T>({ EntityName: entityName, ExtraFilter: filter, ResultType: 'entity_object' }, ctx.User);
    Assert(res.Success, `RunView ${entityName} failed: ${res.ErrorMessage ?? 'unknown'}`);
    return res.Results[0] ?? null;
}

/** Finds a user by email, or creates it as an active `User`, and returns it with its roles. */
async function ensureUser(ctx: IntegrationCheckContext, email: string, lastName: string): Promise<UserInfo> {
    const rows = await FindRows<{ ID: string }>(ctx, USERS_ENTITY, `Email = '${Quote(email)}'`, ['ID']);
    if (rows.length === 0) {
        const user = await ctx.Provider.GetEntityObject<MJUserEntity>(USERS_ENTITY, ctx.User);
        user.NewRecord();
        user.Name = email;
        user.Email = email;
        user.FirstName = 'Staff';
        user.LastName = lastName;
        user.Type = 'User';
        user.IsActive = true;
        await RequireSave(user, `user ${email}`);
    }
    return LoadUserInfo(ctx, email);
}

/**
 * Creates (or finds) the world's users. Kept apart from {@link EnsureWorldData} so a clean instance
 * can have its users before it has any organization.
 */
export async function EnsureWorldUsers(ctx: IntegrationCheckContext): Promise<WorldUsers> {
    return {
        StaffA: await ensureUser(ctx, STAFF_A_EMAIL, 'A'),
        StaffB: await ensureUser(ctx, STAFF_B_EMAIL, 'B'),
        StaffNoMembership: await ensureUser(ctx, STAFF_NONE_EMAIL, 'None'),
    };
}

/** Finds or creates the BizApps Common organization and the accrediting organization standing for it, both by name. */
async function ensureAccreditingOrganization(ctx: IntegrationCheckContext, name: string): Promise<WorldOrganization> {
    let common = await findEntity<mjBizAppsCommonOrganizationEntity>(ctx, COMMON_ORGANIZATIONS_ENTITY, `Name = '${Quote(name)}'`);
    if (!common) {
        common = await ctx.Provider.GetEntityObject<mjBizAppsCommonOrganizationEntity>(COMMON_ORGANIZATIONS_ENTITY, ctx.User);
        common.NewRecord();
        common.Name = name;
        await RequireSave(common, `common organization ${name}`);
    }
    let accrediting = await findEntity<mjBizAppsCredentialingAccreditingOrganizationEntity>(
        ctx,
        CredentialingEntity.AccreditingOrganization,
        `Name = '${Quote(name)}'`,
    );
    if (!accrediting) {
        accrediting = await ctx.Provider.GetEntityObject<mjBizAppsCredentialingAccreditingOrganizationEntity>(
            CredentialingEntity.AccreditingOrganization,
            ctx.User,
        );
        accrediting.NewRecord();
        accrediting.Name = name;
        accrediting.OrganizationID = common.ID;
        await RequireSave(accrediting, `accrediting organization ${name}`);
    }
    return { ID: accrediting.ID, Name: accrediting.Name, OrganizationID: accrediting.OrganizationID };
}

/** Finds or creates the membership of `user` in `organization`. */
async function ensureMembership(ctx: IntegrationCheckContext, organization: WorldOrganization, user: UserInfo): Promise<void> {
    const filter = `AccreditingOrganizationID = '${Quote(organization.ID)}' AND UserID = '${Quote(user.ID)}'`;
    const rows = await FindRows<{ ID: string }>(ctx, CredentialingEntity.OrganizationMembership, filter, ['ID']);
    if (rows.length > 0) return;
    const membership = await ctx.Provider.GetEntityObject<mjBizAppsCredentialingOrganizationMembershipEntity>(
        CredentialingEntity.OrganizationMembership,
        ctx.User,
    );
    membership.NewRecord();
    membership.AccreditingOrganizationID = organization.ID;
    membership.UserID = user.ID;
    await RequireSave(membership, `membership of ${user.Email} in ${organization.Name}`);
}

/** Finds or creates CommitteeA, owned by OrgA's Common organization, with a committee type from Committees' seed data. */
async function ensureCommittee(ctx: IntegrationCheckContext, owner: WorldOrganization): Promise<WorldCommittee> {
    let committee = await findEntity<mjBizAppsCommitteesCommitteeEntity>(ctx, COMMITTEES_ENTITY, `Name = '${Quote(COMMITTEE_A_NAME)}'`);
    if (!committee) {
        const types = await FindRows<{ ID: string }>(ctx, COMMITTEE_TYPES_ENTITY, `Name = '${Quote(COMMITTEE_TYPE_NAME)}'`, ['ID']);
        Assert(types.length === 1, `expected the Committees seed type '${COMMITTEE_TYPE_NAME}', found ${types.length}`);
        committee = await ctx.Provider.GetEntityObject<mjBizAppsCommitteesCommitteeEntity>(COMMITTEES_ENTITY, ctx.User);
        committee.NewRecord();
        committee.Name = COMMITTEE_A_NAME;
        committee.TypeID = types[0].ID;
        committee.OrganizationID = owner.OrganizationID;
        await RequireSave(committee, `committee ${COMMITTEE_A_NAME}`);
    }
    return { ID: committee.ID, Name: committee.Name };
}

/** The sample program in OrgA: one Draft `2027`, two sections, six standards covering every response type. */
function sampleProgramSpec(orgA: WorldOrganization, committee: WorldCommittee): ProgramTreeSpec {
    return {
        AccreditingOrganizationID: orgA.ID,
        Program: {
            Name: 'Sample Certified Practitioner',
            ProgramType: 'Certification',
            SubjectType: 'Person',
            SubjectNoun: 'professional',
            CredentialPrefix: 'SCP',
        },
        Version: { Label: '2027', CommitteeID: committee.ID },
        Sections: [
            {
                Number: '1',
                Name: 'Eligibility',
                Sequence: 1,
                Standards: [
                    { Code: '1.1', Statement: 'The applicant holds a qualifying degree.', ResponseType: 'Evidence', Sequence: 1 },
                    { Code: '1.2', Statement: 'The applicant attests to the code of conduct.', ResponseType: 'Attestation', Sequence: 2 },
                    { Code: '1.3', Statement: 'The applicant describes two years of supervised practice.', ResponseType: 'Narrative', Sequence: 3 },
                ],
            },
            {
                Number: '2',
                Name: 'Practice',
                Sequence: 2,
                Standards: [
                    { Code: '2.1', Statement: 'The applicant documents continuing education.', ResponseType: 'Composite', Sequence: 1 },
                    { Code: '2.2', Statement: 'The applicant provides a reference letter.', ResponseType: 'Evidence', Sequence: 2 },
                    {
                        Code: '2.3',
                        Statement: 'The applicant exercises sound professional judgement.',
                        ResponseType: 'Narrative',
                        IsInterpretive: true,
                        Sequence: 3,
                    },
                ],
            },
        ],
        DocumentRequirements: [],
    };
}

/**
 * Creates (or finds) the organizations, the staff memberships, the committee and the sample program.
 * The world's users must exist already ({@link EnsureWorldUsers}).
 */
export async function EnsureWorldData(ctx: IntegrationCheckContext): Promise<WorldData> {
    const orgA = await ensureAccreditingOrganization(ctx, ORG_A_NAME);
    const orgB = await ensureAccreditingOrganization(ctx, ORG_B_NAME);
    await ensureMembership(ctx, orgA, await LoadUserInfo(ctx, STAFF_A_EMAIL));
    await ensureMembership(ctx, orgB, await LoadUserInfo(ctx, STAFF_B_EMAIL));
    const committeeA = await ensureCommittee(ctx, orgA);
    const sampleProgram = await EnsureProgramTree(ctx, sampleProgramSpec(orgA, committeeA), ctx.User);
    return { OrgA: orgA, OrgB: orgB, CommitteeA: committeeA, SampleProgram: sampleProgram };
}

export async function LoadWorld(ctx: IntegrationCheckContext): Promise<CredentialingWorld> {
    const users = await EnsureWorldUsers(ctx);
    const data = await EnsureWorldData(ctx);
    const world: CredentialingWorld = { Loaded: true, ...users, ...data };
    SetWorld(world);
    return world;
}

export async function GetOrLoadWorld(ctx: IntegrationCheckContext): Promise<CredentialingWorld> {
    return GetWorld() ?? LoadWorld(ctx);
}
