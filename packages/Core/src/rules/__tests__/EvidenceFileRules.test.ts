import { describe, it, expect } from 'vitest';
import { EvidenceFileRules } from '../EvidenceFileRules.js';

const ascii = (s: string): Uint8Array => new TextEncoder().encode(s);

describe('EvidenceFileRules', () => {
    describe('Validate', () => {
        it('Review Focus 3: refuses an empty file first', () => {
            expect(
                EvidenceFileRules.Validate({
                    FileName: 'bylaws.pdf',
                    SizeBytes: 0,
                    FirstBytes: new Uint8Array(0),
                })
            ).toEqual({ Allowed: false, Reason: 'This file is empty.' });
        });

        it('Review Focus 3: refuses a file over 25 MB', () => {
            expect(
                EvidenceFileRules.Validate({
                    FileName: 'huge.pdf',
                    SizeBytes: EvidenceFileRules.MaxBytes + 1,
                    FirstBytes: ascii('%PDF-1.7'),
                })
            ).toEqual({ Allowed: false, Reason: 'This file is larger than 25 MB.' });
        });

        it('refuses an unaccepted extension', () => {
            expect(
                EvidenceFileRules.Validate({
                    FileName: 'archive.zip',
                    SizeBytes: 512,
                    FirstBytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
                })
            ).toEqual({
                Allowed: false,
                Reason: 'This file type cannot be read. Upload a PDF, Word (.docx), Excel (.xlsx), text, Markdown, PNG or JPEG file.',
            });
        });

        it('Review Focus 3: refuses a .pdf whose bytes are not a PDF', () => {
            expect(
                EvidenceFileRules.Validate({
                    FileName: 'spoofed.pdf',
                    SizeBytes: 120,
                    FirstBytes: ascii('<html>Not a PDF</html>'),
                })
            ).toEqual({
                Allowed: false,
                Reason: 'This file is not a valid PDF file.',
            });
        });

        it('refuses signature mismatches for docx, xlsx, png, jpeg, txt, and md', () => {
            expect(
                EvidenceFileRules.Validate({
                    FileName: 'doc.docx',
                    SizeBytes: 100,
                    FirstBytes: ascii('not-zip'),
                })
            ).toEqual({ Allowed: false, Reason: 'This file is not a valid Word file.' });

            expect(
                EvidenceFileRules.Validate({
                    FileName: 'sheet.xlsx',
                    SizeBytes: 100,
                    FirstBytes: ascii('not-zip'),
                })
            ).toEqual({ Allowed: false, Reason: 'This file is not a valid Excel file.' });

            expect(
                EvidenceFileRules.Validate({
                    FileName: 'scan.png',
                    SizeBytes: 100,
                    FirstBytes: new Uint8Array([0xff, 0xd8, 0xff]),
                })
            ).toEqual({ Allowed: false, Reason: 'This file is not a valid PNG file.' });

            expect(
                EvidenceFileRules.Validate({
                    FileName: 'scan.jpg',
                    SizeBytes: 100,
                    FirstBytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
                })
            ).toEqual({ Allowed: false, Reason: 'This file is not a valid JPEG file.' });

            expect(
                EvidenceFileRules.Validate({
                    FileName: 'notes.txt',
                    SizeBytes: 100,
                    FirstBytes: new Uint8Array([0x41, 0x00, 0x42]),
                })
            ).toEqual({ Allowed: false, Reason: 'This file is not a valid text file.' });

            expect(
                EvidenceFileRules.Validate({
                    FileName: 'notes.md',
                    SizeBytes: 100,
                    FirstBytes: new Uint8Array([0x23, 0x00]),
                })
            ).toEqual({ Allowed: false, Reason: 'This file is not a valid Markdown file.' });
        });

        it('accepts valid signatures for all eight accepted extensions', () => {
            expect(
                EvidenceFileRules.Validate({
                    FileName: 'policy.PDF',
                    SizeBytes: 1024,
                    FirstBytes: ascii('%PDF-1.4\n'),
                })
            ).toEqual({ Allowed: true, Kind: 'Pdf' });

            expect(
                EvidenceFileRules.Validate({
                    FileName: 'bylaws.docx',
                    SizeBytes: 1024,
                    FirstBytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]),
                })
            ).toEqual({ Allowed: true, Kind: 'Word' });

            expect(
                EvidenceFileRules.Validate({
                    FileName: 'budget.xlsx',
                    SizeBytes: 1024,
                    FirstBytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14]),
                })
            ).toEqual({ Allowed: true, Kind: 'Spreadsheet' });

            expect(
                EvidenceFileRules.Validate({
                    FileName: 'readme.txt',
                    SizeBytes: 20,
                    FirstBytes: ascii('Plain text content'),
                })
            ).toEqual({ Allowed: true, Kind: 'Text' });

            expect(
                EvidenceFileRules.Validate({
                    FileName: 'readme.md',
                    SizeBytes: 20,
                    FirstBytes: ascii('# Heading\nBody'),
                })
            ).toEqual({ Allowed: true, Kind: 'Text' });

            expect(
                EvidenceFileRules.Validate({
                    FileName: 'page.png',
                    SizeBytes: 200,
                    FirstBytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]),
                })
            ).toEqual({ Allowed: true, Kind: 'Image' });

            expect(
                EvidenceFileRules.Validate({
                    FileName: 'page.jpeg',
                    SizeBytes: 200,
                    FirstBytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
                })
            ).toEqual({ Allowed: true, Kind: 'Image' });
        });
    });

    describe('SanitizeName', () => {
        it('strips directory paths and control characters and caps length at 255', () => {
            expect(EvidenceFileRules.SanitizeName('../../etc/bylaws\x00.pdf')).toBe('bylaws.pdf');
            expect(EvidenceFileRules.SanitizeName('C:\\fakepath\\report\n2026.docx')).toBe('report2026.docx');
            const longName = `${'a'.repeat(260)}.pdf`;
            const sanitized = EvidenceFileRules.SanitizeName(longName);
            expect(sanitized.length).toBe(255);
            expect(sanitized.endsWith('.pdf')).toBe(true);
        });
    });

    describe('CanSupersede', () => {
        it('refuses when frozen by a live non-Draft application', () => {
            expect(
                EvidenceFileRules.CanSupersede({ Status: 'Current' }, ['Withdrawn', 'Submitted'])
            ).toEqual({
                Allowed: false,
                Reason: 'This document is part of a submitted application and cannot be replaced until that review is finished.',
            });
        });

        it('allows replacing when frozen only by Draft, Decided, Closed, or Withdrawn applications, or none', () => {
            expect(
                EvidenceFileRules.CanSupersede({ Status: 'Current' }, ['Draft', 'Decided', 'Closed', 'Withdrawn'])
            ).toEqual({ Allowed: true });
            expect(EvidenceFileRules.CanSupersede(null, [])).toEqual({ Allowed: true });
        });
    });

    describe('CanReattest', () => {
        it('returns Insert when no active attestation exists', () => {
            expect(EvidenceFileRules.CanReattest(null, [])).toEqual({ Allowed: true, Mode: 'Insert' });
            expect(EvidenceFileRules.CanReattest({ IsSuperseded: true }, ['Submitted'])).toEqual({
                Allowed: true,
                Mode: 'Insert',
            });
        });

        it('refuses when frozen by a live non-Draft application', () => {
            expect(
                EvidenceFileRules.CanReattest({ IsSuperseded: false }, ['In Review'])
            ).toEqual({
                Allowed: false,
                Reason: 'This attestation is part of a submitted application and cannot be changed until that review is finished.',
            });
        });

        it('returns SupersedeAndInsert when frozen only by finished applications', () => {
            expect(
                EvidenceFileRules.CanReattest({ IsSuperseded: false }, ['Decided', 'Withdrawn'])
            ).toEqual({
                Allowed: true,
                Mode: 'SupersedeAndInsert',
            });
        });

        it('returns ReplaceUnfrozen when not frozen by any application', () => {
            expect(EvidenceFileRules.CanReattest({ IsSuperseded: false }, [])).toEqual({
                Allowed: true,
                Mode: 'ReplaceUnfrozen',
            });
        });
    });
});
