import * as THREE from 'three';
import snapshot from '../data/palace-walls.json';
import type {Landmark} from '../data/types';
import {localBuildingRing,wgs84ToGcj02,type CityData} from './geodata';
import {project} from './geo';
import {localPalaceBoundary} from './precincts';
import {wallRuns} from './wallRuns';
import {roofGeometry} from './roofForms';
import type {Materials} from './materials';

type Point=[number,number];
type Run={id:number;a:Point;b:Point;outer:boolean};
const cache=new WeakMap<CityData,WeakMap<Landmark,Run[]>>();
const boxGeometry=new THREE.BoxGeometry(1,1,1);
const bounds=(points:Point[])=>({minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1]))});
const intersects=(a:ReturnType<typeof bounds>,b:ReturnType<typeof bounds>,margin=0)=>a.minX<=b.maxX+margin&&a.maxX>=b.minX-margin&&a.minZ<=b.maxZ+margin&&a.maxZ>=b.minZ-margin;

/** Keep an open mapped way open, and cut only actual intersecting footprints.
 * The margin prevents the wall cap from entering a facade at a shared edge. */
export function clippedPalaceWall(a:Point,b:Point,obstacles:Point[][],margin=.06) {
  const blockers:Point[][]=[];
  for(const ring of obstacles) {
    blockers.push(ring);
    if(!margin)continue;
    for(let i=0;i<ring.length;i++) {
      const c=ring[i],d=ring[(i+1)%ring.length],dx=d[0]-c[0],dz=d[1]-c[1],length=Math.hypot(dx,dz);if(length<1e-7)continue;
      const ex=dx/length*margin,ez=dz/length*margin,nx=-ez,nz=ex;
      blockers.push([[c[0]-ex+nx,c[1]-ez+nz],[d[0]+ex+nx,d[1]+ez+nz],[d[0]+ex-nx,d[1]+ez-nz],[c[0]-ex-nx,c[1]-ez-nz]]);
    }
  }
  return wallRuns(a,b,blockers).filter(([c,d])=>Math.hypot(c[0]-d[0],c[1]-d[1])>.035);
}

/** Wall ways are a separate OSM layer; building-only downloads omit these. */
export function palaceWallRuns(site:Landmark,data:CityData):Run[] {
  let bySite=cache.get(data);if(!bySite){bySite=new WeakMap();cache.set(data,bySite);}
  const cached=bySite.get(site);if(cached)return cached;
  const [ox,oz]=project(site.coords),boundary=localPalaceBoundary(site),area=bounds(boundary);
  const local=(coords:number[]):Point=>{const [x,z]=project(wgs84ToGcj02(coords as Point));return [x-ox,z-oz];};
  const obstacles=data.buildings.map(building=>{
    const ring=localBuildingRing(building).map(([x,z]):Point=>[x-ox,z-oz]);return {ring,box:bounds(ring)};
  }).filter(p=>intersects(p.box,area,.2));
  // OSM does not give entrance widths here: 1.4m is an atlas opening parameter.
  const doors=snapshot.entrances.map(entrance=>{
    const [x,z]=local(entrance.coords),r=.07;const ring:Point[]=[[x-r,z-r],[x+r,z-r],[x+r,z+r],[x-r,z+r]];return {ring,box:bounds(ring)};
  });
  const result:Run[]=[];
  for(const wall of snapshot.walls) {
    const points=wall.coordinates.map(local);
    // No closing edge is invented for these open polylines.
    for(let i=1;i<points.length;i++)for(const [a,b] of wallRuns(points[i-1],points[i],[boundary],true)) {
      const segmentBounds=bounds([a,b]);
      const nearby=obstacles.filter(o=>intersects(segmentBounds,o.box,.07)).map(o=>o.ring);
      const openings=doors.filter(o=>intersects(segmentBounds,o.box)).map(o=>o.ring);
      for(const [c,d] of clippedPalaceWall(a,b,nearby))for(const [start,end] of clippedPalaceWall(c,d,openings,0))result.push({id:wall.id,a:start,b:end,outer:wall.barrier==='city_wall'});
    }
  }
  bySite.set(site,result);return result;
}

export function createPalaceWalls(site:Landmark,data:CityData,m:Materials) {
  const group=new THREE.Group();group.name='mapped-palace-wall-lines';
  for(const run of palaceWallRuns(site,data)) {
    const dx=run.b[0]-run.a[0],dz=run.b[1]-run.a[1],length=Math.hypot(dx,dz),height=run.outer?1:.38;
    const segment=new THREE.Group();segment.userData.osmWallId=run.id;segment.position.set((run.a[0]+run.b[0])/2,0,(run.a[1]+run.b[1])/2);segment.rotation.y=-Math.atan2(dz,dx);group.add(segment);
    const block=(mat:THREE.Material,y:number,h:number,depth:number)=>{
      const mesh=new THREE.Mesh(boxGeometry,mat);mesh.position.y=y;mesh.scale.set(length,h,depth);segment.add(mesh);
    };
    block(m.stone,.035,.07,run.outer?.18:.085);
    block(m.wall,height/2+.04,height,run.outer?.16:.065);
    const cap=new THREE.Mesh(roofGeometry(length+.015,run.outer?.21:.12,.045,'gable'),m.grayRoof);cap.position.y=height+.04;segment.add(cap);
  }
  return group;
}
