(function(){
 const days=document.getElementById('days'),filters=document.getElementById('filters');
 const week=['周日','周一','周二','周三','周四','周五','周六'];
 Promise.all([Z.load('log'),Z.load('team')]).then(([log,team])=>{
  let who='all';
  function chip(id,label){
   const b=Z.el('button',null,label);b.type='button';b.dataset.who=id;b.setAttribute('aria-pressed',String(id===who));
   b.addEventListener('click',()=>{who=id;[...filters.children].forEach(c=>c.setAttribute('aria-pressed',String(c.dataset.who===who)));draw();});
   return b;
  }
  filters.append(chip('all','全部'),...team.map(m=>chip(m.id,m.name)),chip('fail','只看翻车'));

  function draw(){
   const shown=log.filter(e=>who==='all'||(who==='fail'?e.status==='fail':e.who===who)).sort(Z.byNewest);
   if(!shown.length){days.replaceChildren(Z.todo('这个筛选下还没有记录'));return;}
   const frag=document.createDocumentFragment();
   [...new Set(shown.map(e=>e.date))].forEach(date=>{
    const entries=shown.filter(e=>e.date===date),day=Z.el('section','day rv in');
    const head=Z.el('header','day-head');
    const spent=entries.reduce((t,e)=>t+(typeof e.cost==='number'?e.cost:0),0);
    head.append(Z.el('time','day-date',date.slice(5).replace('-','.')),Z.el('span','day-meta',week[new Date(date+'T12:00:00').getDay()]+' · '+entries.length+' 条'+(spent?' · 当天花费 '+Z.cny(spent):'')));
    const list=Z.el('ol','log-list');entries.forEach(e=>list.append(Z.logItem(e,team)));
    day.append(head,list);frag.append(day);
   });
   days.replaceChildren(frag);Z.sampleNote(days,shown);
  }
  draw();
 }).catch(()=>Z.fail(days,'工作日志'));
})();
