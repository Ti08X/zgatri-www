import { REFRESH_MS, readBounded } from './blog-cache.mjs';
export const SHOP_ORIGIN = 'https://shop.zgatri.com';
export const SHOP_CACHE_KEY = 'shop-categories:v1';
export const SLOT_COUNT = 6;
export function categoryIcon(value) {
  try { const url = new URL(value, SHOP_ORIGIN); return typeof value === 'string' && url.origin === SHOP_ORIGIN && url.pathname.startsWith('/uploads/category/') && !url.username && !url.password && !url.search && !url.hash ? url.href : ''; } catch { return ''; }
}
const localized = value => typeof value === 'string' ? value : value?.['zh-CN'] || value?.['en-US'] || value?.['zh-TW'] || '';
export function categoryGroup(category, products) {
  const brand = category.slug + ' ' + localized(category.name);
  if (!/chatgpt|gemini|muse|claude|grok|codex/i.test(brand)) return 'services';
  // Account login by SMS is still an AI account; standalone phone-verification services are not.
  const aiListing = products.some(p => {
    const title = localized(p.title) + ' ' + (p.slug || '');
    return !/手机验证码|实体卡号|短信|\bsms\b|接码服务|邀请码助力/i.test(title) && /成品号|账号|订阅|plus|pro|词元|token|会员|直充/i.test(title);
  });
  return aiListing ? 'ai' : 'services';
}
export function selectCategories(categories, products) {
  if (!Array.isArray(categories) || !Array.isArray(products)) throw Error('Invalid shop data');
  const counts = new Map(), seenProducts = new Set(), seenCategories = new Set();
  for (const p of products) if (Number.isSafeInteger(p.id) && !seenProducts.has(p.id)) { seenProducts.add(p.id); counts.set(p.category_id, (counts.get(p.category_id)||0)+1); }
  const eligible = categories.map((c, index) => ({ ...c, index })).sort((a,b)=>(Number(b.sort_order)||0)-(Number(a.sort_order)||0)||a.index-b.index).flatMap(c => {
    const count = counts.get(c.id)||0, name = typeof c.name === 'string' ? c.name : c.name?.['zh-CN'] || c.name?.['en-US'] || c.name?.['zh-TW'];
    if (!count || typeof name !== 'string' || !name.trim() || typeof c.slug !== 'string' || !c.slug || c.slug.length>100 || /[\x00-\x1f/\\?#]/.test(c.slug) || seenCategories.has(c.id)) return [];
    seenCategories.add(c.id);
    return [{ id:c.id, name:name.trim().slice(0,80), url:SHOP_ORIGIN+'/categories/'+encodeURIComponent(c.slug), icon:categoryIcon(c.icon), productCount:count, group:categoryGroup(c, products.filter(p=>p.category_id===c.id)) }];
  });
  return ['ai','services'].flatMap(group => eligible.filter(c=>c.group===group).slice(0,3));
}
export function validShopSnapshot(value) {
  return value?.version===1 && Number.isFinite(Date.parse(value.updatedAt)) && Array.isArray(value.categories) && value.categories.length<=SLOT_COUNT && ['ai','services'].every(group=>value.categories.filter(c=>c.group===group).length<=3) && value.categories.every(c=>{
    try { const u=new URL(c.url); return ['ai','services'].includes(c.group) && Number.isSafeInteger(c.id) && typeof c.name==='string' && c.name.length>0 && c.name.length<=80 && Number.isSafeInteger(c.productCount) && c.productCount>0 && u.origin===SHOP_ORIGIN && u.pathname.startsWith('/categories/') && !u.username && !u.password && !u.search && !u.hash && (c.icon==='' || categoryIcon(c.icon)===c.icon); } catch { return false; }
  });
}
export async function readShopSnapshot(kv) {
  if(!kv)return null;
  const value=await kv.get(SHOP_CACHE_KEY,{type:'json',cacheTtl:60});
  return validShopSnapshot(value)?value:null;
}
export async function refreshShopSnapshot(kv,{fetcher=fetch,now=Date.now()}={}) {
  if(!kv)throw Error('BLOG_CACHE binding is required');
  async function get(route) {
    const res=await fetcher(SHOP_ORIGIN+'/api/v1/public/'+route,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000),redirect:'manual',cache:'no-store'});
    if(!res.ok)throw Error('Shop API returned '+res.status);
    const value=JSON.parse(await readBounded(res,2*1024*1024));
    if(value.status_code!==0 || !Array.isArray(value.data))throw Error('Invalid shop API response');
    return value;
  }
  const [categoryData, first]=await Promise.all([get('categories'),get('products?page=1&page_size=100')]);
  const pages=Number(first.pagination?.total_page), total=Number(first.pagination?.total);
  if(!Number.isSafeInteger(pages)||pages<0||pages>20||!Number.isSafeInteger(total)||total<0)throw Error('Invalid shop pagination');
  const products=[...first.data];
  for(let page=2;page<=pages;page++)products.push(...(await get('products?page='+page+'&page_size=100')).data);
  if(products.length!==total || new Set(products.map(p=>p.id)).size!==total)throw Error('Incomplete product list; retain previous cache');
  const next={version:1,updatedAt:new Date(now).toISOString(),categories:selectCategories(categoryData.data,products)};
  if(!validShopSnapshot(next))throw Error('Invalid categories');
  await kv.put(SHOP_CACHE_KEY,JSON.stringify(next));
  return next;
}
export async function shopResponse(kv,{now=Date.now()}={}) {
  try {
    const value=await readShopSnapshot(kv);
    if(!value)throw Error('Cache unavailable');
    return Response.json(value,{headers:{'Cache-Control':'public, max-age=60, s-maxage=300','X-Shop-Cache':now-Date.parse(value.updatedAt)>REFRESH_MS?'stale':'fresh','X-Content-Type-Options':'nosniff'}});
  } catch { return Response.json({error:'Shop cache is unavailable'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
