/**
 * Server-side subclass of StandardResponse — an application's answer to one standard. Its application, standard and subject never change; the subject is always the application's.
 *
 * Applicant data: written only inside one of the application's own operations
 * (guards/OperationWrite.ts). Any other save or delete is refused for every caller
 * (guards/ApplicantRow.ts), so the generated GraphQL mutations are not a write path.
 */
import { BaseEntity, type EntityDeleteOptions, type EntitySaveOptions } from '@memberjunction/core';
import { RegisterClass } from '@memberjunction/global';
import { CredentialingEntity } from '@mj-biz-apps/credentialing-core';
import { mjBizAppsCredentialingStandardResponseEntity } from '@mj-biz-apps/credentialing-entities';
import { ApplicantRow } from './guards/ApplicantRow.js';

@RegisterClass(BaseEntity, CredentialingEntity.StandardResponse)
export class StandardResponseEntityServer extends mjBizAppsCredentialingStandardResponseEntity {
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
        this.restore('StandardID', this.StandardID, (v) => (this.StandardID = v));
        this.restore('SubjectID', this.SubjectID, (v) => (this.SubjectID = v));
    }

    private restore(fieldName: string, current: string, assign: (value: string) => void): void {
        const kept = ApplicantRow.Kept(this, fieldName, current) ?? current;
        if (kept !== current) {
            assign(kept);
        }
    }
}
