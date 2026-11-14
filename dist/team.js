(function(){
 const box=document.getElementById('profiles');
 Z.load('team').then(team=>{
  const frag=document.createDocumentFragment();
  team.forEach(m=>{
   const art=Z.el('article','profile c-'+m.id+' rv'+(m.human?' human':''));art.id=m.id;

   // Portrait: drop an image into /img/ and put its path in team.json.
   const frame=Z.el('div','portrait');
   const empty=()=>{frame.classList.add('empty');frame.prepend(Z.el('span','portrait-name',m.name.slice(0,1)),Z.el('span','portrait-note',m.human?'本人':'立绘绘制中'));};
   // A path may be filled in before the file exists; fall back to the placeholder until it does.
   if(m.portraitText){frame.classList.add('word');frame.append(Z.el('span','portrait-word',m.portraitText));}
   else if(m.portrait){const img=Z.el('img');img.alt=m.name+' 的立绘';img.decoding='async';img.addEventListener('error',()=>{img.remove();empty();},{once:true});img.src=m.portrait;frame.append(img);}
   else empty();
   frame.append(Z.el('span','portrait-no','NO. '+m.no));

   const body=Z.el('div','profile-body');body.dataset.en=m.en||'';
   body.append(Z.el('p','code',(m.code||'')+' · '+m.role),Z.el('h2',null,m.name),Z.el('p','profile-tag',m.tagline));
   if(m.traits){const tr=Z.el('ul','traits');m.traits.forEach(t=>tr.append(Z.el('li',null,t)));body.append(tr);}
   const duties=Z.el('ul','duties');m.duties.forEach(d=>duties.append(Z.el('li',null,d)));
   body.append(Z.el('h3','mini','负责什么'),duties);
   if(m.status){const st=Z.el('p','state');st.append(Z.el('i','dot'),'状态 · '+m.status);body.append(st);}

   art.append(frame,body);frag.append(art);
  });
  box.replaceChildren(frag);Z.reveal(box);
  // Gentle parallax: a portrait rises into place as it scrolls up to the middle of the screen,
  // then sits flush with the top of its frame so heads are never cut.
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const frames=[...box.querySelectorAll('.portrait')];let ticking=false;
   const update=()=>{ticking=false;const vh=innerHeight;frames.forEach(f=>{const r=f.getBoundingClientRect();if(r.bottom<0||r.top>vh)return;const p=Math.min(1,Math.max(0,(r.top+r.height/2-vh/2)/(vh/2)));f.style.setProperty('--py',(p*-r.height*.07).toFixed(1)+'px');});};
   addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true});update();
  }
  if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView();
 }).catch(()=>Z.fail(box,'伙伴档案'));
})();
