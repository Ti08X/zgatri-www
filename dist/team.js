(function(){
 const box=document.getElementById('profiles');
 Promise.all([Z.load('team'),Z.load('log'),Z.load('subscriptions'),Z.load('ledger')]).then(([team,log,subs,ledger])=>{
  const frag=document.createDocumentFragment();
  team.forEach(m=>{
   const art=Z.el('article','profile rv'+(m.human?' human':''));art.id=m.id;

   // Portrait: drop an image into /img/ and put its path in team.json.
   const frame=Z.el('div','portrait');
   const empty=()=>{frame.classList.add('empty');frame.prepend(Z.el('span','portrait-name',m.name.slice(0,1)),Z.el('span','portrait-note','立绘待上传'));};
   // A path may be filled in before the file exists; fall back to the placeholder until it does.
   if(m.portrait){const img=Z.el('img');img.alt=m.name+' 的立绘';img.decoding='async';img.addEventListener('error',()=>{img.remove();empty();},{once:true});img.src=m.portrait;frame.append(img);}
   else empty();
   frame.append(Z.el('span','portrait-no','NO. '+m.no));

   const body=Z.el('div','profile-body');
   body.append(Z.el('p','role',m.role),Z.el('h2',null,m.name),Z.el('p','profile-tag',m.tagline));

   const duties=Z.el('ul','duties');m.duties.forEach(d=>duties.append(Z.el('li',null,d)));

   // Monthly cost: an explicit number in team.json wins; otherwise sum the subscriptions this member uses.
   const mine=subs.filter(s=>s.active&&s.usedBy.includes(m.id));
   const shared=mine.reduce((t,s)=>t+Z.monthly(s,ledger.usdToCny)/s.usedBy.length,0);
   const facts=Z.el('dl','facts');
   const fact=(label,value)=>{const d=Z.el('div');const dd=Z.el('dd');dd.append(value);d.append(Z.el('dt',null,label),dd);facts.append(d);};
   fact('状态',m.status||Z.todo());
   if(!m.human)fact('模型',m.model||Z.todo());
   fact('入职',m.since||Z.todo());
   fact('每月花费',typeof m.monthlyCost==='number'?Z.cny(m.monthlyCost):mine.length?Z.cny(shared)+'（按在用订阅均摊'+(mine.some(s=>s.sample)?'，含示例':'')+'）':Z.todo());
   fact('在用订阅',mine.length?mine.map(s=>s.name).join('、'):Z.todo('暂无'));

   body.append(Z.el('h3','mini','负责什么'),duties,facts);

   const recent=log.filter(e=>e.who===m.id).sort(Z.byNewest).slice(0,3);
   body.append(Z.el('h3','mini','最近干了什么'));
   if(recent.length){
    const list=Z.el('ol','log-list');
    recent.forEach(e=>{const li=Z.logItem(e,team);li.prepend(Z.el('time','log-date',e.date.slice(5).replace('-','.')));list.append(li);});
    body.append(list);
   }else body.append(Z.todo('还没有记录'));

   art.append(frame,body);frag.append(art);
  });
  box.replaceChildren(frag);Z.reveal(box);
  if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView();
 }).catch(()=>Z.fail(box,'伙伴档案'));
})();
