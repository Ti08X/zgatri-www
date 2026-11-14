(function(){
 const box=document.getElementById('profiles');
 Z.load('team').then(team=>{
  const frag=document.createDocumentFragment();
  team.forEach(m=>{
   const art=Z.el('article','profile rv'+(m.human?' human':''));art.id=m.id;

   // Portrait: drop an image into /img/ and put its path in team.json.
   const frame=Z.el('div','portrait');
   const empty=()=>{frame.classList.add('empty');frame.prepend(Z.el('span','portrait-name',m.name.slice(0,1)),Z.el('span','portrait-note',m.human?'本人':'立绘绘制中'));};
   // A path may be filled in before the file exists; fall back to the placeholder until it does.
   if(m.portrait){const img=Z.el('img');img.alt=m.name+' 的立绘';img.decoding='async';img.addEventListener('error',()=>{img.remove();empty();},{once:true});img.src=m.portrait;frame.append(img);}
   else empty();
   frame.append(Z.el('span','portrait-no','NO. '+m.no));

   const body=Z.el('div','profile-body');
   body.append(Z.el('p','role',m.role),Z.el('h2',null,m.name),Z.el('p','profile-tag',m.tagline));
   const duties=Z.el('ul','duties');m.duties.forEach(d=>duties.append(Z.el('li',null,d)));
   body.append(Z.el('h3','mini','负责什么'),duties);

   art.append(frame,body);frag.append(art);
  });
  box.replaceChildren(frag);Z.reveal(box);
  if(location.hash)document.getElementById(location.hash.slice(1))?.scrollIntoView();
 }).catch(()=>Z.fail(box,'伙伴档案'));
})();
