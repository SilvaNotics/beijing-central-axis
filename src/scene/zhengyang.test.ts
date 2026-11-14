import {expect,it} from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import contextText from '../../public/data/context.geojson?raw';
import {landmarks} from '../data/heritage';
import {createLandmark} from './architecture';
import {localFootprintLayout,wgs84ToGcj02,type CityData} from './geodata';
import {pointInPolygon,project} from './geo';
import {squarePlanParts} from './civicLayout';
import type {Materials} from './materials';
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};
for(const f of JSON.parse(contextText).features)if(f.properties.kind==='road')data.context.push({kind:'road',name:f.properties.name,coordinates:f.geometry.coordinates.map(wgs84ToGcj02),width:f.properties.highway==='primary'?32:24});
const palette:Record<string,THREE.MeshBasicMaterial>={};
const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
const site=landmarks.find(s=>s.id==='zhengyang')!;
it('places Zhengyang city tower on its own mapped centre and yaw, like the arrow tower',()=>{
  const model=createLandmark(site,m,data),tower=model.getObjectByName('正阳门城楼');
  expect(tower).toBeDefined();
  const p=localFootprintLayout(data.buildings.find(b=>b.id===25109960)!,site);
  expect(tower!.position.x).toBeCloseTo(p.x,6);expect(tower!.position.z).toBeCloseTo(p.z,6);expect(tower!.rotation.y).toBeCloseTo(p.rotation,6);
  const roofs:THREE.Object3D[]=[];tower!.traverse(o=>{if(o.name==='city-tower-roof')roofs.push(o);});expect(roofs).toHaveLength(3);
  expect(new THREE.Box3().setFromObject(tower!).max.y).toBeCloseTo(4.365,3);
  tower!.updateWorldMatrix(true,true);
  const base=tower!.getObjectByName('city-tower-platform')!;
  const origin=tower!.localToWorld(new THREE.Vector3(0,.35,3)),direction=new THREE.Vector3(0,0,-1).transformDirection(tower!.matrixWorld);
  expect(new THREE.Raycaster(origin,direction,0,6).intersectObject(base,true)).toHaveLength(0);
});
it('uses the documented city platform proportions and keeps timber floors below their eaves',()=>{
  const tower=createLandmark(site,m,data).getObjectByName('正阳门城楼')!;
  const platform=tower.getObjectByName('city-tower-platform')!;
  // Measure in the building's axes, independently of its mapped yaw/translation.
  tower.position.set(0,0,0);tower.rotation.set(0,0,0);
  const size=new THREE.Box3().setFromObject(platform).getSize(new THREE.Vector3());
  expect(size.x).toBeCloseTo(9.5,3);expect(size.z).toBeCloseTo(3.145,3);
  const floors=tower.children.filter(o=>o.name==='city-tower-floor');
  const roofs=tower.children.filter(o=>o.name==='city-tower-roof');
  expect(floors).toHaveLength(2);
  floors.forEach((floor,i)=>{
    expect(new THREE.Box3().setFromObject(floor).max.y).toBeLessThanOrEqual(roofs[i].position.y+.01);
  });
  // The upper inhabited storey must remain visible, rather than a thin red stripe.
  expect(new THREE.Box3().setFromObject(floors[1]).getSize(new THREE.Vector3()).y).toBeGreaterThan(.55);
});
it('keeps square paving off Qianmen street, the arrow tower and both square side roads',()=>{
  const paving=squarePlanParts(data).filter(p=>p.kind==='plaza');
  const forbidden=data.context.filter(f=>['前门东大街','广场东侧路','广场西侧路'].includes(f.name)).flatMap(f=>f.coordinates.map(project));
  const arrow=localFootprintLayout(data.buildings.find(b=>b.id===439956436)!,site),[ox,oz]=project(site.coords);
  forbidden.push([ox+arrow.x,oz+arrow.z]);
  expect(forbidden.filter(point=>paving.some(p=>pointInPolygon(point,p.ring)))).toEqual([]);
  for(const id of ['square','zhengyang'])expect(landmarks.find(s=>s.id===id)).toBeDefined();
});
