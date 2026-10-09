import { writeFile } from 'node:fs/promises';
import { refreshSnapshot } from '../lib/blog-cache.mjs';
const kv = { get: async () => null, put: async (_key, value) => writeFile(new URL('../dist/blog-latest.json', import.meta.url), value + '\n') };
const data = await refreshSnapshot(kv);
console.log(`Saved ${data.posts.length} real blog articles to dist/blog-latest.json`);
