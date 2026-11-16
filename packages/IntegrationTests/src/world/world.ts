export interface CredentialingWorld {
    Loaded: boolean;
}

let current: CredentialingWorld | null = null;

export function SetWorld(world: CredentialingWorld): void {
    current = world;
}

export function GetWorld(): CredentialingWorld | null {
    return current;
}

export function World(): CredentialingWorld {
    if (!current) {
        throw new Error('CredentialingWorld has not been loaded. Call GetOrLoadWorld(ctx) first.');
    }
    return current;
}
