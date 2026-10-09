import http from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { blogResponse, refreshSnapshot, readSnapshot, REFRESH_MS, CACHE_KEY } from '../lib/blog-cache.mjs';
import { shopResponse, refreshShopSnapshot, readShopSnapshot, SHOP_CACHE_KEY } from '../lib/shop-cache.mjs';
const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const cacheDir = fileURLToPath(new URL('../.cache/', import.meta.url));
const cacheFile = key => path.join(cacheDir, key === SHOP_CACHE_KEY ? 'shop-categories.json' : 'blog-latest.json');
const kv = {
  async get(key) { try { return JSON.parse(await readFile(cacheFile(key), 'utf8')); } catch (e) { if (e.code === 'ENOENT' || e instanceof SyntaxError) return null; throw e; } },
  async put(key, value) { await mkdir(cacheDir, { recursive: true }); const temp = path.join(cacheDir, randomUUID()+'.tmp'); await writeFile(temp, value); await rename(temp, cacheFile(key)); },
};
if (!await readSnapshot(kv)) await kv.put(CACHE_KEY, await readFile(path.join(root, 'blog-latest.json'), 'utf8'));
if (!await readShopSnapshot(kv)) await kv.put(SHOP_CACHE_KEY, await readFile(path.join(root, 'shop-categories.json'), 'utf8'));
let refreshing = false;
async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try { const results = await Promise.allSettled([refreshSnapshot(kv), refreshShopSnapshot(kv)]); if (results.some(r=>r.status==='rejected')) throw Error('Content refresh failed'); console.log('Local blog and shop caches updated.'); }
  catch { console.warn('Content refresh failed; retained previous successful snapshots.'); }
  finally { refreshing = false; }
}
const initial = await readSnapshot(kv), initialShop = await readShopSnapshot(kv);
if (!initial || !initialShop || Date.now()-Date.parse(initial.updatedAt)>=REFRESH_MS || Date.now()-Date.parse(initialShop.updatedAt)>=REFRESH_MS) void refresh();
setInterval(refresh, REFRESH_MS).unref();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (['/api/latest-posts','/api/latest-posts/','/api/shop-categories','/api/shop-categories/'].includes(pathname)) {
      if (req.method !== 'GET') { res.writeHead(405, { Allow: 'GET' }); res.end(); return; }
      const response = await (pathname.startsWith('/api/shop-') ? shopResponse(kv) : blogResponse(kv));
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return;
    }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep) || path.basename(file).startsWith('_')) { res.writeHead(404); res.end('Not found'); return; }
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(await readFile(path.join(root, '404.html')));
  }
});
const port = Number(process.env.ZGATRI_PORT || 4173);
server.listen(port, '127.0.0.1', () => console.log(`ZGATRI preview: http://127.0.0.1:${port}`));
