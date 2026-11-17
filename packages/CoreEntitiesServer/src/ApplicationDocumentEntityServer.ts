/**
 * Server-side subclass of ApplicationDocument — a document frozen into a submitted application. Its application, subject and target never change; the subject is always the application's.
 *
 * Applicant data: written only inside one of the application's own operations
 * (guards/OperationWrite.ts). Any other save or delete is refused for every caller
 * (guards/ApplicantRow.ts), so the generated GraphQL mutations are not a write path.
 */
import { BaseEntity, type EntityDeleteOptions, type EntitySaveOptions } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingApplicationDocumentEntity } from '@mj-biz-apps/credentialing-entities';
import { ApplicantRow } from './guards/ApplicantRow.js';

@RegisterClass(BaseEntity, CredentialingEntity.ApplicationDocument)
export class ApplicationDocumentEntityServer extends mjBizAppsCredentialingApplicationDocumentEntity {
    public override async Save(options?: EntitySaveOptions): Promise<boolean> {
        return ApplicantRow.Save(this, () => this.prepare(), () => super.Save(options));
    }

    public override async Delete(options?: EntityDeleteOptions): Promise<boolean> {
        return ApplicantRow.Delete(this, () => super.Delete(options));
    }

    /** Restores the immutable columns, then gives a new row the subject of its parent. */
    private async prepare(): Promise<string | null> {
        this.restoreImmutables();
        return ApplicantRow.SubjectFromParent(this, this.ActiveUser, CredentialingEntity.Application, this.ApplicationID, (subjectID) => {
            this.SubjectID = subjectID;
        });
    }

    /** Puts every immutable column back to the value the row was loaded with. */
    private restoreImmutables(): void {
        this.restore('ApplicationID', this.ApplicationID, (v) => (this.ApplicationID = v));
        this.restore('SubjectID', this.SubjectID, (v) => (this.SubjectID = v));
        this.restoreNullable('EvidenceDocumentID', this.EvidenceDocumentID, (v) => (this.EvidenceDocumentID = v));
        this.restoreNullable('DocumentAttestationID', this.DocumentAttestationID, (v) => (this.DocumentAttestationID = v));
    }

    private restoreNullable(fieldName: string, current: string | null, assign: (value: string | null) => void): void {
        const kept = ApplicantRow.Kept(this, fieldName, current);
        if (kept !== current) {
            assign(kept);
        }
    }

    private restore(fieldName: string, current: string, assign: (value: string) => void): void {
        const kept = ApplicantRow.Kept(this, fieldName, current) ?? current;
        if (kept !== current) {
            assign(kept);
        }
    }
}
