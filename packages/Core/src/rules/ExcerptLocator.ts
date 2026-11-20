/** Result of locating a verbatim excerpt within extracted document text. */
export type ExcerptLocateResult =
    | { Start: number; End: number }
    | { Start: null; Reason: 'NotFound' | 'Ambiguous' | 'TooShort' };

interface NormalizedTextMap {
    Normalized: string;
    OriginalStarts: number[];
    OriginalEnds: number[];
}

const MIN_NON_SPACE_CHARS = 12;

/**
 * Pure domain utility that anchors a quoted excerpt in extracted document text with whitespace-run normalization.
 */
export class ExcerptLocator {
    /**
     * Locates `excerpt` inside `text` by comparing runs of whitespace as a single space.
     * Returns offsets into the original `text`, or a typed refusal when too short, missing, or ambiguous.
     */
    public static Locate(text: string, excerpt: string): ExcerptLocateResult {
        const normalizedExcerpt = ExcerptLocator.normalizeWhitespace(excerpt);
        const nonSpaceCount = normalizedExcerpt.replace(/ /g, '').length;
        if (nonSpaceCount < MIN_NON_SPACE_CHARS) {
            return { Start: null, Reason: 'TooShort' };
        }

        const mapped = ExcerptLocator.normalizeWithOffsets(text);
        const firstMatch = mapped.Normalized.indexOf(normalizedExcerpt);
        if (firstMatch === -1) {
            return { Start: null, Reason: 'NotFound' };
        }

        const secondMatch = mapped.Normalized.indexOf(normalizedExcerpt, firstMatch + 1);
        if (secondMatch !== -1) {
            return { Start: null, Reason: 'Ambiguous' };
        }

        const lastNormIndex = firstMatch + normalizedExcerpt.length - 1;
        return {
            Start: mapped.OriginalStarts[firstMatch],
            End: mapped.OriginalEnds[lastNormIndex],
        };
    }

    private static normalizeWhitespace(value: string): string {
        return value.trim().replace(/\s+/g, ' ');
    }

    private static normalizeWithOffsets(text: string): NormalizedTextMap {
        let normalized = '';
        const originalStarts: number[] = [];
        const originalEnds: number[] = [];

        let i = 0;
        while (i < text.length) {
            if (/\s/.test(text[i])) {
                const runStart = i;
                while (i < text.length && /\s/.test(text[i])) {
                    i++;
                }
                if (normalized.length > 0 && i < text.length) {
                    normalized += ' ';
                    originalStarts.push(runStart);
                    originalEnds.push(i);
                }
            } else {
                normalized += text[i];
                originalStarts.push(i);
                originalEnds.push(i + 1);
                i++;
            }
        }

        return {
            Normalized: normalized,
            OriginalStarts: originalStarts,
            OriginalEnds: originalEnds,
        };
    }
}
