import { randomUUID } from 'node:crypto';
import type { BaseEntity, UserInfo } from '@memberjunction/core';
import { Assert, type IntegrationCheckContext } from '@memberjunction/testing-integration/registry';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingDocumentRequirementEntity,
    mjBizAppsCredentialingProgramEntity,
    mjBizAppsCredentialingProgramVersionEntity,
    mjBizAppsCredentialingSectionEntity,
    mjBizAppsCredentialingStandardEntity,
} from '@mj-biz-apps/credentialing-entities';
import { Quote, RequireSave, View } from '../wire.js';
import type { CredentialingWorld } from './world.js';

type ProgramEntity = mjBizAppsCredentialingProgramEntity;
type VersionEntity = mjBizAppsCredentialingProgramVersionEntity;
type SectionEntity = mjBizAppsCredentialingSectionEntity;
type StandardEntity = mjBizAppsCredentialingStandardEntity;
type DocumentRequirementEntity = mjBizAppsCredentialingDocumentRequirementEntity;

const APP_SCHEMA = '__mj_BizAppsCredentialing';

/** One standard of a tree, keyed in its version by `Code`. */
export interface StandardSpec {
    Code: string;
    Statement: string;
    ResponseType: StandardEntity['ResponseType'];
    IntakeMode?: StandardEntity['IntakeMode'];
    EvidenceHint?: string | null;
    IsInterpretive?: boolean;
    IsNewForVersion?: boolean;
    Sequence: number;
}

/** One section of a tree, keyed in its version by `Number`. */
export interface SectionSpec {
    Number: string;
    Name: string;
    Sequence: number;
    Standards: StandardSpec[];
}

/** One document requirement of a tree, keyed in its version by `Name`. */
export interface DocumentRequirementSpec {
    Name: string;
    IsRequired?: boolean;
    SensitivityPolicy?: DocumentRequirementEntity['SensitivityPolicy'];
    Sequence: number;
}

/** A program with one version and its tree, keyed at every level by its natural key. */
export interface ProgramTreeSpec {
    AccreditingOrganizationID: string;
    Program: {
        Name: string;
        ProgramType: ProgramEntity['ProgramType'];
        SubjectType: ProgramEntity['SubjectType'];
        SubjectNoun: string;
        CredentialPrefix: string;
        Description?: string | null;
    };
    Version: { Label: string; CommitteeID: string | null };
    Sections: SectionSpec[];
    DocumentRequirements: DocumentRequirementSpec[];
}

/** A section of a loaded tree and the standards under it, in spec order. */
export interface ProgramTreeSection {
    Section: SectionEntity;
    Standards: StandardEntity[];
}

/** The rows of a program tree, loaded (or created) as entity objects for the user who ensured it. */
export interface ProgramTree {
    Program: ProgramEntity;
    Version: VersionEntity;
    Sections: ProgramTreeSection[];
    DocumentRequirements: DocumentRequirementEntity[];
}

/** The rows of a tree that already exist, read with one RunViews call. */
interface ExistingTree {
    Program: ProgramEntity | null;
    Version: VersionEntity | null;
    Sections: SectionEntity[];
    Standards: StandardEntity[];
    DocumentRequirements: DocumentRequirementEntity[];
}

/**
 * Finds or creates every level of a program tree by its natural key — the program by
 * (AccreditingOrganizationID, Name), the version by (ProgramID, Label), each section by
 * (ProgramVersionID, Number), each standard by (ProgramVersionID, Code), each document requirement by
 * (ProgramVersionID, Name) — so a load that stopped partway is completed by the next one. Rows are
 * created through entity objects as `asUser`.
 */
export async function EnsureProgramTree(
    ctx: IntegrationCheckContext,
    spec: ProgramTreeSpec,
    asUser: UserInfo,
): Promise<ProgramTree> {
    const existing = await readExistingTree(ctx, spec, asUser);
    const program = existing.Program ?? (await createProgram(ctx, spec, asUser));
    const version = existing.Version ?? (await createVersion(ctx, spec, program.ID, asUser));
    const sections: ProgramTreeSection[] = [];
    for (const sectionSpec of spec.Sections) {
        const section =
            existing.Sections.find((s) => s.Number === sectionSpec.Number) ??
            (await createSection(ctx, sectionSpec, version.ID, asUser));
        const standards: StandardEntity[] = [];
        for (const standardSpec of sectionSpec.Standards) {
            standards.push(
                existing.Standards.find((s) => s.Code === standardSpec.Code) ??
                    (await createStandard(ctx, standardSpec, section.ID, version.ID, asUser)),
            );
        }
        sections.push({ Section: section, Standards: standards });
    }
    const documentRequirements: DocumentRequirementEntity[] = [];
    for (const requirementSpec of spec.DocumentRequirements) {
        documentRequirements.push(
            existing.DocumentRequirements.find((d) => d.Name === requirementSpec.Name) ??
                (await createDocumentRequirement(ctx, requirementSpec, version.ID, asUser)),
        );
    }
    return { Program: program, Version: version, Sections: sections, DocumentRequirements: documentRequirements };
}

/** The shape of a scratch program: how many sections, how many standards in each, and its committee. */
export interface ScratchShape {
    Sections: number;
    StandardsPerSection: number;
    CommitteeID?: string;
    DocumentRequirements?: number;
}

/**
 * Creates a program that belongs to one check: OrgA, a run-unique name and credential prefix
 * (`Scratch <8 hex>` / `S<8 HEX>`), and one Draft version `2027` holding `shape`. Sections are
 * numbered `1..n`, standards `<section>.<n>`.
 */
export async function MakeScratchProgram(
    ctx: IntegrationCheckContext,
    world: CredentialingWorld,
    shape: ScratchShape,
    asUser: UserInfo,
): Promise<ProgramTree> {
    const hex = randomUUID().replace(/-/g, '').slice(0, 8);
    const sections: SectionSpec[] = [];
    for (let s = 1; s <= shape.Sections; s++) {
        const standards: StandardSpec[] = [];
        for (let n = 1; n <= shape.StandardsPerSection; n++) {
            standards.push({ Code: `${s}.${n}`, Statement: `Scratch standard ${s}.${n}.`, ResponseType: 'Attestation', Sequence: n });
        }
        sections.push({ Number: `${s}`, Name: `Scratch section ${s}`, Sequence: s, Standards: standards });
    }
    const requirements: DocumentRequirementSpec[] = [];
    for (let d = 1; d <= (shape.DocumentRequirements ?? 0); d++) {
        requirements.push({ Name: `Scratch document ${d}`, Sequence: d });
    }
    return EnsureProgramTree(
        ctx,
        {
            AccreditingOrganizationID: world.OrgA.ID,
            Program: {
                Name: `Scratch ${hex}`,
                ProgramType: 'Certification',
                SubjectType: 'Person',
                SubjectNoun: 'professional',
                CredentialPrefix: `S${hex.toUpperCase()}`,
            },
            Version: { Label: '2027', CommitteeID: shape.CommitteeID ?? null },
            Sections: sections,
            DocumentRequirements: requirements,
        },
        asUser,
    );
}

async function readExistingTree(ctx: IntegrationCheckContext, spec: ProgramTreeSpec, asUser: UserInfo): Promise<ExistingTree> {
    const programFilter =
        `AccreditingOrganizationID = '${Quote(spec.AccreditingOrganizationID)}' AND Name = '${Quote(spec.Program.Name)}'`;
    const versionFilter =
        `ProgramID IN (SELECT ID FROM [${APP_SCHEMA}].[vwPrograms] WHERE ${programFilter}) AND Label = '${Quote(spec.Version.Label)}'`;
    const childFilter = `ProgramVersionID IN (SELECT ID FROM [${APP_SCHEMA}].[vwProgramVersions] WHERE ${versionFilter})`;
    const results = await View(ctx).RunViews<BaseEntity>(
        [
            { EntityName: CredentialingEntity.Program, ExtraFilter: programFilter, ResultType: 'entity_object' },
            { EntityName: CredentialingEntity.ProgramVersion, ExtraFilter: versionFilter, ResultType: 'entity_object' },
            { EntityName: CredentialingEntity.Section, ExtraFilter: childFilter, ResultType: 'entity_object' },
            { EntityName: CredentialingEntity.Standard, ExtraFilter: childFilter, ResultType: 'entity_object' },
            { EntityName: CredentialingEntity.DocumentRequirement, ExtraFilter: childFilter, ResultType: 'entity_object' },
        ],
        asUser,
    );
    results.forEach((r, i) => Assert(r.Success, `reading program tree (view ${i}) failed: ${r.ErrorMessage ?? 'unknown'}`));
    return {
        Program: (results[0].Results[0] as ProgramEntity | undefined) ?? null,
        Version: (results[1].Results[0] as VersionEntity | undefined) ?? null,
        Sections: results[2].Results as SectionEntity[],
        Standards: results[3].Results as StandardEntity[],
        DocumentRequirements: results[4].Results as DocumentRequirementEntity[],
    };
}

async function createProgram(ctx: IntegrationCheckContext, spec: ProgramTreeSpec, asUser: UserInfo): Promise<ProgramEntity> {
    const program = await ctx.Provider.GetEntityObject<ProgramEntity>(CredentialingEntity.Program, asUser);
    program.NewRecord();
    program.AccreditingOrganizationID = spec.AccreditingOrganizationID;
    program.Name = spec.Program.Name;
    program.ProgramType = spec.Program.ProgramType;
    program.SubjectType = spec.Program.SubjectType;
    program.SubjectNoun = spec.Program.SubjectNoun;
    program.CredentialPrefix = spec.Program.CredentialPrefix;
    if (spec.Program.Description !== undefined) {
        program.Description = spec.Program.Description;
    }
    await RequireSave(program, `program ${spec.Program.Name}`);
    return program;
}

async function createVersion(ctx: IntegrationCheckContext, spec: ProgramTreeSpec, programID: string, asUser: UserInfo): Promise<VersionEntity> {
    const version = await ctx.Provider.GetEntityObject<VersionEntity>(CredentialingEntity.ProgramVersion, asUser);
    version.NewRecord();
    version.ProgramID = programID;
    version.Label = spec.Version.Label;
    version.Status = 'Draft';
    version.CommitteeID = spec.Version.CommitteeID;
    await RequireSave(version, `version ${spec.Version.Label} of ${spec.Program.Name}`);
    return version;
}

async function createSection(ctx: IntegrationCheckContext, spec: SectionSpec, versionID: string, asUser: UserInfo): Promise<SectionEntity> {
    const section = await ctx.Provider.GetEntityObject<SectionEntity>(CredentialingEntity.Section, asUser);
    section.NewRecord();
    section.ProgramVersionID = versionID;
    section.Number = spec.Number;
    section.Name = spec.Name;
    section.Sequence = spec.Sequence;
    await RequireSave(section, `section ${spec.Number}`);
    return section;
}

async function createStandard(
    ctx: IntegrationCheckContext,
    spec: StandardSpec,
    sectionID: string,
    versionID: string,
    asUser: UserInfo,
): Promise<StandardEntity> {
    const standard = await ctx.Provider.GetEntityObject<StandardEntity>(CredentialingEntity.Standard, asUser);
    standard.NewRecord();
    standard.SectionID = sectionID;
    standard.ProgramVersionID = versionID;
    standard.Code = spec.Code;
    standard.Statement = spec.Statement;
    standard.ResponseType = spec.ResponseType;
    if (spec.IntakeMode != null) {
        standard.IntakeMode = spec.IntakeMode;
    }
    if (spec.EvidenceHint !== undefined) {
        standard.EvidenceHint = spec.EvidenceHint;
    }
    standard.IsInterpretive = spec.IsInterpretive ?? false;
    if (spec.IsNewForVersion != null) {
        standard.IsNewForVersion = spec.IsNewForVersion;
    }
    standard.Sequence = spec.Sequence;
    await RequireSave(standard, `standard ${spec.Code}`);
    return standard;
}

async function createDocumentRequirement(
    ctx: IntegrationCheckContext,
    spec: DocumentRequirementSpec,
    versionID: string,
    asUser: UserInfo,
): Promise<DocumentRequirementEntity> {
    const requirement = await ctx.Provider.GetEntityObject<DocumentRequirementEntity>(CredentialingEntity.DocumentRequirement, asUser);
    requirement.NewRecord();
    requirement.ProgramVersionID = versionID;
    requirement.Name = spec.Name;
    if (spec.IsRequired != null) {
        requirement.IsRequired = spec.IsRequired;
    }
    if (spec.SensitivityPolicy != null) {
        requirement.SensitivityPolicy = spec.SensitivityPolicy;
    }
    requirement.Sequence = spec.Sequence;
    await RequireSave(requirement, `document requirement ${spec.Name}`);
    return requirement;
}
