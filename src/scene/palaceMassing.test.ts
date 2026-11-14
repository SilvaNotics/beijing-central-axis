import { expect,it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { createLandmark } from './architecture';
import { palaceTerraces,palaceRoofCore } from './palaceMassing';
import type { CityData } from './geodata';
import type { Materials } from './materials';
import { zhongheLayout } from './palaceArchitecture';
import { localPalaceBoundary } from './precincts';
import { localFootprintLayout,localBuildingRing } from './geodata';
import { project } from './geo';
import { mappedLayout } from './layouts';
const palette:Record<string,THREE.MeshBasicMaterial>={};
const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
const site=landmarks.find(s=>s.id==='forbidden-city')!;
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};
const model=createLandmark(site,m,data);
it('aligns Zhonghe hall and its map layout with the palace architectural datum',()=>{
  const [a,b]=localPalaceBoundary(site),rotation=-Math.atan2(b[1]-a[1],b[0]-a[0]);
  expect(model.getObjectByName('中和殿')!.rotation.y).toBeCloseTo(rotation,10);
  const layout=zhongheLayout(site,data);
  expect(layout.rotation).toBeCloseTo(rotation,10);
  expect(layout).toMatchObject({width:2.65,depth:2.65});
});
it.each([true,false])('centres Zhonghe on the three-hall axis (footprints: %s)',withData=>{
  const center=(id:number)=>withData?localFootprintLayout(data.buildings.find(b=>b.id===id)!,site):mappedLayout(id,site);
  const south=center(638449347),north=center(638473398),middle=zhongheLayout(site,withData?data:undefined);
  const dx=north.x-south.x,dz=north.z-south.z;
  expect((middle.x-south.x)*dz-(middle.z-south.z)*dx).toBeCloseTo(0,10);
  expect(middle.z).toBeGreaterThan(north.z);expect(middle.z).toBeLessThan(south.z);
  if(withData) {
    const hall=model.getObjectByName('中和殿')!;
    expect(hall.position.x).toBeCloseTo(middle.x,10);expect(hall.position.z).toBeCloseTo(middle.z,10);
  }
});
for(const id of palaceTerraces.keys())it(`keeps mapped terrace ${id} free of roofs and timber windows`,()=>{
  let item:THREE.Object3D|undefined;model.traverse(o=>{if(o.userData.osmId===id)item=o;});
  expect(item,`mapped terrace ${id}`).toBeDefined();
  const materials:THREE.Material[]=[];item!.traverse(o=>{if(o instanceof THREE.Mesh)materials.push(o.material as THREE.Material);});
  expect(materials).not.toContain(m.gold);expect(materials).not.toContain(m.window);
  expect(materials).toContain(m.marble);
});
it('keeps the middle gate roof off both projecting stairs',()=>{
  const b=data.buildings.find(b=>b.id===638507783)!,p=palaceRoofCore(b,site);
  expect(p.width).toBeGreaterThan(2);expect(p.depth).toBeLessThan(2.4);
  let gate:THREE.Object3D|undefined;model.traverse(o=>{if(o.userData.osmId===b.id)gate=o;});
  expect(gate!.getObjectByName('mapped-concave-roof')).toBeUndefined();
});

it.each([638981261,638807694])('renders Qianqing front terrace / raised approach %s as white stone with no roof',id=>{
  let item:THREE.Object3D|undefined;model.traverse(o=>{if(o.userData.osmId===id)item=o;});
  expect(item,`Qianqing stone deck ${id}`).toBeDefined();
  expect(item!.name).toBe('palace-stone-terrace');
  const materials:THREE.Material[]=[];item!.traverse(o=>{if(o instanceof THREE.Mesh)materials.push(o.material as THREE.Material);});
  expect(materials).toContain(m.marble);
  expect(materials).not.toContain(m.gold);expect(materials).not.toContain(m.window);
  expect(new THREE.Box3().setFromObject(item!).max.y).toBeLessThan(.4);
});

it('keeps the Qianqing moon terrace connection to the raised approach free of a transverse railing',()=>{
  const approach=data.buildings.find(b=>b.id===638807694)!;
  const ring=localBuildingRing(approach),[ox,oz]=project(site.coords);
  // The mapped northern edge is shared with the moon terrace.
  const x=(ring[1][0]+ring[3][0])/2-ox,z=(ring[1][1]+ring[3][1])/2-oz;
  model.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(x,.6,z),new THREE.Vector3(0,-1,0),0,.35);
  const terrace=model.children.find(o=>o.userData.osmId===638981261)!;
  expect(ray.intersectObject(terrace,true)).toHaveLength(0);
});
