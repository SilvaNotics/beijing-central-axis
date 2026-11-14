import { expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { createLandmark } from './architecture';
import type { CityData } from './geodata';
import type { Materials } from './materials';

it('gives the mapped gray-capped palace runs relief without filling the court or opening windows in walls',()=>{
  const palette:Record<string,THREE.MeshBasicMaterial>={};
  const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
  const site=landmarks.find(s=>s.id==='forbidden-city')!;
  const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};
  const model=createLandmark(site,m,data);
  for(const id of [638513244,638513245,638590074,638590075]) {
    let run:THREE.Object3D|undefined;
    model.traverse(o=>{if(o.userData.osmId===id)run=o;});
    expect(run,`mapped wall ${id}`).toBeDefined();
    const roof=run!.getObjectByName('mapped-concave-roof') as THREE.Mesh;
    expect(roof,`gray roof on ${id}`).toBeDefined();
    expect(roof.material===m.grayRoof,`preserves the dark gray roof on ${id}`).toBe(true);
    const details=run!.getObjectByName('polygon-facade-details');
    expect(details!.children.length).toBeGreaterThan(4);
    const materials:THREE.Material[]=[];
    details!.traverse(o=>{if(o instanceof THREE.Mesh)materials.push(o.material as THREE.Material);});
    expect(materials).toContain(m.stone);
    expect(materials).toContain(m.wood);
    expect(materials).not.toContain(m.window);
  }
});
