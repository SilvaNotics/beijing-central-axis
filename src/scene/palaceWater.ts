import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Landmark } from '../data/types';
import { localFootprintLayout, wgs84ToGcj02, type CityData } from './geodata';
import type { Materials } from './materials';
import { pointInPolygon, project } from './geo';
import { mappedLayout } from './layouts';
import { clipPalaceFootprint } from './palaceCityWalls';
import { localPalaceBoundary, palaceRoofRotation } from './precincts';
import { wallRuns } from './wallRuns';

type Point = [number, number];

/** Shared mapped water and explicitly marked display links; excludes the moat. */
export function palaceWaterAreas(site: Landmark, data?: CityData) {
  const [ox, oz] = project(site.coords), boundary = localPalaceBoundary(site);
  const local = (p: Point): Point => { const [x, z] = project(p); return [x - ox, z - oz]; };
  return (data?.context ?? []).filter(f => f.kind === 'water').map(f => ({
    displayLink: f.geometryOrigin === 'display-link', ring: f.coordinates.map(local), holes: (f.holes ?? []).map(r => r.map(local)),
  })).filter(f => f.ring.every(p => pointInPolygon(p, boundary)));
}

function shape(ring: Point[], holes: Point[][] = []) {
  const result = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
  result.holes = holes.map(r => new THREE.Path(r.map(([x, z]) => new THREE.Vector2(x, -z))));
  return result;
}

/** Subtract a convex display link from a convex land fragment. Splitting one
 * half-plane at a time retains the exterior pieces without overlapping holes.
 */
function subtractLink(subject: Point[], ring: Point[]): Point[][] {
  const area = ring.reduce((sum, a, i) => { const b = ring[(i+1)%ring.length]; return sum+a[0]*b[1]-b[0]*a[1]; }, 0);
  const sign = area >= 0 ? 1 : -1, result: Point[][] = [];
  let remaining = subject;
  for (let i = 0; i < ring.length && remaining.length >= 3; i++) {
    const a = ring[i], b = ring[(i+1)%ring.length];
    if (Math.hypot(b[0]-a[0],b[1]-a[1]) < 1e-9) continue;
    const distance = (p: Point) => sign*((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]));
    const inside: Point[] = [], outside: Point[] = [];
    for (let j = 0; j < remaining.length; j++) {
      const p = remaining[j], q = remaining[(j+1)%remaining.length], dp = distance(p), dq = distance(q);
      if (dp >= 0) inside.push(p); else outside.push(p);
      if ((dp < 0) !== (dq < 0)) {
        const t = dp/(dp-dq), hit: Point = [p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];
        inside.push(hit); outside.push(hit);
      }
    }
    if (outside.length >= 3) result.push(outside);
    remaining = inside;
  }
  return result;
}

/** Cut the base paving and every raised surface from the same land fragments.
 * Mapped holes are triangulated first; overlapping display links are subtracted
 * afterwards, so a union is never passed to THREE as overlapping shape holes.
 */
export function createPalacePaving(site: Landmark, data: CityData | undefined, m: Materials, axisX: number, depth: number) {
  const group = new THREE.Group(); group.name = 'palace-paving';
  const areas = palaceWaterAreas(site, data), mapped = areas.filter(a => !a.displayLink);
  const boundary = localPalaceBoundary(site);
  const land = [shape(boundary, mapped.map(a => a.ring)), ...mapped.flatMap(a => a.holes.map(h => shape(h)))];
  let fragments: Point[][] = [];
  for (const outline of land) {
    const geometry = new THREE.ShapeGeometry(outline), position = geometry.getAttribute('position'), index = geometry.index!;
    for (let i = 0; i < index.count; i += 3) fragments.push([0, 1, 2].map(j => {
      const v = index.getX(i + j); return [position.getX(v), -position.getY(v)];
    }));
    geometry.dispose();
  }
  for (const link of areas.filter(a => a.displayLink)) fragments = fragments.flatMap(p => subtractLink(p, link.ring));
  const mesh = (positions: number[], material: THREE.Material) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
    const uv: number[] = [];
    for(let i=0;i<positions.length;i+=3) uv.push(positions[i],-positions[i+2]);
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.computeVertexNormals(); group.add(new THREE.Mesh(geometry,material));
  };
  const surface = (rings: Point[][], material: THREE.Material, y: number) => {
    const positions: number[] = [];
    for(const ring of rings) for(let i=1;i<ring.length-1;i++) {
      const [a,b,c]=[ring[0],ring[i],ring[i+1]];
      const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      if(Math.abs(area)<1e-9) continue;
      for(const [x,z] of area<0?[a,b,c]:[a,c,b]) positions.push(x,y,z);
    }
    mesh(positions, material);
  };
  surface(fragments,m.paving,.045);
  // Banks meet the global water at local y=-.025. Only exposed edges get
  // side faces: no triangulation seams or cross-channel walls at link overlaps.
  const sides: number[] = [];
  const banks = [{ring: boundary, hole: false}, ...areas.flatMap(a => [{ring:a.ring,hole:true}, ...a.holes.map(ring=>({ring,hole:false}))])];
  for(const bank of banks) {
    const ring = bank.ring, area = ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1];},0);
    const others = areas.filter(a=>a.ring!==ring&&!a.holes.includes(ring)).map(a=>a.ring);
    for(let i=0;i<ring.length;i++) for(const run of wallRuns(ring[i],ring[(i+1)%ring.length],others)) {
      const [a,b] = (area>0)===bank.hole ? run : [run[1],run[0]];
      sides.push(a[0],-.025,a[1],b[0],-.025,b[1],a[0],.045,a[1], b[0],-.025,b[1],b[0],.045,b[1],a[0],.045,a[1]);
    }
  }
  mesh(sides,m.paving);
  const patch = (x: number, z: number, w: number, d: number, material: THREE.Material, y: number) => {
    const rectangle: Point[] = [[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
    surface(fragments.map(fragment=>clipPalaceFootprint(fragment,rectangle)),material,y);
  };
  for (const [z, w, d] of [[depth*.175,31,44],[-depth*.235,25,32]]) patch(axisX,z,w,d,m.paving,.085);
  patch(axisX,.3,5.5,depth-8,m.stone,.16);
  return group;
}

export interface PalaceBridgeLayout {
  id: string; name: string; center: Point; rotation: number; length: number; width: number;
  banks: [Point,Point]; principal: boolean; singleRail?: boolean;
}

/** Official bridge inventory PAL-INNER-BRIDGES. The reference plan supplies
 * topology; cross sections of archived river polygons set the actual deck ends.
 * Candidate axes, widths, spacing and arches remain display interpretations.
 */
export function palaceBridgeLayouts(site: Landmark, data: CityData): PalaceBridgeLayout[] {
  const rings=palaceWaterAreas(site,data).map(a=>a.ring), rotation=palaceRoofRotation();
  const c=Math.cos(rotation),s=Math.sin(rotation),[ox,oz]=project(site.coords);
  const result:PalaceBridgeLayout[]=[];
  const crossing=(id:string,name:string,anchor:Point,turn:number,width:number,reach:number,principal=false,singleRail=false)=>{
    const angle=rotation+turn, dx=Math.sin(angle),dz=Math.cos(angle);
    const runs=wallRuns([anchor[0]-dx*reach,anchor[1]-dz*reach],[anchor[0]+dx*reach,anchor[1]+dz*reach],rings,true);
    const run=runs.sort((a,b)=>Math.hypot((a[0][0]+a[1][0])/2-anchor[0],(a[0][1]+a[1][1])/2-anchor[1])-Math.hypot((b[0][0]+b[1][0])/2-anchor[0],(b[0][1]+b[1][1])/2-anchor[1]))[0];
    if(!run)return;
    const [a,b]=run;
    result.push({id,name,center:[(a[0]+b[0])/2,(a[1]+b[1])/2],rotation:angle,
      length:Math.hypot(b[0]-a[0],b[1]-a[1])+.70,width,banks:run,principal,singleRail});
  };
  const gate=mappedLayout(638308745,site);
  for(let i=-2;i<=2;i++)crossing(`taihe-${i+2}`,'内金水桥',[gate.x+i*1.9*c+10*s,gate.z-i*1.9*s+10*c],0,i===0?.82:.60,10,true);
  const wuyingBuilding=data.buildings.find(b=>b.id===40542454);
  const wuying=wuyingBuilding?localFootprintLayout(wuyingBuilding,site):undefined;
  if(wuying)for(let i=-1;i<=1;i++)crossing(`wuying-${i+1}`,'武英门前石桥',[wuying.x+i*.8*c+2*s,wuying.z-i*.8*s+2*c],0,.48,4);
  const local=(p:Point):Point=>{const [x,z]=project(wgs84ToGcj02(p));return [x-ox,z-oz];};
  crossing('duanhong','断虹桥',local([116.38939,39.91363]),Math.PI/2,.72,2);
  crossing('banbi','半壁桥',local([116.39246,39.91364]),Math.PI/2,.62,1.5,false,true);
  crossing('wenyuan','文渊阁前石桥',local([116.39309,39.914565]),0,.64,1.2);
  const east=local([116.39419,39.91446]);
  for(let i=-1;i<=1;i++)crossing(`sanzuomen-${i+1}`,'三座门前石桥',[east[0]+i*.65*c,east[1]-i*.65*s],0,.43,1.2);
  return result;
}

export function createInnerJinshuiBridges(site: Landmark, data: CityData, m: Materials) {
  const group=new THREE.Group();group.name='inner-jinshui-bridges';
  for(const layout of palaceBridgeLayouts(site,data)) {
    const {length,width}=layout;
    const bridge=new THREE.Group();bridge.name=layout.principal?'inner-jinshui-bridge':'palace-side-bridge';
    bridge.userData.bridgeId=layout.id;bridge.userData.label=layout.name;
    bridge.position.set(layout.center[0],0,layout.center[1]);bridge.rotation.y=layout.rotation;
    const rise = (t: number) => .095+.17*Math.sin(Math.PI*t);
    const profile = new THREE.Shape();
    for (let j=0;j<=24;j++) { const t=j/24; if(j===0)profile.moveTo(-length/2,rise(t));else profile.lineTo((t-.5)*length,rise(t)); }
    for (let j=24;j>=0;j--) { const t=j/24; profile.lineTo((t-.5)*length,rise(t)-.065); }
    profile.closePath();
    const deck = new THREE.ExtrudeGeometry(profile,{depth:width,bevelEnabled:false});
    // Profile X becomes bridge Z; extrusion becomes bridge width X.
    deck.translate(0,0,-width/2); deck.rotateY(-Math.PI/2);
    bridge.add(new THREE.Mesh(deck,m.marble));
    const details: THREE.BufferGeometry[] = [];
    for (const side of layout.singleRail ? [-1] : [-1,1]) {
      for(let j=0;j<=8;j++) {
        const t=j/8, post=new THREE.BoxGeometry(.045,.18,.045);
        post.translate(side*(width/2-.025),rise(t)+.09,(t-.5)*length);details.push(post);
      }
      for(let j=0;j<24;j++) {
        const a=new THREE.Vector3(side*(width/2-.025),rise(j/24)+.14,(j/24-.5)*length);
        const b=new THREE.Vector3(a.x,rise((j+1)/24)+.14,((j+1)/24-.5)*length),delta=b.clone().sub(a);
        const rail=new THREE.BoxGeometry(.03,.08,delta.length()+.005);
        rail.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),delta.normalize()));
        rail.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);details.push(rail);
      }
    }
    bridge.add(new THREE.Mesh(mergeGeometries(details)!,m.marble));details.forEach(g=>g.dispose());
    group.add(bridge);
  }
  return group;
}
