import { describe, it, expect } from 'vitest';
import { RecognitionRules } from '../RecognitionRules.js';

describe('RecognitionRules', () => {
    describe('CanRecognize', () => {
        it('allows files up to 100 pages and 18 MB', () => {
            expect(
                RecognitionRules.CanRecognize({
                    Kind: 'Pdf',
                    SizeBytes: RecognitionRules.MaxBytes,
                    PageCount: RecognitionRules.MaxPages,
                })
            ).toEqual({ Allowed: true });

            expect(
                RecognitionRules.CanRecognize({
                    Kind: 'Image',
                    SizeBytes: 1_000_000,
                    PageCount: null,
                })
            ).toEqual({ Allowed: true });
        });

        it('refuses scans over 100 pages', () => {
            expect(
                RecognitionRules.CanRecognize({
                    Kind: 'Pdf',
                    SizeBytes: 5_000_000,
                    PageCount: 101,
                })
            ).toEqual({
                Allowed: false,
                Reason: 'This scan has 101 pages. Scans of up to 100 pages are read.',
            });
        });

        it('refuses scans over 18 MB', () => {
            expect(
                RecognitionRules.CanRecognize({
                    Kind: 'Image',
                    SizeBytes: RecognitionRules.MaxBytes + 1,
                    PageCount: null,
                })
            ).toEqual({
                Allowed: false,
                Reason: 'This scan is too large to be read. Scans of up to 18 MB are read.',
            });
        });
    });
});
