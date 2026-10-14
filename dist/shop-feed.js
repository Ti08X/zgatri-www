(function(){
 if(location.protocol==='file:')return;
 const panel=document.getElementById('store-card'),list=panel.querySelector('.store-categories');
 const storeUrl='https://catfk.com/shop/zgatri';
 function displayName(category){
  if(/^chatgpt$/i.test(category.name))return 'ChatGPT';
  if(/^gemini$/i.test(category.name))return 'Gemini';
  if(/^claude$/i.test(category.name))return 'Claude';
  if(/codex/i.test(category.name)&&/接码|登录验证|验证码/i.test(category.name))return 'Codex 接码';
  return category.name;
 }
 let loading=false,lastRead=0;
 function render(data){
  if(data?.version!==1||!Array.isArray(data.categories)||data.categories.length>6)return false;
  const categories=data.categories.filter(c=>{try{const u=new URL(c.url);return u.href===storeUrl&&typeof c.name==='string'&&c.name.length>0&&Number.isInteger(c.productCount)&&c.productCount>0&&['ai','services'].includes(c.group);}catch{return false;}});
  if(categories.length!==data.categories.length)return false;
  if(['ai','services'].some(group=>categories.filter(c=>c.group===group).length>3))return false;
  const slots=['ai','services'].flatMap(group=>{const items=categories.filter(c=>c.group===group);return Array.from({length:3},(_,i)=>items[i]);});
  const fingerprint=JSON.stringify(slots);
  if(list.dataset.fingerprint===fingerprint)return true;
  const fragment=document.createDocumentFragment();
  for(let i=0;i<6;i++){
   const c=slots[i],el=document.createElement(c?'a':'div');el.className='shop-category'+(c?'':' is-empty');
   if(c){el.href=c.url;el.target='_blank';el.rel='noopener';el.title=c.name+' · '+c.productCount+' 种商品';}
   const fallback=document.createElement('span');fallback.className='category-fallback';fallback.textContent=c?'◇':'＋';fallback.setAttribute('aria-hidden','true');
   let icon;
   try{const u=new URL(c?.icon);if(u.origin==='https://shop.zgatri.com'&&u.pathname.startsWith('/uploads/category/')&&!u.username&&!u.password&&!u.search&&!u.hash){icon=document.createElement('img');icon.className='category-icon';icon.src=u.href;icon.alt='';icon.decoding='async';icon.addEventListener('error',()=>icon.replaceWith(fallback),{once:true});}}catch{}
   const name=document.createElement('span');name.className='category-name';name.textContent=c?displayName(c):'补货中';
   const count=document.createElement('span');count.className='category-count';count.textContent=c?c.productCount+' 种商品':'COMING SOON';
   el.append(icon||fallback,name,count);fragment.append(el);
  }
  list.replaceChildren(fragment);list.dataset.fingerprint=fingerprint;return true;
 }
 async function read(url){const res=await fetch(url,{signal:AbortSignal.timeout(6000)});if(!res.ok)throw Error('Shop feed unavailable');return res.json();}
 async function update(){if(loading||Date.now()-lastRead<300000)return;loading=true;try{if(!render(await read('/api/shop-categories')))throw Error('Invalid shop feed');}catch{try{render(await read('/shop-categories.json'));}catch{}}finally{lastRead=Date.now();loading=false;}}
 update();document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});setInterval(()=>{if(!document.hidden&&panel.getAttribute('aria-hidden')!=='true')update();},60000);
})();
