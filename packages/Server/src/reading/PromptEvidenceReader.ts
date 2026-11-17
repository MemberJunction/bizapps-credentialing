import { LogError, type UserInfo } from '@memberjunction/core';
import type { EvidenceReader, ReadingRequest, ReadingResult } from '@mj-biz-apps/credentialing-core-entities-server';
import { CouldNotRunReason, MJStoredPromptRunner, type StoredPromptRunner } from './PromptRunner.js';

/** The stored prompt that reads a document for one standard (`metadata/prompts/.credentialing-reading-prompts.json`). */
export const EVIDENCE_READER_PROMPT = 'Credentialing: Evidence Reader';

/** A document text up to this length is read in one run. */
export const SINGLE_READ_CHARACTERS = 120_000;
/** Longer text is read in windows of this length… */
export const WINDOW_CHARACTERS = 100_000;
/** …each overlapping the one before by this much, so a passage cut by a window edge is whole in the next. */
export const WINDOW_OVERLAP_CHARACTERS = 5_000;

/** One window of a document's text. */
export interface TextWindow {
    Text: string;
    Start: number;
    End: number;
    Index: number;
    Count: number;
}

/** Splits `text` into the windows it is read in: the whole text, or overlapping windows when it is long. */
export function TextWindows(text: string): TextWindow[] {
    if (text.length <= SINGLE_READ_CHARACTERS) {
        return [{ Text: text, Start: 0, End: text.length, Index: 1, Count: 1 }];
    }
    const starts: number[] = [];
    for (let start = 0; ; start += WINDOW_CHARACTERS - WINDOW_OVERLAP_CHARACTERS) {
        starts.push(start);
        if (start + WINDOW_CHARACTERS >= text.length) break;
    }
    return starts.map((start, i) => {
        const end = Math.min(text.length, start + WINDOW_CHARACTERS);
        return { Text: text.slice(start, end), Start: start, End: end, Index: i + 1, Count: starts.length };
    });
}

/** The sentence telling the model which part of the document it is reading. */
export function WindowNote(window: TextWindow): string {
    if (window.Count === 1) {
        return 'This is the whole text of the document.';
    }
    return `This is part ${window.Index} of ${window.Count} of the document's text (characters ${window.Start + 1} to ${window.End}); the parts overlap, so a passage may also appear in the next part.`;
}

/** The answer the reader prompt must give (`metadata/prompts/output/evidence-reader.example.json`). */
interface ReaderAnswer {
    found: boolean;
    value: string;
    excerpt: string;
    page: string | null;
    heading: string | null;
    confidence: number;
    reasoning: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value != null && !Array.isArray(value);
}

function optionalText(value: unknown): string | null | undefined {
    if (value == null) return null;
    if (typeof value === 'string') return value.trim().length > 0 ? value.trim() : null;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return undefined;
}

/** The first JSON object in `raw`: the whole reply, a fenced block, or the outermost braces of prose around it. */
function jsonObjectIn(raw: string): unknown {
    const candidates = [raw.trim()];
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
    if (fenced != null) candidates.push(fenced[1].trim());
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first >= 0 && last > first) candidates.push(raw.slice(first, last + 1));
    for (const candidate of candidates) {
        try {
            const parsed: unknown = JSON.parse(candidate);
            if (isRecord(parsed)) return parsed;
        } catch {
            // not this candidate
        }
    }
    return null;
}

/** The reader's answer when it has exactly the declared shape; null otherwise. */
function readerAnswer(value: unknown): ReaderAnswer | null {
    if (!isRecord(value)) return null;
    const { found, value: drafted, excerpt, confidence, reasoning } = value;
    const page = optionalText(value.page);
    const heading = optionalText(value.heading);
    if (typeof found !== 'boolean' || typeof drafted !== 'string' || typeof excerpt !== 'string' || typeof reasoning !== 'string') return null;
    if (typeof confidence !== 'number' || !Number.isFinite(confidence) || page === undefined || heading === undefined) return null;
    return { found, value: drafted, excerpt, page, heading, confidence, reasoning };
}

/**
 * Parses the reader prompt's reply against its schema: `{ found, value, excerpt, page, heading,
 * confidence, reasoning }`. Anything else — not JSON, another shape, `found: false`, or `found: true`
 * with an empty excerpt — is `NothingFound` with the run's ID. Whether the excerpt is really in the
 * document is decided by the queue (`ExcerptLocator`), never here.
 */
export function ParseReaderAnswer(raw: string, promptRunID: string | null): ReadingResult {
    const answer = readerAnswer(jsonObjectIn(raw));
    if (answer == null || !answer.found || answer.excerpt.trim().length === 0) {
        return { Kind: 'NothingFound', PromptRunID: promptRunID };
    }
    return {
        Kind: 'Found',
        Value: answer.value.trim(),
        Excerpt: answer.excerpt,
        PageReference: answer.page,
        HeadingPath: answer.heading,
        Confidence: Math.min(1, Math.max(0, answer.confidence)),
        Reasoning: answer.reasoning.trim(),
        PromptRunID: promptRunID,
    };
}

/**
 * {@link EvidenceReader} over the `Credentialing: Evidence Reader` prompt. The standard and the
 * document's text are separate template variables, the text delimited in the template, which states
 * that nothing in the document is an instruction. Text longer than {@link SINGLE_READ_CHARACTERS} is
 * read in overlapping windows; the first `Found` wins.
 */
export class PromptEvidenceReader implements EvidenceReader {
    public constructor(private readonly runner: StoredPromptRunner = new MJStoredPromptRunner()) {}

    public async Read(request: ReadingRequest, contextUser: UserInfo): Promise<ReadingResult> {
        let lastRunID: string | null = null;
        for (const window of TextWindows(request.Document.Text)) {
            const run = await this.runner.Run(EVIDENCE_READER_PROMPT, { Data: PromptEvidenceReader.data(request, window), Messages: null }, contextUser);
            if (run.Kind !== 'Ran') {
                LogError(`Credentialing: reading document ${request.Document.ID} for ${request.Standard.Code} could not run: ${run.ErrorMessage}`);
                return { Kind: 'CouldNotRun', Reason: CouldNotRunReason(run) };
            }
            const result = ParseReaderAnswer(run.Text, run.PromptRunID);
            if (result.Kind === 'Found') {
                return result;
            }
            lastRunID = run.PromptRunID;
        }
        return { Kind: 'NothingFound', PromptRunID: lastRunID };
    }

    private static data(request: ReadingRequest, window: TextWindow): Record<string, string | null> {
        return {
            StandardCode: request.Standard.Code,
            StandardStatement: request.Standard.Statement,
            StandardGuidance: request.Standard.Guidance,
            EvidenceHint: request.Standard.EvidenceHint,
            FileName: request.Document.FileName,
            WindowNote: WindowNote(window),
            DocumentText: window.Text,
        };
    }
}
