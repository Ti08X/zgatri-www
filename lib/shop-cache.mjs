import { REFRESH_MS, readBounded } from './blog-cache.mjs';

export const SHOP_ORIGIN = 'https://shop.zgatri.com';
export const CATFK_ORIGIN = 'https://catfk.com';
export const CATFK_STORE_URL = `${CATFK_ORIGIN}/shop/zgatri`;
export const SHOP_CACHE_KEY = 'shop-categories:v1';
export const SLOT_COUNT = 6;

export function categoryIcon(value) {
  try {
    const url = new URL(value, SHOP_ORIGIN);
    return typeof value === 'string' && url.origin === SHOP_ORIGIN && url.pathname.startsWith('/uploads/category/') && !url.username && !url.password && !url.search && !url.hash ? url.href : '';
  } catch { return ''; }
}

const localized = value => typeof value === 'string' ? value : value?.['zh-CN'] || value?.['en-US'] || value?.['zh-TW'] || '';

function categoryBrandSlug(category) {
  if (typeof category.slug === 'string' && category.slug) return category.slug;
  const name = localized(category.name);
  if (/chatgpt/i.test(name)) return 'chatgpt';
  if (/claude/i.test(name)) return 'claude';
  if (/codex/i.test(name)) return 'codex';
  if (/gemini/i.test(name)) return 'gemini';
  return '';
}

export function categoryGroup(category, products = []) {
  const brand = `${category.slug || ''} ${localized(category.name)}`;
  if (/手机验证码|实体卡号|短信|\bsms\b|接码|登录验证|验证码/i.test(brand)) return 'services';
  if (/codex/i.test(brand)) {
    const aiListing = products.some(p => {
      const title = `${localized(p.title)} ${p.slug || ''}`;
      return !/手机验证码|实体卡号|短信|\bsms\b|接码服务|邀请码助力/i.test(title) && /成品号|账号|订阅|plus|pro|词元|token|会员|直充/i.test(title);
    });
    return aiListing ? 'ai' : 'services';
  }
  return /chatgpt|gemini|muse|claude|grok/i.test(brand) ? 'ai' : 'services';
}

export function selectCategories(categories, iconCategories = []) {
  if (!Array.isArray(categories) || !Array.isArray(iconCategories)) throw Error('Invalid CatFK category data');
  const iconBySlug = new Map(iconCategories.map(c => [c.slug, categoryIcon(c.icon)]).filter(([slug, icon]) => slug && icon));
  const seen = new Set();
  const eligible = categories.flatMap(c => {
    const name = localized(c.name).trim();
    const productCount = c.goods_count;
    const id = c.id;
    const slug = categoryBrandSlug(c);
    if (!Number.isSafeInteger(id) || seen.has(id) || !Number.isSafeInteger(productCount) || productCount <= 0 || !name || name.length > 100) return [];
    seen.add(id);
    const group = categoryGroup({ slug, name });
    return [{ id, name, url: CATFK_STORE_URL, icon: categoryIcon(c.image) || iconBySlug.get(slug) || '', productCount, group }];
  });
  return ['ai', 'services'].flatMap(group => eligible.filter(c => c.group === group).slice(0, 3));
}

export function validShopSnapshot(value) {
  return value?.version === 1 && Number.isFinite(Date.parse(value.updatedAt)) && Array.isArray(value.categories) && value.categories.length <= SLOT_COUNT && ['ai', 'services'].every(group => value.categories.filter(c => c.group === group).length <= 3) && value.categories.every(c => {
    return ['ai', 'services'].includes(c.group) && Number.isSafeInteger(c.id) && typeof c.name === 'string' && c.name.length > 0 && c.name.length <= 100 && Number.isSafeInteger(c.productCount) && c.productCount > 0 && c.url === CATFK_STORE_URL && (c.icon === '' || categoryIcon(c.icon) === c.icon);
  });
}

export async function readShopSnapshot(kv) {
  if (!kv) return null;
  const value = await kv.get(SHOP_CACHE_KEY, { type: 'json', cacheTtl: 60 });
  return validShopSnapshot(value) ? value : null;
}

async function readJson(fetcher, url, init) {
  const response = await fetcher(url, {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
    signal: AbortSignal.timeout(10000),
    redirect: 'manual',
    cache: 'no-store',
  });
  if (!response.ok) throw Error('Store API returned ' + response.status);
  return JSON.parse(await readBounded(response, 2 * 1024 * 1024));
}

export async function refreshShopSnapshot(kv, { fetcher = fetch, now = Date.now() } = {}) {
  if (!kv) throw Error('BLOG_CACHE binding is required');
  const [catalogResult, iconResult] = await Promise.allSettled([
    readJson(fetcher, CATFK_ORIGIN + '/shopApi/Shop/categoryList', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      body: JSON.stringify({ token: 'zgatri', goods_type: 'card' }),
    }),
    readJson(fetcher, SHOP_ORIGIN + '/api/v1/public/categories', { method: 'GET' }),
  ]);
  if (catalogResult.status === 'rejected') throw catalogResult.reason;
  const catalog = catalogResult.value;
  if (catalog.code !== 1 || !Array.isArray(catalog.data)) throw Error('Invalid CatFK category response');
  const iconData = iconResult.status === 'fulfilled' && iconResult.value.status_code === 0 && Array.isArray(iconResult.value.data) ? iconResult.value.data : [];
  const next = { version: 1, updatedAt: new Date(now).toISOString(), categories: selectCategories(catalog.data, iconData) };
  if (!validShopSnapshot(next)) throw Error('Invalid CatFK category snapshot');
  await kv.put(SHOP_CACHE_KEY, JSON.stringify(next));
  return next;
}

export async function shopResponse(kv, { now = Date.now() } = {}) {
  try {
    const value = await readShopSnapshot(kv);
    if (!value) throw Error('Cache unavailable');
    return Response.json(value, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300', 'X-Shop-Cache': now - Date.parse(value.updatedAt) > REFRESH_MS ? 'stale' : 'fresh', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return Response.json({ error: 'Shop cache is unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
