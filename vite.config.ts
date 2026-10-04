import path from 'path';
import { defineConfig, loadEnv } from 'vite';


/**
 * HOSTED build + dev server.
 *
 * The development shell lives in dev.html (the project-root index.html is
 * the generated portable app, not a source file). Both this config and the
 * portable config build FROM dev.html; `npm run build:portable` additionally
 * publishes the single-file bundle as the root index.html.
 */
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: './',
      build: {
        rollupOptions: {
          input: path.resolve(__dirname, 'dev.html')
        }
      },
      server: {
          port: 3000,
          host: '0.0.0.0',
          open: '/dev.html',
        },
      plugins: [],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
