import * as THREE from 'three';
import type { Landmark } from '../data/types';
import { localBuildingRing, wgs84ToGcj02, type CityData } from './geodata';
import { pointInPolygon, project } from './geo';
import { localPalaceBoundary, palaceRoofRotation } from './precincts';
import { distanceToRing } from './centralGreenery';
import { palaceWaterAreas } from './palaceWater';
import { treeCrown } from './treeGeometry';
import { pumpSync } from './coop';
import { palaceWallRuns } from './palaceWalls';
import type { Materials } from './materials';

type Point = [number, number];
export interface PalaceGardenZone { id: string; name: string; ring: Point[]; beds: Point[][]; paths?: Point[][]; trees: { point: Point; radius: number; height: number }[]; }
const cache = new WeakMap<CityData, Map<string, PalaceGardenZone[]>>();
const courtCache = new WeakMap<CityData, Map<string, PalaceGardenZone[]>>();

/** User reference plan: planting and slab walks in the open court northeast
 * of Wenhua. Anchor to the mapped screen, without altering/connecting it.
 * The envelope, beds and slab sizes are display interpretations, not surveys.
 */
export function* palaceCourtZonesIter(site: Landmark, data: CityData): Generator<void, PalaceGardenZone[], void> {
  const cached=courtCache.get(data)?.get(site.id);if(cached)return cached;
  const walls=palaceWallRuns(site,data),screen=walls.find(w=>w.id===43519305);
  if(!screen)return [];
  const [ox,oz]=project(site.coords),cx=(screen.a[0]+screen.b[0])/2,cz=(screen.a[1]+screen.b[1])/2;
  const angle=palaceRoofRotation(),c=Math.cos(angle),s=Math.sin(angle);
  const at=(x:number,z:number):Point=>[cx+x*c+z*s,cz-x*s+z*c];
  // Step inward with the west service-court return rather than planting
  // across it into the neighboring enclosure.
  const ring=[at(-5.1,-4.4),at(5.1,-4.4),at(5.1,6.6),at(-2.85,6.6),
    at(-2.85,2.15),at(-4.05,2.15),at(-4.05,.95),at(-5.1,.95)];
  const buildings=data.buildings.map(b=>localBuildingRing(b).map(([x,z]):Point=>[x-ox,z-oz]))
    .filter(r=>distanceToRing([cx,cz],r)<14||pointInPolygon([cx,cz],r));
  const water=palaceWaterAreas(site,data).map(a=>a.ring),boundary=localPalaceBoundary(site);
  const nearWalls=walls.filter(w=>Math.min(Math.hypot(w.a[0]-cx,w.a[1]-cz),Math.hypot(w.b[0]-cx,w.b[1]-cz))<20);
  const wallDistance=(p:Point)=>Math.min(...nearWalls.map(w=>distanceToRing(p,[w.a,w.b])));
  const clear=(p:Point,margin:number)=>pointInPolygon(p,ring)&&distanceToRing(p,ring)>margin&&pointInPolygon(p,boundary)&&
    !buildings.some(r=>pointInPolygon(p,r)||distanceToRing(p,r)<margin+.40)&&
    !water.some(r=>pointInPolygon(p,r)||distanceToRing(p,r)<margin+.20)&&wallDistance(p)>margin+.13;
  // Broad cross walks and a central walk with a paved bypass around both
  // ends of the screen. No path is extended through a wall or a building.
  const walk=(x:number,z:number,margin=0)=>Math.abs(x)<.55+margin||
    [-2.65,2.8,5.85].some(v=>Math.abs(z-v)<.38+margin)||
    (Math.abs(x)<1.65+margin&&Math.abs(z)<1.05+margin);
  const beds:Point[][]=[],paths:Point[][]=[],trees:PalaceGardenZone['trees']=[],step=.10;
  for(let z=-4.4;z+step<=6.6+.001;z+=step){
    let start:number|undefined;
    for(let x=-5.1;x<=5.1+.001;x+=step){
      const valid=x+step<=5.1+.001&&z+step/2<5.4&&!walk(x+step/2,z+step/2,.07)&&clear(at(x+step/2,z+step/2),step/Math.SQRT2);
      if(valid&&start===undefined)start=x;
      if(!valid&&start!==undefined){if(x-start>.45)beds.push([at(start,z),at(x,z),at(x,z+step),at(start,z+step)]);start=undefined;}
    }
    yield;
  }
  // Individual slabs expose joints at close range, sharing identical outlines
  // with the 2D plan. A small cell size allows obstacle clipping at walk edges.
  const slab=.20,joint=.012;
  for(let z=-4.4;z+slab<=6.6+.001;z+=slab){
    for(let x=-5.1;x+slab<=5.1+.001;x+=slab){
      const p=at(x+slab/2,z+slab/2);
      if(walk(x+slab/2,z+slab/2)&&clear(p,slab/Math.SQRT2))paths.push([
        at(x+joint,z+joint),at(x+slab-joint,z+joint),at(x+slab-joint,z+slab-joint),at(x+joint,z+slab-joint),
      ]);
    }
    yield;
  }
  for(let z=-3.6;z<6;z+=1.3){
    for(let x=-4.3;x<5;x+=1.4){
      const radius=.22,crown=radius*1.9+.12,p=at(x,z);
      if(!walk(x,z,crown)&&clear(p,crown))trees.push({point:p,radius,height:1.15+(trees.length%3)*.12});
    }
    yield;
  }
  const zones=[{id:'wenhua-northeast-court',name:'文华殿东北院落绿地',ring,beds,paths,trees}];
  const bySite=courtCache.get(data)??new Map();bySite.set(site.id,zones);courtCache.set(data,bySite);return zones;
}

export function palaceCourtZones(site: Landmark, data: CityData): PalaceGardenZone[] {
  return pumpSync(palaceCourtZonesIter(site, data));
}

/** PAL-GARDEN-* gives location, planting character and overall dimensions.
 * These are conservative display envelopes, NOT mapped garden boundaries or
 * grass surveys. Beds retain walks and a roof margin; tree crowns stay inside.
 */
export function* palaceGardenZonesIter(site: Landmark, data: CityData): Generator<void, PalaceGardenZone[], void> {
  const cached = cache.get(data)?.get(site.id); if (cached) return cached;
  const [ox, oz] = project(site.coords), rotation = palaceRoofRotation(), c = Math.cos(rotation), s = Math.sin(rotation);
  const local = (p: Point): Point => { const [x,z] = project(wgs84ToGcj02(p)); return [x-ox,z-oz]; };
  const boundary = localPalaceBoundary(site), water = palaceWaterAreas(site,data).map(a=>a.ring);
  const buildings = data.buildings.map(b=>localBuildingRing(b).map(([x,z]):Point=>[x-ox,z-oz])).filter(r=>r.some(p=>pointInPolygon(p,boundary)));
  const definitions: [string,string,Point,number,number][] = [
    ['imperial','御花园',[116.39060,39.92016],14,8],
    ['cining','慈宁宫花园',[116.38775,39.91643],5,13],
    ['jianfu','建福宫花园',[116.38798,39.92016],4.4,7.6],
    ['ningshou','宁寿宫花园',[116.39358,39.91994],4,16],
  ];
  const zones: PalaceGardenZone[] = [];
  for (const [id,name,center,width,depth] of definitions) {
    const [cx,cz] = local(center);
    const at = (x:number,z:number):Point => [cx+x*c+z*s,cz-x*s+z*c];
    const ring = [at(-width/2,-depth/2),at(width/2,-depth/2),at(width/2,depth/2),at(-width/2,depth/2)];
    const nearby = buildings.filter(r=>r.some(p=>pointInPolygon(p,ring))||ring.some(p=>pointInPolygon(p,r))||distanceToRing([cx,cz],r)<Math.hypot(width,depth));
    const clear = (p:Point,margin:number) => pointInPolygon(p,boundary)&&pointInPolygon(p,ring)&&distanceToRing(p,ring)>margin&&
      !nearby.some(r=>pointInPolygon(p,r)||distanceToRing(p,r)<margin+.40)&&!water.some(r=>pointInPolygon(p,r)||distanceToRing(p,r)<margin+.15);
    // Preserve a central walk, cross walks and the existing individual buildings.
    const walk = (x:number,z:number,margin:number) => (id==='imperial'||id==='cining') && (Math.abs(x)<.32+margin ||
      Math.abs(z-depth*.27)<.24+margin || Math.abs(z+depth*.27)<.24+margin);
    const beds:Point[][]=[], trees:PalaceGardenZone['trees']=[], step=.12;
    for(let z=-depth/2;z+step<=depth/2+.001;z+=step) {
      let start:number|undefined;
      for(let x=-width/2;x<=width/2+.001;x+=step) {
        const valid=x+step<=width/2+.001&&!walk(x+step/2,z+step/2,step/2)&&clear(at(x+step/2,z+step/2),step/Math.SQRT2);
        if(valid&&start===undefined)start=x;
        if(!valid&&start!==undefined){beds.push([at(start,z),at(x,z),at(x,z+step),at(start,z+step)]);start=undefined;}
      }
      yield;
    }
    // Search the actual free pockets instead of requiring fixed tree columns
    // to fit narrow courtyards. Compact crowns still obey their full envelope.
    for(let z=-depth/2+.65;z<depth/2;z+=.20) {
      for(let x=-width/2+.65;x<width/2;x+=.20) {
        const p=at(x,z),radius=id==='imperial'?.26:id==='cining'?.18:.12, crown=radius*1.9+.12;
        if(!walk(x,z,crown)&&clear(p,crown)&&!trees.some(t=>Math.hypot(t.point[0]-p[0],t.point[1]-p[1])<1.15))
          trees.push({point:p,radius,height:1.05+(trees.length%4)*.08});
      }
      yield;
    }
    zones.push({id,name,ring,beds,trees});
  }
  const bySite=cache.get(data)??new Map(); bySite.set(site.id,zones); cache.set(data,bySite); return zones;
}

export function palaceGardenZones(site: Landmark, data: CityData): PalaceGardenZone[] {
  return pumpSync(palaceGardenZonesIter(site, data));
}

export function* palaceLandscapeIter(site:Landmark,data:CityData,m:Materials): Generator<void,THREE.Group,void> {
  const group=new THREE.Group();group.name='palace-gardens';
  const crown=treeCrown('cypress');
  const colors=crown.getAttribute('color'),tint=new THREE.Color('#4d7043');
  for(let i=0;i<colors.count;i++)colors.setXYZ(i,colors.getX(i)*tint.r,colors.getY(i)*tint.g,colors.getZ(i)*tint.b);
  const trunk=new THREE.CylinderGeometry(.035,.065,1,8);
  let planted=0;
  const gardenZones=yield* palaceGardenZonesIter(site,data);
  const courtZones=yield* palaceCourtZonesIter(site,data);
  const zones=[...gardenZones,...courtZones];
  for(const zone of zones) {
    const garden=new THREE.Group();garden.name=zone.name;garden.userData.gardenId=zone.id;group.add(garden);
    const shape=(ring:Point[])=>new THREE.Shape(ring.map(([x,z])=>new THREE.Vector2(x,-z)));
    const geometry=new THREE.ShapeGeometry(zone.beds.map(shape));geometry.rotateX(-Math.PI/2);
    const ground=new THREE.Mesh(geometry,m.park);ground.position.y=.185;ground.name='garden-planting-beds';garden.add(ground);
    if(zone.paths?.length){
      const paving=new THREE.ShapeGeometry(zone.paths.map(shape));paving.rotateX(-Math.PI/2);
      const slabs=new THREE.Mesh(paving,m.stone);slabs.position.y=.19;slabs.name='court-stone-slabs';garden.add(slabs);
    }
    for(const tree of zone.trees) {
      const [x,z]=tree.point;
      const stem=new THREE.Mesh(trunk,m.trunk);stem.position.set(x,.185+tree.height*.30,z);stem.scale.y=tree.height*.60;garden.add(stem);
      const leaf=new THREE.Mesh(crown,m.leaf);leaf.position.set(x,.185+tree.height*.75,z);leaf.scale.set(tree.radius*1.2,tree.height*.73,tree.radius*1.2);garden.add(leaf);
      if(++planted%24===0) yield;
    }
    yield;
  }
  return group;
}

export function createPalaceLandscape(site:Landmark,data:CityData,m:Materials) {
  return pumpSync(palaceLandscapeIter(site,data,m));
}
