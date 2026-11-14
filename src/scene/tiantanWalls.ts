import * as THREE from 'three';
import type { Landmark } from '../data/types';
import { project } from './geo';
import type { CityData } from './geodata';
import { localBuildingRing, localFootprintLayout } from './geodata';
import { tiantanGround, type TempleCourt, type TempleGround } from './tiantanGround';
import { wallRuns } from './wallRuns';
import type { Materials } from './materials';

type Point = [number, number];
export type TiantanWallKind = 'outer' | 'inner' | 'divider' | 'court';

export interface TiantanWallLine {
  id: string;
  kind: TiantanWallKind;
  points: Point[];
}

export interface TiantanWallRun {
  lineId: string;
  kind: TiantanWallKind;
  a: Point;
  b: Point;
}

interface Opening { point:Point; width:number; maxDistance:number }

const wallPlanCache = new WeakMap<CityData, TiantanWallLine[]>();
const wallRunsCache = new WeakMap<CityData, TiantanWallRun[]>();

function nearestOnSegment(point:Point, a:Point, b:Point) {
  const dx=b[0]-a[0], dz=b[1]-a[1], length2=dx*dx+dz*dz;
  const t=length2?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/length2)):0;
  return { t, distance:Math.hypot(point[0]-a[0]-dx*t,point[1]-a[1]-dz*t) };
}

function lineRuns(points:Point[], openings:Opening[]):[Point,Point][] {
  const runs:[Point,Point][]=[];
  for(let edge=0;edge<points.length-1;edge++) {
    const a=points[edge], b=points[edge+1], dx=b[0]-a[0], dz=b[1]-a[1], length=Math.hypot(dx,dz);
    if(length<1e-6)continue;
    const gaps:[number,number][]=[];
    for(const opening of openings) {
      const nearest=nearestOnSegment(opening.point,a,b);
      if(nearest.distance>opening.maxDistance)continue;
      const margin=Math.min(.47,(opening.width/2)/length);
      gaps.push([Math.max(0,nearest.t-margin),Math.min(1,nearest.t+margin)]);
    }
    gaps.sort((left,right)=>left[0]-right[0]);
    const merged:[number,number][]=[];
    for(const gap of gaps) {
      const previous=merged[merged.length-1];
      if(previous&&gap[0]<=previous[1]+1e-6)previous[1]=Math.max(previous[1],gap[1]);
      else merged.push([...gap]);
    }
    const at=(t:number):Point=>[a[0]+dx*t,a[1]+dz*t];
    let cursor=0;
    for(const [start,end] of [...merged,[1,1]]) {
      if(start-cursor>.02)runs.push([at(cursor),at(start)]);
      cursor=Math.max(cursor,end);
    }
  }
  return runs;
}

function gateOpening(data:CityData,site:Landmark,id:number,maxDistance:number):Opening {
  const building=data.buildings.find(item=>item.id===id)!;
  const layout=localFootprintLayout(building,site);
  return { point:[layout.x,layout.z], width:Math.max(.88,Math.min(1.35,layout.width*.58)), maxDistance };
}

/** Current outer park boundary plus the documented rounded-north inner altar ring. */
export function tiantanWallPlan(site:Landmark,data:CityData):TiantanWallLine[] {
  const cached=wallPlanCache.get(data);if(cached)return cached;
  const park=data.context.find(feature=>feature.kind==='park'&&feature.name==='天坛公园');
  if(!park)return [];
  const [ox,oz]=project(site.coords);
  const local=([x,z]:Point):Point=>[x-ox,z-oz];
  const outer=park.coordinates.map(project).map(local);
  const west=localFootprintLayout(data.buildings.find(b=>b.id===43918415)!,site);
  const east=localFootprintLayout(data.buildings.find(b=>b.id===43918405)!,site);
  const north=localFootprintLayout(data.buildings.find(b=>b.id===43918404)!,site);
  const south=localFootprintLayout(data.buildings.find(b=>b.id===43918406)!,site);
  const springZ=(west.z+east.z)/2;
  const westArc:Point[]=Array.from({length:25},(_,i)=>{
    const t=i/24*Math.PI/2;
    return [north.x-(north.x-west.x)*Math.sin(t),springZ-(springZ-north.z)*Math.sqrt(Math.max(0,Math.cos(t)))];
  });
  const eastArc:Point[]=Array.from({length:25},(_,i)=>{
    const t=i/24*Math.PI/2;
    return [north.x+(east.x-north.x)*Math.sin(t),springZ-(springZ-north.z)*Math.sqrt(Math.max(0,Math.cos(t)))];
  });
  const inner:Point[]=[
    [east.x,south.z],[west.x,south.z],[west.x,springZ],...westArc.slice(0,-1).reverse(),
    ...eastArc.slice(1),[east.x,springZ],[east.x,south.z],
  ];
  const ground=tiantanGround(site,data);
  const plan:TiantanWallLine[]=[
    {id:'outer-altar-wall',kind:'outer',points:outer},
    {id:'inner-altar-wall',kind:'inner',points:inner},
    {id:'north-south-divider-wall',kind:'divider',points:[[west.x,31.6],[east.x,31.6]]},
    ...ground.courts.filter(court=>court.walled).map(court=>({id:`court-${court.id}`,kind:'court' as const,points:[...court.ring,court.ring[0]]})),
  ];
  wallPlanCache.set(data,plan);return plan;
}

function openingsForLine(line:TiantanWallLine,data:CityData,site:Landmark,ground:TempleGround):Opening[] {
  if(line.kind==='outer')return [
    gateOpening(data,site,43918417,4.5),gateOpening(data,site,43918403,1.2),
    gateOpening(data,site,1358102358,1.6),gateOpening(data,site,43918406,1.2),
  ];
  if(line.kind==='inner')return [
    gateOpening(data,site,43918404,.35),gateOpening(data,site,43918415,.35),
    gateOpening(data,site,43918405,.35),gateOpening(data,site,43918406,.35),
  ];
  if(line.kind==='divider')return [gateOpening(data,site,43921120,.35)];
  return ground.paths.flatMap(path=>path.points.map(point=>({point,width:path.width+.28,maxDistance:.09})));
}

export function tiantanWallRuns(site:Landmark,data:CityData):TiantanWallRun[] {
  const cached=wallRunsCache.get(data);if(cached)return cached;
  const ground=tiantanGround(site,data);
  const [ox,oz]=project(site.coords);
  const buildings=data.buildings.map(building=>localBuildingRing(building).map(([x,z]):Point=>[x-ox,z-oz]))
    .filter(ring=>ring.some(([x,z])=>Math.abs(x)<120&&z>-100&&z<110));
  const runs=tiantanWallPlan(site,data).flatMap(line=>
    lineRuns(line.points,openingsForLine(line,data,site,ground)).flatMap(([a,b])=>
      (line.kind==='court'?[[a,b] as [Point,Point]]:wallRuns(a,b,buildings))
        .map(run=>({lineId:line.id,kind:line.kind,a:run[0],b:run[1]}))));
  wallRunsCache.set(data,runs);return runs;
}

export function tiantanCourtWallRuns(ground:TempleGround,court:TempleCourt):[Point,Point][] {
  if(!court.walled)return [];
  return lineRuns([...court.ring,court.ring[0]],ground.paths.flatMap(path=>path.points.map(point=>({point,width:path.width+.28,maxDistance:.09}))));
}

export function tiantanWallClearance(point:Point,data:CityData,site:Landmark):number {
  let clearance=Infinity;
  for(const run of tiantanWallRuns(site,data))clearance=Math.min(clearance,nearestOnSegment(point,run.a,run.b).distance);
  return clearance;
}

function gableCap(length:number,width:number,rise:number) {
  const halfLength=length/2, halfWidth=width/2;
  const vertices=new Float32Array([
    -halfLength,0,-halfWidth, halfLength,0,-halfWidth, halfLength,0,halfWidth, -halfLength,0,halfWidth,
    -halfLength,rise,0, halfLength,rise,0,
  ]);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));
  geometry.setIndex([
    0,4,5,0,5,1, 3,2,5,3,5,4, 0,3,4, 1,5,2, 0,1,2,0,2,3,
  ]);
  geometry.computeVertexNormals();return geometry;
}

function taperedWallBody(length:number,height:number,baseWidth:number,topWidth:number) {
  const halfLength=length/2, halfBase=baseWidth/2, halfTop=topWidth/2;
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array([
    -halfLength,0,-halfBase, halfLength,0,-halfBase, halfLength,0,halfBase, -halfLength,0,halfBase,
    -halfLength,height,-halfTop, halfLength,height,-halfTop, halfLength,height,halfTop, -halfLength,height,halfTop,
  ]),3));
  geometry.setIndex([
    0,5,1,0,4,5, 3,6,7,3,2,6, 0,7,4,0,3,7,
    1,6,2,1,5,6, 4,6,5,4,7,6, 0,2,3,0,1,2,
  ]);
  geometry.computeVertexNormals();return geometry;
}

function addWallRun(parent:THREE.Group,run:TiantanWallRun,m:Materials) {
  const dx=run.b[0]-run.a[0],dz=run.b[1]-run.a[1],length=Math.hypot(dx,dz);
  if(length<.02)return;
  const segment=new THREE.Group(),style=run.kind;
  segment.name=`tiantan-wall-segment-${style}`;
  segment.position.set((run.a[0]+run.b[0])/2,0,(run.a[1]+run.b[1])/2);
  segment.rotation.y=-Math.atan2(dz,dx);parent.add(segment);
  const dimensions=style==='outer'
    ? {height:.37,base:.25,top:.13,cap:.055}
    : style==='inner'||style==='divider'
      ? {height:.50,base:.18,top:.105,cap:.06}
      : {height:.42,base:.10,top:.065,cap:.045};
  const body=new THREE.Mesh(taperedWallBody(length,dimensions.height,dimensions.base,dimensions.top),style==='court'?m.wall:m.cityWallBrick);
  body.castShadow=body.receiveShadow=true;segment.add(body);
  const capWidth=dimensions.top+.18;
  if(style==='inner'||style==='divider'||style==='court') {
    const eave=new THREE.Mesh(new THREE.BoxGeometry(length+.035,.035,capWidth),m.green);
    eave.position.y=dimensions.height+.017;eave.castShadow=eave.receiveShadow=true;segment.add(eave);
  }
  const cap=new THREE.Mesh(gableCap(length+.04,capWidth,dimensions.cap),style==='outer'?m.grayRoof:style==='court'?m.green:m.grayRoof);
  cap.position.y=dimensions.height+(style==='inner'||style==='divider'||style==='court'?.034:0);cap.castShadow=cap.receiveShadow=true;segment.add(cap);
  const ridge=new THREE.Mesh(new THREE.BoxGeometry(length+.06,.028,.052),style==='inner'||style==='divider'?m.grayRoof:m.ridge);
  ridge.position.y=dimensions.height+dimensions.cap+(style==='inner'||style==='divider'||style==='court'?.035:0);ridge.castShadow=ridge.receiveShadow=true;segment.add(ridge);
}

/** Traditional tapered brick walls with continuous cap ridges, not modern railings. */
export function createTiantanWalls(site:Landmark,data:CityData,m:Materials) {
  const group=new THREE.Group();group.name='tiantan-altar-walls';
  const runs=tiantanWallRuns(site,data);
  for(const kind of ['outer','inner','divider','court'] as const) {
    const host=new THREE.Group();host.name=`tiantan-${kind}-wall`;group.add(host);
    for(const run of runs.filter(run=>run.kind===kind)) {
      const court=run.lineId.startsWith('court-')?run.lineId.slice(6):undefined;
      if(court)host.userData.courtIds=[...new Set([...(host.userData.courtIds??[]),court])];
      addWallRun(host,run,m);
    }
  }
  return group;
}
