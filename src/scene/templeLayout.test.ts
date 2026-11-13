import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { createLandmark } from './architecture';
import { pointInPolygon, project } from './geo';
import { localFootprintLayout, wgs84ToGcj02, type CityData } from './geodata';
import { templeBoundary, moundCenter, tiantanDetailedIds } from './templeLayout';
import { alignPalaceRoof } from './precincts';
import { jinshuiLayout, tiananmenPortals } from './gateLayout';
import type { Materials } from './materials';

const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[{
  kind:'park',name:'天坛公园',coordinates:([[116.398,39.873],[116.416,39.873],[116.416,39.886],[116.398,39.886]] as [number,number][]).map(wgs84ToGcj02),
}]};
// Geometry checks use front-facing materials, so a missing inner wall cannot
// accidentally pass because of a DoubleSide test fixture.
const palette:Record<string,THREE.MeshBasicMaterial>={};
const materials=new Proxy(palette,{get:(target,key:string)=>target[key]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
const site=(id:string)=>landmarks.find(s=>s.id===id)!;

describe('temple collision regressions',()=>{
  const temple=createLandmark(site('tiantan'),materials,data);
  temple.updateMatrixWorld(true);
  it('renders each replaced Tiantan structure exactly once',()=>{
    const counts=new Map<number,number>();
    temple.traverse(object=>{const id=object.userData.osmId;if(id)counts.set(id,(counts.get(id)??0)+1);});
    for(const id of tiantanDetailedIds)expect(counts.get(id),String(id)).toBe(1);
  });
  it('has a visible inward face on the echo wall',()=>{
    const echo=temple.getObjectByName('回音壁')!;
    const origin=echo.position.clone();origin.y=.4;
    const ray=new THREE.Raycaster(origin,new THREE.Vector3(0,0,-1),0,4);
    const hits=ray.intersectObject(echo,true);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].distance).toBeCloseTo(3.15,1);
  });
  it('keeps all four Lingxing gates outside the open circular altar',()=>{
    const [x,z]=moundCenter(site('tiantan'));
    for(const id of [727026433,727026437,727026438,727026439]) {
      const p=localFootprintLayout(data.buildings.find(b=>b.id===id)!,site('tiantan'));
      expect(Math.hypot(p.x-x,p.z-z)-p.depth/2).toBeGreaterThan(4);
    }
    const mound=temple.getObjectByName('圜丘')!;
    expect([mound.position.x,mound.position.z]).toEqual([x,z]);
  });
  for(const [siteId,ids] of [['taimiao',[684772333,684772314,60540211]],['shejitan',[60540199,687599164]]] as const) {
    it(`keeps ${siteId} main hall and altar bounds inside mapped walls`,()=>{
      const landmark=site(siteId),model=createLandmark(landmark,materials,data),boundary=templeBoundary(landmark);
      model.updateMatrixWorld(true);
      for(const id of ids) {
        let object:THREE.Object3D|undefined;
        model.traverse(item=>{if(item.userData.osmId===id)object=item;});
        expect(object).toBeDefined();
        const bounds=new THREE.Box3().setFromObject(object!);
        for(const x of [bounds.min.x,bounds.max.x])for(const z of [bounds.min.z,bounds.max.z])expect(pointInPolygon([x,z],boundary),`${id}: ${x}, ${z}`).toBe(true);
      }
    });
  }
});

describe('shared architectural alignment',()=>{
  it('connects the five principal bridge axes to traversable Tiananmen portals',()=>{
    const landmark=site('tiananmen'),[x]=project(landmark.coords),gate=createLandmark(landmark,materials,data);
    gate.updateMatrixWorld(true);
    const bridges=jinshuiLayout().filter(b=>b.portal!==null);
    bridges.forEach((bridge,i)=>expect(bridge.x-x).toBeCloseTo(tiananmenPortals[i],10));
    for(const offset of tiananmenPortals) {
      const ray=new THREE.Raycaster(new THREE.Vector3(offset,.9,4),new THREE.Vector3(0,0,-1),0,8);
      expect(ray.intersectObject(gate,true),`portal ${offset}`).toHaveLength(0);
    }
  });
  it('never expands a corrected palace roof outside its original rectangle',()=>{
    const palace=site('forbidden-city');
    for(const building of data.buildings) {
      const raw=localFootprintLayout(building,palace);
      if(Math.abs(raw.x)>50||Math.abs(raw.z)>60)continue;
      const aligned=alignPalaceRoof(raw),delta=aligned.rotation-raw.rotation;
      const xExtent=Math.abs(Math.cos(delta))*aligned.width+Math.abs(Math.sin(delta))*aligned.depth;
      const zExtent=Math.abs(Math.sin(delta))*aligned.width+Math.abs(Math.cos(delta))*aligned.depth;
      expect(xExtent).toBeLessThanOrEqual(raw.width+1e-7);
      expect(zExtent).toBeLessThanOrEqual(raw.depth+1e-7);
    }
  });
});
