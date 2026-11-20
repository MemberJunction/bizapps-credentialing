import { LogError, LogStatus } from '@memberjunction/core';
import { CredentialingServices, ReadingQueue } from '@mj-biz-apps/credentialing-core-entities-server';

/** How long after the server has mounted its extensions the boot sweep starts. */
export const BOOT_SWEEP_DELAY_MS = 10_000;

let bootTimer: NodeJS.Timeout | null = null;
let sweepTimer: NodeJS.Timeout | null = null;

/**
 * Whether this MJAPI process runs background work (`serverRole` `all` or `worker`), as MJ decides it
 * for its own workers (mj/packages/MJServer/src/index.ts, `ShouldRunBackgroundWorkers`). Dynamic
 * import: `@memberjunction/server` runs `LoadConfig()` when it is loaded, which unit tests cannot.
 */
async function backgroundWorkEnabled(): Promise<boolean> {
    const { configInfo, ShouldRunBackgroundWorkers } = await import('@memberjunction/server');
    return ShouldRunBackgroundWorkers(configInfo.serverRole);
}

function sweep(atBoot: boolean): void {
    ReadingQueue.Sweep({ AtBoot: atBoot }).catch((err: unknown) => LogError(`Credentialing: the reading sweep failed: ${err instanceof Error ? err.message : String(err)}`));
}

/**
 * Starts the reading queue's background work once the server has booted (called from the evidence
 * extension's `OnAllExtensionsMounted`): registers the nudge an upload sends after it commits, runs
 * the boot sweep shortly after, and then sweeps every `ReadingQueue.SweepEveryMinutes`. Both timers
 * are unref'd, so they never keep the process alive. Idempotent.
 */
export async function StartBackgroundReading(): Promise<void> {
    if (sweepTimer != null) {
        return;
    }
    if (!(await backgroundWorkEnabled())) {
        LogStatus('Credentialing: this server does not run background work (serverRole); documents are read by a worker server.');
        return;
    }
    CredentialingServices.Register({ OnEvidenceStored: () => ReadingQueue.Nudge() });
    bootTimer = setTimeout(() => sweep(true), BOOT_SWEEP_DELAY_MS);
    bootTimer.unref();
    sweepTimer = setInterval(() => sweep(false), ReadingQueue.SweepEveryMinutes * 60_000);
    sweepTimer.unref();
    LogStatus(`Credentialing: reading queue started (boot sweep in ${BOOT_SWEEP_DELAY_MS / 1000} s, then every ${ReadingQueue.SweepEveryMinutes} minutes).`);
}

/** Stops the timers (server shutdown). A sweep already running finishes on its own. */
export function StopBackgroundReading(): void {
    if (bootTimer != null) clearTimeout(bootTimer);
    if (sweepTimer != null) clearInterval(sweepTimer);
    bootTimer = null;
    sweepTimer = null;
}
