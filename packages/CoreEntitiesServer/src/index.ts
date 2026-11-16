/**
 * @mj-biz-apps/credentialing-core-entities-server — SERVER-ONLY entity subclasses.
 *
 * Each entity subclass enforces the credentialing rules (packages/Core/src/rules) on the server, where they
 * cannot be bypassed: ownership fields that never change, the version lifecycle, one Draft per
 * program, unique labels, codes and requirement names, and tree edits only on a Draft. Writes under a
 * program version run under transaction-owned authoring locks (guards/AuthoringLock.ts) so a rule
 * checked in validation still holds when the row is written.
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
import { CloneVersionToDraftServerOperation } from './operations/CloneVersionToDraftServerOperation.js';
import { CreateOrganizationServerOperation } from './operations/CreateOrganizationServerOperation.js';
import { CreateProgramServerOperation } from './operations/CreateProgramServerOperation.js';
import { ReorderVersionTreeServerOperation } from './operations/ReorderVersionTreeServerOperation.js';

export { AccreditingOrganizationEntityServer } from './AccreditingOrganizationEntityServer.js';
export { DocumentRequirementEntityServer } from './DocumentRequirementEntityServer.js';
export { OrganizationMembershipEntityServer } from './OrganizationMembershipEntityServer.js';
export { ProgramEntityServer } from './ProgramEntityServer.js';
export { ProgramVersionEntityServer } from './ProgramVersionEntityServer.js';
export { SectionEntityServer } from './SectionEntityServer.js';
export { StandardEntityServer } from './StandardEntityServer.js';
export { AuthoringLock } from './guards/AuthoringLock.js';
export { LockedWrite, STALE_RECORD_REASON, type WriteKind } from './guards/LockedWrite.js';
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
export { CloneVersionToDraftServerOperation, CLONE_SOURCE_STATUS_REASON } from './operations/CloneVersionToDraftServerOperation.js';
export { ReorderVersionTreeServerOperation } from './operations/ReorderVersionTreeServerOperation.js';
export {
    CreateOrganizationServerOperation,
    NoUserWithEmailReason,
    ORGANIZATION_NAME_REQUIRED_REASON,
    STAFF_EMAIL_REQUIRED_REASON,
} from './operations/CreateOrganizationServerOperation.js';

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
    ];
    const operations = [
        CreateProgramServerOperation,
        CloneVersionToDraftServerOperation,
        ReorderVersionTreeServerOperation,
        CreateOrganizationServerOperation,
    ];
    if (anchor.length !== 7 || operations.length !== 4) {
        throw new Error('credentialing server entity subclasses or operations missing');
    }
}
