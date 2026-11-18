/**
 * Applicant Documents resource — guarded by {@link CredentialingAreaResource} and
 * {@link ApplicantSubjectResource}. Hosts the Document Library and keeps `subjectId` and
 * optional `documentId` synchronized with the URL.
 */
import { Component } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { UUIDsEqual, RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import type { MySubject } from '@mj-biz-apps/credentialing-core';
import { DocumentLibraryPage } from '../applicant/documents/document-library.page';
import { CredentialingResource } from '../application/area-nav';
import { SUBJECT_ID_PARAM } from '../shared/subject-context.service';
import { ApplicantSubjectResource } from './applicant-subject-resource';

@RegisterClass(BaseResourceComponent, 'CredentialingApplicantDocumentsResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-applicant-documents-resource',
    imports: [SharedGenericModule, MJAlertComponent, MJEmptyStateComponent, DocumentLibraryPage],
    template: `
        <div class="cred-resource">
            @switch (State) {
                @case ('Loading') {
                    <mj-loading Text="Loading Documents..."></mj-loading>
                }
                @case ('NotAvailable') {
                    <mj-empty-state Icon="fa-solid fa-lock" [Message]="NotAvailableMessage" Role="status"></mj-empty-state>
                }
                @case ('Error') {
                    <mj-alert Variant="error" Title="Documents could not load" [Message]="ErrorMessage"></mj-alert>
                }
                @case ('Open') {
                    @if (Resolution.Kind === 'PickSubject') {
                        <section class="cred-picker" aria-labelledby="cred-documents-picker-heading">
                            <h1 id="cred-documents-picker-heading" class="cred-picker__title">{{ PickerHeading }}</h1>
                            <ul class="cred-picker__list">
                                @for (subject of Resolution.Subjects; track subject.SubjectID) {
                                    <li>
                                        <button type="button" class="cred-picker__btn" (click)="SelectSubject(subject)">
                                            {{ subject.DisplayName }}
                                        </button>
                                    </li>
                                }
                            </ul>
                        </section>
                    } @else if (ActiveSubject) {
                        <bizapps-cred-document-library
                            [Provider]="Provider"
                            [Subject]="ActiveSubject"
                            [RequestedDocumentID]="RequestedDocumentID"
                            [RequestedRequirementID]="RequestedRequirementID"
                            [RefreshKey]="RefreshKey"
                            (DocumentViewed)="OnDocumentViewed($event)">
                        </bizapps-cred-document-library>
                    }
                }
            }
        </div>
    `,
    styles: [`
        :host { display: block; width: 100%; height: 100%; }
        .cred-resource { height: 100%; padding: var(--mj-space-6); box-sizing: border-box; color: var(--mj-text-primary); overflow: auto; }
        .cred-picker__title { margin: 0 0 var(--mj-space-3); font-size: var(--mj-text-xl, 1.25rem); }
        .cred-picker__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--mj-space-2); max-width: 36rem; }
        .cred-picker__btn { width: 100%; min-height: 44px; padding: var(--mj-space-3); text-align: left; border: 1px solid var(--mj-border-default); border-radius: var(--mj-radius-md, 6px); background: var(--mj-bg-surface); color: var(--mj-text-primary); cursor: pointer; }
    `],
})
export class CredentialingApplicantDocumentsResource extends ApplicantSubjectResource {
    public ActiveSubject: MySubject | null = null;
    public RequestedDocumentID: string | null = null;
    public RequestedRequirementID: string | null = null;

    protected get DriverClass(): string {
        return CredentialingResource.ApplicantDocuments;
    }

    protected override async OnSubjectResolved(subject: MySubject, params: Record<string, string>): Promise<void> {
        this.ActiveSubject = subject;
        this.RequestedDocumentID = params['documentId']?.trim() || null;
        this.RequestedRequirementID = params['requirementId']?.trim() || null;
    }

    protected override OnQueryParamsChanged(params: Record<string, string>, source: 'popstate' | 'deeplink'): void {
        const incomingSubject = params[SUBJECT_ID_PARAM]?.trim() || null;
        if (incomingSubject && (!this.ActiveSubject || !UUIDsEqual(incomingSubject, this.ActiveSubject.SubjectID))) {
            super.OnQueryParamsChanged(params, source);
            return;
        }
        if (!this.ActiveSubject) {
            return;
        }
        this.RequestedDocumentID = params['documentId']?.trim() || null;
        this.RequestedRequirementID = params['requirementId']?.trim() || null;
        this.cdr.markForCheck();
    }

    public OnDocumentViewed(documentID: string | null): void {
        this.RequestedDocumentID = documentID;
        this.UpdateQueryParams({
            [SUBJECT_ID_PARAM]: this.ActiveSubject?.SubjectID ?? null,
            documentId: documentID,
        });
    }

    async GetResourceDisplayName(_data: ResourceData): Promise<string> {
        return 'Documents';
    }

    async GetResourceIconClass(_data: ResourceData): Promise<string> {
        return 'fa-solid fa-folder-open';
    }
}

/** Tree-shaking anchor, called by the client bootstrap. */
export function LoadCredentialingApplicantDocumentsResource(): void {
    void CredentialingApplicantDocumentsResource;
}
