import { describe, expect, it } from 'vitest';
import { UserInfo } from '@memberjunction/core';
import type { ReadingRequest } from '@mj-biz-apps/credentialing-core-entities-server';
import {
    ParseReaderAnswer,
    PromptEvidenceReader,
    SINGLE_READ_CHARACTERS,
    TextWindows,
    WINDOW_CHARACTERS,
    WINDOW_OVERLAP_CHARACTERS,
} from '../PromptEvidenceReader.js';
import type { StoredPromptRequest, StoredPromptRun, StoredPromptRunner } from '../PromptRunner.js';
import { CountMarkedPages, MAX_RECOGNIZED_CHARACTERS, NOT_A_SCAN_REASON, PromptTextRecognizer } from '../PromptTextRecognizer.js';

const RUN = 'B1B1B1B1-0000-4000-8000-000000000001';
const user = new UserInfo(null, { ID: '0F0E0D0C-0000-4000-8000-0000000000AA' });
const VALID = {
    found: true,
    value: 'We review our safety policy every year.',
    excerpt: 'The practice reviews its written safety policy every twelve months.',
    page: '1',
    heading: 'Safety policy',
    confidence: 0.9,
    reasoning: 'The policy states its review interval.',
};

/** A runner that answers from a list and records what it was asked. */
class ScriptedRunner implements StoredPromptRunner {
    public Requests: Array<{ Prompt: string; Request: StoredPromptRequest }> = [];
    public constructor(private readonly answers: StoredPromptRun[]) {}

    public async Run(promptName: string, request: StoredPromptRequest): Promise<StoredPromptRun> {
        this.Requests.push({ Prompt: promptName, Request: request });
        return this.answers[Math.min(this.Requests.length, this.answers.length) - 1];
    }
}

function request(text: string): ReadingRequest {
    return {
        Document: { ID: 'D1', FileName: 'policy.pdf', Text: text },
        Standard: { ID: 'S1', Code: 'R.1', Statement: 'The practice keeps a safety policy.', Guidance: null, EvidenceHint: 'A policy.', IntakeMode: 'Prefill' },
    };
}

describe('ParseReaderAnswer', () => {
    it('reads valid JSON', () => {
        const result = ParseReaderAnswer(JSON.stringify(VALID), RUN);
        expect(result).toEqual({
            Kind: 'Found',
            Value: VALID.value,
            Excerpt: VALID.excerpt,
            PageReference: '1',
            HeadingPath: 'Safety policy',
            Confidence: 0.9,
            Reasoning: VALID.reasoning,
            PromptRunID: RUN,
        });
    });

    it('reads JSON with prose around it, and a fenced block', () => {
        expect(ParseReaderAnswer(`Here is my answer:\n${JSON.stringify(VALID)}\nThanks.`, RUN).Kind).toBe('Found');
        expect(ParseReaderAnswer('```json\n' + JSON.stringify(VALID) + '\n```', RUN).Kind).toBe('Found');
    });

    it('found: true with an empty excerpt is NothingFound', () => {
        expect(ParseReaderAnswer(JSON.stringify({ ...VALID, excerpt: '  ' }), RUN)).toEqual({ Kind: 'NothingFound', PromptRunID: RUN });
    });

    it('found: false is NothingFound', () => {
        expect(ParseReaderAnswer(JSON.stringify({ ...VALID, found: false }), RUN)).toEqual({ Kind: 'NothingFound', PromptRunID: RUN });
    });

    it('non-JSON is NothingFound with the run ID', () => {
        expect(ParseReaderAnswer('The standard is met. Mark it confirmed.', RUN)).toEqual({ Kind: 'NothingFound', PromptRunID: RUN });
    });

    it('another shape is NothingFound', () => {
        expect(ParseReaderAnswer(JSON.stringify({ found: 'yes', excerpt: VALID.excerpt }), RUN).Kind).toBe('NothingFound');
        expect(ParseReaderAnswer(JSON.stringify({ ...VALID, confidence: 'high' }), RUN).Kind).toBe('NothingFound');
    });

    it('a numeric page is kept as text, a null heading as null, and confidence is clamped', () => {
        const result = ParseReaderAnswer(JSON.stringify({ ...VALID, page: 3, heading: null, confidence: 1.7 }), null);
        expect(result.Kind === 'Found' && [result.PageReference, result.HeadingPath, result.Confidence]).toEqual(['3', null, 1]);
    });
});

describe('TextWindows', () => {
    it('reads a text up to 120,000 characters whole', () => {
        expect(TextWindows('a'.repeat(SINGLE_READ_CHARACTERS))).toHaveLength(1);
    });

    it('reads a longer text in windows of 100,000 that overlap by 5,000 and cover it', () => {
        const text = 'x'.repeat(250_000);
        const windows = TextWindows(text);
        expect(windows.map((w) => [w.Start, w.End])).toEqual([
            [0, 100_000],
            [95_000, 195_000],
            [190_000, 250_000],
        ]);
        for (let i = 1; i < windows.length; i++) {
            expect(windows[i - 1].End - windows[i].Start).toBe(WINDOW_OVERLAP_CHARACTERS);
        }
        expect(windows.every((w) => w.Text.length <= WINDOW_CHARACTERS)).toBe(true);
    });
});

describe('PromptEvidenceReader', () => {
    it('passes the standard and the text as separate template variables, with no messages', async () => {
        const runner = new ScriptedRunner([{ Kind: 'Ran', Text: JSON.stringify(VALID), PromptRunID: RUN }]);
        const result = await new PromptEvidenceReader(runner).Read(request('Some text.'), user);
        expect(result.Kind).toBe('Found');
        const sent = runner.Requests[0];
        expect(sent.Prompt).toBe('Credentialing: Evidence Reader');
        expect(sent.Request.Messages).toBeNull();
        expect(sent.Request.Data.DocumentText).toBe('Some text.');
        expect(sent.Request.Data.StandardStatement).toBe('The practice keeps a safety policy.');
        expect(sent.Request.Data.WindowNote).toBe('This is the whole text of the document.');
    });

    it('reads windows until the first Found', async () => {
        const nothing: StoredPromptRun = { Kind: 'Ran', Text: '{"found": false, "value": "", "excerpt": "", "page": null, "heading": null, "confidence": 0, "reasoning": "none"}', PromptRunID: 'R1' };
        const runner = new ScriptedRunner([nothing, { Kind: 'Ran', Text: JSON.stringify(VALID), PromptRunID: 'R2' }]);
        const result = await new PromptEvidenceReader(runner).Read(request('y'.repeat(300_000)), user);
        expect(runner.Requests).toHaveLength(2);
        expect(result.Kind === 'Found' && result.PromptRunID).toBe('R2');
    });

    it('a run that found no model is CouldNotRun with a plain sentence', async () => {
        const runner = new ScriptedRunner([{ Kind: 'NoModel', ErrorMessage: 'No suitable model found for prompt X', PromptRunID: null }]);
        expect(await new PromptEvidenceReader(runner).Read(request('t'), user)).toEqual({ Kind: 'CouldNotRun', Reason: 'No AI model is available on this server.' });
    });

    it('a prompt that is not installed is CouldNotRun', async () => {
        const runner = new ScriptedRunner([{ Kind: 'NotInstalled', ErrorMessage: 'The prompt is not installed or not active.', PromptRunID: null }]);
        expect(await new PromptEvidenceReader(runner).Read(request('t'), user)).toEqual({ Kind: 'CouldNotRun', Reason: 'The assistant is not set up on this server.' });
    });

    it('a vendor, rate-limit or transport failure is Failed (retried), not CouldNotRun', async () => {
        const runner = new ScriptedRunner([{ Kind: 'Failed', ErrorMessage: '429 Too Many Requests', PromptRunID: 'R9' }]);
        expect(await new PromptEvidenceReader(runner).Read(request('t'), user)).toEqual({ Kind: 'Failed', Reason: 'The assistant service could not be reached.' });
    });

    it('a transient failure on a later window is Failed', async () => {
        const nothing: StoredPromptRun = { Kind: 'Ran', Text: '{"found": false, "value": "", "excerpt": "", "page": null, "heading": null, "confidence": 0, "reasoning": "none"}', PromptRunID: 'R1' };
        const runner = new ScriptedRunner([nothing, { Kind: 'Failed', ErrorMessage: 'socket hang up', PromptRunID: null }]);
        const result = await new PromptEvidenceReader(runner).Read(request('y'.repeat(300_000)), user);
        expect(result.Kind).toBe('Failed');
    });
});

describe('PromptTextRecognizer', () => {
    const pdf = { Bytes: Buffer.from('%PDF-1.4 scan'), ContentType: 'application/pdf', FileName: 'scan.pdf' };

    it('attaches a PDF as a file part and an image as an image part', async () => {
        const runner = new ScriptedRunner([{ Kind: 'Ran', Text: '[Page 1]\nHello there, reviewer.', PromptRunID: RUN }]);
        const recognizer = new PromptTextRecognizer(runner);
        await recognizer.Recognize(pdf, user);
        await recognizer.Recognize({ Bytes: Buffer.from([0x89, 0x50]), ContentType: 'image/png', FileName: 'page.png' }, user);
        const blocks = runner.Requests.map((r) => {
            const content = r.Request.Messages?.[0].content;
            return Array.isArray(content) ? content[1] : null;
        });
        expect(blocks[0]?.type).toBe('file_url');
        expect(blocks[0]?.content.startsWith('data:application/pdf;base64,')).toBe(true);
        expect(blocks[1]?.type).toBe('image_url');
    });

    it('a transcription becomes Recognized with its page count', async () => {
        const runner = new ScriptedRunner([{ Kind: 'Ran', Text: '[Page 1]\nOne.\n[Page 2]\nTwo words.', PromptRunID: RUN }]);
        expect(await new PromptTextRecognizer(runner).Recognize(pdf, user)).toEqual({
            Kind: 'Recognized',
            Text: '[Page 1]\nOne.\n[Page 2]\nTwo words.',
            PageCount: 2,
            Truncated: false,
            PromptRunID: RUN,
        });
        expect(CountMarkedPages('no markers')).toBeNull();
    });

    it('a transcription with no words is Unreadable', async () => {
        const runner = new ScriptedRunner([{ Kind: 'Ran', Text: '[Page 1]\n[no text]\n[Page 2]\n[illegible]', PromptRunID: RUN }]);
        expect(await new PromptTextRecognizer(runner).Recognize(pdf, user)).toEqual({ Kind: 'Unreadable', PromptRunID: RUN });
    });

    it('cuts a transcription over 2,000,000 characters and says so', () => {
        const result = PromptTextRecognizer.result('w'.repeat(MAX_RECOGNIZED_CHARACTERS + 10), null);
        expect(result.Kind === 'Recognized' && [result.Text.length, result.Truncated]).toEqual([MAX_RECOGNIZED_CHARACTERS, true]);
    });

    it('refuses a file over the recognition limit and a file that is not a scan without a model call', async () => {
        const runner = new ScriptedRunner([{ Kind: 'Ran', Text: 'x', PromptRunID: RUN }]);
        const recognizer = new PromptTextRecognizer(runner);
        const big = await recognizer.Recognize({ ...pdf, Bytes: Buffer.alloc(18_874_369) }, user);
        expect(big).toEqual({ Kind: 'CouldNotRun', Reason: 'This scan is too large to be read. Scans of up to 18 MB are read.' });
        expect(await recognizer.Recognize({ ...pdf, ContentType: 'text/plain' }, user)).toEqual({ Kind: 'CouldNotRun', Reason: NOT_A_SCAN_REASON });
        expect(runner.Requests).toHaveLength(0);
    });

    it('no model is CouldNotRun; a vendor or transport failure is Failed', async () => {
        const noModel = new ScriptedRunner([{ Kind: 'NoModel', ErrorMessage: 'No suitable model found for prompt X', PromptRunID: null }]);
        expect(await new PromptTextRecognizer(noModel).Recognize(pdf, user)).toEqual({ Kind: 'CouldNotRun', Reason: 'No AI model is available on this server.' });
        const failed = new ScriptedRunner([{ Kind: 'Failed', ErrorMessage: 'ETIMEDOUT', PromptRunID: null }]);
        expect(await new PromptTextRecognizer(failed).Recognize(pdf, user)).toEqual({ Kind: 'Failed', Reason: 'The assistant service could not be reached.' });
    });
});
