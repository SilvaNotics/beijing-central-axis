import { project } from './geo';
import { wgs84ToGcj02 } from './geodata';

export type CivicKind = 'great-hall' | 'museum';
export interface CivicBlock { x:number; z:number; width:number; depth:number; height:number; }
export interface CivicLayout {
  id:CivicKind; name:string; coords:[number,number]; rotation:number;
  width:number; depth:number; porticoWidth:number; columnHeight:number; floor:number;
  blocks:CivicBlock[];
}

// Geographic envelope from the checked OSM relations. Facade subdivision is
// interpreted from the reference photographs; dimensions are navigation scale.
export const civicLayouts:Record<CivicKind,CivicLayout>={
  'great-hall':{
    id:'great-hall',name:'人民大会堂',coords:[116.3873054,39.9034605],rotation:Math.PI/2,
    width:34,depth:21.7,porticoWidth:11.8,columnHeight:2.5,floor:.46,
    blocks:[
      {x:0,z:-1.1,width:14.2,depth:19.5,height:3.90},
      {x:-12,z:0,width:9.5,depth:21.7,height:3.10},
      {x:12,z:0,width:9.5,depth:21.7,height:3.10},
      {x:0,z:9.75,width:14.4,depth:.25,height:3.15},
    ],
  },
  museum:{
    id:'museum',name:'中国国家博物馆',coords:[116.3954437,39.9037113],rotation:-Math.PI/2,
    width:33.5,depth:21.1,porticoWidth:12.2,columnHeight:2.36,floor:.46,
    blocks:[
      {x:-9.7,z:-2,width:13.4,depth:16.5,height:3.35},
      {x:9.7,z:-2,width:13.4,depth:16.5,height:3.35},
      {x:0,z:-8.625,width:6,depth:3.25,height:3.35},
      {x:0,z:2.125,width:6,depth:8.25,height:3.35},
      {x:-11.8,z:8.25,width:9.5,depth:4.6,height:2.95},
      {x:11.8,z:8.25,width:9.5,depth:4.6,height:2.95},
    ],
  },
};

export function civicColumnPositions(layout:CivicLayout) {
  return Array.from({length:12},(_,i)=>-layout.porticoWidth*.45+i*layout.porticoWidth*.9/11);
}
export const squareLocations={
  plaza:[116.3914649,39.9023598],monument:[116.3914248,39.903197],
  memorial:[116.391545,39.901114],flag:[116.3913049,39.9055772],
} satisfies Record<string,[number,number]>;
export type CivicPlanPart={kind:'roof'|'court'|'column'|'steps'|'plaza'|'joint';ring:[number,number][]};
export function squarePlanParts():CivicPlanPart[] {
  const parts:CivicPlanPart[]=[];
  const rect=(kind:CivicPlanPart['kind'],origin:[number,number],x:number,z:number,w:number,d:number)=>{
    const [ox,oz]=project(wgs84ToGcj02(origin));
    parts.push({kind,ring:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>[ox+x+u*w/2,oz+z+v*d/2])});
  };
  rect('plaza',squareLocations.plaza,0,0,50,88);
  for(let z=-35;z<=35;z+=8)rect('joint',squareLocations.plaza,0,z,44,.045);
  for(const x of [-20,-15,-10,-5,5,10,15,20])rect('joint',squareLocations.plaza,x,0,.045,84);
  for(const [w,d] of [[5.06,6.15],[4.05,5.15],[2.55,3],[1.16,.72]])rect('court',squareLocations.monument,0,0,w,d);
  rect('court',squareLocations.memorial,0,0,12.2,10.8);
  rect('roof',squareLocations.memorial,0,0,9.5,7.8);
  for(const side of [-1,1]) {
    for(let i=0;i<10;i++)rect('column',squareLocations.memorial,-4.35+i*8.7/9,side*3.65,.26,.26);
    for(let i=1;i<8;i++)rect('column',squareLocations.memorial,side*4.35,-3.65+i*7.3/8,.26,.26);
  }
  rect('court',squareLocations.flag,0,0,1.2,1.2);
  rect('column',squareLocations.flag,0,0,.15,.15);
  return parts;
}
export function civicPlanParts(layout:CivicLayout):CivicPlanPart[] {
  const [ox,oz]=project(wgs84ToGcj02(layout.coords)),c=Math.cos(layout.rotation),s=Math.sin(layout.rotation);
  const rect=(kind:CivicPlanPart['kind'],x:number,z:number,w:number,d:number):CivicPlanPart=>({kind,ring:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>{
    const px=x+u*w/2,pz=z+v*d/2;return [ox+px*c+pz*s,oz-px*s+pz*c];
  })});
  return [
    rect('court',0,layout.depth/2-.7,layout.porticoWidth,1.6),
    ...(layout.id==='museum'?[rect('court',0,-4.5,6,5)]:[]),
    ...layout.blocks.map(b=>rect('roof',b.x,b.z,b.width,b.depth)),
    ...civicColumnPositions(layout).map(x=>rect('column',x,layout.depth/2-.12,.22,.22)),
    ...Array.from({length:6},(_,i)=>rect('steps',0,layout.depth/2+.15+i*.16,layout.porticoWidth+.8,.12)),
  ];
}
