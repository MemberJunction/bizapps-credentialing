import { describe, expect, it } from 'vitest';
import {
    CITATION_NOT_FOUND_NOTE,
    DocumentPreviewKind,
    SplitForHighlight,
} from '../document-viewer-model';

describe('document-viewer-model', () => {
    describe('SplitForHighlight', () => {
        it('splits extracted text into Before, Match, and After when offsets match the excerpt', () => {
            const text = 'Header line.\nThe practice reviews its written safety policy every twelve months.\nFooter line.';
            const excerpt = 'The practice reviews its written safety policy every twelve months.';
            const start = text.indexOf(excerpt);
            const end = start + excerpt.length;

            const result = SplitForHighlight(text, start, end, excerpt);
            expect(result).toEqual({
                Found: true,
                Before: 'Header line.\n',
                Match: excerpt,
                After: '\nFooter line.',
            });
        });

        it('matches when only whitespace runs differ between stored text and excerpt', () => {
            const text = 'Before  the   cited\npassage  after.';
            const excerpt = 'the cited passage';
            const start = text.indexOf('the');
            const end = text.indexOf('  after');

            const result = SplitForHighlight(text, start, end, excerpt);
            expect(result).toEqual({
                Found: true,
                Before: 'Before  ',
                Match: 'the   cited\npassage',
                After: '  after.',
            });
        });

        it('returns the not-found note and no highlight when the span text no longer equals the excerpt', () => {
            const text = 'The practice reviews its safety policy every twenty-four months.';
            const result = SplitForHighlight(text, 0, 12, 'Different quoted words');
            expect(result).toEqual({
                Found: false,
                Note: CITATION_NOT_FOUND_NOTE,
                Text: text,
            });
        });

        it('returns the not-found note when offsets are negative, inverted, or out of bounds', () => {
            const text = 'Short text.';
            expect(SplitForHighlight(text, -1, 5, 'Short')).toEqual({
                Found: false,
                Note: CITATION_NOT_FOUND_NOTE,
                Text: text,
            });
            expect(SplitForHighlight(text, 5, 5, '')).toEqual({
                Found: false,
                Note: CITATION_NOT_FOUND_NOTE,
                Text: text,
            });
            expect(SplitForHighlight(text, 0, 500, 'Short')).toEqual({
                Found: false,
                Note: CITATION_NOT_FOUND_NOTE,
                Text: text,
            });
        });
    });

    describe('DocumentPreviewKind', () => {
        it('classifies PDF, PNG, and JPEG for inline preview and others as unsupported', () => {
            expect(DocumentPreviewKind('application/pdf', 'doc.pdf')).toBe('pdf');
            expect(DocumentPreviewKind('application/pdf; charset=utf-8', 'doc.pdf')).toBe('pdf');
            expect(DocumentPreviewKind('image/png', 'scan.png')).toBe('image');
            expect(DocumentPreviewKind('image/jpeg', 'photo.jpg')).toBe('image');
            expect(DocumentPreviewKind('application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'notes.docx')).toBe(
                'unsupported',
            );
            expect(DocumentPreviewKind('text/plain', 'notes.txt')).toBe('unsupported');
        });
    });
});
