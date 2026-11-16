import { describe, it, expect } from 'vitest';
import { VersionLifecycleRules, type VersionStatus } from '../VersionLifecycleRules.js';

const ALL_STATUSES: readonly VersionStatus[] = ['Draft', 'Active', 'Retired'];

describe('VersionLifecycleRules', () => {
    describe('CanTransition', () => {
        const transitionReason = 'A version can only move from Draft to Active, or from Active to Retired.';

        it.each<[VersionStatus, VersionStatus, boolean]>([
            ['Draft', 'Draft', false],
            ['Draft', 'Active', true],
            ['Draft', 'Retired', false],
            ['Active', 'Draft', false],
            ['Active', 'Active', false],
            ['Active', 'Retired', true],
            ['Retired', 'Draft', false],
            ['Retired', 'Active', false],
            ['Retired', 'Retired', false],
        ])('from %s to %s -> Allowed: %s', (from, to, expectedAllowed) => {
            const result = VersionLifecycleRules.CanTransition(from, to);
            if (expectedAllowed) {
                expect(result).toEqual({ Allowed: true });
            } else {
                expect(result).toEqual({ Allowed: false, Reason: transitionReason });
            }
        });
    });

    describe('CanActivate', () => {
        it('allows a Draft version with standards, no empty sections, and a committee', () => {
            const result = VersionLifecycleRules.CanActivate({
                Status: 'Draft',
                SectionCount: 2,
                StandardCount: 6,
                EmptySectionNumbers: [],
                CommitteeID: '11111111-1111-1111-1111-111111111111',
            });
            expect(result).toEqual({ Allowed: true });
        });

        it('refuses non-Draft status first even when other checks also fail', () => {
            for (const status of ['Active', 'Retired'] as const) {
                const result = VersionLifecycleRules.CanActivate({
                    Status: status,
                    SectionCount: 0,
                    StandardCount: 0,
                    EmptySectionNumbers: ['1'],
                    CommitteeID: null,
                });
                expect(result).toEqual({
                    Allowed: false,
                    Reason: 'Only a Draft version can be activated.',
                });
            }
        });

        it('refuses zero sections or zero standards before empty-section or committee checks', () => {
            const noSections = VersionLifecycleRules.CanActivate({
                Status: 'Draft',
                SectionCount: 0,
                StandardCount: 0,
                EmptySectionNumbers: ['1'],
                CommitteeID: null,
            });
            expect(noSections).toEqual({
                Allowed: false,
                Reason: 'This version has no standards. Add at least one standard before activating.',
            });

            const noStandards = VersionLifecycleRules.CanActivate({
                Status: 'Draft',
                SectionCount: 1,
                StandardCount: 0,
                EmptySectionNumbers: ['1'],
                CommitteeID: null,
            });
            expect(noStandards).toEqual({
                Allowed: false,
                Reason: 'This version has no standards. Add at least one standard before activating.',
            });
        });

        it('refuses empty sections with comma-separated section numbers before committee check', () => {
            const single = VersionLifecycleRules.CanActivate({
                Status: 'Draft',
                SectionCount: 2,
                StandardCount: 3,
                EmptySectionNumbers: ['2'],
                CommitteeID: null,
            });
            expect(single).toEqual({
                Allowed: false,
                Reason: 'Section 2 has no standards. Add a standard or remove the section before activating.',
            });

            const multiple = VersionLifecycleRules.CanActivate({
                Status: 'Draft',
                SectionCount: 5,
                StandardCount: 3,
                EmptySectionNumbers: ['2', '5'],
                CommitteeID: null,
            });
            expect(multiple).toEqual({
                Allowed: false,
                Reason: 'Section 2, 5 has no standards. Add a standard or remove the section before activating.',
            });
        });

        it('refuses missing committee when status, standards, and sections pass', () => {
            const result = VersionLifecycleRules.CanActivate({
                Status: 'Draft',
                SectionCount: 2,
                StandardCount: 4,
                EmptySectionNumbers: [],
                CommitteeID: null,
            });
            expect(result).toEqual({
                Allowed: false,
                Reason: 'Choose the deciding committee before activating this version.',
            });
        });
    });

    describe('CanStartDraft', () => {
        it('allows starting a draft when no existing draft exists', () => {
            expect(VersionLifecycleRules.CanStartDraft({ ExistingDraftLabel: null })).toEqual({
                Allowed: true,
            });
        });

        it('refuses starting a second draft and names the existing draft label', () => {
            expect(VersionLifecycleRules.CanStartDraft({ ExistingDraftLabel: '2027' })).toEqual({
                Allowed: false,
                Reason: 'This program already has a draft version (2027). Finish or delete it before starting another.',
            });
        });
    });

    describe('CanDelete', () => {
        it.each(ALL_STATUSES)('checks %s status', (status) => {
            const result = VersionLifecycleRules.CanDelete(status);
            if (status === 'Draft') {
                expect(result).toEqual({ Allowed: true });
            } else {
                expect(result).toEqual({
                    Allowed: false,
                    Reason: 'Only a Draft version can be deleted.',
                });
            }
        });
    });
});
