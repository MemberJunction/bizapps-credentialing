#!/usr/bin/env node
/**
 * Writes the evidence fixture files used by the text-extraction unit tests and the evidence
 * integration checks into `packages/Server/src/evidence/__fixtures__/`. Every file holds invented
 * sample content only and is generated here, with no dependency beyond Node itself, so the files
 * can be reproduced byte for byte.
 *
 * - `two-page-text.pdf`     a PDF with a text layer on two pages
 * - `scanned-page.pdf`      a PDF with one page that is only an image (no text layer)
 * - `printed-paragraph.png` a PNG of a printed paragraph (the same raster as the scanned page)
 * - `review-notes.docx`     a Word document
 * - `review-log.xlsx`       an Excel workbook
 * - `review-notes.txt`      a UTF-8 text file
 * - `not-a-pdf.pdf`         plain text whose name says PDF
 * - `inflation-bomb.docx`   a Word document whose `word/document.xml` inflates to 300 MB of tiny
 *                           paragraphs (millions of XML elements). DEFLATE
 *                           cannot compress better than about 1 000 : 1, so this file is about
 *                           290 KB; it is not committed (`.gitignore`) and is generated on demand
 *                           with `--only inflation-bomb.docx`.
 *
 * Usage:
 *   node scripts/dev/make-evidence-fixtures.mjs                      # every fixture
 *   node scripts/dev/make-evidence-fixtures.mjs --only <file name>   # one fixture
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync, deflateSync } from 'node:zlib';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURE_DIR = path.resolve(SCRIPT_DIR, '..', '..', 'packages', 'Server', 'src', 'evidence', '__fixtures__');

/** Sentences the tests look for; invented sample content. */
export const PAGE_ONE_SENTENCE = 'The practice reviews its written safety policy every twelve months.';
export const PAGE_TWO_SENTENCE = 'Signed minutes of the annual review are kept for seven years.';
export const WORD_SENTENCE = 'The review committee met on the first Monday of March.';
export const SHEET_CELL = 'Signed by the board chair';
export const TEXT_SENTENCE = 'Évaluation annuelle — the practice’s policy is reviewed every twelve months.';
const SCANNED_LINES = ['THE PRACTICE REVIEWS ITS', 'WRITTEN SAFETY POLICY', 'EVERY TWELVE MONTHS.'];
const BOMB_INFLATED_BYTES = 300 * 1024 * 1024;

// ─── PDF ──────────────────────────────────────────────────────────────────

/** Escapes a string for a PDF literal string. */
function pdfString(text) {
  return `(${text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')})`;
}

/**
 * Serializes PDF objects (each a Buffer body without the `n 0 obj` wrapper) with a correct
 * cross-reference table. Object 1 is the catalog.
 */
function buildPdf(objects) {
  const parts = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')];
  const offsets = [];
  let length = parts[0].length;
  objects.forEach((body, i) => {
    offsets.push(length);
    const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), body, Buffer.from('\nendobj\n', 'latin1')]);
    parts.push(chunk);
    length += chunk.length;
  });
  const xrefOffset = length;
  const xref = [`xref\n0 ${objects.length + 1}\n`, '0000000000 65535 f \n', ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('');
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  parts.push(Buffer.from(xref + trailer, 'latin1'));
  return Buffer.concat(parts);
}

function streamObject(dictionary, data) {
  return Buffer.concat([Buffer.from(`<< ${dictionary} /Length ${data.length} >>\nstream\n`, 'latin1'), data, Buffer.from('\nendstream', 'latin1')]);
}

function textContent(lines) {
  const body = lines.map((line, i) => `${i === 0 ? '' : 'T* '}${pdfString(line)} Tj`).join('\n');
  return Buffer.from(`BT\n/F1 12 Tf\n16 TL\n72 720 Td\n${body}\nET`, 'latin1');
}

export function TwoPageTextPdf() {
  const font = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  const page = (contentRef) => `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentRef} 0 R /Resources << /Font << /F1 7 0 R >> >> >>`;
  return buildPdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>', 'latin1'),
    Buffer.from(page(4), 'latin1'),
    streamObject('', textContent(['Sample safety policy review', PAGE_ONE_SENTENCE])),
    Buffer.from(page(6), 'latin1'),
    streamObject('', textContent(['Record keeping', PAGE_TWO_SENTENCE])),
    Buffer.from(font, 'latin1'),
  ]);
}

export function ScannedPagePdf() {
  const raster = renderLines(SCANNED_LINES, 4);
  const rows = [];
  for (let y = 0; y < raster.Height; y++) {
    rows.push(raster.Pixels.subarray(y * raster.Width, (y + 1) * raster.Width));
  }
  const imageData = deflateSync(Buffer.concat(rows));
  const drawWidth = 468;
  const drawHeight = Math.round((raster.Height / raster.Width) * drawWidth);
  const content = Buffer.from(`q\n${drawWidth} 0 0 ${drawHeight} 72 ${720 - drawHeight} cm\n/Im1 Do\nQ`, 'latin1');
  return buildPdf([
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 'latin1'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>', 'latin1'),
    streamObject('', content),
    streamObject(`/Type /XObject /Subtype /Image /Width ${raster.Width} /Height ${raster.Height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, imageData),
  ]);
}

// ─── Raster text (a 5x7 bitmap font, upper case) ──────────────────────────

/** Each glyph is seven rows of five pixels, written as five-character strings. */
const GLYPHS = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

/** Renders upper-case lines as an 8-bit grayscale raster (black text on white), scaled by `scale`. */
function renderLines(lines, scale) {
  const margin = 4 * scale;
  const advance = 6 * scale;
  const lineHeight = 10 * scale;
  const widest = Math.max(...lines.map((l) => l.length));
  const width = margin * 2 + widest * advance;
  const height = margin * 2 + lines.length * lineHeight;
  const pixels = Buffer.alloc(width * height, 0xff);
  lines.forEach((line, row) => {
    [...line].forEach((ch, col) => {
      const glyph = GLYPHS[ch] ?? GLYPHS[' '];
      glyph.forEach((bits, gy) => {
        [...bits].forEach((bit, gx) => {
          if (bit !== '1') return;
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const x = margin + col * advance + gx * scale + dx;
              const y = margin + row * lineHeight + gy * scale + dy;
              pixels[y * width + x] = 0x00;
            }
          }
        });
      });
    });
  });
  return { Width: width, Height: height, Pixels: pixels };
}

function pngChunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const lengthBytes = Buffer.alloc(4);
  lengthBytes.writeUInt32BE(data.length);
  const crcBytes = Buffer.alloc(4);
  crcBytes.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([lengthBytes, typeAndData, crcBytes]);
}

export function PrintedParagraphPng() {
  const raster = renderLines(SCANNED_LINES, 4);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(raster.Width, 0);
  header.writeUInt32BE(raster.Height, 4);
  header[8] = 8; // bit depth
  header[9] = 0; // grayscale
  const rows = [];
  for (let y = 0; y < raster.Height; y++) {
    rows.push(Buffer.from([0]), raster.Pixels.subarray(y * raster.Width, (y + 1) * raster.Width));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── ZIP (DOCX, XLSX) ─────────────────────────────────────────────────────

/**
 * A ZIP archive of `entries` ({ Name, Data } or { Name, Compressed, Crc, Size } for an entry that is
 * already deflated). Every entry is stored with DEFLATE.
 */
function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.Name, 'utf8');
    const compressed = entry.Compressed ?? deflateRawSync(entry.Data, { level: 9 });
    const crc = entry.Crc ?? crc32(entry.Data);
    const size = entry.Size ?? entry.Data.length;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // DEFLATE
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, end]);
}

const xml = (text) => Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${text}`, 'utf8');
const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DOCX_CONTENT_TYPES = xml(
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>',
);
const DOCX_RELS = xml(
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>',
);

export function ReviewNotesDocx() {
  const paragraphs = ['Sample review notes', WORD_SENTENCE].map((t) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`).join('');
  return buildZip([
    { Name: '[Content_Types].xml', Data: DOCX_CONTENT_TYPES },
    { Name: '_rels/.rels', Data: DOCX_RELS },
    { Name: 'word/document.xml', Data: xml(`<w:document xmlns:w="${WORD_NS}"><w:body>${paragraphs}</w:body></w:document>`) },
  ]);
}

/** Deflates `head`, then `unit` repeated to fill `fillBytes`, then `tail` (the inflated text is held once, here). */
function deflateRepeated(head, unit, fillBytes, tail) {
  const repeats = Math.floor(fillBytes / unit.length);
  const inflated = Buffer.concat([head, Buffer.alloc(repeats * unit.length, unit), tail]);
  return { Compressed: deflateRawSync(inflated, { level: 9 }), Crc: crc32(inflated), Size: inflated.length };
}

export function InflationBombDocx() {
  // Millions of tiny paragraphs: every one becomes several parser objects, so the parse needs far
  // more memory than the 300 MB of text (one long text run would not: it parses as one string).
  const head = Buffer.from(`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${WORD_NS}"><w:body>`, 'utf8');
  const unit = Buffer.from('<w:p><w:r><w:t>A</w:t></w:r></w:p>', 'utf8');
  const tail = Buffer.from('</w:body></w:document>', 'utf8');
  const document = deflateRepeated(head, unit, BOMB_INFLATED_BYTES - head.length - tail.length, tail);
  return buildZip([
    { Name: '[Content_Types].xml', Data: DOCX_CONTENT_TYPES },
    { Name: '_rels/.rels', Data: DOCX_RELS },
    { Name: 'word/document.xml', ...document },
  ]);
}

export function ReviewLogXlsx() {
  const sheetNs = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const relNs = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const cell = (ref, text) => `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
  return buildZip([
    {
      Name: '[Content_Types].xml',
      Data: xml(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
          '</Types>',
      ),
    },
    {
      Name: '_rels/.rels',
      Data: xml(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>',
      ),
    },
    {
      Name: 'xl/workbook.xml',
      Data: xml(`<workbook xmlns="${sheetNs}" xmlns:r="${relNs}"><sheets><sheet name="Review log" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    },
    {
      Name: 'xl/_rels/workbook.xml.rels',
      Data: xml(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
          '</Relationships>',
      ),
    },
    {
      Name: 'xl/worksheets/sheet1.xml',
      Data: xml(
        `<worksheet xmlns="${sheetNs}"><sheetData>` +
          `<row r="1">${cell('A1', 'Review')}${cell('B1', 'Outcome')}</row>` +
          `<row r="2">${cell('A2', 'Annual safety policy review')}${cell('B2', SHEET_CELL)}</row>` +
          '</sheetData></worksheet>',
      ),
    },
  ]);
}

export function ReviewNotesText() {
  return Buffer.from(`Sample review notes\n${TEXT_SENTENCE}\n`, 'utf8');
}

export function NotAPdf() {
  return Buffer.from('This is a plain text note, not a PDF document.\n', 'utf8');
}

/** Every fixture by file name. */
export const FIXTURES = {
  'two-page-text.pdf': TwoPageTextPdf,
  'scanned-page.pdf': ScannedPagePdf,
  'printed-paragraph.png': PrintedParagraphPng,
  'review-notes.docx': ReviewNotesDocx,
  'review-log.xlsx': ReviewLogXlsx,
  'review-notes.txt': ReviewNotesText,
  'not-a-pdf.pdf': NotAPdf,
  'inflation-bomb.docx': InflationBombDocx,
};

function main() {
  const onlyIndex = process.argv.indexOf('--only');
  const names = onlyIndex >= 0 ? [process.argv[onlyIndex + 1]] : Object.keys(FIXTURES);
  mkdirSync(FIXTURE_DIR, { recursive: true });
  for (const name of names) {
    const make = FIXTURES[name];
    if (make == null) {
      console.error(`Unknown fixture '${name}'. Known: ${Object.keys(FIXTURES).join(', ')}`);
      process.exit(2);
    }
    const bytes = make();
    writeFileSync(path.join(FIXTURE_DIR, name), bytes);
    console.log(`${name}: ${bytes.length} bytes`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
