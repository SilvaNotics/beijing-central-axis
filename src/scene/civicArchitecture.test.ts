import { describe,expect,it } from 'vitest';
import * as THREE from 'three';
import { createCivicBuilding,createMonument } from './civicArchitecture';
import { civicLayouts,civicPlanParts,type CivicKind } from './civicLayout';
import { project } from './geo';
import { wgs84ToGcj02 } from './geodata';
import type { Materials } from './materials';

const palette:Record<string,THREE.MeshBasicMaterial>={};
const m=new Proxy(palette,{get:(target,key:string)=>target[key]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;

describe('civic elevations',()=>{
  for(const kind of ['great-hall','museum'] as CivicKind[]) {
    it(`${kind} has open column bays with glazing behind them`,()=>{
      const p=civicLayouts[kind],g=createCivicBuilding(kind,m,0,0);
      // Inspect in the building's own facade frame.
      g.rotation.y=0;g.updateMatrixWorld(true);
      // Offset within the center bay to avoid the window's vertical mullion.
      const ray=new THREE.Raycaster(new THREE.Vector3(.09,p.floor+1.4,p.depth/2+2),new THREE.Vector3(0,0,-1));
      const hits=ray.intersectObject(g,true);
      expect(hits.length).toBeGreaterThan(0);
      expect((hits[0].object as THREE.Mesh).material).toBe(m.glass);
      expect(hits[0].distance).toBeGreaterThan(kind==='museum'?5:2.7);
      const columns=g.getObjectByName('entrance-portico')!.children.filter(c=>c.name.startsWith('portico-column-'));
      expect(columns).toHaveLength(12);
      expect(new Set(columns.map(c=>c.userData.section))).toEqual(new Set([kind==='museum'?'square':'fluted-round']));
    });
    it(`${kind} uses the same column locations in 2D and 3D`,()=>{
      const p=civicLayouts[kind],[x,z]=project(wgs84ToGcj02(p.coords));
      const g=createCivicBuilding(kind,m,x,z);g.updateMatrixWorld(true);
      const plan=civicPlanParts(p).filter(part=>part.kind==='column');
      for(let i=0;i<12;i++) {
        const point=g.getObjectByName(`portico-column-${i}`)!.getWorldPosition(new THREE.Vector3());
        const center=plan[i].ring.reduce((sum,point)=>[sum[0]+point[0]/4,sum[1]+point[1]/4],[0,0]);
        expect(center[0]).toBeCloseTo(point.x,9);expect(center[1]).toBeCloseTo(point.z,9);
      }
    });
  }
  it('keeps the monument at its referenced overall height and provides side reliefs',()=>{
    const g=createMonument(m,0,0);g.updateMatrixWorld(true);
    expect(new THREE.Box3().setFromObject(g).max.y).toBeCloseTo(3.794,3);
    expect(g.children.filter(child=>child.name==='side-relief')).toHaveLength(2);
    const inscription=g.getObjectByName('north-inscription')!;
    expect(inscription.position.z).toBeLessThan(0);
    const stele=g.getObjectByName('granite-stele') as THREE.Mesh;
    expect(stele.geometry.type).toBe('BoxGeometry');
  });
  it('preserves the museum courtyard void and referenced building heights',()=>{
    const museum=createCivicBuilding('museum',m,0,0);museum.rotation.y=0;museum.updateMatrixWorld(true);
    const ray=new THREE.Raycaster(new THREE.Vector3(0,10,-4.5),new THREE.Vector3(0,-1,0));
    expect(ray.intersectObject(museum,true)[0].object.name).toBe('inner-courtyard');
    expect(new THREE.Box3().setFromObject(museum).max.y).toBeCloseTo(4.25,2);
    const hall=createCivicBuilding('great-hall',m,0,0);
    expect(new THREE.Box3().setFromObject(hall).max.y).toBeCloseTo(4.65,2);
  });
});
