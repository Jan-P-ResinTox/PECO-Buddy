import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * PORTABLE build ("zip a folder, unpack, double-click index.html").
 *
 * Everything the app needs from this codebase is inlined into ONE
 * index.html: all modules (app, rigor, terminology, session) plus CSS.
 * An inline, self-contained module script is legal on file:// — no
 * fetches, no CORS, no blank page — so the unpacked folder runs with
 * zero installation and zero server. CDN libraries (Tailwind, fonts,
 * FontAwesome, document tooling) still load over the network, and the
 * browser talks to the configured AI provider and the NLM MeSH
 * endpoint directly, as in the hosted build.
 */
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        base: './',
        plugins: [viteSingleFile()],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            }
        },
        build: {
            outDir: 'dist-portable',
            emptyOutDir: true,
            reportCompressedSize: false,
            rollupOptions: {
                input: path.resolve(__dirname, 'dev.html')
            }
        }
    };
});
