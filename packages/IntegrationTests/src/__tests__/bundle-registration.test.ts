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
});
