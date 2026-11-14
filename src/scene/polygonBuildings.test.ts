import { expect,it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import contextText from '../../public/data/context.geojson?raw';
import { landmarks } from '../data/heritage';
import { createLandmark } from './architecture';
import { localBuildingRing,wgs84ToGcj02,type CityData } from './geodata';
import { pointInPolygon,project } from './geo';
import type { Materials } from './materials';
const palette:Record<string,THREE.MeshBasicMaterial>={};
const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial({side:THREE.DoubleSide})}) as unknown as Materials;
const park=JSON.parse(contextText).features.find((f:{properties:{name:string}})=>f.properties.name==='天坛公园');
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[{kind:'park',name:'天坛公园',coordinates:(park.geometry.coordinates[0] as [number,number][]).map(wgs84ToGcj02)}]};
const models=new Map(['forbidden-city','tiantan'].map(id=>{const site=landmarks.find(s=>s.id===id)!,model=createLandmark(site,m,data);model.updateMatrixWorld(true);return [id,{site,model}];}));
// The three palace terrace ways formerly listed here are stone platforms;
// palaceMassing.test.ts guards that correction instead of requiring false roofs.
for(const id of [40593163,40592360,43921125])it(`gives concave building ${id} pitched roofs and detailed elevations while keeping its courtyard open`,()=>{
  const {site,model}=models.get(id===43921125?'tiantan':'forbidden-city')!;
  const matches:THREE.Object3D[]=[];model.traverse(o=>{if(o.userData.osmId===id)matches.push(o);});
  expect(matches).toHaveLength(1);const building=matches[0];
  const roof=building.getObjectByName('mapped-concave-roof') as THREE.Mesh;expect(roof).toBeDefined();
  roof.geometry.computeBoundingBox();const bounds=roof.geometry.boundingBox!;
  expect(bounds.max.y-bounds.min.y).toBeGreaterThan(.10);
  expect(building.getObjectByName('polygon-facade-details')!.children.length).toBeGreaterThan(4);
  const [ox,oz]=project(site.coords),ring=localBuildingRing(data.buildings.find(b=>b.id===id)!).map(([x,z]):[number,number]=>[x-ox,z-oz]);
  for(let ix=1;ix<25;ix++)for(let iz=1;iz<25;iz++) {
    const x=bounds.min.x+(bounds.max.x-bounds.min.x)*ix/25,z=bounds.min.z+(bounds.max.z-bounds.min.z)*iz/25;
    const hit=new THREE.Raycaster(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0),0,5).intersectObject(roof);
    expect(hit.length>0,`${x},${z}`).toBe(pointInPolygon([x,z],ring));
  }
});
