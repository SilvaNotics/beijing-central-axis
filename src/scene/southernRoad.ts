import { landmarks } from '../data/heritage';
import { project } from './geo';
import { wgs84ToGcj02 } from './geodata';

// The centre of the paired carriageways at Tianqiao and Yongdingmennei,
// and the central crossing at Xiannongtan Qianjie, from the bundled OSM roads.
// These are navigation control points, not a survey of buried archaeology.
const streetCentres: [number,number][] = [
  [116.39236,39.88500], [116.3924256,39.8833945],
  [116.3926438,39.8795000], [116.3928644,39.8753144],
];
export function southernRoadPath(): [number,number][] {
  return [...streetCentres.map(point=>project(wgs84ToGcj02(point))), project(landmarks.find(site=>site.id==='yongdingmen')!.coords)];
}

/** Sample from the gate northwards, keeping pavement and all details together. */
export function roadStation(metresNorth: number, lateralMetres = 0) {
  const path=southernRoadPath().reverse();
  let remaining=metresNorth/10;
  for(let i=1;i<path.length;i++) {
    const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(remaining<=length || i===path.length-1) {
      const t=Math.min(1,remaining/length), lateral=lateralMetres/10;
      return {x:a[0]+dx*t-dz/length*lateral,z:a[1]+dz*t+dx/length*lateral,rotation:Math.atan2(-dx,-dz)};
    }
    remaining-=length;
  }
  throw new Error('Southern road needs two control points');
}

export function roadPlanRings(): [number,number][][] {
  const rectangle=(station:number,lateral:number,width:number,depth:number):[number,number][]=>{
    const p=roadStation(station,lateral),c=Math.cos(p.rotation),s=Math.sin(p.rotation);
    return [[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].map(([x,z])=>[p.x+c*x+s*z,p.z-s*x+c*z]);
  };
  const rings:[number,number][][]=[];
  for(let metres=28;metres<440;metres+=4) rings.push(rectangle(metres,0,1.4,.402));
  for(const side of [-1,1])rings.push(rectangle(100,side*8,.72,3.8));
  rings.push(rectangle(400,-5,.95,2.2));
  return rings;
}
