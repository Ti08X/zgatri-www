import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCategories, refreshShopSnapshot, shopResponse, SHOP_CACHE_KEY, validShopSnapshot, categoryGroup } from '../lib/shop-cache.mjs';
const categories=Array.from({length:9},(_,i)=>({id:i+1,slug:({1:'chatgpt',2:'Muse',3:'gemini'})[i]||'category-'+i,name:{'zh-CN':'Category '+i},sort_order:100-i,icon:'/uploads/category/icon.png'}));
const products=categories.slice(1).map(c=>({id:c.id,category_id:c.id,stock_status:'out_of_stock',title:{'zh-CN':'Pro 订阅'}}));
const snapshot={version:1,updatedAt:'2026-10-10T00:00:00Z',categories:selectCategories(categories,products)};
function memory(value=snapshot){return{value,writes:[],async get(key){assert.equal(key,SHOP_CACHE_KEY);return this.value;},async put(key,text,...extra){assert.equal(key,SHOP_CACHE_KEY);assert.equal(extra.length,0);this.value=JSON.parse(text);this.writes.push(text);}};}
function api(url){return Response.json(url.includes('/categories')?{status_code:0,data:categories}:{status_code:0,data:products,pagination:{total_page:1,total:products.length}});}
test('select three categories per group in shop order, including sold-out listings',()=>{const result=selectCategories(categories,products.concat(products[0]));assert.equal(result.length,6);assert.equal(result[0].id,2);assert.equal(result[0].productCount,1);assert.equal(result[0].icon,'https://shop.zgatri.com/uploads/category/icon.png');});
test('few or no populated categories remain valid and unsafe icon/link values are excluded',()=>{assert.equal(selectCategories(categories,[products[0]]).length,1);assert.equal(selectCategories(categories,[]).length,0);assert.ok(validShopSnapshot({...snapshot,categories:[]}));const c={...categories[1],icon:'https://evil.example/a.png'};assert.equal(selectCategories([c],products)[0].icon,'');assert.equal(selectCategories([{...c,slug:'../admin'}],products).length,0);});
test('refresh fetches all product pages before selecting categories',async()=>{const kv=memory(null);const calls=[];await refreshShopSnapshot(kv,{fetcher:async url=>{calls.push(url);if(url.includes('/categories'))return api(url);const second=url.includes('page=2');return Response.json({status_code:0,data:second?products.slice(4):products.slice(0,4),pagination:{total_page:2,total:products.length}});}});assert.equal(calls.length,3);assert.equal(kv.value.categories.length,6);assert.equal(kv.writes.length,1);});
test('incomplete pagination, malformed JSON and network failures keep last good categories',async()=>{for(const fetcher of [async()=>{throw Error('offline');},async()=>new Response('{'),async url=>url.includes('/categories')?api(url):Response.json({status_code:0,data:products,pagination:{total_page:1,total:99}})]){const kv=memory();await assert.rejects(refreshShopSnapshot(kv,{fetcher}));assert.deepEqual(kv.value,snapshot);assert.equal(kv.writes.length,0);}});
test('empty shop writes empty categories so browser can show six replenishment slots',async()=>{const kv=memory();await refreshShopSnapshot(kv,{fetcher:async url=>Response.json(url.includes('/categories')?{status_code:0,data:categories}:{status_code:0,data:[],pagination:{total:0,total_page:0}})});assert.deepEqual(kv.value.categories,[]);});
test('stale cache remains available and unavailable binding returns 503',async()=>{assert.equal((await shopResponse(memory(),{now:Date.parse(snapshot.updatedAt)+86400000})).headers.get('X-Shop-Cache'),'stale');assert.equal((await shopResponse(null)).status,503);});

test('actual products distinguish AI accounts from standalone phone-verification services',()=>{
 assert.equal(categoryGroup({slug:'codex'},[{title:{'zh-CN':'Codex 手机验证码｜美国 +1 实体卡号｜首次登录专用'}}]),'services');
 assert.equal(categoryGroup({slug:'gemini'},[{title:{'zh-CN':'Jio · Gemini Pro 18个月｜官方活动·直充自己账号'}}]),'ai');
 assert.equal(categoryGroup({slug:'Muse'},[{title:{'zh-CN':'Muse 成品号（微软邮箱·验证码登录）'}}]),'ai');
 assert.equal(categoryGroup({slug:'codex'},[{title:{'zh-CN':'Codex Pro 订阅'}}]),'ai');
 const onlyServices=selectCategories(categories.filter(c=>!['chatgpt','Muse','gemini'].includes(c.slug)),products);
 assert.equal(onlyServices.length,3);assert.ok(onlyServices.every(c=>c.group==='services'));
});
