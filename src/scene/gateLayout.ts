import { landmarks } from '../data/heritage';
import type { CityContext } from './geodata';
import { project } from './geo';

export const tiananmenWidth = 12;
export const tiananmenDepth = 4;
export const tiananmenPortalOpenings = [
  { offset: -4, radius: .24, top: .65 },
  { offset: -2, radius: .27, top: .75 },
  { offset: 0, radius: .32, top: .86 },
  { offset: 2, radius: .27, top: .75 },
  { offset: 4, radius: .24, top: .65 },
] as const;
export const tiananmenPortals = tiananmenPortalOpenings.map(opening => opening.offset);
export const jinshuiCrossingHalfLength = 1.05;

function jinshuiWaterRings(context: CityContext[] | undefined): [number,number][][] | null {
  if (!context) return null;
  const gate=project(landmarks.find(site=>site.id==='tiananmen')!.coords);
  const bridge=project(landmarks.find(site=>site.id==='jinshui')!.coords);
  // The bridge POI sits north of the water. Select the broad mapped river strips
  // between it and Tiananmen rather than the narrow adjacent water details.
  const rings: [number,number][][]=[];
  for(const feature of context.filter(item=>item.kind==='water')) {
    // CityContext retains GCJ-02 longitude/latitude; bridge calculations are in
    // the shared 10-metre scene plane.
    rings.push(feature.coordinates.map(project), ...(feature.holes??[]).map(hole=>hole.map(project)));
  }
  return rings.filter(ring=>{
    if(ring.length<3)return false;
    const xs=ring.map(point=>point[0]),zs=ring.map(point=>point[1]);
    const xSpan=Math.max(...xs)-Math.min(...xs),centerZ=(Math.max(...zs)+Math.min(...zs))/2;
    return xSpan>5&&centerZ>gate[1]+3&&centerZ<bridge[1]+15;
  });
}

function waterCrossing(x: number, rings: [number,number][][] | null) {
  if (!rings) return null;
  const section=(atX:number)=>{
    const hits:number[]=[];
    for(const ring of rings)for(let i=0;i<ring.length;i++) {
      const [x1,z1]=ring[i],[x2,z2]=ring[(i+1)%ring.length];
      if((x1<=atX&&atX<x2)||(x2<=atX&&atX<x1))hits.push(z1+(z2-z1)*(atX-x1)/(x2-x1));
    }
    return hits.length>=2?hits:null;
  };
  let hits=section(x);
  // OSM water rings are split beneath bridge abutments. Sample the nearest
  // short side of that gap, preserving the curved river's local centre.
  for(let delta=.05;!hits&&delta<=2;delta+=.05)hits=section(x+delta)??section(x-delta);
  if(!hits)return null;
  const min=Math.min(...hits),max=Math.max(...hits),z=(min+max)/2;
  // Widen sub-metre OSM channels only enough for the schematic bridge deck and
  // railings to remain legible at atlas scale. The centre stays on the river.
  const halfLength=Math.max(jinshuiCrossingHalfLength,max-min+ .25);
  return { z, northZ:z-halfLength, southZ:z+halfLength };
}

/** Five principal bridges face the five openings; the outer two serve the flanks.
 * Crossings use mapped water sections when city data is available. The synthetic
 * half-length is only a non-map test fallback.
 */
export function jinshuiLayout(context?: CityContext[]) {
  const gate=project(landmarks.find(site=>site.id==='tiananmen')!.coords);
  const bridge=project(landmarks.find(site=>site.id==='jinshui')!.coords);
  const waterRings=jinshuiWaterRings(context);
  return [-11,...tiananmenPortals,11].map((offset,index)=>{
    const opening=index>0&&index<6?tiananmenPortalOpenings[index-1]:null;
    const crossing=waterCrossing(gate[0]+offset,waterRings);
    const crossingNorthZ=crossing?.northZ??bridge[1]-jinshuiCrossingHalfLength;
    const crossingSouthZ=crossing?.southZ??bridge[1]+jinshuiCrossingHalfLength;
    return {
      x:gate[0]+offset,
      riverZ:crossing?.z??bridge[1],
      crossingNorthZ,
      crossingSouthZ,
      northZ:opening?gate[1]+tiananmenDepth/2:crossingNorthZ,
      southZ:crossingSouthZ,
      // Keep a principal deck inside its gateway opening. The two outer bridges
      // belong to the lateral ceremonial routes and never imply a sixth portal.
      width:opening?opening.radius*2-.04:.5,
      portal:opening?.offset??null,
    };
  });
}
