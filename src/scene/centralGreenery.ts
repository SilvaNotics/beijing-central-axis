import * as THREE from 'three';
import { landmarks } from '../data/heritage';
import { pointInPolygon, project } from './geo';
import { localBuildingRing, wgs84ToGcj02, type CityData } from './geodata';
import { templeBoundaries } from './templeLayout';
import { palaceBoundary } from './precincts';
import { squareGround } from './squareGround';

type Point=[number,number];
const rectangle=(left:number,north:number,right:number,south:number):Point[]=>[[left,north],[right,north],[right,south],[left,south]];
export function distanceToRing(p:Point,ring:Point[],closed=true) {
  let distance=Infinity;
  for(let i=0;i<ring.length-(closed?0:1);i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz;
    const t=length2?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length2)):0;
    distance=Math.min(distance,Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz));
  }
  return distance;
}
const bounds=(ring:Point[])=>({left:Math.min(...ring.map(p=>p[0])),right:Math.max(...ring.map(p=>p[0])),north:Math.min(...ring.map(p=>p[1])),south:Math.max(...ring.map(p=>p[1]))});

/** GREEN-SQUARE-2023/2026: low planting on the north plaza's east/west sides.
 * The 9600 m² total is documented; the inset and rectangular outline below are
 * an atlas interpretation, not a surveyed planting plan or a seasonal display.
 */
export function squarePlantingBeds(data?:CityData):Point[][] {
  const ground=squareGround(data);
  const north=ground.north+2.5,south=project(wgs84ToGcj02([116.3914248,39.903197]))[1]-2;
  const width=48/(south-north);
  const at=(side:number,z:number)=>{
    const a=ground.ring[side===-1?0:1],b=ground.ring[side===-1?3:2];
    return a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1])-side*.85;
  };
  return [-1,1].map(side=>[
    [at(side,north),north],[at(side,north)-side*width,north],
    [at(side,south)-side*width,south],[at(side,south),south],
  ]);
}

export interface PlantingZone {
  region:'shejitan'|'taimiao'|'duanmen';
  ring:Point[];
  contains:(point:Point,clearance:number)=>boolean;
}

/** GREEN-SHEJI-GROVE / GREEN-SHEJI-CONSERVATION / GREEN-DUANMEN-2015.
 * Conservative woodland bands outside the mapped inner precincts. The 60 m
 * band and access corridors are interpretive limits, NOT outer park boundaries.
 * Tree positions and species outside the documented cypress groves are schematic.
 */
export function centralPlantingZones(data:CityData):PlantingZone[] {
  const zones:PlantingZone[]=[];
  const gate=data.buildings.find(b=>b.id===25097188);
  const gateBounds=gate?bounds(localBuildingRing(gate)):undefined;
  // Leave the gate approach and its displayed side stairs clear of garden
  // planting. This is a conservative navigation margin, not a measured wall.
  const outsidePassage=(p:Point,r:number)=>!gateBounds||p[0]+r<gateBounds.left-1.5||p[0]-r>gateBounds.right+1.5;
  for(const region of ['shejitan','taimiao'] as const) {
    const inner=templeBoundaries[region].map(p=>project(wgs84ToGcj02(p))),b=bounds(inner);
    const ring=rectangle(b.left-6,b.north-6,b.right+6,b.south+5);
    const cx=(b.left+b.right)/2,cz=(b.north+b.south)/2;
    zones.push({region,ring,contains:(p,r)=>pointInPolygon(p,ring)&&distanceToRing(p,ring)>r
      &&!pointInPolygon(p,inner)&&distanceToRing(p,inner)>r+.3
      &&Math.abs(p[0]-cx)>1.5+r&&Math.abs(p[1]-cz)>1.5+r&&outsidePassage(p,r)});
  }
  if(gate) {
    const b=bounds(localBuildingRing(gate));
    const [gx,gz]=project(landmarks.find(s=>s.id==='duanmen')!.coords);
    const palaceSouth=Math.max(...palaceBoundary.map(p=>project(wgs84ToGcj02(p))[1]));
    const ring=rectangle(gx-5.1,palaceSouth+6,gx+5.1,Math.min(b.north,gz-3.25)-1);
    zones.push({region:'duanmen',ring,contains:(p,r)=>pointInPolygon(p,ring)&&distanceToRing(p,ring)>r&&Math.abs(p[0]-gx)>2.5+r});
  }
  return zones;
}

/** Locally generated low bedding; no external imagery or runtime map requests. */
export function createSquarePlanting(data:CityData) {
  const group=new THREE.Group();group.name='square-low-planting';
  const green=new THREE.MeshStandardMaterial({color:'#4e664a',roughness:1});
  const border=new THREE.MeshStandardMaterial({color:'#929061',roughness:1});
  const patch=(ring:Point[],material:THREE.Material,y:number)=>{
    const shape=new THREE.Shape();ring.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;group.add(mesh);
  };
  for(const ring of squarePlantingBeds(data)) {
    patch(ring,border,.125);
    const b=bounds(ring),cx=(b.left+b.right)/2,cz=(b.north+b.south)/2;
    patch(ring.map(([x,z])=>[cx+(x-cx)*.83,cz+(z-cz)*.98]),green,.145);
    // Small low motifs communicate bedding, without copying a dated floral scheme.
    for(let z=b.north+1;z<b.south-1;z+=2) {
      const t=(z-ring[0][1])/(ring[3][1]-ring[0][1]);
      const x=(ring[0][0]+ring[1][0])/2+((ring[2][0]+ring[3][0]-ring[0][0]-ring[1][0])/2)*t;
      const half=Math.abs(ring[1][0]-ring[0][0])*.25;
      patch([[x-half,z],[x,z-.6],[x+half,z],[x,z+.6]],border,.15);
    }
  }
  return group;
}
