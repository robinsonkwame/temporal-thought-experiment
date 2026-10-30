/// <reference types="vitest" />
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/**
 * Plain `vite` serves /api from the same handlers as the Netlify Functions, over an in-memory store,
 * so the app can be tried without the Netlify CLI. Under `netlify dev` the real functions answer first.
 */
function devApi(): Plugin {
  const mem = new Map<string, string>();
  const store = {
    get: async (k: string) => (mem.has(k) ? JSON.parse(mem.get(k)!) : null),
    setJSON: async (k: string, v: unknown) => { mem.set(k, JSON.stringify(v)); },
    delete: async (k: string) => { mem.delete(k); },
  };
  return {
    name: 'tte-dev-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (!url.pathname.startsWith('/api/runs')) return next();
        const api = await server.ssrLoadModule('/netlify/lib/api.ts');
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const body = chunks.length ? Buffer.concat(chunks) : undefined;
        const request = new Request(url, {
          method: req.method,
          headers: Object.entries(req.headers).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : [])),
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
        });
        const id = url.pathname.match(/^\/api\/runs\/([^/]+)$/)?.[1];
        const response: Response = url.pathname === '/api/runs' ? await api.handleRuns(request, store) : await api.handleRun(request, store, id);
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(Buffer.from(await response.arrayBuffer()));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
  },
});
