import type { Landmark } from '../data/types';
import { localFootprintLayout, type BuildingFootprint } from './geodata';
import { moundCenter, moundInnerGates, moundOuterGates, layoutCorners } from './templeLayout';
import { wallRuns } from './wallRuns';
type Point=[number,number];

/** Shared plan and 3D wall runs, clipped at the same eight mapped gates. */
export function moundEnclosures(buildings:BuildingFootprint[],site:Landmark) {
  const byId=(id:number)=>buildings.find(b=>b.id===id)!;
  const at=(id:number)=>localFootprintLayout(byId(id),site);
  const [x,z]=moundCenter(site);
  const radius=moundInnerGates.reduce((sum,id)=>{const p=at(id);return sum+Math.hypot(p.x-x,p.z-z);},0)/4;
  const gaps=moundInnerGates.map(id=>{const p=at(id);return {angle:Math.atan2(p.x-x,p.z-z),half:(p.width/2+.06)/radius};});
  const inner:[Point,Point][]=[];
  for(let i=0;i<192;i++) {
    const a=i/192*Math.PI*2,b=(i+1)/192*Math.PI*2,mid=(a+b)/2;
    if(gaps.some(gap=>Math.abs(Math.atan2(Math.sin(mid-gap.angle),Math.cos(mid-gap.angle)))<gap.half))continue;
    inner.push([[x+Math.sin(a)*radius,z+Math.cos(a)*radius],[x+Math.sin(b)*radius,z+Math.cos(b)*radius]]);
  }
  const north=at(43922670),south=at(43922669),yaw=Math.atan2(south.x-north.x,south.z-north.z),c=Math.cos(yaw),s=Math.sin(yaw);
  const positions=moundOuterGates.map(id=>{const p=at(id);return [(p.x-x)*c-(p.z-z)*s,(p.x-x)*s+(p.z-z)*c];});
  const left=Math.min(...positions.map(p=>p[0])),right=Math.max(...positions.map(p=>p[0])),top=Math.min(...positions.map(p=>p[1])),bottom=Math.max(...positions.map(p=>p[1]));
  const ring:Point[]=[[left,top],[right,top],[right,bottom],[left,bottom]].map(([u,v])=>[x+u*c+v*s,z-u*s+v*c]);
  const masks=moundOuterGates.map(id=>layoutCorners(byId(id),site));
  const outer=ring.flatMap((a,i)=>wallRuns(a,ring[(i+1)%4],masks));
  return {inner,outer,ring};
}
