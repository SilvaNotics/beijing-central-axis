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
    const xs = rings.map(p => p[0]), zs = rings.map(p => p[1]);
    const l = Math.min(...xs) - .18, r = Math.max(...xs) + .18;
    const n = Math.min(...zs) - .18, s = Math.max(...zs) + .18;
    courts.push({ id, ring: [[l,n],[r,n],[r,s],[l,s]] });
  };
  compound('north-kitchen', [43921134,43921142,43921145,43921146]);
  compound('north-sacrifice', [43921129,43921147]);
  compound('south-kitchen', [43922699,43922700,43922701,43922692]);
  compound('south-sacrifice', [43922676,43922677,43922678,43922679,43922695,43922704,43922706]);
  // Small apron for the mapped pavilion, preserving the surrounding grove.
  compound('double-ring-pavilion', [43921112,43921125]);

  const west = gate(43918415), east = gate(43918405), north = gate(43918404);
  const northEntry = gate(43918417), south = gate(43918406), southwest = gate(43925069), southeast = gate(43925093);
  const prayer = gate(43921139), prayerSouth = gate(43921137), bridgeNorth = gate(43921136), bridgeSouth = gate(43921120);
  const triple = gate(1259304560), moundNorth = gate(43922670), moundEast = gate(43922668), moundSouth = gate(727026439);
  const spineX = triple[0], westLane = west[0] + .8, eastLane = east[0];
  const paths: TemplePath[] = [];
  const add = (id: string, points: Point[], width = .65) => paths.push({ id, points, width });
  add('west-east-avenue', [west, east], 1.15);
  add('west-spine', [[spineX,north[1]],triple,[spineX,southwest[1]]], .85);
  add('north-approach', [northEntry,north,[prayer[0],north[1]+3],gate(43921140)], 1.05);
  add('north-crosswalk', [north,[spineX,north[1]]], .8);
  add('prayer-west-approach', [gate(43921112),[spineX,prayer[1]],[prayer[0]-9,prayer[1]],prayer], .8);
  add('east-entry', [gate(1358102358),[eastLane,prayer[1]+2],[prayer[0]+10,prayer[1]+2]], 1.0);
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
  for (const court of courts.filter(c => c.id !== 'fasting-palace' && c.id !== 'double-ring-pavilion')) {
    const center: Point = [(court.ring[0][0]+court.ring[2][0])/2,court.ring[2][1]];
    const z = court.id.startsWith('north') ? prayer[1]+2 : moundEast[1];
    add(`${court.id}-approach`, [center,[center[0],z]], .6);
  }
  // North kitchen approaches meet the existing long corridor/entry walk.
  add('north-service-crosswalk', [[prayer[0]+10,prayer[1]+2],[eastLane,prayer[1]+2]], .7);
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
