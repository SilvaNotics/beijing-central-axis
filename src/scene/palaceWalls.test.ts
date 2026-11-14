import {expect,it} from 'vitest';
import * as THREE from 'three';
import buildings from '../../public/data/buildings.json';
import snapshot from '../data/palace-walls.json';
import {landmarks} from '../data/heritage';
import {localBuildingRing,wgs84ToGcj02,type CityData} from './geodata';
import {pointInPolygon,project} from './geo';
import {localPalaceBoundary} from './precincts';
import {clippedPalaceWall,palaceWallRuns,createPalaceWalls} from './palaceWalls';
import type {Materials} from './materials';
type Point=[number,number];
const site=landmarks.find(s=>s.id==='forbidden-city')!;
const data:CityData={buildings:buildings.buildings as CityData['buildings'],context:[]};

it('adds the separately mapped northwest enclosure walls without inventing closing edges',()=>{
  const runs=palaceWallRuns(site,data),ids=new Set(runs.map(r=>r.id));
  expect(runs.length).toBeGreaterThan(150);
  for(const id of [42311507,42311508,42348519,42348520])expect(ids.has(id),`northwest wall ${id}`).toBe(true);
  const boundary=localPalaceBoundary(site),[ox,oz]=project(site.coords);
  for(const run of runs) {
    const middle:Point=[(run.a[0]+run.b[0])/2,(run.a[1]+run.b[1])/2];
    expect(pointInPolygon(middle,boundary)).toBe(true);
    const source=snapshot.walls.find(w=>w.id===run.id)!;
    const points=source.coordinates.map(c=>{const [x,z]=project(wgs84ToGcj02(c as Point));return [x-ox,z-oz] as Point;});
    const onSource=points.slice(1).some((b,i)=>{
      const a=points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=((middle[0]-a[0])*dx+(middle[1]-a[1])*dz)/(dx*dx+dz*dz);
      return t>=0&&t<=1&&Math.hypot(middle[0]-a[0]-t*dx,middle[1]-a[1]-t*dz)<1e-6;
    });
    expect(onSource).toBe(true);
  }
});

it('clips against actual concave footprints and removes duplicated wall runs',()=>{
  const concave:Point[]=[[0,0],[4,0],[4,1],[1,1],[1,3],[4,3],[4,4],[0,4]];
  expect(clippedPalaceWall([-1,2],[5,2],[concave],0)).toEqual([[[-1,2],[0,2]],[[1,2],[5,2]]]);
  expect(clippedPalaceWall([0,0],[3,0],[[[0,-.04],[3,-.04],[3,.04],[0,.04]]])).toEqual([]);
});

it('keeps source entrance nodes open and all new wall midpoints outside existing buildings',()=>{
  const runs=palaceWallRuns(site,data),[ox,oz]=project(site.coords);
  const obstacles=data.buildings.map(b=>localBuildingRing(b).map(([x,z]):Point=>[x-ox,z-oz])).filter(r=>r.some(([x,z])=>Math.abs(x)<45&&Math.abs(z)<60));
  for(const run of runs) {
    const middle:Point=[(run.a[0]+run.b[0])/2,(run.a[1]+run.b[1])/2];
    expect(obstacles.some(r=>pointInPolygon(middle,r))).toBe(false);
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
