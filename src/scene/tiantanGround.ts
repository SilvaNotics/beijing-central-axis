import * as THREE from 'three';
import type { Landmark } from '../data/types';
import type { CityData } from './geodata';
import { localBuildingRing, localFootprintLayout } from './geodata';
import { pointInPolygon, project } from './geo';
import { distanceToRing } from './centralGreenery';
import { wallRuns } from './wallRuns';
import type { Materials } from './materials';

type Point = [number, number];
export interface TemplePath { id: string; points: Point[]; width: number; }
export interface TempleCourt { id: string; ring: Point[]; }
export interface TempleGround { paths: TemplePath[]; courts: TempleCourt[]; }
const cache = new WeakMap<CityData, TempleGround>();

/** Official park guide topology + mapped gate anchors. Widths/bends/paving are
 * navigation-scale interpretations, NOT surveyed pedestrian geometry. */
export function tiantanGround(site: Landmark, data: CityData): TempleGround {
  const cached = cache.get(data); if (cached) return cached;
  const [ox, oz] = project(site.coords);
  const local = ([x, z]: Point): Point => [x - ox, z - oz];
  const gate = (id: number): Point => {
    const building = data.buildings.find(b => b.id === id)!;
    const p = localFootprintLayout(building, site); return [p.x, p.z];
  };
  const park = data.context.find(f => f.kind === 'park' && f.name === '天坛公园');
  if (!park || !data.buildings.some(b => b.id === 43918415)) return { paths: [], courts: [] };
  const boundary = park.coordinates.map(project).map(local);
  const courts: TempleCourt[] = [];
  // The pictured compound is the island inside the mapped Zhaigong moat.
  // Its bank is a reliable outer limit, not evidence that every inch was paved.
  for (const water of data.context.filter(f => f.kind === 'water')) {
    for (const hole of water.holes ?? []) {
      const ring = hole.map(project).map(local);
      if (pointInPolygon(gate(43925089), ring)) courts.push({ id: 'fasting-palace', ring });
    }
  }
  const compound = (id: string, ids: number[]) => {
    const rings = ids.flatMap(id => {
      const building = data.buildings.find(b => b.id === id);
      return building ? localBuildingRing(building).map(local) : [];
    });
    if (!rings.length) return;
    // Align the court with its mapped hall, rather than the atlas axes.
    const anchor = data.buildings.find(b => b.id === ids[0])!;
    const angle = localFootprintLayout(anchor,site).rotation;
    const rotation = angle - Math.round(angle/(Math.PI/2))*(Math.PI/2);
    const c = Math.cos(rotation), s = Math.sin(rotation);
    const us = rings.map(([x,z]) => x*c-z*s), vs = rings.map(([x,z]) => x*s+z*c);
    const l = Math.min(...us)-.45, r = Math.max(...us)+.45;
    const n = Math.min(...vs)-.45, south = Math.max(...vs)+.45;
    const ring: Point[] = [[l,n],[r,n],[r,south],[l,south]].map(([u,v]) => [u*c+v*s,-u*s+v*c]);
    courts.push({ id, ring });
  };
  compound('north-kitchen', [43921134,43921142,43921145,43921146]);
  compound('north-sacrifice', [43921129,43921147]);
  compound('south-kitchen', [43922699,43922700,43922701,43922692]);
  compound('south-sacrifice', [43922676,43922677,43922678,43922679,43922695,43922704,43922706]);
  // Small apron for the mapped pavilion, preserving the surrounding grove.
  compound('double-ring-pavilion', [43921112,43921125]);

  // These northern groups have no verified historic names in the snapshot.
  // Aprons and access walks are model interpretations around mapped buildings.
  const northernGroups: [string,number[]][] = [
    ['northwest-court-1',[371497102,371497107]],
    ['northwest-court-2',[371497108,371497110,371497111]],
    ['northwest-court-3',[371497118,371497116]],
    ['northwest-court-4',[371497114,371497109,371497121]],
    ['northeast-court',[43926836,371497127,43926812,43926813,43926837,43926867,371497099,43926868]],
    ['northwest-office',[1358113560]],
    ['northwest-service',[1068859096,1068859097]],
    ['northwest-annex',[1476164302]],
    ['north-gate-annex',[1123769963]],
  ];
  for(const [id,ids] of northernGroups) compound(id,ids);
  const westernGroups: [string,number[]][] = [
    ['west-entry-court',[371497135,371497105,371497134,1416953408]],
    ['west-roadside',[1358113548]],
    ['west-gate-annex',[1476164303]],
    ['west-garden-pavilion',[727028850]],
    ['west-flower-pavilion',[43929222]],
    ['southwest-court-1',[477934729,1226640908]],
    ['southwest-court-2',[1226640907]],
    ['southwest-court-3',[477934732,477934733]],
    ['southwest-rows',[352734832,352734833,352734834,1068859099]],
    ['southwest-hall',[352734831]],
    ['southwest-annex',[352734835]],
  ];
  for(const [id,ids] of westernGroups) compound(id,ids);
  const courtEdge = (id:string, side:'north'|'south'='south', fraction=.5):Point => {
    const ring=courts.find(c=>c.id===id)!.ring, a=ring[side==='south'?3:0], b=ring[side==='south'?2:1];
    return [a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction];
  };

  const west = gate(43918415), east = gate(43918405), north = gate(43918404);
  const northEntry = gate(43918417), south = gate(43918406), southwest = gate(43925069), southeast = gate(43925093);
  const prayer = gate(43921139), prayerSouth = gate(43921137), bridgeNorth = gate(43921136), bridgeSouth = gate(43921120);
  const triple = gate(1259304560), moundNorth = gate(43922670), moundEast = gate(43922668), moundSouth = gate(727026439);
  const spineX = triple[0], westLane = west[0] + .8, eastLane = east[0];
  const paths: TemplePath[] = [];
  const add = (id: string, points: Point[], width = .65) => paths.push({ id, points, width });
  const outerWest=gate(43918403);
  add('west-entry',[outerWest,west],1.15);
  add('west-east-avenue', [west, east], 1.15);
  add('west-spine', [[spineX,north[1]],triple,[spineX,southwest[1]]], .85);
  const rearHall = localFootprintLayout(data.buildings.find(b=>b.id===43921140)!,site);
  add('north-approach', [northEntry,north,[rearHall.x,north[1]+3],[rearHall.x,rearHall.z-rearHall.depth/2-.6]], 1.05);
  add('north-crosswalk', [north,[spineX,north[1]]], .8);
  add('prayer-west-approach', [gate(43921112),[spineX,prayer[1]],[prayer[0]-9,prayer[1]],prayer], .8);
  const corridor=localBuildingRing(data.buildings.find(b=>b.id===31099286)!).map(local);
  const corridorEntry:Point=[corridor[0][0]+1.4,(corridor[0][1]+corridor[19][1])/2];
  add('east-entry', [gate(1358102358),[eastLane,prayer[1]+2],[corridorEntry[0],prayer[1]+2],corridorEntry], 1.0);
  add('east-spine', [[eastLane,prayer[1]+2],east,southeast], .85);
  add('west-spine-outer', [west,[westLane,triple[1]],southwest], .75);
  add('south-crosswalk', [southwest,[south[0],southwest[1]],southeast], .85);
  add('south-approach', [south,moundSouth], 1.1);
  add('altar-links', [moundNorth,gate(43921123)], .9);
  add('vault-north-link', [gate(43921121),bridgeSouth], .9);
  add('prayer-south-link', [prayerSouth,bridgeNorth], 1.1);
  // The raised bridge is rendered by architecture.ts; this ground footprint
  // also reserves its entire width plus the forest's crown margin.
  add('danbi-underlay', [bridgeNorth,bridgeSouth], 2.94);
  add('west-south-crosswalk', [[westLane,triple[1]],triple,[moundNorth[0]-8,triple[1]],[moundNorth[0]-8,moundNorth[1]],moundNorth], .8);
  add('east-middle-crosswalk', [bridgeSouth,[eastLane,bridgeSouth[1]]], .8);
  add('east-altar-crosswalk', [moundEast,[eastLane,moundEast[1]]], .8);
  // Connect the three mapped Zhaigong gates across the moat at their own axis.
  const fastingNorth = gate(43925061), fastingEast = gate(43925084), fastingSouth = gate(43925080);
  add('fasting-north', [fastingNorth,[fastingNorth[0],west[1]]], .75);
  add('fasting-east', [fastingEast,[spineX,fastingEast[1]]], .8);
  add('fasting-south', [fastingSouth,[fastingSouth[0],triple[1]]], .75);
  for (const id of ['south-kitchen','south-sacrifice']) {
    const entrance=courtEdge(id);
    add(`${id}-approach`,[entrance,[entrance[0],moundEast[1]]],.6);
  }
  // Join the open kitchen court to the corridor elbow. The old south-midpoint
  // line crossed the passage and ignored the opening between the two wings.
  const midpoint=(a:Point,b:Point):Point=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  // Vertex pairs are the two sides of this archived concave corridor's elbows.
  const kitchenElbow=midpoint(corridor[4],corridor[15]);
  const kitchenWest=localFootprintLayout(data.buildings.find(b=>b.id===43921142)!,site);
  const kitchenEast=localFootprintLayout(data.buildings.find(b=>b.id===43921146)!,site);
  const kitchenX=(kitchenWest.x+kitchenWest.depth/2+kitchenEast.x-kitchenEast.depth/2)/2;
  add('north-kitchen-approach',[[kitchenX,kitchenWest.z],[kitchenX,kitchenElbow[1]]],.6);
  const corridorEnd=midpoint(corridor[9],corridor[11]);
  const sacrificeWing=localFootprintLayout(data.buildings.find(b=>b.id===43921147)!,site);
  const sideX=sacrificeWing.x+sacrificeWing.width/2+.65;
  const turnZ=corridorEnd[1]+.55;
  add('north-sacrifice-approach',[[sideX,sacrificeWing.z],[sideX,turnZ],[corridorEnd[0],turnZ]],.6);

  // A front walk serves the small northern courts without passing through any
  // row of roofs; its two branches meet the mapped north-gate approach.
  const northAxisAt = (z:number):Point => [northEntry[0]+(north[0]-northEntry[0])*(z-northEntry[1])/(north[1]-northEntry[1]),z];
  const northwestFront=courtEdge('northwest-court-1')[1]+1;
  const northwestJoin=northAxisAt(northwestFront);
  add('northwest-front',[[Math.min(courtEdge('northwest-annex')[0],courtEdge('northwest-court-1')[0]),northwestFront],northwestJoin],.65);
  for(const id of ['northwest-court-1','northwest-court-2','northwest-court-3','northwest-court-4','north-gate-annex']) {
    const entrance=courtEdge(id,id==='north-gate-annex'?'north':'south');
    add(`${id}-approach`,[entrance,[entrance[0],northwestFront]],.55);
  }
  const northeastEntrance=courtEdge('northeast-court','south',.22), northeastZ=northeastEntrance[1]+1.4;
  const northeastJoin=northAxisAt(northeastZ);
  add('northeast-court-approach',[northeastEntrance,[northeastEntrance[0],northeastZ],northeastJoin],.65);
  const officeEntrance=courtEdge('northwest-office'), officeJoin:Point=[officeEntrance[0],north[1]];
  add('northwest-office-approach',[officeEntrance,officeJoin,[spineX,north[1]]],.6);
  const annexEntrance=courtEdge('northwest-annex','north');
  add('northwest-annex-approach',[annexEntrance,[annexEntrance[0],northwestFront]],.55);
  const serviceEntrance=courtEdge('northwest-service'), serviceZ=serviceEntrance[1]+1;
  add('northwest-service-approach',[serviceEntrance,[serviceEntrance[0],serviceZ],[spineX,serviceZ]],.6);
  const entryAxisAt = (x:number):Point => [x,outerWest[1]+(west[1]-outerWest[1])*(x-outerWest[0])/(west[0]-outerWest[0])];
  const avenueAt = (x:number):Point => [x,west[1]+(east[1]-west[1])*(x-west[0])/(east[0]-west[0])];
  for(const id of ['west-entry-court','west-roadside','west-gate-annex']) {
    const entrance=courtEdge(id,id==='west-entry-court'?'south':'north');
    add(`${id}-approach`,[entrance,entryAxisAt(entrance[0])],.6);
  }
  for(const id of ['west-garden-pavilion','west-flower-pavilion']) {
    const entrance=courtEdge(id);
    add(`${id}-approach`,[entrance,avenueAt(entrance[0])],.6);
  }
  const southwestFront=Math.max(...['southwest-court-1','southwest-court-2','southwest-court-3'].map(id=>courtEdge(id)[1]))+.45;
  // Follow the existing outer lane's actual sloping centerline at the junction.
  const southwestJoin:Point=[west[0]+(westLane-west[0])*(southwestFront-west[1])/(triple[1]-west[1]),southwestFront];
  add('southwest-front',[[courtEdge('southwest-court-1')[0],southwestFront],southwestJoin],.65);
  for(const id of ['southwest-court-1','southwest-court-2','southwest-court-3']) {
    const entrance=courtEdge(id);
    add(`${id}-approach`,[entrance,[entrance[0],southwestFront]],.6);
  }
  for(const id of ['southwest-rows','southwest-hall','southwest-annex']) {
    const entrance=courtEdge(id,'north');
    add(`${id}-approach`,[entrance,[entrance[0],triple[1]]],.6);
  }
  // Clip the schematic centerlines to the real park perimeter; preserve its holes.
  const holes = (park.holes ?? []).map(r => r.map(project).map(local));
  const clipped = paths.flatMap(path => path.points.slice(1).flatMap((b,i) =>
    wallRuns(path.points[i],b,[boundary],true).flatMap(([a,b]) => wallRuns(a,b,holes).map(points => ({ ...path, points })))));
  const result = { paths: clipped, courts }; cache.set(data,result); return result;
}

/** Shared by the forest and tests: full crown clearance from pavement edges. */
export function templePavingClearance(point: Point, ground: TempleGround) {
  return Math.min(...ground.paths.map(path => distanceToRing(point,path.points,false)-path.width/2),
    ...ground.courts.map(court => pointInPolygon(point,court.ring) ? -1 : distanceToRing(point,court.ring)));
}

export function createTiantanGround(site: Landmark, data: CityData, m: Materials) {
  const ground = tiantanGround(site,data), group = new THREE.Group(); group.name = 'tiantan-paving';
  const surface = (ring: Point[], y: number, name: string) => {
    const geometry = new THREE.ShapeGeometry(new THREE.Shape(ring.map(([x,z]) => new THREE.Vector2(x,-z))));
    geometry.rotateX(-Math.PI/2);
    // A consistent world-space slab scale across wide courts and narrow walks.
    const positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
    for(let i=0;i<positions.count;i++) uv.setXY(i,positions.getX(i)/1.6,positions.getZ(i)/1.6);
    const mesh = new THREE.Mesh(geometry,m.stone); mesh.name=name; mesh.position.y=y; mesh.receiveShadow=true; group.add(mesh);
  };
  for(const court of ground.courts) surface(court.ring,.018,`court-${court.id}`);
  for(const path of ground.paths) {
    const [a,b]=path.points, dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(length<.001)continue;
    const nx=-dz/length*path.width/2,nz=dx/length*path.width/2;
    surface([[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]],.012,`path-${path.id}`);
    // Matching round joints prevent cracks at bends, without hundreds of slab meshes.
    for(const p of [a,b])surface(Array.from({length:12},(_,i)=>[p[0]+Math.cos(i*Math.PI/6)*path.width/2,p[1]+Math.sin(i*Math.PI/6)*path.width/2]),.012,`joint-${path.id}`);
  }
  return group;
}
