import type { IntegrationCheckContext } from '@memberjunction/testing-integration/registry';
import { GetWorld, SetWorld, type CredentialingWorld } from './world.js';

export async function LoadWorld(_ctx: IntegrationCheckContext): Promise<CredentialingWorld> {
    const world: CredentialingWorld = { Loaded: true };
    SetWorld(world);
    return world;
}

export async function GetOrLoadWorld(ctx: IntegrationCheckContext): Promise<CredentialingWorld> {
    return GetWorld() ?? LoadWorld(ctx);
}
