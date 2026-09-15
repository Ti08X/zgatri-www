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
console.log(`PASS: local assets, navigation anchors, h1 and deployment files. Total static size: ${bytes} bytes.`);
