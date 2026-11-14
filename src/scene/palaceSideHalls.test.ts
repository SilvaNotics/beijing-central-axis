import {expect,it} from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import {landmarks} from '../data/heritage';
import {createLandmark} from './architecture';
import {palaceSideHallLayout} from './palaceSideHalls';
import {localBuildingRing,localFootprintLayout,type CityData} from './geodata';
import {pointInPolygon,project} from './geo';
import {localPalaceBoundary} from './precincts';
import type {Materials} from './materials';

const site=landmarks.find(s=>s.id==='forbidden-city')!;
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};
const palette:Record<string,THREE.MeshBasicMaterial>={};
const m=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
const model=createLandmark(site,m,data);model.updateMatrixWorld(true);
const objects=new Map<number,THREE.Object3D>();model.traverse(o=>{if(o.userData.osmId)objects.set(o.userData.osmId,o);});

it.each([43512262,43519304])('keeps both halls and a physically continuous corridor for %s',id=>{
  const item=objects.get(id)!;
  for(const name of ['front','rear','corridor'])expect(item.getObjectByName(`palace-side-hall-${name}`)).toBeDefined();
  const building=data.buildings.find(b=>b.id===id)!,layout=palaceSideHallLayout(building,site);
  const cores:THREE.Object3D[]=[];item.traverse(o=>{if(o.name==='timber-enclosure')cores.push(o);});
  expect(cores).toHaveLength(3);
  for(let i=0;i<=100;i++) {
    const t=i/100,p=new THREE.Vector3(layout.rear.x*(1-t)+layout.front.x*t,.4,layout.rear.z*(1-t)+layout.front.z*t);
    expect(cores.some(o=>{const q=o.worldToLocal(p.clone());return Math.abs(q.x)<=.501&&Math.abs(q.y)<=.501&&Math.abs(q.z)<=.501;}),`solid enclosure at corridor station ${i}`).toBe(true);
  }
  expect(layout.front.width).toBeGreaterThan(layout.corridor.width*2);
  expect(layout.rear.width).toBeGreaterThan(layout.corridor.width*2);
});

it('renders every mapped building intersecting the palace with non-empty geometry',()=>{
  const boundary=localPalaceBoundary(site),[ox,oz]=project(site.coords);
  const mapped=data.buildings.filter(b=>localBuildingRing(b).some(([x,z])=>pointInPolygon([x-ox,z-oz],boundary)));
  expect(mapped.length).toBeGreaterThan(1200);
  for(const b of mapped) {
    const item=objects.get(b.id);expect(item,`source building ${b.id}`).toBeDefined();
    expect(new THREE.Box3().setFromObject(item!).isEmpty()).toBe(false);
  }
});

it('keeps the full timber range under the two long southwest roofs',()=>{
  for(const id of [40478533,40478537]) {
    const item=objects.get(id)!,core=item.getObjectByName('timber-enclosure') as THREE.Mesh;
    const roof=item.children.find(o=>o instanceof THREE.Mesh&&(o.material===m.gold||o.material===m.grayRoof)) as THREE.Mesh;
    roof.geometry.computeBoundingBox();
    const width=roof.geometry.boundingBox!.max.x-roof.geometry.boundingBox!.min.x;
    // At most 3.2m eave inset plus two 3m verandas, independent of row length.
    expect(width-core.scale.x).toBeLessThan(.93);
  }
});
