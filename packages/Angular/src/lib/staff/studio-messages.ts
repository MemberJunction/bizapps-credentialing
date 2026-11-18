/**
 * The one place a refusal or failure becomes the text a staff screen shows.
 *
 * Every message Program Studio and organization setup render passes through {@link StudioMessages.ForUser}.
 * A product sentence — a server guard's refusal, a rule's reason — passes through unchanged. The
 * platform's concurrent-change message becomes the product's own sentence. Anything that looks like
 * raw database or platform output is never shown: the user reads a plain sentence and the original is
 * logged once. Pure apart from that log call: no Angular, no data access.
 */
import { LogError } from '@memberjunction/core';
import { STALE_RECORD_REASON, StandardAuthoringRules, VersionLifecycleRules, type RuleResult } from '@mj-biz-apps/credentialing-core';

/** What was being done when the message arose; it picks the plain sentence that replaces raw output. */
export type StudioMessageKind = 'save' | 'load';

/** Shown instead of raw database or platform output after a failed write. */
export const SAVE_FAILED_MESSAGE = 'This change could not be saved. Try again; if it keeps happening, tell your administrator.';
/** Shown instead of raw database or platform output after a failed read. */
export const LOAD_FAILED_MESSAGE = 'This could not be loaded. Try again; if it keeps happening, tell your administrator.';

/** Fragments only database or platform output contains; compared ignoring case. */
const RAW_OUTPUT_MARKERS: readonly string[] = [
    'error executing sql',
    'constraint',
    'query:',
    'declare @',
    'conflicted with',
    'duplicate key',
    'conversion failed',
];

/** How MJAPI starts its refusal of a save whose fields another session changed (`ResolverBase`). */
const CONCURRENT_CHANGE_MARKER = 'concurrent modification conflict';

function reasonOf(rule: RuleResult): string {
    return 'Reason' in rule ? rule.Reason : '';
}

/** The refusals that mean the screen shows a version as it no longer is. */
const STALE_VIEW_SENTENCES: readonly string[] = [
    STALE_RECORD_REASON,
    reasonOf(StandardAuthoringRules.CanEditTree('Active')),
    reasonOf(VersionLifecycleRules.CanDelete('Active')),
    reasonOf(VersionLifecycleRules.CanTransition('Active', 'Active')),
];

export class StudioMessages {
    /**
     * The text to show for `message`: itself when it is a product sentence, the changed-by-someone-else
     * sentence for the platform's concurrency refusal, and a plain sentence (the original logged) when
     * it is raw database or platform output.
     */
    public static ForUser(message: string, kind: StudioMessageKind = 'save'): string {
        const lowered = message.toLowerCase();
        if (lowered.includes(CONCURRENT_CHANGE_MARKER)) {
            return STALE_RECORD_REASON;
        }
        if (RAW_OUTPUT_MARKERS.some((marker) => lowered.includes(marker))) {
            LogError(message);
            return kind === 'load' ? LOAD_FAILED_MESSAGE : SAVE_FAILED_MESSAGE;
        }
        return message;
    }

    /** {@link ForUser} for something caught: an `Error`'s message, or the thrown value as text. */
    public static FromError(error: unknown, kind: StudioMessageKind = 'save'): string {
        return StudioMessages.ForUser(error instanceof Error ? error.message : String(error), kind);
    }

    /**
     * Whether a shown refusal means the screen is out of date — the version was activated, retired or
     * changed elsewhere — so the widget keeps the message and reloads what is stored.
     */
    public static MeansStaleView(message: string): boolean {
        return STALE_VIEW_SENTENCES.some((sentence) => sentence.length > 0 && message.includes(sentence));
    }
}
