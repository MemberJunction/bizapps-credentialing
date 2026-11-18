/**
 * Sets up an accrediting organization with its first staff member (FRD FR-1.2, as far as B1 needs).
 *
 * One call to `Credentialing.CreateOrganization` through `ProviderToUse`; the server writes the
 * organization, the membership, the staff role and the application grant in one transaction and
 * resolves the email itself, so no role needs permission to list users. This widget saves nothing
 * of its own and navigates nowhere: it emits {@link OrganizationCreated}. A refusal is shown beside the
 * field it names, as {@link StudioMessages} words it.
 */
import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BaseAngularComponent } from '@memberjunction/ng-base-types';
import { MJButtonDirective } from '@memberjunction/ng-ui-components';
import { CreateOrganizationOperation } from '@mj-biz-apps/credentialing-core';
import { StudioMessages } from '../studio-messages';

/** Which field a refusal concerns, so it renders beside that field. */
export type OrganizationSetupErrorField = 'Name' | 'Email' | 'Form' | null;

@Component({
    standalone: true,
    selector: 'bizapps-cred-organization-setup',
    imports: [FormsModule, MJButtonDirective],
    templateUrl: './organization-setup.component.html',
    styleUrls: ['./organization-setup.component.scss'],
})
export class OrganizationSetupComponent extends BaseAngularComponent {
    private readonly cdr = inject(ChangeDetectorRef);

    /** The page heading: `Set up organization` on first run, `New organization` afterwards. */
    @Input() Heading = 'Set up organization';

    /** Emits the new (or found) accrediting organization's ID after a successful setup. */
    @Output() OrganizationCreated = new EventEmitter<string>();

    public OrganizationName = '';
    public StaffEmail = '';
    public IsSubmitting = false;
    public ErrorMessage = '';
    public ErrorField: OrganizationSetupErrorField = null;
    public SuccessMessage = '';

    /** True when both fields hold text and no call is in flight. */
    public get CanSubmit(): boolean {
        return !this.IsSubmitting && this.OrganizationName.trim().length > 0 && this.StaffEmail.trim().length > 0;
    }

    /** Runs the setup once; a second press while the first is in flight does nothing. */
    public async Submit(): Promise<void> {
        if (!this.CanSubmit) {
            return;
        }
        const name = this.OrganizationName.trim();
        const email = this.StaffEmail.trim();
        this.startCall();
        try {
            const result = await new CreateOrganizationOperation().Execute({ Name: name, FirstStaffEmail: email }, { provider: this.ProviderToUse });
            if (result.Success && result.Output) {
                this.SuccessMessage = `${name} is set up. ${email} can now sign in; if they are already signed in, they need to sign out and in again.`;
                this.OrganizationCreated.emit(result.Output.AccreditingOrganizationID);
            } else {
                this.showError(StudioMessages.ForUser(result.ErrorMessage || 'The organization could not be set up.'));
            }
        } catch (e) {
            this.showError(StudioMessages.FromError(e));
        } finally {
            this.IsSubmitting = false;
            this.cdr.markForCheck();
        }
    }

    private startCall(): void {
        this.IsSubmitting = true;
        this.ErrorMessage = '';
        this.ErrorField = null;
        this.SuccessMessage = '';
        this.cdr.markForCheck();
    }

    private showError(message: string): void {
        this.ErrorMessage = message;
        this.ErrorField = OrganizationSetupComponent.FieldFor(message);
    }

    /** The field a refusal concerns: the server's sentences name the email or the name they are about. */
    public static FieldFor(message: string): Exclude<OrganizationSetupErrorField, null> {
        if (/e-?mail/i.test(message)) {
            return 'Email';
        }
        if (/\bname\b/i.test(message)) {
            return 'Name';
        }
        return 'Form';
    }
}
