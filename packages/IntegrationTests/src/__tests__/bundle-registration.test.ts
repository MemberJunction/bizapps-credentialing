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

    it('registers the cred-applicant-schema bundle with its three checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-applicant-schema').map((c) => c.Id);
        expect(ids).toEqual(['cred-applicant-schema.1', 'cred-applicant-schema.2', 'cred-applicant-schema.3']);
    });

    it('registers the cred-version-rules bundle with its twelve checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-version-rules').map((c) => c.Id);
        expect(ids).toEqual(Array.from({ length: 12 }, (_, i) => `cred-version-rules.${i + 1}`));
    });

    it('registers the cred-standard-rules bundle with its twelve checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-standard-rules').map((c) => c.Id);
        expect(ids).toEqual(Array.from({ length: 12 }, (_, i) => `cred-standard-rules.${i + 1}`));
    });

    it('registers the cred-operations bundle with its twenty checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-operations').map((c) => c.Id);
        expect(ids).toEqual(Array.from({ length: 20 }, (_, i) => `cred-operations.${i + 1}`));
    });

    it('registers the cred-isolation bundle with its nine checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-isolation').map((c) => c.Id);
        expect(ids).toEqual(Array.from({ length: 9 }, (_, i) => `cred-isolation.${i + 1}`));
    });

    it('registers the cred-world bundle with its two checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-world').map((c) => c.Id);
        expect(ids).toEqual(['cred-world.1', 'cred-world.2']);
    });

    it('registers the cred-applicant-world bundle with its two checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-applicant-world').map((c) => c.Id);
        expect(ids).toEqual(['cred-applicant-world.1', 'cred-applicant-world.2']);
    });

    it('registers the cred-users bundle with its one check', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-users').map((c) => c.Id);
        expect(ids).toEqual(['cred-users.1']);
    });

    it('registers the cred-invite bundle with its nine checks', () => {
        const inviteIds = IntegrationCheckRegistry.Instance.GetBundle('cred-invite').map((c) => c.Id);
        expect(inviteIds).toEqual([
            'cred-invite.1',
            'cred-invite.2',
            'cred-invite.3',
            'cred-invite.4',
            'cred-invite.5',
            'cred-invite.6',
            'cred-invite.9',
            'cred-invite.11',
            'cred-invite.12',
        ]);
    });

    it('registers the cred-subject-isolation bundle with its twelve checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-subject-isolation').map((c) => c.Id);
        expect(ids).toEqual(Array.from({ length: 12 }, (_, i) => `cred-subject-isolation.${i + 1}`));
    });

    it('registers the cred-responses bundle with its twelve checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-responses').map((c) => c.Id);
        expect(ids).toEqual(Array.from({ length: 12 }, (_, i) => `cred-responses.${i + 1}`));
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
    it('registers the cred-evidence-rules bundle with its five checks', () => {
        const ids = IntegrationCheckRegistry.Instance.GetBundle('cred-evidence-rules').map((c) => c.Id);
        expect(ids).toEqual([
            'cred-evidence-rules.14',
            'cred-evidence-rules.15',
            'cred-evidence-rules.17',
            'cred-evidence-rules.18',
            'cred-evidence-rules.12',
        ]);
    });
});
