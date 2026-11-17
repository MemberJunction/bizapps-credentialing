import type { IMetadataProvider, UserInfo } from '@memberjunction/core';
import { BaseSingleton } from '@memberjunction/global';

/**
 * The registry of what `packages/Server` provides to the operations and the background queue of this
 * package: everything that needs `@memberjunction/server`, storage, document parsing, AI or
 * notifications. This package keeps its present dependencies; the server package registers the real
 * implementations at start, and tests register fixtures. Operations and the queue reach a service
 * only through this registry.
 *
 * Each interface below is specified by the plan task that implements it: the provider factory and the
 * invitation issuer by Task 4, the store and the text extractor by Task 7, the recognizer and the
 * reader by Task 9, the notifier by Task 11.
 */

/**
 * Fresh providers for work that has no request behind it. Each has its own transaction state and
 * shares the server's connection pool; `Release` drops that state again (MJ's
 * `CreateIsolatedProvider` / `ReleaseIndependentInstance`, mj/packages/MJServer/src/isolatedProvider.ts).
 */
export interface IsolatedProviderFactory {
    Create(): Promise<IMetadataProvider>;
    Release(provider: IMetadataProvider): Promise<void>;
}

/** Issues an applicant's sign-in link; the role and the application are fixed inside the implementation (Task 4). */
export interface InvitationIssuer {
    IssueApplicantLink(email: string): Promise<{ EmailSent: boolean; InvitationUrl: string | null; ExpiresAt: Date }>;
}

/** The text of an uploaded file, as the extractor found it (Task 7). */
export type ExtractedText =
    | { Status: 'Extracted' | 'Truncated'; Text: string; PageCount: number | null; Note: string | null }
    | { Status: 'Awaiting Recognition'; Text: null; PageCount: number | null; Note: string }
    | { Status: 'No Text Found' | 'Could Not Read'; Text: null; PageCount: number | null; Note: string };

/** The kinds of file the extractor reads. */
export type ExtractableKind = 'Pdf' | 'Word' | 'Spreadsheet' | 'Text' | 'Image';

/** Reads the text layer of an uploaded file; never throws, never takes longer than its time limit (Task 7). */
export interface TextExtractor {
    Extract(kind: ExtractableKind, bytes: Buffer): Promise<ExtractedText>;
}

/** Stores evidence file bytes as the system user, on the configured account (Task 7). */
export interface EvidenceStore {
    Put(bytes: Buffer, fileName: string, contentType: string): Promise<{ FileID: string }>;
    Get(fileID: string): Promise<Buffer>;
    /** Deletes the object and its `MJ: Files` row; best effort. */
    Remove(fileID: string): Promise<void>;
    RemoveOrphans(olderThanMinutes: number, referencedFileIDs: (candidateIDs: string[]) => Promise<Set<string>>): Promise<number>;
}

/** What text recognition of a scan gave (Task 9). */
export type RecognitionResult =
    | { Kind: 'Recognized'; Text: string; PageCount: number | null; PromptRunID: string | null }
    | { Kind: 'Unreadable'; PromptRunID: string | null }
    | { Kind: 'CouldNotRun'; Reason: string };

/** Recognizes the text of a scanned PDF or an image (Task 9). */
export interface TextRecognizer {
    Recognize(file: { Bytes: Buffer; ContentType: string; FileName: string }, contextUser: UserInfo): Promise<RecognitionResult>;
}

/** One document read for one standard (Task 9). */
export interface ReadingRequest {
    Document: { ID: string; FileName: string; Text: string };
    Standard: { ID: string; Code: string; Statement: string; Guidance: string | null; EvidenceHint: string | null; IntakeMode: 'Locate' | 'Prefill' };
}

/** What reading one document for one standard gave (Task 9). */
export type ReadingResult =
    | { Kind: 'Found'; Value: string; Excerpt: string; PageReference: string | null; HeadingPath: string | null; Confidence: number; Reasoning: string; PromptRunID: string | null }
    | { Kind: 'NothingFound'; PromptRunID: string | null }
    | { Kind: 'CouldNotRun'; Reason: string };

/** Reads a document for evidence of one standard (Task 9). */
export interface EvidenceReader {
    Read(request: ReadingRequest, contextUser: UserInfo): Promise<ReadingResult>;
}

/** Tells staff about an application event (Task 11). */
export interface StaffNotifier {
    ApplicationSubmitted(e: { ApplicationID: string; SubjectName: string; ProgramName: string; VersionLabel: string; StaffUserIDs: string[] }): Promise<void>;
}

/** Every service the registry holds, by name. */
export interface RegisteredServices {
    Providers: IsolatedProviderFactory;
    Invitations: InvitationIssuer;
    Store: EvidenceStore;
    Text: TextExtractor;
    Recognizer: TextRecognizer;
    Reader: EvidenceReader;
    Notifier: StaffNotifier;
}

/** The sentence a getter throws for a service nobody registered. */
export function ServiceNotRegisteredReason(name: keyof RegisteredServices): string {
    return `The ${name} service is not registered on this server.`;
}

/**
 * The process-wide store behind {@link CredentialingServices}. A `BaseSingleton`, so a second loaded
 * copy of this module still shares one registry (mj CLAUDE.md, "Use BaseSingleton for all singletons").
 */
class ServiceStore extends BaseSingleton<ServiceStore> {
    public Services: Partial<RegisteredServices> = {};

    protected constructor() {
        super();
    }

    public static get Instance(): ServiceStore {
        return super.getInstance<ServiceStore>();
    }
}

/** The service registry. */
export class CredentialingServices {
    /** Registers `services`; a later registration of a service replaces the earlier one (tests register fixtures). */
    public static Register(services: Partial<RegisteredServices>): void {
        const store = ServiceStore.Instance;
        store.Services = { ...store.Services, ...services };
    }

    /** Whether a service is registered (for code that runs only where it is, such as background work). */
    public static IsRegistered(name: keyof RegisteredServices): boolean {
        return ServiceStore.Instance.Services[name] != null;
    }

    public static get Providers(): IsolatedProviderFactory {
        return CredentialingServices.get('Providers');
    }

    public static get Invitations(): InvitationIssuer {
        return CredentialingServices.get('Invitations');
    }

    public static get Store(): EvidenceStore {
        return CredentialingServices.get('Store');
    }

    public static get Text(): TextExtractor {
        return CredentialingServices.get('Text');
    }

    public static get Recognizer(): TextRecognizer {
        return CredentialingServices.get('Recognizer');
    }

    public static get Reader(): EvidenceReader {
        return CredentialingServices.get('Reader');
    }

    public static get Notifier(): StaffNotifier {
        return CredentialingServices.get('Notifier');
    }

    /**
     * Runs one unit of background work on a provider of its own, created for this call by the
     * registered factory and released through it when the work settles (also when it throws). Two
     * calls never share a provider, so their transactions never nest and their application locks
     * exclude each other. Nothing else is released: not the global provider, not a provider the work
     * made itself.
     */
    public static async InBackground<T>(work: (provider: IMetadataProvider) => Promise<T>): Promise<T> {
        const factory = CredentialingServices.Providers;
        const provider = await factory.Create();
        try {
            return await work(provider);
        } finally {
            await factory.Release(provider);
        }
    }

    private static get<K extends keyof RegisteredServices>(name: K): NonNullable<Partial<RegisteredServices>[K]> {
        const service = ServiceStore.Instance.Services[name];
        if (service == null) {
            throw new Error(ServiceNotRegisteredReason(name));
        }
        return service;
    }
}
