// Beijing-time clock on the homepage duty board.
(function(){
 const clock=document.getElementById('clock');if(!clock)return;
 const fmt=new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',hour:'2-digit',minute:'2-digit',hour12:false});
 const tick=()=>{clock.textContent=fmt.format(new Date());};
 tick();setInterval(tick,15000);
})();
