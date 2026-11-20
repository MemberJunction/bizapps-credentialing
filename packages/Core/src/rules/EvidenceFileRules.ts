import {
    ApplicationLifecycleRules,
    type ApplicationStatus,
} from './ApplicationLifecycleRules.js';
import type { RuleResult } from './RuleResult.js';

/** Coarse parser category for accepted evidence files. */
export type EvidenceFileKind = 'Pdf' | 'Word' | 'Spreadsheet' | 'Text' | 'Image';

/** Metadata for one accepted evidence file extension. */
export interface AcceptedEvidenceFile {
    Extension: string;
    ContentType: string;
}

/** Result of checking whether a document attestation may be replaced or inserted. */
export type ReattestResult =
    | { Allowed: true; Mode: 'Insert' | 'ReplaceUnfrozen' | 'SupersedeAndInsert' }
    | { Allowed: false; Reason: string };

interface FileFormatSpec {
    Extension: string;
    ContentType: string;
    Kind: EvidenceFileKind;
    TypeLabel: string;
    MatchesSignature: (bytes: Uint8Array) => boolean;
}

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] as const; // %PDF-
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const; // PK\x03\x04
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47] as const; // \x89PNG
const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const; // \xFF\xD8\xFF
const TEXT_NUL_SCAN_BYTES = 8192;

function startsWithBytes(bytes: Uint8Array, prefix: readonly number[]): boolean {
    if (bytes.length < prefix.length) {
        return false;
    }
    return prefix.every((byte, idx) => bytes[idx] === byte);
}

function hasNoNulByte(bytes: Uint8Array): boolean {
    const limit = Math.min(bytes.length, TEXT_NUL_SCAN_BYTES);
    for (let i = 0; i < limit; i++) {
        if (bytes[i] === 0) {
            return false;
        }
    }
    return true;
}

const FORMAT_SPECS: readonly FileFormatSpec[] = [
    {
        Extension: 'pdf',
        ContentType: 'application/pdf',
        Kind: 'Pdf',
        TypeLabel: 'PDF',
        MatchesSignature: (bytes) => startsWithBytes(bytes, PDF_MAGIC),
    },
    {
        Extension: 'docx',
        ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        Kind: 'Word',
        TypeLabel: 'Word',
        MatchesSignature: (bytes) => startsWithBytes(bytes, ZIP_MAGIC),
    },
    {
        Extension: 'xlsx',
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        Kind: 'Spreadsheet',
        TypeLabel: 'Excel',
        MatchesSignature: (bytes) => startsWithBytes(bytes, ZIP_MAGIC),
    },
    {
        Extension: 'txt',
        ContentType: 'text/plain',
        Kind: 'Text',
        TypeLabel: 'text',
        MatchesSignature: hasNoNulByte,
    },
    {
        Extension: 'md',
        ContentType: 'text/markdown',
        Kind: 'Text',
        TypeLabel: 'Markdown',
        MatchesSignature: hasNoNulByte,
    },
    {
        Extension: 'png',
        ContentType: 'image/png',
        Kind: 'Image',
        TypeLabel: 'PNG',
        MatchesSignature: (bytes) => startsWithBytes(bytes, PNG_MAGIC),
    },
    {
        Extension: 'jpg',
        ContentType: 'image/jpeg',
        Kind: 'Image',
        TypeLabel: 'JPEG',
        MatchesSignature: (bytes) => startsWithBytes(bytes, JPEG_MAGIC),
    },
    {
        Extension: 'jpeg',
        ContentType: 'image/jpeg',
        Kind: 'Image',
        TypeLabel: 'JPEG',
        MatchesSignature: (bytes) => startsWithBytes(bytes, JPEG_MAGIC),
    },
];

const FORMAT_BY_EXT: ReadonlyMap<string, FileFormatSpec> = new Map(
    FORMAT_SPECS.map((spec) => [spec.Extension, spec])
);

const MAX_FILE_NAME_LENGTH = 255;

/**
 * Pure domain rules validating uploaded evidence files, file names, supersession, and attestations.
 */
export class EvidenceFileRules {
    /** Maximum accepted upload size in bytes (25 MB). */
    public static readonly MaxBytes = 26_214_400;

    /** Accepted evidence file extensions and their MIME content types. */
    public static readonly Accepted: readonly AcceptedEvidenceFile[] = FORMAT_SPECS.map((spec) => ({
        Extension: spec.Extension,
        ContentType: spec.ContentType,
    }));

    /**
     * Validates an uploaded file's size, extension, and leading byte signature in order.
     */
    public static Validate(file: {
        FileName: string;
        SizeBytes: number;
        FirstBytes: Uint8Array;
    }): RuleResult & { Kind?: EvidenceFileKind } {
        if (file.SizeBytes <= 0) {
            return { Allowed: false, Reason: 'This file is empty.' };
        }
        if (file.SizeBytes > EvidenceFileRules.MaxBytes) {
            return { Allowed: false, Reason: 'This file is larger than 25 MB.' };
        }
        if (file.FirstBytes.length === 0) {
            return { Allowed: false, Reason: 'This file is empty.' };
        }

        const ext = EvidenceFileRules.extensionOf(EvidenceFileRules.SanitizeName(file.FileName));
        const spec = ext != null ? FORMAT_BY_EXT.get(ext) : undefined;
        if (spec == null) {
            return {
                Allowed: false,
                Reason: 'This file type cannot be read. Upload a PDF, Word (.docx), Excel (.xlsx), text, Markdown, PNG or JPEG file.',
            };
        }

        if (!spec.MatchesSignature(file.FirstBytes)) {
            return {
                Allowed: false,
                Reason: `This file is not a valid ${spec.TypeLabel} file.`,
            };
        }

        return { Allowed: true, Kind: spec.Kind };
    }

    /**
     * Strips directory paths and control characters from a file name and caps it at 255 characters.
     */
    public static SanitizeName(fileName: string): string {
        const lastSlash = Math.max(fileName.lastIndexOf('/'), fileName.lastIndexOf('\\'));
        const baseName = lastSlash >= 0 ? fileName.slice(lastSlash + 1) : fileName;
        const cleaned = baseName.replace(/[\x00-\x1f\x7f]/g, '').trim();
        if (cleaned.length <= MAX_FILE_NAME_LENGTH) {
            return cleaned;
        }
        const dotIndex = cleaned.lastIndexOf('.');
        if (dotIndex > 0) {
            const ext = cleaned.slice(dotIndex);
            if (ext.length < MAX_FILE_NAME_LENGTH) {
                return cleaned.slice(0, MAX_FILE_NAME_LENGTH - ext.length) + ext;
            }
        }
        return cleaned.slice(0, MAX_FILE_NAME_LENGTH);
    }

    /**
     * Returns the MIME content type for a file name if its extension is accepted, or null otherwise.
     */
    public static ContentTypeFor(fileName: string): string | null {
        const ext = EvidenceFileRules.extensionOf(EvidenceFileRules.SanitizeName(fileName));
        return ext != null ? (FORMAT_BY_EXT.get(ext)?.ContentType ?? null) : null;
    }

    /**
     * Validates whether the current document for a requirement may be replaced.
     */
    public static CanSupersede(
        current: { Status: string } | null,
        frozenBy: readonly ApplicationStatus[]
    ): RuleResult {
        if (current == null) {
            return { Allowed: true };
        }
        const lockedByLiveSubmission = frozenBy.some(
            (status) => ApplicationLifecycleRules.IsLive(status) && status !== 'Draft'
        );
        if (lockedByLiveSubmission) {
            return {
                Allowed: false,
                Reason: 'This document is part of a submitted application and cannot be replaced until that review is finished.',
            };
        }
        return { Allowed: true };
    }

    /**
     * Validates whether a document attestation may be recorded or replaced, returning the write mode.
     */
    public static CanReattest(
        current: { IsSuperseded: boolean } | null,
        frozenBy: readonly ApplicationStatus[]
    ): ReattestResult {
        if (current == null || current.IsSuperseded) {
            return { Allowed: true, Mode: 'Insert' };
        }
        const lockedByLiveSubmission = frozenBy.some(
            (status) => ApplicationLifecycleRules.IsLive(status) && status !== 'Draft'
        );
        if (lockedByLiveSubmission) {
            return {
                Allowed: false,
                Reason: 'This attestation is part of a submitted application and cannot be changed until that review is finished.',
            };
        }
        if (frozenBy.length > 0) {
            return { Allowed: true, Mode: 'SupersedeAndInsert' };
        }
        return { Allowed: true, Mode: 'ReplaceUnfrozen' };
    }

    private static extensionOf(fileName: string): string | null {
        const dotIndex = fileName.lastIndexOf('.');
        if (dotIndex <= 0 || dotIndex === fileName.length - 1) {
            return null;
        }
        return fileName.slice(dotIndex + 1).toLowerCase();
    }
}
