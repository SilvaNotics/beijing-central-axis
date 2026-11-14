import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { createLandmark } from './architecture';
import type { CityData } from './geodata';
import type { Materials } from './materials';
import { zhongheLayout } from './palaceArchitecture';

const palette:Record<string,THREE.MeshBasicMaterial>={};
const materials=new Proxy(palette,{get:(target,key:string)=>target[key]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
const site=landmarks.find(site=>site.id==='forbidden-city')!;
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};
const palace=createLandmark(site,materials,data);
palace.updateMatrixWorld(true);
const byId=(id:number)=>{let result:THREE.Object3D|undefined;palace.traverse(object=>{if(object.userData.osmId===id)result=object;});return result!;};
const roofs=(object:THREE.Object3D)=>{const result:THREE.Mesh[]=[];object.traverse(child=>{if(child instanceof THREE.Mesh&&child.material===materials.gold)result.push(child);});return result;};

describe('documented palace silhouettes and proportions',()=>{
  for(const [id,name,height] of [[638449347,'Taihedian',3.505],[638473398,'Baohedian',2.95],[638981317,'Qianqinggong',2.4],[638807674,'Qianqingmen',1.6]] as const) {
    it(`keeps ${name} at its documented overall height`,()=>{
      expect(new THREE.Box3().setFromObject(byId(id)).max.y).toBeCloseTo(height,2);
    });
  }
  it('gives Zhonghedian one pointed roof on the aligned three-hall axis',()=>{
    const middle=palace.getObjectByName('中和殿')!;
    expect(roofs(middle)).toHaveLength(1);
    const aligned=zhongheLayout(site,data);
    expect(middle.position.x).toBeCloseTo(aligned.x,5);
    expect(middle.position.z).toBeCloseTo(aligned.z,5);
    expect(middle.rotation.y).toBeCloseTo(aligned.rotation,5);
    const mesh=roofs(middle)[0],vertices=mesh.geometry.getAttribute('position');
    mesh.geometry.computeBoundingBox();const top=mesh.geometry.boundingBox!.max.y;
    for(let i=0;i<vertices.count;i++)if(vertices.getY(i)>top-1e-5) {
      expect(Math.abs(vertices.getX(i))).toBeLessThan(.01);
      expect(Math.abs(vertices.getZ(i))).toBeLessThan(.01);
    }
  });
  it('uses one pointed roof for Jiaotaidian and two roofs for Kunninggong',()=>{
    expect(roofs(byId(638981229))).toHaveLength(1);
    expect(roofs(byId(639012193))).toHaveLength(2);
  });
  it('has physical triangular side gables on Baohedian',()=>{
    const gables:THREE.Object3D[]=[];byId(638473398).traverse(child=>{if(child.name==='roof-gable')gables.push(child);});
    expect(gables).toHaveLength(2);
    for(const gable of gables)expect(new THREE.Box3().setFromObject(gable).getSize(new THREE.Vector3()).y).toBeGreaterThan(.15);
  });
});
