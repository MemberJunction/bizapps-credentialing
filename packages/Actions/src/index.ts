/**
 * @mj-biz-apps/credentialing-actions — MJ Actions exposed by BizApps Credentialing.
 *
 * Actions are metadata-driven integration points for agents, workflows, and the
 * TaskType / CredentialType action hooks — never a code-to-code call mechanism.
 *
 * WHAT WILL LIVE HERE
 *   src/generated/ — CodeGen ActionSubclasses output (never hand-edited)
 *   src/           — hand-written BaseAction subclasses registered as
 *                    @RegisterClass(BaseAction, 'MJ_BizApps_Credentialing: <Action Name>')
 *                    with matching MJ: Actions metadata rows, e.g. lifecycle transition hooks from
 *                    plans/active/credentialing-frd.md (FR-19.3)
 *
 * The Load function is imported by the server bootstrap so bundlers cannot tree-shake
 * the @RegisterClass side effects away.
 */
export function LoadBizAppsCredentialingActions(): void {
    // No-op until actions exist: importing this module registers the action classes above.
}
