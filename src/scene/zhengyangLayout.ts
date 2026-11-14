import type {Landmark} from '../data/types';
import {mappedLayout} from './layouts';
import {localFootprintLayout,type CityData} from './geodata';
import {project} from './geo';
/** ZHENGYANG-FIRE-2020 p.2; units are metres / 10. */
export const zhengyangCityPlatform={width:9.5,depth:3.145,height:1.47};
/** Roof envelopes/elevations are interpreted within the documented total height. */
export const zhengyangCityRoofs=[[4.10,2.10,2.44,.30],[3.88,1.94,3.36,.25],[3.67,1.78,3.83,.495]] as const;
/** Building centres, not POI label anchors. Never force two footprints onto an invented straight line. */
export function zhengyangLayout(site:Landmark,data?:CityData) {
  const read=(id:number)=>{
    const b=data?.buildings.find(b=>b.id===id);
    if(b)return localFootprintLayout(b,site);
    const p=mappedLayout(id,site);return {x:p.x,z:p.z,width:p.w,depth:p.d,rotation:0,height:0};
  };
  return {city:read(25109960),arrow:read(439956436)};
}
export function zhengyangPlatformRing(site:Landmark,data?:CityData):[number,number][] {
  const p=zhengyangLayout(site,data).city,[ox,oz]=project(site.coords),{width:w,depth:d}=zhengyangCityPlatform;
  return [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([x,z])=>[
    ox+p.x+x*Math.cos(p.rotation)+z*Math.sin(p.rotation),
    oz+p.z-x*Math.sin(p.rotation)+z*Math.cos(p.rotation),
  ]);
}
