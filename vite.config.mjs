import { cloudflare } from '@cloudflare/vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  process.env.WRANGLER_LOG_PATH ??= '.wrangler/logs';
  process.env.MINIFLARE_REGISTRY_PATH ??= '.wrangler/registry';

  return {
    publicDir: 'frontend',
    environments: {
      server: {
        build: {
          outDir: 'dist/server',
          rollupOptions: {
            output: { entryFileNames: 'index.js' },
          },
        },
      },
    },
    plugins: [
      cloudflare({
        persistState: { path: '.wrangler/state' },
        viteEnvironment: { name: 'server' },
      }),
    ],
  };
});
