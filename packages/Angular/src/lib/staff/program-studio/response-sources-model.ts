import { UUIDsEqual } from '@memberjunction/global';
import type {
    ResponseSourceMode,
    ResponseSourceType,
    VersionStatus,
} from '@mj-biz-apps/credentialing-core';
import type { RequirementRow } from './studio-data';

/** Shown below the sources list on Active and Retired versions (Decision 7). */
export const SOURCES_DRAFT_ONLY_SENTENCE = 'Sources are part of the standards and change only in a draft version.';

/** Shown when a standard's intake mode is Manual. */
export const MANUAL_STANDARD_NO_SOURCES_SENTENCE = 'Manual standards have no sources.';

/** One item in the Program Studio "Where the assistant looks" list. */
export interface SourceListItem {
    ID?: string;
    SourceType: ResponseSourceType;
    DocumentRequirementID: string;
    RequirementName: string;
    Mode: ResponseSourceMode;
}

/** Resolved display state for the response sources panel. */
export interface SourcesViewState {
    IsManual: boolean;
    CanEdit: boolean;
    ReadOnlySentence: string | null;
    ManualSentence: string | null;
}

/** Formats one numbered sentence in the sources list based on the standard's intake mode. */
export function FormatSourceSentence(
    rank: number,
    requirementName: string,
    intakeMode: string,
): string {
    const action = intakeMode === 'Locate' ? 'points to the passage' : 'drafts an answer';
    return `${rank}. Reads the applicant's ${requirementName} and ${action}.`;
}

/** Determines editability and explanatory copy for a standard's sources panel. */
export function ResolveSourcesViewState(
    versionStatus: VersionStatus,
    intakeMode: string,
): SourcesViewState {
    if (intakeMode === 'Manual') {
        return {
            IsManual: true,
            CanEdit: false,
            ReadOnlySentence: null,
            ManualSentence: MANUAL_STANDARD_NO_SOURCES_SENTENCE,
        };
    }
    const canEdit = versionStatus === 'Draft';
    return {
        IsManual: false,
        CanEdit: canEdit,
        ReadOnlySentence: canEdit ? null : SOURCES_DRAFT_ONLY_SENTENCE,
        ManualSentence: null,
    };
}

/** Returns version requirements not yet bound in `items`, preserving order. */
export function AvailableRequirements(
    requirements: readonly RequirementRow[],
    items: readonly SourceListItem[],
): RequirementRow[] {
    return requirements.filter(
        (req) => !items.some((item) => UUIDsEqual(item.DocumentRequirementID, req.ID)),
    );
}

/** Appends `requirement` to `items` as a `'Document Extraction'` source if not already present. */
export function AddSourceItem(
    items: readonly SourceListItem[],
    requirement: Pick<RequirementRow, 'ID' | 'Name'>,
    mode: ResponseSourceMode = 'Prefill Only',
): SourceListItem[] {
    if (items.some((item) => UUIDsEqual(item.DocumentRequirementID, requirement.ID))) {
        return [...items];
    }
    return [
        ...items,
        {
            SourceType: 'Document Extraction',
            DocumentRequirementID: requirement.ID,
            RequirementName: requirement.Name,
            Mode: mode,
        },
    ];
}

/** Moves the item at `index` up (`-1`) or down (`1`), returning a new array. */
export function MoveSourceItem(
    items: readonly SourceListItem[],
    index: number,
    delta: -1 | 1,
): SourceListItem[] {
    const target = index + delta;
    if (index < 0 || index >= items.length || target < 0 || target >= items.length) {
        return [...items];
    }
    const copy = [...items];
    const [moved] = copy.splice(index, 1);
    copy.splice(target, 0, moved);
    return copy;
}

/** Removes the item at `index`, returning a new array. */
export function RemoveSourceItem(
    items: readonly SourceListItem[],
    index: number,
): SourceListItem[] {
    if (index < 0 || index >= items.length) {
        return [...items];
    }
    return items.filter((_, i) => i !== index);
}

/** Compares two source lists by order, requirement ID, and mode to detect unsaved edits. */
export function SourcesListsEqual(
    a: readonly SourceListItem[],
    b: readonly SourceListItem[],
): boolean {
    if (a.length !== b.length) return false;
    return a.every(
        (item, i) =>
            UUIDsEqual(item.DocumentRequirementID, b[i].DocumentRequirementID) &&
            item.Mode === b[i].Mode,
    );
}
