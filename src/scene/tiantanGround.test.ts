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

const northernGroups = [
  [371497102,371497107], [371497108,371497110,371497111], [371497116,371497118],
  [371497109,371497114,371497121],
  [371497127,43926812,43926813,43926836,43926837,43926867,371497099,43926868],
  [1358113560], [1476164302], [1123769963], [1068859096,1068859097],
];
const westernGroups = [
  [371497105,371497134,371497135,1416953408], [1358113548], [1476164303],
  [727028850], [43929222], [477934729,1226640908], [1226640907],
  [477934732,477934733], [352734832,352734833,352734834,1068859099],
  [352734831], [352734835],
];
it('connects the northern and western building groups to the park paving network',()=>{
  const localRing=(id:number)=>localBuildingRing(data.buildings.find(b=>b.id===id)!).map(([x,z]):[number,number]=>[x-ox,z-oz]);
  // Flood the pavement graph from the main north approach, including court interiors.
  const reachedPaths=new Set(ground.paths.filter(p=>p.id==='north-approach'));
  const reachedCourts=new Set<typeof ground.courts[number]>();
  for(let step=0;step<ground.paths.length+ground.courts.length;step++) {
    for(const c of ground.courts)if([...reachedPaths].some(p=>p.points.some(q=>pointInPolygon(q,c.ring)||distanceToRing(q,c.ring)<=p.width/2)))reachedCourts.add(c);
    for(const p of ground.paths)if([...reachedPaths].some(q=>p.points.some(a=>distanceToRing(a,q.points,false)<(p.width+q.width)/2))||[...reachedCourts].some(c=>p.points.some(q=>pointInPolygon(q,c.ring)||distanceToRing(q,c.ring)<=p.width/2)))reachedPaths.add(p);
  }
  for(const ids of [...northernGroups,...westernGroups]) {
    const court=ground.courts.find(c=>ids.every(id=>localRing(id).every(p=>pointInPolygon(p,c.ring))));
    expect(court,`uncovered service group ${ids.join(',')}`).toBeDefined();
    expect(reachedCourts.has(court!),`disconnected service group ${ids.join(',')}`).toBe(true);
  }
});
it('connects kitchen and sacrifice courts without sending approaches through halls or across the corridor',()=>{
  const corridor=localBuildingRing(data.buildings.find(b=>b.id===31099286)!).map(([x,z]):[number,number]=>[x-ox,z-oz]);
  const solids=data.buildings.filter(b=>[43921129,43921134,43921142,43921145,43921146,43921147].includes(b.id))
    .map(b=>({id:b.id,ring:localBuildingRing(b).map(([x,z]):[number,number]=>[x-ox,z-oz])}));
  for(const name of ['north-kitchen','north-sacrifice']) {
    const approach=ground.paths.filter(p=>p.id===`${name}-approach`);
    expect(approach.length).toBeGreaterThan(0);
    expect(approach.some(p=>p.points.some(q=>pointInPolygon(q,corridor))),'approach should reach the covered passage').toBe(true);
    for(const p of approach) {
      const [a,b]=p.points;
      for(let i=0;i<=40;i++) {
        const q:[number,number]=[a[0]+(b[0]-a[0])*i/40,a[1]+(b[1]-a[1])*i/40];
        expect(solids.some(s=>pointInPolygon(q,s.ring)||distanceToRing(q,s.ring)<p.width/2+.08),`roof collision ${name} at ${q}`).toBe(false);
      }
      const traverses=Array.from({length:39},(_,i)=>pointInPolygon([a[0]+(b[0]-a[0])*(i+1)/40,a[1]+(b[1]-a[1])*(i+1)/40],corridor)).some(Boolean);
      expect(traverses&&!p.points.some(q=>pointInPolygon(q,corridor)),'walk crosses the corridor sideways').toBe(false);
    }
  }
});
it('keeps the full width of northern and western service walks outside mapped building bodies',()=>{
  const solids=[...northernGroups,...westernGroups].flatMap(ids=>ids).map(id=>({id,ring:localBuildingRing(data.buildings.find(b=>b.id===id)!).map(([x,z]):[number,number]=>[x-ox,z-oz])}));
  for(const p of ground.paths.filter(p=>/^(northwest|northeast|north-gate-annex|west-|southwest-)/.test(p.id))) {
    const [a,b]=p.points,steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.1);
    for(let i=0;i<=steps;i++) {
      const q:[number,number]=[a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps];
      expect(solids.filter(s=>pointInPolygon(q,s.ring)||distanceToRing(q,s.ring)<p.width/2+.08).map(s=>s.id),`${p.id} crosses a roof at ${q}`).toEqual([]);
    }
  }
});
