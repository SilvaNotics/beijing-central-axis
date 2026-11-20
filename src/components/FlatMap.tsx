import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { landmarks } from '../data/heritage';
import type { RegionId } from '../data/types';
import { createCityPlan } from '../scene/cityPlan';
import { loadCityData, localBuildingRing, localFootprintLayout } from '../scene/geodata';
import { project } from '../scene/geo';
import type { Landmark } from '../data/types';
import { civicLayouts, civicPlanParts, squarePlanParts } from '../scene/civicLayout';
import { southernRoadPath, roadPlanRings, roadPlanDetails } from '../scene/southernRoad';
import { palaceHallProfiles, zhongheLayout } from '../scene/palaceArchitecture';
import { palaceSideHallLayout } from '../scene/palaceSideHalls';
import { palaceTerraces,palaceRaisedBuildings,palaceRoofCore,sharedPalaceTerrace } from '../scene/palaceMassing';
import { axisThroughShenwu } from '../scene/axisRoute';
import { palaceWallRuns } from '../scene/palaceWalls';
import { palaceGateIds, palaceGateLayout, palaceGateHalls, shenwuForecourtLayout } from '../scene/palaceGates';
import { roofPlanLines, mappedRoofForm } from '../scene/roofForms';
import { agricultureCompounds } from '../scene/agricultureLayout';
import { wanningLayout } from '../scene/wanningLayout';
import { drumTowerDisplayOffset } from '../scene/bellDrumLayout';
import { moundStoneGates, moundCenter } from '../scene/templeLayout';
import { moundEnclosures } from '../scene/moundEnclosures';
import { tiantanWallRuns } from '../scene/tiantanWalls';
import { wallRuns } from '../scene/wallRuns';
import { yongdingmenPlatform, yongdingmenRoofs } from '../scene/yongdingmen';
import { tiananmenRoofs } from '../scene/tiananmen';
import { duanmenPlatform, duanmenRoofs } from '../scene/duanmen';
import { jinshuiLayout, tiananmenDepth, tiananmenWidth } from '../scene/gateLayout';
import { zhengyangPlatformRing, zhengyangCityRoofs } from '../scene/zhengyangLayout';

interface Props { selection: string | null; focus: RegionId | 'all'; onSelect: (id: string) => void; viewRevision?: number; }
const WIDTH = 880, HEIGHT = 1040, SCALE = .73;
const mapPoint = (coords: [number, number]) => {
  const [x, z] = project(coords);
  return [440 + (x - 45) * SCALE, 520 + (z - 3) * SCALE];
};
const sitePoint = (site: Landmark) => mapPoint(site.coords);
const labelSides = new Set(['bell-drum','jingshan','shejitan','duanmen','square','xiannongtan','southern-road']);
const annotations: [string, [number, number]][] = [
  ['什刹海', [116.3867,39.9402]], ['北海', [116.3885,39.9295]],
  ['中南海', [116.3869,39.9173]], ['长安街', [116.419,39.9074]], ['前门大街', [116.3998,39.8938]],
];
interface PlanLayer { id: string; roofs: string; walls: string; ridges: string; }
interface Plan { axis: [number,number][]; image: string; layers: PlanLayer[]; civic: {id:string;kind:string;path:string}[]; }
let planPromise: Promise<Plan> | undefined;
function loadPlan() {
  planPromise ??= loadCityData().then(async data => {
    const layers = landmarks.map(site => ({ id: site.id, roofs: '', walls: '', ridges: '' }));
    const roadLayer = layers.find(layer=>layer.id==='southern-road')!;
    const jinshuiLayer = layers.find(layer=>layer.id==='jinshui')!;
    const bridgePoint = ([x,z]: [number,number]) => `${440+(x-45)*SCALE},${520+(z-3)*SCALE}`;
    for(const bridge of jinshuiLayout(data.context)) {
      const corners: [number,number][] = [[bridge.x-bridge.width/2,bridge.crossingNorthZ],[bridge.x+bridge.width/2,bridge.crossingNorthZ],[bridge.x+bridge.width/2,bridge.crossingSouthZ],[bridge.x-bridge.width/2,bridge.crossingSouthZ]];
      jinshuiLayer.walls += 'M'+corners.map(bridgePoint).join('L')+'Z';
      jinshuiLayer.ridges += 'M'+bridgePoint([bridge.x,bridge.northZ])+'L'+bridgePoint([bridge.x,bridge.southZ]);
    }
    for(const ring of roadPlanRings()) roadLayer.roofs += 'M'+ring.map(([x,z])=>`${440+(x-45)*SCALE},${520+(z-3)*SCALE}`).join('L')+'Z';
    for(const line of roadPlanDetails())roadLayer.ridges+='M'+line.map(([x,z])=>`${440+(x-45)*SCALE},${520+(z-3)*SCALE}`).join('L');
    for (const building of data.buildings) {
      const palace = landmarks.find(site=>site.id==='forbidden-city')!;
      const display = shenwuForecourtLayout(palace,data,building.id);
      const [px,pz] = project(palace.coords);
      const ring = display ? display.ring.map(([x,z]):[number,number]=>[x+px,z+pz]) : localBuildingRing(building);
      const center = ring.reduce((sum,p) => [sum[0]+p[0]/ring.length,sum[1]+p[1]/ring.length],[0,0]);
      let nearest = -1, distance = 1;
      landmarks.forEach((site,index) => {
        const [x,z] = project(site.coords);
        const d = Math.max(Math.abs(center[0]-x)/(site.footprint[0]/20),Math.abs(center[1]-z)/(site.footprint[1]/20));
        if (d < distance) { nearest = index; distance = d; }
      });
      if(palaceGateIds.some(id => id === building.id)) nearest=landmarks.findIndex(site=>site.id==='forbidden-city');
      if([25109960,439956436].includes(building.id))nearest=landmarks.findIndex(site=>site.id==='zhengyang');
      if (nearest < 0) continue;
      const layer = layers[nearest];
      const site=landmarks[nearest], p=display??(palaceRaisedBuildings.has(building.id)?palaceRoofCore(building,site):localFootprintLayout(building,site)), [ox,oz]=project(site.coords);
      if(building.id===267371087) {
        const offset=drumTowerDisplayOffset(site);
        p.x+=offset;
        for(const point of ring)point[0]+=offset;
      }
      const global=([u,v]:[number,number]):[number,number]=>[ox+p.x+u*Math.cos(p.rotation)+v*Math.sin(p.rotation),oz+p.z-u*Math.sin(p.rotation)+v*Math.cos(p.rotation)];
      const worldPath=(points:[number,number][])=>'M'+points.map(([x,z])=>`${440+(x-45)*SCALE},${520+(z-3)*SCALE}`).join('L');
      if(moundStoneGates.has(building.id)) {
        for(const u of [-.48,-.31,-.16,.16,.31,.48])layer.walls+=worldPath([[-.035,-.045],[.035,-.045],[.035,.045],[-.035,.045]].map(([x,z])=>global([x+u*p.width,z])))+'Z';
        for(const [a,b] of [[-.48,-.31],[-.16,.16],[.31,.48]])layer.ridges+=worldPath([global([a*p.width,0]),global([b*p.width,0])]);
        continue;
      }
      if(building.id===439956436) {
        for(const [w,d,z] of [[6.4,2.24,.6],[6.12,1.99,.6],[4.42,1.45,-.96]]) {
          layer.roofs+=worldPath([[-w/2,z-d/2],[w/2,z-d/2],[w/2,z+d/2],[-w/2,z+d/2]].map(point=>global(point as [number,number])))+'Z';
          for(const line of roofPlanLines(w,d,'hip-gable'))layer.ridges+=worldPath(line.map(([u,v])=>global([u,v+z])));
        }
        continue;
      }
      if(building.id===25109960) {
        layer.walls+=worldPath(zhengyangPlatformRing(site,data))+'Z';
        for(const [w,d] of zhengyangCityRoofs) {
          layer.roofs+=worldPath([[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(point=>global(point as [number,number])))+'Z';
          for(const line of roofPlanLines(w,d,'hip-gable'))layer.ridges+=worldPath(line.map(global));
        }
        continue;
      }
      if (site.id === 'tiananmen' || site.id === 'duanmen' || site.id === 'yongdingmen') continue;
      const path = 'M'+ring.map(([x,z]) => `${440+(x-45)*SCALE},${520+(z-3)*SCALE}`).join('L')+'Z';
      if(palaceGateIds.some(id => id === building.id)) {
        const gate = palaceGateLayout(site, data, building.id)!;
        const gc = Math.cos(gate.rotation), gs = Math.sin(gate.rotation);
        const gateWorld = ([x,z]:[number,number]):[number,number] => [ox+gate.x+x*gc+z*gs,oz+gate.z-x*gs+z*gc];
        layer.walls += path;
        for(const part of palaceGateHalls(gate)) {
          const c = Math.cos(part.rotation), s = Math.sin(part.rotation);
          const convert = ([x,z]:[number,number]) => gateWorld([part.x+x*c+z*s,part.z-x*s+z*c]);
          layer.roofs += worldPath([[-part.width/2,-part.depth/2],[part.width/2,-part.depth/2],[part.width/2,part.depth/2],[-part.width/2,part.depth/2]].map(point=>convert(point as [number,number])))+'Z';
          for(const line of roofPlanLines(part.width,part.depth,part.profile.roof)) layer.ridges += worldPath(line.map(convert));
        }
        continue;
      }
      if(palaceTerraces.has(building.id)){layer.walls+=path;continue;}
      if([43512262,43519304].includes(building.id)) {
        layer.walls+=path;
        for(const [name,part] of Object.entries(palaceSideHallLayout(building,site))) {
          const c=Math.cos(part.rotation),s=Math.sin(part.rotation);
          const convert=([x,z]:[number,number]):[number,number]=>[ox+part.x+x*c+z*s,oz+part.z-x*s+z*c];
          layer.roofs+=worldPath([[-part.width/2,-part.depth/2],[part.width/2,-part.depth/2],[part.width/2,part.depth/2],[-part.width/2,part.depth/2]].map(point=>convert(point as [number,number])))+'Z';
          const lines=name==='corridor'?roofPlanLines(part.depth,part.width,'gable').map(line=>line.map(([x,z]):[number,number]=>[z,-x])):roofPlanLines(part.width,part.depth,'hip-gable');
          for(const line of lines)layer.ridges+=worldPath(line.map(convert));
        }
        continue;
      }
      if(palaceRaisedBuildings.has(building.id)) {
        layer.walls+=path;
        layer.roofs+=worldPath([[-p.width/2,-p.depth/2],[p.width/2,-p.depth/2],[p.width/2,p.depth/2],[-p.width/2,p.depth/2]].map(point=>global(point as [number,number])))+'Z';
        for(const line of roofPlanLines(p.width,p.depth,[638590122,638590123].includes(building.id)?'hipped':'hip-gable'))layer.ridges+=worldPath(line.map(global));
        continue;
      }
      const wall = building.building === 'wall' || /墙/.test(building.name ?? '');
      if (wall) layer.walls += path;
      else {
        layer.roofs += path;
        const form=palaceHallProfiles[building.id]?.roof??([425993664,267371087].includes(building.id)?'hip-gable':mappedRoofForm(building.roof));
        const area=Math.abs(ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1];},0))/2;
        const lines=roofPlanLines(p.width,p.depth,form).map(line=>line.map(global));
        if(area/(p.width*p.depth)<.86) {
          // Follow each wing rather than drawing a bounding-box ridge through its court.
          const sign=ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1];},0)>0?1:-1;
          for(let i=0;i<ring.length;i++) {
            const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length<.1)continue;
            const offset=Math.min(.16,p.depth*.2)*sign;
            const shifted:[number,number][]=[a,b].map(([x,z])=>[x-dz/length*offset,z+dx/length*offset]);
            for(const segment of wallRuns(shifted[0],shifted[1],[ring],true))layer.ridges+=worldPath(segment);
          }
        } else if(p.width>.9&&p.depth>.4)for(const line of lines)for(const segment of wallRuns(line[0],line[1],[ring],true))layer.ridges+=worldPath(segment);
      }
    }
    const tiananmen = landmarks.find(site => site.id === 'tiananmen')!, gateLayer = layers.find(layer => layer.id === 'tiananmen')!;
    const [gx, gz] = project(tiananmen.coords);
    const gatePath = (points: [number, number][]) => 'M' + points.map(([x,z]) => `${440+(gx+x-45)*SCALE},${520+(gz+z-3)*SCALE}`).join('L');
    const rectangle = (w: number, d: number): [number,number][] => [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
    gateLayer.walls += gatePath(rectangle(tiananmenWidth, tiananmenDepth)) + 'Z';
    for (const roof of tiananmenRoofs) {
      gateLayer.roofs += gatePath(rectangle(roof.width, roof.depth)) + 'Z';
      for (const line of roofPlanLines(roof.width, roof.depth, roof.form)) gateLayer.ridges += gatePath(line);
    }
    const duanmen = landmarks.find(site => site.id === 'duanmen')!, duanmenLayer = layers.find(layer => layer.id === 'duanmen')!;
    const [dx, dz] = project(duanmen.coords);
    const duanmenPath = (points: [number, number][]) => 'M' + points.map(([x,z]) => `${440+(dx+x-45)*SCALE},${520+(dz+z-3)*SCALE}`).join('L');
    duanmenLayer.walls += duanmenPath(rectangle(duanmenPlatform.width, duanmenPlatform.depth)) + 'Z';
    for (const roof of duanmenRoofs) {
      duanmenLayer.roofs += duanmenPath(rectangle(roof.width, roof.depth)) + 'Z';
      for (const line of roofPlanLines(roof.width, roof.depth, roof.form)) duanmenLayer.ridges += duanmenPath(line);
    }
    const southGate = landmarks.find(site => site.id === 'yongdingmen')!, southGateLayer = layers.find(layer => layer.id === 'yongdingmen')!;
    const [sx, sz] = project(southGate.coords);
    const southPath = (points: [number, number][]) => 'M' + points.map(([x,z]) => `${440+(sx+x-45)*SCALE},${520+(sz+z-3)*SCALE}`).join('L');
    southGateLayer.walls += southPath(rectangle(yongdingmenPlatform.width, yongdingmenPlatform.depth)) + 'Z';
    for (const roof of yongdingmenRoofs) {
      southGateLayer.roofs += southPath(rectangle(roof.width, roof.depth)) + 'Z';
      for (const line of roofPlanLines(roof.width, roof.depth, roof.form)) southGateLayer.ridges += southPath(line);
    }
    const temple=landmarks.find(site=>site.id==='tiantan')!,templeLayer=layers.find(layer=>layer.id==='tiantan')!,enclosures=moundEnclosures(data.buildings,temple),[tx,tz]=project(temple.coords);
    const templePath=(points:[number,number][])=>'M'+points.map(([x,z])=>`${440+(tx+x-45)*SCALE},${520+(tz+z-3)*SCALE}`).join('L');
    for(const run of [...enclosures.inner,...enclosures.outer])templeLayer.walls+=templePath(run);
    for(const run of tiantanWallRuns(temple,data))templeLayer.walls+=templePath([run.a,run.b]);
    const [mx,mz]=moundCenter(temple);
    for(const radius of [2.7455,1.9655,1.1825])templeLayer.ridges+=templePath(Array.from({length:65},(_,i)=>[mx+Math.sin(i/64*Math.PI*2)*radius,mz+Math.cos(i/64*Math.PI*2)*radius]))+'Z';
    const palace=landmarks.find(site=>site.id==='forbidden-city')!,middle=zhongheLayout(palace,data),[ox,oz]=project(palace.coords);
    for(const run of palaceWallRuns(palace,data))layers.find(layer=>layer.id===palace.id)!.walls+='M'+[run.a,run.b].map(([x,z])=>`${440+(ox+x-45)*SCALE},${520+(oz+z-3)*SCALE}`).join('L');
    const deck=sharedPalaceTerrace(palace,data);
    if(deck.length)layers.find(layer=>layer.id==='forbidden-city')!.walls+='M'+deck.map(([x,z])=>`${440+(x+ox-45)*SCALE},${520+(z+oz-3)*SCALE}`).join('L')+'Z';
    const mc=Math.cos(middle.rotation),ms=Math.sin(middle.rotation);
    const convert=([u,v]:[number,number])=>[440+(ox+middle.x+u*mc+v*ms-45)*SCALE,520+(oz+middle.z-u*ms+v*mc-3)*SCALE];
    const middleRing:[number,number][]=[[-middle.width/2,-middle.depth/2],[middle.width/2,-middle.depth/2],[middle.width/2,middle.depth/2],[-middle.width/2,middle.depth/2]];
    const layer=layers.find(layer=>layer.id==='forbidden-city')!;
    layer.roofs+='M'+middleRing.map(point=>convert(point).join(',')).join('L')+'Z';
    for(const line of roofPlanLines(middle.width,middle.depth,'pyramidal'))layer.ridges+='M'+line.map(point=>convert(point).join(',')).join('L');
    const agriculture=landmarks.find(site=>site.id==='xiannongtan')!,agricultureLayer=layers.find(layer=>layer.id===agriculture.id)!,[ax,az]=project(agriculture.coords);
    for(const compound of agricultureCompounds(agriculture))for(const part of compound.parts) {
      const c=Math.cos(part.turn??0),s=Math.sin(part.turn??0);
      const convert=([u,v]:[number,number])=>[440+(ax+compound.x+part.x+u*c+v*s-45)*SCALE,520+(az+compound.z+part.z-u*s+v*c-3)*SCALE];
      const round=part.kind==='granary'||part.kind==='well';
      const sides=part.kind==='granary'?24:part.bays===6?6:4;
      const ring:[number,number][]=round?Array.from({length:sides},(_,i)=>{const a=i/sides*Math.PI*2;return [Math.cos(a)*part.width/2,Math.sin(a)*part.depth/2];}):[[-part.width/2,-part.depth/2],[part.width/2,-part.depth/2],[part.width/2,part.depth/2],[-part.width/2,part.depth/2]];
      agricultureLayer.roofs+='M'+ring.map(point=>convert(point).join(',')).join('L')+'Z';
      const lines=round?ring.map(point=>[point,[0,0]] as [number,number][]):roofPlanLines(part.width,part.depth,part.roof);
      for(const line of lines)agricultureLayer.ridges+='M'+line.map(point=>convert(point).join(',')).join('L');
    }
    const bridgeLayer=layers.find(layer=>layer.id==='wanning')!,bridgeSite=landmarks.find(site=>site.id==='wanning')!,[bx,bz]=project(bridgeSite.coords);
    const bridge=wanningLayout(bridgeSite),c=Math.cos(bridge.rotation),s=Math.sin(bridge.rotation);
    const wanningBridgePoint=(x:number,z:number)=>`${440+(bx+bridge.x+x*c+z*s-45)*SCALE},${520+(bz+bridge.z-x*s+z*c-3)*SCALE}`;
    bridgeLayer.roofs+='M'+[[-.85,-1.73],[.85,-1.73],[.85,1.73],[-.85,1.73]].map(([x,z])=>wanningBridgePoint(x,z)).join('L')+'Z';
    for(const x of [-.8,.8])bridgeLayer.ridges+=`M${wanningBridgePoint(x,-1.73)}L${wanningBridgePoint(x,1.73)}`;
    for(let z=-1.5;z<=1.5;z+=.3)bridgeLayer.ridges+=`M${wanningBridgePoint(-.8,z)}L${wanningBridgePoint(.8,z)}`;
    const civic=[...squarePlanParts(data).map(part=>({id:'square',...part})),...Object.values(civicLayouts).flatMap(layout=>civicPlanParts(layout).map(part=>({id:layout.id,...part})))].map(part=>({id:part.id,kind:part.kind,path:'M'+part.ring.map(([x,z])=>`${440+(x-45)*SCALE},${520+(z-3)*SCALE}`).join('L')+'Z'}));
    const axis=axisThroughShenwu([...landmarks.filter(s=>!['shejitan','taimiao','square','tiantan','xiannongtan','southern-road'].includes(s.id)).map(site=>project(site.coords)),...southernRoadPath()].sort((a,b)=>a[1]-b[1]),palace,data);
    const plan = await createCityPlan(data, 2048, true);
    return { axis, image: plan.toDataURL(), layers, civic };
  }).catch(error => {planPromise=undefined;throw error;});
  return planPromise;
}

export default function FlatMap({ selection, focus, onSelect, viewRevision }: Props) {
  const host=useRef<HTMLDivElement>(null);
  const pointers=useRef(new Map<number,{x:number;y:number;startX:number;startY:number}>());
  const suppressClick=useRef(false);
  const [plan,setPlan]=useState<Plan>(),[error,setError]=useState(false);
  const [view,setView]=useState({x:0,y:0,scale:1});
  const mapPosition=(x:number,y:number)=>{
    const matrix=host.current?.querySelector('svg')?.getScreenCTM();
    return matrix ? new DOMPoint(x,y).matrixTransform(matrix.inverse()) : null;
  };
  const releasePointer=(event:ReactPointerEvent<HTMLDivElement>)=>{
    pointers.current.delete(event.pointerId);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  useEffect(()=>{let alive=true;loadPlan().then(value=>{if(alive)setPlan(value);}).catch(()=>{if(alive)setError(true);});return()=>{alive=false;};},[]);
  useEffect(()=>setView({x:0,y:0,scale:1}),[focus,viewRevision]);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    const wheel=(event:WheelEvent)=>{
      event.preventDefault();
      const point=mapPosition(event.clientX,event.clientY);if(!point)return;
      const {x,y}=point;
      setView(old=>{const scale=Math.max(.85,Math.min(12,old.scale*Math.exp(-event.deltaY*.0015)));const factor=scale/old.scale;return{x:x-(x-old.x)*factor,y:y-(y-old.y)*factor,scale};});
    };
    el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
  },[]);
  const markers=landmarks.map(site=>{
    const [x,y]=sitePoint(site),side=labelSides.has(site.id)?-1:1;
    return{site,x,y,side,labelX:side<0?x-40:x+40,labelY:y};
  });
  for(const side of [-1,1]){
    let last=100;
    for(const item of markers.filter(m=>m.side===side).sort((a,b)=>a.y-b.y)){item.labelY=Math.max(item.y,last+31);last=item.labelY;}
  }
  const axis=(plan?.axis??[]).map(([x,z])=>[440+(x-45)*SCALE,520+(z-3)*SCALE]);
  const axisPath=axis.length ? `M${axis.map(p=>p.join(',')).join('L')}` : '';
  return <div ref={host} className="flat-map" aria-label="北京中轴线二维地图" onPointerDown={event=>{
    if(event.button!==0&&event.button!==1)return;
    if(!pointers.current.size)suppressClick.current=false;
    const site=(event.target as Element).closest('.flat-site');
    if(event.pointerType!=='touch'&&event.button===0&&site)return;
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY});
    // Preserve a label tap's original target; capture it once it becomes a gesture.
    if(!site||event.button===1){event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);}
    if(pointers.current.size>1){
      suppressClick.current=true;
      for(const id of pointers.current.keys())event.currentTarget.setPointerCapture(id);
    }
  }} onPointerMove={event=>{
    const current=pointers.current.get(event.pointerId);if(!current)return;
    const before=[...pointers.current.values()].map(p=>mapPosition(p.x,p.y));
    current.x=event.clientX;current.y=event.clientY;
    const after=[...pointers.current.values()].map(p=>mapPosition(p.x,p.y));
    if(Math.hypot(current.x-current.startX,current.y-current.startY)>5){
      suppressClick.current=true;event.currentTarget.setPointerCapture(event.pointerId);
    }
    if(!before[0]||!after[0])return;
    if(before.length===1){
      const dx=after[0].x-before[0].x,dy=after[0].y-before[0].y;
      setView(old=>({...old,x:old.x+dx,y:old.y+dy}));
    }else if(before.length===2&&before[1]&&after[1]){
      const from={x:(before[0].x+before[1].x)/2,y:(before[0].y+before[1].y)/2};
      const to={x:(after[0].x+after[1].x)/2,y:(after[0].y+after[1].y)/2};
      const distance=Math.hypot(before[1].x-before[0].x,before[1].y-before[0].y);
      const nextDistance=Math.hypot(after[1].x-after[0].x,after[1].y-after[0].y);
      if(distance<1||nextDistance<1)return;
      setView(old=>{
        const scale=Math.max(.85,Math.min(12,old.scale*nextDistance/distance)),factor=scale/old.scale;
        return{x:to.x-(from.x-old.x)*factor,y:to.y-(from.y-old.y)*factor,scale};
      });
    }
  }} onPointerUp={releasePointer} onPointerCancel={event=>{suppressClick.current=true;releasePointer(event);}}
    onLostPointerCapture={event=>{if(event.target===event.currentTarget)pointers.current.delete(event.pointerId);}}
    onClickCapture={event=>{if(suppressClick.current&&event.detail!==0){event.preventDefault();event.stopPropagation();}}}>
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-labelledby="flat-map-title">
      <title id="flat-map-title">北京中轴线地理导览：本地道路、水系与建筑轮廓；单指平移、双指缩放，或中键拖动、滚轮缩放，Tab 可选择遗产点</title>
      <defs><pattern id="plan-grid" width="73" height="73" patternUnits="userSpaceOnUse"><path d="M73 0H0V73" fill="none" stroke="currentColor" strokeOpacity=".1" strokeWidth=".5" /></pattern></defs>
      <g className="flat-map-content" transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
        {plan&&<image href={plan.image} x={440-640*SCALE/2} y={520-1090*SCALE/2} width={640*SCALE} height={1090*SCALE} />}
        <rect x="150" y="100" width="580" height="840" fill="url(#plan-grid)" className="flat-grid" pointerEvents="none" />
        <g className="civic-plan" aria-hidden="true" pointerEvents="none">
          {plan?.civic.filter(part=>part.kind==='plaza'||part.kind==='joint').map((part,index)=><path key={index} className={`civic-${part.kind}`} d={part.path}/>)}
        </g>
        {plan?.layers.map(layer=>{
          const site=landmarks.find(item=>item.id===layer.id)!, selected=site.id===selection, muted=focus!=='all'&&site.region!==focus;
          return <g key={site.id} data-plan-site={site.id} className={`flat-landmark-detail mapped-plan ${selected?'is-selected':''} ${site.id==='tiantan'?'temple-plan':''}`} opacity={muted?.3:1} pointerEvents="none">
            <path className="plan-roofs" d={layer.roofs}/><path className="plan-walls" d={layer.walls}/><path className="plan-ridges" d={layer.ridges}/>
          </g>;
        })}
        <g className="civic-plan" aria-hidden="true" pointerEvents="none">
          {plan?.civic.filter(part=>part.kind!=='plaza'&&part.kind!=='joint').map((part,index)=><path key={index} data-civic={part.id} className={`civic-${part.kind}`} d={part.path}/>)}
        </g>
        <path className="flat-axis-halo" vectorEffect="non-scaling-stroke" d={axisPath} />
        <path className="flat-axis-line" vectorEffect="non-scaling-stroke" d={axisPath} />
        {annotations.map(([name,coords])=>{const[x,y]=mapPoint(coords);return <text key={name} x={x} y={y} transform={`translate(${x} ${y}) scale(${1/view.scale}) translate(${-x} ${-y})`} className="flat-context-label">{name}</text>;})}
        {markers.map(({site,x,y,labelX,labelY,side},index)=>{
          const selected=site.id===selection,muted=focus!=='all'&&site.region!==focus;
          return <g key={site.id} transform={`translate(${x} ${y}) scale(${1/view.scale}) translate(${-x} ${-y})`} className={`flat-site ${selected?'is-selected':''}`} opacity={muted?.48:1} role="button" tabIndex={0} aria-label={`查看${site.name}`} aria-pressed={selected} onClick={()=>onSelect(site.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(site.id);}}}>
            <path className="flat-leader" d={`M${x},${y}h${side*18}L${labelX-side*8},${labelY}`} />
            <circle className="flat-marker" cx={x} cy={y} r={selected?4.5:3} />
            <circle className="flat-marker-core" cx={x} cy={y} r="1" />
            <rect className="flat-label-plate" x={side<0?labelX-site.name.length*15-22:labelX-5} y={labelY-14} width={site.name.length*15+27} height="29" />
            <text x={labelX} y={labelY+5} textAnchor={side<0?'end':'start'}><tspan className="flat-index">{String(index+1).padStart(2,'0')} </tspan>{site.name}</text>
          </g>;
        })}
      </g>
      <g className="flat-legend" transform="translate(230 970)"><path className="flat-axis-line" d="M0 0h30"/><text x="42" y="5">中轴序列</text><circle className="flat-marker" cx="175" r="5"/><text x="190" y="5">遗产点</text><rect x="305" y="-6" width="18" height="10" fill="#234f68"/><text x="335" y="5">水系</text></g>
      <text x="440" y="1008" textAnchor="middle" className="flat-attribution">© OpenStreetMap contributors · ODbL · 地理导览示意</text>
    </svg>
    {!plan&&<p className="flat-map-status" role="status">{error?'底图暂未载入，仍可点选遗产地点。':'正在绘制京城街巷…'}</p>}
  </div>;
}
