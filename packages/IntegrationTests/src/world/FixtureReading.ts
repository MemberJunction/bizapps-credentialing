/**
 * Fixture services for the reading checks (`cred-reader`, plan Task 9): a recognizer and a reader
 * that answer without a model, a text extractor whose answer a check sets per upload, and an evidence
 * store that writes real `MJ: Files` rows (a document's `FileID` is a foreign key) and keeps the bytes
 * in memory. Registered into `CredentialingServices` by the check that uses them, in the `mj test`
 * process only; MJAPI keeps its real services.
 */
import { randomUUID } from 'node:crypto';
import { CompositeKey, type IMetadataProvider, type UserInfo } from '@memberjunction/core';
import type { MJFileEntity } from '@memberjunction/core-entities';
import { Assert } from '@memberjunction/testing-integration/registry';
import type {
    EvidenceReader,
    EvidenceStore,
    ExtractedText,
    ReadingRequest,
    ReadingResult,
    RecognitionResult,
    TextExtractor,
    TextRecognizer,
} from '@mj-biz-apps/credentialing-core-entities-server';

const FILES_ENTITY = 'MJ: Files';

/** What the fixture reader answers for one standard code: a result, or `Throw` to make the read throw. */
export type FixtureAnswer = ReadingResult | 'Throw';

/** A `Found` answer quoting `excerpt`, as the real reader would return it (no prompt run). */
export function FixtureFound(excerpt: string, value: string = 'Drafted from the uploaded document.'): ReadingResult {
    return {
        Kind: 'Found',
        Value: value,
        Excerpt: excerpt,
        PageReference: '1',
        HeadingPath: null,
        Confidence: 0.8,
        Reasoning: 'The fixture reader quotes the passage its table names.',
        PromptRunID: null,
    };
}

/** The fixture reader: answers from a table keyed by standard code; a code it has no answer for finds nothing. */
export class FixtureReader implements EvidenceReader {
    public Answers = new Map<string, FixtureAnswer>();
    public readonly Calls: Array<{ DocumentID: string; Code: string }> = [];

    public async Read(request: ReadingRequest, _contextUser: UserInfo): Promise<ReadingResult> {
        this.Calls.push({ DocumentID: request.Document.ID, Code: request.Standard.Code });
        const answer = this.Answers.get(request.Standard.Code);
        if (answer === 'Throw') {
            throw new Error(`The fixture reader was told to fail on ${request.Standard.Code}.`);
        }
        return answer ?? { Kind: 'NothingFound', PromptRunID: null };
    }
}

/** The fixture recognizer: answers one result and counts its calls. */
export class FixtureRecognizer implements TextRecognizer {
    public Result: RecognitionResult = { Kind: 'Unreadable', PromptRunID: null };
    public Calls = 0;

    public async Recognize(_file: { Bytes: Buffer; ContentType: string; FileName: string }, _contextUser: UserInfo): Promise<RecognitionResult> {
        this.Calls++;
        return this.Result;
    }
}

/** The fixture text extractor: answers what the check set last. */
export class FixtureTextExtractor implements TextExtractor {
    public Next: ExtractedText = { Status: 'Extracted', Text: 'Fixture evidence text.', PageCount: 1, Note: null };

    public async Extract(): Promise<ExtractedText> {
        return this.Next;
    }
}

/** The fixture store: real `MJ: Files` rows on the `External URL` provider, bytes in memory. */
export class FixtureEvidenceStore implements EvidenceStore {
    private readonly bytes = new Map<string, Buffer>();

    public constructor(
        private readonly provider: IMetadataProvider,
        private readonly providerID: string,
        private readonly system: () => UserInfo,
    ) {}

    public async Put(bytes: Buffer, fileName: string, contentType: string): Promise<{ FileID: string }> {
        const file = await this.provider.GetEntityObject<MJFileEntity>(FILES_ENTITY, this.system());
        file.NewRecord();
        file.Name = fileName;
        file.ContentType = contentType;
        file.ProviderID = this.providerID;
        file.ProviderKey = `credentialing-evidence/fixture/${randomUUID()}/${fileName}`;
        file.Status = 'Uploaded';
        Assert(await file.Save(), `fixture MJ: Files save: ${file.LatestResult?.CompleteMessage ?? ''}`);
        this.bytes.set(file.ID.toLowerCase(), bytes);
        return { FileID: file.ID };
    }

    public async Get(fileID: string): Promise<Buffer> {
        const stored = this.bytes.get(fileID.toLowerCase());
        Assert(stored != null, `the fixture store holds ${fileID}`);
        return stored;
    }

    public async Remove(fileID: string): Promise<void> {
        const file = await this.provider.GetEntityObject<MJFileEntity>(FILES_ENTITY, this.system());
        if (await file.InnerLoad(CompositeKey.FromID(fileID))) {
            await file.Delete();
        }
        this.bytes.delete(fileID.toLowerCase());
    }

    public async RemoveOrphans(): Promise<number> {
        return 0;
    }
}
