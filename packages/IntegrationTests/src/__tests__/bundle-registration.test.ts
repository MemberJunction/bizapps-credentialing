import { describe, it, expect } from 'vitest';
import '../index.js';
import { IntegrationCheckRegistry } from '@memberjunction/testing-integration/registry';

describe('Credentialing Integration Test Bundles', () => {
    it('registers the cred-smoke integration check bundle', () => {
        const bundleNames = IntegrationCheckRegistry.Instance.GetBundleNames();
        expect(bundleNames).toContain('cred-smoke');
    });

    it('registers the cred-schema integration check bundle', () => {
        const bundleNames = IntegrationCheckRegistry.Instance.GetBundleNames();
        expect(bundleNames).toContain('cred-schema');
    });

    it('registers the cred-version-rules bundle with its eleven checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-version-rules').map((c) => c.Id);
        expect(ids).toEqual(Array.from({ length: 11 }, (_, i) => `cred-version-rules.${i + 1}`));
    });

    it('registers the cred-standard-rules bundle with its eight checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-standard-rules').map((c) => c.Id);
        expect(ids).toEqual(Array.from({ length: 8 }, (_, i) => `cred-standard-rules.${i + 1}`));
    });

    it('registers the cred-operations bundle with its ten checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-operations').map((c) => c.Id);
        expect(ids).toEqual(Array.from({ length: 10 }, (_, i) => `cred-operations.${i + 1}`));
    });

    it('registers the cred-isolation bundle with its nine checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-isolation').map((c) => c.Id);
        expect(ids).toEqual(Array.from({ length: 9 }, (_, i) => `cred-isolation.${i + 1}`));
    });

    it('registers the cred-world bundle with its two checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-world').map((c) => c.Id);
        expect(ids).toEqual(['cred-world.1', 'cred-world.2']);
    });

    it('registers the cred-users bundle with its one check', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-users').map((c) => c.Id);
        expect(ids).toEqual(['cred-users.1']);
    });

    it('marks every rule, operation, isolation and world seeding check as mutating', () => {
        const checks = [
            ...IntegrationCheckRegistry.Instance.GetBundle('cred-version-rules'),
            ...IntegrationCheckRegistry.Instance.GetBundle('cred-standard-rules'),
            ...IntegrationCheckRegistry.Instance.GetBundle('cred-operations'),
            ...IntegrationCheckRegistry.Instance.GetBundle('cred-isolation'),
            ...IntegrationCheckRegistry.Instance.GetBundle('cred-world'),
            ...IntegrationCheckRegistry.Instance.GetBundle('cred-users'),
        ];
        expect(checks.every((c) => c.RequiresMutation === true)).toBe(true);
    });
});
