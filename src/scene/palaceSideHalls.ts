import type { Landmark } from '../data/types';
import { localFootprintLayout, type BuildingFootprint } from './geodata';
import { alignPalaceRoof } from './precincts';

/** GEO-OSM provides the H outline; PAL-WUYING / PAL-WENHUA identify the
 * front hall, rear hall and connecting corridor. Heights remain schematic. */
export function palaceSideHallLayout(building:BuildingFootprint,site:Landmark) {
  const indices=building.id===43512262
    ? {front:[8,9,11,12],rear:[2,3,4,5],corridor:[0,1,6,7]}
    : building.id===43519304
      ? {front:[0,1,3,4],rear:[7,9,11,13],corridor:[5,6,14,15]}
      : undefined;
  if(!indices)throw new Error(`No palace side-hall layout for ${building.id}`);
  const rectangle=(points:number[])=>alignPalaceRoof(localFootprintLayout({...building,ring:[...points,points[0]].map(i=>building.ring[i])},site));
  const front=rectangle(indices.front),rear=rectangle(indices.rear),neck=rectangle(indices.corridor);
  const rotation=front.rotation,c=Math.cos(rotation),s=Math.sin(rotation);
  const toLocal=(p:{x:number;z:number})=>({x:p.x*c-p.z*s,z:p.x*s+p.z*c});
  const f=toLocal(front),r=toLocal(rear),n=toLocal(neck);
  // Footprints follow the eaves. Carry the corridor to the inset timber faces,
  // overlapping by 40cm rather than leaving a gap below the hall roofs.
  const porch=(p:typeof front)=>Math.min(.30,Math.min(p.width*.82,p.depth*.78)*.13);
  const north=r.z+rear.depth*.78/2-porch(rear)-.04,south=f.z-front.depth*.78/2+porch(front)+.04;
  const z=(north+south)/2;
  const corridor={x:n.x*c+z*s,z:-n.x*s+z*c,width:neck.width,depth:south-north,rotation};
  return {front,rear,corridor};
}
