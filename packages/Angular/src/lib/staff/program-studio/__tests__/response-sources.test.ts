import { describe, expect, it } from 'vitest';
import type { RequirementRow } from '../studio-data';
import {
    AddSourceItem,
    AvailableRequirements,
    FormatSourceSentence,
    MANUAL_STANDARD_NO_SOURCES_SENTENCE,
    MoveSourceItem,
    RemoveSourceItem,
    ResolveSourcesViewState,
    SOURCES_DRAFT_ONLY_SENTENCE,
    type SourceListItem,
} from '../response-sources-model';

const REQ_1: RequirementRow = {
    ID: '11111111-1111-1111-1111-111111111111',
    ProgramVersionID: 'V1',
    Name: 'Safety policy',
    Description: null,
    IsRequired: true,
    SensitivityPolicy: 'Normal',
    Sequence: 1,
};

const REQ_2: RequirementRow = {
    ID: '22222222-2222-2222-2222-222222222222',
    ProgramVersionID: 'V1',
    Name: 'Board minutes',
    Description: null,
    IsRequired: true,
    SensitivityPolicy: 'Normal',
    Sequence: 2,
};

describe('response-sources-model', () => {
    it('formats sentences for Prefill and Locate standards', () => {
        expect(FormatSourceSentence(1, 'Safety policy', 'Prefill')).toBe(
            "1. Reads the applicant's Safety policy and drafts an answer.",
        );
        expect(FormatSourceSentence(2, 'Board minutes', 'Locate')).toBe(
            "2. Reads the applicant's Board minutes and points to the passage.",
        );
    });

    it('resolves editable vs read-only state by version status and intake mode', () => {
        expect(ResolveSourcesViewState('Draft', 'Prefill')).toEqual({
            IsManual: false,
            CanEdit: true,
            ReadOnlySentence: null,
            ManualSentence: null,
        });

        expect(ResolveSourcesViewState('Active', 'Locate')).toEqual({
            IsManual: false,
            CanEdit: false,
            ReadOnlySentence: SOURCES_DRAFT_ONLY_SENTENCE,
            ManualSentence: null,
        });

        expect(ResolveSourcesViewState('Retired', 'Prefill')).toEqual({
            IsManual: false,
            CanEdit: false,
            ReadOnlySentence: SOURCES_DRAFT_ONLY_SENTENCE,
            ManualSentence: null,
        });

        expect(ResolveSourcesViewState('Draft', 'Manual')).toEqual({
            IsManual: true,
            CanEdit: false,
            ReadOnlySentence: null,
            ManualSentence: MANUAL_STANDARD_NO_SOURCES_SENTENCE,
        });
    });

    it('adds, reorders, removes sources, and filters available requirements', () => {
        let items: SourceListItem[] = [];
        items = AddSourceItem(items, REQ_1);
        items = AddSourceItem(items, REQ_2);
        items = AddSourceItem(items, REQ_1);
        expect(items.map((i) => i.DocumentRequirementID)).toEqual([REQ_1.ID, REQ_2.ID]);
        expect(AvailableRequirements([REQ_1, REQ_2], items)).toEqual([]);

        items = MoveSourceItem(items, 1, -1);
        expect(items.map((i) => i.DocumentRequirementID)).toEqual([REQ_2.ID, REQ_1.ID]);

        items = RemoveSourceItem(items, 0);
        expect(items.map((i) => i.DocumentRequirementID)).toEqual([REQ_1.ID]);
        expect(AvailableRequirements([REQ_1, REQ_2], items).map((r) => r.ID)).toEqual([REQ_2.ID]);
    });
});
