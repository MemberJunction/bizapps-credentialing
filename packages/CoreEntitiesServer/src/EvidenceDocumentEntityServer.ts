/**
 * Server-side subclass of EvidenceDocument — a document in a subject's library. Its subject, file and content hash never change.
 *
 * Applicant data: written only inside one of the application's own operations
 * (guards/OperationWrite.ts). Any other save or delete is refused for every caller
 * (guards/ApplicantRow.ts), so the generated GraphQL mutations are not a write path.
 */
import { BaseEntity, type EntityDeleteOptions, type EntitySaveOptions } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingEvidenceDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import { ApplicantRow } from './guards/ApplicantRow.js';

@RegisterClass(BaseEntity, CredentialingEntity.EvidenceDocument)
export class EvidenceDocumentEntityServer extends mjBizAppsCredentialingEvidenceDocumentEntity {
    public override async Save(options?: EntitySaveOptions): Promise<boolean> {
        return ApplicantRow.Save(this, () => this.prepare(), () => super.Save(options));
    }

    public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
        return ApplicantRow.Delete(this, () => super.Delete(options));
    }

    /** Restores the immutable columns. */
    private async prepare(): Promise<string | null> {
        this.restoreImmutables();
        return null;
    }

    /** Puts every immutable column back to the value the row was loaded with. */
    private restoreImmutables(): void {
        this.restore('SubjectID', this.SubjectID, (v) => (this.SubjectID = v));
        this.restore('FileID', this.FileID, (v) => (this.FileID = v));
        this.restore('ContentHash', this.ContentHash, (v) => (this.ContentHash = v));
    }

    private restore(fieldName: string, current: string, assign: (value: string) => void): void {
        const kept = ApplicantRow.Kept(this, fieldName, current) ?? current;
        if (kept !== current) {
            assign(kept);
        }
    }
}
