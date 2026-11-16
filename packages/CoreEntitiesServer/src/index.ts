/**
 * @mj-biz-apps/credentialing-core-entities-server — SERVER-ONLY entity subclasses.
 *
 * Each subclass enforces the credentialing rules (packages/Core/src/rules) on the server, where they
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

/**
 * Bootstrap / anti-tree-shaking anchor, called by the server bootstrap. Referencing the classes keeps
 * their `@RegisterClass` registrations in every bundle, so the server subclasses win over the
 * generated ones.
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
    if (anchor.length !== 7) {
        throw new Error('credentialing server entity subclasses missing');
    }
}
