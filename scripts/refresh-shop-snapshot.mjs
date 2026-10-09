import { writeFile } from 'node:fs/promises';
import { refreshShopSnapshot } from '../lib/shop-cache.mjs';
await refreshShopSnapshot({put:async(_key,value)=>writeFile(new URL('../dist/shop-categories.json',import.meta.url),value+'\n')});
console.log('Shop category snapshot updated.');
