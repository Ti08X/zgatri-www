(function(){
const root=document.documentElement;
const $=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let motion=!reduce.matches;
const mbtn=$('motion');
function setMotion(v){motion=v;mbtn.textContent='Motion '+(v?'On':'Off');mbtn.setAttribute('aria-pressed',String(v));}
setMotion(motion);
mbtn.onclick=()=>setMotion(!motion);
const orb=$('orb'),menu=$('menu');
orb.onclick=()=>{const o=menu.classList.toggle('open');orb.setAttribute('aria-expanded',String(o));};

const cv=$('gl');
let renderer;
try{ renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true}); }catch(e){ renderer=null; }
if(!renderer||typeof THREE==='undefined'){
 root.classList.add('nogl');
 const notebook=$('notebook-card');notebook.inert=false;notebook.setAttribute('aria-hidden','false');notebook.classList.add('static-notebook');$('c5').appendChild(notebook);
 return;
}
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
renderer.setClearColor(0x02040a,1);

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(48,1,.1,600);
const U={time:{value:0},p:{value:0},mouse:{value:new THREE.Vector2(.5,.5)},res:{value:new THREE.Vector2(1,1)}};
const ADD=THREE.AdditiveBlending;

function radial(stops){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);stops.forEach(s=>g.addColorStop(s[0],s[1]));x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const glowTex=radial([[0,'rgba(255,255,255,1)'],[.12,'rgba(200,255,255,.85)'],[.4,'rgba(80,170,255,.25)'],[1,'rgba(0,0,0,0)']]);
const dotTex=radial([[0,'rgba(255,255,255,1)'],[.5,'rgba(255,255,255,.35)'],[1,'rgba(0,0,0,0)']]);

/* path: one curve the camera and the light both travel along */
const CP=[[0,0,36],[4,2,12],[-3,-1,-8],[0,0,-20],[12,2,-40],[13,2,-55],[5,0,-75],[0,0,-86],[-12,1,-100],[-13,1,-115],[-5,0,-135],[0,0,-158],[0,0,-168]].map(a=>new THREE.Vector3(a[0],a[1],a[2]));
const curve=new THREE.CatmullRomCurve3(CP,false,'centripetal');
const S=1400,SP=[];for(let i=0;i<=S;i++)SP.push(curve.getPointAt(i/S));
function at(u,out){u=Math.min(1,Math.max(0,u))*S;const i=Math.min(S-1,Math.floor(u)),f=u-i;return out.copy(SP[i]).lerp(SP[i+1],f);}
const lightPos=new THREE.Vector3(),camPos=new THREE.Vector3(),tmp=new THREE.Vector3();

/* the light being chased + the trail it lights */
const lamp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,blending:ADD,depthWrite:false,transparent:true}));scene.add(lamp);lamp.material.opacity=.5;
const TN=320,tp=new Float32Array(TN*3),tc=new Float32Array(TN*3);
const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.BufferAttribute(tp,3));tg.setAttribute('color',new THREE.BufferAttribute(tc,3));
const trailLine=new THREE.Line(tg,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,blending:ADD,depthWrite:false}));
const trailPts=new THREE.Points(tg,new THREE.PointsMaterial({map:dotTex,size:.6,vertexColors:true,transparent:true,blending:ADD,depthWrite:false}));
trailLine.frustumCulled=trailPts.frustumCulled=false;scene.add(trailLine,trailPts);
function updateTrail(uL,k){for(let i=0;i<TN;i++){const f=i/(TN-1);at(uL*f,tmp);tp[i*3]=tmp.x;tp[i*3+1]=tmp.y;tp[i*3+2]=tmp.z;const b=Math.pow(f,3);tc[i*3]=b*.3*k;tc[i*3+1]=b*.58*k;tc[i*3+2]=b*.6*k;}tg.attributes.position.needsUpdate=true;tg.attributes.color.needsUpdate=true;}

/* dust along the route */
const N=1400,dp=new Float32Array(N*3);
for(let i=0;i<N;i++){const c=SP[(Math.random()*S)|0];dp[i*3]=c.x+(Math.random()-.5)*70;dp[i*3+1]=c.y+(Math.random()-.5)*40;dp[i*3+2]=c.z+(Math.random()-.5)*50;}
const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dp,3));
const dust=new THREE.Points(dg,new THREE.PointsMaterial({map:dotTex,size:.6,color:0x9fe8ff,transparent:true,opacity:.45,blending:ADD,depthWrite:false}));dust.frustumCulled=false;scene.add(dust);

/* AI: noise condenses into the ZG mark */
const AZ=new THREE.Vector3(0,0,-50);
const ZG='M122 138h234l-111 83H59zM449 78 130 331l-71 94h118zM279 323h170l-62 102H188z';
const NP=innerWidth<700?9000:18000;
const tgt=new Float32Array(NP*3),st=new Float32Array(NP*3),sd=new Float32Array(NP);
(function(){
 const c=document.createElement('canvas');c.width=c.height=400;const x=c.getContext('2d');x.scale(400/512,400/512);x.fillStyle='#fff';x.fill(new Path2D(ZG));
 const d=x.getImageData(0,0,400,400).data,ok=[];for(let i=0;i<160000;i++)if(d[i*4+3]>128)ok.push(i);
 for(let k=0;k<NP;k++){const idx=ok[(Math.random()*ok.length)|0];
  tgt[k*3]=((idx%400)/400-.5)*28;tgt[k*3+1]=-(((idx/400)|0)/400-.5)*28;tgt[k*3+2]=(Math.random()-.5)*1.4;
  const r=20*Math.cbrt(Math.random()),th=Math.random()*6.2832,ph=Math.acos(2*Math.random()-1);
  st[k*3]=r*Math.sin(ph)*Math.cos(th)*1.3;st[k*3+1]=r*Math.sin(ph)*Math.sin(th);st[k*3+2]=r*Math.cos(ph);sd[k]=Math.random();}
})();
const ag=new THREE.BufferGeometry();ag.setAttribute('position',new THREE.BufferAttribute(st,3));ag.setAttribute('aTarget',new THREE.BufferAttribute(tgt,3));ag.setAttribute('aSeed',new THREE.BufferAttribute(sd,1));
const aiMat=new THREE.ShaderMaterial({uniforms:{uForm:{value:0},uTime:U.time,uPoint:{value:new THREE.Vector3(0,0,1e4)},uPR:{value:5},uAct:{value:0},uSize:{value:innerWidth<innerHeight?1.7:2.3},uBr:{value:innerWidth<innerHeight?.5:1},uPx:{value:renderer.getPixelRatio()}},transparent:true,depthWrite:false,blending:ADD,
 vertexShader:'attribute vec3 aTarget;attribute float aSeed;uniform float uForm,uTime,uSize,uPx,uPR,uAct;uniform vec3 uPoint;varying float vF;varying float vS;void main(){float t=uTime;vec3 n=position+vec3(sin(t*.35+aSeed*40.),cos(t*.3+aSeed*23.),sin(t*.25+aSeed*57.))*1.6;float f=smoothstep(0.,1.,clamp(uForm*1.4-aSeed*.4,0.,1.));vec3 q=aTarget+vec3(sin(t*1.2+aSeed*90.),cos(t*1.1+aSeed*70.),0.)*.06;vec3 p=mix(n,q,f);vec3 d=p-uPoint;float r=length(d.xy);float push=exp(-r*r/(uPR*uPR))*uAct;p+=normalize(d+vec3(.0001))*push*7.;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=uSize*uPx*70./-mv.z*(.7+.6*aSeed);vF=f;vS=push;}',
 fragmentShader:'uniform float uBr;varying float vF;varying float vS;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float a=smoothstep(.5,0.,d);vec3 col=mix(vec3(.35,.5,.85),vec3(.57,.95,.94),vF);col=mix(col,vec3(1.),vS*.6);gl_FragColor=vec4(col,(a*(.3+.7*vF)+vS*.15)*uBr);}'});
const aiPts=new THREE.Points(ag,aiMat);aiPts.position.copy(AZ);if(innerWidth<innerHeight){aiPts.scale.setScalar(.85);aiPts.position.y+=6;}aiPts.frustumCulled=false;scene.add(aiPts);

/* TR: a wireframe structure drawn from the ground up, with ghost iterations */
const BZ=new THREE.Vector3(0,-14,-110);
const bl=[];
function L(a,b,c,d,e,f){bl.push(a,b,c,d,e,f);}
[[16,2,16,1],[12,7,12,5.5],[9,7,9,12.5],[6,7,6,19.5],[3,8,3,27],[.4,6,.4,34]].forEach(b=>{
 const w=b[0],h=b[1],dd=b[2],hw=w/2,hd=dd/2,y0=b[3]-h/2,y1=b[3]+h/2;
 const nx=Math.max(1,Math.round(w/1.8)),nz=Math.max(1,Math.round(dd/1.8));
 for(let i=0;i<=nx;i++){const x=-hw+w*i/nx;L(x,y0,-hd,x,y1,-hd);L(x,y0,hd,x,y1,hd);}
 for(let i=0;i<=nz;i++){const z=-hd+dd*i/nz;L(-hw,y0,z,-hw,y1,z);L(hw,y0,z,hw,y1,z);}
 const ny=Math.max(1,Math.round(h/1.4));
 for(let i=0;i<=ny;i++){const y=y0+h*i/ny;L(-hw,y,-hd,hw,y,-hd);L(hw,y,-hd,hw,y,hd);L(hw,y,hd,-hw,y,hd);L(-hw,y,hd,-hw,y,-hd);}
});
const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(bl),3));
const bvs='varying float vY;void main(){vY=position.y/37.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const bfs='uniform float uBuild,uAlpha;varying float vY;void main(){float e=uBuild-vY;if(e<0.)discard;float g=exp(-e*26.);vec3 col=mix(vec3(.35,.55,1.),vec3(.9,1.,1.),g);gl_FragColor=vec4(col*(.5+g*2.2)*uAlpha,1.);}';
const bMats=[],bObjs=[];
[[1,0,1],[.22,.16,1.02],[.14,-.16,.98]].forEach(c=>{
 const m=new THREE.ShaderMaterial({uniforms:{uBuild:{value:0},uAlpha:{value:c[0]}},vertexShader:bvs,fragmentShader:bfs,transparent:true,depthWrite:false,blending:ADD});
 const o=new THREE.LineSegments(bg,m);o.position.copy(BZ);o.scale.setScalar(c[2]);o.userData.off=c[1];o.frustumCulled=false;scene.add(o);bMats.push(m);bObjs.push(o);
});

/* gate: two portals flanking the route, blog (left) and shop (right) */
let gi=0;for(let i=0;i<=S;i++){if(SP[i].z<-122){gi=i;break;}}
const GC=SP[gi].clone(),GT=SP[Math.min(S,gi+12)].clone().sub(SP[Math.max(0,gi-12)]).normalize();
const GR=new THREE.Vector3().crossVectors(GT,new THREE.Vector3(0,1,0)).normalize();
/* Notes and shop share the same drafting language as the original tower. */
const destinations=new THREE.Group();camera.add(destinations);scene.add(camera);
function draft(color){
 const group=new THREE.Group(),materials=[],labels=[],pulses=[],displays=[];
 const uniforms={uReveal:{value:0},uOpacity:{value:0},uColor:{value:new THREE.Color(color)}};
 const mat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:ADD,
  vertexShader:'varying float vY;void main(){vY=(position.y+6.)/12.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'uniform float uReveal,uOpacity;uniform vec3 uColor;varying float vY;void main(){float e=uReveal-vY;if(e<0.)discard;float edge=exp(-e*32.);gl_FragColor=vec4(uColor*(.95+edge*1.2),uOpacity);}' });
 materials.push(mat);destinations.add(group);
 function lines(points,soft=false){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));const m=soft?new THREE.LineBasicMaterial({color,opacity:0,transparent:true,depthWrite:false,blending:ADD}):mat;if(soft)materials.push(m);const obj=new THREE.LineSegments(geo,m);obj.renderOrder=2;group.add(obj);return obj;}
 function poly(points,soft=false){const seg=[];for(let i=1;i<points.length;i++)seg.push(points[i-1],points[i]);return lines(seg,soft);}
 function rect(x,y,w,h,z=0){poly([[x-w/2,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],[x-w/2,y+h/2,z],[x-w/2,y-h/2,z]]);}
 function box(x,y,z,w,h,d){const pts=[];for(const zz of [-d/2,d/2]){pts.push([x-w/2,y-h/2,z+zz],[x+w/2,y-h/2,z+zz],[x+w/2,y-h/2,z+zz],[x+w/2,y+h/2,z+zz],[x+w/2,y+h/2,z+zz],[x-w/2,y+h/2,z+zz],[x-w/2,y+h/2,z+zz],[x-w/2,y-h/2,z+zz]);}for(const xx of [-w/2,w/2])for(const yy of [-h/2,h/2])pts.push([x+xx,y+yy,z-d/2],[x+xx,y+yy,z+d/2]);return lines(pts);}
 function label(text,x,y,width,z=.12,size=38){const c=document.createElement('canvas'),ctx=c.getContext('2d');ctx.font='500 '+size+'px "PingFang SC",system-ui,sans-serif';c.width=Math.ceil(ctx.measureText(text).width)+24;c.height=96;ctx.font='500 '+size+'px "PingFang SC",system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=new THREE.Color(color).getStyle();ctx.fillText(text,c.width/2,48);const m=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,blending:ADD,opacity:0});const obj=new THREE.Mesh(new THREE.PlaneGeometry(width,width*c.height/c.width),m);obj.renderOrder=3;obj.position.set(x,y,z);group.add(obj);labels.push(m);return obj;}
 function surface(x,y,z,w,h){const m=new THREE.MeshBasicMaterial({color:0x02070c,transparent:true,depthWrite:false,opacity:0,side:THREE.DoubleSide});const obj=new THREE.Mesh(new THREE.PlaneGeometry(w,h),m);obj.renderOrder=1;obj.position.set(x,y,z);group.add(obj);materials.push(m);m.userData.surface=true;}
 function glow(x,y,z=0,scale=.65){const m=new THREE.SpriteMaterial({map:glowTex,color,transparent:true,depthWrite:false,blending:ADD,opacity:0});const obj=new THREE.Sprite(m);obj.renderOrder=4;obj.position.set(x,y,z);obj.scale.setScalar(scale);group.add(obj);labels.push(m);return obj;}
 return {group,uniforms,materials,labels,pulses,displays,lines,poly,rect,box,label,glow,surface,hover:0,hoverTarget:0,aimX:0,aimY:0,tiltX:0,tiltY:0,pressed:false};
}
const notebook=draft(0x91f1ef),storefront=draft(0xffd29a);
(function(o){
 /* Three real entries sit on an open glass notebook, inside the original cyan drafting frame. */
 o.surface(0,0,-.85,17.2,12.4);
 for(const y of [3.9,.6,-2.7])o.poly([[-8.6,y,.2],[-8.05,y,.2],[-8.05,y-.4,.2]]);
 for(const x of [-8.25,8.25])o.lines([[x,5.8,.2],[x,-5.8,.2]]);
 o.box(0,0,-.45,17.2,12.4,.7);
 o.rect(0,0,16.8,12,.05);
 for(const x of [-8.6,8.6])for(const y of [-6.2,6.2])o.poly([[x,y-Math.sign(y)*.65,.18],[x,y,.18],[x-Math.sign(x)*.65,y,.18]]);
 o.lines([[-7.6,4.35,.15],[7.6,4.35,.15],[-7.6,-5.3,.15],[7.6,-5.3,.15]]);
})(notebook);
function moving(o,points,offset){const route=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const obj=o.glow(0,0,.35,.75);o.pulses.push({route,obj,offset});}
moving(notebook,[[-8.5,5.7,.3],[-8.5,0,.3],[-8.5,-5.7,.3]],0);
(function(o){
 /* Shopfront with depth, a striped canopy, illuminated display bays and steps. */
 o.box(0,-4.55,0,18,.3,7);o.box(0,-4.9,1.1,18.8,.3,6);
 o.surface(0,-.6,2.35,16,7.4);
 o.box(0,-.6,-.2,16,7.4,5.3);
 o.box(0,3.5,-.2,16.5,.85,5.7);
 o.label('ZGATRI  /  逐光小店',0,3.52,10,2.73,38);
 o.poly([[-8.25,3.08,2.65],[-8.25,1.9,4.5],[8.25,1.9,4.5],[8.25,3.08,2.65]]);
 for(let i=0;i<=18;i++){const x=-8.25+16.5*i/18;o.lines([[x,3.08,2.65],[x,1.9,4.5],[x,1.55,4.5]]);}
 o.lines([[-8.25,1.55,4.5],[8.25,1.55,4.5]]);
 o.box(0,-1.4,2.6,2.7,5.5,.16);o.lines([[.85,-1.45,2.75],[.85,-.7,2.75]]);
 for(const x of [-4.9,4.9]){
  o.box(x,-.5,2.65,5.6,3.75,.22);
  o.lines([[x-2.8,-1.15,2.85],[x+2.8,-1.15,2.85]]);
  o.box(x,-2.75,2.8,5.7,.5,1.7);
  for(let i=0;i<3;i++){const px=x-1.75+i*1.75,card=o.box(px,-.1,2.9,1.5,2.2,.5);card.geometry.translate(-px,.1,-2.9);card.position.set(px,-.1,2.9);o.displays.push({card,phase:i+x});o.glow(px,.7,3,.6);}
  o.label(x<0?'AI 订阅':'数字服务',x,-1.85,2.8,2.92,46);
 }
 for(const x of [-7.7,7.7]){o.lines([[x,1.45,3.1],[x,.75,3.1]]);o.box(x,.5,3.1,.3,.5,.3);o.glow(x,.5,3.2,1.5);}
 o.label('OPEN',0,.6,1.1,2.8,48);
 o.glow(0,3.52,2.6,5);
 for(let i=0;i<5;i++)o.poly([[-10,-5.25,-3+i*2],[10,-5.25,-3+i*2]],true);
 for(let i=0;i<7;i++)o.poly([[-9+i*3,-5.25,-3],[-9+i*3,-5.25,5]],true);
})(storefront);
moving(storefront,[[-8.2,1.95,4.55],[0,1.95,4.55],[8.2,1.95,4.55]],0);
const courier=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0x91f1ef,transparent:true,depthWrite:false,blending:ADD,opacity:0}));courier.renderOrder=4;courier.scale.setScalar(1.2);destinations.add(courier);
/* Native links follow the same projected plane as the Three.js objects. */
const cssPlane=new THREE.Matrix4(),cssProjection=new THREE.Matrix4();
function positionCard(o,width,height,z){
 const el=o.ui,w=880,h=el.id==='notebook-card'?634:528;
 cssPlane.makeScale(width/w,-height/h,1);cssPlane.setPosition(-width/2,height/2,z);
 o.group.updateMatrixWorld(true);
 cssProjection.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(o.group.matrixWorld).multiply(cssPlane);
 const e=cssProjection.elements,x=innerWidth/2,y=innerHeight/2,d=e[15];
 const values=[x*(e[0]+e[3]),y*(e[3]-e[1]),0,e[3],x*(e[4]+e[7]),y*(e[7]-e[5]),0,e[7],0,0,d,0,x*(e[12]+e[15]),y*(e[15]-e[13]),0,d];
 el.style.transform='matrix3d('+values.map(v=>(v/d).toFixed(7)).join(',')+')';
}
function interactive(o,id){
 const el=o.ui=$(id);
 function focus(){o.hoverTarget=el.matches(':hover')||el.contains(document.activeElement)?1:0;}
 el.addEventListener('pointerenter',()=>{o.hoverTarget=1;});
 el.addEventListener('pointerleave',()=>{o.aimX=o.aimY=0;o.pressed=false;focus();});
 el.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=el.getBoundingClientRect();o.aimX=Math.max(-1,Math.min(1,2*(e.clientX-r.left)/r.width-1));o.aimY=Math.max(-1,Math.min(1,2*(e.clientY-r.top)/r.height-1));el.style.setProperty('--pointer-x',((o.aimX+1)*50)+'%');el.style.setProperty('--pointer-y',((o.aimY+1)*50)+'%');});
 el.addEventListener('pointerdown',()=>{o.pressed=true;});
 ['pointerup','pointercancel'].forEach(type=>el.addEventListener(type,()=>{o.pressed=false;}));
 el.addEventListener('focusin',focus);el.addEventListener('focusout',()=>queueMicrotask(focus));
}
interactive(notebook,'notebook-card');interactive(storefront,'store-card');
function destinationFrame(p){
 const portrait=innerWidth/innerHeight<=1,halfH=22*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),halfW=halfH*camera.aspect;
 const blog=sm((p-.685)/.042)*(1-sm((p-.802)/.03));
 const shop=sm((p-.814)/.038)*(1-sm((p-.929)/.026));
 [notebook,storefront].forEach((o,i)=>{
  const v=i?shop:blog,entry=sm((p-(i?.814:.685))/.065);
  o.group.visible=v>.001;
  o.hover+=(o.hoverTarget-o.hover)*.10;
  o.tiltX+=(o.aimY*o.hover-o.tiltX)*.10;o.tiltY+=(o.aimX*o.hover-o.tiltY)*.10;
  const enabled=v>.75;
  o.ui.inert=!enabled;o.ui.setAttribute('aria-hidden',String(!enabled));o.ui.style.pointerEvents=enabled?'auto':'none';
  o.ui.style.opacity=v.toFixed(3);o.ui.style.visibility=v>.02?'visible':'hidden';
  o.uniforms.uOpacity.value=v*(.98+o.hover*.22);o.uniforms.uReveal.value=entry*1.5;
  o.materials.forEach(m=>{if(!m.uniforms)m.opacity=v*(m.userData.surface?(i?.60:.07):.13);});
  o.labels.forEach(m=>m.opacity=v*.9*sm((entry-.32)/.68));
  const scale=portrait?Math.min(halfW*(i?.092:.105),halfH*(i?.041:.047)):Math.min(halfW*.052,halfH*.105);
  o.group.scale.setScalar(scale*(i?(portrait?.94:.80):1)*(.92+.08*entry)*(motion?1+o.hover*.028-(o.pressed?.018:0):1));
  o.group.position.set(portrait?0:halfW*(i?.32:.40),portrait?halfH*.34:halfH*.06,-22-(1-entry)*2-(motion?-o.hover*.3:0));
  o.group.rotation.set((i?.13:.025)+(motion?-o.tiltX*.09:0),(i?-.26:.06)+(motion?Math.sin(T*.3)*.025+o.tiltY*.12:0),0);
  positionCard(o,i?20:17.2,i?12:12.4,i?3.22:.4);
  o.displays.forEach(a=>{a.card.rotation.y=motion?Math.sin(T*.7+a.phase)*.24:0;a.card.position.y=-.1+(motion?Math.sin(T*.9+a.phase)*.1:0);});
  o.pulses.forEach(a=>{a.obj.position.copy(a.route.getPointAt(((T*.13+a.offset)%1+1)%1));a.obj.material.opacity=v*(.45+.25*Math.sin(T*2+a.offset));});
 });
 /* One light crosses the seam, drawing the next scene rather than cutting to it. */
 const bridge=sm((p-.798)/.06),brightness=sm((p-.68)/.015)*(1-sm((p-.875)/.025));
 courier.material.opacity=brightness*.48;
 courier.material.color.setHex(bridge>.5?0xffd29a:0x91f1ef);
 courier.position.set((portrait?0:halfW*.43)+Math.sin(bridge*Math.PI)*halfW*.26,halfH*(.65-bridge*.95),-21);
}
/* Extend only the destinations: the original tower and FIGHT scenes keep their route. */
function originalProgress(p){
 const knots=[[0,0],[.69,.69],[.81,.78],[.955,.9],[1,1]];
 for(let i=1;i<knots.length;i++)if(p<=knots[i][0]){const a=knots[i-1],b=knots[i];return a[1]+(b[1]-a[1])*(p-a[0])/(b[0]-a[0]);}
 return 1;
}

/* fight text wall */
const wallMats=[];
const textFrag='uniform sampler2D map;uniform float time,p,kind,speed,rep,vis;uniform vec2 mouse,res;uniform vec3 tint;varying vec2 vUv;float hash(float n){return fract(sin(n*127.1)*43758.5453);}void main(){float lit=kind>1.5?smoothstep(.9,1.,p):0.;vec2 uv=vec2(vUv.x*rep+time*speed,vUv.y);float sp=.0025*(1.-lit*.85);if(kind>.5&&kind<1.5){float band=floor(vUv.y*12.);float st=floor(time*1.5);float h=hash(band+st);float gate=step(.45,sin(time*.35)*.5+.5);float tr=step(.8,h)*gate;uv.x+=tr*(hash(band*3.1+st)-.5)*.07;sp+=tr*.014;}vec3 t=vec3(texture2D(map,uv+vec2(sp,0.)).g,texture2D(map,uv).g,texture2D(map,uv-vec2(sp,0.)).g);vec3 f=vec3(texture2D(map,uv+vec2(sp,0.)).r,texture2D(map,uv).r,texture2D(map,uv-vec2(sp,0.)).r);vec2 a=vec2(res.x/res.y,1.);float d=distance(gl_FragCoord.xy/res*a,mouse*a);float lp=exp(-d*d*14.);float fill=(kind>1.5?.07+lit*.16:.04)+lp*.8;float fade=(kind>.5&&kind<1.5)?1.-smoothstep(.55,1.,p)*.75:1.;gl_FragColor=vec4(tint*(t*(.55+lit*.9)+f*fill)*fade*vis,1.);}';
function wordTex(unit,style,fam){
 const c=document.createElement('canvas');c.width=4096;c.height=512;const x=c.getContext('2d');
 x.font=style+' 300px '+fam;const w=x.measureText(unit).width;const n=Math.max(1,Math.round(4096/w));const size=300*4096/(n*w);
 x.fillStyle='#000';x.fillRect(0,0,4096,512);x.font=style+' '+size+'px '+fam;x.textBaseline='middle';x.lineJoin='round';
 for(let i=0;i<n;i++){const px=i*4096/n;x.fillStyle='#f00';x.fillText(unit,px,262);x.strokeStyle='#0f0';x.lineWidth=5;x.strokeText(unit,px,262);}
 const t=new THREE.CanvasTexture(c);t.wrapS=THREE.RepeatWrapping;t.minFilter=THREE.LinearFilter;t.anisotropy=4;return t;
}
function wall(){
 const rows=[
  {u:'FIGHT  ·  ',s:'400',f:'"Archivo Black",Impact,sans-serif',kind:0,y:15,z:-206,w:130,sp:.006,tint:[.45,.85,1]},
  {u:'FAIL  ·  ',s:'italic 900',f:'"Playfair Display",Georgia,serif',kind:1,y:0,z:-201,w:118,sp:-.009,tint:[1,.5,.42]},
  {u:'FIGHT AGAIN  ·  ',s:'400',f:'"Archivo Black",Impact,sans-serif',kind:2,y:-15,z:-196,w:108,sp:.012,tint:[.5,.9,.95]}
 ];
 rows.forEach(r=>{
  const mat=new THREE.ShaderMaterial({uniforms:{map:{value:wordTex(r.u,r.s,r.f)},time:U.time,p:U.p,mouse:U.mouse,res:U.res,kind:{value:r.kind},speed:{value:r.sp},rep:{value:.5},vis:{value:1},tint:{value:new THREE.Vector3(...r.tint)}},
   transparent:true,depthWrite:false,blending:ADD,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:textFrag});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(r.w,r.w/8),mat);m.position.set(0,r.y,r.z);scene.add(m);wallMats.push(mat);
 });
}
const fl=['400 100px "Archivo Black"','italic 900 100px "Playfair Display"'].map(f=>document.fonts?document.fonts.load(f,'FIGHT'):Promise.resolve());
Promise.race([Promise.all(fl),new Promise(r=>setTimeout(r,2500))]).then(wall,wall);

/* camera */
const sm=x=>{x=Math.min(1,Math.max(0,x));return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const WC=new THREE.Vector3(0,-1,-200),BC=new THREE.Vector3(0,2,-110),look=new THREE.Vector3(),foc=new THREE.Vector3();
const rc=new THREE.Raycaster(),pl=new THREE.Plane(new THREE.Vector3(0,0,1),50),hit=new THREE.Vector3();

/* chapters */
const chs=[[$('c1'),-1,-.5,.09,.17],[$('c2'),.17,.23,.36,.42],[$('c3'),.47,.52,.64,.69],[$('c5'),.70,.735,.795,.819],[$('c6'),.825,.865,.925,.95],[$('c4'),.961,.985,2,3]];
function chapters(p){
 chs.forEach(c=>{
  const v=sm((p-c[1])/Math.max(.001,c[2]-c[1]))*(1-sm((p-c[3])/Math.max(.001,c[4]-c[3])));
  const el=c[0];el.style.opacity=v.toFixed(3);el.style.transform='translateY('+((1-v)*14).toFixed(1)+'px)';
  el.style.pointerEvents=v>.5?'auto':'none';el.style.visibility=v>.02?'visible':'hidden';
 });
}
chapters(0);

/* resize + input */
function resize(){
 const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.fov=w/h<1?70:48;camera.updateProjectionMatrix();
 const v=new THREE.Vector2();renderer.getDrawingBufferSize(v);U.res.value.copy(v);
}
addEventListener('resize',resize);resize();
let tx=.5,ty=.5,hasPtr=false;
addEventListener('pointermove',e=>{hasPtr=true;tx=e.clientX/innerWidth;ty=1-e.clientY/innerHeight;},{passive:true});

/* loop */
let T=0,ps=0,journey=0,last=performance.now();
const track=document.querySelector('.track'),fill=document.querySelector('.fill');
const NODES=[[0,'逐光'],[.28,'涌现'],[.645,'构建'],[.765,'笔记'],[.895,'小店'],[1,'联系']];
function go(p){const m=document.documentElement.scrollHeight-innerHeight;scrollTo({top:p*m,behavior:motion?'smooth':'auto'});}
function cur(){let k=0;NODES.forEach((n,i)=>{if(journey>=n[0]-.02)k=i;});return k;}
const nbtn=NODES.map((n,i)=>{const b=document.createElement('button');b.type='button';b.className='node';b.style.left=(i/(NODES.length-1)*100)+'%';b.innerHTML='<span>'+n[1]+'</span>';b.setAttribute('aria-label','跳转到'+n[1]);b.onclick=()=>go(n[0]);track.appendChild(b);return b;});
document.querySelector('.pv').onclick=()=>{const k=cur();go(NODES[Math.abs(journey-NODES[k][0])<.025?Math.max(0,k-1):k][0]);};
document.querySelector('.nx').onclick=()=>go(NODES[Math.min(NODES.length-1,cur()+1)][0]);
let nodeOn=-1;
function frame(now){
 requestAnimationFrame(frame);
 if(document.hidden){last=now;return;}
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(motion)T+=dt;
 U.time.value=T;
 const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);
 const p=Math.min(1,Math.max(0,scrollY/max));
 journey+=(p-journey)*(motion?1-Math.exp(-dt*5):1);
 ps=originalProgress(journey);
 U.p.value=ps;
 const gx=hasPtr?tx:.5+.32*Math.sin(T*.25),gy=hasPtr?ty:.5+.1*Math.sin(T*.17);
 if(motion){U.mouse.value.x+=(gx-U.mouse.value.x)*.06;U.mouse.value.y+=(gy-U.mouse.value.y)*.06;}
 /* follow the light */
 const uC=ps*.96,uL=Math.min(1,uC+.07+.10*(1-sm(ps/.25)));
 at(uC,camPos);at(uL,lightPos);updateTrail(uL,.25+.45*sm(ps/.3));lamp.material.opacity=.1+.15*sm(ps/.3);
 const pulse=motion?.9+.1*Math.sin(T*2):1;
 lamp.position.copy(lightPos);lamp.scale.setScalar(3.6*pulse);
 foc.copy(AZ).lerp(BC,sm((ps-.38)/.14)).lerp(GC,sm((ps-.62)/.08)).lerp(WC,sm((ps-.80)/.08));
 look.copy(lightPos).lerp(foc,sm((ps-.06)/.16));
 const mx=motion&&hasPtr?(tx-.5):0,my=motion&&hasPtr?(ty-.5):0;
 camera.position.set(camPos.x+mx*2,camPos.y+my*1.3+(motion?Math.sin(T*.4)*.15:0),camPos.z);
 camera.lookAt(look);camera.updateMatrixWorld();
 /* AI cloud */
 const form=sm((ps-.10)/.17)*(1-sm((ps-.40)/.10));
 aiMat.uniforms.uForm.value=form;
 if(hasPtr){rc.setFromCamera({x:tx*2-1,y:ty*2-1},camera);if(rc.ray.intersectPlane(pl,hit))aiMat.uniforms.uPoint.value.copy(hit).sub(AZ);aiMat.uniforms.uPR.value=5;}
 else{aiMat.uniforms.uPoint.value.set(Math.sin(T*.5)*10,Math.cos(T*.37)*7,0);aiMat.uniforms.uPR.value=4;}
 aiMat.uniforms.uAct.value=motion?sm((form-.5)/.5):0;
 /* TR structure */
 const build=sm((ps-.46)/.17)*1.08;
 bMats.forEach(m=>m.uniforms.uBuild.value=build);
 bObjs.forEach(o=>o.rotation.y=(motion?T*.05:0)+o.userData.off);
 destinationFrame(journey);
 let progress=0;for(let i=1;i<NODES.length;i++){if(journey<=NODES[i][0]){progress=(i-1+(journey-NODES[i-1][0])/(NODES[i][0]-NODES[i-1][0]))/(NODES.length-1);break;}}
 fill.style.transform='scaleX('+progress.toFixed(4)+')';
 const wv=1-.6*sm((ps-.66)/.06)*(1-sm((ps-.84)/.05));wallMats.forEach(m=>m.uniforms.vis.value=wv);
 const nk=cur();if(nk!==nodeOn){nodeOn=nk;nbtn.forEach((b,i)=>{b.classList.toggle('on',i===nk);if(i===nk)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});}
 chapters(journey);
 renderer.render(scene,camera);
}
requestAnimationFrame(frame);
})();
