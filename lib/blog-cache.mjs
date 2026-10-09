import { XMLParser, XMLValidator } from 'fast-xml-parser';

export const FEED_URL = 'https://blog.zgatri.com/rss.xml';
export const CACHE_KEY = 'latest-posts:v1';
export const REFRESH_MS = 12 * 60 * 60 * 1000;
const MAX_BYTES = 512 * 1024;
const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false, trimValues: true });
const decode = text => text.replace(/&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi, (entity, key) => {
  const names = { amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", nbsp:' ' };
  if (key[0] !== '#') return names[key.toLowerCase()] || entity;
  const point = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2),16) : Number(key.slice(1));
  return point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : '';
});
const plain = value => typeof value === 'string' ? decode(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() : '';

export function parseFeed(xml) {
  if (new TextEncoder().encode(xml).length > MAX_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('Unsupported feed');
  if (XMLValidator.validate(xml) !== true) throw Error('Invalid XML');
  const items = parser.parse(xml)?.rss?.channel?.item;
  if (!items) throw Error('Missing RSS items');
  const posts = [], seen = new Set();
  for (const item of Array.isArray(items) ? items : [items]) {
    const title = plain(item.title).slice(0, 240);
    const published = Date.parse(item.pubDate);
    let url;
    try { url = new URL(item.link); } catch { continue; }
    if (!title || !Number.isFinite(published) || url.origin !== 'https://blog.zgatri.com' || !url.pathname.startsWith('/posts/') || url.username || url.password || url.hash || seen.has(url.href)) continue;
    seen.add(url.href);
    posts.push({ title, url: url.href, publishedAt: new Date(published).toISOString(), excerpt: plain(item.description).slice(0, 280) });
  }
  if (!posts.length) throw Error('No valid blog articles');
  return posts.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 3);
}

export function validSnapshot(value) {
  return value?.version === 1 && Number.isFinite(Date.parse(value.updatedAt)) && Array.isArray(value.posts) && value.posts.length > 0 && value.posts.length <= 3 && value.posts.every(p => {
    try { const u = new URL(p.url); return typeof p.title === 'string' && p.title.length > 0 && p.title.length <= 240 && Number.isFinite(Date.parse(p.publishedAt)) && u.origin === 'https://blog.zgatri.com' && u.pathname.startsWith('/posts/') && !u.username && !u.password; } catch { return false; }
  });
}

export async function readSnapshot(kv) {
  if (!kv) return null;
  const value = await kv.get(CACHE_KEY, { type: 'json', cacheTtl: 60 });
  return validSnapshot(value) ? value : null;
}

export async function readBounded(response, maxBytes = MAX_BYTES) {
  if (Number(response.headers.get('content-length')) > maxBytes) throw Error('Feed too large');
  if (!response.body) throw Error('Empty feed');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let length = 0, text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) { await reader.cancel(); throw Error('Feed too large'); }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

export async function refreshSnapshot(kv, { fetcher = fetch, now = Date.now() } = {}) {
  if (!kv) throw Error('BLOG_CACHE binding is required');
  const previous = await readSnapshot(kv);
  const headers = { Accept: 'application/rss+xml, application/xml' };
  if (previous?.etag) headers['If-None-Match'] = previous.etag;
  if (previous?.lastModified) headers['If-Modified-Since'] = previous.lastModified;
  const response = await fetcher(FEED_URL, { headers, signal: AbortSignal.timeout(10000), redirect: 'manual', cache: 'no-store' });
  let next;
  if (response.status === 304 && previous) next = { ...previous, updatedAt: new Date(now).toISOString() };
  else {
    if (!response.ok) throw Error(`Blog RSS returned ${response.status}`);
    next = { version: 1, updatedAt: new Date(now).toISOString(), posts: parseFeed(await readBounded(response)), etag: response.headers.get('etag') || '', lastModified: response.headers.get('last-modified') || '' };
  }
  // Retain the last successful snapshot indefinitely. A failed refresh never deletes it.
  await kv.put(CACHE_KEY, JSON.stringify(next));
  return next;
}

export async function blogResponse(kv, { now = Date.now() } = {}) {
  try {
    const value = await readSnapshot(kv);
    if (!value) return Response.json({ error: 'Blog cache is not ready' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    const stale = now - Date.parse(value.updatedAt) > REFRESH_MS;
    return Response.json({ version: 1, updatedAt: value.updatedAt, posts: value.posts }, { headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300', 'X-Blog-Cache': stale ? 'stale' : 'fresh', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return Response.json({ error: 'Blog cache is unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
