import { expect, it } from 'vitest';
import buildings from '../../public/data/buildings.json';
import contextText from '../../public/data/context.geojson?raw';
import { localBuildingRing, wgs84ToGcj02, type CityData } from './geodata';
import { pointInPolygon, project } from './geo';
import { forestPoints } from './forest';
import { squareGround } from './squareGround';
import { centralPlantingZones, squarePlantingBeds } from './centralGreenery';

const features=JSON.parse(contextText).features;
const data:CityData={buildings:buildings.buildings as CityData['buildings'],context:[]};
for(const f of features) {
  const polygons=f.geometry.type==='LineString'?[[f.geometry.coordinates]]:f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates];
  for(const [ring,...holes] of polygons)data.context.push({kind:f.properties.kind,name:f.properties.name,coordinates:ring.map(wgs84ToGcj02),holes:holes.map((r:[number,number][])=>r.map(wgs84ToGcj02))});
}

it('replaces the square perimeter trees with low beds inside the north plaza',()=>{
  const ground=squareGround(data),beds=squarePlantingBeds(data);
  expect(beds).toHaveLength(2);
  for(const bed of beds)expect(bed.every(p=>ground.contains(p))).toBe(true);
  expect(forestPoints(data).filter(t=>t.formal&&t.region==='street'&&t.z>ground.north)).toEqual([]);
});

it('keeps altar groves outside the ritual courts and central passage',()=>{
  const zones=centralPlantingZones(data),trees=forestPoints(data);
  for(const zone of zones.filter(z=>z.region!=='duanmen')) {
    const grove=trees.filter(t=>t.region===zone.region);
    expect(grove.length).toBeGreaterThan(30);
    expect(grove.every(t=>zone.contains([t.x,t.z],t.radius*1.9+.12))).toBe(true);
    expect(new Set(grove.map(t=>t.species))).toEqual(new Set(['cypress']));
  }
  const duanmen=trees.filter(t=>t.region==='duanmen');
  expect(duanmen.length).toBeGreaterThan(0);
  const gate=localBuildingRing(data.buildings.find(b=>b.id===25097188)!);
  const axis=gate.reduce((sum,p)=>sum+p[0],0)/gate.length;
  expect(duanmen.every(t=>Math.abs(t.x-axis)>2.5)).toBe(true);
  const left=Math.min(...gate.map(p=>p[0])),right=Math.max(...gate.map(p=>p[0]));
  expect(trees.filter(t=>t.region==='shejitan'||t.region==='taimiao').every(t=>
    t.x+t.radius*1.9+.12<left-1.5||t.x-t.radius*1.9-.12>right+1.5)).toBe(true);
});

it('keeps the new tree crowns clear of mapped buildings',()=>{
  const trees=forestPoints(data).filter(t=>['shejitan','taimiao','duanmen'].includes(t.region));
  const rings=data.buildings.map(localBuildingRing);
  for(const t of trees) {
    const radius=t.radius*1.9+.12;
    const crown=Array.from({length:16},(_,i):[number,number]=>[t.x+Math.cos(i*Math.PI/8)*radius,t.z+Math.sin(i*Math.PI/8)*radius]);
    expect(rings.some(r=>pointInPolygon([t.x,t.z],r)||crown.some(p=>pointInPolygon(p,r)))).toBe(false);
  }
});
