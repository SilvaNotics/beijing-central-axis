import type { Landmark } from '../data/types';
import { project } from './geo';
import type { RoofForm } from './roofForms';
import { localFootprintLayout,type CityData } from './geodata';
import { mappedLayout } from './layouts';
import { palaceRoofRotation } from './precincts';

export interface HallProfile {
  roof:RoofForm;
  double:boolean;
  height:number;
  platform:number;
  frontBays:number;
  sideBays:number;
}
// Palace Museum building pages are cited in scene-references.md. Exact overall
// heights are available for Taihedian, Baohedian, Qianqinggong and Qianqingmen;
// the remaining elevations are photo-based atlas interpretations.
export const palaceHallProfiles:Record<number,HallProfile>={
  638449347:{roof:'hipped',double:true,height:3.505,platform:.813,frontBays:11,sideBays:5},
  638473398:{roof:'hip-gable',double:true,height:2.95,platform:.813,frontBays:9,sideBays:5},
  638308745:{roof:'hip-gable',double:true,height:2.3,platform:.3,frontBays:9,sideBays:4},
  638807674:{roof:'hip-gable',double:false,height:1.6,platform:.15,frontBays:5,sideBays:3},
  638981317:{roof:'hipped',double:true,height:2.4,platform:.2,frontBays:9,sideBays:5},
  638981229:{roof:'pyramidal',double:false,height:1.7,platform:.2,frontBays:3,sideBays:3},
  639012193:{roof:'hipped',double:true,height:2.1,platform:.2,frontBays:9,sideBays:3},
};
export const zhongheProfile:HallProfile={roof:'pyramidal',double:false,height:2.1,platform:.813,frontBays:3,sideBays:3};
export const zhongheCoords:[number,number]=[116.397065,39.917875];
export function zhongheLayout(site:Landmark,data?:CityData) {
  const [x,z]=project(zhongheCoords),[ox,oz]=project(site.coords);
  const center=(id:number)=>{
    const footprint=data?.buildings.find(b=>b.id===id);
    return footprint?localFootprintLayout(footprint,site):mappedLayout(id,site);
  };
  const south=center(638449347),north=center(638473398),dx=north.x-south.x,dz=north.z-south.z;
  // A POI is a label anchor, not a surveyed building centre. Preserve its
  // position along the three-hall axis while removing the lateral label offset.
  const t=((x-ox-south.x)*dx+(z-oz-south.z)*dz)/(dx*dx+dz*dz);
  return {x:south.x+t*dx,z:south.z+t*dz,width:2.65,depth:2.65,rotation:palaceRoofRotation()};
}
