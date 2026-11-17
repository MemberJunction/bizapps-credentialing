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
 *   src/lib/application/ — CredentialingApplication (nav by area) and the pure AreaNav decision
 *   src/lib/resources/   — thin Explorer resource components, one per nav item
 *   src/lib/staff/       — Staff-area widgets (organization setup, Program Studio)
 *   src/lib/shared/      — StandingService: the signed-in user's roles and organizations
 */

// Entity package side-effect import: fires @RegisterClass for entity subclasses once they exist.
import '@mj-biz-apps/credentialing-entities';
import './lib/generated/generated-forms.module';

export * from './lib/generated/generated-forms.module';

import { LoadCredentialingApplication } from './lib/application/credentialing.application';
import { LoadCredentialingProgramStudioResource } from './lib/resources/staff-program-studio.resource';
import { LoadCredentialingOrganizationSetupResource } from './lib/resources/staff-organization-setup.resource';
import { LoadCredentialingReviewHomeResource } from './lib/resources/review-home.resource';
import { LoadCredentialingApplicantHomeResource } from './lib/resources/applicant-home.resource';

export * from './lib/application/area-nav';
export { CredentialingApplication, LoadCredentialingApplication } from './lib/application/credentialing.application';
export { StandingService, type StandingDataSource, type StandingUser } from './lib/shared/standing.service';
export { OrganizationSetupComponent, type OrganizationSetupErrorField } from './lib/staff/organization-setup/organization-setup.component';
export { StudioViewModel, type StudioVersionView, type SettingsTierEditable } from './lib/staff/program-studio/studio-view-model';
export { StudioData, COMMITTEE_ENTITY, type StudioDataSource, type ProgramBundle, type ProgramLoad, type ProgramListRow, type ProgramRow, type SectionRow, type StandardRow, type RequirementRow, type CommitteeRow } from './lib/staff/program-studio/studio-data';
export { StudioTree, type TreeSection, type SequenceChange, type StandardErrorField } from './lib/staff/program-studio/studio-tree';
export { ProgramStudioPage, PROGRAM_NOT_FOUND_MESSAGE, type StudioSelection, type StudioMode, type ProgramLoadState, type StudioTab } from './lib/staff/program-studio/program-studio.page';
export { ProgramListComponent } from './lib/staff/program-studio/program-list.component';
export { ProgramWizardComponent, type WizardOrganization, type WizardErrorField } from './lib/staff/program-studio/program-wizard.component';
export { VersionTreeComponent, type TreeErrorTarget } from './lib/staff/program-studio/version-tree.component';
export { StandardEditorComponent, EVALUATION_MODE_NOTE, type NewStandardTarget } from './lib/staff/program-studio/standard-editor.component';
export { VersionSettingsComponent, FROZEN_SETTINGS_SENTENCE, ROLLOUT_FLAGS_SENTENCE, type SettingDescriptor, type SettingsGroup, type SettingsTier } from './lib/staff/program-studio/version-settings.component';
export { DocumentRequirementsComponent } from './lib/staff/program-studio/document-requirements.component';
export { CredentialingAreaResource, AREA_NOT_AVAILABLE_MESSAGE, type AreaResourceState } from './lib/resources/credentialing-area-resource';
export { CredentialingProgramStudioResource, LoadCredentialingProgramStudioResource, PROGRAM_STUDIO_PARAMS } from './lib/resources/staff-program-studio.resource';
export { CredentialingOrganizationSetupResource, LoadCredentialingOrganizationSetupResource } from './lib/resources/staff-organization-setup.resource';
export { CredentialingReviewHomeResource, LoadCredentialingReviewHomeResource } from './lib/resources/review-home.resource';
export { CredentialingApplicantHomeResource, LoadCredentialingApplicantHomeResource } from './lib/resources/applicant-home.resource';

/**
 * Bootstrap function named by mj-app.json packages.client[0].startupExport.
 * Calls each component module's anchor so its @RegisterClass decorators run and no
 * bundler can conclude the modules are unused.
 */
export function LoadBizAppsCredentialingClient(): void {
    LoadCredentialingApplication();
    LoadCredentialingProgramStudioResource();
    LoadCredentialingOrganizationSetupResource();
    LoadCredentialingReviewHomeResource();
    LoadCredentialingApplicantHomeResource();
}
