import { useEffect, useRef, useState } from 'react';
import { landmarks } from '../data/heritage';
import type { RegionId } from '../data/types';
import { createCityPlan } from '../scene/cityPlan';
import { loadCityData, localBuildingRing, localFootprintLayout } from '../scene/geodata';
import { project } from '../scene/geo';
import type { Landmark } from '../data/types';
import { civicLayouts, civicPlanParts, squarePlanParts } from '../scene/civicLayout';
import { southernRoadPath, roadPlanRings } from '../scene/southernRoad';
import { palaceHallProfiles, zhongheLayout } from '../scene/palaceArchitecture';
import { roofPlanLines, mappedRoofForm } from '../scene/roofForms';

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
interface Plan { image: string; layers: PlanLayer[]; civic: {id:string;kind:string;path:string}[]; }
let planPromise: Promise<Plan> | undefined;
function loadPlan() {
  planPromise ??= loadCityData().then(data => {
    const layers = landmarks.map(site => ({ id: site.id, roofs: '', walls: '', ridges: '' }));
    const roadLayer = layers.find(layer=>layer.id==='southern-road')!;
    for(const ring of roadPlanRings()) roadLayer.roofs += 'M'+ring.map(([x,z])=>`${440+(x-45)*SCALE},${520+(z-3)*SCALE}`).join('L')+'Z';
    for (const building of data.buildings) {
      const ring = localBuildingRing(building);
      const center = ring.reduce((sum,p) => [sum[0]+p[0]/ring.length,sum[1]+p[1]/ring.length],[0,0]);
      let nearest = -1, distance = 1;
      landmarks.forEach((site,index) => {
        const [x,z] = project(site.coords);
        const d = Math.max(Math.abs(center[0]-x)/(site.footprint[0]/20),Math.abs(center[1]-z)/(site.footprint[1]/20));
        if (d < distance) { nearest = index; distance = d; }
      });
      if (nearest < 0) continue;
      const layer = layers[nearest];
      const path = 'M'+ring.map(([x,z]) => `${440+(x-45)*SCALE},${520+(z-3)*SCALE}`).join('L')+'Z';
      const wall = building.building === 'wall' || /墙/.test(building.name ?? '');
      if (wall) layer.walls += path;
      else {
        layer.roofs += path;
        const site=landmarks[nearest], p=localFootprintLayout(building,site), [ox,oz]=project(site.coords);
        const form=palaceHallProfiles[building.id]?.roof??mappedRoofForm(building.roof);
        const convert=([u,v]:[number,number])=>[440+(ox+p.x+u*Math.cos(p.rotation)+v*Math.sin(p.rotation)-45)*SCALE,520+(oz+p.z-u*Math.sin(p.rotation)+v*Math.cos(p.rotation)-3)*SCALE];
        if(p.width>.9&&p.depth>.4)for(const line of roofPlanLines(p.width,p.depth,form))layer.ridges+='M'+line.map(point=>convert(point).join(',')).join('L');
      }
    }
    const palace=landmarks.find(site=>site.id==='forbidden-city')!,middle=zhongheLayout(palace),[ox,oz]=project(palace.coords);
    const convert=([u,v]:[number,number])=>[440+(ox+middle.x+u-45)*SCALE,520+(oz+middle.z+v-3)*SCALE];
    const middleRing:[number,number][]=[[-middle.width/2,-middle.depth/2],[middle.width/2,-middle.depth/2],[middle.width/2,middle.depth/2],[-middle.width/2,middle.depth/2]];
    const layer=layers.find(layer=>layer.id==='forbidden-city')!;
    layer.roofs+='M'+middleRing.map(point=>convert(point).join(',')).join('L')+'Z';
    for(const line of roofPlanLines(middle.width,middle.depth,'pyramidal'))layer.ridges+='M'+line.map(point=>convert(point).join(',')).join('L');
    const civic=[...squarePlanParts().map(part=>({id:'square',...part})),...Object.values(civicLayouts).flatMap(layout=>civicPlanParts(layout).map(part=>({id:layout.id,...part})))].map(part=>({id:part.id,kind:part.kind,path:'M'+part.ring.map(([x,z])=>`${440+(x-45)*SCALE},${520+(z-3)*SCALE}`).join('L')+'Z'}));
    return { image: createCityPlan(data,2048,true).toDataURL(), layers, civic };
  }).catch(error => {planPromise=undefined;throw error;});
  return planPromise;
}

export default function FlatMap({ selection, focus, onSelect, viewRevision }: Props) {
  const host=useRef<HTMLDivElement>(null), drag=useRef<{id:number;x:number;y:number;panX:number;panY:number;moved:boolean}|null>(null);
  const [plan,setPlan]=useState<Plan>(),[error,setError]=useState(false);
  const [view,setView]=useState({x:0,y:0,scale:1});
  useEffect(()=>{let alive=true;loadPlan().then(value=>{if(alive)setPlan(value);}).catch(()=>{if(alive)setError(true);});return()=>{alive=false;};},[]);
  useEffect(()=>setView({x:0,y:0,scale:1}),[focus,viewRevision]);
  useEffect(()=>{
    const el=host.current;if(!el)return;
    const wheel=(event:WheelEvent)=>{
      event.preventDefault();
      const rect=el.querySelector('svg')!.getBoundingClientRect();
      // SVG uses meet, so account for letterboxing in both directions.
      const ratio=Math.min(rect.width/WIDTH,rect.height/HEIGHT);
      const x=(event.clientX-rect.left-(rect.width-WIDTH*ratio)/2)/ratio;
      const y=(event.clientY-rect.top-(rect.height-HEIGHT*ratio)/2)/ratio;
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
  const axis=[...landmarks.filter(s=>!['shejitan','taimiao','square','tiantan','xiannongtan','southern-road'].includes(s.id)).map(sitePoint),...southernRoadPath().map(([x,z])=>[440+(x-45)*SCALE,520+(z-3)*SCALE])].sort((a,b)=>a[1]-b[1]);
  return <div ref={host} className="flat-map" aria-label="北京中轴线二维地图" onPointerDown={event=>{
    if(event.button!==0&&event.button!==1)return;
    if(event.button===0&&(event.target as Element).closest('.flat-site'))return;
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
    drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,panX:view.x,panY:view.y,moved:false};
  }} onPointerMove={event=>{
    const current=drag.current;if(!current||event.pointerId!==current.id)return;
    const rect=event.currentTarget.getBoundingClientRect(),ratio=Math.min(rect.width/WIDTH,rect.height/HEIGHT);
    const dx=(event.clientX-current.x)/ratio,dy=(event.clientY-current.y)/ratio;
    if(Math.hypot(dx,dy)>3)current.moved=true;
    setView(old=>({...old,x:current.panX+dx,y:current.panY+dy}));
  }} onPointerUp={event=>{if(drag.current?.id===event.pointerId){event.currentTarget.releasePointerCapture(event.pointerId);drag.current=null;}}} onPointerCancel={()=>{drag.current=null;}}>
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-labelledby="flat-map-title">
      <title id="flat-map-title">北京中轴线地理导览：本地道路、水系与建筑轮廓；中键拖动、滚轮缩放，Tab 可选择遗产点</title>
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
        <path className="flat-axis-halo" vectorEffect="non-scaling-stroke" d={`M${axis.map(p=>p.join(',')).join('L')}`} />
        <path className="flat-axis-line" vectorEffect="non-scaling-stroke" d={`M${axis.map(p=>p.join(',')).join('L')}`} />
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
