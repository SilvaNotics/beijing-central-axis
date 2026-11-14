import {expect,it} from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import snapshot from '../data/palace-walls.json';
import {landmarks} from '../data/heritage';
import {palaceWallRuns,palaceWallPoints} from './palaceWalls';
import {palaceRoofRotation} from './precincts';
import {createLandmark} from './architecture';
import type {CityData} from './geodata';
import type {Materials} from './materials';
const site=landmarks.find(s=>s.id==='forbidden-city')!;
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};

it('leaves the mapped standalone screen wall independent instead of connecting it across the open east court',()=>{
 const screen=palaceWallRuns(site,data).filter(r=>r.id===43519305);
 expect(screen.length).toBeGreaterThan(0);
 expect(screen.filter(r=>r.interpreted)).toEqual([]);
});

it('adds only named, traceable court repairs rather than proximity-based inferred walls',()=>{
 const runs=palaceWallRuns(site,data);
 expect(runs.length).toBeGreaterThan(450);
 expect(runs.filter(r=>r.interpreted).length).toBeGreaterThan(0);
 for(const run of runs.filter(r=>r.interpreted)){expect(run.courtyardFrame).toBe(true);expect(run.sourceIds?.length).toBeGreaterThan(0);expect(run.isolatedNetwork).not.toBe(true);}
});

it('moves the Wuying shared wall junction together',()=>{
 const points=(id:number)=>palaceWallPoints(snapshot.walls.find(w=>w.id===id)!,site,data);
 expect(points(42569633).at(-1)).toEqual(points(42569638)[3]);
});

it('uses right angle returns at the Wuying north and east enclosure corners shown by the supplied plan',()=>{
 const angle=palaceRoofRotation(),c=Math.cos(angle),s=Math.sin(angle);
 for(const id of [42569638,42569643]) {
  const points=palaceWallPoints(snapshot.walls.find(w=>w.id===id)!,site,data);
  for(let i=1;i<points.length;i++){
   const dx=points[i][0]-points[i-1][0],dz=points[i][1]-points[i-1][1],u=dx*c-dz*s,v=dx*s+dz*c;
   expect(Math.min(Math.abs(u),Math.abs(v)),`wall ${id}, segment ${i}`).toBeLessThan(.001);
  }
 }
});

it('meets the facade with a straight continuation or right angle return, without diagonal spurs',()=>{
 const palette:Record<string,THREE.MeshBasicMaterial>={};
 const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
 const model=createLandmark(site,m,data),runs=palaceWallRuns(site,data);
 model.updateMatrixWorld(true);
 const contacts=model.getObjectByName('mapped-palace-wall-lines')!.children.filter(o=>o.userData.contactBuilding);
 expect(contacts.length).toBeGreaterThan(0);
 for(const contact of contacts){
  const wall=contact.children[1] as THREE.Mesh;
  const a=wall.localToWorld(new THREE.Vector3(-.5,0,0)),b=wall.localToWorld(new THREE.Vector3(.5,0,0));
  const parent=runs.filter(r=>r.id===contact.userData.osmWallId).find(r=>Math.min(Math.hypot(contact.userData.contactOrigin[0]-r.a[0],contact.userData.contactOrigin[1]-r.a[1]),Math.hypot(contact.userData.contactOrigin[0]-r.b[0],contact.userData.contactOrigin[1]-r.b[1]))<.001)!;
  expect(parent).toBeDefined();
  const dx=parent.b[0]-parent.a[0],dz=parent.b[1]-parent.a[1];
  const cross=Math.abs(dx*(b.z-a.z)-dz*(b.x-a.x)),dot=Math.abs(dx*(b.x-a.x)+dz*(b.z-a.z));
  expect(Math.min(cross,dot)/Math.hypot(dx,dz)/a.distanceTo(b),`facade return ${contact.userData.osmWallId}`).toBeLessThan(.001);
 }
},20_000);

const datum=(p:[number,number])=>{const a=palaceRoofRotation();return [p[0]*Math.cos(a)-p[1]*Math.sin(a),p[0]*Math.sin(a)+p[1]*Math.cos(a)];};
const covers=(point:number[],runs:ReturnType<typeof palaceWallRuns>)=>runs.some(r=>{const a=datum(r.a),b=datum(r.b),dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dz)<.01;});
it('connects the two Wuying returns through a shared side-court boundary',()=>{
 const runs=palaceWallRuns(site,data);
 expect(covers([-17.822,18.2],runs)).toBe(true);
 expect(covers([-25.852,20.3],runs)).toBe(true);
});
it('encloses the southwest service courts while retaining the west access opening',()=>{
 const runs=palaceWallRuns(site,data);
 for(const point of [[-33.1,22],[-32,30.14],[-33.1,18.5]])expect(covers(point,runs),point.join(',')).toBe(true);
 expect(covers([-33.1,20.4],runs)).toBe(false);
});
it('completes the west side of the kitchen court without walls through its buildings',()=>{
 const runs=palaceWallRuns(site,data);
 expect(covers([17.73,4],runs)).toBe(true);
 expect(covers([22.61,8.3],runs)).toBe(false);
});

it('joins all four east service buildings to their intended wall ends without a tail beyond the roof',()=>{
 const palette:Record<string,THREE.MeshBasicMaterial>={};
 const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
 const model=createLandmark(site,m,data),walls=model.getObjectByName('mapped-palace-wall-lines')!;
 for(const [wall,building] of [[654664219,40544225],[653251437,40544226],[42681371,649255320],[42681371,40544224]])
  expect(walls.children.some(o=>o.userData.osmWallId===wall&&o.userData.contactBuilding===building),`${wall} joins physical building ${building}`).toBe(true);
 const south=palaceWallRuns(site,data).filter(r=>r.id===654664219&&!r.interpreted);
 expect(Math.max(...south.flatMap(r=>[datum(r.a)[0],datum(r.b)[0]]))).toBeLessThan(21);
},20_000);

it('stops facade returns at the first physical surface instead of crossing a column or room',()=>{
 const palette:Record<string,THREE.MeshBasicMaterial>={};
 const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
 const model=createLandmark(site,m,data);model.updateMatrixWorld(true);
 const buildings=new Map<number,THREE.Object3D>();model.traverse(o=>{if(o.userData.osmId)buildings.set(o.userData.osmId,o);});
 const walls=model.getObjectByName('mapped-palace-wall-lines')!;
 for(const segment of walls.children.filter(o=>o.userData.contactBuilding)) {
  const mesh=segment.children[1] as THREE.Mesh;
  const a=mesh.localToWorld(new THREE.Vector3(-.5,0,0)),b=mesh.localToWorld(new THREE.Vector3(.5,0,0)),length=a.distanceTo(b),direction=b.clone().sub(a).normalize();
  for(const height of [.12,.23,.4]) {
   a.y=height;
   const ray=new THREE.Raycaster(a,direction,0,length+.03),hit=ray.intersectObject(buildings.get(segment.userData.contactBuilding)!,true)[0];
   if(hit)expect(hit.distance,`${segment.userData.osmWallId} crosses building ${segment.userData.contactBuilding} at height ${height}`).toBeGreaterThanOrEqual(length-.015);
  }
 }
},20_000);

it('takes the Neiwufu return north around the building to the upper enclosure, as the user arrow requests',()=>{
 const points=(id:number)=>palaceWallPoints(snapshot.walls.find(w=>w.id===id)!,site,data);
 const path=points(42569643),upper=points(41657480);
 expect(path[0]).toEqual(upper[3]);
 expect(datum(path[1])[0]).toBeGreaterThan(-15);
 expect(datum(path[1])[1]).toBeLessThan(8);
 // The former short west-facing tail below Neiwufu is absent.
 expect(covers([-17.0,15.125],palaceWallRuns(site,data))).toBe(false);
});

it('does not leave a wall strip standing across the southern row facades',()=>{
 const runs=palaceWallRuns(site,data).filter(r=>r.id===42569643);
 const p=palaceWallPoints(snapshot.walls.find(w=>w.id===42569643)!,site,data).map(datum);
 expect(p[4][1]).toBeGreaterThan(17.5);
 // The previous eave-level horizontal produced a strip across these rooms.
 for(const x of [-28,-26,-24,-21])expect(covers([x,17.346],runs),`front of room at ${x}`).toBe(false);
});
