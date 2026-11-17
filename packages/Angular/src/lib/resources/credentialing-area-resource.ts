/**
 * Base of every Credentialing resource component: decides, before anything else loads, whether the
 * signed-in user's roles serve this resource's area.
 *
 * The Application record's `DefaultNavItems` lists every item the app can show, so that Explorer's
 * route guard can resolve a deep link to any of them. What a user sees in the nav bar is decided per
 * user by `CredentialingApplication.GetNavItems()`, but a typed or shared URL can still open any item.
 * So each resource asks {@link AreaNav.CanOpen}; when the answer is no it renders only the
 * not-available panel, loads no widget and issues no data request of its own. (The standing load
 * itself issues none for a user holding neither internal role.) Data stays protected by the server
 * either way; this is so the screen says what is true.
 */
import { ChangeDetectorRef, Directive, OnInit, inject } from '@angular/core';
import { BaseResourceComponent } from '@memberjunction/ng-shared';
import { AreaNav, type Standing } from '../application/area-nav';
import { StandingService } from '../shared/standing.service';

/** What a guarded resource is showing. */
export type AreaResourceState = 'Loading' | 'NotAvailable' | 'Error' | 'Open';

/** The sentence a resource shows to a user whose roles do not serve its area. */
export const AREA_NOT_AVAILABLE_MESSAGE = 'This area is not available to your account.';

@Directive()
export abstract class CredentialingAreaResource extends BaseResourceComponent implements OnInit {
    protected readonly cdr = inject(ChangeDetectorRef);

    public State: AreaResourceState = 'Loading';
    public ErrorMessage = '';
    public readonly NotAvailableMessage = AREA_NOT_AVAILABLE_MESSAGE;

    /** The registration name of the subclass, as `AreaNav` knows it. */
    protected abstract get DriverClass(): string;

    /** Runs once the user may open this resource; the place for the subclass's own loading. */
    protected async OnOpen(_standing: Standing): Promise<void> {
        // Nothing beyond the guard by default.
    }

    override ngOnInit(): void {
        super.ngOnInit();
        void this.guardAndOpen();
    }

    /** The standing service reading through this component's provider. */
    protected StandingLoader(): StandingService {
        return StandingService.ForProvider(this.ProviderToUse);
    }

    private async guardAndOpen(): Promise<void> {
        try {
            const standing = await this.StandingLoader().Load();
            if (!AreaNav.CanOpen(standing, this.DriverClass)) {
                this.State = 'NotAvailable';
                return;
            }
            await this.OnOpen(standing);
            this.State = 'Open';
        } catch (e) {
            this.ErrorMessage = e instanceof Error ? e.message : String(e);
            this.State = 'Error';
        } finally {
            this.cdr.markForCheck();
            this.NotifyLoadComplete();
        }
    }
}
