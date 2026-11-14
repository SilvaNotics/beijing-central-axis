import type { Landmark } from '../data/types';
import { localBuildingRing,localFootprintLayout,type BuildingFootprint,type CityData } from './geodata';
import { project } from './geo';
import { alignPalaceRoof } from './precincts';

// Explicit display interpretations of ambiguous building=yes ways. PAL-TAIHE,
// PAL-THREE-TERRACES and PAL-PLAN support separating terraces from roofs.
export const palaceTerraces=new Map<number,number>([
  [638449433,.813],[638449259,.813],[638449270,.813],
  [638467894,.813],[638460864,.813],[638460865,.813],[638981252,.20],
  // PAL-QIANQING: front moon terrace and raised approach, not roofed halls.
  [638981261,.20],[638807694,.20],
]);
export const palaceRaisedBuildings=new Set([
  638507747,638507769,638507783,638507841,638590169,638590140,
  638590122,638590123,638344324,638344315,638507657,638507610,
]);

/** Interpreted connecting stone deck; source ways only cover separate apron pieces. */
export function sharedPalaceTerrace(site:Landmark,data:CityData):[number,number][] {
  const south=data.buildings.find(b=>b.id===638449347),north=data.buildings.find(b=>b.id===638473398);
  if(!south||!north)return [];
  const a=alignPalaceRoof(localFootprintLayout(south,site)),b=alignPalaceRoof(localFootprintLayout(north,site));
  const width=Math.max(a.width,b.width)*1.04;
  return [[a.x-width/2,a.z+a.depth/2],[b.x-width/2,b.z-b.depth/2],[b.x+width/2,b.z-b.depth/2],[a.x+width/2,a.z+a.depth/2]];
}

/** Roof core excludes projecting steps; measured roof dimensions are unavailable. */
export function palaceRoofCore(building:BuildingFootprint,site:Landmark) {
  const p=localFootprintLayout(building,site),[ox,oz]=project(site.coords);
  const rotation=alignPalaceRoof({...p,rotation:0}).rotation+([638590122,638590123].includes(building.id)?Math.PI/2:0);
  const c=Math.cos(rotation),s=Math.sin(rotation);
  const ring=localBuildingRing(building).map(([x,z]):[number,number]=>[(x-ox-p.x)*c-(z-oz-p.z)*s,(x-ox-p.x)*s+(z-oz-p.z)*c]);
  const range=(at:number,axis:0|1)=>{
    const hits:number[]=[],other=axis===0?1:0;
    for(let i=0;i<ring.length-1;i++) {
      const a=ring[i],b=ring[i+1];
      if((a[other]<=at&&b[other]>at)||(b[other]<=at&&a[other]>at))hits.push(a[axis]+(b[axis]-a[axis])*(at-a[other])/(b[other]-a[other]));
    }
    return [Math.min(...hits),Math.max(...hits)];
  };
  const [left,right]=range(0,0),width=right-left;
  // Both end bays lie outside the narrow central stair tongues.
  const a=range(left+width*.18,1),b=range(right-width*.18,1);
  const front=Math.max(a[0],b[0]),back=Math.min(a[1],b[1]);
  const u=(left+right)/2,v=(front+back)/2;
  return {...p,x:p.x+u*c+v*s,z:p.z-u*s+v*c,rotation,width:width*.96,depth:(back-front)*.94};
}
