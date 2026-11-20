/** The file kinds the extraction worker parses (plain text and images never reach it). */
export type ParserKind = 'Pdf' | 'Word' | 'Spreadsheet';

/** What `WorkerTextExtractor` hands the worker thread. */
export interface WorkerInput {
    Kind: ParserKind;
    Bytes: Uint8Array;
}

/** What the worker thread posts back: the text, or the parser's error message. */
export type WorkerOutput = { Ok: true; Text: string; Pages: number | null } | { Ok: false; Reason: string };
