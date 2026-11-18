import { LogError, type UserInfo } from '@memberjunction/core';
import type { ChatMessage } from '@memberjunction/ai';
import { AIPromptParams } from '@memberjunction/ai-core-plus';
import { AIEngineBase } from '@memberjunction/ai-engine-base';
import { AIPromptRunner } from '@memberjunction/ai-prompts';

/** The prompt runner's prefix when no model with a credential could be selected (`mj/packages/AI/Prompts/src/no-model-found-message.ts`). */
const NO_MODEL_PREFIX = 'No suitable model found';

/** What one run of a stored prompt gave. */
export type StoredPromptRun =
    | { Kind: 'Ran'; Text: string; PromptRunID: string | null }
    | { Kind: 'NoModel' | 'NotInstalled' | 'Failed'; ErrorMessage: string; PromptRunID: string | null };

/** A run that did not produce an answer. */
export type FailedPromptRun = Exclude<StoredPromptRun, { Kind: 'Ran' }>;

/** One run request: template data and, optionally, conversation messages (a file to read rides in one). */
export interface StoredPromptRequest {
    Data: Record<string, string | null>;
    Messages: ChatMessage[] | null;
}

/** Runs a stored MJ prompt by name. The recognizer and the reader depend on this, so their parsing is unit-tested without MJ's AI engine. */
export interface StoredPromptRunner {
    Run(promptName: string, request: StoredPromptRequest, contextUser: UserInfo): Promise<StoredPromptRun>;
}

/**
 * How a run that did not answer is reported: `CouldNotRun` when no model or the prompt is available
 * on this server (an administrator must act; the boot sweep and `Read again` retry it), `Failed` for
 * every other failure — a rate limit, a timeout, a vendor or transport error — which the queue retries
 * on its own (`ReadingQueue.MaxAttempts`).
 */
export function FailedRunResult(run: FailedPromptRun): { Kind: 'CouldNotRun' | 'Failed'; Reason: string } {
    return { Kind: run.Kind === 'Failed' ? 'Failed' : 'CouldNotRun', Reason: CouldNotRunReason(run) };
}

/** The plain-words reason a reading shows for a failed run (FR-5.4: never "nothing found"). */
export function CouldNotRunReason(run: FailedPromptRun): string {
    switch (run.Kind) {
        case 'NoModel':
            return 'No AI model is available on this server.';
        case 'NotInstalled':
            return 'The assistant is not set up on this server.';
        default:
            return 'The assistant service could not be reached.';
    }
}

/**
 * {@link StoredPromptRunner} over MJ's `AIPromptRunner` (`@memberjunction/ai-prompts`, v6.2.2). The
 * prompt comes from `AIEngineBase.Instance.Prompts` by name; its models and their order are prompt
 * metadata (`metadata/prompts/`), so a host with another vendor changes the prompt's model list, not
 * this code. The template renders without HTML escaping (`templateAutoescape: false`): with the
 * default, `&` in a document reached the model as `&amp;` (measured, docs/dev-instance.md), and an
 * excerpt quoted from that text would not be found in the stored text. The run's ID is
 * `result.promptRun.ID`; a run that never selected a model has none.
 */
export class MJStoredPromptRunner implements StoredPromptRunner {
    public async Run(promptName: string, request: StoredPromptRequest, contextUser: UserInfo): Promise<StoredPromptRun> {
        try {
            await AIEngineBase.Instance.Config(false, contextUser);
            const prompt = AIEngineBase.Instance.Prompts.find((p) => p.Name === promptName && p.Status === 'Active');
            if (prompt == null) {
                return { Kind: 'NotInstalled', ErrorMessage: `The prompt ${promptName} is not installed or not active.`, PromptRunID: null };
            }
            const params = new AIPromptParams();
            params.prompt = prompt;
            params.data = request.Data;
            params.contextUser = contextUser;
            params.templateAutoescape = false;
            if (request.Messages != null) {
                params.conversationMessages = request.Messages;
                params.templateMessageRole = 'system';
            }
            const result = await new AIPromptRunner().ExecutePrompt<string>(params);
            const promptRunID = result.promptRun?.ID ?? null;
            if (!result.success) {
                const message = result.errorMessage ?? 'The prompt run failed.';
                return { Kind: message.startsWith(NO_MODEL_PREFIX) ? 'NoModel' : 'Failed', ErrorMessage: message, PromptRunID: promptRunID };
            }
            return { Kind: 'Ran', Text: MJStoredPromptRunner.textOf(result.rawResult, result.result), PromptRunID: promptRunID };
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            LogError(`Credentialing: running the prompt ${promptName} threw: ${message}`);
            return { Kind: 'Failed', ErrorMessage: message, PromptRunID: null };
        }
    }

    private static textOf(raw: string | undefined, parsed: string | undefined): string {
        if (raw != null && raw.length > 0) {
            return raw;
        }
        return typeof parsed === 'string' ? parsed : '';
    }
}
