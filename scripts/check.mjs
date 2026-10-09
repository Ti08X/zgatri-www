import { readFile, access, readdir, stat } from 'node:fs/promises';
const root = new URL('../dist/', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
  if (link.startsWith('#') && !ids.has(link.slice(1))) throw Error(`Missing anchor: ${link}`);
  if (link.startsWith('/') && link !== '/') await access(new URL(link.slice(1), root));
}
if ((html.match(/<h1\b/g) || []).length !== 1) throw Error('Expected one h1');
for (const file of ['404.html','robots.txt','sitemap.xml','_headers']) await access(new URL(file, root));
let bytes = 0;
for (const file of await readdir(root)) bytes += (await stat(new URL(file, root))).size;

const routes = JSON.parse(await readFile(new URL('_routes.json', root), 'utf8'));
if (routes.version !== 1 || !routes.include.includes('/api/latest-posts') || routes.include.includes('/*')) throw Error('Blog API route must not invoke Functions for every static page');
const { validSnapshot } = await import('../lib/blog-cache.mjs');
if (!validSnapshot(JSON.parse(await readFile(new URL('blog-latest.json', root), 'utf8')))) throw Error('Invalid blog fallback snapshot');
const { validShopSnapshot } = await import('../lib/shop-cache.mjs');
if (!routes.include.includes('/api/shop-categories') || !validShopSnapshot(JSON.parse(await readFile(new URL('shop-categories.json', root),'utf8')))) throw Error('Invalid shop route or fallback');
console.log(`PASS: local assets, navigation anchors, h1 and deployment files. Total static size: ${bytes} bytes.`);
