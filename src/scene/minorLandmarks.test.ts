import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { createLandmark } from './architecture';
import { localBuildingRing, localFootprintLayout, wgs84ToGcj02, type CityData } from './geodata';
import { layoutCorners } from './templeLayout';
import { pointInPolygon, project } from './geo';
import type { Materials } from './materials';

const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};
const palette:Record<string,THREE.MeshBasicMaterial>={};
const m=new Proxy(palette,{get:(target,key:string)=>target[key]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
const site=(id:string)=>landmarks.find(s=>s.id===id)!;

describe('distinctive small landmarks',()=>{
  const towers=createLandmark(site('bell-drum'),m,data);towers.updateMatrixWorld(true);
  for(const [name,height,tiers] of [['钟楼',4.79,2],['鼓楼',4.67,3]] as const) {
    it(`gives ${name} its own height, eave count and open base portals`,()=>{
      const tower=towers.getObjectByName(name)!;
      expect(new THREE.Box3().setFromObject(tower).max.y).toBeCloseTo(height,2);
      const roofs:THREE.Object3D[]=[];tower.traverse(o=>{if(o.name==='tower-roof')roofs.push(o);});
      expect(roofs).toHaveLength(tiers);
      const base=tower.getObjectByName('tower-base')!;
      expect(base).toBeDefined();
      const origin=tower.position.clone().add(new THREE.Vector3(0,.5,4));
      expect(new THREE.Raycaster(origin,new THREE.Vector3(0,0,-1),0,8).intersectObject(base,true)).toHaveLength(0);
    });
  }
  it('models Wanning as a traversable single stone arch, not a flat plank',()=>{
    const bridge=createLandmark(site('wanning'),m,data);bridge.updateMatrixWorld(true);
    const body=bridge.getObjectByName('万宁桥桥身')!;expect(body).toBeDefined();
    const mesh=body as THREE.Mesh;mesh.geometry.computeBoundingBox();
    const bounds=mesh.geometry.boundingBox!;
    expect(bounds.max.x-bounds.min.x).toBeCloseTo(1.7,2);
    expect(bounds.max.z-bounds.min.z).toBeCloseTo(3.46,2);
    const direction=new THREE.Vector3(-1,0,0).transformDirection(body.matrixWorld);
    const low=new THREE.Raycaster(body.localToWorld(new THREE.Vector3(2,.28,0)),direction,0,4);
    const high=new THREE.Raycaster(body.localToWorld(new THREE.Vector3(2,.53,0)),direction,0,4);
    expect(low.intersectObject(body,true)).toHaveLength(0);
    expect(high.intersectObject(body,true).length).toBeGreaterThan(0);
    const beasts:THREE.Object3D[]=[];bridge.traverse(o=>{if(o.name==='镇水兽')beasts.push(o);});expect(beasts).toHaveLength(6);
  });
  it('includes the agricultural altar, viewing terrace and distinct Xiannongtan compounds',()=>{
    const model=createLandmark(site('xiannongtan'),m,data);
    for(const name of ['太岁殿','拜殿','具服殿','先农神坛','观耕台','神厨院落','神仓院落','庆成宫','一亩三分地'])expect(model.getObjectByName(name),name).toBeDefined();
    const mapped:number[]=[];model.traverse(o=>{if(o.userData.osmId)mapped.push(o.userData.osmId);});
    for(const id of [587608666,587608670,727056014,727056021,727056022])expect(mapped.filter(value=>value===id),String(id)).toHaveLength(1);
    const goldRoofs:THREE.Object3D[]=[];model.traverse(o=>{if(o instanceof THREE.Mesh&&o.material===m.gold)goldRoofs.push(o);});
    expect(goldRoofs).toHaveLength(0);
  });
});

it('closes the prayer compound wall wherever no actual mapped footprint crosses it',()=>{
  const landmark=site('tiantan'),model=createLandmark(landmark,m,data),court=model.getObjectByName('祈谷坛')!;
  model.updateMatrixWorld(true);
  const at=(id:number)=>data.buildings.find(b=>b.id===id)!;
  const corners=[43921139,43921140,43921111,43921133,43921137,43921110,43921126].flatMap(id=>layoutCorners(at(id),landmark));
  const left=Math.min(...corners.map(p=>p[0]))-.3,right=Math.max(...corners.map(p=>p[0]))+.3;
  const north=Math.min(...corners.map(p=>p[1]))-.6,south=localFootprintLayout(at(43921137),landmark).z;
  const [ox,oz]=project(landmark.coords);
  const rings=data.buildings.map(b=>localBuildingRing(b).map(([x,z]):[number,number]=>[x-ox,z-oz]));
  const gaps:[number,number][]=[];
  for(const [a,b,normal] of [
    [[left,north],[right,north],[0,1]],[[left,north],[left,south],[1,0]],
    [[right,north],[right,south],[-1,0]],[[left,south],[right,south],[0,-1]],
  ] as [number[],number[],number[]][])for(let i=1;i<80;i++) {
    const x=a[0]+(b[0]-a[0])*i/80,z=a[1]+(b[1]-a[1])*i/80;
    if(rings.some(ring=>pointInPolygon([x,z],ring)))continue;
    const ray=new THREE.Raycaster(new THREE.Vector3(x+normal[0]*.2,.45,z+normal[1]*.2),new THREE.Vector3(-normal[0],0,-normal[1]),0,.4);
    if(!ray.intersectObject(court,true).length)gaps.push([x,z]);
  }
  expect(gaps).toEqual([]);
});

it('centres Wanning on its mapped bridge road segment instead of the POI pin',()=>{
  const landmark=site('wanning'),bridge=createLandmark(landmark,m,data),[ox,oz]=project(landmark.coords);
  bridge.position.set(ox,.05,oz);bridge.updateMatrixWorld(true);
  const north=project(wgs84ToGcj02([116.3898859,39.9351679]));
  const south=project(wgs84ToGcj02([116.3898988,39.9348597]));
  const body=bridge.getObjectByName('万宁桥桥身')!;
  const center=new THREE.Box3().setFromObject(body).getCenter(new THREE.Vector3());
  expect(center.x).toBeCloseTo((north[0]+south[0])/2,4);
  expect(center.z).toBeCloseTo((north[1]+south[1])/2,4);
  const along=new THREE.Vector3(0,0,1).transformDirection(body.matrixWorld);
  const road=new THREE.Vector3(south[0]-north[0],0,south[1]-north[1]).normalize();
  // The body geometry is already rotated; the parent represents the road yaw.
  expect(Math.abs(along.dot(road))).toBeGreaterThan(.99999);
});

it('renders all eight inner and outer Mound gates as six-post stone portals, leaving the passages open',()=>{
  const model=createLandmark(site('tiantan'),m,data);model.updateMatrixWorld(true);
  const ids=[727026433,727026437,727026438,727026439,43922669,43922668,43922697,43922670];
  for(const id of ids) {
    const matches:THREE.Object3D[]=[];model.traverse(o=>{if(o.userData.osmId===id)matches.push(o);});
    expect(matches,String(id)).toHaveLength(1);
    const gate=matches[0],posts:THREE.Object3D[]=[];gate.traverse(o=>{if(o.name==='lingxing-post')posts.push(o);});
    expect(posts,String(id)).toHaveLength(6);
    const from=gate.localToWorld(new THREE.Vector3(0,.25,1)),direction=new THREE.Vector3(0,0,-1).transformDirection(gate.matrixWorld);
    expect(new THREE.Raycaster(from,direction,0,2).intersectObject(gate,true),String(id)).toHaveLength(0);
  }
  expect(model.getObjectByName('圜丘内壝墙')).toBeDefined();expect(model.getObjectByName('圜丘外壝墙')).toBeDefined();
});

it('uses the documented three Circular Mound diameters and a total terrace height of 5.71 m',()=>{
  const mound=createLandmark(site('tiantan'),m,data).getObjectByName('圜丘')!;mound.updateMatrixWorld(true);
  const tiers=mound.children.filter(o=>o.name==='terrace-tier');
  expect(tiers).toHaveLength(3);
  tiers.forEach((tier,i)=>{
    const bounds=new THREE.Box3().setFromObject(tier);
    expect(bounds.max.x-bounds.min.x).toBeCloseTo([5.491,3.931,2.365][i],3);
  });
  expect(new THREE.Box3().setFromObject(tiers[2]).max.y).toBeCloseTo(.571,3);
});

it('gives Zhengyang arrow tower 94 recessed arrows, two main eaves, a north annex and an open base arch',()=>{
  const landmark=site('zhengyang'),model=createLandmark(landmark,m,data),tower=model.getObjectByName('正阳门箭楼')!;model.updateMatrixWorld(true);
  const p=localFootprintLayout(data.buildings.find(b=>b.id===439956436)!,landmark);
  expect(tower.position.x).toBeCloseTo(p.x,5);expect(tower.position.z).toBeCloseTo(p.z,5);expect(tower.rotation.y).toBeCloseTo(p.rotation,5);
  const arrows:THREE.Object3D[]=[],roofs:THREE.Object3D[]=[];tower.traverse(o=>{if(o.name==='arrow-window')arrows.push(o);if(o.name==='arrow-roof')roofs.push(o);});
  expect(arrows).toHaveLength(94);expect(roofs).toHaveLength(3);
  expect(new THREE.Box3().setFromObject(tower).max.y).toBeCloseTo(3.537,3);
  const base=tower.getObjectByName('arrow-platform')!,from=tower.localToWorld(new THREE.Vector3(0,.4,3));
  const direction=new THREE.Vector3(0,0,-1).transformDirection(tower.matrixWorld);
  expect(new THREE.Raycaster(from,direction,0,6).intersectObject(base,true)).toHaveLength(0);
  // Every arrow has a physical reveal: the facade has a hole in front of its dark backing.
  for(const arrow of arrows) {
    const a=arrow as THREE.Mesh;a.geometry.computeBoundingBox();const center=a.geometry.boundingBox!.getCenter(new THREE.Vector3()).applyMatrix4(a.matrixWorld);
    const outward=new THREE.Vector3(0,0,1).transformDirection(a.matrixWorld);
    const wall=a.parent!.getObjectByName('arrow-perforated-wall')!;
    expect(new THREE.Raycaster(center.clone().addScaledVector(outward,.3),outward.clone().negate(),0,.31).intersectObject(wall)).toHaveLength(0);
  }
});
