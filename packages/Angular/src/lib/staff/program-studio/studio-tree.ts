/**
 * Pure helpers for the section and standard tree: ordering, the `Sequence` changes a move makes, and
 * which field a server refusal is about. No Angular, no data access.
 */
import type { RequirementRow, SectionRow, StandardRow } from './studio-data';

/** A section with its standards, both in display order. */
export interface TreeSection {
    Section: SectionRow;
    Standards: StandardRow[];
}

/** A row's new position, as `ReorderVersionTreeOperation` takes it. */
export interface SequenceChange {
    ID: string;
    Sequence: number;
}

/** Anything ordered by `Sequence`, with a label that breaks ties. */
interface Ordered {
    ID: string;
    Sequence: number;
}

/** Which field of the section form a refusal concerns. */
export type SectionErrorField = 'Number' | 'Form';

/** Which field of the standard editor a refusal concerns. */
export type StandardErrorField = 'Code' | 'Statement' | 'IsInterpretive' | 'Form';

export class StudioTree {
    /** The version's sections in order, each with its standards in order. */
    public static Build(versionID: string, sections: readonly SectionRow[], standards: readonly StandardRow[]): TreeSection[] {
        const id = versionID.toLowerCase();
        const own = sections.filter((s) => s.ProgramVersionID.toLowerCase() === id);
        return StudioTree.Sort(own, (s) => s.Number).map((section) => ({
            Section: section,
            Standards: StudioTree.Sort(
                standards.filter((st) => st.SectionID.toLowerCase() === section.ID.toLowerCase()),
                (st) => st.Code,
            ),
        }));
    }

    /** The version's document requirements in order. */
    public static Requirements(versionID: string, requirements: readonly RequirementRow[]): RequirementRow[] {
        const id = versionID.toLowerCase();
        return StudioTree.Sort(
            requirements.filter((r) => r.ProgramVersionID.toLowerCase() === id),
            (r) => r.Name,
        );
    }

    /** Rows by `Sequence`, ties broken by their label in natural order ("1.2" before "1.10"). */
    public static Sort<T extends Ordered>(rows: readonly T[], label: (row: T) => string): T[] {
        return [...rows].sort((a, b) => a.Sequence - b.Sequence || label(a).localeCompare(label(b), undefined, { numeric: true, sensitivity: 'base' }));
    }

    /**
     * Moves one row up (`-1`) or down (`1`) among its siblings (already in display order), numbers
     * every sibling 1, 2, 3… in the new order, and returns only the rows whose `Sequence` changed.
     * Empty when the row cannot move that way.
     */
    public static Move(siblings: readonly Ordered[], id: string, delta: -1 | 1): SequenceChange[] {
        const from = siblings.findIndex((s) => s.ID.toLowerCase() === id.toLowerCase());
        const to = from + delta;
        if (from < 0 || to < 0 || to >= siblings.length) {
            return [];
        }
        const order = [...siblings];
        const [moved] = order.splice(from, 1);
        order.splice(to, 0, moved);
        return order.map((row, i) => ({ ID: row.ID, Sequence: i + 1, Was: row.Sequence })).filter((r) => r.Sequence !== r.Was).map(({ ID, Sequence }) => ({ ID, Sequence }));
    }

    /** The `Sequence` for a row added after its siblings. */
    public static NextSequence(siblings: readonly Ordered[]): number {
        return siblings.reduce((max, s) => Math.max(max, s.Sequence), 0) + 1;
    }

    /** The section field a server refusal names (`Section number 1 is already used in this version.`). */
    public static SectionFieldFor(message: string): SectionErrorField {
        return /\bsection number\b/i.test(message) ? 'Number' : 'Form';
    }

    /** The standard field a server refusal names, so it renders beside that field. */
    public static StandardFieldFor(message: string): StandardErrorField {
        if (/\bcode\b/i.test(message)) {
            return 'Code';
        }
        if (/\bstatement\b/i.test(message)) {
            return 'Statement';
        }
        if (/\binterpretive\b/i.test(message)) {
            return 'IsInterpretive';
        }
        return 'Form';
    }
}

