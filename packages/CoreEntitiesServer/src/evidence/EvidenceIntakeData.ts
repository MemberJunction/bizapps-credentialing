import { RunView, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import { CredentialingEntity, NOT_FOUND_REASON } from '@mj-biz-apps/credentialing-core';
import type { mjBizAppsCredentialingEvidenceDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import { AuthoringLock } from '../guards/AuthoringLock.js';
import { OperationWrite, type OperationWriteScope } from '../guards/OperationWrite.js';
import { SubjectAccess } from '../guards/SubjectAccess.js';
import { OperationSupport } from '../operations/OperationSupport.js';
import { DocumentFreeze } from './DocumentFreeze.js';
import {
    EvidenceIntake,
    EvidenceRefusal,
    type CurrentDocumentState,
    type EvidenceIntakeData,
    type EvidenceIntakeTransaction,
    type EvidenceUpload,
    type NewEvidenceRow,
} from './EvidenceIntake.js';

type EvidenceDocumentEntity = mjBizAppsCredentialingEvidenceDocumentEntity;

/** The current-document columns read before deciding a supersession. */
interface CurrentRow {
    ID: string;
    Status: EvidenceDocumentEntity['Status'];
}

/**
 * The server's {@link EvidenceIntakeData}: every read and write is made as the caller on the request's
 * provider, so the caller's row filters decide what exists and the change history names the person
 * who uploaded. The system user reads only inside `SubjectAccess` (the requirement and how the
 * caller acts for the subject), as that class documents.
 */
export class DatabaseEvidenceIntakeData implements EvidenceIntakeData {
    public constructor(
        private readonly provider: IMetadataProvider,
        private readonly user: UserInfo,
    ) {}

    public async Admit(upload: EvidenceUpload): Promise<void> {
        try {
            const subject = await SubjectAccess.Subject(upload.SubjectID, this.provider, this.user);
            const actor = await SubjectAccess.ActorFor(this.user, subject, this.provider);
            if (actor !== 'Applicant') {
                OperationSupport.Refuse(NOT_FOUND_REASON);
            }
            if (upload.RequirementID != null) {
                await SubjectAccess.Requirement(upload.RequirementID, subject.ID, this.provider);
            }
        } catch (err: unknown) {
            if (err instanceof Error && err.message === NOT_FOUND_REASON) {
                throw new EvidenceRefusal('NotFound', NOT_FOUND_REASON);
            }
            throw err;
        }
    }

    public ReadCurrent(subjectID: string, requirementID: string): Promise<CurrentDocumentState> {
        return DatabaseEvidenceIntakeData.ReadCurrentState(subjectID, requirementID, this.provider, this.user);
    }

    public Commit(subjectID: string, work: (tx: EvidenceIntakeTransaction) => Promise<string>): Promise<string> {
        return OperationWrite.Run(this.provider, async (scope) => {
            await AuthoringLock.ForSubject(subjectID, this.provider, this.user);
            return work(new DatabaseIntakeTransaction(scope, this.provider, this.user));
        });
    }

    /** The requirement's current (not superseded) document and the statuses of the applications that froze it. */
    public static async ReadCurrentState(subjectID: string, requirementID: string, provider: IMetadataProvider, user: UserInfo): Promise<CurrentDocumentState> {
        const result = await RunView.FromMetadataProvider(provider).RunView<CurrentRow>(
            {
                EntityName: CredentialingEntity.EvidenceDocument,
                ExtraFilter: `SubjectID = '${subjectID}' AND DocumentRequirementID = '${requirementID}' AND Status <> 'Superseded'`,
                Fields: ['ID', 'Status'],
                ResultType: 'simple',
                MaxRows: 1,
            },
            user,
        );
        if (!result.Success) {
            throw new Error(`Reading the current document of a requirement failed: ${result.ErrorMessage ?? 'unknown error'}`);
        }
        const current = result.Results[0] ?? null;
        if (current == null) {
            return { Current: null, FrozenBy: [] };
        }
        return { Current: current, FrozenBy: await DocumentFreeze.Statuses('EvidenceDocumentID', current.ID, provider, user) };
    }
}

/** The writes of one upload transaction, each saved as the caller through the operation's scope. */
class DatabaseIntakeTransaction implements EvidenceIntakeTransaction {
    public constructor(
        private readonly scope: OperationWriteScope,
        private readonly provider: IMetadataProvider,
        private readonly user: UserInfo,
    ) {}

    public ReadCurrent(subjectID: string, requirementID: string): Promise<CurrentDocumentState> {
        return DatabaseEvidenceIntakeData.ReadCurrentState(subjectID, requirementID, this.provider, this.user);
    }

    public async Supersede(documentID: string): Promise<void> {
        const { Document } = await SubjectAccess.Document(documentID, this.provider, this.user);
        Document.Status = 'Superseded';
        await this.scope.Save(Document);
    }

    public async Insert(row: NewEvidenceRow): Promise<string> {
        const document = await OperationSupport.NewRecord<EvidenceDocumentEntity>(this.provider, CredentialingEntity.EvidenceDocument, this.user);
        document.SubjectID = row.SubjectID;
        document.DocumentRequirementID = row.RequirementID;
        document.SupersedesDocumentID = row.SupersedesDocumentID;
        document.FileID = row.FileID;
        document.FileName = row.FileName;
        document.ContentType = row.ContentType;
        document.SizeBytes = row.SizeBytes;
        document.ContentHash = row.ContentHash;
        document.ExtractedText = row.Text.Text;
        document.TextStatus = row.Text.Status;
        document.TextNote = row.Text.Note;
        document.PageCount = row.Text.PageCount;
        document.ReadingStatus = EvidenceIntake.ReadingStatusFor(row.Text);
        document.ReadingAttempts = 0;
        document.Status = 'Current';
        document.UploadedByUserID = row.UploadedByUserID;
        document.UploadedAt = new Date();
        await this.scope.Save(document);
        return document.ID;
    }
}
