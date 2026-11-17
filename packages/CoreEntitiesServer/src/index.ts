/**
 * @mj-biz-apps/credentialing-core-entities-server — SERVER-ONLY entity subclasses.
 *
 * Each entity subclass enforces the credentialing rules (packages/Core/src/rules) on the server, where they
 * cannot be bypassed: ownership fields that never change, the version lifecycle, one Draft per
 * program, unique labels, codes and requirement names, and tree edits only on a Draft. Writes under a
 * program version run under transaction-owned authoring locks (guards/AuthoringLock.ts) so a rule
 * checked in validation still holds when the row is written. The nine applicant-data entities are
 * written only inside the application's own operations (guards/OperationWrite.ts); every other save
 * or delete of them is refused. Services that need packages beyond this one's dependencies are
 * reached through the registry `services/CredentialingServices.ts`, filled by the Server package.
 *
 * Client code must never import this package; it is a dependency of the Server package only. The
 * sibling entity package is an exact-pinned dependency (all app packages version together); every
 * @memberjunction/* package is a caret PEER.
 */
import { AccreditingOrganizationEntityServer } from './AccreditingOrganizationEntityServer.js';
import { DocumentRequirementEntityServer } from './DocumentRequirementEntityServer.js';
import { OrganizationMembershipEntityServer } from './OrganizationMembershipEntityServer.js';
import { ProgramEntityServer } from './ProgramEntityServer.js';
import { ProgramVersionEntityServer } from './ProgramVersionEntityServer.js';
import { SectionEntityServer } from './SectionEntityServer.js';
import { StandardEntityServer } from './StandardEntityServer.js';
import { SubjectEntityServer } from './SubjectEntityServer.js';
import { SubjectContactEntityServer } from './SubjectContactEntityServer.js';
import { ApplicationEntityServer } from './ApplicationEntityServer.js';
import { StandardResponseEntityServer } from './StandardResponseEntityServer.js';
import { ResponseCitationEntityServer } from './ResponseCitationEntityServer.js';
import { EvidenceDocumentEntityServer } from './EvidenceDocumentEntityServer.js';
import { DocumentAttestationEntityServer } from './DocumentAttestationEntityServer.js';
import { ApplicationDocumentEntityServer } from './ApplicationDocumentEntityServer.js';
import { ExtractionEntityServer } from './ExtractionEntityServer.js';
import { ResponseSourceEntityServer } from './ResponseSourceEntityServer.js';
import { CloneVersionToDraftServerOperation } from './operations/CloneVersionToDraftServerOperation.js';
import { CreateCommitteeServerOperation } from './operations/CreateCommitteeServerOperation.js';
import { CreateOrganizationServerOperation } from './operations/CreateOrganizationServerOperation.js';
import { CreateProgramServerOperation } from './operations/CreateProgramServerOperation.js';
import { InviteApplicantServerOperation } from './operations/InviteApplicantServerOperation.js';
import { ReissueInvitationServerOperation } from './operations/ReissueInvitationServerOperation.js';
import { ReorderVersionTreeServerOperation } from './operations/ReorderVersionTreeServerOperation.js';
import { GetMySubjectsServerOperation } from './operations/GetMySubjectsServerOperation.js';
import { GetApplicationWorkspaceServerOperation } from './operations/GetApplicationWorkspaceServerOperation.js';

export {
    AccreditingOrganizationEntityServer,
    ORGANIZATION_HAS_MEMBERS_REASON,
    ORGANIZATION_HAS_PROGRAMS_REASON,
} from './AccreditingOrganizationEntityServer.js';
export { DocumentRequirementEntityServer } from './DocumentRequirementEntityServer.js';
export { OrganizationMembershipEntityServer } from './OrganizationMembershipEntityServer.js';
export { ProgramEntityServer } from './ProgramEntityServer.js';
export { ProgramVersionEntityServer } from './ProgramVersionEntityServer.js';
export { SectionEntityServer } from './SectionEntityServer.js';
export { StandardEntityServer } from './StandardEntityServer.js';
export { SubjectEntityServer } from './SubjectEntityServer.js';
export { SubjectContactEntityServer } from './SubjectContactEntityServer.js';
export { ApplicationEntityServer } from './ApplicationEntityServer.js';
export { StandardResponseEntityServer } from './StandardResponseEntityServer.js';
export { ResponseCitationEntityServer } from './ResponseCitationEntityServer.js';
export { EvidenceDocumentEntityServer } from './EvidenceDocumentEntityServer.js';
export { DocumentAttestationEntityServer } from './DocumentAttestationEntityServer.js';
export { ApplicationDocumentEntityServer } from './ApplicationDocumentEntityServer.js';
export { ExtractionEntityServer } from './ExtractionEntityServer.js';
export { ResponseSourceEntityServer } from './ResponseSourceEntityServer.js';
export {
    AuthoringLock,
    APPLICATION_LOCK_BUSY_REASON,
    AUTHORING_LOCK_BUSY_REASON,
    LOCK_TIMEOUT_MS,
    USER_EMAIL_LOCK_BUSY_REASON,
} from './guards/AuthoringLock.js';
export { OperationWrite, OPERATION_ONLY_REASON, type OperationWriteScope } from './guards/OperationWrite.js';
export { ApplicantRow, APPLICANT_ROW_NOT_SAVED_REASON } from './guards/ApplicantRow.js';
export { SubjectAccess, type ApplicationAccess, type DocumentAccess, type ResponseAccess } from './guards/SubjectAccess.js';
export {
    CredentialingServices,
    ServiceNotRegisteredReason,
    type EvidenceReader,
    type EvidenceStore,
    type ExtractableKind,
    type ExtractedText,
    type InvitationIssuer,
    type IsolatedProviderFactory,
    type ReadingRequest,
    type ReadingResult,
    type RecognitionResult,
    type RegisteredServices,
    type StaffNotifier,
    type TextExtractor,
    type TextRecognizer,
} from './services/CredentialingServices.js';
export { SystemUser } from './guards/SystemUser.js';
export { LockedWrite, type WriteKind } from './guards/LockedWrite.js';
export {
    ParentVersionLoader,
    type LoadedAccreditingOrganization,
    type LoadedProgram,
    type LoadedSection,
    type LoadedVersion,
} from './guards/ParentVersionLoader.js';
export { VersionTree } from './guards/VersionTree.js';
export { BLANK_LABEL_REASON } from './ProgramVersionEntityServer.js';
export { OperationSupport } from './operations/OperationSupport.js';
export { CreateProgramServerOperation } from './operations/CreateProgramServerOperation.js';
export { CreateCommitteeServerOperation } from './operations/CreateCommitteeServerOperation.js';
export { CloneVersionToDraftServerOperation, CLONE_SOURCE_STATUS_REASON } from './operations/CloneVersionToDraftServerOperation.js';
export { ReorderVersionTreeServerOperation } from './operations/ReorderVersionTreeServerOperation.js';
export {
    CreateOrganizationServerOperation,
    NoUserWithEmailReason,
    ORGANIZATION_NAME_REQUIRED_REASON,
    STAFF_EMAIL_REQUIRED_REASON,
} from './operations/CreateOrganizationServerOperation.js';
export { InviteApplicantServerOperation } from './operations/InviteApplicantServerOperation.js';
export { ReissueInvitationServerOperation } from './operations/ReissueInvitationServerOperation.js';
export { INTERNAL_ACCOUNT_REASON, INVITATION_LINK_FAILED_NOTE } from './operations/InvitationSupport.js';
export { GetMySubjectsServerOperation } from './operations/GetMySubjectsServerOperation.js';
export { GetApplicationWorkspaceServerOperation } from './operations/GetApplicationWorkspaceServerOperation.js';

/**
 * Bootstrap / anti-tree-shaking anchor, called by the server bootstrap. Referencing the classes keeps
 * their `@RegisterClass` registrations in every bundle, so the server entity subclasses win over the
 * generated ones and the server operations win over the shared operation contracts of
 * `@mj-biz-apps/credentialing-core` (each server operation imports and extends its contract, so it
 * always registers after it under the same key and takes the higher priority — docs/dev-instance.md).
 */
export function LoadBizAppsCredentialingEntitiesServer(): void {
    const anchor = [
        AccreditingOrganizationEntityServer,
        OrganizationMembershipEntityServer,
        ProgramEntityServer,
        ProgramVersionEntityServer,
        SectionEntityServer,
        StandardEntityServer,
        DocumentRequirementEntityServer,
        SubjectEntityServer,
        SubjectContactEntityServer,
        ApplicationEntityServer,
        StandardResponseEntityServer,
        ResponseCitationEntityServer,
        EvidenceDocumentEntityServer,
        DocumentAttestationEntityServer,
        ApplicationDocumentEntityServer,
        ExtractionEntityServer,
        ResponseSourceEntityServer,
    ];
    const operations = [
        CreateProgramServerOperation,
        CloneVersionToDraftServerOperation,
        ReorderVersionTreeServerOperation,
        CreateOrganizationServerOperation,
        CreateCommitteeServerOperation,
        InviteApplicantServerOperation,
        ReissueInvitationServerOperation,
        GetMySubjectsServerOperation,
        GetApplicationWorkspaceServerOperation,
    ];
    if (anchor.length !== 17 || operations.length !== 9) {
        throw new Error('credentialing server entity subclasses or operations missing');
    }
}
