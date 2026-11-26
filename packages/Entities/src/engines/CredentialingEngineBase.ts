import {
    BaseEngine,
    BaseEnginePropertyConfig,
    IMetadataProvider,
    ProviderType,
    RegisterForStartup,
    UserInfo,
} from '@memberjunction/core';
import { UUIDsEqual } from '@memberjunction/global';
import {
    mjBizAppsCredentialingAccreditingOrganizationEntity,
    mjBizAppsCredentialingProgramEntity,
    mjBizAppsCredentialingProgramVersionEntity,
} from '../generated/entities/__mj_BizAppsCredentialing.js';

/** Entity names managed by {@link CredentialingEngineBase}. */
export const CREDENTIALING_ENGINE_ENTITIES = {
    AccreditingOrganization: 'MJ_BizApps_Credentialing: Accrediting Organizations',
    Program: 'MJ_BizApps_Credentialing: Programs',
    ProgramVersion: 'MJ_BizApps_Credentialing: Program Versions',
} as const;

/** Backing property names for {@link BaseEngine.ObserveProperty} subscriptions. */
export const CREDENTIALING_ENGINE_PROPERTIES = {
    AccreditingOrganizations: '_accreditingOrganizations',
    Programs: '_programs',
    ProgramVersions: '_programVersions',
} as const;

/**
 * Shared metadata engine for BizApps Credentialing — caches only the bounded, org/program
 * reference catalog (`Accrediting Organizations`, `Programs`, `Program Versions`).
 *
 * Isolation & RLS invariants (`docs/isolation-read-paths.md`):
 * - **Never** caches unbounded applicant/transactional entities (`Subjects`, `Applications`,
 *   `Standard Responses`, `Evidence Documents`, `Extractions`, etc.) or large per-version authoring
 *   trees (`Sections`, `Standards`, `Document Requirements`, `Response Sources`).
 * - **`CacheLocal: false`** on every config because all three entities carry row-level security
 *   filters for `Credentialing Staff` — local IndexedDB/shared browser caches must never serve
 *   org-scoped rows across persona or provider switches.
 * - **Active `ProviderToUse` override** — tracks the most recent provider passed to `Config()`
 *   instead of pinning forever to the first provider, and detects provider or user/persona changes
 *   to clear cached arrays and force a fresh RLS-filtered load.
 * - **Per-entity `CanRead` gating** — checks `EntityInfo.GetUserPermisions(user).CanRead` for each
 *   entity independently so:
 *   - `Credentialing Staff` loads all three (filtered to their organization memberships).
 *   - `Credentialing Admin` loads `Accrediting Organizations` without failing on `Programs` / `Program Versions`.
 *   - `Credentialing Applicant`, `Reviewer`, and `Committee` issue zero `RunView` calls and never throw on startup.
 */
@RegisterForStartup({
    deferred: true,
    severity: 'warn',
    description: 'BizApps Credentialing reference metadata (accrediting organizations, programs, program versions)',
})
export class CredentialingEngineBase extends BaseEngine<CredentialingEngineBase> {
    private _accreditingOrganizations: mjBizAppsCredentialingAccreditingOrganizationEntity[] = [];
    private _programs: mjBizAppsCredentialingProgramEntity[] = [];
    private _programVersions: mjBizAppsCredentialingProgramVersionEntity[] = [];

    private _activeProvider: IMetadataProvider | null = null;
    private _loadedForProvider: IMetadataProvider | null = null;
    private _loadedForUserId: string | null = null;
    private _invalidated = false;

    protected constructor() {
        super();
    }

    /** Singleton instance backed by MJ's global object store (`BaseSingleton`). */
    public static get Instance(): CredentialingEngineBase {
        return super.getInstance<CredentialingEngineBase>();
    }

    /**
     * Returns the most recently supplied provider when explicitly passed to {@link Config},
     * falling back to `BaseEngine.ProviderToUse` (`Metadata.Provider`). This ensures persona
     * switches, multi-provider hosts, and test mocks always execute against the active provider.
     */
    public override get ProviderToUse(): IMetadataProvider {
        return this._activeProvider ?? super.ProviderToUse;
    }

    /** Accrediting organizations readable by the current principal, ordered by `Name ASC`. */
    public get AccreditingOrganizations(): readonly mjBizAppsCredentialingAccreditingOrganizationEntity[] {
        return this._accreditingOrganizations;
    }

    /** Programs readable by the current principal, ordered by `Name ASC`. */
    public get Programs(): readonly mjBizAppsCredentialingProgramEntity[] {
        return this._programs;
    }

    /** Program versions readable by the current principal, ordered newest-first (`__mj_CreatedAt DESC`). */
    public get ProgramVersions(): readonly mjBizAppsCredentialingProgramVersionEntity[] {
        return this._programVersions;
    }

    /**
     * Loads the readable subset of bounded credentialing reference entities in a single batched
     * `RunViews` call. Safe to call at every entry point (`Config(false, user, provider)`).
     *
     * Automatically clears cached rows and refreshes when `forceRefresh` is true, when the caller
     * passes a different `provider`, when the effective user changes, or after {@link ClearCache}.
     */
    public async Config(
        forceRefresh: boolean = false,
        contextUser?: UserInfo,
        provider?: IMetadataProvider,
    ): Promise<void> {
        if (provider != null) {
            this._activeProvider = provider;
        }
        const effectiveProvider = this.ProviderToUse;
        const effectiveUser = contextUser ?? effectiveProvider?.CurrentUser;
        const userIdKey = CredentialingEngineBase.normalizeUserId(effectiveUser);

        const providerChanged =
            this._loadedForProvider != null &&
            effectiveProvider != null &&
            effectiveProvider !== this._loadedForProvider;
        const userChanged =
            this._loadedForProvider != null &&
            userIdKey !== this._loadedForUserId;
        const shouldRefresh = Boolean(forceRefresh) || this._invalidated || providerChanged || userChanged;

        if (this.Loaded && !shouldRefresh) {
            return;
        }

        // Clear any rows from a previous provider/persona before reloading so an unauthorized
        // role or another organization can never observe stale rows from a prior session.
        if (providerChanged || userChanged || this._invalidated) {
            this.resetArrays();
        }

        const allConfigs = CredentialingEngineBase.buildPropertyConfigs();
        const readableConfigs = this.filterReadableConfigs(allConfigs, effectiveProvider, effectiveUser);

        this._loadedForProvider = effectiveProvider ?? null;
        this._loadedForUserId = userIdKey;
        this._invalidated = false;

        // Server-side Database providers require contextUser in BaseEngine.Load(); if an
        // unauthorized or unauthenticated call has zero readable configs on a Database provider
        // without contextUser, leave arrays empty without throwing.
        if (
            readableConfigs.length === 0 &&
            effectiveProvider?.ProviderType === ProviderType.Database &&
            contextUser == null
        ) {
            return;
        }

        await this.Load(readableConfigs, effectiveProvider, shouldRefresh, contextUser);
    }

    /**
     * Clears cached reference metadata and resets provider/user tracking (sign-out, persona switch,
     * or unit test teardown). The next {@link Config} call will perform a fresh load.
     */
    public ClearCache(): void {
        this.resetArrays();
        this._activeProvider = null;
        this._loadedForProvider = null;
        this._loadedForUserId = null;
        this._invalidated = true;
    }

    /** Finds a cached accrediting organization by ID (case-insensitive UUID match). */
    public GetAccreditingOrganizationByID(
        id: string | null | undefined,
    ): mjBizAppsCredentialingAccreditingOrganizationEntity | undefined {
        if (!id) return undefined;
        return this._accreditingOrganizations.find((org) => UUIDsEqual(org.ID, id));
    }

    /** Finds a cached program by ID (case-insensitive UUID match). */
    public GetProgramByID(id: string | null | undefined): mjBizAppsCredentialingProgramEntity | undefined {
        if (!id) return undefined;
        return this._programs.find((program) => UUIDsEqual(program.ID, id));
    }

    /** Returns all cached programs belonging to `accreditingOrganizationID`. */
    public GetProgramsByOrganizationID(
        accreditingOrganizationID: string | null | undefined,
    ): mjBizAppsCredentialingProgramEntity[] {
        if (!accreditingOrganizationID) return [];
        return this._programs.filter((program) =>
            UUIDsEqual(program.AccreditingOrganizationID, accreditingOrganizationID),
        );
    }

    /** Finds a cached program version by ID (case-insensitive UUID match). */
    public GetProgramVersionByID(
        id: string | null | undefined,
    ): mjBizAppsCredentialingProgramVersionEntity | undefined {
        if (!id) return undefined;
        return this._programVersions.find((version) => UUIDsEqual(version.ID, id));
    }

    /** Returns all cached versions belonging to `programID` (newest-first). */
    public GetVersionsByProgramID(
        programID: string | null | undefined,
    ): mjBizAppsCredentialingProgramVersionEntity[] {
        if (!programID) return [];
        return this._programVersions.filter((version) => UUIDsEqual(version.ProgramID, programID));
    }

    /** Returns all cached program versions with `Status === 'Active'`. */
    public GetActiveProgramVersions(): mjBizAppsCredentialingProgramVersionEntity[] {
        return this._programVersions.filter((version) => version.Status === 'Active');
    }

    /** Returns the Draft version of `programID`, if one exists in the cache. */
    public GetDraftVersionForProgram(
        programID: string | null | undefined,
    ): mjBizAppsCredentialingProgramVersionEntity | undefined {
        if (!programID) return undefined;
        return this._programVersions.find(
            (version) => UUIDsEqual(version.ProgramID, programID) && version.Status === 'Draft',
        );
    }

    /**
     * Property configurations for the bounded credentialing catalog.
     * Every entry sets `CacheLocal: false` because all three entities are RLS-scoped.
     */
    public static buildPropertyConfigs(): Partial<BaseEnginePropertyConfig>[] {
        return [
            {
                Type: 'entity',
                EntityName: CREDENTIALING_ENGINE_ENTITIES.AccreditingOrganization,
                PropertyName: CREDENTIALING_ENGINE_PROPERTIES.AccreditingOrganizations,
                OrderBy: 'Name ASC',
                AddToObject: true,
                AutoRefresh: true,
                CacheLocal: false,
            },
            {
                Type: 'entity',
                EntityName: CREDENTIALING_ENGINE_ENTITIES.Program,
                PropertyName: CREDENTIALING_ENGINE_PROPERTIES.Programs,
                OrderBy: 'Name ASC',
                AddToObject: true,
                AutoRefresh: true,
                CacheLocal: false,
            },
            {
                Type: 'entity',
                EntityName: CREDENTIALING_ENGINE_ENTITIES.ProgramVersion,
                PropertyName: CREDENTIALING_ENGINE_PROPERTIES.ProgramVersions,
                OrderBy: '__mj_CreatedAt DESC',
                AddToObject: true,
                AutoRefresh: true,
                CacheLocal: false,
            },
        ];
    }

    /**
     * Filters engine configs per-entity against installed metadata and `CanRead` permission.
     * Any skipped config has its backing array cleared to `[]` so prior-session rows cannot linger.
     */
    private filterReadableConfigs(
        configs: Partial<BaseEnginePropertyConfig>[],
        provider: IMetadataProvider | undefined,
        user: UserInfo | undefined,
    ): Partial<BaseEnginePropertyConfig>[] {
        const hasLoadedMetadata = Array.isArray(provider?.Entities) && provider.Entities.length > 0;
        const readable: Partial<BaseEnginePropertyConfig>[] = [];

        for (const config of configs) {
            const entityName = config.EntityName;
            if (!entityName) {
                continue;
            }

            const entityInfo = provider?.EntityByName(entityName);
            if (hasLoadedMetadata && entityInfo == null) {
                this.clearProperty(config.PropertyName);
                continue;
            }

            if (user != null && entityInfo != null) {
                const perms = entityInfo.GetUserPermisions(user);
                if (!perms?.CanRead) {
                    this.clearProperty(config.PropertyName);
                    continue;
                }
            }

            readable.push(config);
        }

        return readable;
    }

    private clearProperty(propertyName: string | undefined): void {
        switch (propertyName) {
            case CREDENTIALING_ENGINE_PROPERTIES.AccreditingOrganizations:
                this._accreditingOrganizations = [];
                break;
            case CREDENTIALING_ENGINE_PROPERTIES.Programs:
                this._programs = [];
                break;
            case CREDENTIALING_ENGINE_PROPERTIES.ProgramVersions:
                this._programVersions = [];
                break;
            default:
                break;
        }
    }

    private resetArrays(): void {
        this._accreditingOrganizations = [];
        this._programs = [];
        this._programVersions = [];
    }

    private static normalizeUserId(user: UserInfo | undefined): string | null {
        const id = user?.ID?.trim().toLowerCase();
        return id && id.length > 0 ? id : null;
    }
}

/** Tree-shaking anchor so bundlers retain `@RegisterForStartup` registration. */
export function LoadCredentialingEngineBase(): void {
    void CredentialingEngineBase;
}
