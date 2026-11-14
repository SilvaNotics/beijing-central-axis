import { expect, it } from 'vitest';
import contextText from '../../public/data/context.geojson?raw';
const context=JSON.parse(contextText) as {features:{properties:{kind:string;name:string};geometry:{type:string;coordinates:unknown}}[]};
import buildings from '../../public/data/buildings.json';
import { forestPoints } from './forest';
import { wgs84ToGcj02, type CityData } from './geodata';
import { pointInPolygon, project } from './geo';

const data:CityData={buildings:buildings.buildings as CityData['buildings'],context:[]};
for(const f of context.features) {
  const {kind,name}=f.properties;
  if(kind!=='water'&&kind!=='park')continue;
  const polygons=(f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates]) as [number,number][][][];
  for(const polygon of polygons) {
    const [ring,...holes]=polygon as [number,number][][];
    data.context.push({kind,name,coordinates:ring.map(wgs84ToGcj02),holes:holes.map(r=>r.map(wgs84ToGcj02))});
  }
}

it('keeps every park and formal tree crown off all mapped water, including the palace moat',()=>{
  const trees=forestPoints(data);
  expect(trees.length).toBeGreaterThan(1500);
  expect(trees.filter(t=>t.formal).length).toBeGreaterThan(120);
  const waters=data.context.filter(f=>f.kind==='water').map(f=>{
    const ring=f.coordinates.map(project);
    return {ring,holes:(f.holes??[]).map(r=>r.map(project)),minX:Math.min(...ring.map(p=>p[0])),maxX:Math.max(...ring.map(p=>p[0])),minZ:Math.min(...ring.map(p=>p[1])),maxZ:Math.max(...ring.map(p=>p[1]))};
  });
  // Exact same point-in-water check, skipping polygons whose bounds cannot contain the sample.
  const wet=(p:[number,number])=>waters.some(w=>p[0]>=w.minX&&p[0]<=w.maxX&&p[1]>=w.minZ&&p[1]<=w.maxZ&&pointInPolygon(p,w.ring)&&!w.holes.some(h=>pointInPolygon(p,h)));
  const intrusions:typeof trees=[];
  for(const tree of trees) {
    // The rendered lobed crown fits inside this conservative disk at any yaw.
    const radius=tree.radius*1.9+.12;
    if(wet([tree.x,tree.z])||Array.from({length:40},(_,i)=>i*Math.PI/20).some(a=>wet([tree.x+Math.cos(a)*radius,tree.z+Math.sin(a)*radius])))intrusions.push(tree);
  }
  expect(intrusions).toEqual([]);
});

it('gives temple groves, hill slopes and street rows different planting character',()=>{
  const trees=forestPoints(data),temple=trees.filter(t=>t.region==='tiantan'),hill=trees.filter(t=>t.region==='jingshan'),street=trees.filter(t=>t.formal&&t.region==='street');
  expect(temple.filter(t=>t.species==='cypress').length/temple.length).toBeGreaterThan(.65);
  expect(temple.some(t=>t.species==='ginkgo')).toBe(true);
  expect(hill.filter(t=>t.species==='pine').length/hill.length).toBeGreaterThan(.25);
  expect(new Set(hill.map(t=>t.species)).size).toBeGreaterThan(2);
  expect(street.every(t=>t.species==='pagoda')).toBe(true);
  expect(hill.some(t=>t.y>2)).toBe(true);
});
