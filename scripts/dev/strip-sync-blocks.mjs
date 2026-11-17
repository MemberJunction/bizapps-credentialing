#!/usr/bin/env node
/**
 * Removes the `sync` blocks that `mj sync push` writes into metadata record files, and changes
 * nothing else, so a push leaves no diff to commit and no uncommitted edit is lost.
 *
 * Where the blocks come from (MemberJunction v6.2.2, packages/MetadataSync):
 * - `PushService` sets `record.sync = { lastModified, checksum }` on every record it creates or
 *   changes (services/PushService.ts, "Sync metadata handling"), including the records nested under
 *   a record's `relatedEntities` (and `collections` / `embeds`), which it pushes the same way.
 * - `JsonWriteHelper` then writes the file as `JSON.stringify(data, null, 2)` with no trailing
 *   newline (lib/json-write-helper.ts).
 *
 * A record is an object with a `fields` property; only such objects lose their `sync` property, so
 * a field that happens to be named `sync` (inside `fields`) is never touched. Configuration files
 * (`.mj-sync.json`) are never touched. A file with sync blocks is rewritten with 2-space
 * indentation and the trailing-newline state of its committed version (read with
 * `git show HEAD:<path>`, which only reads); a file new to git gets a trailing newline. The push also
 * rewrites unchanged record files and drops their final newline; for those only that character is
 * restored, nothing else is rewritten.
 *
 * Usage: node scripts/dev/strip-sync-blocks.mjs [dir ...]   (default: metadata metadata-tests)
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const dirs = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['metadata', 'metadata-tests'];

/** @param {string} dir @returns {string[]} */
function jsonFiles(dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            out.push(...jsonFiles(full));
        } else if (name.endsWith('.json') && name !== '.mj-sync.json') {
            out.push(full);
        }
    }
    return out;
}

/**
 * Deletes `sync` from every record object (one with a `fields` property) at any depth.
 * @param {unknown} node
 * @returns {number} how many blocks were removed
 */
function strip(node) {
    let removed = 0;
    if (Array.isArray(node)) {
        for (const item of node) removed += strip(item);
    } else if (node !== null && typeof node === 'object') {
        const obj = /** @type {Record<string, unknown>} */ (node);
        if ('fields' in obj && 'sync' in obj) {
            delete obj.sync;
            removed++;
        }
        for (const [key, value] of Object.entries(obj)) {
            if (key !== 'fields') removed += strip(value);
        }
    }
    return removed;
}

/** @param {string} file @returns {boolean} whether the committed version ends with a newline */
function committedEndsWithNewline(file) {
    const rel = relative(repoRoot, resolve(file)).split('\\').join('/');
    try {
        const committed = execFileSync('git', ['show', `HEAD:${rel}`], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        return committed.endsWith('\n');
    } catch {
        return true;
    }
}

let filesChanged = 0;
let blocksRemoved = 0;
for (const dir of dirs) {
    const root = resolve(repoRoot, dir);
    for (const file of jsonFiles(root)) {
        const text = readFileSync(file, 'utf8');
        const wantNewline = committedEndsWithNewline(file);
        const data = text.includes('"sync"') ? JSON.parse(text) : null;
        const removed = data === null ? 0 : strip(data);
        if (removed > 0) {
            const body = JSON.stringify(data, null, 2);
            writeFileSync(file, wantNewline ? `${body}\n` : body, 'utf8');
            filesChanged++;
            blocksRemoved += removed;
            console.log(`${relative(repoRoot, file)}: removed ${removed} sync block(s)`);
        } else if (wantNewline !== text.endsWith('\n')) {
            // The push rewrote the file without a sync block and dropped (or added) the final
            // newline: restore only that character.
            writeFileSync(file, wantNewline ? `${text}\n` : text.replace(/\n$/, ''), 'utf8');
            filesChanged++;
            console.log(`${relative(repoRoot, file)}: restored the final newline`);
        }
    }
}
console.log(`Removed ${blocksRemoved} sync block(s); rewrote ${filesChanged} file(s).`);
