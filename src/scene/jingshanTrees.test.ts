import {expect,it} from 'vitest';
import * as THREE from 'three';
import contextText from '../../public/data/context.geojson?raw';
import buildings from '../../public/data/buildings.json';
import {landmarks} from '../data/heritage';
import {wgs84ToGcj02,type CityData} from './geodata';
import {project} from './geo';
import {createLandmark} from './architecture';
import {forestPoints} from './forest';
import type {Materials} from './materials';

const site=landmarks.find(s=>s.id==='jingshan')!;
const park=JSON.parse(contextText).features.find((f:{properties:{name:string}})=>f.properties.name==='景山公园');
const palette:Record<string,THREE.MeshBasicMaterial>={};
const materials=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;

it.each([true,false])('keeps Jingshan crowns clear of rendered halls, stairs and pavilions (footprints: %s)',withFootprints=>{
  const data:CityData={buildings:withFootprints?buildings.buildings as CityData['buildings']:[],context:[{kind:'park',name:'景山公园',coordinates:park.geometry.coordinates[0].map(wgs84ToGcj02)}]};
  const model=createLandmark(site,materials,data),[ox,oz]=project(site.coords);
  model.position.set(ox,.05,oz);model.updateMatrixWorld(true);
  const bounds:THREE.Box3[]=[];
  for(const child of model.children) {
    if(child.name==='景山连续山体')continue;
    child.traverse(object=>{if(object instanceof THREE.Mesh)bounds.push(new THREE.Box3().setFromObject(object));});
  }
  expect(bounds.length).toBeGreaterThan(100);
  const trees=forestPoints(data).filter(t=>t.region==='jingshan');
  expect(trees.length).toBeGreaterThan(200);
  const intrusions=trees.filter(tree=>bounds.some(b=>{
    const dx=Math.max(b.min.x-tree.x,0,tree.x-b.max.x);
    const dz=Math.max(b.min.z-tree.z,0,tree.z-b.max.z);
    return Math.hypot(dx,dz)<tree.radius*1.9+.12;
  }));
  expect(intrusions).toEqual([]);
});
