import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AttestationInput } from '@mj-biz-apps/credentialing-core';

@Component({
    standalone: true,
    selector: 'bizapps-cred-attestation-form',
    imports: [FormsModule],
    templateUrl: './attestation-form.component.html',
    styleUrls: ['./attestation-form.component.scss'],
})
export class AttestationFormComponent {
    @Input() public Statement: string = '';
    @Input() public Disabled: boolean = false;

    private _attestation: AttestationInput = {
        OfficerName: null,
        OfficerRole: null,
        ApprovalDate: null,
        Accepted: false,
    };

    @Input()
    public get Attestation(): AttestationInput {
        return this._attestation;
    }
    public set Attestation(value: AttestationInput | null) {
        this._attestation = value ?? {
            OfficerName: null,
            OfficerRole: null,
            ApprovalDate: null,
            Accepted: false,
        };
    }

    @Output() public AttestationChanged = new EventEmitter<AttestationInput>();

    public get TodayIsoDate(): string {
        return new Date().toISOString().slice(0, 10);
    }

    public OnFieldChange(patch: Partial<AttestationInput>): void {
        const next: AttestationInput = {
            ...this._attestation,
            ...patch,
        };
        this._attestation = next;
        this.AttestationChanged.emit(next);
    }
}
