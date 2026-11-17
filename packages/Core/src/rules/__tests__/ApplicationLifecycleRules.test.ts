import { describe, it, expect } from 'vitest';
import {
    ApplicationLifecycleRules,
    type ApplicationActor,
    type ApplicationStatus,
} from '../ApplicationLifecycleRules.js';
import type { VersionStatus } from '../VersionLifecycleRules.js';

const ALL_STATUSES: readonly ApplicationStatus[] = [
    'Draft',
    'Submitted',
    'Screening',
    'In Review',
    'Info Requested',
    'Committee',
    'Executive Sign-Off',
    'Decided',
    'Closed',
    'Withdrawn',
];

describe('ApplicationLifecycleRules', () => {
    describe('IsLive', () => {
        it.each<[ApplicationStatus, boolean]>([
            ['Draft', true],
            ['Submitted', true],
            ['Screening', true],
            ['In Review', true],
            ['Info Requested', true],
            ['Committee', true],
            ['Executive Sign-Off', true],
            ['Decided', false],
            ['Closed', false],
            ['Withdrawn', false],
        ])('%s -> %s', (status, expected) => {
            expect(ApplicationLifecycleRules.IsLive(status)).toBe(expected);
        });
    });

    describe('CanTransition', () => {
        type Case = {
            From: ApplicationStatus;
            To: ApplicationStatus;
            Actor: ApplicationActor;
            RequiresScreening: boolean;
            RequiresExecutiveApproval: boolean;
            Allowed: boolean;
        };

        const whitelistCases: Case[] = [
            { From: 'Draft', To: 'Submitted', Actor: 'Applicant', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: true },
            { From: 'Draft', To: 'Submitted', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Submitted', To: 'Screening', Actor: 'Staff', RequiresScreening: true, RequiresExecutiveApproval: false, Allowed: true },
            { From: 'Submitted', To: 'Screening', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Submitted', To: 'Screening', Actor: 'Applicant', RequiresScreening: true, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Submitted', To: 'In Review', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: true },
            { From: 'Submitted', To: 'In Review', Actor: 'Staff', RequiresScreening: true, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Submitted', To: 'In Review', Actor: 'Applicant', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Screening', To: 'In Review', Actor: 'Staff', RequiresScreening: true, RequiresExecutiveApproval: false, Allowed: true },
            { From: 'Screening', To: 'In Review', Actor: 'Applicant', RequiresScreening: true, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'In Review', To: 'Info Requested', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: true },
            { From: 'In Review', To: 'Info Requested', Actor: 'Applicant', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Info Requested', To: 'In Review', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: true },
            { From: 'Info Requested', To: 'In Review', Actor: 'Applicant', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'In Review', To: 'Committee', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: true },
            { From: 'In Review', To: 'Committee', Actor: 'Applicant', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Committee', To: 'Executive Sign-Off', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: true, Allowed: true },
            { From: 'Committee', To: 'Executive Sign-Off', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Committee', To: 'Executive Sign-Off', Actor: 'Applicant', RequiresScreening: false, RequiresExecutiveApproval: true, Allowed: false },
            { From: 'Committee', To: 'Decided', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: true },
            { From: 'Committee', To: 'Decided', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: true, Allowed: false },
            { From: 'Committee', To: 'Decided', Actor: 'Applicant', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Executive Sign-Off', To: 'Decided', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: true, Allowed: true },
            { From: 'Executive Sign-Off', To: 'Decided', Actor: 'Applicant', RequiresScreening: false, RequiresExecutiveApproval: true, Allowed: false },
            { From: 'Decided', To: 'Closed', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: true },
            { From: 'Decided', To: 'Closed', Actor: 'Applicant', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Draft', To: 'In Review', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Submitted', To: 'Submitted', Actor: 'Applicant', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Closed', To: 'Draft', Actor: 'Staff', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
            { From: 'Withdrawn', To: 'Submitted', Actor: 'Applicant', RequiresScreening: false, RequiresExecutiveApproval: false, Allowed: false },
        ];

        it.each(whitelistCases)(
            '$From -> $To as $Actor (screening=$RequiresScreening, exec=$RequiresExecutiveApproval) -> $Allowed',
            ({ From, To, Actor, RequiresScreening, RequiresExecutiveApproval, Allowed }) => {
                const result = ApplicationLifecycleRules.CanTransition(From, To, Actor, {
                    RequiresScreening,
                    RequiresExecutiveApproval,
                });
                if (Allowed) {
                    expect(result).toEqual({ Allowed: true });
                } else {
                    expect(result).toEqual({
                        Allowed: false,
                        Reason: `An application cannot move from ${From} to ${To}.`,
                    });
                }
            }
        );

        it('refuses every unlisted pair in the 10x10 matrix for both actors', () => {
            const allowedSet = new Set(
                whitelistCases.filter((c) => c.Allowed).map((c) => `${c.From}|${c.To}`)
            );
            for (const from of ALL_STATUSES) {
                for (const to of ALL_STATUSES) {
                    if (allowedSet.has(`${from}|${to}`)) {
                        continue;
                    }
                    for (const actor of ['Applicant', 'Staff'] as const) {
                        for (const flags of [
                            { RequiresScreening: false, RequiresExecutiveApproval: false },
                            { RequiresScreening: true, RequiresExecutiveApproval: true },
                        ]) {
                            expect(ApplicationLifecycleRules.CanTransition(from, to, actor, flags)).toEqual({
                                Allowed: false,
                                Reason: `An application cannot move from ${from} to ${to}.`,
                            });
                        }
                    }
                }
            }
        });
    });

    describe('CanWithdraw', () => {
        const staffAllowed: readonly ApplicationStatus[] = [
            'Draft',
            'Submitted',
            'Screening',
            'In Review',
            'Info Requested',
            'Committee',
            'Executive Sign-Off',
        ];
        const applicantAllowed: readonly ApplicationStatus[] = [
            'Draft',
            'Submitted',
            'Screening',
            'In Review',
            'Info Requested',
        ];

        it.each(ALL_STATUSES)('Staff withdrawing from %s', (status) => {
            const expectedAllowed = staffAllowed.includes(status);
            const result = ApplicationLifecycleRules.CanWithdraw(status, 'Staff', 'Requested by applicant');
            if (expectedAllowed) {
                expect(result).toEqual({ Allowed: true });
            } else {
                expect(result).toEqual({
                    Allowed: false,
                    Reason: 'This application can no longer be withdrawn.',
                });
            }
        });

        it.each(ALL_STATUSES)('Applicant withdrawing from %s', (status) => {
            const expectedAllowed = applicantAllowed.includes(status);
            const result = ApplicationLifecycleRules.CanWithdraw(status, 'Applicant', 'Deferring to next year');
            if (expectedAllowed) {
                expect(result).toEqual({ Allowed: true });
            } else {
                expect(result).toEqual({
                    Allowed: false,
                    Reason: 'This application can no longer be withdrawn.',
                });
            }
        });

        it('refuses a blank reason when withdrawal would otherwise be allowed', () => {
            for (const blank of ['', '   ', '\t\n', null]) {
                expect(ApplicationLifecycleRules.CanWithdraw('Draft', 'Applicant', blank)).toEqual({
                    Allowed: false,
                    Reason: 'Give the reason for withdrawing.',
                });
            }
        });
    });

    describe('CanStart', () => {
        it('allows starting on an Active version when subject type matches and no live non-historical application exists', () => {
            expect(
                ApplicationLifecycleRules.CanStart(
                    [
                        { Status: 'Decided', IsHistorical: false },
                        { Status: 'Withdrawn', IsHistorical: false },
                        { Status: 'Draft', IsHistorical: true },
                    ],
                    'Active',
                    'Organization',
                    'Organization'
                )
            ).toEqual({ Allowed: true });
        });

        it.each<VersionStatus>(['Draft', 'Retired'])(
            'refuses starting on a %s version',
            (versionStatus) => {
                expect(
                    ApplicationLifecycleRules.CanStart([], versionStatus, 'Person', 'Organization')
                ).toEqual({
                    Allowed: false,
                    Reason: 'Applications can be started only on an active version.',
                });
            }
        );

        it('refuses when subject type differs from program subject type', () => {
            expect(
                ApplicationLifecycleRules.CanStart([], 'Active', 'Person', 'Organization')
            ).toEqual({
                Allowed: false,
                Reason: 'This program credentials Person subjects.',
            });
        });

        it('refuses when a live non-historical application already exists', () => {
            expect(
                ApplicationLifecycleRules.CanStart(
                    [{ Status: 'In Review', IsHistorical: false }],
                    'Active',
                    'Organization',
                    'Organization'
                )
            ).toEqual({
                Allowed: false,
                Reason: 'This subject already has an open application on this version.',
            });
        });
    });
});
