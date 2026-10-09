import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed, refreshSnapshot, blogResponse, CACHE_KEY, REFRESH_MS } from '../lib/blog-cache.mjs';
import worker from '../cloudflare/blog-sync/worker.mjs';
const article = (n, day, link=`https://blog.zgatri.com/posts/p${n}/`) => `<item><title>Article ${n} &amp; notes</title><link>${link}</link><description><![CDATA[<b>Useful</b> &amp; plain text]]></description><pubDate>${new Date(`2026-10-${day}T00:00:00Z`).toUTCString()}</pubDate></item>`;
const feed = items => `<rss version="2.0"><channel>${items}</channel></rss>`;
const xml = feed(article(1,'01')+article(3,'03')+article(2,'02')+article(4,'04'));
const snapshot = { version:1, updatedAt:'2026-10-10T00:00:00.000Z', posts:parseFeed(xml), etag:'"abc"' };
function memory(value = snapshot) { const writes=[]; return { writes, value, async get(key) { assert.equal(key,CACHE_KEY); return this.value; }, async put(key,text,...extra) { assert.equal(key,CACHE_KEY); assert.equal(extra.length,0); this.value=JSON.parse(text); writes.push(text); } }; }

test('RSS is sorted by date, decoded, deduplicated and limited to 3 real blog posts',()=>{
 const result=parseFeed(feed(article(1,'01')+article(3,'03')+article(3,'03')+article(2,'02')+article(4,'04')+article(5,'05','https://evil.example/posts/fake/')));
 assert.deepEqual(result.map(p=>p.title),['Article 4 & notes','Article 3 & notes','Article 2 & notes']);
 assert.equal(result[0].excerpt,'Useful & plain text');
});
test('malformed, empty and entity-declaring feeds cannot replace the cache',()=>{
 for(const xml of ['<rss>','<rss><channel/></rss>','<!DOCTYPE rss><rss/>',feed(article(1,'01','javascript:alert(1)'))])assert.throws(()=>parseFeed(xml));
});
test('successful refresh stores a snapshot without expiring the last good data',async()=>{
 const kv=memory(null);const value=await refreshSnapshot(kv,{now:Date.parse(snapshot.updatedAt),fetcher:async()=>new Response(xml,{headers:{etag:'"new"'}})});
 assert.equal(value.posts.length,3);assert.equal(kv.writes.length,1);assert.equal(value.etag,'"new"');
});
test('304 reuses articles and advances the freshness time with conditional headers',async()=>{
 const kv=memory();const now=Date.parse(snapshot.updatedAt)+REFRESH_MS;
 const value=await refreshSnapshot(kv,{now,fetcher:async(url,options)=>{assert.equal(options.headers['If-None-Match'],'"abc"');assert.equal(url,'https://blog.zgatri.com/rss.xml');return new Response(null,{status:304});}});
 assert.deepEqual(value.posts,snapshot.posts);assert.equal(Date.parse(value.updatedAt),now);
});
test('network, HTTP and parse failures preserve the previous cache exactly',async()=>{
 for(const fetcher of [async()=>{throw Error('offline');},async()=>new Response('broken',{status:500}),async()=>new Response('<rss>')]){
  const kv=memory();await assert.rejects(refreshSnapshot(kv,{fetcher}));assert.deepEqual(kv.value,snapshot);assert.equal(kv.writes.length,0);
 }
});
test('API serves old articles after a failed refresh; missing binding falls back explicitly',async()=>{
 const response=await blogResponse(memory(),{now:Date.parse(snapshot.updatedAt)+REFRESH_MS+1});
 assert.equal(response.status,200);assert.equal(response.headers.get('X-Blog-Cache'),'stale');const data=await response.json();assert.equal(data.etag,undefined);assert.equal(data.posts.length,3);
 assert.equal((await blogResponse(null)).status,503);assert.equal((await blogResponse(memory(null))).status,503);
});
test('scheduled handler refreshes independent keys even when one source fails',async()=>{
 const oldFetch=globalThis.fetch, values=new Map(), kv={async get(key){return values.get(key)||null;},async put(key,text){values.set(key,JSON.parse(text));}};
 try {
  globalThis.fetch=async url=>url.includes('/rss.xml')?new Response(xml):Response.json(url.endsWith('/categories')?{status_code:0,data:[]}:{status_code:0,data:[],pagination:{total:0,total_page:0}});
  await worker.scheduled({}, {BLOG_CACHE:kv});assert.equal(values.size,2);
  const oldShop=values.get('shop-categories:v1');
  globalThis.fetch=async url=>url.includes('/rss.xml')?new Response(xml):new Response('bad',{status:502});
  await assert.rejects(worker.scheduled({}, {BLOG_CACHE:kv}));assert.deepEqual(values.get('shop-categories:v1'),oldShop);
 } finally {globalThis.fetch=oldFetch;}
});
