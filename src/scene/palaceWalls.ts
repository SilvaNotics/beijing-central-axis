import * as THREE from 'three';
import snapshot from '../data/palace-walls.json';
import type {Landmark} from '../data/types';
import {localBuildingRing,localFootprintLayout,wgs84ToGcj02,type CityData} from './geodata';
import {project} from './geo';
import {localPalaceBoundary,palaceRoofRotation} from './precincts';
import {wallRuns} from './wallRuns';
import {roofGeometry,roofSection} from './roofForms';
import type {Materials} from './materials';

type Point=[number,number];
type Run={id:number;a:Point;b:Point;outer:boolean;contactBuilding?:number;contactOrigin?:Point;contactElbow?:true;interpreted?:true;isolatedNetwork?:true;courtyardFrame?:true;layoutRepair?:string;sourceIds?:number[]};
type Wall=typeof snapshot.walls[number];
const cache=new WeakMap<CityData,WeakMap<Landmark,Run[]>>();
const boxGeometry=new THREE.BoxGeometry(1,1,1);
const bounds=(points:Point[])=>({minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1]))});
const intersects=(a:ReturnType<typeof bounds>,b:ReturnType<typeof bounds>,margin=0)=>a.minX<=b.maxX+margin&&a.maxX>=b.minX-margin&&a.minZ<=b.maxZ+margin&&a.maxZ>=b.minZ-margin;
function distanceToRing(point:Point,ring:Point[]) {
  let distance=Infinity;
  for(let i=0;i<ring.length;i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
    const t=length?Math.max(0,Math.min(1,((point[0]-a[0])*dx+(point[1]-a[1])*dz)/length)):0;
    distance=Math.min(distance,Math.hypot(point[0]-a[0]-t*dx,point[1]-a[1]-t*dz));
  }
  return distance;
}

/** Reference-plan corrections for the Wuying courts and the earlier Yinghua
 * alignment. Shared nodes move together; original WGS84 data stays intact. */
export function palaceWallPoints(wall:Wall,site:Landmark,data:CityData):Point[] {
  const [ox,oz]=project(site.coords);
  const local=(coords:number[]):Point=>{const [x,z]=project(wgs84ToGcj02(coords as Point));return [x-ox,z-oz];};
  const points=wall.coordinates.map(local);
  // User plan and the oblique endpoint feedback distinguish roof outlines
  // from the walls beneath them. Aim these few source ends into the owning
  // building, then let footprint clipping and physical facade contacts stop
  // the rendered wall. Never leave a wall running past the free end of a hall.
  if([42681371,653251437,654664219,1341826248].includes(wall.id)) {
    const angle=palaceRoofRotation(),c=Math.cos(angle),s=Math.sin(angle);
    const toDatum=([x,z]:Point):Point=>[x*c-z*s,x*s+z*c];
    const fromDatum=([u,v]:Point):Point=>[u*c+v*s,-u*s+v*c];
    const center=(id:number):Point|undefined=>{
      const building=data.buildings.find(b=>b.id===id);if(!building)return;
      const p=localFootprintLayout(building,site);return toDatum([p.x,p.z]);
    };
    const p=points.map(toDatum);
    if(wall.id===42681371) {
      const small=center(649255320),long=center(40544224);if(!small||!long)return points;
      const path:Point[]=[small,[long[0],small[1]],[long[0],p[2][1]],[long[0],p.at(-1)![1]],p.at(-1)!];
      return path.map(fromDatum);
    }
    if(wall.id===653251437) {
      const hall=center(40544226);if(!hall)return points;
      p[p.length-2]=[hall[0],p[p.length-2][1]];p[p.length-1]=hall;
      return p.map(fromDatum);
    }
    const hall=center(40544225);if(!hall)return points;
    if(wall.id===654664219)return p.map((point,i)=>fromDatum([i===p.length-1?hall[0]:point[0],hall[1]]));
    // way 1341826248 and the southern cross wall share this T junction.
    p[0][1]=hall[1];return p.map(fromDatum);
  }
  // The supplied plan shows rectangular Wuying service courts. Correct these
  // two crooked returns in the palace datum, preserving the building anchors
  // and transforming the shared node of way 42569633 together with its owner.
  // This is a display interpretation; the WGS84 snapshot remains unchanged.
  if([42569638,42569643,42569633].includes(wall.id)) {
    const angle=palaceRoofRotation(),c=Math.cos(angle),s=Math.sin(angle);
    const toDatum=([x,z]:Point):Point=>[x*c-z*s,x*s+z*c];
    const fromDatum=([x,z]:Point):Point=>[x*c+z*s,-x*s+z*c];
    const corrected=new Map<string,Point>();
    for(const id of [42569638,42569643]) {
      const source=snapshot.walls.find(w=>w.id===id)!,p=source.coordinates.map(coord=>toDatum(local(coord)));
      const fixed=p.map(point=>[...point] as Point);
      if(id===42569638) {
        for(let i=1;i<=11;i++)fixed[i][0]=p[1][0];
        fixed[1][1]=p[0][1];fixed[11][1]=p[12][1];
        fixed[13]=[p[14][0],p[12][1]];
      } else {
        fixed[1]=[p[2][0],p[0][1]];
        for(let i=2;i<p.length;i++)fixed[i][1]=p.at(-1)![1];
      }
      source.coordinates.forEach((coord,i)=>corrected.set(coord.join(','),fromDatum(fixed[i])));
    }
    const aligned=wall.coordinates.map((coord,i)=>corrected.get(coord.join(','))??points[i]);
    if(wall.id===42569643) {
      const building=data.buildings.find(b=>b.id===40542466);if(!building)return aligned;
      const p=aligned.map(toDatum);
      const upper=palaceWallPoints(snapshot.walls.find(w=>w.id===41657480)!,site,data)[3];
      const anchor=toDatum(upper);
      const [ox,oz]=project(site.coords);
      const east=Math.max(...localBuildingRing(building).map(([x,z])=>toDatum([x-ox,z-oz])[0]))+.35;
      // Follow the user's northward arrow outside the Neiwufu roof. The old
      // short west-facing tail is replaced, not extended through the building.
      const center=(id:number):Point=>{const layout=localFootprintLayout(data.buildings.find(b=>b.id===id)!,site);return toDatum([layout.x,layout.z]);};
      // The southern cross wall must meet the ends of this row, not skim its
      // eaves and remain exposed in front of every timber facade. The small
      // western room is set farther north; step only in the gap between rooms.
      const row=(center(40542464)[1]+center(40542465)[1])/2,west=center(650787466)[1];
      const gap=(center(650787466)[0]+center(40542462)[0])/2;
      const path:Point[]=[[east,anchor[1]],[east,p[0][1]],p[1],[p[1][0],row],[gap,row],[gap,west],[p.at(-1)![0],west]];
      return [upper,...path.map(fromDatum)];
    }
    return aligned;
  }
  if(![41657475,42509088,42311505].includes(wall.id))return points;
  const courtyard=data.buildings.find(b=>b.id===156196336);
  if(!courtyard)return points;
  const guide=localBuildingRing(courtyard),a=guide[13],b=guide[14];
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),ux=dx/length,uz=dz/length;
  const anchor=local(snapshot.walls.find(w=>w.id===41657475)!.coordinates[3]);
  const indices=wall.id===41657475?[1,2]:wall.id===42509088?[0,1]:[1];
  const aligned=points.map((p,i):Point=>{
    if(!indices.includes(i))return p;
    const t=(p[0]-anchor[0])*ux+(p[1]-anchor[1])*uz;
    return [anchor[0]+t*ux,anchor[1]+t*uz];
  });
  // Keep the southern building junction in place. A short return joins it to
  // the corrected long side instead of opening a new gap beside the doorway.
  return wall.id===42509088?[points[0],...aligned]:aligned;
}

/** Keep an open mapped way open, and cut only actual intersecting footprints.
 * Clipping at the footprint edge lets the visible wall meet its enclosing buildings. */
export function clippedPalaceWall(a:Point,b:Point,obstacles:Point[][],margin=0) {
  const blockers:Point[][]=[];
  for(const ring of obstacles) {
    blockers.push(ring);
    if(!margin)continue;
    for(let i=0;i<ring.length;i++) {
      const c=ring[i],d=ring[(i+1)%ring.length],dx=d[0]-c[0],dz=d[1]-c[1],length=Math.hypot(dx,dz);if(length<1e-7)continue;
      const ex=dx/length*margin,ez=dz/length*margin,nx=-ez,nz=ex;
      blockers.push([[c[0]-ex+nx,c[1]-ez+nz],[d[0]+ex+nx,d[1]+ez+nz],[d[0]+ex-nx,d[1]+ez-nz],[c[0]-ex-nx,c[1]-ez-nz]]);
    }
  }
  return wallRuns(a,b,blockers).filter(([c,d])=>Math.hypot(c[0]-d[0],c[1]-d[1])>.035);
}

/** Wall ways are a separate OSM layer; building-only downloads omit these. */
export function palaceWallRuns(site:Landmark,data:CityData):Run[] {
  let bySite=cache.get(data);if(!bySite){bySite=new WeakMap();cache.set(data,bySite);}
  const cached=bySite.get(site);if(cached)return cached;
  const [ox,oz]=project(site.coords),boundary=localPalaceBoundary(site),area=bounds(boundary);
  const local=(coords:number[]):Point=>{const [x,z]=project(wgs84ToGcj02(coords as Point));return [x-ox,z-oz];};
  const obstacles=data.buildings.map(building=>{
    const ring=localBuildingRing(building).map(([x,z]):Point=>[x-ox,z-oz]);return {building,ring,box:bounds(ring)};
  }).filter(p=>intersects(p.box,area,.2));
  const exteriorFootprints=obstacles.filter(o=>/城墙/.test(o.building.name??''));
  // This small concave kitchen room has polygon facade relief beyond its map
  // edge. Its own facade already closes that boundary: do not stack a parallel
  // source wall through it. Clearance includes the wall's half-width and trim.
  const reliefFootprints=obstacles.filter(o=>o.building.id===654664225).map(o=>o.ring);
  const clearRelief=(a:Point,b:Point)=>clippedPalaceWall(a,b,reliefFootprints,.065);
  // OSM does not give entrance widths here: 1.4m is an atlas opening parameter.
  const doors=snapshot.entrances.map(entrance=>{
    const [x,z]=local(entrance.coords),r=.07;const ring:Point[]=[[x-r,z-r],[x+r,z-r],[x+r,z+r],[x-r,z+r]];return {ring,box:bounds(ring)};
  });
  const result:Run[]=[];
  for(const wall of snapshot.walls) {
    const points=palaceWallPoints(wall,site,data);
    // No closing edge is invented for these open polylines.
    for(let i=1;i<points.length;i++)for(const [a,b] of wallRuns(points[i-1],points[i],[boundary],true)) {
      const segmentBounds=bounds([a,b]);
      const nearby=obstacles.filter(o=>intersects(segmentBounds,o.box,.07)).map(o=>o.ring);
      const openings=doors.filter(o=>intersects(segmentBounds,o.box)).map(o=>o.ring);
      for(const [c,d] of clippedPalaceWall(a,b,nearby).flatMap(([c,d])=>clearRelief(c,d))) {
        const exposed=wall.barrier==='city_wall'
          ? clippedPalaceWall(c,d,exteriorFootprints.filter(o=>intersects(segmentBounds,o.box,.1)).map(o=>o.ring),.08)
          : [[c,d] as [Point,Point]];
        for(const [start,end] of exposed)for(const [openStart,openEnd] of clippedPalaceWall(start,end,openings,0))
          result.push({id:wall.id,a:openStart,b:openEnd,outer:wall.barrier==='city_wall'});
      }
    }
  }
  // Explicit plan repairs, never nearest-endpoint pairing. Coordinates are
  // display choices in the palace datum (10 m/unit), not surveyed dimensions.
  // Existing source junctions anchor Wuying; roof envelopes bound service courts.
  // USR-PALACE-WALL-PLAN-20261114; rationale and gaps in the research review.
  const angle=palaceRoofRotation(),c=Math.cos(angle),s=Math.sin(angle);
  const fromDatum=([u,v]:Point):Point=>[u*c+v*s,-u*s+v*c];
  const datum=([x,z]:Point):Point=>[x*c-z*s,x*s+z*c];
  const sourcePoints=(id:number)=>palaceWallPoints(snapshot.walls.find(w=>w.id===id)!,site,data).map(datum);
  const wuying=sourcePoints(42569638),north=sourcePoints(42569643),south=sourcePoints(42569633),rowV=north[4][1];
  const kitchenNorth=sourcePoints(653252461).at(-1)!,kitchenSouth=sourcePoints(654664219)[0];
  const repairs:{name:string;sourceIds:number[];paths:Point[][]}[]=[
    {name:'wuying-side-court',sourceIds:[42569638,42569643],paths:[
      [wuying.at(-1)!,[wuying.at(-1)![0],rowV]],
      [[wuying[1][0],rowV],wuying[11]],
    ]},
    {name:'southwest-service-courts',sourceIds:[42569633,42569638,42569643],paths:[
      [north.at(-1)!,[-33.1,north.at(-1)![1]],[-33.1,20.05]],
      [[-33.1,20.75],[-33.1,south[0][1]],south[0]],
    ]},
    {name:'kitchen-west-court',sourceIds:[653252461,654664219,1341826248,42681372],paths:[
      [kitchenNorth,[kitchenNorth[0],kitchenSouth[1]],kitchenSouth],
    ]},
  ];
  for(const repair of repairs)for(const path of repair.paths)for(let i=1;i<path.length;i++) {
    const start=fromDatum(path[i-1]),end=fromDatum(path[i]);
    const box=bounds([start,end]);
    const blockers=obstacles.filter(o=>intersects(box,o.box)).map(o=>o.ring);
    const openings=doors.filter(o=>intersects(box,o.box)).map(o=>o.ring);
    for(const [a,b] of wallRuns(start,end,[boundary],true))for(const [x,y] of clippedPalaceWall(a,b,[...blockers,...openings]).flatMap(([x,y])=>clearRelief(x,y)))
      result.push({id:repair.sourceIds[0],a:x,b:y,outer:false,interpreted:true,courtyardFrame:true,layoutRepair:repair.name,sourceIds:repair.sourceIds});
  }
  bySite.set(site,result);return result;
}

/** A map footprint follows the roof edge. Continue a clipped wall underneath
 * that overhang until it contacts the rendered structure. Never bridge a free
 * source end or an entrance, and never extend past the owning footprint. */
export function palaceWallFacadeContacts(site:Landmark,data:CityData,model:THREE.Group):Run[] {
  const objects=new Map<number,THREE.Object3D>();
  model.updateMatrixWorld(true);
  model.traverse(o=>{if(typeof o.userData.osmId==='number')objects.set(o.userData.osmId,o);});
  const [ox,oz]=project(site.coords);
  const entrances=snapshot.entrances.map(e=>{
    const [x,z]=project(wgs84ToGcj02(e.coords as Point)),r=.07;
    return [[x-ox-r,z-oz-r],[x-ox+r,z-oz-r],[x-ox+r,z-oz+r],[x-ox-r,z-oz+r]] as Point[];
  });
  const candidates=data.buildings.filter(b=>objects.has(b.id)&&b.building!=='wall'&&!/墙/.test(b.name??''))
    .map(b=>{const ring=localBuildingRing(b).map(([x,z]):Point=>[x-ox,z-oz]);return {id:b.id,object:objects.get(b.id)!,ring,box:bounds(ring)};});
  // Cache only the meshes which can touch the wall body. Roof ornament stays
  // above it and must not multiply every facade raycast.
  const meshCache=new Map<THREE.Object3D,THREE.Object3D[]>();
  const contactMeshes=(object:THREE.Object3D)=>{
    const cached=meshCache.get(object);if(cached)return cached;
    const meshes:THREE.Object3D[]=[];
    object.traverse(o=>{if(o instanceof THREE.Mesh){const box=new THREE.Box3().setFromObject(o);if(box.min.y<=.465&&box.max.y>=.12)meshes.push(o);}});
    meshCache.set(object,meshes);return meshes;
  };
  const isColumn=(mesh:THREE.Object3D,root:THREE.Object3D)=>{
    for(let node:THREE.Object3D|null=mesh;node&&node!==root;node=node.parent)
      if(node.name.startsWith('timber-columns-'))return true;
    return false;
  };
  // Verified by the user's east-service-court screenshots. Other building
  // types retain their existing attachment surfaces pending separate review.
  const verandaHouses=new Set([40544224,40544225,40544226,649255320,40544875,40544228,40544234,42681366,42681367,42681368]);
  const columnCache=new Map<THREE.Object3D,THREE.Object3D[]>();
  const sectionCache=new Map<THREE.Object3D,[Point,Point][]>();
  const sections=(object:THREE.Object3D)=>{
    const cached=sectionCache.get(object);if(cached)return cached;
    const lines:[Point,Point][]=[];
    const meshes=contactMeshes(object);
    const columns=verandaHouses.has(object.userData.osmId)?meshes.filter(mesh=>isColumn(mesh,object)):[];
    columnCache.set(object,columns);
    // A veranda is part of the building. Its recessed windows are not a wall
    // attachment plane: use the outside column row, without crossing the porch.
    (columns.length?columns:meshes).forEach(o=>{
      if(!(o instanceof THREE.Mesh))return;
      const box=new THREE.Box3().setFromObject(o);if(box.min.y>.23||box.max.y<.23)return;
      const p=o.geometry.getAttribute('position'),index=o.geometry.index,count=index?.count??p.count;
      for(let i=0;i<count;i+=3) {
        const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index?index.getX(i+j):i+j).applyMatrix4(o.matrixWorld));
        const hits:Point[]=[];
        for(let j=0;j<3;j++) {
          const a=vertices[j],b=vertices[(j+1)%3];
          if((a.y<.23)===(b.y<.23))continue;
          const t=(.23-a.y)/(b.y-a.y);hits.push([a.x+t*(b.x-a.x),a.z+t*(b.z-a.z)]);
        }
        if(hits.length===2)lines.push([hits[0],hits[1]]);
      }
    });sectionCache.set(object,lines);return lines;
  };
  const source=palaceWallRuns(site,data),contacts:Run[]=[];
  const facadeRay=new THREE.Raycaster();facadeRay.far=.025;
  for(const run of source)if(!run.outer)for(const p of [run.a,run.b]) {
    const other=p===run.a?run.b:run.a,wallLength=Math.hypot(p[0]-other[0],p[1]-other[1]);
    const ux=(p[0]-other[0])/wallLength,uz=(p[1]-other[1])/wallLength;
    // Interior junctions are complete; extending each end there creates spurs.
    if(source.some(r=>r!==run&&distanceToRing(p,[r.a,r.b])<.008))continue;
    let best:{point:Point;distance:number;id:number;bend:Point}|undefined;
    for(const c of candidates) {
      if(p[0]<c.box.minX-.75||p[0]>c.box.maxX+.75||p[1]<c.box.minZ-.75||p[1]>c.box.maxZ+.75)continue;
      // A mapped way can stop a few metres short of the roof envelope. Join
      // only when that source edge is close enough to be the intended stop.
      const boundaryDistance=Math.min(...c.ring.map((a,i)=>{
        const b=c.ring[(i+1)%c.ring.length],dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;
        const t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)):0;
        return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);
      }));
      if(boundaryDistance>.75)continue;
      for(const [a,b] of sections(c.object)) {
        const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;
        const t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/l)):0;
        const point:Point=[a[0]+t*dx,a[1]+t*dz];
        const along=(point[0]-p[0])*ux+(point[1]-p[1])*uz;
        const across=(point[0]-p[0])*(-uz)+(point[1]-p[1])*ux;
        // Continue forward beneath the eave, then return at a right angle.
        // A second order handles a footprint whose corner blocks that elbow.
        if(along<-.008||Math.abs(across)>.4)continue;
        const distance=Math.abs(along)+Math.abs(across);
        if(distance>1.5||best&&distance>=best.distance)continue;
        const bends:Point[]=[[p[0]+ux*along,p[1]+uz*along],[p[0]-uz*across,p[1]+ux*across]];
        const pathBounds=bounds([p,point,...bends]);
        const otherBuildings=candidates.filter(other=>other.id!==c.id&&intersects(pathBounds,other.box,.005)).map(other=>other.ring);
        for(const bend of bends) {
          const parts:[Point,Point][]=[[p,bend],[bend,point]];
          const valid=parts.every(([start,end])=>{
            const length=Math.hypot(end[0]-start[0],end[1]-start[1]);
            if(length<.000001)return true;
            const covered=wallRuns(start,end,[c.ring],true).reduce((sum,[a,b])=>sum+Math.hypot(a[0]-b[0],a[1]-b[1]),0);
            if(covered<length-.005)return false;
            const unobstructed=wallRuns(start,end,otherBuildings).reduce((sum,[a,b])=>sum+Math.hypot(a[0]-b[0],a[1]-b[1]),0);
            if(unobstructed<length-.005)return false;
            const clear=wallRuns(start,end,entrances).reduce((sum,[a,b])=>sum+Math.hypot(a[0]-b[0],a[1]-b[1]),0);
            return clear>=length-.001;
          });
          if(!valid)continue;
          // A nearest triangle vertex can lie tangent to the final leg. Require
          // an actual mesh hit at wall-body height before accepting the joint.
          const hasReturn=Math.hypot(point[0]-bend[0],point[1]-bend[1])>.0001;
          const target=hasReturn?point:bend,last=hasReturn?bend:p;
          const lastLength=Math.hypot(target[0]-last[0],target[1]-last[1]);
          // Do not amplify a nearly zero corner vector into an arbitrary ray.
          if(lastLength<.0001)continue;
          const direction=new THREE.Vector3((target[0]-last[0])/lastLength,0,(target[1]-last[1])/lastLength);
          // A projected section endpoint may be tangent to a column. Search
          // forward explicitly; the complete first-hit path below still owns
          // the contact and enforces the 1.5-unit travel limit.
          facadeRay.far=1.5;
          facadeRay.set(new THREE.Vector3(target[0],.23,target[1]).addScaledVector(direction,-.005),direction);
          const hit=facadeRay.intersectObjects(contactMeshes(c.object),false)[0];
          if(!hit)continue;
          // Use the physical hit, then overlap by 1 cm to avoid rounding cracks.
          const inset:Point=[hit.point.x+direction.x*.001,hit.point.z+direction.z*.001];
          const pathLength=Math.hypot(bend[0]-p[0],bend[1]-p[1])+Math.hypot(inset[0]-bend[0],inset[1]-bend[1]);
          if(pathLength>1.5)continue;
          // A valid endpoint alone does not exclude a column or window crossed
          // earlier along the return. Stop at the first surface over the wall
          // body's height, including the first elbow leg.
          let stop=inset,turn=bend,stopped=false;
          for(const [start,end] of [[p,bend],[bend,inset]] as [Point,Point][]) {
            const length=Math.hypot(end[0]-start[0],end[1]-start[1]);if(length<.000001)continue;
            const direction=new THREE.Vector3((end[0]-start[0])/length,0,(end[1]-start[1])/length);
            let first=length+.01;
            for(const height of [.12,.23,.4]) {
              facadeRay.set(new THREE.Vector3(start[0],height,start[1]),direction);facadeRay.far=length+.01;
              const hit=facadeRay.intersectObjects(contactMeshes(c.object),false)[0];if(hit)first=Math.min(first,hit.distance);
            }
            if(first<=length+.001) {
              stop=[start[0]+direction.x*Math.max(0,first-.001),start[1]+direction.z*Math.max(0,first-.001)];
              if(start===p)turn=stop;
              stopped=true;break;
            }
          }
          if(!stopped)continue;
          const lastStart=Math.hypot(stop[0]-turn[0],stop[1]-turn[1])>.000001?turn:p;
          const finalLength=Math.hypot(stop[0]-lastStart[0],stop[1]-lastStart[1]);if(finalLength<.000001)continue;
          const finalDirection=new THREE.Vector3((stop[0]-lastStart[0])/finalLength,0,(stop[1]-lastStart[1])/finalLength);
          facadeRay.set(new THREE.Vector3(stop[0],.23,stop[1]).addScaledVector(finalDirection,-.005),finalDirection);facadeRay.far=.025;
          const finalHit=facadeRay.intersectObjects(contactMeshes(c.object),false)[0];
          if(!finalHit||columnCache.get(c.object)!.length&&!isColumn(finalHit.object,c.object))continue;
          // A ray exactly tangent to a column edge can disappear after the
          // wall transform is reconstructed. Require a small contact face on
          // both sides of the centre instead of accepting that unstable touch.
          const stable=[-.0001,.0001].every(side=>{
            facadeRay.set(new THREE.Vector3(stop[0]-finalDirection.z*side,.23,stop[1]+finalDirection.x*side).addScaledVector(finalDirection,-.005),finalDirection);
            return facadeRay.intersectObjects(contactMeshes(c.object),false).length>0;
          });
          if(!stable)continue;
          // A physical hit must also preserve the source wall's two axes.
          // Reject a displaced/tangent hit rather than emit a diagonal spur.
          if([[p,turn],[turn,stop]].some(([a,b])=>{
            const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
            return length>.000001&&Math.min(Math.abs(dx*ux+dz*uz),Math.abs(dx*uz-dz*ux))>length*.001;
          }))continue;
          best={point:stop,distance:Math.hypot(turn[0]-p[0],turn[1]-p[1])+Math.hypot(stop[0]-turn[0],stop[1]-turn[1]),id:c.id,bend:turn};break;
        }
      }
    }
    if(best&&best.distance>.008&&!contacts.some(c=>Math.hypot(c.a[0]-p[0],c.a[1]-p[1])<.0001)) {
      // Omit a sub-millimetre leg without joining across its corner diagonally.
      const first=Math.hypot(best.bend[0]-p[0],best.bend[1]-p[1]);
      const last=Math.hypot(best.point[0]-best.bend[0],best.point[1]-best.bend[1]);
      const points=first<.0001?[best.bend,best.point]:last<.0001?[p,best.bend]:[p,best.bend,best.point];
      for(let i=1;i<points.length;i++)contacts.push({
        ...run,a:points[i-1],b:points[i],outer:false,contactBuilding:best.id,contactOrigin:p,
        ...(i<points.length-1?{contactElbow:true as const}:{}),
      });
    }
  }
  return [...source,...contacts];
}

export function createPalaceWalls(site:Landmark,data:CityData,m:Materials,model?:THREE.Group) {
  const group=new THREE.Group();group.name='mapped-palace-wall-lines';
  const buildings=new Map<number,THREE.Object3D>();
  model?.traverse(o=>{if(o.userData.osmId)buildings.set(o.userData.osmId,o);});
  const capRay=new THREE.Raycaster();
  for(const run of model?palaceWallFacadeContacts(site,data,model):palaceWallRuns(site,data)) {
    const dx=run.b[0]-run.a[0],dz=run.b[1]-run.a[1],length=Math.hypot(dx,dz),height=run.outer?1:.38;
    const segment=new THREE.Group();segment.userData.osmWallId=run.id;segment.userData.contactBuilding=run.contactBuilding;segment.userData.contactOrigin=run.contactOrigin;segment.userData.contactElbow=Boolean(run.contactElbow);
    segment.userData.layoutRepair=run.layoutRepair;segment.userData.interpretedGap=Boolean(run.interpreted);segment.userData.isolatedNetwork=Boolean(run.isolatedNetwork);segment.userData.sourceWallIds=run.sourceIds;
    segment.position.set((run.a[0]+run.b[0])/2,0,(run.a[1]+run.b[1])/2);segment.rotation.y=-Math.atan2(dz,dx);group.add(segment);
    const block=(mat:THREE.Material,y:number,h:number,depth:number)=>{
      const mesh=new THREE.Mesh(boxGeometry,mat);mesh.position.y=y;mesh.scale.set(length,h,depth);segment.add(mesh);
    };
    block(m.stone,.035,.07,run.outer?.18:.085);
    block(m.wall,height/2+.04,height,run.outer?.16:.065);
    const cap=new THREE.Mesh(roofGeometry(length+.015,run.outer?.21:.12,.045,'gable'),m.grayRoof);cap.position.y=height+.04;segment.add(cap);
    const building=run.contactBuilding?buildings.get(run.contactBuilding):undefined;
    if(building) {
      // Trim the wider, taller cap independently. Moving the whole wall back
      // to clear a window frame leaves a gap at its actual column connection.
      const direction=new THREE.Vector3(dx/length,0,dz/length),half=(length+.015)/2;
      let end=half;
      for(const t of [0,.25,.5,.75,1])for(const side of [-1,0,1]) {
        const section=roofSection(length+.015,.12,.045,t,'gable');
        for(const lift of [0,section.corner]) {
          capRay.set(new THREE.Vector3(run.a[0]-direction.x*.0075-direction.z*side*section.d,cap.position.y+section.y+lift,run.a[1]-direction.z*.0075+direction.x*side*section.d),direction);
          capRay.far=length+.015;
          const hit=capRay.intersectObject(building,true)[0];
          if(hit)end=Math.min(end,-half+hit.distance-.001);
        }
      }
      if(end<half) {
        const positions=cap.geometry.getAttribute('position');
        for(let i=0;i<positions.count;i++)positions.setX(i,Math.min(positions.getX(i),Math.max(-half,end)));
        positions.needsUpdate=true;cap.geometry.computeVertexNormals();
      }
    }
  }
  return group;
}
