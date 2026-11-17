import { LogError, type UserInfo } from '@memberjunction/core';
import type { ChatMessage, ChatMessageContentBlock } from '@memberjunction/ai';
import { RecognitionRules } from '@mj-biz-apps/credentialing-core';
import type { RecognitionResult, TextRecognizer } from '@mj-biz-apps/credentialing-core-entities-server';
import { CouldNotRunReason, MJStoredPromptRunner, type StoredPromptRunner } from './PromptRunner.js';

/** The stored prompt that transcribes a scan (`metadata/prompts/.credentialing-reading-prompts.json`). */
export const SCAN_READER_PROMPT = 'Credentialing: Scan Reader';

/** Recognized text longer than this is cut, and the text note says so (the stored-text cap of Task 7). */
export const MAX_RECOGNIZED_CHARACTERS = 2_000_000;

/** The reason a file of a type the assistant does not transcribe gets. */
export const NOT_A_SCAN_REASON = 'Only PDF scans and PNG or JPEG images are read by the assistant.';

const IMAGE_TYPES: ReadonlySet<string> = new Set(['image/png', 'image/jpeg']);

/** `[Page N]` markers, which the template asks for at the start of every page. */
const PAGE_MARKER = /^\s*\[Page\s+(\d+)\]\s*$/gim;

/** What a transcription with no words in it consists of: page markers, `[no text]`, `[illegible]` and whitespace. */
const EMPTY_TRANSCRIPTION = /\[Page\s+\d+\]|\[no text\]|\[illegible\]|\s+/gi;

/** The number of pages a transcription marks, or null when it marks none. */
export function CountMarkedPages(text: string): number | null {
    const pages = new Set<string>();
    for (const match of text.matchAll(PAGE_MARKER)) {
        pages.add(match[1]);
    }
    return pages.size > 0 ? pages.size : null;
}

/** Whether a transcription holds no words at all. */
export function IsEmptyTranscription(text: string): boolean {
    return text.replace(EMPTY_TRANSCRIPTION, '').trim().length === 0;
}

/**
 * {@link TextRecognizer} over the `Credentialing: Scan Reader` prompt: the file rides in the user
 * message as a native PDF or image part (a `file_url` / `image_url` content block holding a data URL,
 * which MJ's Gemini driver sends as `inlineData`, mj/packages/AI/Providers/Gemini/src/index.ts
 * `mjContentBlockToGeminiPart`). `RecognitionRules.CanRecognize` is checked again here (the intake
 * checked it first).
 */
export class PromptTextRecognizer implements TextRecognizer {
    public constructor(private readonly runner: StoredPromptRunner = new MJStoredPromptRunner()) {}

    public async Recognize(file: { Bytes: Buffer; ContentType: string; FileName: string }, contextUser: UserInfo): Promise<RecognitionResult> {
        const kind = file.ContentType === 'application/pdf' ? 'Pdf' : IMAGE_TYPES.has(file.ContentType) ? 'Image' : null;
        if (kind == null) {
            return { Kind: 'CouldNotRun', Reason: NOT_A_SCAN_REASON };
        }
        const rule = RecognitionRules.CanRecognize({ Kind: kind, SizeBytes: file.Bytes.length, PageCount: null });
        if ('Reason' in rule) {
            return { Kind: 'CouldNotRun', Reason: rule.Reason };
        }
        const run = await this.runner.Run(SCAN_READER_PROMPT, { Data: {}, Messages: [PromptTextRecognizer.message(file, kind)] }, contextUser);
        if (run.Kind !== 'Ran') {
            LogError(`Credentialing: recognizing ${file.FileName} could not run: ${run.ErrorMessage}`);
            return { Kind: 'CouldNotRun', Reason: CouldNotRunReason(run) };
        }
        return PromptTextRecognizer.result(run.Text, run.PromptRunID);
    }

    /** Turns the model's transcription into a recognition result. */
    public static result(transcription: string, promptRunID: string | null): RecognitionResult {
        const text = transcription.trim();
        if (IsEmptyTranscription(text)) {
            return { Kind: 'Unreadable', PromptRunID: promptRunID };
        }
        const truncated = text.length > MAX_RECOGNIZED_CHARACTERS;
        const kept = truncated ? text.slice(0, MAX_RECOGNIZED_CHARACTERS) : text;
        return { Kind: 'Recognized', Text: kept, PageCount: CountMarkedPages(kept), Truncated: truncated, PromptRunID: promptRunID };
    }

    private static message(file: { Bytes: Buffer; ContentType: string; FileName: string }, kind: 'Pdf' | 'Image'): ChatMessage {
        const attachment: ChatMessageContentBlock = {
            type: kind === 'Pdf' ? 'file_url' : 'image_url',
            content: `data:${file.ContentType};base64,${file.Bytes.toString('base64')}`,
            mimeType: file.ContentType,
            fileName: file.FileName,
            fileSize: file.Bytes.length,
        };
        return { role: 'user', content: [{ type: 'text', content: 'Transcribe the attached file.' }, attachment] };
    }
}
