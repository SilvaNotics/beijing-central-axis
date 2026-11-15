// Restored from the supplied 京华入墨 · 中轴拾光.html.
(function installScrollMist(config){
 "use strict";

 const map=document.querySelector(".map");
 const viewport=map?.closest(".map-viewport");
 const image=document.getElementById("mapImage");
 if(!map||!image)return;

 document.querySelectorAll(
  ".scroll-mist-cover,.rolling-scroll-cover"
 ).forEach(n=>n.remove());

 if(getComputedStyle(map).position==="static"){
  map.style.position="relative";
 }

 const cover=document.createElement("div");
 cover.className="axis-fixed-roll-cover";

 const canvas=document.createElement("canvas");
 canvas.setAttribute("aria-hidden","true");

 const skip=document.createElement("button");
 skip.type="button";
 skip.textContent="跳过开场 · Esc";

 cover.append(canvas,skip);
 map.append(cover);
 map.classList.add("scroll-mist-running");

 const ctx=canvas.getContext("2d");
 const source=new Image();
 let W=1,H=1,D=1,raf=0,start=0,done=false;
 let fogLeft,fogRight,observer=null;

 const clamp=x=>Math.max(0,Math.min(1,x));
 const ease=x=>x*x*x*(x*(x*6-15)+10);
 const rnd=n=>{
  const r=Math.sin(n*93.71+17.8)*43758.545;
  return r-Math.floor(r);
 };

 function finish(){
  if(done)return;
  done=true;
  cancelAnimationFrame(raf);
  clearTimeout(safety);
  observer?.disconnect();
  cover.remove();
  map.classList.remove("scroll-mist-running");
  document.removeEventListener("keydown",key);
  viewport?.removeEventListener("scroll",positionSkip);
  window.removeEventListener("resize",positionSkip);
 }
 function positionSkip(){
  if(viewport)skip.style.right=Math.max(14,map.clientWidth-viewport.scrollLeft-viewport.clientWidth+14)+"px";
 }
 viewport?.addEventListener("scroll",positionSkip,{passive:true});
 window.addEventListener("resize",positionSkip);
 function key(e){if(e.key==="Escape")finish()}
 skip.addEventListener("click",finish);
 document.addEventListener("keydown",key);
 const safety=setTimeout(finish,10000);

 function fog(side){
  const c=document.createElement("canvas");
  c.width=Math.max(1,Math.ceil(W));
  c.height=Math.max(1,Math.ceil(H));
  const f=c.getContext("2d");

  const a=side<0?0:W*.42;
  const b=side<0?W*.58:W;

  f.fillStyle="#f4eddd";
  f.fillRect(a,0,b-a,H);

  for(let i=0;i<85;i++){
   const x=W*.5+(rnd(i+20)-.5)*W*.24;
   const y=rnd(i+200)*H;
   const r=H*(.06+rnd(i+500)*.15);
   const g=f.createRadialGradient(x,y,0,x,y,r);
   g.addColorStop(0,"rgba(252,248,236,1)");
   g.addColorStop(.45,"rgba(245,237,218,.97)");
   g.addColorStop(.8,"rgba(237,227,204,.45)");
   g.addColorStop(1,"rgba(237,227,204,0)");
   f.fillStyle=g;
   f.fillRect(x-r,y-r,r*2,r*2);
  }
  return c;
 }

 function resize(){
  positionSkip();
  const r=map.getBoundingClientRect();
  W=Math.max(1,r.width);
  H=Math.max(1,r.height);
  D=Math.min(devicePixelRatio||1,1.5);
  canvas.width=Math.round(W*D);
  canvas.height=Math.round(H*D);
  ctx?.setTransform(D,0,0,D,0,0);
  fogLeft=fog(-1);
  fogRight=fog(1);
 }

 /*
   整根轴杆直接使用原图裁片。
   不改变宽度，不画新的轴头，不添加会造成外观跳变的光影。
 */
 function roll(side,x,u){
  const portion=0.065;
  const sourceWidth=source.naturalWidth||source.width;
  const sourceHeight=source.naturalHeight||source.height;

  const cropWidth=sourceWidth*portion;
  const cropX=side<0?0:sourceWidth-cropWidth;
  const displayWidth=W*portion;

  ctx.save();
  ctx.globalAlpha=1;
  ctx.globalCompositeOperation="source-over";
  ctx.shadowColor="transparent";
  ctx.shadowBlur=0;
  ctx.shadowOffsetX=0;
  ctx.shadowOffsetY=0;

  ctx.drawImage(
    source,
    cropX,0,
    cropWidth,sourceHeight,
    x,0,
    displayWidth,H
  );

  ctx.restore();
}

 function draw(now){
  if(done)return;

  const t=(now-start)/1000;
  const u=ease(clamp((t-.15)/2.8));
  const mist=ease(clamp((t-3.25)/2.15));

  const rw=W*.065;

  // 固定宽度；仅由实际放卷位置决定左右移动。
  const left=(W*.5-rw)*(1-u);
  const right=W*.5+(W*.5-rw)*u;

  const innerLeft=left+rw*.9;
  const innerRight=right+rw*.1;

  ctx.clearRect(0,0,W,H);
  ctx.fillStyle="#faf3e3";
  ctx.fillRect(0,0,W,H);

  ctx.save();
  ctx.beginPath();
  ctx.rect(
   innerLeft,0,Math.max(0,innerRight-innerLeft),H
  );
  ctx.clip();

  // 原地图不缩放变形，只显示已释放卷面。
  ctx.drawImage(source,0,0,W,H);

  ctx.save();
  ctx.beginPath();
  ctx.rect(W*.055,H*.15,W*.89,H*.69);
  ctx.clip();

  if(mist===0){
   ctx.fillStyle="#f4eddd";
   ctx.fillRect(0,0,W,H);
  }

  ctx.globalAlpha=1-Math.pow(mist,3);
  const travel=W*.67*mist;
  const drift=Math.sin(t*1.5)*H*.004;

  ctx.drawImage(fogLeft,-travel,-drift,W,H);
  ctx.drawImage(fogRight,travel,drift,W,H);

  ctx.restore();

  /*
    极窄接触阴影只表现纸与轴的衔接，
    不挤压、弯曲轴杆；完全展开时自然消失。
  */
  if(u<1){
   const shadowW=Math.max(2,W*.009);
   ctx.globalAlpha=(1-u)*.3;
   for(const side of [-1,1]){
    const edge=side<0?innerLeft:innerRight;
    const g=ctx.createLinearGradient(
     edge-shadowW,0,edge+shadowW,0
    );
    g.addColorStop(0,"rgba(91,61,25,0)");
    g.addColorStop(.5,"rgba(91,61,25,.7)");
    g.addColorStop(1,"rgba(91,61,25,0)");
    ctx.fillStyle=g;
    ctx.fillRect(
     edge-shadowW,H*.13,shadowW*2,H*.73
    );
   }
  }

  ctx.restore();

  roll(-1,left,u);
  roll(1,right,u);

  if(t<5.55){
   raf=requestAnimationFrame(draw);
  }else{
   finish();
  }
 }

 source.onload=()=>{
  if(done)return;

  if(typeof loadMap==="function"){
   loadMap(config.map,null);
  }else{
   image.src=config.map;
   image.hidden=false;
   document.getElementById("mapEmpty")?.setAttribute("hidden","");
   document.getElementById("hotspots")?.removeAttribute("hidden");
  }

  image.style.aspectRatio=source.width+" / "+source.height;

  if(!ctx||matchMedia("(prefers-reduced-motion: reduce)").matches){
   finish();return;
  }

  observer=new ResizeObserver(resize);
  observer.observe(map);
  resize();
  start=performance.now();
  raf=requestAnimationFrame(draw);
 };

 source.onerror=finish;
 source.src=config.map;
})({"map":"./assets/map.jpg"});
