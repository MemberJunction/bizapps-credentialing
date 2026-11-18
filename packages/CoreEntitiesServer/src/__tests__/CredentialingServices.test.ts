import type { IMetadataProvider } from '@memberjunction/core';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    CredentialingServices,
    ServiceNotRegisteredReason,
    type IsolatedProviderFactory,
    type RegisteredServices,
} from '../services/CredentialingServices.js';

/** A provider stand-in: InBackground only hands it to the work and back to the factory. */
function fakeProvider(label: string): IMetadataProvider {
    return { label } as Partial<IMetadataProvider> as IMetadataProvider;
}

/** A factory that makes a new provider per call and records what it created and released. */
class RecordingFactory implements IsolatedProviderFactory {
    public Created: IMetadataProvider[] = [];
    public Released: IMetadataProvider[] = [];

    public async Create(): Promise<IMetadataProvider> {
        const provider = fakeProvider(`isolated-${this.Created.length + 1}`);
        this.Created.push(provider);
        return provider;
    }

    public async Release(provider: IMetadataProvider): Promise<void> {
        this.Released.push(provider);
    }
}

const ALL_NAMES: (keyof RegisteredServices)[] = ['Providers', 'Invitations', 'Store', 'Text', 'Recognizer', 'Reader', 'Notifier'];

/** Reads one getter by name. */
function read(name: keyof RegisteredServices): unknown {
    return CredentialingServices[name];
}

describe('CredentialingServices', () => {
    beforeEach(() => {
        // Clear every registration: each test starts with an empty registry.
        const cleared: Partial<RegisteredServices> = {};
        for (const name of ALL_NAMES) {
            Object.assign(cleared, { [name]: undefined });
        }
        CredentialingServices.Register(cleared);
    });

    describe('getters', () => {
        it.each(ALL_NAMES)('%s throws its sentence when nobody registered it', (name) => {
            expect(() => read(name)).toThrow(`The ${name} service is not registered on this server.`);
            expect(ServiceNotRegisteredReason(name)).toBe(`The ${name} service is not registered on this server.`);
            expect(CredentialingServices.IsRegistered(name)).toBe(false);
        });

        it('returns what was registered, and a later registration replaces the earlier one', () => {
            const first = new RecordingFactory();
            const second = new RecordingFactory();
            CredentialingServices.Register({ Providers: first });
            expect(CredentialingServices.Providers).toBe(first);
            CredentialingServices.Register({ Providers: second });
            expect(CredentialingServices.Providers).toBe(second);
            expect(CredentialingServices.IsRegistered('Providers')).toBe(true);
        });

        it('keeps the other registrations when one service is registered', () => {
            const factory = new RecordingFactory();
            const notifier = { ApplicationSubmitted: async () => undefined };
            CredentialingServices.Register({ Providers: factory });
            CredentialingServices.Register({ Notifier: notifier });
            expect(CredentialingServices.Providers).toBe(factory);
            expect(CredentialingServices.Notifier).toBe(notifier);
        });
    });

    describe('InBackground', () => {
        it('throws the Providers sentence when no factory is registered, and runs nothing', async () => {
            let ran = false;
            await expect(
                CredentialingServices.InBackground(async () => {
                    ran = true;
                }),
            ).rejects.toThrow('The Providers service is not registered on this server.');
            expect(ran).toBe(false);
        });

        it('hands each call a different provider from the registered factory', async () => {
            const factory = new RecordingFactory();
            CredentialingServices.Register({ Providers: factory });
            const seen: IMetadataProvider[] = [];
            await Promise.all([
                CredentialingServices.InBackground(async (p) => {
                    seen.push(p);
                }),
                CredentialingServices.InBackground(async (p) => {
                    seen.push(p);
                }),
            ]);
            expect(seen).toHaveLength(2);
            expect(seen[0]).not.toBe(seen[1]);
            expect(factory.Created).toHaveLength(2);
            expect(new Set(seen)).toEqual(new Set(factory.Created));
        });

        it('returns the work result and releases exactly the provider it created', async () => {
            const factory = new RecordingFactory();
            CredentialingServices.Register({ Providers: factory });
            const result = await CredentialingServices.InBackground(async () => 42);
            expect(result).toBe(42);
            expect(factory.Released).toEqual(factory.Created);
        });

        it('releases the provider when the work throws, and rethrows', async () => {
            const factory = new RecordingFactory();
            CredentialingServices.Register({ Providers: factory });
            await expect(
                CredentialingServices.InBackground(async () => {
                    throw new Error('work failed');
                }),
            ).rejects.toThrow('work failed');
            expect(factory.Released).toEqual(factory.Created);
            expect(factory.Released).toHaveLength(1);
        });

        it('disposes nothing it did not create: a provider the work made or used stays unreleased', async () => {
            const factory = new RecordingFactory();
            CredentialingServices.Register({ Providers: factory });
            const outside = fakeProvider('outside');
            await CredentialingServices.InBackground(async () => {
                await factory.Create(); // the work makes one of its own
                return outside;
            });
            expect(factory.Created).toHaveLength(2);
            expect(factory.Released).toEqual([factory.Created[0]]);
            expect(factory.Released).not.toContain(outside);
            expect(factory.Released).not.toContain(factory.Created[1]);
        });
    });
});
