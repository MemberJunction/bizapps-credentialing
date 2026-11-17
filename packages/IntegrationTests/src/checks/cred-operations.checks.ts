/**
 * `cred-operations` — the five credentialing remote operations, called in-process on the server
 * transport with `{ provider, user }`: CreateProgram, CloneVersionToDraft, ReorderVersionTree,
 * CreateOrganization and CreateCommittee. Every check works on its own scratch program or run-unique
 * names.
 *
 * The program operations act as `StaffA`, who holds only `Credentialing Staff` and a membership of
 * OrgA (where every scratch program is made), so they run under staff's row-filtered permissions;
 * organization setup acts as the world's `Admin`.
 *
 * `.16`–`.20` create committees for a scratch program of OrgA as `StaffA` (who holds no Create
 * permission on committees: the operation writes them itself). Each uses run-unique committee names
 * and deletes the committees it created when it ends, so OrgA's committee list is left as it was.
 *
 * `.13` and `.14` delete accrediting organizations as the admin: refused with a sentence while the
 * organization has members or programs, deleted (its Common organization kept) once it has neither.
 * The delete's lock ordering against a program create is covered by the unit tests
 * (`AccreditingOrganizationDelete.test.ts`), not raced here: a create needs its author's membership
 * until its version is inserted (the platform re-checks the row filter on each save), and the admin
 * can delete the organization only after deleting that membership, so through the public paths the
 * programs check cannot be made to overlap an open create that will commit (docs/dev-instance.md).
 *
 * Server transport only: `.3` writes one column with SQL, `.6` sets a static test seam on the server
 * operation class, and `.7`/`.9`/`.12`/`.20` need separate provider instances. The wire path is proven by
 * `cred-operations-wire` on the client transport.
 *
 * This module imports nothing from `@mj-biz-apps/credentialing-core-entities-server` but types: the
 * server classes are reached through the class factory, the way MJ dispatches the operations.
 */
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { BaseRemotableOperation, DatabaseProviderBase, type IMetadataProvider, type RemoteOpResult, type UserInfo } from '@memberjunction/core';
import { MJGlobal } from '@memberjunction/global';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import {
    CloneVersionToDraftOperation,
    CreateCommitteeOperation,
    CreateOrganizationOperation,
    CreateProgramOperation,
    CredentialingEntity,
    CredentialingOperation,
    ReorderVersionTreeOperation,
    type CloneVersionToDraftOutput,
    type CreateCommitteeInput,
    type CreateCommitteeOutput,
    type CreateOrganizationOutput,
    type CreateProgramInput,
} from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCommitteesCommitteeEntity } from '@mj-biz-apps/committees-entities';
import type {
    mjBizAppsCredentialingAccreditingOrganizationEntity,
    mjBizAppsCredentialingOrganizationMembershipEntity,
    mjBizAppsCredentialingProgramEntity,
    mjBizAppsCredentialingStandardEntity,
} from '@mj-biz-apps/credentialing-entities';
import { Outcome, WithActors } from '../actors.js';
import { CountRows, FindRows, LoadEntity, LoadUserInfo, Quote, RequireDelete, RequireSave } from '../wire.js';
import { ADMIN_ROLE, COMMITTEE_TYPE_NAME, COMMITTEE_TYPES_ENTITY, COMMITTEES_ENTITY, EnsureUser, GetOrLoadWorld, STAFF_ROLE } from '../world/load-world.js';
import { MakeScratchProgram, type ProgramTree } from '../world/program-tree.js';
import type { CredentialingWorld } from '../world/world.js';

type StandardEntity = mjBizAppsCredentialingStandardEntity;
type AccreditingOrganizationEntity = mjBizAppsCredentialingAccreditingOrganizationEntity;
type MembershipEntity = mjBizAppsCredentialingOrganizationMembershipEntity;
type ProgramEntity = mjBizAppsCredentialingProgramEntity;
type CommitteeEntity = mjBizAppsCommitteesCommitteeEntity;

const APP_SCHEMA = '__mj_BizAppsCredentialing';
const NOT_FOUND_SENTENCE = 'Record not found.';
const STALE_SENTENCE = 'This record was changed by someone else. Reload it and try again.';
const TREE_EDIT_SENTENCE = 'Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.';
const BLANK_LABEL_SENTENCE = 'Enter a label for this version.';
const BLANK_PROGRAM_NAME_SENTENCE = "Enter the program's name.";
const BLANK_PREFIX_SENTENCE = 'Enter the credential prefix.';
const BLANK_NOUN_SENTENCE = 'Enter the subject noun.';
const COMMON_ORGANIZATIONS_ENTITY = 'MJ_BizApps_Common: Organizations';
const PROGRAMS_FIRST_SENTENCE = "Remove this organization's programs before deleting it.";
const MEMBERS_FIRST_SENTENCE = "Remove this organization's members before deleting it.";
const BLANK_COMMITTEE_NAME_SENTENCE = "Enter the committee's name.";
const COMMITTEE_TYPE_SENTENCE = 'Choose a committee type.';
/** Rounds of the reorder-against-edit race in `.7`, alternating which write leads. */
const REORDER_RACE_ROUNDS = 4;
/** How long the second of two concurrent writes in `.7` starts after the first. */
const FOLLOWER_DELAY_MS = 5;

function oneDraftSentence(label: string): string {
    return `This program already has a draft version (${label}). Finish or delete it before starting another.`;
}

function duplicateNameSentence(name: string): string {
    return `A program named ${name} already exists in this organization.`;
}

function duplicatePrefixSentence(prefix: string): string {
    return `Credential prefix ${prefix} is already used in this organization.`;
}

function duplicateCommitteeSentence(name: string): string {
    return `A committee named ${name} already exists for this organization.`;
}

/** Programs of OrgA whose trimmed name or prefix matches, ignoring case — what a duplicate would add to. */
async function programsLike(ctx: IntegrationCheckContext, world: CredentialingWorld, column: 'Name' | 'CredentialPrefix', value: string): Promise<number> {
    return CountRows(ctx, CredentialingEntity.Program, `AccreditingOrganizationID = '${Quote(world.OrgA.ID)}' AND LOWER(LTRIM(RTRIM(${column}))) = '${Quote(value.trim().toLowerCase())}'`);
}

function noUserSentence(email: string): string {
    return `No user has the email address ${email}. Create the user first, then set up the organization.`;
}

function runHex(): string {
    return randomUUID().replace(/-/g, '').slice(0, 8);
}

/** Asserts a refused result whose message contains `fragment`. */
function ExpectRefused<T>(result: RemoteOpResult<T>, fragment: string, label: string): void {
    Assert(!result.Success, `${label}: expected the operation to be refused with "${fragment}", but it succeeded`);
    Assert((result.ErrorMessage ?? '').includes(fragment), `${label}: expected "${fragment}", got ${result.ResultCode}: "${result.ErrorMessage}"`);
}

/** Asserts a successful result and returns its output. */
function ExpectOutput<T>(result: RemoteOpResult<T>, label: string): T {
    Assert(result.Success && result.Output != null, `${label} failed: ${result.ResultCode}: ${result.ErrorMessage ?? 'no output'}`);
    return result.Output;
}

/** Activates the tree's version through its own entity object, as the context user. */
async function activate(tree: ProgramTree): Promise<void> {
    tree.Version.Status = 'Active';
    await RequireSave(tree.Version, `activating version ${tree.Version.Label}`);
}

/** A scratch program with a committee, activated by the check. */
async function activatedScratch(
    ctx: IntegrationCheckContext,
    world: CredentialingWorld,
    shape: { Sections: number; StandardsPerSection: number; DocumentRequirements?: number },
): Promise<ProgramTree> {
    const tree = await MakeScratchProgram(ctx, world, { ...shape, CommitteeID: world.CommitteeA.ID }, ctx.User);
    await activate(tree);
    return tree;
}

/** Version, section and standard counts of a program, read as the context user. */
async function programCounts(ctx: IntegrationCheckContext, programID: string): Promise<{ Versions: number; Sections: number; Standards: number }> {
    const versions = `ProgramVersionID IN (SELECT ID FROM [${APP_SCHEMA}].[vwProgramVersions] WHERE ProgramID = '${Quote(programID)}')`;
    return {
        Versions: await CountRows(ctx, CredentialingEntity.ProgramVersion, `ProgramID = '${Quote(programID)}'`),
        Sections: await CountRows(ctx, CredentialingEntity.Section, versions),
        Standards: await CountRows(ctx, CredentialingEntity.Standard, versions),
    };
}

/** A CreateProgram input in OrgA with a run-unique name and prefix. */
function programInput(world: CredentialingWorld, label: string): CreateProgramInput {
    const hex = runHex();
    return {
        AccreditingOrganizationID: world.OrgA.ID,
        Name: `Operations ${hex}`,
        ProgramType: 'Certification',
        SubjectType: 'Person',
        SubjectNoun: 'professional',
        CredentialPrefix: `O${hex.toUpperCase()}`,
        Description: null,
        FirstVersionLabel: label,
    };
}

/** Standards of a version as stored: ID, code, lineage, mode, flag, sequence. */
interface StoredStandard {
    ID: string;
    Code: string;
    Statement: string;
    LineageKey: string;
    EvaluationMode: StandardEntity['EvaluationMode'];
    IsNewForVersion: boolean;
    Sequence: number;
}

function readStandards(ctx: IntegrationCheckContext, versionID: string): Promise<StoredStandard[]> {
    return FindRows<StoredStandard>(ctx, CredentialingEntity.Standard, `ProgramVersionID = '${Quote(versionID)}'`, [
        'ID',
        'Code',
        'Statement',
        'LineageKey',
        'EvaluationMode',
        'IsNewForVersion',
        'Sequence',
    ]);
}

/** Every standard of a tree, in tree order. */
function treeStandards(tree: ProgramTree): StandardEntity[] {
    return tree.Sections.flatMap((s) => s.Standards);
}

/** The positions that reverse the order of `standards`. */
function reversed(standards: StandardEntity[]): { ID: string; Sequence: number }[] {
    return standards.map((s, i) => ({ ID: s.ID, Sequence: standards.length - i }));
}

/** The static test seam of the server clone operation, reached through the class the server dispatches to. */
interface CloneFailSeam {
    FailAfterStandards: number | null;
}

function hasCloneFailSeam(candidate: object | null | undefined): candidate is CloneFailSeam {
    return candidate != null && 'FailAfterStandards' in candidate;
}

function CloneFailSeam(): CloneFailSeam {
    const registration = MJGlobal.Instance.ClassFactory.GetRegistration(BaseRemotableOperation, CredentialingOperation.CloneVersionToDraft);
    const subClass: object | null = registration?.SubClass ?? null;
    if (!hasCloneFailSeam(subClass)) {
        throw new Error('the registered CloneVersionToDraft operation is not the server class with its FailAfterStandards seam');
    }
    return subClass;
}

/** Sets one standard's evaluation mode with SQL: no code path in this release can store another mode. */
async function setEvaluationModeBySQL(ctx: IntegrationCheckContext, standardID: string, mode: StandardEntity['EvaluationMode']): Promise<void> {
    const database = ctx.Provider;
    if (!(database instanceof DatabaseProviderBase)) {
        throw new Error('this check needs the server transport (a database provider)');
    }
    await database.ExecuteSQL(
        // Positional parameters through the provider-neutral signature: they bind as @p0 and @p1.
        `UPDATE [${APP_SCHEMA}].[Standard] SET EvaluationMode = @p0 WHERE ID = @p1`,
        [mode, standardID],
        { description: 'cred-operations.3: stand-in for the Trust screen' },
        ctx.User,
    );
}

/** Counts of the rows organization setup creates, read as the context user. */
async function organizationCounts(
    ctx: IntegrationCheckContext,
    name: string,
    userID: string,
): Promise<{ Accrediting: number; Common: number; Memberships: number; StaffRoles: number; Applications: number }> {
    const user = `UserID = '${Quote(userID)}'`;
    return {
        Accrediting: await CountRows(ctx, CredentialingEntity.AccreditingOrganization, `Name = '${Quote(name)}'`),
        Common: await CountRows(ctx, COMMON_ORGANIZATIONS_ENTITY, `Name = '${Quote(name)}'`),
        Memberships: await CountRows(
            ctx,
            CredentialingEntity.OrganizationMembership,
            `${user} AND AccreditingOrganizationID IN (SELECT ID FROM [${APP_SCHEMA}].[vwAccreditingOrganizations] WHERE Name = '${Quote(name)}')`,
        ),
        StaffRoles: await CountRows(ctx, 'MJ: User Roles', `${user} AND Role = '${Quote(STAFF_ROLE)}'`),
        Applications: await CountRows(ctx, 'MJ: User Applications', `${user} AND Application = 'Credentialing'`),
    };
}

/** Asserts exactly one row of every kind organization setup creates. */
async function expectOneOfEach(ctx: IntegrationCheckContext, name: string, output: CreateOrganizationOutput): Promise<void> {
    const counts = await organizationCounts(ctx, name, output.StaffUserID);
    AssertEqual(counts.Accrediting, 1, 'accrediting organizations with the name');
    AssertEqual(counts.Common, 1, 'Common organizations with the name');
    AssertEqual(counts.Memberships, 1, 'memberships of the staff member');
    AssertEqual(counts.StaffRoles, 1, 'Credentialing Staff role rows of the staff member');
    AssertEqual(counts.Applications, 1, 'Credentialing application rows of the staff member');
    const accrediting = await FindRows<{ OrganizationID: string }>(
        ctx,
        CredentialingEntity.AccreditingOrganization,
        `ID = '${Quote(output.AccreditingOrganizationID)}'`,
        ['OrganizationID'],
    );
    AssertEqual(accrediting.length, 1, 'the accrediting organization returned exists');
    AssertEqual(await CountRows(ctx, COMMON_ORGANIZATIONS_ENTITY, `ID = '${Quote(accrediting[0].OrganizationID)}' AND Name = '${Quote(name)}'`), 1, 'its Common organization was created with the name');
}

/** A user no world check reads, for organization setup to make a staff member. */
function newStaffUser(ctx: IntegrationCheckContext, hex: string): Promise<UserInfo> {
    return EnsureUser(ctx, `org.staff.${hex}@example.test`, `Org ${hex}`);
}

function sameOutput(a: CreateOrganizationOutput, b: CreateOrganizationOutput): boolean {
    return (
        a.AccreditingOrganizationID.toLowerCase() === b.AccreditingOrganizationID.toLowerCase() &&
        a.MembershipID.toLowerCase() === b.MembershipID.toLowerCase() &&
        a.StaffUserID.toLowerCase() === b.StaffUserID.toLowerCase()
    );
}

/**
 * One round of the reorder race in `.7`: on two provider instances, a save of one standard's
 * `Statement` and a reorder of its version. `editFirst` decides which leads; the other starts
 * {@link FOLLOWER_DELAY_MS} later, while the leader's transaction is still open.
 */
async function reorderAgainstEdit(ctx: IntegrationCheckContext, world: CredentialingWorld, staff: UserInfo, editFirst: boolean): Promise<'edit' | 'stale'> {
    const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 3 }, ctx.User);
    const standards = treeStandards(tree);
    const target = standards[0];
    const order = reversed(standards);
    const newStatement = `Edited during a reorder ${runHex()}.`;
    return WithActors(ctx, 2, async (actors) => {
        const edit = await LoadEntity<StandardEntity>(ctx, CredentialingEntity.Standard, target.ID, ctx.User, actors[0]);
        edit.Statement = newStatement;
        const reorder = (): Promise<RemoteOpResult<unknown>> =>
            new ReorderVersionTreeOperation().Execute({ VersionID: tree.Version.ID, Sections: [], Standards: order }, { provider: actors[1], user: staff });
        let saving: Promise<boolean>;
        let reordering: Promise<RemoteOpResult<unknown>>;
        if (editFirst) {
            saving = edit.Save();
            await delay(FOLLOWER_DELAY_MS);
            reordering = reorder();
        } else {
            reordering = reorder();
            await delay(FOLLOWER_DELAY_MS);
            saving = edit.Save();
        }
        const [saved, reordered] = await Promise.allSettled([saving, reordering]);
        Assert(reordered.status === 'fulfilled' && reordered.value.Success, `the reorder succeeds (${reordered.status === 'fulfilled' ? reordered.value.ErrorMessage : String(reordered.reason)})`);
        const editOutcome = Outcome(saved, () => edit.LatestResult?.CompleteMessage ?? '');
        const stored = (await readStandards(ctx, tree.Version.ID)).find((s) => s.ID.toLowerCase() === target.ID.toLowerCase());
        Assert(stored != null, 'the edited standard still exists');
        AssertEqual(stored.Sequence, order[0].Sequence, 'the standard has its new Sequence');
        if (editOutcome.Succeeded) {
            AssertEqual(stored.Statement, newStatement, 'the edit that succeeded is stored (the reorder wrote no older Statement)');
            return 'edit';
        }
        Assert(editOutcome.Message.includes(STALE_SENTENCE), `a refused edit gives the stale sentence, got "${editOutcome.Message}"`);
        AssertEqual(stored.Statement, target.Statement, 'a refused edit leaves the original Statement');
        return 'stale';
    });
}

/** A run-unique organization set up by the world's admin, with its new staff member holding their role. */
interface ScratchOrganization {
    Name: string;
    Output: CreateOrganizationOutput;
    Staff: UserInfo;
    CommonOrganizationID: string;
}

async function scratchOrganization(ctx: IntegrationCheckContext, world: CredentialingWorld): Promise<ScratchOrganization> {
    const hex = runHex();
    const staffUser = await newStaffUser(ctx, hex);
    const name = `Deletion Body ${hex}`;
    const output = ExpectOutput(
        await new CreateOrganizationOperation().Execute({ Name: name, FirstStaffEmail: staffUser.Email }, { provider: ctx.Provider, user: world.Admin }),
        'CreateOrganization',
    );
    const rows = await FindRows<{ OrganizationID: string }>(ctx, CredentialingEntity.AccreditingOrganization, `ID = '${Quote(output.AccreditingOrganizationID)}'`, ['OrganizationID']);
    AssertEqual(rows.length, 1, 'the new accrediting organization exists');
    // Reloaded after setup, so the staff member carries the Credentialing Staff role it granted.
    return { Name: name, Output: output, Staff: await LoadUserInfo(ctx, staffUser.Email), CommonOrganizationID: rows[0].OrganizationID };
}

/** A CreateProgram input in `organizationID` with a run-unique name and prefix. */
function programInputIn(organizationID: string): CreateProgramInput {
    const hex = runHex();
    return {
        AccreditingOrganizationID: organizationID,
        Name: `Deletion ${hex}`,
        ProgramType: 'Certification',
        SubjectType: 'Person',
        SubjectNoun: 'professional',
        CredentialPrefix: `D${hex.toUpperCase()}`,
        Description: null,
        FirstVersionLabel: '2027',
    };
}

/** Rows of a scratch organization, read as the context user. */
async function scratchCounts(ctx: IntegrationCheckContext, org: ScratchOrganization): Promise<{ Accrediting: number; Common: number; Programs: number; Memberships: number }> {
    const id = `'${Quote(org.Output.AccreditingOrganizationID)}'`;
    return {
        Accrediting: await CountRows(ctx, CredentialingEntity.AccreditingOrganization, `ID = ${id}`),
        Common: await CountRows(ctx, COMMON_ORGANIZATIONS_ENTITY, `ID = '${Quote(org.CommonOrganizationID)}'`),
        Programs: await CountRows(ctx, CredentialingEntity.Program, `AccreditingOrganizationID = ${id}`),
        Memberships: await CountRows(ctx, CredentialingEntity.OrganizationMembership, `AccreditingOrganizationID = ${id}`),
    };
}

/** The admin's delete of a scratch organization: whether it succeeded and the message when it did not. */
async function adminDelete(organization: AccreditingOrganizationEntity): Promise<{ Deleted: boolean; Message: string }> {
    const deleted = await organization.Delete();
    return { Deleted: deleted, Message: deleted ? '' : organization.LatestResult?.CompleteMessage ?? '' };
}

/** A committee as stored: its owner, type and the columns the operation sets. */
type StoredCommittee = Pick<CommitteeEntity, 'ID' | 'Name' | 'TypeID' | 'OrganizationID' | 'Status' | 'IsPublic'>;

const STORED_COMMITTEE_FIELDS: (keyof StoredCommittee)[] = ['ID', 'Name', 'TypeID', 'OrganizationID', 'Status', 'IsPublic'];

/** A run-unique committee name no other check or run uses. */
function scratchCommitteeName(): string {
    return `Scratch Committee ${runHex()}`;
}

/** Every committee, of any organization, whose trimmed name matches ignoring case — read as the context user. */
function committeesNamed(ctx: IntegrationCheckContext, name: string): Promise<StoredCommittee[]> {
    return FindRows<StoredCommittee>(ctx, COMMITTEES_ENTITY, `LOWER(LTRIM(RTRIM(Name))) = '${Quote(name.trim().toLowerCase())}'`, STORED_COMMITTEE_FIELDS);
}

/** How many committees a Common organization owns, read as the context user. */
function committeesOwnedBy(ctx: IntegrationCheckContext, commonOrganizationID: string): Promise<number> {
    return CountRows(ctx, COMMITTEES_ENTITY, `OrganizationID = '${Quote(commonOrganizationID)}'`);
}

/** Whether `asUser` can read the committee through `Committees: Committees` (their row filter applies). */
async function canReadCommittee(ctx: IntegrationCheckContext, committeeID: string, asUser: UserInfo): Promise<boolean> {
    const rows = await FindRows<{ ID: string }>(ctx, COMMITTEES_ENTITY, `ID = '${Quote(committeeID)}'`, ['ID'], asUser);
    return rows.length > 0;
}

/** The ID of a committee type from BizApps Committees' own seed data. */
async function seedCommitteeTypeID(ctx: IntegrationCheckContext): Promise<string> {
    const types = await FindRows<{ ID: string }>(ctx, COMMITTEE_TYPES_ENTITY, `Name = '${Quote(COMMITTEE_TYPE_NAME)}'`, ['ID']);
    AssertEqual(types.length, 1, `committee types named ${COMMITTEE_TYPE_NAME}`);
    return types[0].ID;
}

/** Deletes, as the context user, every committee a check created under `names`, so OrgA's committee list is left as it was. */
async function removeCommitteesNamed(ctx: IntegrationCheckContext, names: readonly string[]): Promise<void> {
    for (const name of names) {
        for (const row of await committeesNamed(ctx, name)) {
            const committee = await LoadEntity<CommitteeEntity>(ctx, COMMITTEES_ENTITY, row.ID);
            await RequireDelete(committee, `removing scratch committee ${row.Name}`);
        }
    }
}

/** Calls CreateCommittee as `user` on `provider` (default: the context provider). */
function createCommittee(
    ctx: IntegrationCheckContext,
    input: CreateCommitteeInput,
    user: UserInfo,
    provider: IMetadataProvider = ctx.Provider,
): Promise<RemoteOpResult<CreateCommitteeOutput>> {
    return new CreateCommitteeOperation().Execute(input, { provider, user });
}

/** A scratch program of OrgA, a seed committee type and a run-unique name: what a CreateCommittee check starts from. */
interface CommitteeScratch {
    Input: CreateCommitteeInput;
    /** Committees OrgA's Common organization owned before the check created any. */
    OwnedBefore: number;
}

async function committeeScratch(ctx: IntegrationCheckContext, world: CredentialingWorld): Promise<CommitteeScratch> {
    const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1 }, ctx.User);
    return {
        Input: { ProgramID: tree.Program.ID, Name: scratchCommitteeName(), CommitteeTypeID: await seedCommitteeTypeID(ctx) },
        OwnedBefore: await committeesOwnedBy(ctx, world.OrgA.OrganizationID),
    };
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-operations.1',
        Name: 'CreateProgram creates the program and its Draft; the same name again creates nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const staff = world.StaffA;
            const input = programInput(world, '2027');
            const output = ExpectOutput(await new CreateProgramOperation().Execute(input, { provider: ctx.Provider, user: staff }), 'CreateProgram');
            const versions = await FindRows<{ ID: string; Label: string; Status: string }>(
                ctx,
                CredentialingEntity.ProgramVersion,
                `ProgramID = '${Quote(output.ProgramID)}'`,
                ['ID', 'Label', 'Status'],
            );
            AssertEqual(versions.length, 1, 'versions of the new program');
            AssertEqual(versions[0].ID.toLowerCase(), output.VersionID.toLowerCase(), 'the version returned');
            AssertEqual(versions[0].Label, '2027', 'its label');
            AssertEqual(versions[0].Status, 'Draft', 'its status');

            const again = await new CreateProgramOperation().Execute(input, { provider: ctx.Provider, user: staff });
            Assert(!again.Success, 'a second program with the same name in the same organization is refused');
            const byName = `AccreditingOrganizationID = '${Quote(world.OrgA.ID)}' AND Name = '${Quote(input.Name)}'`;
            AssertEqual(await CountRows(ctx, CredentialingEntity.Program, byName), 1, 'programs with the name');
            AssertEqual(await CountRows(ctx, CredentialingEntity.ProgramVersion, `ProgramID = '${Quote(output.ProgramID)}'`), 1, 'versions of the program');
        },
    },
    {
        Id: 'cred-operations.2',
        Name: 'CreateProgram with a blank first label is refused and leaves no program row',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const staff = world.StaffA;
            const input = programInput(world, '   ');
            const result = await new CreateProgramOperation().Execute(input, { provider: ctx.Provider, user: staff });
            ExpectRefused(result, BLANK_LABEL_SENTENCE, 'CreateProgram with a blank label');
            AssertEqual(result.ResultCode, 'REFUSED', 'ResultCode');
            const byName = `AccreditingOrganizationID = '${Quote(world.OrgA.ID)}' AND Name = '${Quote(input.Name)}'`;
            AssertEqual(await CountRows(ctx, CredentialingEntity.Program, byName), 0, 'program rows (the unit of work rolled back)');
        },
    },
    {
        Id: 'cred-operations.3',
        Name: 'CloneVersionToDraft copies the tree, keeps lineage and evaluation mode, and leaves the source Active',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const staff = world.StaffA;
            const source = await activatedScratch(ctx, world, { Sections: 2, StandardsPerSection: 3, DocumentRequirements: 2 });
            const assisted = source.Sections[1].Standards[1];
            await setEvaluationModeBySQL(ctx, assisted.ID, 'AI Assisted');
            const sourceBefore = await readStandards(ctx, source.Version.ID);

            const output: CloneVersionToDraftOutput = ExpectOutput(
                await new CloneVersionToDraftOperation().Execute({ SourceVersionID: source.Version.ID, NewLabel: '2028' }, { provider: ctx.Provider, user: staff }),
                'CloneVersionToDraft',
            );
            AssertEqual(output.SectionCount, 2, 'SectionCount');
            AssertEqual(output.StandardCount, 6, 'StandardCount');
            AssertEqual(output.DocumentRequirementCount, 2, 'DocumentRequirementCount');

            const draft = await FindRows<{ Status: string; Label: string; ClonedFromVersionID: string | null }>(
                ctx,
                CredentialingEntity.ProgramVersion,
                `ID = '${Quote(output.VersionID)}'`,
                ['Status', 'Label', 'ClonedFromVersionID'],
            );
            AssertEqual(draft.length, 1, 'the new version exists');
            AssertEqual(draft[0].Status, 'Draft', 'new version status');
            AssertEqual((draft[0].ClonedFromVersionID ?? '').toLowerCase(), source.Version.ID.toLowerCase(), 'ClonedFromVersionID');
            AssertEqual(await CountRows(ctx, CredentialingEntity.Section, `ProgramVersionID = '${Quote(output.VersionID)}'`), 2, 'sections of the draft');
            AssertEqual(await CountRows(ctx, CredentialingEntity.DocumentRequirement, `ProgramVersionID = '${Quote(output.VersionID)}'`), 2, 'requirements of the draft');

            const copies = await readStandards(ctx, output.VersionID);
            AssertEqual(copies.length, 6, 'standards of the draft');
            const modeByLineage = new Map(sourceBefore.map((s) => [s.LineageKey.toLowerCase(), s.EvaluationMode]));
            AssertEqual(
                [...copies.map((c) => c.LineageKey.toLowerCase())].sort().join(','),
                [...modeByLineage.keys()].sort().join(','),
                'the draft has the source lineage keys',
            );
            for (const copy of copies) {
                AssertEqual(copy.EvaluationMode, modeByLineage.get(copy.LineageKey.toLowerCase()), `evaluation mode of ${copy.Code}`);
                AssertEqual(copy.IsNewForVersion, false, `IsNewForVersion of ${copy.Code}`);
            }
            Assert(copies.some((c) => c.EvaluationMode === 'AI Assisted'), 'the AI Assisted mode was carried into the draft');

            const sourceVersion = await FindRows<{ Status: string }>(ctx, CredentialingEntity.ProgramVersion, `ID = '${Quote(source.Version.ID)}'`, ['Status']);
            AssertEqual(sourceVersion[0]?.Status, 'Active', 'the source is still Active');
            const sourceAfter = await readStandards(ctx, source.Version.ID);
            AssertEqual(
                JSON.stringify(sourceAfter.map((s) => [s.ID.toLowerCase(), s.EvaluationMode, s.Sequence]).sort()),
                JSON.stringify(sourceBefore.map((s) => [s.ID.toLowerCase(), s.EvaluationMode, s.Sequence]).sort()),
                'the source standards are unchanged',
            );
        },
    },
    {
        Id: 'cred-operations.4',
        Name: 'CloneVersionToDraft while the program has a Draft gives the one-draft sentence and creates nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const staff = world.StaffA;
            const tree = await activatedScratch(ctx, world, { Sections: 1, StandardsPerSection: 2 });
            const draft = await ctx.Provider.GetEntityObject<ProgramTree['Version']>(CredentialingEntity.ProgramVersion, ctx.User);
            draft.NewRecord();
            draft.ProgramID = tree.Program.ID;
            draft.Label = '2028';
            draft.Status = 'Draft';
            await RequireSave(draft, 'the existing draft 2028');
            const before = await programCounts(ctx, tree.Program.ID);

            const result = await new CloneVersionToDraftOperation().Execute({ SourceVersionID: tree.Version.ID, NewLabel: '2029' }, { provider: ctx.Provider, user: staff });
            ExpectRefused(result, oneDraftSentence('2028'), 'clone while a Draft exists');
            const after = await programCounts(ctx, tree.Program.ID);
            AssertEqual(JSON.stringify(after), JSON.stringify(before), 'version, section and standard counts of the program');
        },
    },
    {
        Id: 'cred-operations.5',
        Name: 'CloneVersionToDraft to a label the program already uses is refused and creates nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const staff = world.StaffA;
            const tree = await activatedScratch(ctx, world, { Sections: 1, StandardsPerSection: 2 });
            const before = await programCounts(ctx, tree.Program.ID);
            const result = await new CloneVersionToDraftOperation().Execute({ SourceVersionID: tree.Version.ID, NewLabel: '2027' }, { provider: ctx.Provider, user: staff });
            ExpectRefused(result, 'A version labelled 2027 already exists for this program.', 'clone to an existing label');
            const after = await programCounts(ctx, tree.Program.ID);
            AssertEqual(JSON.stringify(after), JSON.stringify(before), 'version, section and standard counts of the program');
        },
    },
    {
        Id: 'cred-operations.6',
        Name: 'a clone that fails partway leaves nothing behind',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const staff = world.StaffA;
            const tree = await activatedScratch(ctx, world, { Sections: 2, StandardsPerSection: 3 });
            const before = await programCounts(ctx, tree.Program.ID);
            const seam = CloneFailSeam();
            seam.FailAfterStandards = 2;
            let result: RemoteOpResult<CloneVersionToDraftOutput>;
            try {
                result = await new CloneVersionToDraftOperation().Execute({ SourceVersionID: tree.Version.ID, NewLabel: '2028' }, { provider: ctx.Provider, user: staff });
            } finally {
                seam.FailAfterStandards = null;
            }
            Assert(!result.Success, 'the clone stopped partway is reported as failed');
            const after = await programCounts(ctx, tree.Program.ID);
            AssertEqual(JSON.stringify(after), JSON.stringify(before), 'version, section and standard counts of the program');
        },
    },
    {
        Id: 'cred-operations.7',
        Name: 'ReorderVersionTree reorders a Draft, is refused on Active and for foreign rows, and loses no concurrent edit',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const staff = world.StaffA;

            const draft = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 3 }, ctx.User);
            const draftStandards = treeStandards(draft);
            const output = ExpectOutput(
                await new ReorderVersionTreeOperation().Execute({ VersionID: draft.Version.ID, Sections: [], Standards: reversed(draftStandards) }, { provider: ctx.Provider, user: staff }),
                'reorder a Draft',
            );
            AssertEqual(output.StandardsUpdated, 3, 'StandardsUpdated');
            const readBack = (await readStandards(ctx, draft.Version.ID)).sort((a, b) => a.Sequence - b.Sequence).map((s) => s.Code);
            AssertEqual(readBack.join(','), draftStandards.map((s) => s.Code).reverse().join(','), 'the new order');

            const active = await activatedScratch(ctx, world, { Sections: 1, StandardsPerSection: 3 });
            const activeBefore = await readStandards(ctx, active.Version.ID);
            const onActive = await new ReorderVersionTreeOperation().Execute(
                { VersionID: active.Version.ID, Sections: [], Standards: reversed(treeStandards(active)) },
                { provider: ctx.Provider, user: staff },
            );
            ExpectRefused(onActive, TREE_EDIT_SENTENCE, 'reorder an Active version');
            const activeAfter = await readStandards(ctx, active.Version.ID);
            AssertEqual(JSON.stringify(activeAfter.map((s) => [s.ID, s.Sequence]).sort()), JSON.stringify(activeBefore.map((s) => [s.ID, s.Sequence]).sort()), 'no Sequence changed on the Active version');

            const other = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1 }, ctx.User);
            const draftBefore = await readStandards(ctx, draft.Version.ID);
            const otherBefore = await readStandards(ctx, other.Version.ID);
            const foreign = await new ReorderVersionTreeOperation().Execute(
                { VersionID: draft.Version.ID, Sections: [], Standards: [{ ID: draftStandards[0].ID, Sequence: 9 }, { ID: other.Sections[0].Standards[0].ID, Sequence: 1 }] },
                { provider: ctx.Provider, user: staff },
            );
            ExpectRefused(foreign, NOT_FOUND_SENTENCE, 'reorder naming another program\'s standard');
            AssertEqual(JSON.stringify(await readStandards(ctx, draft.Version.ID)), JSON.stringify(draftBefore), 'the draft is unchanged');
            AssertEqual(JSON.stringify(await readStandards(ctx, other.Version.ID)), JSON.stringify(otherBefore), 'the other program is unchanged');

            const outcomes: string[] = [];
            for (let round = 0; round < REORDER_RACE_ROUNDS; round++) {
                outcomes.push(await reorderAgainstEdit(ctx, world, staff, round % 2 === 0));
            }
            console.log(`  cred-operations.7 reorder race outcomes: ${outcomes.join(', ')}`);
        },
    },
    {
        Id: 'cred-operations.8',
        Name: 'CreateOrganization twice with the same input returns the same IDs and creates one row of each kind',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const staffUser = await newStaffUser(ctx, hex);
            const name = `Operations Body ${hex}`;
            const input = { Name: `  Operations   Body ${hex} `, FirstStaffEmail: ` ${staffUser.Email.toUpperCase()} ` };
            const first = ExpectOutput(await new CreateOrganizationOperation().Execute(input, { provider: ctx.Provider, user: world.Admin }), 'first CreateOrganization');
            const second = ExpectOutput(await new CreateOrganizationOperation().Execute(input, { provider: ctx.Provider, user: world.Admin }), 'second CreateOrganization');
            Assert(sameOutput(first, second), `both calls return the same IDs (${JSON.stringify(first)} vs ${JSON.stringify(second)})`);
            AssertEqual(first.StaffUserID.toLowerCase(), staffUser.ID.toLowerCase(), 'the staff member is the user with the email');
            await expectOneOfEach(ctx, name, first);
        },
    },
    {
        Id: 'cred-operations.9',
        Name: 'two simultaneous CreateOrganization calls with the same new name both succeed with the same IDs',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const staffUser = await newStaffUser(ctx, hex);
            const name = `Operations Body ${hex}`;
            const input = { Name: name, FirstStaffEmail: staffUser.Email };
            const results = await WithActors(ctx, 2, (actors: IMetadataProvider[]) =>
                Promise.all(actors.map((actor) => new CreateOrganizationOperation().Execute(input, { provider: actor, user: world.Admin }))),
            );
            const [first, second] = results.map((r, i) => ExpectOutput(r, `concurrent CreateOrganization ${i + 1}`));
            Assert(sameOutput(first, second), `both calls return the same IDs (${JSON.stringify(first)} vs ${JSON.stringify(second)})`);
            await expectOneOfEach(ctx, name, first);
        },
    },
    {
        Id: 'cred-operations.10',
        Name: 'CreateOrganization is refused for a non-admin and for an unknown email, and creates nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const hex = runHex();
            const staffUser = await newStaffUser(ctx, hex);
            const name = `Operations Body ${hex}`;
            Assert(!world.StaffA.UserRoles.some((r) => r.Role === ADMIN_ROLE), 'StaffA does not hold Credentialing Admin');
            const byStaff = await new CreateOrganizationOperation().Execute({ Name: name, FirstStaffEmail: staffUser.Email }, { provider: ctx.Provider, user: world.StaffA });
            Assert(!byStaff.Success, 'a caller without Credentialing Admin is refused');
            AssertEqual(byStaff.ResultCode, 'FORBIDDEN', 'ResultCode for a caller without the role');
            const afterStaff = await organizationCounts(ctx, name, staffUser.ID);
            AssertEqual(JSON.stringify(afterStaff), JSON.stringify({ Accrediting: 0, Common: 0, Memberships: 0, StaffRoles: 0, Applications: 0 }), 'rows after the refused call');

            const unknownEmail = `nobody.${hex}@example.test`;
            const unknown = await new CreateOrganizationOperation().Execute({ Name: name, FirstStaffEmail: unknownEmail }, { provider: ctx.Provider, user: world.Admin });
            ExpectRefused(unknown, noUserSentence(unknownEmail), 'setup for an email no user has');
            AssertEqual(await CountRows(ctx, COMMON_ORGANIZATIONS_ENTITY, `Name = '${Quote(name)}'`), 0, 'Common organizations with the name');
            AssertEqual(await CountRows(ctx, CredentialingEntity.AccreditingOrganization, `Name = '${Quote(name)}'`), 0, 'accrediting organizations with the name');
        },
    },
    {
        Id: 'cred-operations.11',
        Name: 'CreateProgram with a duplicate name or prefix, also by case or spaces, is refused with a sentence and creates nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const staff = world.StaffA;
            const input = programInput(world, '2027');
            ExpectOutput(await new CreateProgramOperation().Execute(input, { provider: ctx.Provider, user: staff }), 'CreateProgram');
            const fresh = programInput(world, '2027');
            const attempts: { Input: CreateProgramInput; Sentence: string; Label: string }[] = [
                { Input: { ...fresh, Name: input.Name }, Sentence: duplicateNameSentence(input.Name), Label: 'the same name' },
                { Input: { ...fresh, Name: `  ${input.Name.toUpperCase()} ` }, Sentence: duplicateNameSentence(input.Name.toUpperCase()), Label: 'the name in other case with spaces' },
                { Input: { ...fresh, CredentialPrefix: input.CredentialPrefix }, Sentence: duplicatePrefixSentence(input.CredentialPrefix), Label: 'the same prefix' },
                { Input: { ...fresh, CredentialPrefix: ` ${input.CredentialPrefix.toLowerCase()}  ` }, Sentence: duplicatePrefixSentence(input.CredentialPrefix.toLowerCase()), Label: 'the prefix in other case with spaces' },
            ];
            for (const attempt of attempts) {
                const result = await new CreateProgramOperation().Execute(attempt.Input, { provider: ctx.Provider, user: staff });
                ExpectRefused(result, attempt.Sentence, `CreateProgram with ${attempt.Label}`);
                AssertEqual(result.ErrorMessage, attempt.Sentence, `the refusal is the sentence alone (${attempt.Label})`);
            }
            AssertEqual(await programsLike(ctx, world, 'Name', input.Name), 1, 'programs with the name');
            AssertEqual(await programsLike(ctx, world, 'CredentialPrefix', input.CredentialPrefix), 1, 'programs with the prefix');
            AssertEqual(await programsLike(ctx, world, 'Name', fresh.Name), 0, 'programs with the refused attempts\' own name');
        },
    },
    {
        Id: 'cred-operations.12',
        Name: 'two simultaneous CreateProgram calls with one name give one program and one refusal with the sentence',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const first = programInput(world, '2027');
            const second = { ...programInput(world, '2027'), Name: first.Name };
            const results = await WithActors(ctx, 2, (actors: IMetadataProvider[]) =>
                Promise.all([
                    new CreateProgramOperation().Execute(first, { provider: actors[0], user: world.StaffA }),
                    new CreateProgramOperation().Execute(second, { provider: actors[1], user: world.StaffA }),
                ]),
            );
            const messages = results.map((r) => `${r.Success ? 'ok' : r.ErrorMessage}`).join(' | ');
            AssertEqual(results.filter((r) => r.Success).length, 1, `exactly one CreateProgram succeeds (${messages})`);
            const loser = results.find((r) => !r.Success);
            AssertEqual(loser?.ErrorMessage, duplicateNameSentence(first.Name), 'the loser gives the duplicate-name sentence');
            AssertEqual(await programsLike(ctx, world, 'Name', first.Name), 1, 'programs with the name');
            AssertEqual(await programsLike(ctx, world, 'CredentialPrefix', second.CredentialPrefix) + await programsLike(ctx, world, 'CredentialPrefix', first.CredentialPrefix), 1, 'programs with either prefix');
        },
    },
    {
        Id: 'cred-operations.13',
        Name: 'deleting an organization with a member is refused with a sentence; without one it is deleted and its Common organization stays',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const org = await scratchOrganization(ctx, world);
            const organization = await LoadEntity<AccreditingOrganizationEntity>(ctx, CredentialingEntity.AccreditingOrganization, org.Output.AccreditingOrganizationID, world.Admin);
            const refused = await adminDelete(organization);
            Assert(!refused.Deleted, 'deleting an organization that has a member is refused');
            AssertEqual(refused.Message, MEMBERS_FIRST_SENTENCE, 'the refusal is the members sentence');
            AssertEqual(JSON.stringify(await scratchCounts(ctx, org)), JSON.stringify({ Accrediting: 1, Common: 1, Programs: 0, Memberships: 1 }), 'rows after the refused delete');

            const membership = await LoadEntity<MembershipEntity>(ctx, CredentialingEntity.OrganizationMembership, org.Output.MembershipID, world.Admin);
            await RequireDelete(membership, 'the admin deleting the membership');
            const again = await LoadEntity<AccreditingOrganizationEntity>(ctx, CredentialingEntity.AccreditingOrganization, org.Output.AccreditingOrganizationID, world.Admin);
            const deleted = await adminDelete(again);
            Assert(deleted.Deleted, `the admin deletes the organization once it has no member (${deleted.Message})`);
            AssertEqual(JSON.stringify(await scratchCounts(ctx, org)), JSON.stringify({ Accrediting: 0, Common: 1, Programs: 0, Memberships: 0 }), 'rows after the delete: the Common organization remains');

            const late = await new CreateProgramOperation().Execute(programInputIn(org.Output.AccreditingOrganizationID), { provider: ctx.Provider, user: org.Staff });
            ExpectRefused(late, NOT_FOUND_SENTENCE, 'CreateProgram in the deleted organization');
            AssertEqual(late.ErrorMessage, NOT_FOUND_SENTENCE, 'the refusal is the not-found sentence alone');
            AssertEqual((await scratchCounts(ctx, org)).Programs, 0, 'programs of the deleted organization');
        },
    },
    {
        Id: 'cred-operations.14',
        Name: 'deleting an organization that has a program is refused with the programs sentence and deletes nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const org = await scratchOrganization(ctx, world);
            ExpectOutput(await new CreateProgramOperation().Execute(programInputIn(org.Output.AccreditingOrganizationID), { provider: ctx.Provider, user: org.Staff }), 'CreateProgram as the staff member');
            const before = await scratchCounts(ctx, org);
            AssertEqual(JSON.stringify(before), JSON.stringify({ Accrediting: 1, Common: 1, Programs: 1, Memberships: 1 }), 'rows before the delete');
            const organization = await LoadEntity<AccreditingOrganizationEntity>(ctx, CredentialingEntity.AccreditingOrganization, org.Output.AccreditingOrganizationID, world.Admin);
            const refused = await adminDelete(organization);
            Assert(!refused.Deleted, 'deleting an organization that has a program is refused');
            AssertEqual(refused.Message, PROGRAMS_FIRST_SENTENCE, 'the refusal is the programs sentence (checked before the members)');
            AssertEqual(JSON.stringify(await scratchCounts(ctx, org)), JSON.stringify(before), 'nothing was deleted');
        },
    },
    {
        Id: 'cred-operations.15',
        Name: "CreateProgram with a blank name, prefix or subject noun is refused with its sentence and leaves no program; an edit to blank is refused too",
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const staff = world.StaffA;
            const valid = programInput(world, '2027');
            const inOrganization = `AccreditingOrganizationID = '${Quote(world.OrgA.ID)}'`;
            const before = await CountRows(ctx, CredentialingEntity.Program, inOrganization);
            const refusals: Array<[Partial<CreateProgramInput>, string]> = [
                [{ Name: '' }, BLANK_PROGRAM_NAME_SENTENCE],
                [{ Name: '    ' }, BLANK_PROGRAM_NAME_SENTENCE],
                [{ CredentialPrefix: '   ' }, BLANK_PREFIX_SENTENCE],
                [{ SubjectNoun: '' }, BLANK_NOUN_SENTENCE],
                [{ SubjectNoun: '  ' }, BLANK_NOUN_SENTENCE],
            ];
            for (const [change, sentence] of refusals) {
                const result = await new CreateProgramOperation().Execute({ ...valid, ...change }, { provider: ctx.Provider, user: staff });
                ExpectRefused(result, sentence, `CreateProgram with ${JSON.stringify(change)}`);
                AssertEqual(result.ErrorMessage, sentence, 'the refusal is the sentence alone');
                AssertEqual(result.ResultCode, 'REFUSED', 'ResultCode');
            }
            AssertEqual(await CountRows(ctx, CredentialingEntity.Program, inOrganization), before, 'programs of the organization (nothing was created)');

            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1 }, ctx.User);
            const noun = tree.Program.SubjectNoun;
            const edited = await LoadEntity<ProgramEntity>(ctx, CredentialingEntity.Program, tree.Program.ID);
            edited.SubjectNoun = '   ';
            Assert(!(await edited.Save()), 'an edit that blanks the subject noun is refused');
            AssertEqual(edited.LatestResult?.CompleteMessage ?? '', BLANK_NOUN_SENTENCE, 'the refusal is the subject noun sentence');
            const stored = await LoadEntity<ProgramEntity>(ctx, CredentialingEntity.Program, tree.Program.ID);
            AssertEqual(stored.SubjectNoun, noun, 'the stored subject noun');
        },
    },
    {
        Id: 'cred-operations.16',
        Name: 'CreateCommittee creates one committee owned by the program organization; its staff read it and another organization\'s staff do not',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const scratch = await committeeScratch(ctx, world);
            const name = scratch.Input.Name;
            try {
                const typed = `  ${name.replace(/ /g, '   ')} `;
                const output = ExpectOutput(await createCommittee(ctx, { ...scratch.Input, Name: typed }, world.StaffA), 'CreateCommittee');
                AssertEqual(output.Name, name, 'the name returned is the name stored: trimmed, inner whitespace collapsed');
                const stored = await committeesNamed(ctx, name);
                AssertEqual(stored.length, 1, 'committees with the name');
                AssertEqual(stored[0].ID.toLowerCase(), output.CommitteeID.toLowerCase(), 'the committee returned');
                AssertEqual(stored[0].Name, name, 'its stored name');
                AssertEqual((stored[0].OrganizationID ?? '').toLowerCase(), world.OrgA.OrganizationID.toLowerCase(), "its owner is the Common organization behind the program's accrediting organization");
                AssertEqual(stored[0].TypeID.toLowerCase(), scratch.Input.CommitteeTypeID.toLowerCase(), 'its type');
                AssertEqual(stored[0].Status, 'Active', 'its status');
                AssertEqual(stored[0].IsPublic, false, 'it is created private');
                AssertEqual(await committeesOwnedBy(ctx, world.OrgA.OrganizationID), scratch.OwnedBefore + 1, 'committees of the organization');
                Assert(await canReadCommittee(ctx, output.CommitteeID, world.StaffA), 'staff of the organization read the committee through Committees: Committees');
                Assert(!(await canReadCommittee(ctx, output.CommitteeID, world.StaffB)), "another organization's staff do not read it");
            } finally {
                await removeCommitteesNamed(ctx, [name]);
            }
        },
    },
    {
        Id: 'cred-operations.17',
        Name: 'CreateCommittee with a blank name, an unknown type or a duplicate name (also by case or spaces) gives its sentence and creates nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const scratch = await committeeScratch(ctx, world);
            const existing = scratchCommitteeName();
            try {
                ExpectOutput(await createCommittee(ctx, { ...scratch.Input, Name: existing }, world.StaffA), 'the committee the duplicates collide with');
                const loud = `  ${existing.toUpperCase().replace(/ /g, '  ')} `;
                const refusals: Array<[Partial<CreateCommitteeInput>, string]> = [
                    [{ Name: '' }, BLANK_COMMITTEE_NAME_SENTENCE],
                    [{ Name: '    ' }, BLANK_COMMITTEE_NAME_SENTENCE],
                    [{ CommitteeTypeID: randomUUID() }, COMMITTEE_TYPE_SENTENCE],
                    [{ CommitteeTypeID: '' }, COMMITTEE_TYPE_SENTENCE],
                    [{ CommitteeTypeID: "x' OR 1=1 --" }, COMMITTEE_TYPE_SENTENCE],
                    [{ Name: existing }, duplicateCommitteeSentence(existing)],
                    [{ Name: loud }, duplicateCommitteeSentence(existing.toUpperCase())],
                ];
                for (const [change, sentence] of refusals) {
                    const result = await createCommittee(ctx, { ...scratch.Input, ...change }, world.StaffA);
                    ExpectRefused(result, sentence, `CreateCommittee with ${JSON.stringify(change)}`);
                    AssertEqual(result.ErrorMessage, sentence, 'the refusal is the sentence alone');
                    AssertEqual(result.ResultCode, 'REFUSED', 'ResultCode');
                }
                AssertEqual((await committeesNamed(ctx, existing)).length, 1, 'committees with the duplicated name');
                AssertEqual((await committeesNamed(ctx, scratch.Input.Name)).length, 0, "committees with the refused attempts' own name");
                AssertEqual(await committeesOwnedBy(ctx, world.OrgA.OrganizationID), scratch.OwnedBefore + 1, 'committees of the organization (only the first was created)');
            } finally {
                await removeCommitteesNamed(ctx, [existing, scratch.Input.Name]);
            }
        },
    },
    {
        Id: 'cred-operations.18',
        Name: "CreateCommittee for another organization's program, a random program ID, or by staff with no membership gives Record not found and creates nothing",
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const scratch = await committeeScratch(ctx, world);
            const ownedByB = await committeesOwnedBy(ctx, world.OrgB.OrganizationID);
            const name = scratch.Input.Name;
            try {
                const attempts: Array<[string, CreateCommitteeInput, UserInfo]> = [
                    ["another organization's program", { ...scratch.Input, ProgramID: world.ProgramB.Program.ID }, world.StaffA],
                    ['a random program ID', { ...scratch.Input, ProgramID: randomUUID() }, world.StaffA],
                    ['a program ID that is not a UUID', { ...scratch.Input, ProgramID: "x' OR 1=1 --" }, world.StaffA],
                    ["OrgA's program as OrgB's staff", scratch.Input, world.StaffB],
                    ["OrgA's program as staff with no membership", scratch.Input, world.StaffNoMembership],
                ];
                for (const [label, input, user] of attempts) {
                    const result = await createCommittee(ctx, input, user);
                    ExpectRefused(result, NOT_FOUND_SENTENCE, `CreateCommittee for ${label}`);
                    AssertEqual(result.ErrorMessage, NOT_FOUND_SENTENCE, `the refusal is the not-found sentence alone (${label})`);
                    AssertEqual(result.ResultCode, 'REFUSED', `ResultCode (${label})`);
                }
                AssertEqual((await committeesNamed(ctx, name)).length, 0, 'committees with the name');
                AssertEqual(await committeesOwnedBy(ctx, world.OrgA.OrganizationID), scratch.OwnedBefore, 'committees of OrgA');
                AssertEqual(await committeesOwnedBy(ctx, world.OrgB.OrganizationID), ownedByB, 'committees of OrgB');
            } finally {
                await removeCommitteesNamed(ctx, [name]);
            }
        },
    },
    {
        Id: 'cred-operations.19',
        Name: 'CreateCommittee is refused as FORBIDDEN for a caller without Credentialing Staff, and creates nothing',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const scratch = await committeeScratch(ctx, world);
            const name = scratch.Input.Name;
            try {
                for (const [label, user] of [['the admin', world.Admin], ['an applicant', world.ApplicantA], ['a UI-only user', world.UIOnly]] as const) {
                    Assert(!user.UserRoles.some((r) => r.Role === STAFF_ROLE), `${label} does not hold Credentialing Staff`);
                    const result = await createCommittee(ctx, scratch.Input, user);
                    Assert(!result.Success, `CreateCommittee by ${label} is refused`);
                    AssertEqual(result.ResultCode, 'FORBIDDEN', `ResultCode for ${label}`);
                }
                AssertEqual((await committeesNamed(ctx, name)).length, 0, 'committees with the name');
                AssertEqual(await committeesOwnedBy(ctx, world.OrgA.OrganizationID), scratch.OwnedBefore, 'committees of the organization');
            } finally {
                await removeCommitteesNamed(ctx, [name]);
            }
        },
    },
    {
        Id: 'cred-operations.20',
        Name: 'two simultaneous CreateCommittee calls with one name give one committee and one refusal with the duplicate sentence',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const scratch = await committeeScratch(ctx, world);
            const name = scratch.Input.Name;
            try {
                const results = await WithActors(ctx, 2, (actors: IMetadataProvider[]) =>
                    Promise.all(actors.map((actor) => createCommittee(ctx, scratch.Input, world.StaffA, actor))),
                );
                const messages = results.map((r) => `${r.Success ? 'ok' : r.ErrorMessage}`).join(' | ');
                AssertEqual(results.filter((r) => r.Success).length, 1, `exactly one CreateCommittee succeeds (${messages})`);
                const loser = results.find((r) => !r.Success);
                AssertEqual(loser?.ErrorMessage, duplicateCommitteeSentence(name), 'the loser gives the duplicate-name sentence');
                AssertEqual(loser?.ResultCode, 'REFUSED', 'ResultCode of the loser');
                AssertEqual((await committeesNamed(ctx, name)).length, 1, 'committees with the name');
                AssertEqual(await committeesOwnedBy(ctx, world.OrgA.OrganizationID), scratch.OwnedBefore + 1, 'committees of the organization');
            } finally {
                await removeCommitteesNamed(ctx, [name]);
            }
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
