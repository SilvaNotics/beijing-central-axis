import type {Landmark} from '../data/types';
import {mappedLayout,jingshanPavilions} from './layouts';
import {jingshanPavilionEnvelope} from './jingshanPavilions';

/** Existing schematic annexes, not surveyed building footprints. */
export function jingshanAnnexes(site:Landmark) {
  const shou=mappedLayout(26390117,site);
  return [
    ...[-1,1].map(side=>({x:shou.x+side*7,z:shou.z+4,w:6.5,d:1.7,h:.65,rotation:Math.PI/2})),
    {x:shou.x,z:shou.z+8,w:5,d:1.9,h:.75,rotation:0},
  ];
}

/** Conservative model envelopes include eaves and the front stair projection. */
export function jingshanBuildingBounds(site:Landmark) {
  const mapped=[26390117,26390236,...jingshanPavilions].map(id=>{
    const p=mappedLayout(id,site);
    const envelope=jingshanPavilions.includes(id)?jingshanPavilionEnvelope(id):{halfWidth:0,halfDepth:0};
    const halfW=Math.max(p.w/2,envelope.halfWidth)+.15,halfD=Math.max(p.d/2,envelope.halfDepth)+.15;
    return {minX:p.x-halfW,maxX:p.x+halfW,minZ:p.z-halfD,maxZ:p.z+halfD};
  });
  const annexes=jingshanAnnexes(site).map(p=>{
    const halfW=(p.w+Math.min(1.3,p.d*.3))/2+.15;
    const back=-(p.d+Math.min(1.12,p.d*.28))/2-.15,front=p.d/2+1.16+.15;
    const c=Math.cos(p.rotation),s=Math.sin(p.rotation);
    const corners=[[-halfW,back],[halfW,back],[halfW,front],[-halfW,front]].map(([x,z])=>[p.x+c*x+s*z,p.z-s*x+c*z]);
    return {minX:Math.min(...corners.map(p=>p[0])),maxX:Math.max(...corners.map(p=>p[0])),minZ:Math.min(...corners.map(p=>p[1])),maxZ:Math.max(...corners.map(p=>p[1]))};
  });
  return [...mapped,...annexes];
}

export interface JingshanCourt { id:string; ring:[number,number][]; }
/** Courtyard envelopes follow the existing authored buildings, not a cadastral survey. */
function readCourts(site:Landmark):JingshanCourt[] {
  const shou=mappedLayout(26390117,site),qi=mappedLayout(26390236,site);
  const rect=(id:string,x:number,n:number,s:number,halfWidth:number):JingshanCourt=>({id,ring:[[x-halfWidth,n],[x+halfWidth,n],[x+halfWidth,s],[x-halfWidth,s]]});
  return [rect('shouhuang',shou.x,shou.z-shou.d/2-.5,shou.z+10.5,8.6),
    rect('qiwang',qi.x,qi.z-qi.d/2-.5,qi.z+3.5,3.4)];
}

/** JING-ROUTES: front/rear walks and east/west ascent topology; bends and widths
 * are model interpretations. Keep walks shared with 2D and crown clearance. */
function readWalks(site:Landmark) {
  const peaks=jingshanPavilions.map(id=>mappedLayout(id,site)).sort((a,b)=>a.x-b.x);
  const first=peaks[0],last=peaks.at(-1)!,middle=peaks.find(p=>p.osmId===26390235)!;
  const qi=mappedLayout(26390236,site),shou=mappedLayout(26390117,site);
  const left=first.x-5,right=last.x+5,front=qi.z+3.5,rear=middle.z-14;
  const path=(id:string,points:[number,number][],width:number)=>({id,points,width});
  return [
    path('ridge',peaks.map(p=>[p.x,p.z]),.36),
    path('front-walk',[[left,front],[qi.x,front],[right,front]],.65),
    path('rear-walk',[[left,rear],[shou.x,rear],[right,rear]],.65),
    path('west-loop',[[left,front],[left-1,middle.z+5],[left-1,middle.z-6],[left,rear]],.55),
    path('east-loop',[[right,front],[right+1,middle.z+5],[right+1,middle.z-6],[right,rear]],.55),
    path('shouhuang-approach',[[shou.x,shou.z+10.5],[shou.x,rear]],.9),
    path('south-approach',[[qi.x,front],[qi.x,front+1.8]],.9),
    path('west-ascent',[[left,rear],[first.x-2,middle.z-9],[first.x+2,middle.z-6],[first.x-1,middle.z-3],[first.x,first.z]],.38),
    path('east-ascent',[[right,rear],[last.x+2,middle.z-9],[last.x-2,middle.z-6],[last.x+1,middle.z-3],[last.x,last.z]],.38),
    path('front-ascent',[[qi.x+5,front],[qi.x+5,middle.z+9],[middle.x+3,middle.z+7],[middle.x-2.7,middle.z+4],[middle.x,middle.z]],.38),
  ];
}

const courtCache=new WeakMap<Landmark,JingshanCourt[]>();
const walkCache=new WeakMap<Landmark,ReturnType<typeof readWalks>>();
export function jingshanCourts(site:Landmark) {
  let courts=courtCache.get(site);if(!courts){courts=readCourts(site);courtCache.set(site,courts);}return courts;
}
export function jingshanWalks(site:Landmark) {
  let walks=walkCache.get(site);if(!walks){walks=readWalks(site);walkCache.set(site,walks);}return walks;
}
