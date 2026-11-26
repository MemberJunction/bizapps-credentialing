import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BaseEnginePropertyConfig, IMetadataProvider, UserInfo } from '@memberjunction/core';
import { ProviderType, StartupManager } from '@memberjunction/core';
import type {
    mjBizAppsCredentialingAccreditingOrganizationEntity,
    mjBizAppsCredentialingProgramEntity,
    mjBizAppsCredentialingProgramVersionEntity,
} from '../../generated/entities/__mj_BizAppsCredentialing.js';
import {
    CREDENTIALING_ENGINE_ENTITIES,
    CREDENTIALING_ENGINE_PROPERTIES,
    CredentialingEngineBase,
    LoadCredentialingEngineBase,
} from '../CredentialingEngineBase.js';

interface MockLoadCall {
    configs: Partial<BaseEnginePropertyConfig>[];
    provider: IMetadataProvider;
    forceRefresh: boolean;
    contextUser: UserInfo | undefined;
}

interface MockPermissionsMap {
    [entityName: string]: boolean;
}

function makeUser(id: string, email: string): UserInfo {
    return { ID: id, Email: email } as UserInfo;
}

function makeProvider(
    user: UserInfo | undefined,
    permissions: MockPermissionsMap,
    providerType: ProviderType = ProviderType.Network,
    installedEntities?: string[],
): IMetadataProvider {
    const entityNames = installedEntities ?? Object.keys(permissions);
    const entities = entityNames.map((name) => ({
        Name: name,
        GetUserPermisions: (_u: UserInfo) => ({ CanRead: Boolean(permissions[name]) }),
    }));
    const byName = new Map(entities.map((e) => [e.Name.toLowerCase(), e]));
    return {
        ProviderType: providerType,
        CurrentUser: user,
        Entities: entities,
        EntityByName: (name: string) => byName.get(name.toLowerCase()),
    } as unknown as IMetadataProvider;
}

const ORG_A_ID = 'A1111111-1111-1111-1111-111111111111';
const ORG_B_ID = 'A2222222-2222-2222-2222-222222222222';
const PROG_1_ID = 'B1111111-1111-1111-1111-111111111111';
const PROG_2_ID = 'B2222222-2222-2222-2222-222222222222';
const VER_1_ID = 'C1111111-1111-1111-1111-111111111111';
const VER_2_ID = 'C2222222-2222-2222-2222-222222222222';

describe('CredentialingEngineBase', () => {
    let loadCalls: MockLoadCall[];
    let loadPayloadByProperty: Record<string, unknown[]>;

    beforeEach(() => {
        LoadCredentialingEngineBase();
        const engine = CredentialingEngineBase.Instance;
        engine.ClearCache();
        loadCalls = [];
        loadPayloadByProperty = {
            [CREDENTIALING_ENGINE_PROPERTIES.AccreditingOrganizations]: [
                { ID: ORG_A_ID, OrganizationID: '10000000-0000-0000-0000-000000000001', Name: 'Accrediting Body A', Status: 'Active' },
            ],
            [CREDENTIALING_ENGINE_PROPERTIES.Programs]: [
                {
                    ID: PROG_1_ID,
                    AccreditingOrganizationID: ORG_A_ID,
                    Name: 'Field Technician',
                    ProgramType: 'Certification',
                    SubjectType: 'Person',
                    CredentialPrefix: 'FT',
                    AccreditingOrganization: 'Accrediting Body A',
                    Status: 'Active',
                },
                {
                    ID: PROG_2_ID,
                    AccreditingOrganizationID: ORG_B_ID,
                    Name: 'Lab Accreditation',
                    ProgramType: 'Accreditation',
                    SubjectType: 'Organization',
                    CredentialPrefix: 'LA',
                    AccreditingOrganization: 'Accrediting Body B',
                    Status: 'Draft',
                },
            ],
            [CREDENTIALING_ENGINE_PROPERTIES.ProgramVersions]: [
                { ID: VER_1_ID, ProgramID: PROG_1_ID, Label: '2026', Status: 'Active', Program: 'Field Technician' },
                { ID: VER_2_ID, ProgramID: PROG_1_ID, Label: '2027', Status: 'Draft', Program: 'Field Technician' },
            ],
        };

        vi.spyOn(
            engine as unknown as {
                Load: (
                    configs: Partial<BaseEnginePropertyConfig>[],
                    provider: IMetadataProvider,
                    forceRefresh: boolean,
                    contextUser?: UserInfo,
                ) => Promise<void>;
            },
            'Load',
        ).mockImplementation(async (configs, provider, forceRefresh, contextUser) => {
            loadCalls.push({ configs, provider, forceRefresh, contextUser });
            const target = engine as unknown as Record<string, unknown>;
            for (const cfg of configs) {
                if (cfg.PropertyName) {
                    target[cfg.PropertyName] = loadPayloadByProperty[cfg.PropertyName] ?? [];
                }
            }
            target['_loaded'] = true;
        });
    });

    it('returns the same singleton instance via BaseSingleton and registers with StartupManager', () => {
        const first = CredentialingEngineBase.Instance;
        const second = CredentialingEngineBase.Instance;
        expect(first).toBe(second);

        const registrations = StartupManager.Instance.GetRegistrations();
        const reg = registrations.find((r) => Object.is(r.constructor, CredentialingEngineBase));
        expect(reg).toBeDefined();
        expect(reg?.options.deferred).toBe(true);
        expect(reg?.options.severity).toBe('warn');
    });

    it('sets CacheLocal: false on every RLS-scoped entity config', () => {
        const configs = CredentialingEngineBase.buildPropertyConfigs();
        expect(configs).toHaveLength(3);
        expect(configs.map((c) => c.EntityName)).toEqual([
            CREDENTIALING_ENGINE_ENTITIES.AccreditingOrganization,
            CREDENTIALING_ENGINE_ENTITIES.Program,
            CREDENTIALING_ENGINE_ENTITIES.ProgramVersion,
        ]);
        for (const config of configs) {
            expect(config.CacheLocal).toBe(false);
            expect(config.AutoRefresh).toBe(true);
        }
    });

    it('loads all 3 bounded entities for Credentialing Staff and skips repeat calls when already loaded', async () => {
        const staffUser = makeUser('U-STAFF-A', 'staff.a@example.test');
        const provider = makeProvider(staffUser, {
            [CREDENTIALING_ENGINE_ENTITIES.AccreditingOrganization]: true,
            [CREDENTIALING_ENGINE_ENTITIES.Program]: true,
            [CREDENTIALING_ENGINE_ENTITIES.ProgramVersion]: true,
        });

        const engine = CredentialingEngineBase.Instance;
        await engine.Config(false, undefined, provider);
        await engine.Config(false, undefined, provider);

        expect(loadCalls).toHaveLength(1);
        expect(loadCalls[0].configs.map((c) => c.EntityName)).toEqual([
            CREDENTIALING_ENGINE_ENTITIES.AccreditingOrganization,
            CREDENTIALING_ENGINE_ENTITIES.Program,
            CREDENTIALING_ENGINE_ENTITIES.ProgramVersion,
        ]);
        expect(engine.ProviderToUse).toBe(provider);
        expect(engine.AccreditingOrganizations).toHaveLength(1);
        expect(engine.Programs).toHaveLength(2);
        expect(engine.ProgramVersions).toHaveLength(2);
    });

    it('loads only Accrediting Organizations for Credentialing Admin without failing on Programs or Program Versions', async () => {
        const adminUser = makeUser('U-ADMIN', 'admin@example.test');
        const provider = makeProvider(adminUser, {
            [CREDENTIALING_ENGINE_ENTITIES.AccreditingOrganization]: true,
            [CREDENTIALING_ENGINE_ENTITIES.Program]: false,
            [CREDENTIALING_ENGINE_ENTITIES.ProgramVersion]: false,
        });

        const engine = CredentialingEngineBase.Instance;
        await engine.Config(false, undefined, provider);

        expect(loadCalls).toHaveLength(1);
        expect(loadCalls[0].configs.map((c) => c.EntityName)).toEqual([
            CREDENTIALING_ENGINE_ENTITIES.AccreditingOrganization,
        ]);
        expect(engine.AccreditingOrganizations).toHaveLength(1);
        expect(engine.Programs).toEqual([]);
        expect(engine.ProgramVersions).toEqual([]);
    });

    it('issues zero entity loads and never throws for Credentialing Applicant, Reviewer, or Committee roles', async () => {
        const applicantUser = makeUser('U-APPLICANT', 'applicant@example.test');
        const provider = makeProvider(applicantUser, {
            [CREDENTIALING_ENGINE_ENTITIES.AccreditingOrganization]: false,
            [CREDENTIALING_ENGINE_ENTITIES.Program]: false,
            [CREDENTIALING_ENGINE_ENTITIES.ProgramVersion]: false,
        });

        const engine = CredentialingEngineBase.Instance;
        await expect(engine.Config(false, undefined, provider)).resolves.toBeUndefined();

        expect(loadCalls).toHaveLength(1);
        expect(loadCalls[0].configs).toEqual([]);
        expect(engine.AccreditingOrganizations).toEqual([]);
        expect(engine.Programs).toEqual([]);
        expect(engine.ProgramVersions).toEqual([]);
    });

    it('skips missing entities cleanly when the credentialing schema is not installed in metadata', async () => {
        const user = makeUser('U-DEV', 'dev@example.test');
        const provider = makeProvider(user, { 'MJ: Users': true }, ProviderType.Network, ['MJ: Users']);

        const engine = CredentialingEngineBase.Instance;
        await engine.Config(false, undefined, provider);

        expect(loadCalls).toHaveLength(1);
        expect(loadCalls[0].configs).toEqual([]);
        expect(engine.AccreditingOrganizations).toEqual([]);
        expect(engine.Programs).toEqual([]);
        expect(engine.ProgramVersions).toEqual([]);
    });

    it('updates active ProviderToUse, clears stale org rows, and forces refresh on provider or persona switch', async () => {
        const staffA = makeUser('U-STAFF-A', 'staff.a@example.test');
        const providerA = makeProvider(staffA, {
            [CREDENTIALING_ENGINE_ENTITIES.AccreditingOrganization]: true,
            [CREDENTIALING_ENGINE_ENTITIES.Program]: true,
            [CREDENTIALING_ENGINE_ENTITIES.ProgramVersion]: true,
        });

        const engine = CredentialingEngineBase.Instance;
        await engine.Config(false, undefined, providerA);
        expect(engine.ProviderToUse).toBe(providerA);
        expect(engine.Programs).toHaveLength(2);

        // Switch persona to an applicant on a new provider — must update ProviderToUse, force refresh,
        // and leave ZERO org A rows behind in memory.
        const applicantB = makeUser('U-APPLICANT-B', 'applicant.b@example.test');
        const providerB = makeProvider(applicantB, {
            [CREDENTIALING_ENGINE_ENTITIES.AccreditingOrganization]: false,
            [CREDENTIALING_ENGINE_ENTITIES.Program]: false,
            [CREDENTIALING_ENGINE_ENTITIES.ProgramVersion]: false,
        });

        await engine.Config(false, undefined, providerB);
        expect(engine.ProviderToUse).toBe(providerB);
        expect(loadCalls).toHaveLength(2);
        expect(loadCalls[1].forceRefresh).toBe(true);
        expect(loadCalls[1].provider).toBe(providerB);
        expect(engine.AccreditingOrganizations).toEqual([]);
        expect(engine.Programs).toEqual([]);
        expect(engine.ProgramVersions).toEqual([]);
    });

    it('does not throw when called on a Database provider with zero readable configs and no contextUser', async () => {
        const provider = makeProvider(undefined, { 'MJ: Users': true }, ProviderType.Database, ['MJ: Users']);
        const engine = CredentialingEngineBase.Instance;
        await expect(engine.Config(false, undefined, provider)).resolves.toBeUndefined();
        expect(loadCalls).toHaveLength(0);
    });

    it('provides case-insensitive UUID lookup helpers and ClearCache invalidation', async () => {
        const staffUser = makeUser('U-STAFF-A', 'staff.a@example.test');
        const provider = makeProvider(staffUser, {
            [CREDENTIALING_ENGINE_ENTITIES.AccreditingOrganization]: true,
            [CREDENTIALING_ENGINE_ENTITIES.Program]: true,
            [CREDENTIALING_ENGINE_ENTITIES.ProgramVersion]: true,
        });

        const engine = CredentialingEngineBase.Instance;
        await engine.Config(false, undefined, provider);

        const org = engine.GetAccreditingOrganizationByID(ORG_A_ID.toLowerCase()) as
            | mjBizAppsCredentialingAccreditingOrganizationEntity
            | undefined;
        expect(org?.Name).toBe('Accrediting Body A');
        expect(engine.GetAccreditingOrganizationByID(null)).toBeUndefined();

        const program = engine.GetProgramByID(PROG_1_ID.toLowerCase()) as
            | mjBizAppsCredentialingProgramEntity
            | undefined;
        expect(program?.Name).toBe('Field Technician');
        expect(engine.GetProgramsByOrganizationID(ORG_A_ID.toLowerCase())).toHaveLength(1);
        expect(engine.GetProgramsByOrganizationID(ORG_B_ID.toLowerCase())).toHaveLength(1);

        const ver = engine.GetProgramVersionByID(VER_1_ID.toLowerCase()) as
            | mjBizAppsCredentialingProgramVersionEntity
            | undefined;
        expect(ver?.Label).toBe('2026');
        expect(engine.GetVersionsByProgramID(PROG_1_ID.toLowerCase())).toHaveLength(2);
        expect(engine.GetActiveProgramVersions().map((v) => v.ID)).toEqual([VER_1_ID]);
        expect(engine.GetDraftVersionForProgram(PROG_1_ID.toLowerCase())?.ID).toBe(VER_2_ID);

        engine.ClearCache();
        expect(engine.AccreditingOrganizations).toEqual([]);
        expect(engine.Programs).toEqual([]);
        expect(engine.ProgramVersions).toEqual([]);

        await engine.Config(false, undefined, provider);
        expect(loadCalls).toHaveLength(2);
        expect(loadCalls[1].forceRefresh).toBe(true);
    });
});
