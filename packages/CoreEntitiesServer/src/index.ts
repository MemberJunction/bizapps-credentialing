/**
 * @mj-biz-apps/credentialing-core-entities-server — SERVER-ONLY entity subclasses.
 *
 * Generated entities are overridden here for behavior that must run server-side and
 * authoritatively: Save() hooks that write the CredentialActivity audit log, status
 * transitions that fire CredentialType action hooks, cross-record invariants
 * (ValidateAsync, not DB triggers), and FK cleanup before delete — mirroring
 * bizapps-tasks' TaskEntityServer and bizapps-issues' IssueEntityServer.
 *
 * Client code must never import this package; it is a dependency of the Server
 * package only. The sibling entity package is an exact-pinned dependency (all app
 * packages version together); every @memberjunction/* package is a caret PEER.
 */
export function LoadBizAppsCredentialingEntitiesServer(): void {
    // No-op until subclasses exist: importing this module registers them.
}
