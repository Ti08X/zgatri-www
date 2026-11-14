(function(){
 const sum=document.getElementById('sum'),subsBox=document.getElementById('subs'),monthsBox=document.getElementById('months');
 Promise.all([Z.load('subscriptions'),Z.load('ledger'),Z.load('team')]).then(([subs,ledger,team])=>{
  const rate=ledger.usdToCny,name=id=>team.find(m=>m.id===id)?.name||id;
  const active=subs.filter(s=>s.active),total=active.reduce((t,s)=>t+Z.monthly(s,rate),0);

  // Summary strip.
  const cell=(label,value,note)=>{const d=Z.el('div');d.append(Z.el('dt',null,label),Z.el('dd',null,value));if(note)d.append(Z.el('small',null,note));return d;};
  sum.replaceChildren(cell('在用订阅',active.length+' 个',subs.length-active.length?'另有 '+(subs.length-active.length)+' 个已退订':''),cell('订阅月成本',Z.cny(total),'年付的按 12 个月摊'),cell('折合每天',Z.cny(total/30),'比一杯奶茶贵还是便宜，自己判断'));
  Z.sampleNote(sum.parentElement,subs);
  document.getElementById('rate').textContent=ledger.rateNote||'';

  // Subscription table.
  const table=Z.el('table','subs'),head=Z.el('tr');
  ['订阅','拿来做什么','谁在用','价格','折合每月','值不值'].forEach(h=>head.append(Z.el('th',null,h)));
  const thead=Z.el('thead');thead.append(head);const tbody=Z.el('tbody');
  subs.slice().sort((a,b)=>b.active-a.active||Z.monthly(b,rate)-Z.monthly(a,rate)).forEach(s=>{
   const tr=Z.el('tr',s.active?'':'off');
   const first=Z.el('td');first.dataset.label='订阅';
   const title=Z.el('b',null,s.name);first.append(title);
   if(s.sample)first.append(Z.el('span','log-sample','示例'));
   if(!s.active)first.append(Z.el('span','log-status','已退订'));
   first.append(Z.el('small',null,[s.vendor,s.since&&s.since+' 起'].filter(Boolean).join(' · ')));
   const td=(label,text,cls)=>{const c=Z.el('td',cls,text);c.dataset.label=label;return c;};
   const why=td('拿来做什么',s.purpose||'');if(s.note)why.append(Z.el('small',null,s.note));
   const symbol=s.currency==='USD'?'$':'¥';
   tr.append(first,why,td('谁在用',s.usedBy.map(name).join('、')),td('价格',symbol+s.price+' / '+(s.cycle==='year'?'年':'月'),'num'),td('折合每月',Z.cny(Z.monthly(s,rate)),'num'));
   const v=td('值不值','');v.append(s.verdict?Z.el('span','verdict-tag v-'+({值:'yes',一般:'meh',不值:'no'}[s.verdict]||'meh'),s.verdict):Z.todo());
   tr.append(v);tbody.append(tr);
  });
  table.append(thead,tbody);subsBox.replaceChildren(table);

  // Monthly spend, bars true to scale against the largest month.
  const months=ledger.months||[],max=Math.max(1,...months.map(m=>m.expense||0));
  const list=Z.el('ol','months');
  months.forEach(m=>{
   const li=Z.el('li'),track=Z.el('div','track'),bar=Z.el('i');
   track.append(bar);requestAnimationFrame(()=>requestAnimationFrame(()=>{bar.style.width=((m.expense||0)/max*100)+'%';}));
   const label=Z.el('span','month',m.month.replace('-','.'));if(m.sample)label.append(Z.el('span','log-sample','示例'));
   const out=Z.el('output',null,typeof m.expense==='number'?Z.cny(m.expense):'待填写');
   li.append(label,track,out);
   list.append(li);
  });
  monthsBox.replaceChildren(list);Z.sampleNote(monthsBox,months);

  document.getElementById('income').textContent=ledger.incomePolicy||'';
 }).catch(()=>{Z.fail(subsBox,'账本');});
})();
