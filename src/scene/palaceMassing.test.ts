import { expect,it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { createLandmark } from './architecture';
import { palaceTerraces,palaceRoofCore } from './palaceMassing';
import type { CityData } from './geodata';
import type { Materials } from './materials';
const palette:Record<string,THREE.MeshBasicMaterial>={};
const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
const site=landmarks.find(s=>s.id==='forbidden-city')!;
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};
const model=createLandmark(site,m,data);
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
