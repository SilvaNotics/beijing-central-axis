import { expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { axisThroughShenwu } from './axisRoute';
import { palaceGateLayout } from './palaceGates';
import { project } from './geo';
import { createLandmark } from './architecture';
import type { CityData } from './geodata';
import type { Materials } from './materials';

const site=landmarks.find(s=>s.id==='forbidden-city')!;
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};

it('centres the route inside the middle arch without moving the route beyond the local range',()=>{
  const gate=palaceGateLayout(site,data,638741722)!,[ox,oz]=project(site.coords),z=oz+gate.z;
  const original:[number,number][]=[[ox+1,z-15],[ox+.8,z-1],[ox+.5,z+15]],snapshot=JSON.stringify(original);
  const route=axisThroughShenwu(original,site,data);
  expect(route[0]).toEqual(original[0]);expect(route.at(-1)).toEqual(original.at(-1));
  const central=route.filter(p=>Math.abs(p[1]-z)<=3);
  expect(central.length).toBeGreaterThanOrEqual(3);
  const palette:Record<string,THREE.MeshBasicMaterial>={};
  const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
  const gateObject=createLandmark(site,m,data).children.find(o=>o.userData.osmId===638741722)!;
  gateObject.updateMatrixWorld(true);
  for(const [x,worldZ] of central) {
    const dx=x-ox-gate.x,dz=worldZ-oz-gate.z;
    expect(Math.cos(gate.rotation)*dx-Math.sin(gate.rotation)*dz).toBeCloseTo(0,8);
  }
  const a=central[0],b=central.at(-1)!,direction=new THREE.Vector3(b[0]-a[0],0,b[1]-a[1]).normalize();
  for(const side of [-.15,0,.15]) {
    const ray=new THREE.Raycaster(new THREE.Vector3(a[0]-ox+side,.34,a[1]-oz),direction,0,6.1);
    expect(ray.intersectObject(gateObject,true)).toHaveLength(0);
  }
  expect(JSON.stringify(original)).toBe(snapshot);
});

it('aligns a partial palace stripe that begins inside the adjustment range',()=>{
  const gate=palaceGateLayout(site,data,638741722)!,[ox,oz]=project(site.coords),z=oz+gate.z;
  const route=axisThroughShenwu([[ox+1,z+1.5],[ox+1,z+30]],site,data);
  expect(route[0][0]).toBeCloseTo(ox+gate.x+Math.tan(gate.rotation)*1.5,8);
  expect(route.at(-1)).toEqual([ox+1,z+30]);
});
