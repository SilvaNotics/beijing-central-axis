import {expect,it} from 'vitest';
import * as THREE from 'three';
import {landmarks} from '../data/heritage';
import {bake,createLandmark} from './architecture';
import type {Materials} from './materials';

const palette:Record<string,THREE.MeshBasicMaterial>={};
const materials=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
const site=landmarks.find(s=>s.id==='zhengyang')!;
function tower() {
  const model=createLandmark(site,materials).getObjectByName('正阳门城楼') as THREE.Group;
  model.position.set(0,0,0);model.rotation.set(0,0,0);return model;
}

it('keeps roof relief on all three eaves when using the dedicated city tower',()=>{
  const model=tower();
  const details=model.children.filter(o=>o.name==='city-tower-roof-details');
  expect(details).toHaveLength(3);
  for(const detail of details) {
    // Relief must cover both slopes and the hipped ends, not a single ridge bar.
    const bounds=new THREE.Box3().setFromObject(detail),size=bounds.getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(3.5);expect(size.z).toBeGreaterThan(1.7);
    expect(size.y).toBeGreaterThan(.2);
  }
  expect(new THREE.Box3().setFromObject(model).max.y).toBeCloseTo(4.365,3);
});

it('keeps the full arch passage open after masonry detail is baked',()=>{
  const model=tower();
  expect(model.getObjectByName('city-tower-masonry-details')).toBeDefined();
  const result=bake(model,false);result.updateMatrixWorld(true);
  for(const x of [-.25,0,.25])for(const y of [.10,.30,.47])for(const side of [-1,1]) {
    const ray=new THREE.Raycaster(new THREE.Vector3(x,y,side*2),new THREE.Vector3(0,0,-side),0,4);
    expect(ray.intersectObject(result,true)).toHaveLength(0);
  }
  // Geometry is batched; more relief must not produce hundreds of draw calls.
  expect(result.children.length).toBeLessThan(35);
});
