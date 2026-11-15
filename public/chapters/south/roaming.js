// Restored from the supplied 京华入墨 · 中轴拾光.html.
(function installDynamicRoaming(config){
  "use strict";

  if(window.__axisRoamingInstalled)return;
  window.__axisRoamingInstalled=true;

  const map=document.querySelector(".map");
  const image=document.getElementById("mapImage");
  const story=document.getElementById("story");

  if(!map||!image||typeof openPlace!=="function"){
    console.warn("动态漫游：当前网页缺少 mapImage 或 openPlace。");
    return;
  }

  const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");


  const layer=document.createElement("div");
  layer.className="roam-layer";
  layer.hidden=image.hidden;
  layer.setAttribute("aria-hidden","true");

  const pathSVG=document.createElementNS("http://www.w3.org/2000/svg","svg");
  pathSVG.setAttribute("viewBox","0 0 100 100");
  pathSVG.setAttribute("preserveAspectRatio","none");
  pathSVG.classList.add("roam-path");

  const path=document.createElementNS("http://www.w3.org/2000/svg","polyline");
  pathSVG.append(path);

  const target=document.createElement("div");
  target.className="roam-destination";
  target.hidden=true;

  const player=document.createElement("div");
  player.className="roam-player idle";

  const shadow=document.createElement("div");
  shadow.className="roam-shadow";

  const facing=document.createElement("div");
  facing.className="roam-facing";

  const avatar=document.createElement("img");
  avatar.src=config.avatar;
  avatar.alt="";
  facing.append(avatar);

  const name=document.createElement("span");
  name.className="roam-name";
  name.textContent="我";

  player.append(shadow,facing,name);
  layer.append(pathSVG,target,player);
  map.append(layer);

  const bar=document.createElement("div");
  bar.className="roam-bar";

  const status=document.createElement("span");
  status.setAttribute("role","status");
  status.textContent="点击景点，小人会沿路前往，到达后开始对话。";

  const reset=document.createElement("button");
  reset.type="button";
  reset.textContent="回到地图起点";

  bar.append(status,reset);
  map.insertAdjacentElement("afterend",bar);

  // 景点前方的道路停靠点，避免人物站在屋顶上。
  const stops={
    tiananmen:{x:50,y:17},
    zhengyangmen:{x:50,y:36},
    xiannongtan:{x:33,y:50},
    tiantan:{x:69,y:50},
    road:{x:50,y:62},
    yongdingmen:{x:50,y:84}
  };

  const originalOpenPlace=openPlace;
  let position={x:50,y:95};
  let route=[];
  let pending=null;
  let moving=false;
  let animationTime=0;
  let last=performance.now();

  function placePlayer(){
    player.style.left=position.x+"%";
    player.style.top=position.y+"%";
  }

  function clearRoute(){
    route=[];
    pending=null;
    moving=false;
    target.hidden=true;
    path.setAttribute("points","");
    player.classList.remove("walking");
    player.classList.add("idle");
  }

  function drawRoute(){
    path.setAttribute("points",
      [position,...route].map(p=>p.x+","+p.y).join(" ")
    );
  }

  function addPoint(points,p){
    const previous=points.length?points[points.length-1]:position;
    if(Math.hypot(p.x-previous.x,p.y-previous.y)>.15){
      points.push({x:p.x,y:p.y});
    }
  }

  function navigate(place){
    if(image.hidden){
      status.textContent="地图尚未载入，暂时无法开始步行。";
      map.scrollIntoView({behavior:"smooth",block:"center"});
      return;
    }

    const destination=stops[place.id];
    if(!destination){
      originalOpenPlace(place);
      return;
    }

    if(story&&story.open)story.close();

    // 按示意道路规划：先返回中轴，再沿中轴走到支路。
    const points=[];
    if(Math.abs(position.x-50)>.15){
      addPoint(points,{x:50,y:position.y});
    }
    addPoint(points,{x:50,y:destination.y});
    addPoint(points,destination);

    route=points;
    pending=place;
    moving=true;
    player.classList.remove("idle");
    player.classList.add("walking");
    name.textContent="前往 "+place.name;
    status.textContent="正在前往「"+place.name+"」，到达后自动开始对话。";

    target.hidden=false;
    target.style.left=destination.x+"%";
    target.style.top=destination.y+"%";
    drawRoute();

    if(!route.length)arrive();
  }

  function arrive(){
    const place=pending;
    clearRoute();
    name.textContent="我";
    if(!place)return;
    status.textContent="已到达「"+place.name+"」。下次将从这里出发。";
    // 只有实际抵达之后，才记录游览并触发原来的对话和视频逻辑。
    originalOpenPlace(place);
  }

  // 覆盖原入口；原有热区和快捷按钮无需逐个重绑。
  openPlace=navigate;

  reset.addEventListener("click",()=>{
    if(story&&story.open)story.close();
    clearRoute();
    position={x:50,y:95};
    placePlayer();
    name.textContent="我";
    status.textContent="已回到地图下方中央，点击景点重新出发。";
  });

  const observer=new MutationObserver(()=>{
    layer.hidden=image.hidden;
  });
  observer.observe(image,{attributes:true,attributeFilter:["hidden","src"]});

  // 大雁编队。
  const birds=[];
  for(let i=0;i<7;i++){
    const node=document.createElement("div");
    node.className="roam-bird";
    node.innerHTML=
      '<svg viewBox="0 0 26 16">'+
      '<path d="M1 3Q7 2 13 11Q18 3 25 4"/>'+
      '</svg>';
    node.querySelector("path").style.animationDelay=(-i*.17)+"s";
    layer.append(node);
    birds.push(node);
  }

  // 路上远景行人，体积刻意较小。
  const passers=[];
  const colors=["#67664f","#79634b","#586454","#6c7270","#8c7462"];
  for(let i=0;i<5;i++){
    const node=document.createElement("div");
    node.className="roam-passer";
    node.innerHTML=
      '<svg viewBox="0 0 18 36">'+
      '<ellipse cx="9" cy="34" rx="6" ry="1.5" fill="#4e593b33"/>'+
      '<circle cx="9" cy="5" r="3" fill="#baa17b"/>'+
      '<path d="M6 8L3 25Q9 28 15 25L12 8Z" fill="'+colors[i]+'"/>'+
      '<path d="M5 11L1 21M13 11L17 21" stroke="'+colors[i]+'" stroke-width="2"/>'+
      '<g class="legs" stroke="#4a4c3b" stroke-width="2.2">'+
      '<path d="M7 25L6 33M11 25L12 33"/></g>'+
      '</svg>';
    layer.append(node);
    passers.push(node);
  }

  function environment(){
    const cycle=(animationTime/48)%1;
    const birdBaseX=-15+cycle*130;
    const birdBaseY=14+Math.sin(cycle*Math.PI*2)*2;

    birds.forEach((node,i)=>{
      const arm=i===0?0:Math.ceil(i/2);
      node.style.left=(birdBaseX-arm*2.2)+"%";
      node.style.top=(birdBaseY+(i%2?1:-1)*arm*1.5)+"%";
      node.hidden=reduced.matches;
    });

    passers.forEach((node,i)=>{
      node.hidden=reduced.matches;
      if(i<3){
        const phase=(animationTime/(48+i*12)+i*.29)%1;
        node.style.left=(i%2?49:51.5)+"%";
        node.style.top=(i%2?85-phase*46:39+phase*46)+"%";
      }else{
        const phase=(animationTime/(48+i*5)+i*.21)%1;
        node.style.left=(32+phase*37)+"%";
        node.style.top=(i===3?50.7:52.1)+"%";
      }
    });
  }

  function frame(now){
    const dt=Math.min((now-last)/1000,.06);
    last=now;

    const visible=!document.hidden&&!image.hidden&&!(story&&story.open);

    if(visible){
      animationTime+=dt;

      if(moving&&route.length){
        const next=route[0];
        const dx=next.x-position.x,dy=next.y-position.y;

        // 对纵向比例修正，减少横向和纵向视觉速度差。
        const ratio=map.clientHeight/Math.max(1,map.clientWidth);
        const distance=Math.hypot(dx,dy*ratio);
        const step=dt*13;

        if(Math.abs(dx)>.03){
          facing.style.setProperty("--face",dx>=0?"1":"-1");
        }

        if(distance<=step||distance<.02){
          position={x:next.x,y:next.y};
          route.shift();
          if(!route.length){
            placePlayer();
            arrive();
          }
        }else{
          position.x+=dx*(step/distance);
          position.y+=dy*(step/distance);
        }
        placePlayer();
        if(moving)drawRoute();
      }

      environment();
    }

    requestAnimationFrame(frame);
  }

  placePlayer();
  environment();
  requestAnimationFrame(frame);
})({"avatar":"./assets/traveler.png"});
