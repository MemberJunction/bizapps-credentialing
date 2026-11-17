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
import { LoadCredentialingPipelineResource } from './lib/resources/staff-pipeline.resource';
import { LoadCredentialingOrganizationSetupResource } from './lib/resources/staff-organization-setup.resource';
import { LoadCredentialingReviewHomeResource } from './lib/resources/review-home.resource';
import { LoadCredentialingApplicantHomeResource } from './lib/resources/applicant-home.resource';
import { LoadCredentialingApplicantStandardsResource } from './lib/resources/applicant-standards.resource';
import { LoadCredentialingApplicantDocumentsResource } from './lib/resources/applicant-documents.resource';

export * from './lib/application/area-nav';
export { CredentialingApplication, LoadCredentialingApplication } from './lib/application/credentialing.application';
export { StandingService, type StandingDataSource, type StandingUser } from './lib/shared/standing.service';
export { OrganizationSetupComponent, type OrganizationSetupErrorField } from './lib/staff/organization-setup/organization-setup.component';
export { StudioViewModel, type StudioVersionView, type SettingsTierEditable } from './lib/staff/program-studio/studio-view-model';
export { StudioData, COMMITTEE_ENTITY, type StudioDataSource, type ProgramBundle, type ProgramLoad, type ProgramListRow, type ProgramRow, type SectionRow, type StandardRow, type RequirementRow, type CommitteeRow } from './lib/staff/program-studio/studio-data';
export { StudioMessages, SAVE_FAILED_MESSAGE, LOAD_FAILED_MESSAGE, type StudioMessageKind } from './lib/staff/studio-messages';
export { StudioTree, type TreeSection, type SequenceChange, type StandardErrorField, type SectionErrorField, type RequirementErrorField } from './lib/staff/program-studio/studio-tree';
export { VersionStatusChange, type StatusWritable } from './lib/staff/program-studio/version-status-change';
export { ProgramStudioPage, PROGRAM_NOT_FOUND_MESSAGE, type StudioSelection, type StudioMode, type ProgramLoadState, type StudioTab } from './lib/staff/program-studio/program-studio.page';
export { ProgramListComponent } from './lib/staff/program-studio/program-list.component';
export { ProgramWizardComponent, type WizardOrganization, type WizardErrorField } from './lib/staff/program-studio/program-wizard.component';
export { VersionTreeComponent, type TreeErrorTarget } from './lib/staff/program-studio/version-tree.component';
export { StandardEditorComponent, EVALUATION_MODE_NOTE, type NewStandardTarget } from './lib/staff/program-studio/standard-editor.component';
export { VersionSettingsComponent, FROZEN_SETTINGS_SENTENCE, ROLLOUT_FLAGS_SENTENCE, FIXED_ON_ACTIVATION_SENTENCE, RETIRED_SETTINGS_SENTENCE, type SettingDescriptor, type SettingsGroup, type SettingsTier } from './lib/staff/program-studio/version-settings.component';
export { DocumentRequirementsComponent } from './lib/staff/program-studio/document-requirements.component';
export { PipelinePage } from './lib/staff/pipeline/pipeline.page';
export { InviteWizardComponent } from './lib/staff/pipeline/invite-wizard.component';
export { PipelineData, FilterPipelineApplications, PageSlice, PIPELINE_PAGE_SIZE, type PipelineDataSource, type PagedSlice, type PipelineApplicationRow, type PipelineContactRow, type PipelineActiveTarget, type PipelineSubjectOption, type PipelineFilter, type PipelineSnapshot } from './lib/staff/pipeline/pipeline-data';
export { InviteWizardModel, FormatInvitationOutcome, EligibleSubjectsForTarget, type InviteWizardStep, type InviteSubjectMode, type FormattedInvitationOutcome } from './lib/staff/pipeline/invite-wizard-model';
export { CredentialingAreaResource, AREA_NOT_AVAILABLE_MESSAGE, type AreaResourceState } from './lib/resources/credentialing-area-resource';
export { CredentialingProgramStudioResource, LoadCredentialingProgramStudioResource, PROGRAM_STUDIO_PARAMS } from './lib/resources/staff-program-studio.resource';
export { CredentialingPipelineResource, LoadCredentialingPipelineResource } from './lib/resources/staff-pipeline.resource';
export { CredentialingOrganizationSetupResource, LoadCredentialingOrganizationSetupResource } from './lib/resources/staff-organization-setup.resource';
export { CredentialingReviewHomeResource, LoadCredentialingReviewHomeResource } from './lib/resources/review-home.resource';
export { CredentialingApplicantHomeResource, LoadCredentialingApplicantHomeResource } from './lib/resources/applicant-home.resource';
export { CredentialingApplicantStandardsResource, LoadCredentialingApplicantStandardsResource } from './lib/resources/applicant-standards.resource';
export { CredentialingApplicantDocumentsResource, LoadCredentialingApplicantDocumentsResource } from './lib/resources/applicant-documents.resource';
export { ApplicantSubjectResource } from './lib/resources/applicant-subject-resource';
export { SubjectContext, SUBJECT_ID_PARAM, SUBJECT_NOT_AVAILABLE_MESSAGE, type SubjectIdentity } from './lib/shared/subject-context.service';
export { ApplicantMessages, APPLICANT_LOAD_FAILED_MESSAGE, APPLICANT_SAVE_FAILED_MESSAGE, type ApplicantMessageKind } from './lib/applicant/shared/applicant-messages';
export { MyApplicationsPage, type OpenApplicationIntent } from './lib/applicant/my-applications/my-applications.page';
export {
    ResolveApplicantView,
    FormatApplicationAction,
    FormatApplicationProgress,
    NO_SUBJECT_MESSAGE,
    NO_APPLICATIONS_MESSAGE,
    PICKER_HEADING,
    APPLICANT_NOT_AVAILABLE_MESSAGE,
    type ApplicantViewResolution,
} from './lib/applicant/my-applications/my-applications-model';
export {
    StandardsRunnerPage,
    type RunnerNavigationState,
} from './lib/applicant/standards-runner/standards-runner.page';
export { SectionRailComponent } from './lib/applicant/standards-runner/section-rail.component';
export { StandardCardComponent } from './lib/applicant/standards-runner/standard-card.component';
export {
    ParseRunnerFilter,
    MatchesRunnerFilter,
    IntakeSentence,
    ResponseStateLabel,
    SectionCounts,
    ApplicationCounts,
    ResolveCardActions,
    ResolveRunnerSelection,
    ApplyResponseUpdate,
    RUNNER_FILTER_OPTIONS,
    CANNOT_PREFILL_BANNER,
    CONFIRMED_LOCKED_SENTENCE,
    SAVE_DRAFT_BEFORE_CONFIRMING_REASON,
    NO_CHANGES_TO_SAVE_REASON,
    type RunnerFilter,
    type RunnerFilterOption,
    type SectionProgressSummary,
    type CardActions,
    type RunnerSelection,
} from './lib/applicant/standards-runner/runner-model';
export { DocumentLibraryPage } from './lib/applicant/documents/document-library.page';
export { RequirementLedgerComponent } from './lib/applicant/documents/requirement-ledger.component';
export { UploadDropzoneComponent } from './lib/applicant/documents/upload-dropzone.component';
export { DocumentViewerComponent, type ViewerCitation, type ViewerTab } from './lib/applicant/documents/document-viewer.component';
export { VersionHistoryComponent } from './lib/applicant/documents/version-history.component';
export { EvidenceClient, type EvidenceProviderConfig, type FetchLike, type UploadResult } from './lib/applicant/documents/evidence-client';
export {
    UPLOAD_DOES_NOT_SUBMIT_SENTENCE,
    FormatLibraryDate,
    FormatHashShort,
    DefaultAttestationStatement,
    FormatAttestedNotice,
    DocumentRowStatusLabel,
    FormatWhatWasRead,
    ResolveLedgerRowActions,
    type LedgerRowActions,
} from './lib/applicant/documents/library-model';
export {
    UNSUPPORTED_PREVIEW_MESSAGE,
    CITATION_NOT_FOUND_NOTE,
    RECOGNIZED_SCAN_NOTE,
    DocumentPreviewKind,
    SplitForHighlight,
    type PreviewKind,
    type HighlightSplit,
} from './lib/applicant/documents/document-viewer-model';

/**
 * Bootstrap function named by mj-app.json packages.client[0].startupExport.
 * Calls each component module's anchor so its @RegisterClass decorators run and no
 * bundler can conclude the modules are unused.
 */
export function LoadBizAppsCredentialingClient(): void {
    LoadCredentialingApplication();
    LoadCredentialingProgramStudioResource();
    LoadCredentialingPipelineResource();
    LoadCredentialingOrganizationSetupResource();
    LoadCredentialingReviewHomeResource();
    LoadCredentialingApplicantHomeResource();
    LoadCredentialingApplicantStandardsResource();
    LoadCredentialingApplicantDocumentsResource();
}
