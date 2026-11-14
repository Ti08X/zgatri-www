// Shared by every page: the lamp, scroll reveal, and small helpers for the team page.
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
 function fail(target,what){target.replaceChildren(el('p','sample','没能读取'+what+'，请稍后刷新。'));}

 return{el,load,fail,reveal};
})();
