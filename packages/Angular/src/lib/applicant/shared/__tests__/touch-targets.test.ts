import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const APPLICANT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function filesUnder(dir: string, ext: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) return name === '__tests__' ? [] : filesUnder(full, ext);
        return full.endsWith(ext) ? [full] : [];
    });
}

/** The `min-height` declared in the first rule for `selector` in a stylesheet, in px. */
function minHeightOf(scssPath: string, selector: string): number | null {
    const css = readFileSync(scssPath, 'utf8');
    const start = css.indexOf(`${selector} {`);
    if (start < 0) return null;
    const block = css.slice(start, css.indexOf('}', start));
    const match = /min-height:\s*(\d+)px/.exec(block);
    return match ? Number(match[1]) : null;
}

describe('applicant screens: 44 px touch targets', () => {
    it('use no small MJ buttons (34 px high)', () => {
        const offenders = filesUnder(APPLICANT_DIR, '.html').filter((f) => /Size="sm"/.test(readFileSync(f, 'utf8')));
        expect(offenders.map((f) => path.relative(APPLICANT_DIR, f))).toEqual([]);
    });

    it('give the runner filters, application picker, citation chips and self-assessment choices 44 px', () => {
        const runner = path.join(APPLICANT_DIR, 'standards-runner', 'standards-runner.page.scss');
        const card = path.join(APPLICANT_DIR, 'standards-runner', 'standard-card.component.scss');
        expect(minHeightOf(runner, '.cred-runner__filter-btn')).toBeGreaterThanOrEqual(44);
        expect(minHeightOf(runner, '.cred-runner__app-select')).toBeGreaterThanOrEqual(44);
        expect(minHeightOf(card, '.cred-card__citation-chip')).toBeGreaterThanOrEqual(44);
        expect(minHeightOf(card, '.cred-card__radio-label')).toBeGreaterThanOrEqual(44);
    });
});
