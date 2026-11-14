(function(){
 const still=matchMedia('(prefers-reduced-motion: reduce)').matches;

 // Count-up for the hero numbers.
 if(!still)document.querySelectorAll('[data-count]').forEach(el=>{
  const target=Number(el.dataset.count),start=performance.now(),dur=900+Math.min(target,600);
  (function tick(now){const p=Math.min(1,(now-start)/dur);el.textContent=Math.round(target*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(tick);})(start);
 });

 // Latest work-log entries under the staff badges.
 const feed=document.getElementById('home-log');
 Promise.all([Z.load('log'),Z.load('team')]).then(([log,team])=>{
  const latest=log.slice().sort(Z.byNewest).slice(0,4),list=Z.el('ol','log-list');
  latest.forEach(entry=>{const li=Z.logItem(entry,team);li.prepend(Z.el('time','log-date',entry.date.slice(5).replace('-','.')));list.append(li);});
  feed.replaceChildren(list);Z.sampleNote(feed,latest);
 }).catch(()=>Z.fail(feed,'工作日志'));

 // This month's running cost above the duel.
 const sum=document.getElementById('home-sum');
 Promise.all([Z.load('subscriptions'),Z.load('ledger')]).then(([subs,ledger])=>{
  const active=subs.filter(s=>s.active),total=active.reduce((t,s)=>t+Z.monthly(s,ledger.usdToCny),0);
  const cell=(label,value,note)=>{const d=Z.el('div');d.append(Z.el('dt',null,label),Z.el('dd',null,value));if(note)d.append(Z.el('small',null,note));return d;};
  sum.replaceChildren(cell('在用订阅',active.length+' 个'),cell('订阅月成本',Z.cny(total),'折合人民币'),cell('收入','暂未公开','口径想清楚再放'));
  if(subs.some(s=>s.sample))sum.after(Z.el('p','sample','上面的订阅金额来自示例数据，不是真实数字。'));
 }).catch(()=>Z.fail(sum,'账本'));
})();
