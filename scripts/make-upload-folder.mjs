/**
 * Mirrors every git-tracked file into git-upload/ — exactly the set that
 * belongs in the repository, and nothing else (no node_modules, no build
 * outputs). Run after committing changes: npm run upload-folder.
 */
import { mkdirSync, rmSync, cpSync } from 'node:fs';
import { execSync } from 'node:child_process';

const TARGET = 'git-upload';
rmSync(TARGET, { recursive: true, force: true });

const files = execSync('git ls-files').toString().trim().split('\n').filter(Boolean);
for (const f of files) {
    const dir = f.includes('/') ? f.slice(0, f.lastIndexOf('/')) : '.';
    mkdirSync(`${TARGET}/${dir}`, { recursive: true });
    cpSync(f, `${TARGET}/${f}`);
}
console.log(`[upload-folder] ${files.length} tracked files mirrored into ${TARGET}/`);
