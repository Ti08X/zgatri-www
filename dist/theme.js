// Runs before first paint so a saved "lights off" choice does not flash.
(function(){
 var saved=null;try{saved=localStorage.getItem('lamp');}catch(e){}
 var dark=saved?saved==='off':matchMedia('(prefers-color-scheme: dark)').matches;
 if(dark)document.documentElement.classList.add('dark');
 document.documentElement.classList.add('js');
})();
