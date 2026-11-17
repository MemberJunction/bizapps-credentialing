import { randomUUID } from 'node:crypto';
import type { BaseEntity } from '@memberjunction/core';
import type { MJFileEntity } from '@memberjunction/core-entities';
import {
    Assert,
    AssertEqual,
    IntegrationCheckRegistry,
    type IntegrationCheckContext,
    type NamedCheck,
} from '@memberjunction/testing-integration/registry';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import type {
    mjBizAppsCredentialingApplicationEntity,
    mjBizAppsCredentialingEvidenceDocumentEntity,
    mjBizAppsCredentialingExtractionEntity,
    mjBizAppsCredentialingSubjectEntity,
} from '@mj-biz-apps/credentialing-entities';
import { OperationWrite } from '@mj-biz-apps/credentialing-core-entities-server';
import { FindRows, RequireDelete, RequireSave } from '../wire.js';
import { GetOrLoadWorld } from '../world/load-world.js';

type SubjectEntity = mjBizAppsCredentialingSubjectEntity;
type ApplicationEntity = mjBizAppsCredentialingApplicationEntity;
type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;
type ExtractionEntity = mjBizAppsCredentialingExtractionEntity;

/**
 * Applicant data is written only inside an operation's write scope (Task 3), so these schema checks
 * save and delete their scratch rows through `OperationWrite.Run`, one transaction per write — the
 * same unique-index behaviour they assert, reached through the one path that may write.
 */
async function admittedSave(ctx: IntegrationCheckContext, entity: BaseEntity, label: string): Promise<void> {
    try {
        await OperationWrite.Run(ctx.Provider, (scope) => scope.Save(entity));
    } catch (err: unknown) {
        throw new Error(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
}

async function admittedDelete(ctx: IntegrationCheckContext, entity: BaseEntity, label: string): Promise<void> {
    try {
        await OperationWrite.Run(ctx.Provider, (scope) => scope.Delete(entity));
    } catch (err: unknown) {
        throw new Error(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
}

/** Asserts an admitted save is refused with a message containing `fragment`. */
async function admittedSaveRefused(ctx: IntegrationCheckContext, entity: BaseEntity, fragment: string): Promise<void> {
    let message: string | null = null;
    try {
        await OperationWrite.Run(ctx.Provider, (scope) => scope.Save(entity));
    } catch (err: unknown) {
        message = err instanceof Error ? err.message : String(err);
    }
    Assert(message != null, `expected the save to be refused with "${fragment}", but it succeeded`);
    Assert(message.includes(fragment), `expected a refusal containing "${fragment}", got "${message}"`);
}

async function createScratchSubject(ctx: IntegrationCheckContext, accreditingOrganizationID: string): Promise<SubjectEntity> {
    const hex = randomUUID().replace(/-/g, '').slice(0, 8);
    const subject = await ctx.Provider.GetEntityObject<SubjectEntity>(CredentialingEntity.Subject, ctx.User);
    subject.NewRecord();
    subject.AccreditingOrganizationID = accreditingOrganizationID;
    subject.SubjectType = 'Person';
    subject.DisplayName = `Schema Check Subject ${hex}`;
    subject.PrimaryEmail = `schema-check-${hex}@example.test`;
    subject.Status = 'Active';
    await admittedSave(ctx, subject, 'scratch subject');
    return subject;
}

const checks: NamedCheck[] = [
    {
        Id: 'cred-applicant-schema.1',
        Name: 'all seventeen entities in CredentialingEntity are registered',
        Fn: async (ctx: IntegrationCheckContext) => {
            const names = Object.values(CredentialingEntity);
            AssertEqual(names.length, 17, 'CredentialingEntity count');
            for (const name of names) {
                Assert(ctx.Provider.EntityByName(name) != null, `entity registered: ${name}`);
            }
        },
    },
    {
        Id: 'cred-applicant-schema.2',
        Name: 'a second live application for one subject and version fails on UQ_Application_OneLive, and succeeds once the first is Withdrawn',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const subject = await createScratchSubject(ctx, world.OrgA.ID);
            const versionID = world.SampleProgram.Version.ID;

            const app1 = await ctx.Provider.GetEntityObject<ApplicationEntity>(CredentialingEntity.Application, ctx.User);
            app1.NewRecord();
            app1.SubjectID = subject.ID;
            app1.ProgramVersionID = versionID;
            app1.Status = 'Draft';
            app1.IsHistorical = false;

            const app2 = await ctx.Provider.GetEntityObject<ApplicationEntity>(CredentialingEntity.Application, ctx.User);
            app2.NewRecord();
            app2.SubjectID = subject.ID;
            app2.ProgramVersionID = versionID;
            app2.Status = 'Draft';
            app2.IsHistorical = false;

            try {
                await admittedSave(ctx, app1, 'first application');
                await admittedSaveRefused(ctx, app2, 'UQ_Application_OneLive');

                app1.Status = 'Withdrawn';
                app1.WithdrawnAt = new Date();
                app1.WithdrawnByUserID = ctx.User.ID;
                await admittedSave(ctx, app1, 'withdrawing first application');

                await admittedSave(ctx, app2, 'second application after withdrawal');
            } finally {
                if (app2.IsSaved) await admittedDelete(ctx, app2, 'cleanup app2');
                if (app1.IsSaved) await admittedDelete(ctx, app1, 'cleanup app1');
                if (subject.IsSaved) await admittedDelete(ctx, subject, 'cleanup subject');
            }
        },
    },
    {
        Id: 'cred-applicant-schema.3',
        Name: 'a second non-superseded Extraction for one document and standard fails on UQ_Extraction_OneCurrent',
        RequiresMutation: true,
        Fn: async (ctx: IntegrationCheckContext) => {
            const world = await GetOrLoadWorld(ctx);
            const subject = await createScratchSubject(ctx, world.OrgA.ID);
            const providers = await FindRows<{ ID: string }>(ctx, 'MJ: File Storage Providers', '', ['ID']);
            Assert(providers.length > 0, 'at least one FileStorageProvider exists');

            const hex = randomUUID().replace(/-/g, '').slice(0, 8);
            const file = await ctx.Provider.GetEntityObject<MJFileEntity>('MJ: Files', ctx.User);
            file.NewRecord();
            file.Name = `schema-check-${hex}.pdf`;
            file.ProviderID = providers[0].ID;
            file.Status = 'Pending';

            const doc = await ctx.Provider.GetEntityObject<EvidenceDocumentEntity>(CredentialingEntity.EvidenceDocument, ctx.User);
            const ext1 = await ctx.Provider.GetEntityObject<ExtractionEntity>(CredentialingEntity.Extraction, ctx.User);
            const ext2 = await ctx.Provider.GetEntityObject<ExtractionEntity>(CredentialingEntity.Extraction, ctx.User);

            try {
                await RequireSave(file, 'scratch file');

                doc.NewRecord();
                doc.SubjectID = subject.ID;
                doc.FileID = file.ID;
                doc.FileName = file.Name;
                doc.ContentType = 'application/pdf';
                doc.SizeBytes = 128;
                doc.ContentHash = 'a'.repeat(64);
                doc.ExtractedText = 'The applicant holds a qualifying degree.';
                doc.TextStatus = 'Extracted';
                doc.ReadingStatus = 'Pending';
                doc.Status = 'Current';
                doc.UploadedByUserID = ctx.User.ID;
                doc.UploadedAt = new Date();
                await admittedSave(ctx, doc, 'scratch evidence document');

                const standardID = world.SampleProgram.Sections[0].Standards[0].ID;

                ext1.NewRecord();
                ext1.EvidenceDocumentID = doc.ID;
                ext1.StandardID = standardID;
                ext1.SubjectID = subject.ID;
                ext1.Value = 'Qualifying degree held.';
                ext1.Excerpt = 'The applicant holds a qualifying degree.';
                ext1.StartOffset = 0;
                ext1.EndOffset = 40;
                ext1.Confidence = 0.95;
                ext1.Status = 'Proposed';
                ext1.IsSuperseded = false;
                await admittedSave(ctx, ext1, 'first extraction');

                ext2.NewRecord();
                ext2.EvidenceDocumentID = doc.ID;
                ext2.StandardID = standardID;
                ext2.SubjectID = subject.ID;
                ext2.Value = 'Second extraction.';
                ext2.Excerpt = 'The applicant holds a qualifying degree.';
                ext2.StartOffset = 0;
                ext2.EndOffset = 40;
                ext2.Confidence = 0.85;
                ext2.Status = 'Proposed';
                ext2.IsSuperseded = false;
                await admittedSaveRefused(ctx, ext2, 'UQ_Extraction_OneCurrent');
            } finally {
                if (ext2.IsSaved) await admittedDelete(ctx, ext2, 'cleanup ext2');
                if (ext1.IsSaved) await admittedDelete(ctx, ext1, 'cleanup ext1');
                if (doc.IsSaved) await admittedDelete(ctx, doc, 'cleanup evidence document');
                if (file.IsSaved) await RequireDelete(file, 'cleanup file');
                if (subject.IsSaved) await admittedDelete(ctx, subject, 'cleanup subject');
            }
        },
    },
];

for (const check of checks) {
    IntegrationCheckRegistry.Instance.Register(check);
}
