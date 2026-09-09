/**
 * @mj-biz-apps/credentialing-ng — the CLIENT BOOTSTRAP package for BizApps Credentialing.
 *
 * Named in mj-app.json under packages.client with role "bootstrap". When the app is
 * installed (or dev-linked), MJExplorer's generated open-app-bootstrap.generated.ts gains
 * `import '@mj-biz-apps/credentialing-ng';` — bundling this module fires every
 * @RegisterClass decorator that makes the app's components discoverable.
 *
 * WHAT LIVES HERE
 *   src/lib/generated/ — CodeGen Angular output (entity forms; never hand-edited).
 *                        After the first codegen run, import './lib/generated/generated-forms.module'
 *                        here and re-export GeneratedFormsModule, as every shipped BizApp does.
 *   src/lib/overview/  — the Credentialing landing resource (this scaffold's one page)
 *   src/lib/           — future components: credential list, detail/edit panels, holder
 *                        dashboard, "My Credentials" — standalone, @if/@for, events not routing
 */

// Entity package side-effect import: fires @RegisterClass for entity subclasses once they exist.
import '@mj-biz-apps/credentialing-entities';

import { LoadCredentialingOverviewResource } from './lib/overview/credentialing-overview.resource';

export {
    CredentialingOverviewResource,
    LoadCredentialingOverviewResource,
} from './lib/overview/credentialing-overview.resource';

/**
 * Bootstrap function named by mj-app.json packages.client[0].startupExport.
 * Calls each component module's anchor so its @RegisterClass decorators run and no
 * bundler can conclude the modules are unused.
 */
export function LoadBizAppsCredentialingClient(): void {
    LoadCredentialingOverviewResource();
}
