import {expect,it} from 'vitest';
import * as THREE from 'three';
import type {Materials} from './materials';
import {createJingshanPavilion,jingshanPavilionEnvelope,jingshanPavilionProfile,pavilionRoofPoint} from './jingshanPavilions';
import {jingshanPavilions} from './layouts';

const palette:Record<string,THREE.MeshBasicMaterial>={};
const materials=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial({side:THREE.DoubleSide})}) as unknown as Materials;

it('preserves five distinct pavilion forms, documented heights and the central 32-column frame',()=>{
  for(const id of jingshanPavilions) {
    const model=createJingshanPavilion(id,materials),profile=jingshanPavilionProfile(id);
    const roofs=model.children.filter(g=>g.name.startsWith('pavilion-roof-'));
    expect(roofs).toHaveLength(id===26390235?3:2);
    const bounds=new THREE.Box3().setFromObject(model),envelope=jingshanPavilionEnvelope(id);
    expect(bounds.min.y).toBeCloseTo(0,5);
    expect(bounds.max.y).toBeCloseTo(profile.height,5);
    expect(bounds.max.x).toBeLessThan(envelope.halfWidth+.03);
    expect(bounds.min.x).toBeGreaterThan(-envelope.halfWidth-.03);
    expect(bounds.max.z).toBeLessThan(envelope.halfDepth+.03);
    const columns:THREE.Object3D[]=[];model.traverse(o=>{if(o.name==='timber-column')columns.push(o);});
    expect(columns).toHaveLength(id===26390235?32:profile.sides===8?16:12);
  }
});

it('uses curved slopes and open tier skirts instead of stacked solid cones',()=>{
  for(const sides of [4,8,64]) {
    const edge=pavilionRoofPoint(sides,1,.3,false,.125,0);
    const mid=pavilionRoofPoint(sides,1,.3,false,.125,.5);
    const neck=pavilionRoofPoint(sides,1,.3,false,.125,1);
    expect(neck.clone().setY(0).length()).toBeGreaterThan(.3);
    expect(mid.y).toBeLessThan((edge.y+neck.y)/2-.025);
    const model=createJingshanPavilion(sides===4?26390235:sides===8?189309374:189309373,materials);
    model.traverse(o=>{if(o instanceof THREE.Mesh) {
      expect(o.geometry.type).not.toBe('ConeGeometry');
      expect([...o.geometry.getAttribute('position').array].every(Number.isFinite)).toBe(true);
    }});
  }
});

it('keeps the central north–south gallery doors open beneath the beams',()=>{
  const pavilion=createJingshanPavilion(26390235,materials);pavilion.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,.5,2),new THREE.Vector3(0,0,-1),0,4);
  expect(ray.intersectObject(pavilion,true)).toHaveLength(0);
});

it('connects the round pavilion finial to its upper roof instead of leaving a floating cap',()=>{
  const pavilion=createJingshanPavilion(189309373,materials);pavilion.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(.1,1.175*.941,0),new THREE.Vector3(-1,0,0),0,.2);
  expect(ray.intersectObject(pavilion,true).some(hit=>(hit.object as THREE.Mesh).material===materials.goldLeaf)).toBe(true);
});
