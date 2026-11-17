/**
 * Pure view-model helpers for the Document Viewer modal (FRD FR-5.8).
 *
 * Determines how the Original tab renders a file (`pdf` iframe, `image` inline, or `unsupported`
 * download-only) and splits extracted text around a cited span after re-verifying the excerpt.
 */

/** Shown on the Original tab when the document is not a PDF, PNG, or JPEG. */
export const UNSUPPORTED_PREVIEW_MESSAGE = 'This file type cannot be shown here.';

/** Shown on the Extracted text tab when the stored span no longer matches the citation excerpt. */
export const CITATION_NOT_FOUND_NOTE = "The cited passage could not be found in this document's text.";

/** Fallback note when a document's text was recognized from a scan. */
export const RECOGNIZED_SCAN_NOTE = 'This text was read from a scan by the assistant and may contain errors.';

/** Preview strategy for the Original tab. */
export type PreviewKind = 'pdf' | 'image' | 'unsupported';

/** Result of splitting extracted text around a cited span. */
export type HighlightSplit =
    | { Found: true; Before: string; Match: string; After: string }
    | { Found: false; Note: string; Text: string };

/** Classifies a document's MIME type (or extension fallback) for the Original tab. */
export function DocumentPreviewKind(contentType: string, fileName: string): PreviewKind {
    const normalized = contentType.toLowerCase().split(';')[0].trim();
    if (normalized === 'application/pdf') {
        return 'pdf';
    }
    if (normalized === 'image/png' || normalized === 'image/jpeg') {
        return 'image';
    }
    if (normalized.length === 0 || normalized === 'application/octet-stream') {
        const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
        if (ext === 'pdf') return 'pdf';
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'image';
    }
    return 'unsupported';
}

function normalizeWhitespace(value: string): string {
    return value.trim().replace(/\s+/g, ' ');
}

/**
 * Splits `text` into `{ Before, Match, After }` when `text.slice(start, end)` matches `excerpt`
 * (exactly or modulo whitespace runs), or returns `{ Found: false, Note, Text }` with no highlight.
 */
export function SplitForHighlight(text: string, start: number, end: number, excerpt: string): HighlightSplit {
    if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        end <= start ||
        end > text.length
    ) {
        return { Found: false, Note: CITATION_NOT_FOUND_NOTE, Text: text };
    }

    const slice = text.slice(start, end);
    const normalizedExcerpt = normalizeWhitespace(excerpt);
    if (normalizedExcerpt.length === 0) {
        return { Found: false, Note: CITATION_NOT_FOUND_NOTE, Text: text };
    }

    if (slice === excerpt || normalizeWhitespace(slice) === normalizedExcerpt) {
        return {
            Found: true,
            Before: text.slice(0, start),
            Match: slice,
            After: text.slice(end),
        };
    }

    return { Found: false, Note: CITATION_NOT_FOUND_NOTE, Text: text };
}
