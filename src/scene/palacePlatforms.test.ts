import {expect,it} from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import {localBuildingRing,type BuildingFootprint} from './geodata';
import type {Materials} from './materials';
import {palacePlatform} from './palacePlatforms';

const m={marble:new THREE.MeshStandardMaterial(),stone:new THREE.MeshStandardMaterial()} as Materials;
const height=.813;
function hasRail(model:THREE.Group,x:number,z:number) {
  model.updateMatrixWorld(true);
  // Stop above the deck so only the handrail or its posts can be hit.
  const ray=new THREE.Raycaster(new THREE.Vector3(x,height+.3,z),new THREE.Vector3(0,-1,0),0,.2);
  return ray.intersectObject(model,true).length>0;
}

it.each([1,-1] as const)('rails the clipped frontage and returns, keeping the %s stair entrance open',side=>{
  const ring:[number,number][]=[[-5,0],[5,0],[5,3.1],[1,3.1],[1,4.5],[-1,4.5],[-1,3.1],[-5,3.1]];
  const model=palacePlatform(ring.map(([x,z])=>[x,z*side]),height,m,{side,run:1.5});
  for(const x of [-4,-2,2,4])expect(hasRail(model,x,3*side),`frontage ${x}`).toBe(true);
  for(const x of [-5,5])expect(hasRail(model,x,2*side),`return ${x}`).toBe(true);
  expect(hasRail(model,0,3*side),'stair opening').toBe(false);
});

it.each([[638449433,1,1.5],[638467894,-1,1.6]] as const)('restores exposed edges on mapped terrace %s without blocking its three stairs',(id,side,run)=>{
  const raw=localBuildingRing(bundled.buildings.find(b=>b.id===id)! as BuildingFootprint);
  const [ox,oz]=raw[0],ring=raw.map(([x,z]):[number,number]=>[x-ox,z-oz]);
  const far=Math.max(...ring.map(p=>side*p[1])),cut=far-run;
  const model=palacePlatform(ring,height,m,{side,run});
  // Long flanks beside the three central stair tongues must remain protected.
  const xs=ring.map(p=>p[0]),center=(Math.min(...xs)+Math.max(...xs))/2;
  for(const x of [center-2,center+2]) {
    const boundary:number[]=[];
    for(let i=0;i<ring.length;i++) {
      const a=ring[i],b=ring[(i+1)%ring.length];
      if((a[0]<=x&&b[0]>x)||(b[0]<=x&&a[0]>x))
        boundary.push(side*(a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])));
    }
    const z=side*Math.min(cut,Math.max(...boundary));
    expect(hasRail(model,x,z),`exposed frontage at ${x}, ${z}`).toBe(true);
  }
  const crossings:number[]=[];
  for(let i=0;i<ring.length;i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],za=side*a[1],zb=side*b[1],sample=far-run/2;
    if((za<=sample&&zb>sample)||(zb<=sample&&za>sample))crossings.push(a[0]+(b[0]-a[0])*(sample-za)/(zb-za));
  }
  crossings.sort((a,b)=>a-b);expect(crossings).toHaveLength(6);
  for(let i=0;i<crossings.length;i+=2)expect(hasRail(model,(crossings[i]+crossings[i+1])/2,side*cut)).toBe(false);
});

it('preserves closed terraces and the open ends of the shared connecting deck',()=>{
  const ring:[number,number][]=[[-2,-3],[2,-3],[2,3],[-2,3]];
  const closed=palacePlatform(ring,height,m),open=palacePlatform(ring,height,m,undefined,true);
  for(const z of [-3,3]) {
    expect(hasRail(closed,0,z)).toBe(true);
    expect(hasRail(open,0,z)).toBe(false);
  }
  for(const x of [-2,2])expect(hasRail(open,x,0)).toBe(true);
});

it.each([[638449433,1,1.5],[638467894,-1,1.6]] as const)('builds three equal, evenly mirrored stair flights from mapped apron %s',(id,side,run)=>{
  const raw=localBuildingRing(bundled.buildings.find(b=>b.id===id)! as BuildingFootprint);
  const model=palacePlatform(raw,height,m,{side,run});model.updateMatrixWorld(true);
  const flights=model.children.filter(child=>child.name.startsWith('palace-stair-flight-'));
  expect(flights).toHaveLength(3);
  const boxes=flights.map(flight=>new THREE.Box3().setFromObject(flight));
  const spans=boxes.map(box=>box.getSize(new THREE.Vector3()));
  const centers=boxes.map(box=>box.getCenter(new THREE.Vector3()));
  expect(spans[0].x).toBeCloseTo(spans[1].x,6);expect(spans[1].x).toBeCloseTo(spans[2].x,6);
  expect(spans[0].z).toBeCloseTo(spans[1].z,6);expect(spans[1].z).toBeCloseTo(spans[2].z,6);
  expect(spans[0].y).toBeCloseTo(spans[1].y,6);expect(spans[1].y).toBeCloseTo(spans[2].y,6);
  expect(centers[0].x+centers[2].x).toBeCloseTo(2*centers[1].x,6);
});

it.each([[638449433,1,1.5],[638467894,-1,1.6]] as const)('connects every tread to its neighbours and the deck on terrace %s',(id,side,run)=>{
  const raw=localBuildingRing(bundled.buildings.find(b=>b.id===id)! as BuildingFootprint);
  const [ox,oz]=raw[0],ring=raw.map(([x,z]):[number,number]=>[x-ox,z-oz]);
  const far=Math.max(...ring.map(p=>side*p[1])),cut=far-run;
  const model=palacePlatform(ring,height,m,{side,run});model.updateMatrixWorld(true);
  const flights=model.children.filter(child=>child.name.startsWith('palace-stair-flight-'));
  for(const flight of flights) {
    const box=new THREE.Box3().setFromObject(flight),center=box.getCenter(new THREE.Vector3());
    const treads=flight.children.map(child=>new THREE.Box3().setFromObject(child));
    expect(treads[0].getSize(new THREE.Vector3()).z).toBeCloseTo(run/15,6);
    for(let i=1;i<treads.length;i++) {
      const previous=side===1?treads[i-1].min.z:-treads[i-1].max.z;
      const next=side===1?treads[i].max.z:-treads[i].min.z;
      expect(next,`riser ${i} has no horizontal gap or overlap`).toBeCloseTo(previous,6);
    }
    expect(side===1?box.min.z:-box.max.z,'highest tread reaches landing').toBeCloseTo(cut,6);
    for(const fraction of [-.4,0,.4]) {
      const x=center.x+fraction*(box.max.x-box.min.x);
      for(let step=0;step<15;step++) {
        const z=side*(far-(step+.5)*run/15);
        const ray=new THREE.Raycaster(new THREE.Vector3(x,height+1,z),new THREE.Vector3(0,-1,0));
        expect(ray.intersectObject(model,true)[0]?.point.y??0,`tread ${step}`).toBeCloseTo(height*(step+1)/15,5);
      }
      // Walk over the highest tread and onto the platform, across its full width.
      for(const offset of [-.04,-.01,.01,.04,.1]) {
        const ray=new THREE.Raycaster(new THREE.Vector3(x,height+1,side*(cut-offset)),new THREE.Vector3(0,-1,0));
        expect(ray.intersectObject(model,true)[0]?.point.y??0,`landing ${offset}`).toBeCloseTo(height,5);
      }
    }
  }
});
