/**
 * `cred-isolation` — the organization boundary. A staff member reads and writes only the rows of the
 * accrediting organizations they are a member of; another organization's IDs are refused exactly
 * like random ones (FRD BR-13); a user holding only `UI`, only `Credentialing Applicant` or
 * `Credentialing Staff` without a membership reads nothing; the administrator reads every
 * organization and no program; and the permission rows themselves carry a row filter wherever the
 * permission model requires one.
 *
 * Server transport: every read and write runs in-process as the world user under test
 * (`FindRows(..., asUser)`, `ctx.Provider.GetEntityObject(name, asUser)`), so the provider applies
 * that user's permissions and row filters exactly as MJAPI does for that user's requests.
 *
 * This module imports nothing from `@mj-biz-apps/credentialing-core-entities-server` but types.
 */
import { randomUUID } from 'node:crypto';
import { CompositeKey, type BaseEntity, type RemoteOpResult, type UserInfo } from '@memberjunction/core';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import {
    CloneVersionToDraftOperation,
    CreateProgramOperation,
    CredentialingEntity,
    NOT_FOUND_REASON,
    ReorderVersionTreeOperation,
    type CreateProgramInput,
} from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingProgramEntity,
    mjBizAppsCredentialingProgramVersionEntity,
    mjBizAppsCredentialingSectionEntity,
    mjBizAppsCredentialingStandardEntity,
} from '@mj-biz-apps/credentialing-entities';
import { FindRows, Quote, View } from '../wire.js';
import { ADMIN_ROLE, APPLICANT_ROLE, GetOrLoadWorld, STAFF_ROLE, UI_ROLE } from '../world/load-world.js';
import type { ProgramTree } from '../world/program-tree.js';
import type { CredentialingWorld, WorldOrganization } from '../world/world.js';

type ProgramEntity = mjBizAppsCredentialingProgramEntity;
type VersionEntity = mjBizAppsCredentialingProgramVersionEntity;
type SectionEntity = mjBizAppsCredentialingSectionEntity;
type StandardEntity = mjBizAppsCredentialingStandardEntity;

const APP_SCHEMA = '__mj_BizAppsCredentialing';
const COMMITTEES_ENTITY = 'Committees: Committees';
const ENTITY_PERMISSIONS_ENTITY = 'MJ: Entity Permissions';
const APPLICATION_ROLES_ENTITY = 'MJ: Application Roles';
const CREDENTIALING_APPLICATION = 'Credentialing';
const REVIEWER_ROLE = 'Credentialing Reviewer';
const COMMITTEE_ROLE = 'Credentialing Committee';
const EXTERNAL_ROLES = [APPLICANT_ROLE, REVIEWER_ROLE, COMMITTEE_ROLE] as const;
const INTERNAL_ROLES = [STAFF_ROLE, ADMIN_ROLE] as const;
const CREDENTIALING_ROLES: readonly string[] = [...INTERNAL_ROLES, ...EXTERNAL_ROLES];
/** Platform entities whose rows route around row filters (FRD NFR-2.2); no credentialing role may hold any grant on them. */
const FORBIDDEN_ENTITIES = ['MJ: Record Changes', 'MJ: Queries'] as const;

/** The seven entities of this app's schema. */
const ALL_ENTITIES: readonly string[] = Object.values(CredentialingEntity);

/** The five program-tree entities, which carry an `AccreditingOrganizationID` only through their program. */
const TREE_ENTITIES = [
    CredentialingEntity.Program,
    CredentialingEntity.ProgramVersion,
    CredentialingEntity.Section,
    CredentialingEntity.Standard,
    CredentialingEntity.DocumentRequirement,
] as const;

/** The refusal the provider gives a read of an entity the user holds no read permission on. */
function noReadSentence(entityName: string): string {
    return `does not have read permissions on ${entityName}`;
}

/** What a user's read of an entity returned: the rows, or the refusal when the read itself was refused. */
interface ReadOutcome<T> {
    Rows: T[];
    Refusal: string | null;
}

/** Reads `entityName` as `asUser`, keeping a refused read as its message instead of throwing. */
async function readAs<T extends object>(
    ctx: IntegrationCheckContext,
    entityName: string,
    filter: string,
    fields: string[],
    asUser: UserInfo,
): Promise<ReadOutcome<T>> {
    const res = await View(ctx).RunView<T>({ EntityName: entityName, ExtraFilter: filter, Fields: fields, ResultType: 'simple' }, asUser);
    return res.Success ? { Rows: res.Results ?? [], Refusal: null } : { Rows: [], Refusal: res.ErrorMessage ?? 'unknown' };
}

/**
 * Asserts the user reads zero rows of every entity in `entityNames`. `refused` says how: `true` — the
 * user holds no read permission, and the read is refused with the provider's no-permission sentence;
 * `false` — the user holds a filtered read, which succeeds and returns nothing.
 */
async function expectReadsNothing(ctx: IntegrationCheckContext, user: UserInfo, entityNames: readonly string[], refused: boolean, label: string): Promise<void> {
    for (const entityName of entityNames) {
        const outcome = await readAs<{ ID: string }>(ctx, entityName, '', ['ID'], user);
        AssertEqual(outcome.Rows.length, 0, `${label}: rows of ${entityName}`);
        if (refused) {
            Assert(
                outcome.Refusal != null && outcome.Refusal.includes(noReadSentence(entityName)),
                `${label}: the read of ${entityName} is refused for want of permission (got ${outcome.Refusal ?? 'a successful read'})`,
            );
        } else {
            Assert(outcome.Refusal == null, `${label}: the filtered read of ${entityName} succeeds (got "${outcome.Refusal}")`);
        }
    }
}

/** The filter selecting the rows of one entity that belong to `organization`, written against the stored views. */
function rowsOfOrganization(entityName: string, organization: WorldOrganization): string {
    const org = `'${Quote(organization.ID)}'`;
    const programs = `SELECT ID FROM [${APP_SCHEMA}].[vwPrograms] WHERE AccreditingOrganizationID = ${org}`;
    const versions = `SELECT ID FROM [${APP_SCHEMA}].[vwProgramVersions] WHERE ProgramID IN (${programs})`;
    switch (entityName) {
        case CredentialingEntity.AccreditingOrganization:
            return `ID = ${org}`;
        case CredentialingEntity.OrganizationMembership:
        case CredentialingEntity.Program:
            return `AccreditingOrganizationID = ${org}`;
        case CredentialingEntity.ProgramVersion:
            return `ProgramID IN (${programs})`;
        default:
            return `ProgramVersionID IN (${versions})`;
    }
}

/** The IDs of every row of every tree level of `tree`, by entity. */
function treeIDs(tree: ProgramTree): Map<string, string[]> {
    return new Map<string, string[]>([
        [CredentialingEntity.Program, [tree.Program.ID]],
        [CredentialingEntity.ProgramVersion, [tree.Version.ID]],
        [CredentialingEntity.Section, tree.Sections.map((s) => s.Section.ID)],
        [CredentialingEntity.Standard, tree.Sections.flatMap((s) => s.Standards.map((st) => st.ID))],
        [CredentialingEntity.DocumentRequirement, tree.DocumentRequirements.map((d) => d.ID)],
    ]);
}

function lower(ids: readonly string[]): Set<string> {
    return new Set(ids.map((id) => id.toLowerCase()));
}

/** Loads `id` of `entityName` as `asUser` and returns whether it loaded. */
async function loadsAs(ctx: IntegrationCheckContext, entityName: string, id: string, asUser: UserInfo): Promise<boolean> {
    const entity = await ctx.Provider.GetEntityObject<BaseEntity>(entityName, asUser);
    return entity.InnerLoad(CompositeKey.FromID(id));
}

/** A new, unsaved entity object of `entityName` for `asUser`, filled by `fill`. */
async function newRecordAs<T extends BaseEntity>(ctx: IntegrationCheckContext, entityName: string, asUser: UserInfo, fill: (entity: T) => void): Promise<T> {
    const entity = await ctx.Provider.GetEntityObject<T>(entityName, asUser);
    entity.NewRecord();
    fill(entity);
    return entity;
}

/** Saves the entity, asserts the save is refused, and returns the refusal's complete message. */
async function refusedSave(entity: BaseEntity, label: string): Promise<string> {
    let saved: boolean;
    try {
        saved = await entity.Save();
    } catch (err: unknown) {
        return err instanceof Error ? err.message : String(err);
    }
    Assert(!saved, `${label}: expected the save to be refused, but it succeeded`);
    return entity.LatestResult?.CompleteMessage ?? '';
}

/** Deletes the entity, asserts the delete is refused, and returns the refusal's complete message. */
async function refusedDelete(entity: BaseEntity, label: string): Promise<string> {
    let deleted: boolean;
    try {
        deleted = await entity.Delete();
    } catch (err: unknown) {
        return err instanceof Error ? err.message : String(err);
    }
    Assert(!deleted, `${label}: expected the delete to be refused, but it succeeded`);
    return entity.LatestResult?.CompleteMessage ?? '';
}

/**
 * Asserts the refusal for another organization's row equals the refusal for a random UUID, and that
 * it is the not-found sentence: the caller learns nothing about whether the ID exists.
 */
function expectSameAsRandom(foreign: string, random: string, label: string): void {
    AssertEqual(foreign, random, `${label}: the refusal for another organization's ID equals the refusal for a random ID`);
    Assert(foreign.includes(NOT_FOUND_REASON), `${label}: the refusal is "${NOT_FOUND_REASON}", got "${foreign}"`);
}

/** The stored row of a standard as a client would send it back for an update or delete. */
async function storedStandardRow(ctx: IntegrationCheckContext, id: string): Promise<Record<string, unknown>> {
    const res = await View(ctx).RunView<Record<string, unknown>>(
        { EntityName: CredentialingEntity.Standard, ExtraFilter: `ID = '${Quote(id)}'`, ResultType: 'simple' },
        ctx.User,
    );
    Assert(res.Success && res.Results.length === 1, `the standard ${id} reads as the context user`);
    return res.Results[0];
}

/** A standard entity object of `asUser` holding `row` as loaded state (the snapshot a client sends with a write). */
async function standardFromRow(ctx: IntegrationCheckContext, row: Record<string, unknown>, asUser: UserInfo): Promise<StandardEntity> {
    const entity = await ctx.Provider.GetEntityObject<StandardEntity>(CredentialingEntity.Standard, asUser);
    await entity.LoadFromData(row);
    return entity;
}

/** A CreateProgram input, run-unique, in `organizationID`. */
function programInput(organizationID: string): CreateProgramInput {
    const hex = randomUUID().replace(/-/g, '').slice(0, 8);
    return {
        AccreditingOrganizationID: organizationID,
        Name: `Isolation ${hex}`,
        ProgramType: 'Certification',
        SubjectType: 'Person',
        SubjectNoun: 'professional',
        CredentialPrefix: `I${hex.toUpperCase()}`,
        Description: null,
        FirstVersionLabel: '2027',
    };
}

function fillProgram(input: CreateProgramInput): (p: ProgramEntity) => void {
    return (p) => {
        p.AccreditingOrganizationID = input.AccreditingOrganizationID;
        p.Name = input.Name;
        p.ProgramType = input.ProgramType;
        p.SubjectType = input.SubjectType;
        p.SubjectNoun = input.SubjectNoun;
        p.CredentialPrefix = input.CredentialPrefix;
    };
}

/** Asserts an operation was refused and returns its message. */
function refusedOperation<T>(result: RemoteOpResult<T>, label: string): string {
    Assert(!result.Success, `${label}: expected the operation to be refused, but it succeeded`);
    return result.ErrorMessage ?? '';
}

/** Programs with `name` in any organization, read as the context user. */
async function programsNamed(ctx: IntegrationCheckContext, name: string): Promise<number> {
    return (await FindRows<{ ID: string }>(ctx, CredentialingEntity.Program, `Name = '${Quote(name)}'`, ['ID'])).length;
}

/** The roles a world user holds, sorted. */
function roleNames(user: UserInfo): string[] {
    return user.UserRoles.map((r) => r.Role).sort();
}

/** Asserts each world user holds exactly its roles: none holds `Developer` or `UI` beside a credentialing role. */
function expectWorldRoles(world: CredentialingWorld): void {
    const expected: [string, UserInfo, string[]][] = [
        ['StaffA', world.StaffA, [STAFF_ROLE]],
        ['StaffB', world.StaffB, [STAFF_ROLE]],
        ['StaffNoMembership', world.StaffNoMembership, [STAFF_ROLE]],
        ['Admin', world.Admin, [ADMIN_ROLE]],
        ['UIOnly', world.UIOnly, [UI_ROLE]],
        ['ApplicantA', world.ApplicantA, [APPLICANT_ROLE]],
    ];
    for (const [label, user, roles] of expected) {
        AssertEqual(roleNames(user).join(', '), roles.join(', '), `roles of ${label} (${user.Email})`);
    }
}

/** One `MJ: Entity Permissions` row, as the permission check reads it. */
interface PermissionRow {
    ID: string;
    EntityID: string;
    Entity: string;
    RoleName: string;
    Type: 'Allow' | 'Deny';
    CanRead: boolean;
    CanCreate: boolean;
    CanUpdate: boolean;
    CanDelete: boolean;
    ReadRLSFilterID: string | null;
    CreateRLSFilterID: string | null;
    UpdateRLSFilterID: string | null;
    DeleteRLSFilterID: string | null;
}

/** The operations a permission row grants without a filter for that operation. */
function unfilteredGrants(row: PermissionRow): string[] {
    const grants: [string, boolean, string | null][] = [
        ['Read', row.CanRead, row.ReadRLSFilterID],
        ['Create', row.CanCreate, row.CreateRLSFilterID],
        ['Update', row.CanUpdate, row.UpdateRLSFilterID],
        ['Delete', row.CanDelete, row.DeleteRLSFilterID],
    ];
    return row.Type === 'Allow' ? grants.filter(([, granted, filter]) => granted && filter == null).map(([op]) => op) : [];
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-isolation.1',
        Name: "staff read their organization's program tree and no row of another organization",
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            expectWorldRoles(world);
            const sample = treeIDs(world.SampleProgram);
            const foreign = treeIDs(world.ProgramB);
            for (const entityName of TREE_ENTITIES) {
                const visible = lower((await FindRows<{ ID: string }>(ctx, entityName, '', ['ID'], world.StaffA)).map((r) => r.ID));
                for (const id of sample.get(entityName) ?? []) {
                    Assert(visible.has(id.toLowerCase()), `StaffA reads the sample program's ${entityName} row ${id}`);
                }
                for (const id of foreign.get(entityName) ?? []) {
                    Assert(!visible.has(id.toLowerCase()), `StaffA does not read Program B's ${entityName} row ${id}`);
                }
            }
            for (const entityName of ALL_ENTITIES) {
                const orgBRows = await FindRows<{ ID: string }>(ctx, entityName, rowsOfOrganization(entityName, world.OrgB), ['ID'], world.StaffA);
                AssertEqual(orgBRows.length, 0, `rows of ${entityName} belonging to OrgB that StaffA reads`);
                const asContext = await FindRows<{ ID: string }>(ctx, entityName, rowsOfOrganization(entityName, world.OrgB), ['ID']);
                Assert(asContext.length > 0, `OrgB has ${entityName} rows (so the zero above is the filter, not an empty table)`);
            }
            const orgs = lower((await FindRows<{ ID: string }>(ctx, CredentialingEntity.AccreditingOrganization, '', ['ID'], world.StaffA)).map((r) => r.ID));
            Assert(orgs.has(world.OrgA.ID.toLowerCase()), 'StaffA reads OrgA');
        },
    },
    {
        Id: 'cred-isolation.2',
        Name: "staff of another organization load none of the sample program's rows by ID",
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = world.SampleProgram;
            const targets: [string, string][] = [
                [CredentialingEntity.Program, tree.Program.ID],
                [CredentialingEntity.ProgramVersion, tree.Version.ID],
                [CredentialingEntity.Section, tree.Sections[0].Section.ID],
                [CredentialingEntity.Standard, tree.Sections[0].Standards[0].ID],
                [CredentialingEntity.DocumentRequirement, tree.DocumentRequirements[0].ID],
            ];
            for (const [entityName, id] of targets) {
                AssertEqual(await loadsAs(ctx, entityName, id, world.StaffB), false, `StaffB loads ${entityName} ${id}`);
                AssertEqual(await loadsAs(ctx, entityName, id, world.StaffA), true, `StaffA loads ${entityName} ${id}`);
            }
        },
    },
    {
        Id: 'cred-isolation.3',
        Name: "staff writes into another organization's program are refused exactly like writes naming a random ID",
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const staffB = world.StaffB;
            const tree = world.SampleProgram;

            const intoOrgA = programInput(world.OrgA.ID);
            const toRandomOrg = programInput(randomUUID());
            expectSameAsRandom(
                await refusedSave(await newRecordAs(ctx, CredentialingEntity.Program, staffB, fillProgram(intoOrgA)), 'program in OrgA'),
                await refusedSave(await newRecordAs(ctx, CredentialingEntity.Program, staffB, fillProgram(toRandomOrg)), 'program in a random organization'),
                'creating a program',
            );
            AssertEqual(await programsNamed(ctx, intoOrgA.Name), 0, 'programs left by the refused create');

            const versionUnder = (programID: string) => (v: VersionEntity) => {
                v.ProgramID = programID;
                v.Label = '2099';
                v.Status = 'Draft';
            };
            expectSameAsRandom(
                await refusedSave(await newRecordAs(ctx, CredentialingEntity.ProgramVersion, staffB, versionUnder(tree.Program.ID)), 'version under the sample program'),
                await refusedSave(await newRecordAs(ctx, CredentialingEntity.ProgramVersion, staffB, versionUnder(randomUUID())), 'version under a random program'),
                'creating a version',
            );

            const sectionUnder = (versionID: string) => (s: SectionEntity) => {
                s.ProgramVersionID = versionID;
                s.Number = '99';
                s.Name = 'Isolation section';
                s.Sequence = 99;
            };
            expectSameAsRandom(
                await refusedSave(await newRecordAs(ctx, CredentialingEntity.Section, staffB, sectionUnder(tree.Version.ID)), 'section under the sample version'),
                await refusedSave(await newRecordAs(ctx, CredentialingEntity.Section, staffB, sectionUnder(randomUUID())), 'section under a random version'),
                'creating a section',
            );

            const standard = tree.Sections[0].Standards[0];
            const stored = await storedStandardRow(ctx, standard.ID);
            const randomRow = { ...stored, ID: randomUUID() };
            const editOf = async (row: Record<string, unknown>): Promise<StandardEntity> => {
                const entity = await standardFromRow(ctx, row, staffB);
                entity.Statement = `Edited across organizations ${randomUUID()}.`;
                return entity;
            };
            expectSameAsRandom(
                await refusedSave(await editOf(stored), 'update of the sample standard'),
                await refusedSave(await editOf(randomRow), 'update of a random standard'),
                'updating a standard',
            );
            expectSameAsRandom(
                await refusedDelete(await standardFromRow(ctx, stored, staffB), 'delete of the sample standard'),
                await refusedDelete(await standardFromRow(ctx, randomRow, staffB), 'delete of a random standard'),
                'deleting a standard',
            );
            const after = await storedStandardRow(ctx, standard.ID);
            AssertEqual(after.Statement, stored.Statement, 'the sample standard is unchanged');

            const asStaffB = { provider: ctx.Provider, user: staffB };
            const opIntoOrgA = programInput(world.OrgA.ID);
            expectSameAsRandom(
                refusedOperation(await new CreateProgramOperation().Execute(opIntoOrgA, asStaffB), 'CreateProgram in OrgA'),
                refusedOperation(await new CreateProgramOperation().Execute(programInput(randomUUID()), asStaffB), 'CreateProgram in a random organization'),
                'CreateProgram',
            );
            AssertEqual(await programsNamed(ctx, opIntoOrgA.Name), 0, 'programs left by the refused CreateProgram');
            expectSameAsRandom(
                refusedOperation(await new CloneVersionToDraftOperation().Execute({ SourceVersionID: tree.Version.ID, NewLabel: '2099' }, asStaffB), 'clone of the sample version'),
                refusedOperation(await new CloneVersionToDraftOperation().Execute({ SourceVersionID: randomUUID(), NewLabel: '2099' }, asStaffB), 'clone of a random version'),
                'CloneVersionToDraft',
            );
            const order = (versionStandards: StandardEntity[]) => versionStandards.map((s, i) => ({ ID: s.ID, Sequence: versionStandards.length - i }));
            const sampleStandards = tree.Sections[0].Standards;
            expectSameAsRandom(
                refusedOperation(
                    await new ReorderVersionTreeOperation().Execute({ VersionID: tree.Version.ID, Sections: [], Standards: order(sampleStandards) }, asStaffB),
                    'reorder of the sample version',
                ),
                refusedOperation(
                    await new ReorderVersionTreeOperation().Execute({ VersionID: randomUUID(), Sections: [], Standards: [{ ID: randomUUID(), Sequence: 1 }] }, asStaffB),
                    'reorder of a random version',
                ),
                'ReorderVersionTree',
            );
        },
    },
    {
        Id: 'cred-isolation.4',
        Name: 'staff with no membership read nothing and cannot create a program in any organization',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const user = world.StaffNoMembership;
            await expectReadsNothing(ctx, user, ALL_ENTITIES, false, 'StaffNoMembership');
            for (const organization of [world.OrgA, world.OrgB]) {
                const input = programInput(organization.ID);
                const message = await refusedSave(await newRecordAs(ctx, CredentialingEntity.Program, user, fillProgram(input)), `program in ${organization.Name}`);
                Assert(message.includes(NOT_FOUND_REASON), `a program in ${organization.Name} is refused as not found, got "${message}"`);
                const operation = refusedOperation(await new CreateProgramOperation().Execute(programInput(organization.ID), { provider: ctx.Provider, user }), `CreateProgram in ${organization.Name}`);
                AssertEqual(operation, NOT_FOUND_REASON, `CreateProgram in ${organization.Name}`);
                AssertEqual(await programsNamed(ctx, input.Name), 0, `programs left in ${organization.Name}`);
            }
        },
    },
    {
        Id: 'cred-isolation.5',
        Name: 'a user holding only UI reads nothing from the credentialing entities',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            await expectReadsNothing(ctx, world.UIOnly, ALL_ENTITIES, true, 'UI only');
        },
    },
    {
        Id: 'cred-isolation.6',
        Name: 'a user holding only Credentialing Applicant reads nothing from the credentialing entities',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            await expectReadsNothing(ctx, world.ApplicantA, ALL_ENTITIES, true, 'Applicant only');
        },
    },
    {
        Id: 'cred-isolation.7',
        Name: 'the administrator reads every accrediting organization and no program',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const all = lower((await FindRows<{ ID: string }>(ctx, CredentialingEntity.AccreditingOrganization, '', ['ID'])).map((r) => r.ID));
            const asAdmin = lower((await FindRows<{ ID: string }>(ctx, CredentialingEntity.AccreditingOrganization, '', ['ID'], world.Admin)).map((r) => r.ID));
            Assert(asAdmin.has(world.OrgA.ID.toLowerCase()) && asAdmin.has(world.OrgB.ID.toLowerCase()), 'the administrator reads OrgA and OrgB');
            AssertEqual(asAdmin.size, all.size, 'the administrator reads every accrediting organization');
            const memberships = await readAs<{ ID: string }>(ctx, CredentialingEntity.OrganizationMembership, '', ['ID'], world.Admin);
            Assert(memberships.Refusal == null, `the administrator reads memberships (${memberships.Refusal})`);
            await expectReadsNothing(ctx, world.Admin, TREE_ENTITIES, true, 'Admin');
        },
    },
    {
        Id: 'cred-isolation.8',
        Name: 'the permission rows carry a filter wherever the model requires one, and UI has no access to the application',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const roleList = CREDENTIALING_ROLES.map((r) => `'${Quote(r)}'`).join(', ');
            const rows = await FindRows<PermissionRow>(ctx, ENTITY_PERMISSIONS_ENTITY, `RoleName IN (${roleList})`, [
                'ID',
                'EntityID',
                'Entity',
                'RoleName',
                'Type',
                'CanRead',
                'CanCreate',
                'CanUpdate',
                'CanDelete',
                'ReadRLSFilterID',
                'CreateRLSFilterID',
                'UpdateRLSFilterID',
                'DeleteRLSFilterID',
            ]);
            Assert(rows.length > 0, 'the credentialing roles hold permission rows');
            const schemaOf = new Map(ctx.Provider.Entities.map((e) => [e.ID.toLowerCase(), e.SchemaName]));
            const violations: string[] = [];
            for (const row of rows) {
                const open = unfilteredGrants(row);
                const external = (EXTERNAL_ROLES as readonly string[]).includes(row.RoleName);
                const outsideApp = schemaOf.get(row.EntityID.toLowerCase()) !== APP_SCHEMA;
                if (open.length > 0 && (external || outsideApp)) {
                    violations.push(`${row.RoleName} on ${row.Entity}: ${open.join('/')} unfiltered`);
                }
                if ((FORBIDDEN_ENTITIES as readonly string[]).includes(row.Entity)) {
                    violations.push(`${row.RoleName} holds a permission row on ${row.Entity}`);
                }
            }
            AssertEqual(violations.join('; '), '', 'permission rows that break the model');

            const uiGrants = await FindRows<{ ID: string }>(ctx, APPLICATION_ROLES_ENTITY, `Application = '${CREDENTIALING_APPLICATION}' AND Role = '${UI_ROLE}'`, ['ID']);
            AssertEqual(uiGrants.length, 0, `application roles giving ${CREDENTIALING_APPLICATION} to ${UI_ROLE}`);
            const granted = (await FindRows<{ Role: string }>(ctx, APPLICATION_ROLES_ENTITY, `Application = '${CREDENTIALING_APPLICATION}' AND CanAccess = 1`, ['Role'])).map((r) => r.Role);
            for (const role of CREDENTIALING_ROLES) {
                Assert(granted.includes(role), `${role} has access to ${CREDENTIALING_APPLICATION}`);
            }
        },
    },
    {
        Id: 'cred-isolation.9',
        Name: "staff read their organization's committees and no other",
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const byStaffA = lower((await FindRows<{ ID: string }>(ctx, COMMITTEES_ENTITY, '', ['ID'], world.StaffA)).map((r) => r.ID));
            Assert(byStaffA.has(world.CommitteeA.ID.toLowerCase()), 'StaffA reads CommitteeA');
            for (const [label, user] of [['StaffB', world.StaffB], ['StaffNoMembership', world.StaffNoMembership]] as const) {
                const rows = await FindRows<{ ID: string }>(ctx, COMMITTEES_ENTITY, '', ['ID'], user);
                AssertEqual(rows.length, 0, `committees ${label} reads`);
            }
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
