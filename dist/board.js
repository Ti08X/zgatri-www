// Homepage extras: Beijing-time clock, latest notes, and the footer lamp.
(function(){
 const clocks=document.querySelectorAll('[data-clock]');
 if(clocks.length){
  const fmt=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false});
  const tick=()=>{const t=fmt.format(new Date());clocks.forEach(c=>{c.textContent=t;});};
  tick();setInterval(tick,15000);
 }

 // Latest three notes from the blog; the static snapshot is the fallback.
 const list=document.getElementById('latest');
 if(list){
  const date=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'});
  const render=data=>{
   const items=(data.posts||[]).slice(0,3);if(!items.length)throw Error('empty');
   list.replaceChildren(...items.map(p=>{
    const li=document.createElement('li'),a=document.createElement('a'),t=document.createElement('time'),b=document.createElement('span');
    a.href=p.url;a.target='_blank';a.rel='noopener';
    t.dateTime=p.publishedAt;t.textContent=date.format(new Date(p.publishedAt)).replace(/\//g,'.').slice(2);
    b.textContent=p.title;a.append(t,b);li.append(a);return li;
   }));
  };
  const get=u=>fetch(u).then(r=>{if(!r.ok)throw Error(r.status);return r.json();});
  get('/api/latest-posts').then(render).catch(()=>get('/blog-latest.json').then(render)).catch(()=>list.remove());
 }

 // The footer switch flips the same lamp as the header button.
 const sw=document.getElementById('switch'),line=document.getElementById('switch-line'),lamp=document.getElementById('lamp');
 if(sw&&lamp){
  const paint=()=>{const dark=document.documentElement.classList.contains('dark');sw.setAttribute('aria-pressed',String(dark));line.textContent=dark?'点一下，开灯':'点一下，关灯';};
  sw.addEventListener('click',()=>{lamp.click();paint();});
  lamp.addEventListener('click',()=>setTimeout(paint));
  paint();
 }
})();
