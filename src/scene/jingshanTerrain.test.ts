import {expect,it} from 'vitest';
import * as THREE from 'three';
import contextText from '../../public/data/context.geojson?raw';
import {landmarks} from '../data/heritage';
import {wgs84ToGcj02,type CityData} from './geodata';
import {pointInPolygon,project} from './geo';
import {createJingshanTerrain,jingshanHeight,jingshanPeaks} from './jingshanTerrain';
import {forestPoints} from './forest';
import type {Materials} from './materials';
const data:CityData={buildings:[],context:[]};
for(const f of JSON.parse(contextText).features) {
  const {kind,name,highway}=f.properties;
  if(kind==='park'&&name==='景山公园')data.context.push({kind,name,coordinates:f.geometry.coordinates[0].map(wgs84ToGcj02)});
  if(kind==='road'&&name.startsWith('景山'))data.context.push({kind,name,coordinates:f.geometry.coordinates.map(wgs84ToGcj02),width:highway==='primary'?32:17});
}
const site=landmarks.find(s=>s.id==='jingshan')!,[ox,oz]=project(site.coords);
const ring=data.context.find(f=>f.kind==='park')!.coordinates.map(project);
const roads=data.context.filter(f=>f.kind==='road').map(f=>({points:f.coordinates.map(project),halfWidth:f.width!/20}));
function segmentDistance([x,z]:[number,number],a:[number,number],b:[number,number]) {
  const dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz,t=length2?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length2)):0;
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}
const palette:Record<string,THREE.MeshBasicMaterial>={};
const materials=new Proxy(palette,{get:(t,k:string)=>t[k]??=new THREE.MeshBasicMaterial()}) as unknown as Materials;
it('keeps every rendered hill and footpath vertex inside the park and clear of surrounding roads',()=>{
  const model=createJingshanTerrain(site,materials,data);
  const intrusions:{mesh:string;point:[number,number];parkMargin:number;roadMargin:number}[]=[];
  for(const mesh of model.children as THREE.Mesh[]) {
    const p=mesh.geometry.getAttribute('position'),index=mesh.geometry.index!;
    expect(index.count).toBeGreaterThan(0);
    for(const i of new Set(Array.from(index.array))) {
      const point:[number,number]=[ox+p.getX(i),oz+p.getZ(i)];
      const parkMargin=Math.min(...ring.map((a,j)=>segmentDistance(point,a,ring[(j+1)%ring.length])));
      let roadMargin=Infinity;
      for(const road of roads)for(let j=1;j<road.points.length;j++)roadMargin=Math.min(roadMargin,segmentDistance(point,road.points[j-1],road.points[j])-road.halfWidth);
      if(!pointInPolygon(point,ring)||parkMargin<=.59||roadMargin<=.39)intrusions.push({mesh:mesh.name,point,parkMargin,roadMargin});
    }
  }
  expect(intrusions).toEqual([]);
  for(const peak of jingshanPeaks(site))expect(jingshanHeight(site,peak.x,peak.z,data)).toBeCloseTo(peak.height,6);
  for(const road of roads)for(const [x,z] of road.points)expect(jingshanHeight(site,x-ox,z-oz,data)).toBe(0);
});
it('keeps Jingshan tree crowns inside its park boundary as well as trunks on the constrained terrain',()=>{
  const trees=forestPoints(data).filter(t=>t.region==='jingshan');
  expect(trees.length).toBeGreaterThan(200);
  for(const tree of trees) {
    const radius=tree.radius*1.9+.12;
    expect(Math.min(...ring.map((a,j)=>segmentDistance([tree.x,tree.z],a,ring[(j+1)%ring.length])))).toBeGreaterThan(radius);
    expect(tree.y).toBeCloseTo(jingshanHeight(site,tree.x-ox,tree.z-oz,data)+.025,6);
  }
});

it('keeps crowns off every new paved court and the full width of connected park walks',async()=>{
  const {jingshanCourts,jingshanWalks}=await import('./jingshanLayout');
  const {distanceToRing}=await import('./centralGreenery');
  const courts=jingshanCourts(site),walks=jingshanWalks(site),conflicts:string[]=[];
  for(const tree of forestPoints(data).filter(t=>t.region==='jingshan')) {
    const point:[number,number]=[tree.x-ox,tree.z-oz],clearance=tree.radius*1.9+.12;
    for(const c of courts)if(pointInPolygon(point,c.ring)||distanceToRing(point,c.ring)<clearance)conflicts.push(c.id);
    for(const w of walks)if(distanceToRing(point,w.points,false)<w.width/2+clearance)conflicts.push(w.id);
  }
  expect(conflicts).toEqual([]);
  for(const c of courts)for(const p of c.ring)expect(jingshanHeight(site,p[0],p[1],data)).toBeCloseTo(0,6);
  // Each walk reaches another walk at an endpoint; none floats alone in the grove.
  for(const w of walks)expect([w.points[0],w.points.at(-1)!].some(p=>walks.some(other=>other!==w&&distanceToRing(p,other.points,false)<other.width/2))).toBe(true);
});
