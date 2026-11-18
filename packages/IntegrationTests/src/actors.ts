import { DatabaseProviderBase, type IMetadataProvider } from '@memberjunction/core';
import type { IntegrationCheckContext } from '@memberjunction/testing-integration/registry';

/**
 * Runs `work` with `count` provider instances of its own, one per concurrent actor.
 *
 * Two saves begun on ONE provider instance join one transaction, where a transaction-owned
 * application lock is re-entrant and proves nothing. MJAPI gives every request its own provider;
 * `CreateIndependentInstance()` reproduces that in-process — the instance shares the connection pool
 * and metadata but has its own transaction stack (mj/guides/TRANSACTIONS_AND_BATCHING_GUIDE.md,
 * "Who is in the transaction"). The instances are released when `work` settles.
 *
 * Needs the server transport: the client (GraphQL) provider has no local transaction to isolate.
 */
export async function WithActors<T>(
    ctx: IntegrationCheckContext,
    count: number,
    work: (actors: IMetadataProvider[]) => Promise<T>,
): Promise<T> {
    const database = ctx.Provider;
    if (!(database instanceof DatabaseProviderBase)) {
        throw new Error('concurrency checks need the server transport: the context provider is not a database provider');
    }
    const actors: DatabaseProviderBase[] = [];
    try {
        for (let i = 0; i < count; i++) {
            actors.push(await database.CreateIndependentInstance());
        }
        return await work(actors);
    } finally {
        for (const actor of actors) {
            await actor.ReleaseIndependentInstance();
        }
    }
}

/** Outcome of one concurrent write: whether it succeeded, and its message when it did not. */
export interface ActorOutcome {
    Succeeded: boolean;
    Message: string;
}

/** Turns a settled write into an outcome; a thrown write counts as a failure carrying its error text. */
export function Outcome(settled: PromiseSettledResult<boolean>, message: () => string): ActorOutcome {
    if (settled.status === 'rejected') {
        const reason: unknown = settled.reason;
        return { Succeeded: false, Message: reason instanceof Error ? reason.message : String(reason) };
    }
    return { Succeeded: settled.value, Message: settled.value ? '' : message() };
}
