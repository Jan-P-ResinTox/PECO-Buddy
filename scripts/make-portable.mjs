/**
 * Portable-bundle post-processor.
 *
 * The single-file build inlines the app as <script type="module">, but some
 * browsers refuse to execute ANY module script on file:// (the double-click
 * distribution model). The bundle is verified to contain no import/export/
 * import.meta, so it is rewritten as a CLASSIC script wrapped in an IIFE —
 * identical semantics, module-like scoping, and it executes on file:// in
 * every major browser. The esm.sh import map (only needed by the unbuilt
 * source-folder mode) is stripped so no browser trips on it.
 */
import { readFileSync, writeFileSync, renameSync, copyFileSync } from 'node:fs';

const BUNDLE = 'dist-portable/dev.html'; // Vite names the single-file output after its input
const MODULE_OPEN = '<script type="module" crossorigin>';

let html = readFileSync(BUNDLE, 'utf8');

// 1. Drop the import map — unused by the bundled app, and some browsers
//    complain about it on file:// origins.
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '');

// 2. Module script -> classic IIFE script.
const openIdx = html.indexOf(MODULE_OPEN);
if (openIdx === -1) {
    console.error('[make-portable] inline module script not found — plugin output changed?');
    process.exit(1);
}
const closeIdx = html.indexOf('</script>', openIdx);
if (closeIdx === -1) {
    console.error('[make-portable] closing tag for the inline bundle not found.');
    process.exit(1);
}
html = html.slice(0, openIdx)
    + '<script>\n(function(){\n'
    + html.slice(openIdx + MODULE_OPEN.length, closeIdx)
    + '\n})();\n'
    + html.slice(closeIdx);

// 3. Safety net: an embedded "</script>" inside the bundle would terminate
//    the tag early. Escape any occurrence (verified none today; guard anyway).
const inlineStart = html.indexOf('<script>\n(function(){\n');
const inlineEnd = html.indexOf('\n})();\n', inlineStart);
const body = html.slice(inlineStart, inlineEnd);
if (body.includes('</script>')) {
    html = html.slice(0, inlineStart) + body.split('</script>').join('<\\/script>') + html.slice(inlineEnd);
    console.warn('[make-portable] escaped embedded </script> sequences in the bundle.');
}

writeFileSync(BUNDLE, html);

// 4. Unmistakable filename in the send-zip, AND the project-root index.html
//    becomes the same self-contained app — the folder IS the application:
//    copy it, zip it, double-click its root index.html. (The development
//    shell lives in dev.html; it is a source file, not the runnable app.)
renameSync(BUNDLE, 'dist-portable/PECO-Buddy.html');
copyFileSync('dist-portable/PECO-Buddy.html', 'index.html');
console.log('[make-portable] bundle published as dist-portable/PECO-Buddy.html and as the project-root index.html — runs on file:// everywhere.');
