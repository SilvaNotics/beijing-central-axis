import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { createLandmark } from './architecture';
import type { CityData } from './geodata';
import type { Materials } from './materials';

const palette:Record<string,THREE.MeshBasicMaterial>={};
const materials=new Proxy(palette,{get:(target,key:string)=>target[key]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};
const palace=createLandmark(landmarks.find(site=>site.id==='forbidden-city')!,materials,data);
const namedHall=(id:number)=>{
  let hall:THREE.Object3D|undefined;
  palace.traverse(object=>{if(object.userData.osmId===id)hall=object;});
  return hall!;
};

describe('palace side elevation',()=>{
  it('leaves a walkable gap between the main hall side columns and recessed enclosure',()=>{
    const hall=namedHall(638449347);
    const column=hall.getObjectByName('timber-columns-east');
    const wall=hall.getObjectByName('timber-enclosure');
    expect(column).toBeDefined();expect(wall).toBeDefined();
    hall.updateWorldMatrix(true,true);
    const localBounds=(object:THREE.Object3D)=>{
      const bounds=new THREE.Box3();const point=new THREE.Vector3();
      object.traverse(child=>{
        if(!(child instanceof THREE.Mesh))return;
        const positions=child.geometry.getAttribute('position');
        for(let i=0;i<positions.count;i++)bounds.expandByPoint(hall.worldToLocal(point.fromBufferAttribute(positions,i).applyMatrix4(child.matrixWorld)));
      });
      return bounds;
    };
    const columns=localBounds(column!),enclosure=localBounds(wall!);
    expect(columns.min.x-enclosure.max.x).toBeGreaterThan(.08);
  });
  for(const [id,label] of [[40631788,'mapped Taijidian'],[40631789,'supplementary Tiyuandian']] as const) {
    it(`gives ${label} lattice windows on all four elevations`,()=>{
      const hall=namedHall(id);
      for(const side of ['north','south','east','west']) {
        const windows=hall.getObjectByName(`timber-windows-${side}`);
        expect(windows,side).toBeDefined();
        expect(windows!.children.length,side).toBeGreaterThan(2);
      }
    });
  }
  it('renders opaque eave undersides on both levels of the double roof',()=>{
    const hall=namedHall(638449347);
    const soffits:THREE.Object3D[]=[];
    hall.traverse(object=>{if(object.name==='timber-eave-underside')soffits.push(object);});
    expect(soffits).toHaveLength(2);
    hall.updateWorldMatrix(true,true);
    for(const soffit of soffits) {
      expect(soffit).toBeInstanceOf(THREE.Mesh);
      const mesh=soffit as THREE.Mesh;mesh.geometry.computeBoundingBox();
      const origin=new THREE.Vector3(mesh.geometry.boundingBox!.max.x*.95,0,0).applyMatrix4(mesh.matrixWorld);
      origin.y-=.2;
      const hits=new THREE.Raycaster(origin,new THREE.Vector3(0,1,0),0,.4).intersectObject(mesh);
      expect(hits.length).toBeGreaterThan(0);
    }
  });
});

for(const id of [42681366,42681367,42681368])it(`details tiny palace hut ${id} with windows and eave undersides`,()=>{
  const hut=namedHall(id);expect(hut).toBeDefined();
  for(const side of ['south','north','east','west']) {
    const windows=hut.getObjectByName(`timber-windows-${side}`);
    expect(windows,side).toBeDefined();
    expect(windows!.children.length).toBeGreaterThan(2);
  }
  expect(hut.getObjectByName('timber-eave-underside')).toBeDefined();
});
