import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.resolve(HERE, '..', '__fixtures__');
const GENERATOR = path.resolve(HERE, '..', '..', '..', '..', '..', 'scripts', 'dev', 'make-evidence-fixtures.mjs');

/** The names of the evidence fixtures (`scripts/dev/make-evidence-fixtures.mjs`). */
export type FixtureName =
    | 'two-page-text.pdf'
    | 'scanned-page.pdf'
    | 'printed-paragraph.png'
    | 'review-notes.docx'
    | 'review-log.xlsx'
    | 'review-notes.txt'
    | 'not-a-pdf.pdf'
    | 'inflation-bomb.docx';

/** The bytes of one fixture; the inflation bomb (not committed) is generated on first use. */
export function Fixture(name: FixtureName): Buffer {
    const file = path.join(FIXTURE_DIR, name);
    if (!existsSync(file)) {
        execFileSync(process.execPath, [GENERATOR, '--only', name], { stdio: 'ignore' });
    }
    return readFileSync(file);
}
