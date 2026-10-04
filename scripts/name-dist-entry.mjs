/**
 * The builds compile FROM dev.html (the development shell), so Vite names
 * the emitted entry after its input. Hosted deployments expect index.html.
 */
import { renameSync, existsSync } from 'node:fs';

if (existsSync('dist/dev.html')) {
    renameSync('dist/dev.html', 'dist/index.html');
    console.log('[name-dist-entry] dist/dev.html -> dist/index.html');
}
