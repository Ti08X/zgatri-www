(function(){
 if(location.protocol==='file:')return;
 const panel=document.getElementById('notebook-card');
 const list=panel.querySelector('.recent-posts');
 let lastRead=0,loading=false;
 function render(data){
  if(!Array.isArray(data?.posts)||!data.posts.length)return false;
  const posts=data.posts.slice(0,3).filter(post=>{try{const u=new URL(post.url);return u.origin==='https://blog.zgatri.com'&&u.pathname.startsWith('/posts/')&&!u.username&&!u.password&&typeof post.title==='string'&&Number.isFinite(Date.parse(post.publishedAt));}catch{return false;}});
  if(!posts.length)return false;
  const fingerprint=JSON.stringify(posts.map(p=>[p.url,p.title,p.publishedAt]));
  if(list.dataset.fingerprint===fingerprint)return true;
  const fragment=document.createDocumentFragment();
  posts.forEach((post,i)=>{
   const a=document.createElement('a');a.className='article-link';a.href=post.url;a.target='_blank';a.rel='noopener';a.title=post.title;
   const number=document.createElement('span');number.className='article-number';number.textContent=String(i+1).padStart(2,'0');
   const body=document.createElement('span');body.className='article-body';
   const meta=document.createElement('time');meta.dateTime=post.publishedAt;meta.textContent=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(post.publishedAt));
   const title=document.createElement('span');title.className='article-title';title.textContent=post.title;
   const arrow=document.createElement('span');arrow.className='article-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
   body.append(meta,title);a.append(number,body,arrow);fragment.append(a);
  });
  list.replaceChildren(fragment);list.dataset.fingerprint=fingerprint;return true;
 }
 async function read(url){const response=await fetch(url,{signal:AbortSignal.timeout(6000)});if(!response.ok)throw Error('Feed unavailable');return response.json();}
 async function update(){
  if(loading||Date.now()-lastRead<5*60*1000)return;
  loading=true;
  try{if(!render(await read('/api/latest-posts')))throw Error('Invalid feed');lastRead=Date.now();}
  catch{try{render(await read('/blog-latest.json'));}catch{/* Existing real article links remain usable. */}lastRead=Date.now();}
  finally{loading=false;}
 }
 update();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
 setInterval(()=>{if(!document.hidden&&panel.getAttribute('aria-hidden')!=='true')update();},60000);
})();
