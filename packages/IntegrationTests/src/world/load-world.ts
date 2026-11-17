import type { BaseEntity, UserInfo } from '@memberjunction/core';
import type { MJUserApplicationEntity, MJUserEntity, MJUserRoleEntity } from '@memberjunction/core-entities';
import { Assert, type IntegrationCheckContext } from '@memberjunction/testing-integration/registry';
import { LoadGeneratedEntities as LoadCommonEntities, type mjBizAppsCommonOrganizationEntity } from '@mj-biz-apps/common-entities';
import { LoadGeneratedEntities as LoadCommitteesEntities, type mjBizAppsCommitteesCommitteeEntity } from '@mj-biz-apps/committees-entities';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingAccreditingOrganizationEntity,
    mjBizAppsCredentialingOrganizationMembershipEntity,
} from '@mj-biz-apps/credentialing-entities';
import { FindRows, LoadUserInfo, Quote, RequireSave, View } from '../wire.js';
import { EnsureWorldApplication, EnsureWorldSubject } from './applicant-world.js';
import { PlaceholderOrganizationProgramSpec } from './placeholder-organization-program.js';
import { EnsureProgramTree, type ProgramTree, type ProgramTreeSpec, type SectionSpec, type StandardSpec } from './program-tree.js';
import {
    GetWorld,
    SetWorld,
    type CredentialingWorld,
    type WorldApplicants,
    type WorldCommittee,
    type WorldData,
    type WorldOrganization,
    type WorldUsers,
} from './world.js';

const USERS_ENTITY = 'MJ: Users';
const ROLES_ENTITY = 'MJ: Roles';
const USER_ROLES_ENTITY = 'MJ: User Roles';
const APPLICATIONS_ENTITY = 'MJ: Applications';
const USER_APPLICATIONS_ENTITY = 'MJ: User Applications';
/** The application organization setup puts in a new staff member's app switcher. */
const CREDENTIALING_APPLICATION = 'Credentialing';
const COMMON_ORGANIZATIONS_ENTITY = 'MJ_BizApps_Common: Organizations';
/** The committees entity, owned by BizApps Committees. */
export const COMMITTEES_ENTITY = 'Committees: Committees';
/** The committee types entity (a catalog), owned by BizApps Committees. */
export const COMMITTEE_TYPES_ENTITY = 'Committees: Types';
/** A committee type shipped in BizApps Committees' own seed data. */
export const COMMITTEE_TYPE_NAME = 'Standing Committee';

// Ensure client entity subclasses for dependency apps are registered even when loaded via client harness.
LoadCommonEntities();
LoadCommitteesEntities();

const STAFF_A_EMAIL = 'staff.a@example.test';
const STAFF_B_EMAIL = 'staff.b@example.test';
const STAFF_NONE_EMAIL = 'staff.none@example.test';
const ADMIN_EMAIL = 'admin@example.test';
const UI_ONLY_EMAIL = 'ui.only@example.test';
const APPLICANT_A_EMAIL = 'applicant.a@example.test';
const APPLICANT_B_EMAIL = 'applicant.b@example.test';
const APPLICANT_TWO_EMAIL = 'applicant.two@example.test';
const APPLICANT_ORG_B_EMAIL = 'applicant.orgb@example.test';

/** The credentialing role every staff member of an accrediting organization holds. */
export const STAFF_ROLE = 'Credentialing Staff';
/** The credentialing role that sets up organizations. */
export const ADMIN_ROLE = 'Credentialing Admin';
/** The external role of a credentialing subject's contact. */
export const APPLICANT_ROLE = 'Credentialing Applicant';
/** MJ's platform role for interactive users; no credentialing role holds it. */
export const UI_ROLE = 'UI';

const ORG_A_NAME = 'Sample Accrediting Body A';
const ORG_B_NAME = 'Sample Accrediting Body B';
const COMMITTEE_A_NAME = 'Sample Accrediting Body A Standards Committee';
const COMMITTEE_B_NAME = 'Sample Accrediting Body B Standards Committee';

/** Finds the first row of `entityName` matching `filter` as an entity object of the context user, or null. */
async function findEntity<T extends BaseEntity>(ctx: IntegrationCheckContext, entityName: string, filter: string): Promise<T | null> {
    const res = await View(ctx).RunView<T>({ EntityName: entityName, ExtraFilter: filter, ResultType: 'entity_object' }, ctx.User);
    Assert(res.Success, `RunView ${entityName} failed: ${res.ErrorMessage ?? 'unknown'}`);
    return res.Results[0] ?? null;
}

/** Finds a user by email, or creates it as an active `User`, and returns its ID. */
async function ensureUserRow(ctx: IntegrationCheckContext, email: string, firstName: string, lastName: string): Promise<string> {
    const rows = await FindRows<{ ID: string }>(ctx, USERS_ENTITY, `Email = '${Quote(email)}'`, ['ID']);
    if (rows.length > 0) {
        return rows[0].ID;
    }
    const user = await ctx.Provider.GetEntityObject<MJUserEntity>(USERS_ENTITY, ctx.User);
    user.NewRecord();
    user.Name = email;
    user.Email = email;
    user.FirstName = firstName;
    user.LastName = lastName;
    user.Type = 'User';
    user.IsActive = true;
    await RequireSave(user, `user ${email}`);
    return user.ID;
}

/** Finds or creates the `MJ: User Roles` row giving the user `userID` the role named `roleName`. */
export async function EnsureUserRole(ctx: IntegrationCheckContext, userID: string, roleName: string): Promise<void> {
    const roles = await FindRows<{ ID: string }>(ctx, ROLES_ENTITY, `Name = '${Quote(roleName)}'`, ['ID']);
    Assert(roles.length === 1, `expected the role '${roleName}', found ${roles.length}`);
    const grants = await FindRows<{ ID: string }>(ctx, USER_ROLES_ENTITY, `UserID = '${Quote(userID)}' AND RoleID = '${Quote(roles[0].ID)}'`, ['ID']);
    if (grants.length > 0) {
        return;
    }
    const grant = await ctx.Provider.GetEntityObject<MJUserRoleEntity>(USER_ROLES_ENTITY, ctx.User);
    grant.NewRecord();
    grant.UserID = userID;
    grant.RoleID = roles[0].ID;
    await RequireSave(grant, `role ${roleName} for user ${userID}`);
}

/**
 * Finds or creates an active user with `email`, gives it each of `roleNames`, and returns it with its
 * roles (as the context user reads them).
 */
export async function EnsureUser(
    ctx: IntegrationCheckContext,
    email: string,
    lastName: string,
    roleNames: readonly string[] = [],
    firstName: string = 'Staff',
): Promise<UserInfo> {
    const userID = await ensureUserRow(ctx, email, firstName, lastName);
    for (const roleName of roleNames) {
        await EnsureUserRole(ctx, userID, roleName);
    }
    return LoadUserInfo(ctx, email);
}

/**
 * Finds or creates the active `MJ: User Applications` row putting the Credentialing application in
 * the user's app switcher — the row organization setup creates for a new staff member. The
 * credentialing roles read their own User Applications rows but cannot create them, and the
 * application is not `DefaultForNewUser`, so a user made directly here needs it from the loader.
 */
async function ensureCredentialingApplication(ctx: IntegrationCheckContext, user: UserInfo): Promise<void> {
    const apps = await FindRows<{ ID: string }>(ctx, APPLICATIONS_ENTITY, `Name = '${CREDENTIALING_APPLICATION}'`, ['ID']);
    Assert(apps.length === 1, `expected the ${CREDENTIALING_APPLICATION} application, found ${apps.length}`);
    const filter = `UserID = '${Quote(user.ID)}' AND ApplicationID = '${Quote(apps[0].ID)}'`;
    if ((await FindRows<{ ID: string }>(ctx, USER_APPLICATIONS_ENTITY, filter, ['ID'])).length > 0) {
        return;
    }
    const row = await ctx.Provider.GetEntityObject<MJUserApplicationEntity>(USER_APPLICATIONS_ENTITY, ctx.User);
    row.NewRecord();
    row.UserID = user.ID;
    row.ApplicationID = apps[0].ID;
    row.Sequence = 0;
    row.IsActive = true;
    await RequireSave(row, `${CREDENTIALING_APPLICATION} application for ${user.Email}`);
}

/**
 * Creates (or finds) the world's users. Kept apart from {@link EnsureWorldData} so a clean instance
 * can have its users before any organization exists.
 */
export async function EnsureWorldUsers(ctx: IntegrationCheckContext): Promise<WorldUsers> {
    const users: WorldUsers = {
        StaffA: await EnsureUser(ctx, STAFF_A_EMAIL, 'A', [STAFF_ROLE]),
        StaffB: await EnsureUser(ctx, STAFF_B_EMAIL, 'B', [STAFF_ROLE]),
        StaffNoMembership: await EnsureUser(ctx, STAFF_NONE_EMAIL, 'None', [STAFF_ROLE]),
        Admin: await EnsureUser(ctx, ADMIN_EMAIL, 'Admin', [ADMIN_ROLE], 'Credentialing'),
        UIOnly: await EnsureUser(ctx, UI_ONLY_EMAIL, 'Only', [UI_ROLE], 'UI'),
        ApplicantA: await EnsureUser(ctx, APPLICANT_A_EMAIL, 'A', [APPLICANT_ROLE], 'Applicant'),
        ApplicantTwo: await EnsureUser(ctx, APPLICANT_TWO_EMAIL, 'Two', [APPLICANT_ROLE], 'Applicant'),
    };
    for (const user of [users.StaffA, users.StaffB, users.StaffNoMembership, users.Admin, users.ApplicantTwo]) {
        await ensureCredentialingApplication(ctx, user);
    }
    return users;
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

/** Finds or creates the committee `name`, owned by `owner`'s Common organization, with a committee type from Committees' seed data. */
async function ensureCommittee(ctx: IntegrationCheckContext, owner: WorldOrganization, name: string): Promise<WorldCommittee> {
    let committee = await findEntity<mjBizAppsCommitteesCommitteeEntity>(ctx, COMMITTEES_ENTITY, `Name = '${Quote(name)}'`);
    if (!committee) {
        const types = await FindRows<{ ID: string }>(ctx, COMMITTEE_TYPES_ENTITY, `Name = '${Quote(COMMITTEE_TYPE_NAME)}'`, ['ID']);
        Assert(types.length === 1, `expected the Committees seed type '${COMMITTEE_TYPE_NAME}', found ${types.length}`);
        committee = await ctx.Provider.GetEntityObject<mjBizAppsCommitteesCommitteeEntity>(COMMITTEES_ENTITY, ctx.User);
        committee.NewRecord();
        committee.Name = name;
        committee.TypeID = types[0].ID;
        committee.OrganizationID = owner.OrganizationID;
        await RequireSave(committee, `committee ${name}`);
    }
    return { ID: committee.ID, Name: committee.Name };
}

/** The sample program in OrgA: one Draft `2027`, two sections, six standards covering every response type, one document requirement. */
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
        DocumentRequirements: [{ Name: 'Degree certificate', Sequence: 1 }],
    };
}

/** Sample Program B in OrgB: one Draft `2027`, one section, one standard, one document requirement. */
function programBSpec(orgB: WorldOrganization): ProgramTreeSpec {
    return {
        AccreditingOrganizationID: orgB.ID,
        Program: {
            Name: 'Sample Program B',
            ProgramType: 'Certification',
            SubjectType: 'Person',
            SubjectNoun: 'professional',
            CredentialPrefix: 'SPB',
        },
        Version: { Label: '2027', CommitteeID: null },
        Sections: [
            {
                Number: '1',
                Name: 'Eligibility',
                Sequence: 1,
                Standards: [{ Code: '1.1', Statement: 'The applicant holds a qualifying credential.', ResponseType: 'Attestation', Sequence: 1 }],
            },
        ],
        DocumentRequirements: [{ Name: 'Proof of credential', Sequence: 1 }],
    };
}

/**
 * `Sample Applicant Program` in OrgA: version `2026`, deciding committee CommitteeA, one section of
 * three standards and one document requirement. The world loader activates it: it is "the sample
 * Active version" applications are started on.
 */
function applicantProgramSpec(orgA: WorldOrganization, committee: WorldCommittee): ProgramTreeSpec {
    return {
        AccreditingOrganizationID: orgA.ID,
        Program: { Name: 'Sample Applicant Program', ProgramType: 'Certification', SubjectType: 'Person', SubjectNoun: 'professional', CredentialPrefix: 'SAP' },
        Version: { Label: '2026', CommitteeID: committee.ID },
        Sections: [
            {
                Number: '1',
                Name: 'Practice',
                Sequence: 1,
                Standards: [
                    { Code: '1.1', Statement: 'The applicant attests to the code of conduct.', ResponseType: 'Attestation', Sequence: 1 },
                    { Code: '1.2', Statement: 'The applicant describes their current practice.', ResponseType: 'Narrative', Sequence: 2 },
                    { Code: '1.3', Statement: 'The applicant provides proof of a qualifying degree.', ResponseType: 'Evidence', Sequence: 3 },
                ],
            },
        ],
        DocumentRequirements: [{ Name: 'Degree certificate', Sequence: 1 }],
    };
}

/** `Sample Program B Applicants` in OrgB: version `2026`, deciding committee CommitteeB, one section of two standards; activated by the loader. */
function applicantProgramBSpec(orgB: WorldOrganization, committee: WorldCommittee): ProgramTreeSpec {
    return {
        AccreditingOrganizationID: orgB.ID,
        Program: { Name: 'Sample Program B Applicants', ProgramType: 'Certification', SubjectType: 'Person', SubjectNoun: 'professional', CredentialPrefix: 'SPA' },
        Version: { Label: '2026', CommitteeID: committee.ID },
        Sections: [
            {
                Number: '1',
                Name: 'Eligibility',
                Sequence: 1,
                Standards: [
                    { Code: '1.1', Statement: 'The applicant holds a qualifying credential.', ResponseType: 'Attestation', Sequence: 1 },
                    { Code: '1.2', Statement: 'The applicant describes their supervised practice.', ResponseType: 'Narrative', Sequence: 2 },
                ],
            },
        ],
        DocumentRequirements: [{ Name: 'Proof of credential', Sequence: 1 }],
    };
}

/** `Sample Large Program` in OrgA: Active version `2026`, 10 sections × 15 standards = 150 standards. */
function sampleLargeProgramSpec(orgA: WorldOrganization, committee: WorldCommittee): ProgramTreeSpec {
    const sections: SectionSpec[] = [];
    for (let s = 1; s <= 10; s++) {
        const standards: StandardSpec[] = [];
        for (let n = 1; n <= 15; n++) {
            standards.push({
                Code: `${s}.${n}`,
                Statement: `Sample large standard ${s}.${n}.`,
                ResponseType: 'Attestation',
                Sequence: n,
            });
        }
        sections.push({ Number: `${s}`, Name: `Large Section ${s}`, Sequence: s, Standards: standards });
    }
    return {
        AccreditingOrganizationID: orgA.ID,
        Program: {
            Name: 'Sample Large Program',
            ProgramType: 'Certification',
            SubjectType: 'Person',
            SubjectNoun: 'professional',
            CredentialPrefix: 'SLP',
        },
        Version: { Label: '2026', CommitteeID: committee.ID },
        Sections: sections,
        DocumentRequirements: [{ Name: 'Large program document', Sequence: 1 }],
    };
}

/** Ensures the tree and activates its version when it is still a Draft (once; later loads find it Active). */
async function ensureActiveProgram(ctx: IntegrationCheckContext, spec: ProgramTreeSpec): Promise<ProgramTree> {
    const tree = await EnsureProgramTree(ctx, spec, ctx.User);
    if (tree.Version.Status === 'Draft') {
        tree.Version.Status = 'Active';
        await RequireSave(tree.Version, `activating version ${spec.Version.Label} of ${spec.Program.Name}`);
    }
    Assert(tree.Version.Status === 'Active', `${spec.Program.Name} ${spec.Version.Label} is Active (found ${tree.Version.Status})`);
    return tree;
}

/**
 * Creates (or finds) the organizations, the staff memberships, the committees, the sample program,
 * Program B and the two Active applicant programs.
 * The world's users must exist already ({@link EnsureWorldUsers}).
 */
export async function EnsureWorldData(ctx: IntegrationCheckContext): Promise<WorldData> {
    const orgA = await ensureAccreditingOrganization(ctx, ORG_A_NAME);
    const orgB = await ensureAccreditingOrganization(ctx, ORG_B_NAME);
    await ensureMembership(ctx, orgA, await LoadUserInfo(ctx, STAFF_A_EMAIL));
    await ensureMembership(ctx, orgB, await LoadUserInfo(ctx, STAFF_B_EMAIL));
    const committeeA = await ensureCommittee(ctx, orgA, COMMITTEE_A_NAME);
    const committeeB = await ensureCommittee(ctx, orgB, COMMITTEE_B_NAME);
    const sampleProgram = await EnsureProgramTree(ctx, sampleProgramSpec(orgA, committeeA), ctx.User);
    const placeholderProgram = await EnsureProgramTree(ctx, PlaceholderOrganizationProgramSpec(orgA.ID), ctx.User);
    const programB = await EnsureProgramTree(ctx, programBSpec(orgB), ctx.User);
    const applicantProgram = await ensureActiveProgram(ctx, applicantProgramSpec(orgA, committeeA));
    const applicantProgramB = await ensureActiveProgram(ctx, applicantProgramBSpec(orgB, committeeB));
    const largeProgram = await ensureActiveProgram(ctx, sampleLargeProgramSpec(orgA, committeeA));
    return {
        OrgA: orgA,
        OrgB: orgB,
        CommitteeA: committeeA,
        CommitteeB: committeeB,
        SampleProgram: sampleProgram,
        PlaceholderProgram: placeholderProgram,
        ProgramB: programB,
        ApplicantProgram: applicantProgram,
        ApplicantProgramB: applicantProgramB,
        LargeProgram: largeProgram,
    };
}

/** Finds or creates a subject contact's account: only `Credentialing Applicant`, with the Credentialing application row. */
async function ensureContactUser(ctx: IntegrationCheckContext, email: string, lastName: string): Promise<UserInfo> {
    const user = await EnsureUser(ctx, email, lastName, [APPLICANT_ROLE], 'Applicant');
    await ensureCredentialingApplication(ctx, user);
    return user;
}

/**
 * The applicant world: two subjects in OrgA (`Sample Applicant One` with two contacts, `Sample
 * Applicant Two`) and one in OrgB, each with a Draft application on its organization's Active
 * version. Written on the server transport only (`applicant-world.ts`).
 */
export async function EnsureApplicantWorld(ctx: IntegrationCheckContext, users: WorldUsers, data: WorldData): Promise<WorldApplicants> {
    const applicantA = users.ApplicantA;
    await ensureCredentialingApplication(ctx, applicantA);
    const applicantTwo = users.ApplicantTwo;
    const applicantB = await ensureContactUser(ctx, APPLICANT_B_EMAIL, 'B');
    const applicantOrgB = await ensureContactUser(ctx, APPLICANT_ORG_B_EMAIL, 'Org B');
    const inOrgA = { AccreditingOrganizationID: data.OrgA.ID, InvitedBy: users.StaffA, Program: data.ApplicantProgram };
    const inOrgB = { AccreditingOrganizationID: data.OrgB.ID, InvitedBy: users.StaffB, Program: data.ApplicantProgramB };
    const subjectOne = await EnsureWorldSubject(ctx, {
        ...inOrgA,
        DisplayName: 'Sample Applicant One',
        FirstName: 'Sample',
        LastName: 'Applicant One',
        PrimaryEmail: APPLICANT_A_EMAIL,
        Contacts: [applicantA, applicantTwo],
    });
    const subjectTwo = await EnsureWorldSubject(ctx, {
        ...inOrgA,
        DisplayName: 'Sample Applicant Two',
        FirstName: 'Sample',
        LastName: 'Applicant Two',
        PrimaryEmail: APPLICANT_B_EMAIL,
        Contacts: [applicantB, applicantTwo],
    });
    subjectTwo.LargeApplicationID = await EnsureWorldApplication(ctx, subjectTwo.ID, data.LargeProgram);
    const subjectOrgB = await EnsureWorldSubject(ctx, {
        ...inOrgB,
        DisplayName: 'Sample Applicant Org B',
        FirstName: 'Sample',
        LastName: 'Applicant Org B',
        PrimaryEmail: APPLICANT_ORG_B_EMAIL,
        Contacts: [applicantOrgB],
    });
    return { SubjectOne: subjectOne, SubjectTwo: subjectTwo, SubjectOrgB: subjectOrgB };
}

export async function LoadWorld(ctx: IntegrationCheckContext): Promise<CredentialingWorld> {
    const users = await EnsureWorldUsers(ctx);
    const data = await EnsureWorldData(ctx);
    const applicants = await EnsureApplicantWorld(ctx, users, data);
    const world: CredentialingWorld = { Loaded: true, ...users, ...data, Applicants: applicants };
    SetWorld(world);
    return world;
}

export async function GetOrLoadWorld(ctx: IntegrationCheckContext): Promise<CredentialingWorld> {
    return GetWorld() ?? LoadWorld(ctx);
}
