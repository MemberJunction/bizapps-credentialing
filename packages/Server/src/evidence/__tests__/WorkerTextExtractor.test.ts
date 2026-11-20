import { describe, expect, it } from 'vitest';
import { MAX_EXTRACTED_CHARACTERS, TEXT_NOTE, WorkerTextExtractor } from '../WorkerTextExtractor.js';
import { Fixture } from './fixtures.js';

const extractor = new WorkerTextExtractor();

describe('WorkerTextExtractor', () => {
    it('reads both pages of a PDF with a text layer', async () => {
        const result = await extractor.Extract('Pdf', Fixture('two-page-text.pdf'));
        expect(result.Status).toBe('Extracted');
        expect(result.PageCount).toBe(2);
        expect(result.Text).toContain('The practice reviews its written safety policy every twelve months.');
        expect(result.Text).toContain('Signed minutes of the annual review are kept for seven years.');
        expect(result.Note).toBeNull();
    });

    it('queues a PDF with no text layer for recognition', async () => {
        const result = await extractor.Extract('Pdf', Fixture('scanned-page.pdf'));
        expect(result).toEqual({ Status: 'Awaiting Recognition', Text: null, PageCount: 1, Note: TEXT_NOTE.AwaitingRecognition });
    });

    it('queues an image for recognition', async () => {
        const result = await extractor.Extract('Image', Fixture('printed-paragraph.png'));
        expect(result).toEqual({ Status: 'Awaiting Recognition', Text: null, PageCount: null, Note: TEXT_NOTE.AwaitingRecognition });
    });

    it('stores a scan too large to recognize as No Text Found, with the rule sentence', async () => {
        const huge = Buffer.concat([Fixture('printed-paragraph.png'), Buffer.alloc(19 * 1024 * 1024)]);
        const result = await extractor.Extract('Image', huge);
        expect(result.Status).toBe('No Text Found');
        expect(result.Note).toBe('This scan is too large to be read. Scans of up to 18 MB are read. It is stored, but nothing can be drafted from it.');
    });

    it('reads a Word document', async () => {
        const result = await extractor.Extract('Word', Fixture('review-notes.docx'));
        expect(result.Status).toBe('Extracted');
        expect(result.Text).toContain('The review committee met on the first Monday of March.');
    });

    it('reads a spreadsheet cell', async () => {
        const result = await extractor.Extract('Spreadsheet', Fixture('review-log.xlsx'));
        expect(result.Status).toBe('Extracted');
        expect(result.Text).toContain('Signed by the board chair');
    });

    it('decodes UTF-8 text in-process', async () => {
        const result = await extractor.Extract('Text', Fixture('review-notes.txt'));
        expect(result.Status).toBe('Extracted');
        expect(result.Text).toContain('Évaluation annuelle — the practice’s policy is reviewed every twelve months.');
    });

    it('cuts text past the cap and says so', async () => {
        const long = Buffer.from('a'.repeat(MAX_EXTRACTED_CHARACTERS + 10), 'utf8');
        const result = await extractor.Extract('Text', long);
        expect(result.Status).toBe('Truncated');
        expect(result.Text?.length).toBe(MAX_EXTRACTED_CHARACTERS);
        expect(result.Note).toBe(TEXT_NOTE.Truncated);
    });

    it('answers Could Not Read for bytes that are not a PDF', async () => {
        const result = await extractor.Extract('Pdf', Fixture('not-a-pdf.pdf'));
        expect(result).toEqual({ Status: 'Could Not Read', Text: null, PageCount: null, Note: TEXT_NOTE.CouldNotRead });
    });

    it('answers Could Not Read for a decompression bomb within 35 s while the main thread keeps running', async () => {
        const bomb = Fixture('inflation-bomb.docx');
        const ticks: number[] = [];
        const timer = setInterval(() => ticks.push(Date.now()), 50);
        const started = Date.now();
        try {
            const result = await extractor.Extract('Word', bomb);
            const elapsed = Date.now() - started;
            expect(result).toEqual({ Status: 'Could Not Read', Text: null, PageCount: null, Note: TEXT_NOTE.CouldNotRead });
            expect(elapsed).toBeLessThan(35_000);
            const gaps = ticks.slice(1).map((t, i) => t - ticks[i]);
            const widestGap = Math.max(0, ...gaps);
            // A 50 ms timer that kept firing: no gap near a parse's length, and close to the expected count.
            expect(widestGap).toBeLessThan(1_000);
            expect(ticks.length).toBeGreaterThan(Math.floor(elapsed / 50) * 0.5);
        } finally {
            clearInterval(timer);
        }
    }, 40_000);

    it('survives three decompression bombs at once: each is Could Not Read and this process lives on', async () => {
        const bomb = Fixture('inflation-bomb.docx');
        const results = await Promise.all([1, 2, 3].map(() => extractor.Extract('Word', bomb)));
        expect(results.map((r) => r.Status)).toEqual(['Could Not Read', 'Could Not Read', 'Could Not Read']);
    }, 120_000);

    it('answers Could Not Read when parsing outlives the time limit', async () => {
        const impatient = new WorkerTextExtractor(1);
        const result = await impatient.Extract('Pdf', Fixture('two-page-text.pdf'));
        expect(result.Status).toBe('Could Not Read');
    });
});
