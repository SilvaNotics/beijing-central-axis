import {expect,it} from 'vitest';
import * as THREE from 'three';
import {landmarks} from '../data/heritage';
import bundled from '../../public/data/buildings.json';
import type {CityData} from './geodata';
import {createJingshanTerrain,jingshanHeight,jingshanPeaks} from './jingshanTerrain';
import {createRoadRemains} from './roadRemains';
import {roadExhibits,roadPavingRuns,roadStation} from './southernRoad';
import {createPalaceGarden,palaceGardenLayout} from './palaceGarden';
import {createFlagCourt} from './civicArchitecture';
import type {Materials} from './materials';
const palette:Record<string,THREE.MeshBasicMaterial>={};
const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
const site=(id:string)=>landmarks.find(s=>s.id===id)!;
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};
it('keeps every Jingshan pavilion grounded and removes the flat rectangular terrain margins',()=>{
  const landmark=site('jingshan'),g=createJingshanTerrain(landmark,m),hill=g.getObjectByName('jingshan-ground') as THREE.Mesh;
  for(const peak of jingshanPeaks(landmark))expect(jingshanHeight(landmark,peak.x,peak.z)).toBeCloseTo(peak.height,6);
  const p=hill.geometry.getAttribute('position'),indices=hill.geometry.index!;
  for(let i=0;i<indices.count;i+=3)expect(Math.max(...[0,1,2].map(j=>p.getY(indices.getX(i+j))))).toBeGreaterThan(.025);
  for(const path of g.children.filter(c=>c.name==='jingshan-hill-path')) {
    const mesh=path as THREE.Mesh,n=mesh.geometry.getAttribute('normal');
    for(let i=0;i<n.count;i++)expect(n.getY(i)).toBeGreaterThan(0);
  }
});
it('keeps road exhibits and their seven strata on the shared road direction and clears modern paving',()=>{
  const model=createRoadRemains(site('southern-road'),m),section=model.getObjectByName('永定门内历史道路叠压遗存')!;
  expect(section.children.filter(c=>c.name==='exposed-road-layer').map(c=>c.userData.layer)).toEqual([7,6,5,4,3,2,1]);
  const layers=section.children.filter(c=>c.name==='exposed-road-layer') as THREE.Mesh[];
  expect(layers.every((layer,i)=>!i||layer.position.y>layers[i-1].position.y)).toBe(true);
  for(const e of roadExhibits) {
    const p=roadStation(e.station,e.lateral);expect(Number.isFinite(p.rotation)).toBe(true);
    const a=e.lateral/10-e.width/2,b=e.lateral/10+e.width/2;
    expect(roadPavingRuns(e.station).every(([x,y])=>y<a||x>b)).toBe(true);
  }
  expect(section.children.filter(c=>c.name==='qing-stone-road')).toHaveLength(3);
  const slabs:THREE.Object3D[]=[];model.traverse(o=>{if(o.name==='worn-road-slab')slabs.push(o);});expect(slabs).toHaveLength(84);
  const ruts:THREE.Mesh[]=[];model.traverse(o=>{if(o.name==='earth-wheel-ruts')ruts.push(o as THREE.Mesh);});expect(ruts).toHaveLength(4);
  for(const rut of ruts){rut.geometry.computeBoundingBox();expect(rut.geometry.boundingBox!.max.y-rut.geometry.boundingBox!.min.y).toBeGreaterThan(.005);expect(rut.geometry.boundingBox!.min.y).toBeGreaterThan(.115);}
});
it('anchors Duixiu beneath Yujing pavilion and leaves a real frontal cave',()=>{
  const landmark=site('forbidden-city'),g=createPalaceGarden(landmark,m,data),p=palaceGardenLayout(landmark,data);g.updateMatrixWorld(true);
  expect(g.position.x).toBeCloseTo(p.x,6);expect(g.position.z).toBeCloseTo(p.z,6);expect(g.getObjectByName('御景亭')!.position.y).toBe(1);
  const body=g.getObjectByName('duixiu-cave-body')!,ray=new THREE.Raycaster(g.localToWorld(new THREE.Vector3(0,.2,2)),new THREE.Vector3(0,0,-1).transformDirection(g.matrixWorld),0,4);
  expect(ray.intersectObject(body,true)).toHaveLength(0);
  expect(g.children.filter(o=>o.name==='duixiu-side-step')).toHaveLength(32);
});
it('adds the 56-post flag barrier while keeping the east and west entrances open',()=>{
  const g=createFlagCourt(m,0,0);g.updateMatrixWorld(true);
  const posts:THREE.Object3D[]=[];g.traverse(o=>{if(o.name==='flag-bronze-post')posts.push(o);});expect(posts).toHaveLength(56);
  for(const x of [-1,1]) {
    const ray=new THREE.Raycaster(new THREE.Vector3(x*1.5,.17,0),new THREE.Vector3(-x,0,0),0,.8);
    expect(ray.intersectObject(g,true)).toHaveLength(0);
  }
});
