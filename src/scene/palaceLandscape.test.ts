import { expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import context from '../../public/data/context.geojson?raw';
import { landmarks } from '../data/heritage';
import { localBuildingRing, wgs84ToGcj02, type CityData } from './geodata';
import { pointInPolygon, project } from './geo';
import { distanceToRing } from './centralGreenery';
import { palaceCourtZones, palaceGardenZones, createPalaceLandscape } from './palaceLandscape';
import { palaceWallRuns } from './palaceWalls';
import { palaceBridgeLayouts, palaceWaterAreas, createInnerJinshuiBridges } from './palaceWater';
import { palaceWaterConnections } from './palaceWaterConnections';
import type { Materials } from './materials';
const site=landmarks.find(s=>s.id==='forbidden-city')!;
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:JSON.parse(context).features.filter((f:{properties:{kind:string}})=>f.properties.kind==='water').map((f:{properties:{name:string;osmId:number};geometry:{coordinates:[number,number][][]}})=>({kind:'water',name:f.properties.name,osmId:f.properties.osmId,coordinates:f.geometry.coordinates[0].map(wgs84ToGcj02),holes:f.geometry.coordinates.slice(1).map(r=>r.map(wgs84ToGcj02))}))};
data.context.push(...palaceWaterConnections(data.context));
const [ox,oz]=project(site.coords),buildings=data.buildings.map(b=>localBuildingRing(b).map(([x,z]):[number,number]=>[x-ox,z-oz]));
it('represents the northeast Wenhua court with separate lawns and slab paths around the retained standalone screen',()=>{
 const before=palaceWallRuns(site,data).filter(w=>w.id===43519305).map(w=>({...w,a:[...w.a],b:[...w.b]}));
 const court=palaceCourtZones(site,data)[0],screen=before[0],water=palaceWaterAreas(site,data);
 expect(court.id).toBe('wenhua-northeast-court');expect(court.beds.length).toBeGreaterThan(30);
 expect(court.paths!.length).toBeGreaterThan(100);expect(court.trees.length).toBeGreaterThan(4);
 const nearby=buildings.filter(r=>distanceToRing(screen.a as [number,number],r)<16);
 for(const r of [...court.beds,...court.paths!])for(const p of r){
  expect(pointInPolygon(p,court.ring)).toBe(true);
  expect(nearby.some(b=>pointInPolygon(p,b)||distanceToRing(p,b)<.39)).toBe(false);
  expect(water.some(w=>pointInPolygon(p,w.ring)||distanceToRing(p,w.ring)<.19)).toBe(false);
  expect(distanceToRing(p,[screen.a,screen.b] as [number,number][])).toBeGreaterThan(.12);
 }
 // Slab joints are intentionally open; use distance to tile edges to check
 // that both bypasses extend from the north to south side of the screen.
 const mid:[number,number]=[(screen.a[0]+screen.b[0])/2,(screen.a[1]+screen.b[1])/2];
 for(const side of [-1,1])for(let z=-.8;z<=.8;z+=.1){
  const p:[number,number]=[mid[0]+side*1.4,mid[1]+z];
  expect(court.paths!.some(r=>pointInPolygon(p,r)||distanceToRing(p,r)<.045),`bypass ${side},${z}`).toBe(true);
 }
 const mat=new THREE.MeshBasicMaterial(),model=createPalaceLandscape(site,data,new Proxy({},{get:()=>mat}) as Materials);
 expect(model.getObjectByName(court.name)?.getObjectByName('court-stone-slabs')).toBeDefined();
 expect(palaceWallRuns(site,data).filter(w=>w.id===43519305)).toEqual(before);
 expect(before).toHaveLength(1);expect(before[0].interpreted).toBeUndefined();
});
it('represents four distinct gardens with planting and keeps the imperial garden inside its 140 by 80 m envelope',()=>{
 const gardens=palaceGardenZones(site,data);
 expect(gardens.map(g=>g.name)).toEqual(['御花园','慈宁宫花园','建福宫花园','宁寿宫花园']);
 for(const g of gardens){expect(g.beds.reduce((sum,r)=>sum+Math.abs((r[1][0]-r[0][0])*(r[3][1]-r[0][1])-(r[1][1]-r[0][1])*(r[3][0]-r[0][0])),0),g.name).toBeGreaterThan(.5);expect(g.trees.length,g.name).toBeGreaterThan(0);}
 const r=gardens[0].ring;
 expect(Math.hypot(r[1][0]-r[0][0],r[1][1]-r[0][1])).toBeCloseTo(14);
 expect(Math.hypot(r[2][0]-r[1][0],r[2][1]-r[1][1])).toBeCloseTo(8);
});
it('keeps planting bed edges and entire tree crowns away from mapped roofs, water and garden edges',()=>{
 for(const g of palaceGardenZones(site,data)){
  const nearby=buildings.filter(r=>r.some(p=>pointInPolygon(p,g.ring))||distanceToRing(g.ring[0],r)<20);
  for(const bed of g.beds)for(const p of bed){expect(pointInPolygon(p,g.ring),g.name).toBe(true);expect(nearby.some(r=>pointInPolygon(p,r)||distanceToRing(p,r)<.39),g.name).toBe(false);}
  for(const t of g.trees){const clearance=t.radius*1.9+.12;expect(distanceToRing(t.point,g.ring)).toBeGreaterThan(clearance);expect(nearby.some(r=>pointInPolygon(t.point,r)||distanceToRing(t.point,r)<clearance+.39),g.name).toBe(false);}
 }
});
it('adds all nine documented side bridges while preserving five central bridges, with each deck ending on dry banks',()=>{
 const bridges=palaceBridgeLayouts(site,data),water=palaceWaterAreas(site,data);
 expect(bridges.filter(b=>b.principal)).toHaveLength(5);expect(bridges.filter(b=>!b.principal).map(b=>b.id)).toEqual(['wuying-0','wuying-1','wuying-2','duanhong','banbi','wenyuan','sanzuomen-0','sanzuomen-1','sanzuomen-2']);
 const mat=new THREE.MeshBasicMaterial(),m=new Proxy({},{get:()=>mat}) as Materials;
 const model=createInnerJinshuiBridges(site,data,m);model.updateMatrixWorld(true);
 for(const b of bridges){
  expect(water.some(w=>pointInPolygon(b.center,w.ring)),b.id).toBe(true);
  for(const sign of [-1,1]){const p:[number,number]=[b.center[0]+sign*Math.sin(b.rotation)*(b.length/2-.02),b.center[1]+sign*Math.cos(b.rotation)*(b.length/2-.02)];expect(water.some(w=>pointInPolygon(p,w.ring)),b.id).toBe(false);}
  const object=model.children.find(o=>o.userData.bridgeId===b.id)!;
  const ray=new THREE.Raycaster(new THREE.Vector3(b.center[0],1,b.center[1]),new THREE.Vector3(0,-1,0));
  expect(ray.intersectObject(object,true)[0]?.point.y,b.id).toBeGreaterThan(.15);
  const across=new THREE.Vector3(Math.cos(b.rotation),0,-Math.sin(b.rotation));
  const under=new THREE.Raycaster(new THREE.Vector3(b.center[0],.05,b.center[1]).addScaledVector(across,-b.width/2-.1),across,0,b.width+.2);
  expect(under.intersectObject(object,true),b.id).toHaveLength(0);
 }
 expect(bridges.find(b=>b.id==='banbi')?.singleRail).toBe(true);
});
