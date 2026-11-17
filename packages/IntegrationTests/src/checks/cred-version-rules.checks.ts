import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { IMetadataProvider } from '@memberjunction/core';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import type { ProgramVersionEntityServer } from '@mj-biz-apps/credentialing-core-entities-server';
import type {
    mjBizAppsCredentialingProgramVersionEntity,
    mjBizAppsCredentialingStandardEntity,
} from '@mj-biz-apps/credentialing-entities';
import { Outcome, WithActors } from '../actors.js';
import { CountRows, ExpectDeleteRefused, ExpectSaveRefused, LoadEntity, Quote, RequireDelete, RequireSave } from '../wire.js';
import { GetOrLoadWorld } from '../world/load-world.js';
import { MakeScratchProgram, type ProgramTree } from '../world/program-tree.js';

type VersionEntity = mjBizAppsCredentialingProgramVersionEntity;
type StandardEntity = mjBizAppsCredentialingStandardEntity;

const TRANSITION_SENTENCE = 'A version can only move from Draft to Active, or from Active to Retired.';
const NOT_FOUND_SENTENCE = 'Record not found.';
const STALE_SENTENCE = 'This record was changed by someone else. Reload it and try again.';
const TREE_EDIT_SENTENCE = 'Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.';
const NO_STANDARDS_SENTENCE = 'This version has no standards. Add at least one standard before activating.';
/** Rounds of check .8, each on its own scratch program: one round can pass without the lock by chance. */
const DRAFT_RACE_ROUNDS = 5;
/** How long the second of two concurrent writes in check .7 starts after the first. */
const FOLLOWER_DELAY_MS = 5;
const NO_COMMITTEE_SENTENCE = 'Choose the deciding committee before activating this version.';

function oneDraftSentence(label: string): string {
    return `This program already has a draft version (${label}). Finish or delete it before starting another.`;
}

function emptySectionSentence(number: string): string {
    return `Section ${number} has no standards. Add a standard or remove the section before activating.`;
}

/** Loads a version afresh as the context user, from `provider` when given. */
function loadVersion(ctx: IntegrationCheckContext, id: string, provider?: IMetadataProvider): Promise<VersionEntity> {
    return LoadEntity<VersionEntity>(ctx, CredentialingEntity.ProgramVersion, id, ctx.User, provider);
}

/** Activates the tree's version through its own entity object. */
async function activate(tree: ProgramTree): Promise<void> {
    tree.Version.Status = 'Active';
    await RequireSave(tree.Version, `activating version ${tree.Version.Label}`);
}

/** A new version of `programID` as the context user, from `provider` when given. */
async function newVersion(ctx: IntegrationCheckContext, programID: string, label: string, provider?: IMetadataProvider): Promise<VersionEntity> {
    const version = await (provider ?? ctx.Provider).GetEntityObject<VersionEntity>(CredentialingEntity.ProgramVersion, ctx.User);
    version.NewRecord();
    version.ProgramID = programID;
    version.Label = label;
    version.Status = 'Draft';
    return version;
}

/** Row counts of a version's tree, read as the context user. */
async function treeCounts(ctx: IntegrationCheckContext, versionID: string): Promise<{ Versions: number; Sections: number; Standards: number; Requirements: number }> {
    const byVersion = `ProgramVersionID = '${Quote(versionID)}'`;
    return {
        Versions: await CountRows(ctx, CredentialingEntity.ProgramVersion, `ID = '${Quote(versionID)}'`),
        Sections: await CountRows(ctx, CredentialingEntity.Section, byVersion),
        Standards: await CountRows(ctx, CredentialingEntity.Standard, byVersion),
        Requirements: await CountRows(ctx, CredentialingEntity.DocumentRequirement, byVersion),
    };
}

/**
 * One round of check .7: activation of a version against the delete of the only standard of its
 * section 1, on two provider instances. `deleteFirst` decides which write leads; the other starts
 * {@link FOLLOWER_DELAY_MS} later, while the leader's transaction is still open (a write here takes
 * 30-40 ms to commit). Started in the same tick, both reach the version lock within a millisecond and
 * the first round trip decides, which in practice is almost always the activation; the head start
 * makes both orders happen. It does not make the check sequential: without the lock the follower
 * would read the tree before the leader commits, and both writes would succeed.
 */
async function activationAgainstTreeEdit(
    ctx: IntegrationCheckContext,
    tree: ProgramTree,
    actors: IMetadataProvider[],
    deleteFirst: boolean,
): Promise<'activation' | 'delete'> {
    const target = tree.Sections[0];
    const version = await loadVersion(ctx, tree.Version.ID, actors[0]);
    const standard = await LoadEntity<StandardEntity>(ctx, CredentialingEntity.Standard, target.Standards[0].ID, ctx.User, actors[1]);
    version.Status = 'Active';
    let saving: Promise<boolean>;
    let deleting: Promise<boolean>;
    if (deleteFirst) {
        deleting = standard.Delete();
        await delay(FOLLOWER_DELAY_MS);
        saving = version.Save();
    } else {
        saving = version.Save();
        await delay(FOLLOWER_DELAY_MS);
        deleting = standard.Delete();
    }
    const [saved, deleted] = await Promise.allSettled([saving, deleting]);
    const activation = Outcome(saved, () => version.LatestResult?.CompleteMessage ?? '');
    const removal = Outcome(deleted, () => standard.LatestResult?.CompleteMessage ?? '');
    Assert(activation.Succeeded !== removal.Succeeded, `exactly one of activation and delete succeeds (activation: ${activation.Succeeded} "${activation.Message}", delete: ${removal.Succeeded} "${removal.Message}")`);

    const stored = await loadVersion(ctx, tree.Version.ID);
    const remaining = await CountRows(ctx, CredentialingEntity.Standard, `SectionID = '${Quote(target.Section.ID)}'`);
    Assert(!(stored.Status === 'Active' && remaining === 0), 'invariant: the version is not Active with an empty section');
    if (activation.Succeeded) {
        Assert(removal.Message.includes(TREE_EDIT_SENTENCE), `delete loser gives the tree-edit sentence, got "${removal.Message}"`);
        return 'activation';
    }
    Assert(
        activation.Message.includes(emptySectionSentence(target.Section.Number)),
        `activation loser gives the empty-section sentence, got "${activation.Message}"`,
    );
    return 'delete';
}

/**
 * One round of check .8: two Draft creates with different labels, started together on two provider
 * instances, for a program whose only version is Active.
 */
async function concurrentDraftCreates(ctx: IntegrationCheckContext, tree: ProgramTree, actors: IMetadataProvider[]): Promise<void> {
    const first = await newVersion(ctx, tree.Program.ID, '2028-A', actors[0]);
    const second = await newVersion(ctx, tree.Program.ID, '2028-B', actors[1]);
    const settled = await Promise.allSettled([first.Save(), second.Save()]);
    const outcomes = [
        Outcome(settled[0], () => first.LatestResult?.CompleteMessage ?? ''),
        Outcome(settled[1], () => second.LatestResult?.CompleteMessage ?? ''),
    ];
    AssertEqual(outcomes.filter((o) => o.Succeeded).length, 1, `exactly one Draft create succeeds (${outcomes.map((o) => o.Message).join(' | ')})`);
    const winnerLabel = outcomes[0].Succeeded ? first.Label : second.Label;
    const loser = outcomes[0].Succeeded ? outcomes[1] : outcomes[0];
    Assert(loser.Message.includes(oneDraftSentence(winnerLabel)), `loser names the winner's draft, got "${loser.Message}"`);
    const drafts = await CountRows(ctx, CredentialingEntity.ProgramVersion, `ProgramID = '${Quote(tree.Program.ID)}' AND Status = 'Draft'`);
    AssertEqual(drafts, 1, 'Draft versions of the program');
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-version-rules.1',
        Name: 'a complete Draft version activates and records ActivatedAt',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1, CommitteeID: world.CommitteeA.ID }, ctx.User);
            await activate(tree);
            const stored = await loadVersion(ctx, tree.Version.ID);
            AssertEqual(stored.Status, 'Active', 'stored status');
            Assert(stored.ActivatedAt != null, 'ActivatedAt is set');
        },
    },
    {
        Id: 'cred-version-rules.2',
        Name: 'an Active version cannot go back to Draft, and retiring it records RetiredAt',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1, CommitteeID: world.CommitteeA.ID }, ctx.User);
            await activate(tree);
            const backToDraft = await loadVersion(ctx, tree.Version.ID);
            backToDraft.Status = 'Draft';
            await ExpectSaveRefused(backToDraft, TRANSITION_SENTENCE);
            const retire = await loadVersion(ctx, tree.Version.ID);
            retire.Status = 'Retired';
            await RequireSave(retire, 'retiring the version');
            const stored = await loadVersion(ctx, tree.Version.ID);
            AssertEqual(stored.Status, 'Retired', 'stored status');
            Assert(stored.RetiredAt != null, 'RetiredAt is set');
        },
    },
    {
        Id: 'cred-version-rules.3',
        Name: 'one Draft per program, an unknown program is not found, and labels are unique per program',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1, CommitteeID: world.CommitteeA.ID }, ctx.User);
            await ExpectSaveRefused(await newVersion(ctx, tree.Program.ID, '2028'), oneDraftSentence('2027'));
            await ExpectSaveRefused(await newVersion(ctx, randomUUID(), '2028'), NOT_FOUND_SENTENCE);
            await activate(tree);
            await ExpectSaveRefused(
                await newVersion(ctx, tree.Program.ID, ' 2027 '),
                'A version labelled 2027 already exists for this program.',
            );
        },
    },
    {
        Id: 'cred-version-rules.4',
        Name: 'workflow settings are frozen on an Active version; rollout flags are not',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1, CommitteeID: world.CommitteeA.ID }, ctx.User);
            await activate(tree);
            const frozen = await loadVersion(ctx, tree.Version.ID);
            frozen.PeerReviewerCount = frozen.PeerReviewerCount + 1;
            await ExpectSaveRefused(frozen, 'PeerReviewerCount can only be changed on a Draft version.');
            const flag = await loadVersion(ctx, tree.Version.ID);
            flag.PromotionEnabled = !flag.PromotionEnabled;
            await RequireSave(flag, 'changing PromotionEnabled on an Active version');
        },
    },
    {
        Id: 'cred-version-rules.5',
        Name: 'only a Draft version is deleted, and its whole tree goes with it',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const active = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1, CommitteeID: world.CommitteeA.ID }, ctx.User);
            await activate(active);
            await ExpectDeleteRefused(await loadVersion(ctx, active.Version.ID), 'Only a Draft version can be deleted.');

            const draft = await MakeScratchProgram(ctx, world, { Sections: 2, StandardsPerSection: 2, DocumentRequirements: 1 }, ctx.User);
            const before = await treeCounts(ctx, draft.Version.ID);
            AssertEqual(before.Sections, 2, 'section rows before the delete');
            AssertEqual(before.Standards, 4, 'standard rows before the delete');
            AssertEqual(before.Requirements, 1, 'document requirement rows before the delete');
            await RequireDelete(await loadVersion(ctx, draft.Version.ID), 'deleting the Draft version');
            const after = await treeCounts(ctx, draft.Version.ID);
            AssertEqual(after.Versions, 0, 'version rows');
            AssertEqual(after.Sections, 0, 'section rows');
            AssertEqual(after.Standards, 0, 'standard rows');
            AssertEqual(after.Requirements, 0, 'document requirement rows');
        },
    },
    {
        Id: 'cred-version-rules.6',
        Name: 'activation is refused for no standards, an empty section, or no committee',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const bare = await MakeScratchProgram(ctx, world, { Sections: 0, StandardsPerSection: 0, CommitteeID: world.CommitteeA.ID }, ctx.User);
            bare.Version.Status = 'Active';
            await ExpectSaveRefused(bare.Version, NO_STANDARDS_SENTENCE);

            const gap = await MakeScratchProgram(ctx, world, { Sections: 2, StandardsPerSection: 1, CommitteeID: world.CommitteeA.ID }, ctx.User);
            await RequireDelete(gap.Sections[1].Standards[0], 'emptying section 2');
            gap.Version.Status = 'Active';
            await ExpectSaveRefused(gap.Version, emptySectionSentence('2'));

            const noCommittee = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1 }, ctx.User);
            noCommittee.Version.Status = 'Active';
            await ExpectSaveRefused(noCommittee.Version, NO_COMMITTEE_SENTENCE);
        },
    },
    {
        Id: 'cred-version-rules.7',
        Name: 'concurrent activation and tree edit never leave an Active version with an empty section',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const winners: Array<'activation' | 'delete'> = [];
            await WithActors(ctx, 2, async (actors) => {
                for (let round = 0; round < 10; round++) {
                    const tree = await MakeScratchProgram(ctx, world, { Sections: 2, StandardsPerSection: 1, CommitteeID: world.CommitteeA.ID }, ctx.User);
                    winners.push(await activationAgainstTreeEdit(ctx, tree, actors, round % 2 === 1));
                }
            });
            console.log(`    cred-version-rules.7 winners: activation ${winners.filter((w) => w === 'activation').length}, delete ${winners.filter((w) => w === 'delete').length}`);
        },
    },
    {
        Id: 'cred-version-rules.8',
        Name: 'two concurrent Draft creates leave exactly one Draft',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            await WithActors(ctx, 2, async (actors) => {
                for (let round = 0; round < DRAFT_RACE_ROUNDS; round++) {
                    const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1, CommitteeID: world.CommitteeA.ID }, ctx.User);
                    await activate(tree);
                    await concurrentDraftCreates(ctx, tree, actors);
                }
            });
        },
    },
    {
        Id: 'cred-version-rules.9',
        Name: 'a Draft delete whose cascade fails partway leaves the whole tree in place',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 2, StandardsPerSection: 2 }, ctx.User);
            const version = await LoadEntity<ProgramVersionEntityServer>(ctx, CredentialingEntity.ProgramVersion, tree.Version.ID);
            Assert('FailCascadeAfter' in version, 'the version loads as the server subclass');
            version.FailCascadeAfter = 2;
            const deleted = await version.Delete();
            Assert(!deleted, 'the delete reports failure');
            const after = await treeCounts(ctx, tree.Version.ID);
            AssertEqual(after.Versions, 1, 'version rows');
            AssertEqual(after.Sections, 2, 'section rows');
            AssertEqual(after.Standards, 4, 'standard rows');
        },
    },
    {
        Id: 'cred-version-rules.10',
        Name: 'a save from a stale snapshot cannot undo an activation',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1, CommitteeID: world.CommitteeA.ID }, ctx.User);
            const originalCount = tree.Version.PeerReviewerCount;
            await WithActors(ctx, 2, async (actors) => {
                const stale = await loadVersion(ctx, tree.Version.ID, actors[0]);
                const activator = await loadVersion(ctx, tree.Version.ID, actors[1]);
                activator.Status = 'Active';
                await RequireSave(activator, 'activating from instance 2');
                stale.PeerReviewerCount = originalCount + 1;
                await ExpectSaveRefused(stale, STALE_SENTENCE);
            });
            const stored = await loadVersion(ctx, tree.Version.ID);
            AssertEqual(stored.Status, 'Active', 'stored status');
            Assert(stored.ActivatedAt != null, 'ActivatedAt is set');
            AssertEqual(stored.PeerReviewerCount, originalCount, 'PeerReviewerCount');
        },
    },
    {
        Id: 'cred-version-rules.11',
        Name: 'a delete from a stale Draft snapshot cannot remove an Active version',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1, CommitteeID: world.CommitteeA.ID }, ctx.User);
            await WithActors(ctx, 2, async (actors) => {
                const stale = await loadVersion(ctx, tree.Version.ID, actors[0]);
                const activator = await loadVersion(ctx, tree.Version.ID, actors[1]);
                activator.Status = 'Active';
                await RequireSave(activator, 'activating from instance 2');
                await ExpectDeleteRefused(stale, STALE_SENTENCE);
            });
            const after = await treeCounts(ctx, tree.Version.ID);
            AssertEqual(after.Versions, 1, 'version rows');
            AssertEqual(after.Sections, 1, 'section rows');
            AssertEqual(after.Standards, 1, 'standard rows');
        },
    },
    {
        Id: 'cred-version-rules.12',
        Name: 'a number setting outside its range is refused with a sentence naming it by its label, and the stored value stays',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1 }, ctx.User);
            const id = tree.Version.ID;
            const before = await loadVersion(ctx, id);
            const refusals: Array<[(v: VersionEntity) => void, string]> = [
                [(v) => { v.PeerReviewerCount = -1; }, 'Peer reviewers per application cannot be negative.'],
                [(v) => { v.PassiveApprovalWindowDays = 0; }, 'Passive approval window must be at least 1 day.'],
                [(v) => { v.MinimumObservations = 0; }, 'Minimum observations must be at least 1.'],
                [(v) => { v.MinimumReviewers = 0; }, 'Minimum reviewers must be at least 1.'],
                [(v) => { v.MinimumAgreeRate = 1.5; }, 'Minimum agree rate must be between 0 and 1.'],
                [(v) => { v.MinimumReplayFloor = -0.5; }, 'Minimum replay agreement must be between 0 and 1.'],
            ];
            for (const [change, sentence] of refusals) {
                const version = await loadVersion(ctx, id);
                change(version);
                await ExpectSaveRefused(version, sentence);
                AssertEqual(version.LatestResult?.CompleteMessage ?? '', sentence, 'the refusal is the sentence alone, with no database text');
            }
            const bounds = await loadVersion(ctx, id);
            bounds.PeerReviewerCount = 0;
            bounds.PassiveApprovalWindowDays = 1;
            bounds.MinimumObservations = 1;
            bounds.MinimumReviewers = 1;
            bounds.MinimumAgreeRate = 1;
            bounds.MinimumReplayFloor = 0;
            await RequireSave(bounds, 'saving every number setting at the edge of its range');
            const stored = await loadVersion(ctx, id);
            AssertEqual(stored.PassiveApprovalWindowDays, 1, 'PassiveApprovalWindowDays');
            AssertEqual(stored.PeerReviewerCount, 0, 'PeerReviewerCount');
            Assert(before.PassiveApprovalWindowDays >= 1, 'the default passive approval window is inside its range');
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
