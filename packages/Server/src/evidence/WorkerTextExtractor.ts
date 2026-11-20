import { fork } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LogError } from '@memberjunction/core';
import { RecognitionRules } from '@mj-biz-apps/credentialing-core';
import type { ExtractableKind, ExtractedText, TextExtractor } from '@mj-biz-apps/credentialing-core-entities-server';
import type { ParserKind, WorkerInput, WorkerOutput } from './text-extractor-protocol.js';

/** Characters of text kept from one file; anything longer is cut and marked `Truncated`. */
export const MAX_EXTRACTED_CHARACTERS = 2_000_000;

/** How long one file may be parsed before its process is killed. */
export const EXTRACTION_TIME_LIMIT_MS = 30_000;

/** The heap one extraction process may use (`--max-old-space-size`). */
export const EXTRACTION_HEAP_LIMIT_MB = 512;

/** How many files are parsed at once; more wait their turn, so a burst cannot exhaust the machine's memory. */
export const MAX_CONCURRENT_EXTRACTIONS = 2;

/** The sentences a document's text note shows (plan Task 7). */
export const TEXT_NOTE = {
    AwaitingRecognition: 'This is a scan. The assistant is reading it; this can take a few minutes.',
    NothingDrafted: ' It is stored, but nothing can be drafted from it.',
    Truncated: 'Only the first part of this document was read because it is very long.',
    CouldNotRead: 'This file could not be opened. It is stored, but nothing can be drafted from it.',
    NoText: 'No readable text was found in this file. It is stored, but nothing can be drafted from it.',
} as const;

/**
 * A counting gate: at most `capacity` holders at once, the rest wait in arrival order. Module state,
 * shared by every extractor in the process, because the limit is the machine's memory, not one
 * extractor's.
 */
class Gate {
    private holders = 0;
    private readonly waiting: (() => void)[] = [];

    public constructor(private readonly capacity: number) {}

    public async Run<T>(work: () => Promise<T>): Promise<T> {
        if (this.holders >= this.capacity) {
            await new Promise<void>((resolve) => this.waiting.push(resolve));
        } else {
            this.holders++;
        }
        try {
            return await work();
        } finally {
            const next = this.waiting.shift();
            if (next != null) {
                next();
            } else {
                this.holders--;
            }
        }
    }
}

const extractionGate = new Gate(MAX_CONCURRENT_EXTRACTIONS);

/**
 * The server's {@link TextExtractor}. PDF, Word and Excel files are parsed by
 * `@memberjunction/document-parsing` in a child process started for that one file, with a heap
 * limit of {@link EXTRACTION_HEAP_LIMIT_MB} MB, and killed after {@link EXTRACTION_TIME_LIMIT_MS} ms;
 * at most {@link MAX_CONCURRENT_EXTRACTIONS} run at once. A timeout, an out-of-memory death and a
 * parser error all give `Could Not Read`; none of them throws, and none blocks or ends the server's
 * own process. Plain text is decoded here, in-process. A PDF without a text layer and an image are
 * `Awaiting Recognition` when `RecognitionRules` admit them, and `No Text Found` otherwise.
 *
 * Why a process and not a `worker_thread` with `resourceLimits` (what plan Task 7 named): measured on
 * Node 24.15, three decompression-bomb DOCX files parsed at once in three workers made V8 call
 * `FatalProcessOutOfMemory` from a worker isolate in 2 of 10 runs, which ends the whole process —
 * the server, in MJAPI. A child process that dies the same way ends only itself.
 */
export class WorkerTextExtractor implements TextExtractor {
    public constructor(
        private readonly timeLimitMs: number = EXTRACTION_TIME_LIMIT_MS,
        private readonly heapLimitMb: number = EXTRACTION_HEAP_LIMIT_MB,
    ) {}

    public async Extract(kind: ExtractableKind, bytes: Buffer): Promise<ExtractedText> {
        try {
            switch (kind) {
                case 'Text':
                    return WorkerTextExtractor.fromText(WorkerTextExtractor.decodeText(bytes), null);
                case 'Image':
                    return WorkerTextExtractor.scanOrNothing('Image', bytes.length, null);
                case 'Pdf':
                case 'Word':
                case 'Spreadsheet':
                    return await this.fromParser(kind, bytes);
            }
        } catch (err: unknown) {
            LogError(`WorkerTextExtractor: extracting a ${kind} file failed: ${err instanceof Error ? err.message : String(err)}`);
            return WorkerTextExtractor.couldNotRead(null);
        }
    }

    /** Parses in a child process and turns its answer into the stored text and sentence. */
    private async fromParser(kind: ParserKind, bytes: Buffer): Promise<ExtractedText> {
        const run = await extractionGate.Run(() => this.runParser(kind, bytes));
        if ('Reason' in run) {
            LogError(`WorkerTextExtractor: a ${kind} file could not be read: ${run.Reason}`);
            return WorkerTextExtractor.couldNotRead(null);
        }
        if (kind === 'Pdf' && run.Text.trim().length === 0) {
            return WorkerTextExtractor.scanOrNothing('Pdf', bytes.length, run.Pages);
        }
        return WorkerTextExtractor.fromText(run.Text, run.Pages);
    }

    /**
     * Starts one parser process for `bytes` and settles with its answer, or with a failure when it
     * throws, dies (out of memory included), exits without answering or outlives the time limit (it is
     * then killed).
     */
    private runParser(kind: ParserKind, bytes: Buffer): Promise<WorkerOutput> {
        return new Promise<WorkerOutput>((resolve) => {
            const child = fork(WorkerTextExtractor.parserPath(), [], {
                execArgv: [`--max-old-space-size=${this.heapLimitMb}`],
                serialization: 'advanced',
                stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
            });
            let settled = false;
            const finish = (output: WorkerOutput): void => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                resolve(output);
                if (child.exitCode == null && child.signalCode == null) {
                    child.kill('SIGKILL');
                }
            };
            const timer = setTimeout(() => finish({ Ok: false, Reason: `parsing took longer than ${this.timeLimitMs} ms` }), this.timeLimitMs);
            child.once('message', (output: WorkerOutput) => finish(output));
            child.once('error', (err: Error) => finish({ Ok: false, Reason: err.message }));
            child.once('exit', (code: number | null, signal: NodeJS.Signals | null) =>
                finish({ Ok: false, Reason: `the parser ended (${signal ?? `exit code ${code ?? 'none'}`}) without an answer` }),
            );
            const input: WorkerInput = { Kind: kind, Bytes: new Uint8Array(bytes) };
            child.send(input, (err: Error | null) => {
                if (err != null) {
                    finish({ Ok: false, Reason: `the file could not be handed to the parser: ${err.message}` });
                }
            });
        });
    }

    /**
     * The parser script beside this module, with this module's own extension: `.js` in the built
     * package, `.ts` when the sources run directly (the unit tests; Node strips the types).
     */
    private static parserPath(): string {
        const self = fileURLToPath(import.meta.url);
        return path.join(path.dirname(self), `text-extractor.worker${path.extname(self)}`);
    }

    /** UTF-8 text, a leading byte-order mark removed; invalid sequences become U+FFFD. */
    private static decodeText(bytes: Buffer): string {
        return new TextDecoder('utf-8', { fatal: false, ignoreBOM: false }).decode(bytes);
    }

    /** Text found: `Extracted`, or `Truncated` past the cap; no text at all is `No Text Found`. */
    private static fromText(text: string, pageCount: number | null): ExtractedText {
        if (text.trim().length === 0) {
            return { Status: 'No Text Found', Text: null, PageCount: pageCount, Note: TEXT_NOTE.NoText };
        }
        if (text.length > MAX_EXTRACTED_CHARACTERS) {
            return { Status: 'Truncated', Text: WorkerTextExtractor.cut(text), PageCount: pageCount, Note: TEXT_NOTE.Truncated };
        }
        return { Status: 'Extracted', Text: text, PageCount: pageCount, Note: null };
    }

    /** The first {@link MAX_EXTRACTED_CHARACTERS} characters, never ending in half a surrogate pair. */
    private static cut(text: string): string {
        let end = MAX_EXTRACTED_CHARACTERS;
        const last = text.charCodeAt(end - 1);
        if (last >= 0xd800 && last <= 0xdbff) {
            end -= 1;
        }
        return text.slice(0, end);
    }

    /** A scan (a PDF with no text layer, or an image): queued for recognition when the rules admit it. */
    private static scanOrNothing(kind: 'Pdf' | 'Image', sizeBytes: number, pageCount: number | null): ExtractedText {
        const rule = RecognitionRules.CanRecognize({ Kind: kind, SizeBytes: sizeBytes, PageCount: pageCount });
        if ('Reason' in rule) {
            return { Status: 'No Text Found', Text: null, PageCount: pageCount, Note: `${rule.Reason}${TEXT_NOTE.NothingDrafted}` };
        }
        return { Status: 'Awaiting Recognition', Text: null, PageCount: pageCount, Note: TEXT_NOTE.AwaitingRecognition };
    }

    private static couldNotRead(pageCount: number | null): ExtractedText {
        return { Status: 'Could Not Read', Text: null, PageCount: pageCount, Note: TEXT_NOTE.CouldNotRead };
    }
}
