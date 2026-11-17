import '@angular/compiler';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceSection } from '@mj-biz-apps/credentialing-core';
import { SectionRailComponent } from '../section-rail.component';

function makeSection(id: string, num: string, confirmed: number, total: number, hasNew: boolean): WorkspaceSection {
    return {
        SectionID: id,
        Number: num,
        Name: `Section ${num}`,
        Description: null,
        Standards: Array.from({ length: total }, (_, i) => ({
            StandardID: `ST-${id}-${i}`,
            Code: `${num}.${i + 1}`,
            Statement: `Statement ${num}.${i + 1}`,
            Guidance: null,
            ResponseType: 'Narrative',
            IntakeMode: 'Manual',
            IsEligibility: false,
            IsNewForVersion: hasNew && i === 0,
            EvidenceHint: null,
            Response: {
                ResponseID: `R-${id}-${i}`,
                Status: i < confirmed ? 'Confirmed' : 'Empty',
                ResponseText: null,
                SelfAssessment: null,
                AuthorType: 'Human',
                ConfirmedByName: null,
                ConfirmedAt: null,
                UpdatedAt: '2026-11-17T10:00:00.000Z',
                SourceType: null,
                SourceLabel: null,
                SourceRetrievedAt: null,
                IsStale: false,
                ReopenReason: null,
                Explanation: null,
                Citations: [],
            },
        })),
    };
}

describe('SectionRailComponent', () => {
    it('computes section counts, NEW marker, active comparison (case-insensitive), and emits selection', () => {
        const rail = new SectionRailComponent();
        const s1 = makeSection('AAAAAAAA-1111-1111-1111-111111111111', '1', 1, 2, true);
        const s2 = makeSection('BBBBBBBB-2222-2222-2222-222222222222', '2', 0, 3, false);
        rail.Sections = [s1, s2];
        rail.ActiveSectionID = s1.SectionID.toLowerCase();

        expect(rail.IsActive(s1.SectionID)).toBe(true);
        expect(rail.IsActive(s2.SectionID)).toBe(false);
        expect(rail.CountsFor(s1)).toEqual({
            SectionID: s1.SectionID,
            Confirmed: 1,
            Total: 2,
            HasNew: true,
            Percent: 50,
        });
        expect(rail.CountsFor(s2)).toEqual({
            SectionID: s2.SectionID,
            Confirmed: 0,
            Total: 3,
            HasNew: false,
            Percent: 0,
        });

        const spy = vi.fn();
        rail.SectionSelected.subscribe(spy);
        rail.SelectSection(s2.SectionID);
        expect(spy).toHaveBeenCalledWith(s2.SectionID);
    });
});
