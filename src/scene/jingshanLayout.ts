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
