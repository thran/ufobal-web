import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';

const PLACEHOLDER = '{{ initial_json|safe }}';
const INITIAL_DATA_RE = /<script id="initial-data"[^>]*>([\s\S]*?)<\/script>/;

/**
 * Dev only: index.html holds a Django template placeholder, so in dev the page is rendered here
 * with the initial-data JSON (and Set-Cookie, e.g. csrftoken) taken from Django's `home` view.
 */
export function devInitialData(django: string, skipPrefixes: string[]): Plugin {
  let warned = false;
  const warn = (reason: string) => {
    if (warned) return;
    warned = true;
    console.warn(`[dev-initial-data] ${reason}; initial data will be null`);
  };

  return {
    name: 'dev-initial-data',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const url = req.url ?? '/';
          const pathname = url.split('?')[0];
          const isPage =
            req.method === 'GET' &&
            (req.headers.accept ?? '').includes('text/html') &&
            !path.extname(pathname) &&
            !skipPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
          if (!isPage) return next();

          let json = 'null';
          try {
            const headers: Record<string, string> = {};
            if (req.headers.cookie) headers.cookie = req.headers.cookie;
            const r = await fetch(`${django}/`, { headers, redirect: 'manual' });
            const match = INITIAL_DATA_RE.exec(await r.text());
            if (match && match[1].trim() && !match[1].includes('{{')) json = match[1].trim();
            else warn(`Django response has no initial-data (status ${r.status})`);
            const setCookies = r.headers.getSetCookie();
            if (setCookies.length) res.setHeader('Set-Cookie', setCookies);
          } catch (e) {
            warn(`Django not reachable at ${django} (${e instanceof Error ? e.message : String(e)})`);
          }

          const raw = await fs.readFile(path.resolve(server.config.root, 'index.html'), 'utf-8');
          const html = await server.transformIndexHtml(url, raw.replace(PLACEHOLDER, () => json));
          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/html');
          res.end(html);
        } catch (e) {
          next(e);
        }
      });
    },
  };
}
