/**
 * The child process `WorkerTextExtractor` starts for one file: it receives the bytes over IPC,
 * parses them with `@memberjunction/document-parsing`, sends the text back and exits. It runs with
 * a heap limit (`--max-old-space-size`) and is killed after its time limit by the parent, so a file
 * that makes a parser run away (a decompression bomb, a malformed PDF) costs this process, never the
 * server's: when V8 gives up on an out-of-memory it ends the whole process it runs in, which is why
 * this is a process and not a worker thread (docs/dev-instance.md, "Evidence text extraction").
 */
import { ParsePdf, ParseSpreadsheet, ParseWord, SheetsToText } from '@memberjunction/document-parsing';
import type { ParserKind, WorkerInput, WorkerOutput } from './text-extractor-protocol.js';

// pdf.js 1.10 (inside pdf-parse) reads sub-streams from `bytes.buffer` and ignores `byteOffset`.
// When it copies its input, a copy under 4 KB lands in Node's shared Buffer pool at a non-zero
// offset, and every cross-reference then points at the wrong memory: the parse fails with
// `bad XRef entry`, or reads another file's bytes from the pool. Measured on Node 24 with the
// two-page fixture (1 037 bytes): `ParsePdf` failed, and a later call returned the previous file's
// page count. With pooling off, every allocation owns its memory and every call parses correctly.
// This process parses one file and exits, so the setting touches nothing else.
Buffer.poolSize = 0;

async function parse(kind: ParserKind, bytes: Uint8Array): Promise<WorkerOutput> {
    switch (kind) {
        case 'Pdf': {
            const parsed = await ParsePdf(bytes);
            return { Ok: true, Text: parsed.Text, Pages: parsed.Pages ?? null };
        }
        case 'Word': {
            const parsed = await ParseWord(bytes);
            return { Ok: true, Text: parsed.Text, Pages: null };
        }
        case 'Spreadsheet': {
            const sheets = await ParseSpreadsheet(bytes);
            return { Ok: true, Text: SheetsToText(sheets), Pages: null };
        }
    }
}

async function run(input: WorkerInput): Promise<void> {
    let output: WorkerOutput;
    try {
        output = await parse(input.Kind, input.Bytes);
    } catch (err: unknown) {
        output = { Ok: false, Reason: err instanceof Error ? err.message : String(err) };
    }
    process.send?.(output, () => process.exit(0));
}

process.once('message', (input: WorkerInput) => {
    void run(input);
});
