import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCategories, refreshShopSnapshot, shopResponse, SHOP_CACHE_KEY, CATFK_STORE_URL, validShopSnapshot, categoryGroup } from '../lib/shop-cache.mjs';

const categories = [
  { id: 16398, name: 'chatgpt', image: '', goods_count: 5 },
  { id: 16413, name: '【一次接码】Codex 登录验证 稳定高效', image: '', goods_count: 1 },
  { id: 16669, name: 'Claude', image: '', goods_count: 2 },
  { id: 19560, name: 'Gemini', image: '', goods_count: 1 },
  { id: 20000, name: '即将上新', image: '', goods_count: 0 },
];
const icons = [
  { slug: 'chatgpt', icon: '/uploads/category/chatgpt.png' },
  { slug: 'codex', icon: '/uploads/category/codex.png' },
  { slug: 'claude', icon: '/uploads/category/claude.png' },
  { slug: 'gemini', icon: '/uploads/category/gemini.png' },
];
const snapshot = { version: 1, updatedAt: '2026-10-10T00:00:00Z', categories: selectCategories(categories, icons) };

function memory(value = snapshot) {
  return {
    value,
    writes: [],
    async get(key) { assert.equal(key, SHOP_CACHE_KEY); return this.value; },
    async put(key, text, ...extra) { assert.equal(key, SHOP_CACHE_KEY); assert.equal(extra.length, 0); this.value = JSON.parse(text); this.writes.push(text); },
  };
}

function fetcherFor(catData = categories, iconData = icons) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/shopApi/Shop/categoryList')) return Response.json({ code: 1, data: catData });
    return Response.json({ status_code: 0, data: iconData });
  };
  return { calls, fetcher };
}

test('selects populated CatFK categories, groups AI brands and phone verification correctly, and maps original icons', () => {
  assert.deepEqual(snapshot.categories.map(c => c.name), ['chatgpt', 'Claude', 'Gemini', '【一次接码】Codex 登录验证 稳定高效']);
  assert.deepEqual(snapshot.categories.map(c => c.group), ['ai', 'ai', 'ai', 'services']);
  assert.deepEqual(snapshot.categories.map(c => c.productCount), [5, 2, 1, 1]);
  assert.ok(snapshot.categories.every(c => c.url === CATFK_STORE_URL));
  assert.equal(snapshot.categories[0].icon, 'https://shop.zgatri.com/uploads/category/chatgpt.png');
  assert.equal(snapshot.categories[3].icon, 'https://shop.zgatri.com/uploads/category/codex.png');
});

test('omits empty and duplicate categories and uses neutral icons for untrusted icon URLs', () => {
  assert.equal(selectCategories(categories.concat(categories[0]), [{ slug: 'chatgpt', icon: 'https://evil.example/icon.png' }]).length, 4);
  assert.equal(selectCategories(categories.filter(c => c.goods_count === 0)).length, 0);
  assert.ok(validShopSnapshot({ ...snapshot, categories: [] }));
  assert.equal(selectCategories([{ id: 1, name: 'Gemini', goods_count: 2, image: 'https://evil.example/icon.png' }])[0].icon, '');
  assert.equal(validShopSnapshot({ ...snapshot, categories: [{ ...snapshot.categories[0], url: 'https://shop.zgatri.com/categories/chatgpt' }] }), false);
});

test('refresh posts to CatFK and stores actual category counts with legacy brand icons', async () => {
  const kv = memory(null);
  const { calls, fetcher } = fetcherFor();
  const next = await refreshShopSnapshot(kv, { fetcher, now: Date.parse('2026-10-14T12:00:00Z') });
  assert.equal(calls.length, 2);
  const catalogCall = calls.find(c => c.url.includes('/shopApi/Shop/categoryList'));
  assert.equal(catalogCall.init.method, 'POST');
  assert.deepEqual(JSON.parse(catalogCall.init.body), { token: 'zgatri', goods_type: 'card' });
  assert.deepEqual(next.categories.map(c => c.name), ['chatgpt', 'Claude', 'Gemini', '【一次接码】Codex 登录验证 稳定高效']);
  assert.equal(next.categories[0].productCount, 5);
  assert.equal(kv.writes.length, 1);
});

test('icon-source failure does not hide valid CatFK categories', async () => {
  const kv = memory(null);
  const next = await refreshShopSnapshot(kv, { fetcher: async url => String(url).includes('/shopApi/Shop/categoryList') ? Response.json({ code: 1, data: categories }) : new Response('unavailable', { status: 503 }) });
  assert.equal(next.categories.length, 4);
  assert.ok(next.categories.every(c => c.icon === ''));
});

test('failed or malformed CatFK refresh retains the previous snapshot', async () => {
  for (const fetcher of [
    async () => { throw Error('offline'); },
    async url => String(url).includes('/shopApi/Shop/categoryList') ? new Response('{') : Response.json({ status_code: 0, data: icons }),
    async url => String(url).includes('/shopApi/Shop/categoryList') ? Response.json({ code: 2, data: categories }) : Response.json({ status_code: 0, data: icons }),
  ]) {
    const kv = memory();
    await assert.rejects(refreshShopSnapshot(kv, { fetcher }));
    assert.deepEqual(kv.value, snapshot);
    assert.equal(kv.writes.length, 0);
  }
});

test('a confirmed empty CatFK catalogue writes an empty category set', async () => {
  const kv = memory();
  const { fetcher } = fetcherFor([]);
  await refreshShopSnapshot(kv, { fetcher });
  assert.deepEqual(kv.value.categories, []);
});

test('API serves a valid cached snapshot and reports unavailable storage', async () => {
  assert.equal((await shopResponse(memory(), { now: Date.parse(snapshot.updatedAt) + 86400000 })).headers.get('X-Shop-Cache'), 'stale');
  assert.equal((await shopResponse(null)).status, 503);
});

test('AI account categories and phone-verification categories stay in their intended groups', () => {
  assert.equal(categoryGroup({ name: 'Gemini' }), 'ai');
  assert.equal(categoryGroup({ name: '【一次接码】Codex 登录验证 稳定高效' }), 'services');
  assert.equal(categoryGroup({ slug: 'codex' }, [{ title: { 'zh-CN': 'Codex 手机验证码｜美国 +1 实体卡号｜首次登录专用' } }]), 'services');
  assert.equal(categoryGroup({ slug: 'codex' }, [{ title: { 'zh-CN': 'Codex Pro 订阅' } }]), 'ai');
});
