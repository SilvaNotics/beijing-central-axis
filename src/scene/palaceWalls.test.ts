import {expect,it} from 'vitest';
import * as THREE from 'three';
import buildings from '../../public/data/buildings.json';
import snapshot from '../data/palace-walls.json';
import {landmarks} from '../data/heritage';
import {localBuildingRing,wgs84ToGcj02,type CityData} from './geodata';
import {pointInPolygon,project} from './geo';
import {localPalaceBoundary} from './precincts';
import {clippedPalaceWall,palaceWallRuns,createPalaceWalls,palaceWallPoints} from './palaceWalls';
import type {Materials} from './materials';
import {createLandmark} from './architecture';
type Point=[number,number];
const site=landmarks.find(s=>s.id==='forbidden-city')!;
const data:CityData={buildings:buildings.buildings as CityData['buildings'],context:[]};
const distanceToRing=(point:Point,ring:Point[])=>Math.min(...ring.map((a,i)=>{
  const b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
  const t=length?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/length)):0;
  return Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dz);
}));

it('adds the separately mapped enclosure walls without fabricating long closing edges',()=>{
  const runs=palaceWallRuns(site,data),ids=new Set(runs.map(r=>r.id));
  expect(runs.length).toBeGreaterThan(150);
  for(const id of [42311507,42311508,42348519,42348520])expect(ids.has(id),`northwest wall ${id}`).toBe(true);
  const boundary=localPalaceBoundary(site),[ox,oz]=project(site.coords);
  for(const run of runs) {
    const middle:Point=[(run.a[0]+run.b[0])/2,(run.a[1]+run.b[1])/2];
    expect(pointInPolygon(middle,boundary)).toBe(true);
    if(run.interpreted) {
      expect(run.courtyardFrame).toBe(true);
      expect(run.layoutRepair).toBeTruthy();
      expect(run.sourceIds?.every(id=>snapshot.walls.some(w=>w.id===id))).toBe(true);
      continue;
    }
    const source=snapshot.walls.find(w=>w.id===run.id)!;
    const points=palaceWallPoints(source,site,data);
    const onSource=points.slice(1).some((b,i)=>{
      const a=points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=((middle[0]-a[0])*dx+(middle[1]-a[1])*dz)/(dx*dx+dz*dz);
      return t>=0&&t<=1&&Math.hypot(middle[0]-a[0]-t*dx,middle[1]-a[1]-t*dz)<1e-6;
    });
    expect(onSource).toBe(true);
  }
});

it('keeps Yinghua east walls parallel to the mapped courtyard and their shared junctions joined',()=>{
  const points=(id:number)=>palaceWallPoints(snapshot.walls.find(w=>w.id===id)!,site,data);
  const main=points(41657475),branch=points(42509088),cross=points(42311505);
  const guide=localBuildingRing(data.buildings.find(b=>b.id===156196336)!);
  const dx=guide[14][0]-guide[13][0],dz=guide[14][1]-guide[13][1];
  for(const p of [main[1],main[2],branch[1]])
    expect((p[0]-main[3][0])*dz-(p[1]-main[3][1])*dx).toBeCloseTo(0,8);
  expect(branch[2]).toEqual(main[1]);expect(cross[1]).toEqual(main[2]);
  const [ox,oz]=project(site.coords);
  for(const wall of snapshot.walls)for(const [i,p] of palaceWallPoints(wall,site,data).entries()) {
    // These endpoint paths intentionally reach the owning footprint interior;
    // their resulting mesh stops at its facade (covered by the layout test).
    if([42569643,42681371,653251437,654664219,1341826248].includes(wall.id))continue;
    const sourceIndex=wall.id===42509088&&i>0?i-1:i;
    const [x,z]=project(wgs84ToGcj02(wall.coordinates[sourceIndex] as Point));
    const distance=Math.hypot(p[0]+ox-x,p[1]+oz-z);
    const wuying=[42569638,42569643,42569633].includes(wall.id);
    expect(distance).toBeLessThan(wuying?.7:.25); // reference-plan returns / earlier Yinghua correction
    if(![41657475,42509088,42311505].includes(wall.id)&&!wuying)expect(distance).toBeCloseTo(0,10);
    if(wall.id===42509088&&i===0)expect(distance,'southern building junction').toBeCloseTo(0,10);
  }
});

it('clips against actual concave footprints and removes duplicated wall runs',()=>{
  const concave:Point[]=[[0,0],[4,0],[4,1],[1,1],[1,3],[4,3],[4,4],[0,4]];
  expect(clippedPalaceWall([-1,2],[5,2],[concave],0)).toEqual([[[-1,2],[0,2]],[[1,2],[5,2]]]);
  expect(clippedPalaceWall([0,0],[3,0],[[[0,-.04],[3,-.04],[3,.04],[0,.04]]])).toEqual([]);
});

it('carries enclosing walls to the building face without leaving a clearance gap',()=>{
  const footprint:Point[][]=[[[0,0],[4,0],[4,2],[0,2]]];
  expect(clippedPalaceWall([-1,1],[5,1],footprint)).toEqual([[[-1,1],[0,1]],[[4,1],[5,1]]]);
});

it('keeps source entrance nodes open and all new wall midpoints outside existing buildings',()=>{
  const runs=palaceWallRuns(site,data),[ox,oz]=project(site.coords);
  const obstacles=data.buildings.filter(b=>!/城墙/.test(b.name??'')).map(b=>localBuildingRing(b).map(([x,z]):Point=>[x-ox,z-oz])).filter(r=>r.some(([x,z])=>Math.abs(x)<45&&Math.abs(z)<60));
  for(const run of runs) {
    const middle:Point=[(run.a[0]+run.b[0])/2,(run.a[1]+run.b[1])/2];
    const obstacle=obstacles.find(r=>pointInPolygon(middle,r)&&distanceToRing(middle,r)>.0005);
    expect(obstacle,`wall ${JSON.stringify(run)}`).toBeUndefined();
  }
  const entrance=snapshot.entrances.find(e=>e.id===6098853836)!,[ex,ez]=project(wgs84ToGcj02(entrance.coords as Point));
  for(const run of runs) {
    const ax=run.a[0]+ox,az=run.a[1]+oz,dx=run.b[0]-run.a[0],dz=run.b[1]-run.a[1],t=Math.max(0,Math.min(1,((ex-ax)*dx+(ez-az)*dz)/(dx*dx+dz*dz)));
    expect(Math.hypot(ex-ax-t*dx,ez-az-t*dz)).toBeGreaterThan(.06);
  }
  const palette:Record<string,THREE.MeshBasicMaterial>={};
  const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
  const walls=createPalaceWalls(site,data,m);expect(walls.children).toHaveLength(runs.length);
  walls.traverse(o=>{if(o instanceof THREE.Mesh)expect(o.material).not.toBe(m.window);});
});

it('renders mapped city-wall line segments that are not covered by wall footprints',()=>{
  const runs=palaceWallRuns(site,data),outer=runs.filter(run=>run.outer);
  expect(outer.length).toBeGreaterThan(0);
  const palette:Record<string,THREE.MeshBasicMaterial>={};
  const materialSet=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
  const walls=createPalaceWalls(site,data,materialSet);
  expect(walls.children.filter(child=>outer.some(run=>run.id===child.userData.osmWallId))).toHaveLength(outer.length);
});

it('joins the Wuying east enclosure to its adjacent physical facade below the roof overhang',()=>{
  const palette:Record<string,THREE.MeshBasicMaterial>={};
  const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
  const model=createLandmark(site,m,data);model.updateMatrixWorld(true);
  const enclosure=model.getObjectByName('mapped-palace-wall-lines')!;
  const wall=enclosure.children.find(o=>o.userData.osmWallId===42569640&&[40542455,40542459].includes(o.userData.contactBuilding)&&!o.userData.contactElbow)!;
  let hall:THREE.Object3D|undefined;model.traverse(o=>{if(o.userData.osmId===wall?.userData.contactBuilding)hall=o;});
  expect(wall,'short return under the existing eave').toBeDefined();
  const box=wall.children[1] as THREE.Mesh;
  const end=box.localToWorld(new THREE.Vector3(.5,0,0));
  end.y=.12; // first contact can be the wider lower timber/window profile
  const direction=new THREE.Vector3(1,0,0).transformDirection(box.matrixWorld);
  const ray=new THREE.Raycaster(end.clone().addScaledVector(direction,-.01),direction,0,.05);
  const hit=ray.intersectObject(hall!,true)[0];
  expect(hit,'return touches a physical facade, not the roof outline').toBeDefined();
  expect(hit.distance).toBeLessThan(.025);
  const entrances=snapshot.entrances.map(e=>{const [x,z]=project(wgs84ToGcj02(e.coords as Point)),[ox,oz]=project(site.coords);return [x-ox,z-oz] as Point;});
  const objects=new Map<number,THREE.Object3D>();model.traverse(o=>{if(o.userData.osmId)objects.set(o.userData.osmId,o);});
  const returns=enclosure.children.filter(o=>o.userData.contactBuilding);
  expect(returns.length).toBeGreaterThan(100);
  for(const id of [41657455,42450638,42509100]) {
    expect(returns.some(segment=>segment.userData.osmWallId===id),`short source-end return ${id}`).toBe(true);
  }
  const starts=new Set(returns.map(segment=>{
    const wall=segment.children[1] as THREE.Mesh;
    const start=wall.localToWorld(new THREE.Vector3(-.5,0,0));
    return `${start.x.toFixed(4)},${start.z.toFixed(4)}`;
  }));
  for(const segment of returns) {
    const wall=segment.children[1] as THREE.Mesh;
    const a=wall.localToWorld(new THREE.Vector3(-.5,0,0)),b=wall.localToWorld(new THREE.Vector3(.5,0,0)),delta=b.clone().sub(a),length=delta.length();
    const direction=delta.normalize();
    expect(length).toBeLessThanOrEqual(1.5);
    ray.set(b.clone().addScaledVector(direction,-.005),direction);ray.far=.025;
    if(segment.userData.contactElbow) {
      expect(returns.some(next=>{
        const mesh=next.children[1] as THREE.Mesh;
        const start=mesh.localToWorld(new THREE.Vector3(-.5,0,0));
        return next!==segment&&next.userData.contactBuilding===segment.userData.contactBuilding&&start.distanceTo(b)<.00001;
      }),'elbow has a connected facade leg').toBe(true);
    } else expect(ray.intersectObject(objects.get(segment.userData.contactBuilding)!,true).length,`wall ${segment.userData.osmWallId} meets building ${segment.userData.contactBuilding}`).toBeGreaterThan(0);
    for(const [x,z] of entrances) {
      const t=Math.max(0,Math.min(length,(x-a.x)*direction.x+(z-a.z)*direction.z));
      expect(Math.hypot(x-a.x-direction.x*t,z-a.z-direction.z*t),'source entrance remains clear').toBeGreaterThan(.07);
    }
  }
  expect(starts.size).toBe(returns.length);
}, 20_000);
