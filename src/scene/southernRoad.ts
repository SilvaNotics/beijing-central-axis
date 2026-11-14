import { landmarks } from '../data/heritage';
import { project } from './geo';
import { wgs84ToGcj02 } from './geodata';

// The centre of the paired carriageways at Tianqiao and Yongdingmennei,
// and the central crossing at Xiannongtan Qianjie, from the bundled OSM roads.
// These are navigation control points, not a survey of buried archaeology.
const streetCentres: [number,number][] = [
  [116.39236,39.88500], [116.3924256,39.8833945],
  [116.3926438,39.8795000], [116.3928644,39.8753144],
];
export function southernRoadPath(): [number,number][] {
  return [...streetCentres.map(point=>project(wgs84ToGcj02(point))), project(landmarks.find(site=>site.id==='yongdingmen')!.coords)];
}

/** Sample from the gate northwards, keeping pavement and all details together. */
export function roadStation(metresNorth: number, lateralMetres = 0) {
  const path=southernRoadPath().reverse();
  let remaining=metresNorth/10;
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(remaining<=length || i===path.length-1) {
      const t=Math.min(1,remaining/length), lateral=lateralMetres/10;
      return {x:a[0]+dx*t-dz/length*lateral,z:a[1]+dz*t+dx/length*lateral,rotation:Math.atan2(-dx,-dz)};
    }
    remaining-=length;
  }
  throw new Error('Southern road needs two control points');
}

/** Shared display envelopes, in atlas units (10 m). They are not excavation surveys. */
export const roadExhibits = [
  {station:100,lateral:-8,width:.78,depth:3.8},
  {station:100,lateral:8,width:.78,depth:3.8},
  {station:400,lateral:-5,width:1.05,depth:2.5},
];
export function roadLocalPoint(station:number,lateral:number,x:number,z:number):[number,number] {
  const p=roadStation(station,lateral),c=Math.cos(p.rotation),s=Math.sin(p.rotation);
  return [p.x+c*x+s*z,p.z-s*x+c*z];
}
export function roadRectangle(station:number,lateral:number,width:number,depth:number,x=0,z=0):[number,number][] {
  return [[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].map(([u,v])=>roadLocalPoint(station,lateral,u+x,v+z));
}
/** Trim modern surfacing clear of every exhibit, including its retaining edge. */
export function roadPavingRuns(station:number):[number,number][] {
  let runs:[number,number][]=[[-.7,.7]];
  for(const e of roadExhibits) {
    if(Math.abs(station-e.station)>e.depth*5+2.1)continue;
    const left=e.lateral/10-e.width/2-.06,right=e.lateral/10+e.width/2+.06;
    runs=runs.flatMap(([a,b]):[number,number][]=>b<=left||a>=right?[[a,b]]:[...(a<left?[[a,left] as [number,number]]:[]),...(b>right?[[right,b] as [number,number]]:[])]);
  }
  return runs.filter(([a,b])=>b-a>.02);
}
export function roadPlanRings():[number,number][][] {
  const rings:[number,number][][]=[];
  for(let station=28;station<440;station+=4)for(const [a,b] of roadPavingRuns(station))rings.push(roadRectangle(station,0,b-a,.402,(a+b)/2));
  for(const e of roadExhibits)rings.push(roadRectangle(e.station,e.lateral,e.width,e.depth));
  return rings;
}
export function roadPlanDetails():[number,number][][] {
  const lines:[number,number][][]=[];
  for(const lateral of [-8,8]) {
    for(let col=0;col<4;col++)lines.push([-.24+col*.16,-.24+col*.16].map((x,i)=>roadLocalPoint(100,lateral,x,i?1.75:-1.75)));
    for(let row=0;row<=14;row++)lines.push([roadLocalPoint(100,lateral,-.24,-1.75+row*.25),roadLocalPoint(100,lateral,.24,-1.75+row*.25)]);
  }
  for(let layer=0;layer<7;layer++)lines.push([roadLocalPoint(400,-5,-.42,1.16-layer*.29),roadLocalPoint(400,-5,.42,1.16-layer*.29)]);
  return lines;
}
