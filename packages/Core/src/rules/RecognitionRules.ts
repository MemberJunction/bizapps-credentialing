import type { RuleResult } from './RuleResult.js';

/**
 * Pure domain rules bounding inline scan text recognition by page count and byte size.
 */
export class RecognitionRules {
    /** Maximum number of pages accepted for scan text recognition. */
    public static readonly MaxPages = 100;

    /** Maximum file size in bytes (18 MB) carried by one inline model request. */
    public static readonly MaxBytes = 18_874_368;

    /**
     * Validates whether a scanned PDF or image is within page and byte limits for text recognition.
     */
    public static CanRecognize(file: {
        Kind: 'Pdf' | 'Image';
        SizeBytes: number;
        PageCount: number | null;
    }): RuleResult {
        if (file.PageCount != null && file.PageCount > RecognitionRules.MaxPages) {
            return {
                Allowed: false,
                Reason: `This scan has ${file.PageCount} pages. Scans of up to ${RecognitionRules.MaxPages} pages are read.`,
            };
        }
        if (file.SizeBytes > RecognitionRules.MaxBytes) {
            return {
                Allowed: false,
                Reason: 'This scan is too large to be read. Scans of up to 18 MB are read.',
            };
        }
        return { Allowed: true };
    }
}
