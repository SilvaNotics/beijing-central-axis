import { expect, it } from 'vitest';
import bundled from '../../public/data/buildings.json';
import contextText from '../../public/data/context.geojson?raw';
import { landmarks } from '../data/heritage';
import { forestPoints } from './forest';
import { localBuildingRing, localFootprintLayout, wgs84ToGcj02, type CityData } from './geodata';
import { pointInPolygon, project } from './geo';
import { distanceToRing } from './centralGreenery';
import { tiantanGround } from './tiantanGround';

const site=landmarks.find(s=>s.id==='tiantan')!;
const data:CityData={buildings:bundled.buildings as CityData['buildings'],context:[]};
for(const f of JSON.parse(contextText).features) {
  if(!['park','water'].includes(f.properties.kind))continue;
  const polygons=f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates];
  for(const [ring,...holes] of polygons) data.context.push({kind:f.properties.kind,name:f.properties.name,
    coordinates:ring.map(wgs84ToGcj02),holes:holes.map((r:[number,number][])=>r.map(wgs84ToGcj02))});
}
const ground=tiantanGround(site,data),[ox,oz]=project(site.coords);
it('paves the pictured moat island and connects all three mapped gates to park walks',()=>{
  const court=ground.courts.find(c=>c.id==='fasting-palace')!;
  const hall=localFootprintLayout(data.buildings.find(b=>b.id===43925089)!,site);
  expect(pointInPolygon([hall.x,hall.z],court.ring)).toBe(true);
  for(const [name,id] of [['north',43925061],['east',43925084],['south',43925080]] as const) {
    const gate=localFootprintLayout(data.buildings.find(b=>b.id===id)!,site);
    const link=ground.paths.find(p=>p.id===`fasting-${name}`)!;
    expect(Math.hypot(link.points[0][0]-gate.x,link.points[0][1]-gate.z)).toBeLessThan(.001);
    const end=link.points[1];
    expect(ground.paths.some(p=>p.id!==link.id&&distanceToRing(end,p.points,false)<=p.width/2)).toBe(true);
  }
});
it('keeps every generated Tiantan crown clear of roads, paved courts and mapped roofs',()=>{
  const trees=forestPoints(data).filter(t=>t.region==='tiantan');
  expect(trees.length).toBeGreaterThan(800);
  const buildings=data.buildings.map(localBuildingRing).filter(r=>r.some(([x,z])=>Math.abs(x-ox)<100&&Math.abs(z-oz)<100));
  const conflicts:string[]=[];
  for(const t of trees) {
    const point:[number,number]=[t.x-ox,t.z-oz],clearance=t.radius*1.9+.12;
    for(const path of ground.paths)if(distanceToRing(point,path.points,false)<path.width/2+clearance)conflicts.push(`path ${path.id}`);
    for(const court of ground.courts) {
      if(pointInPolygon(point,court.ring)||distanceToRing(point,court.ring)<clearance)conflicts.push(`court ${court.id}`);
    }
    for(const ring of buildings) {
      if(pointInPolygon([t.x,t.z],ring)||distanceToRing([t.x,t.z],ring)<clearance)conflicts.push('building');
    }
  }
  expect(conflicts).toEqual([]);
});
