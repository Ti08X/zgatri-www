// Shared by every page: the lamp, scroll reveal, and small helpers for the data-driven pages.
window.Z=(function(){
 const root=document.documentElement;

 // Lamp: light theme = lights on, dark theme = lights off.
 const lamp=document.getElementById('lamp'),lampText=document.getElementById('lamp-text');
 const theme=document.querySelector('meta[name="theme-color"]');
 function paintLamp(){
  const dark=root.classList.contains('dark');
  lamp.setAttribute('aria-pressed',String(dark));lampText.textContent=dark?'开灯':'关灯';
  if(theme)theme.content=dark?'#0d0e11':'#f3efe6';
 }
 lamp.addEventListener('click',()=>{root.classList.toggle('dark');try{localStorage.setItem('lamp',root.classList.contains('dark')?'off':'on');}catch{}paintLamp();});
 paintLamp();

 // Reveal on scroll. Call Z.reveal(node) again after rendering new content.
 const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{threshold:.08});
 function reveal(scope){(scope||document).querySelectorAll('.rv:not(.in),.hero:not(.in)').forEach(el=>io.observe(el));}
 reveal();

 function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;}
 async function load(name){const res=await fetch('/data/'+name+'.json',{cache:'no-cache'});if(!res.ok)throw Error('Cannot load '+name);return res.json();}
 const cny=n=>'¥'+(Math.round(n*100)/100).toLocaleString('zh-CN',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2});
 const todo=text=>el('span','todo',text||'待填写');

 // One subscription's cost per month in CNY.
 function monthly(sub,rate){return sub.price*(sub.currency==='USD'?rate:1)/(sub.cycle==='year'?12:1);}

 // A visible warning wherever placeholder rows are on screen, so sample numbers are never mistaken for real ones.
 function sampleNote(target,items){
  if(!items.some(i=>i.sample))return;
  target.append(el('p','sample','这里有示例数据，带“示例”标记的条目不是真实记录。'));
 }
 function fail(target,what){target.replaceChildren(el('p','sample','没能读取'+what+'，请稍后刷新。'));}

 const statusText={done:'完成',doing:'进行中',fail:'翻车'};
 function logItem(entry,team){
  const who=team.find(m=>m.id===entry.who),li=el('li','log-item '+entry.status);
  const head=el('div','log-head');
  head.append(el('b','log-who',who?who.name:entry.who),el('span','log-status',statusText[entry.status]||entry.status));
  if(entry.sample)head.append(el('span','log-sample','示例'));
  if(typeof entry.cost==='number')head.append(el('span','log-cost',cny(entry.cost)));
  const title=entry.link?Object.assign(el('a','log-title',entry.title+' ↗'),{href:entry.link,target:'_blank',rel:'noopener'}):el('p','log-title',entry.title);
  li.append(head,title);
  if(entry.detail)li.append(el('p','log-detail',entry.detail));
  return li;
 }
 const byNewest=(a,b)=>b.date.localeCompare(a.date);

 return{el,load,cny,todo,monthly,sampleNote,fail,logItem,byNewest,reveal};
})();
