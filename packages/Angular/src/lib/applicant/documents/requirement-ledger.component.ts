/**
 * Application document requirement ledger (FRD FR-5.1, 5.2, 5.3, 5.6).
 *
 * Displays one application's requirements with document on file / attestation notice, uploaded
 * date, status, "What the assistant read", and state-appropriate actions (`Upload`, `Upload new`,
 * `Still current`, `View`, `Versions`, `Download original`, `Attest instead of uploading`, `Read again`).
 */
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { SharedGenericModule } from '@memberjunction/ng-shared-generic';
import { MJButtonDirective, MJEmptyStateComponent } from '@memberjunction/ng-ui-components';
import type { DocumentLedger, LedgerRow, LibraryDocument } from '@mj-biz-apps/credentialing-core';
import type { UploadResult } from './evidence-client';
import {
    DocumentRowStatusLabel,
    FormatAttestedNotice,
    FormatLibraryDate,
    FormatWhatWasRead,
    ResolveLedgerRowActions,
    type LedgerRowActions,
} from './library-model';
import { UploadDropzoneComponent } from './upload-dropzone.component';

@Component({
    standalone: true,
    selector: 'bizapps-cred-requirement-ledger',
    imports: [SharedGenericModule, MJButtonDirective, MJEmptyStateComponent, UploadDropzoneComponent],
    templateUrl: './requirement-ledger.component.html',
    styleUrls: ['./requirement-ledger.component.scss'],
})
export class RequirementLedgerComponent extends BaseAngularComponent {
    @Input({ required: true }) public Ledger!: DocumentLedger;
    @Input({ required: true }) public SubjectID!: string;
    @Input() public IsApplicant = true;
    @Input() public ActiveUploadRequirementID: string | null = null;
    @Input() public ConfirmingDocumentID: string | null = null;
    @Input() public DownloadingDocumentID: string | null = null;
    @Input() public RequeueingDocumentID: string | null = null;

    @Output() public readonly ToggleUpload = new EventEmitter<string | null>();
    @Output() public readonly Uploaded = new EventEmitter<UploadResult>();
    @Output() public readonly StillCurrent = new EventEmitter<LibraryDocument>();
    @Output() public readonly ViewDocument = new EventEmitter<LibraryDocument>();
    @Output() public readonly ViewVersions = new EventEmitter<LibraryDocument>();
    @Output() public readonly DownloadDocument = new EventEmitter<LibraryDocument>();
    @Output() public readonly OpenAttest = new EventEmitter<LedgerRow>();
    @Output() public readonly ReadAgain = new EventEmitter<LibraryDocument>();

    public ActionsFor(row: LedgerRow): LedgerRowActions {
        return ResolveLedgerRowActions(row, this.IsApplicant);
    }

    public StatusLabel(row: LedgerRow): string {
        return DocumentRowStatusLabel(row);
    }

    public FormatDate(iso: string | null | undefined): string {
        return FormatLibraryDate(iso);
    }

    public AttestedSummary(row: LedgerRow): string {
        return row.Attestation ? FormatAttestedNotice(row.Attestation) : '';
    }

    public WhatWasRead(doc: LibraryDocument): string {
        return FormatWhatWasRead(doc);
    }

    public OnToggleUpload(requirementID: string): void {
        const next = this.ActiveUploadRequirementID === requirementID ? null : requirementID;
        this.ToggleUpload.emit(next);
    }
}
