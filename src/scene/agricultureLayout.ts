import { project } from './geo';
import type { Landmark } from '../data/types';
import type { RoofForm } from './roofForms';

// Checked Amap GCJ-02 POIs, 2026-11-13. Missing roof envelopes and court
// subdivisions below are interpretations of the heritage centre plan/photos.
export const agricultureAnchors={
  kitchen:[116.391447,39.878202],granary:[116.393592,39.878154],palace:[116.395745,39.877936],
} satisfies Record<string,[number,number]>;
export interface AgriculturePart {
  name:string;x:number;z:number;width:number;depth:number;height:number;
  roof:RoofForm;color:'grayRoof'|'green';bays:number;turn?:number;
  kind?:'gate'|'well'|'granary';double?:boolean;
}
export interface AgricultureCompound { name:string;x:number;z:number;width:number;depth:number;courtZ:number;parts:AgriculturePart[]; }
export function agricultureCompounds(site:Landmark):AgricultureCompound[] {
  const [ox,oz]=project(site.coords);
  const anchor=(key:keyof typeof agricultureAnchors)=>{const [x,z]=project(agricultureAnchors[key]);return{x:x-ox,z:z-oz};};
  return [
    {name:'神厨院落',...anchor('kitchen'),width:6.2,depth:6.4,courtZ:2.1,parts:[
      {name:'神厨正殿',x:0,z:0,width:2.9,depth:1.55,height:1.3,roof:'gable',color:'grayRoof',bays:5},
      {name:'宰牲亭',x:-3.3,z:0,width:2.1,depth:1.4,height:1.7,roof:'gable',color:'grayRoof',bays:5,double:true},
      {name:'神厨南门',x:0,z:5.1,width:1.8,depth:.45,height:.85,roof:'hipped',color:'grayRoof',bays:3,kind:'gate'},
      ...[-1.35,1.35].map(x=>({name:x<0?'西井亭':'东井亭',x,z:3.8,width:.85,depth:.85,height:.95,roof:'pyramidal' as const,color:'grayRoof' as const,bays:6,kind:'well' as const})),
    ]},
    {name:'神仓院落',...anchor('granary'),width:4.2,depth:8.3,courtZ:1.25,parts:[
      {name:'圆廪神仓',x:0,z:0,width:1.5,depth:1.5,height:1.35,roof:'pyramidal',color:'grayRoof',bays:0,kind:'granary'},
      {name:'收谷亭',x:0,z:2.2,width:1.45,depth:1.3,height:1.25,roof:'pyramidal',color:'grayRoof',bays:3,kind:'well'},
      {name:'祭器库',x:0,z:-2.25,width:3.0,depth:1.0,height:1.10,roof:'gable',color:'grayRoof',bays:5},
      {name:'神仓南门',x:0,z:5.35,width:1.7,depth:.4,height:.85,roof:'hipped',color:'grayRoof',bays:3,kind:'gate'},
      ...[-1,1].flatMap(side=>[.1,2.6].map(z=>({name:side<0?'西仓房':'东仓房',x:side*1.65,z,width:1.7,depth:.75,height:.9,roof:'gable' as const,color:'grayRoof' as const,bays:3,turn:Math.PI/2}))),
    ]},
    {name:'庆成宫',...anchor('palace'),width:11.0,depth:12.3,courtZ:-6.15,parts:[
      {name:'庆成宫外宫门',x:0,z:0,width:3.3,depth:.5,height:1.0,roof:'hipped',color:'green',bays:5,kind:'gate'},
      {name:'庆成宫内宫门',x:0,z:-3.2,width:3.3,depth:.5,height:1.0,roof:'hipped',color:'green',bays:5,kind:'gate'},
      {name:'庆成宫正殿',x:0,z:-6.9,width:3.0,depth:1.65,height:1.65,roof:'hipped',color:'green',bays:5},
      {name:'庆成宫后殿',x:0,z:-10.1,width:3.0,depth:1.65,height:1.50,roof:'hipped',color:'green',bays:5},
      ...[-1,1].map(side=>({name:side<0?'庆成宫西配殿':'庆成宫东配殿',x:side*2.5,z:-8.6,width:1.7,depth:.75,height:1.0,roof:'gable' as const,color:'green' as const,bays:3,turn:Math.PI/2})),
    ]},
  ];
}
