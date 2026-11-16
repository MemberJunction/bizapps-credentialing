import { randomUUID } from 'node:crypto';
import type { IMetadataProvider } from '@memberjunction/core';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import type { StandardEntityServer } from '@mj-biz-apps/credentialing-core-entities-server';
import type {
    mjBizAppsCredentialingSectionEntity,
    mjBizAppsCredentialingStandardEntity,
} from '@mj-biz-apps/credentialing-entities';
import { Outcome, WithActors } from '../actors.js';
import { ExpectDeleteRefused, ExpectSaveRefused, LoadEntity, RequireDelete, RequireSave } from '../wire.js';
import { GetOrLoadWorld } from '../world/load-world.js';
import { MakeScratchProgram, type ProgramTree } from '../world/program-tree.js';

type SectionEntity = mjBizAppsCredentialingSectionEntity;
type StandardEntity = mjBizAppsCredentialingStandardEntity;

const TREE_EDIT_SENTENCE = 'Sections and standards can only be edited on a Draft version. Use "Edit in draft" to create one.';
const NOT_FOUND_SENTENCE = 'Record not found.';
const STALE_SENTENCE = 'This record was changed by someone else. Reload it and try again.';
const EVALUATION_MODE_SENTENCE = 'Evaluation mode cannot be edited here. It changes only through the Trust screen.';

function duplicateCodeSentence(code: string): string {
    return `Standard code ${code} is already used in this version.`;
}

/** A new standard in `sectionID` as the context user, from `provider` when given. Its version is left for the server to set. */
async function newStandard(ctx: IntegrationCheckContext, sectionID: string, code: string, provider?: IMetadataProvider): Promise<StandardEntity> {
    const standard = await (provider ?? ctx.Provider).GetEntityObject<StandardEntity>(CredentialingEntity.Standard, ctx.User);
    standard.NewRecord();
    standard.SectionID = sectionID;
    standard.Code = code;
    standard.Statement = `Standard ${code.trim()}.`;
    standard.ResponseType = 'Attestation';
    return standard;
}

/** A new section of `versionID` as the context user. */
async function newSection(ctx: IntegrationCheckContext, versionID: string, number: string): Promise<SectionEntity> {
    const section = await ctx.Provider.GetEntityObject<SectionEntity>(CredentialingEntity.Section, ctx.User);
    section.NewRecord();
    section.ProgramVersionID = versionID;
    section.Number = number;
    section.Name = `Section ${number}`;
    return section;
}

function loadStandard(ctx: IntegrationCheckContext, id: string, provider?: IMetadataProvider): Promise<StandardEntity> {
    return LoadEntity<StandardEntity>(ctx, CredentialingEntity.Standard, id, ctx.User, provider);
}

function loadSection(ctx: IntegrationCheckContext, id: string): Promise<SectionEntity> {
    return LoadEntity<SectionEntity>(ctx, CredentialingEntity.Section, id);
}

async function activate(tree: ProgramTree): Promise<void> {
    tree.Version.Status = 'Active';
    await RequireSave(tree.Version, `activating version ${tree.Version.Label}`);
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-standard-rules.1',
        Name: 'standards are added, edited, reordered and deleted on a Draft version',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1 }, ctx.User);
            const added = await newStandard(ctx, tree.Sections[0].Section.ID, '1.2');
            added.Sequence = 2;
            await RequireSave(added, 'adding standard 1.2');
            added.Statement = 'An edited statement.';
            await RequireSave(added, 'editing standard 1.2');
            const first = await loadStandard(ctx, tree.Sections[0].Standards[0].ID);
            first.Sequence = 2;
            added.Sequence = 1;
            await RequireSave(first, 'moving standard 1.1 down');
            await RequireSave(added, 'moving standard 1.2 up');
            await RequireDelete(added, 'deleting standard 1.2');
        },
    },
    {
        Id: 'cred-standard-rules.2',
        Name: 'the tree of an Active version cannot be created, edited or deleted',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1, CommitteeID: world.CommitteeA.ID }, ctx.User);
            await activate(tree);
            const sectionID = tree.Sections[0].Section.ID;
            const standardID = tree.Sections[0].Standards[0].ID;

            await ExpectSaveRefused(await newStandard(ctx, sectionID, '1.2'), TREE_EDIT_SENTENCE);
            const editedStandard = await loadStandard(ctx, standardID);
            editedStandard.Statement = 'An edited statement.';
            await ExpectSaveRefused(editedStandard, TREE_EDIT_SENTENCE);
            await ExpectDeleteRefused(await loadStandard(ctx, standardID), TREE_EDIT_SENTENCE);

            await ExpectSaveRefused(await newSection(ctx, tree.Version.ID, '2'), TREE_EDIT_SENTENCE);
            const editedSection = await loadSection(ctx, sectionID);
            editedSection.Name = 'An edited section';
            await ExpectSaveRefused(editedSection, TREE_EDIT_SENTENCE);
            await ExpectDeleteRefused(await loadSection(ctx, sectionID), TREE_EDIT_SENTENCE);
        },
    },
    {
        Id: 'cred-standard-rules.3',
        Name: 'a standard stays in its section, and a new one takes its version from its section',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 2, StandardsPerSection: 1 }, ctx.User);
            const other = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1 }, ctx.User);

            const moved = await loadStandard(ctx, tree.Sections[0].Standards[0].ID);
            moved.SectionID = tree.Sections[1].Section.ID;
            await ExpectSaveRefused(moved, 'A standard cannot be moved to another section.');

            const created = await newStandard(ctx, tree.Sections[0].Section.ID, '1.9');
            created.ProgramVersionID = other.Version.ID;
            await RequireSave(created, 'creating a standard that names another version');
            const stored = await loadStandard(ctx, created.ID);
            AssertEqual(stored.ProgramVersionID.toLowerCase(), tree.Version.ID.toLowerCase(), 'the standard is saved with its section\'s version');
        },
    },
    {
        Id: 'cred-standard-rules.4',
        Name: 'codes are unique in a version ignoring case and surrounding spaces, and are stored trimmed',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 2, StandardsPerSection: 1 }, ctx.User);
            const renamed = await loadStandard(ctx, tree.Sections[1].Standards[0].ID);
            renamed.Code = '2.1a';
            await RequireSave(renamed, 'renaming standard 2.1 to 2.1a');

            const sectionID = tree.Sections[0].Section.ID;
            await ExpectSaveRefused(await newStandard(ctx, sectionID, '1.1'), duplicateCodeSentence('1.1'));
            await ExpectSaveRefused(await newStandard(ctx, sectionID, ' 1.1 '), duplicateCodeSentence('1.1'));
            await ExpectSaveRefused(await newStandard(ctx, sectionID, '2.1A'), duplicateCodeSentence('2.1A'));

            const trimmed = await newStandard(ctx, sectionID, ' 9.9 ');
            await RequireSave(trimmed, 'creating standard " 9.9 "');
            AssertEqual((await loadStandard(ctx, trimmed.ID)).Code, '9.9', 'stored code');
        },
    },
    {
        Id: 'cred-standard-rules.5',
        Name: 'evaluation mode cannot be set here, interpretive standards stay human, and a clone mark opens no way round it',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1 }, ctx.User);
            const sectionID = tree.Sections[0].Section.ID;

            const assisted = await newStandard(ctx, sectionID, '1.2');
            assisted.EvaluationMode = 'AI Assisted';
            await ExpectSaveRefused(assisted, EVALUATION_MODE_SENTENCE);

            const existing = await loadStandard(ctx, tree.Sections[0].Standards[0].ID);
            existing.EvaluationMode = 'AI Assisted';
            await ExpectSaveRefused(existing, EVALUATION_MODE_SENTENCE);

            const interpretive = await newStandard(ctx, sectionID, '1.3');
            interpretive.IsInterpretive = true;
            await RequireSave(interpretive, 'creating an interpretive standard');
            AssertEqual((await loadStandard(ctx, interpretive.ID)).EvaluationMode, 'Human Only', 'interpretive standard evaluation mode');

            const marked = await ctx.Provider.GetEntityObject<StandardEntityServer>(CredentialingEntity.Standard, ctx.User);
            Assert('MarkAsVersionClone' in marked, 'the standard is the server subclass');
            marked.NewRecord();
            marked.SectionID = sectionID;
            marked.Code = '1.4';
            marked.Statement = 'Standard 1.4.';
            marked.ResponseType = 'Attestation';
            marked.EvaluationMode = 'AI Assisted';
            marked.MarkAsVersionClone(world.SampleProgram.Sections[0].Standards[0].ID);
            await ExpectSaveRefused(marked, NOT_FOUND_SENTENCE);
        },
    },
    {
        Id: 'cred-standard-rules.6',
        Name: 'a standard in a section that does not exist is not found',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            await ExpectSaveRefused(await newStandard(ctx, randomUUID(), '1.1'), NOT_FOUND_SENTENCE);
        },
    },
    {
        Id: 'cred-standard-rules.7',
        Name: 'two concurrent creates of one code leave one standard and a sentence',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1 }, ctx.User);
            await WithActors(ctx, 2, async (actors) => {
                const first = await newStandard(ctx, tree.Sections[0].Section.ID, '7.7', actors[0]);
                const second = await newStandard(ctx, tree.Sections[0].Section.ID, '7.7', actors[1]);
                const settled = await Promise.allSettled([first.Save(), second.Save()]);
                const outcomes = [
                    Outcome(settled[0], () => first.LatestResult?.CompleteMessage ?? ''),
                    Outcome(settled[1], () => second.LatestResult?.CompleteMessage ?? ''),
                ];
                AssertEqual(outcomes.filter((o) => o.Succeeded).length, 1, `exactly one create succeeds (${outcomes.map((o) => o.Message).join(' | ')})`);
                const loser = outcomes[0].Succeeded ? outcomes[1] : outcomes[0];
                Assert(loser.Message.includes(duplicateCodeSentence('7.7')), `loser gives the duplicate-code sentence, got "${loser.Message}"`);
            });
        },
    },
    {
        Id: 'cred-standard-rules.8',
        Name: 'a save from a stale snapshot cannot overwrite another edit',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const tree = await MakeScratchProgram(ctx, world, { Sections: 1, StandardsPerSection: 1 }, ctx.User);
            const standardID = tree.Sections[0].Standards[0].ID;
            const originalGuidance = tree.Sections[0].Standards[0].Guidance;
            await WithActors(ctx, 2, async (actors) => {
                const first = await loadStandard(ctx, standardID, actors[0]);
                const second = await loadStandard(ctx, standardID, actors[1]);
                first.Statement = 'Statement from instance 1.';
                await RequireSave(first, 'saving the statement from instance 1');
                second.Guidance = 'Guidance from instance 2.';
                await ExpectSaveRefused(second, STALE_SENTENCE);
            });
            const stored = await loadStandard(ctx, standardID);
            AssertEqual(stored.Statement, 'Statement from instance 1.', 'stored statement');
            AssertEqual(stored.Guidance, originalGuidance, 'stored guidance');
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
