/**
 * Applicant Documents resource — guarded by {@link CredentialingAreaResource} and
 * {@link ApplicantSubjectResource}. Task 8 fills in the Document Library inside it.
 */
import { Component } from '@angular/core';
import { ResourceData } from '@memberjunction/core-entities';
import { RegisterClass } from '@memberjunction/global';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJAlertComponent, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import type { MySubject } from '@mj-biz-apps/credentialing-core';
import { CredentialingResource } from '../application/area-nav';
import { ApplicantSubjectResource } from './applicant-subject-resource';

@RegisterClass(BaseResourceComponent, 'CredentialingApplicantDocumentsResource')
@Component({
    standalone: true,
    selector: 'bizapps-cred-applicant-documents-resource',
    imports: [SharedGenericModule, MJAlertComponent, MJEmptyStateComponent],
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
                        <mj-empty-state
                            Icon="fa-solid fa-folder-open"
                            [Title]="ActiveSubject.DisplayName"
                            Message="No documents uploaded yet."
                            Role="status">
                        </mj-empty-state>
                    }
                }
            }
        </div>
    `,
    styles: [`
        :host { display: block; width: 100%; height: 100%; }
        .cred-resource { height: 100%; padding: var(--mj-space-6); box-sizing: border-box; color: var(--mj-text-primary); }
        .cred-picker__title { margin: 0 0 var(--mj-space-3); font-size: var(--mj-text-xl, 1.25rem); }
        .cred-picker__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--mj-space-2); max-width: 36rem; }
        .cred-picker__btn { width: 100%; min-height: 44px; padding: var(--mj-space-3); text-align: left; border: 1px solid var(--mj-border-default); border-radius: var(--mj-radius-md, 6px); background: var(--mj-bg-surface); color: var(--mj-text-primary); cursor: pointer; }
    `],
})
export class CredentialingApplicantDocumentsResource extends ApplicantSubjectResource {
    public ActiveSubject: MySubject | null = null;

    protected get DriverClass(): string {
        return CredentialingResource.ApplicantDocuments;
    }

    protected override async OnSubjectResolved(subject: MySubject): Promise<void> {
        this.ActiveSubject = subject;
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
