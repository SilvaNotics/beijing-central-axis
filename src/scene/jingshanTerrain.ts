import * as THREE from 'three';
import type { Landmark } from '../data/types';
import { mappedLayout, jingshanPavilions } from './layouts';
import type { Materials } from './materials';
import type {CityData} from './geodata';
import {pointInPolygon,project} from './geo';
import {jingshanPavilionProfile} from './jingshanPavilions';

const cache=new WeakMap<Landmark,ReturnType<typeof readPeaks>>();
function readPeaks(site:Landmark) {
  return jingshanPavilions.map((id,i)=>({...mappedLayout(id,site),height:i===2?4.57:Math.abs(i-2)===1?3.5:2.6})).sort((a,b)=>a.x-b.x);
}
export function jingshanPeaks(site:Landmark) {let peaks=cache.get(site);if(!peaks){peaks=readPeaks(site);cache.set(site,peaks);}return peaks;}
const smooth=(t:number)=>t*t*(3-2*t);
type GroundBoundary={ring:[number,number][];holes:[number,number][][];roads:{points:[number,number][];halfWidth:number}[]};
const boundaries=new WeakMap<CityData,WeakMap<Landmark,GroundBoundary>>();
function groundBoundary(site:Landmark,data?:CityData) {
  if(!data)return;
  let bySite=boundaries.get(data);if(!bySite){bySite=new WeakMap();boundaries.set(data,bySite);}
  const cached=bySite.get(site);if(cached)return cached;
  const park=data.context.find(f=>f.kind==='park'&&f.name==='景山公园');if(!park)return;
  const [ox,oz]=project(site.coords);
  const local=(coords:[number,number]):[number,number]=>{const [x,z]=project(coords);return [x-ox,z-oz];};
  const ring=park.coordinates.map(local),holes=(park.holes??[]).map(r=>r.map(local));
  const minX=Math.min(...ring.map(p=>p[0]))-4,maxX=Math.max(...ring.map(p=>p[0]))+4,minZ=Math.min(...ring.map(p=>p[1]))-4,maxZ=Math.max(...ring.map(p=>p[1]))+4;
  const roads=data.context.filter(f=>f.kind==='road').map(f=>({points:f.coordinates.map(local),halfWidth:(f.width??9)/20}))
    .filter(r=>Math.max(...r.points.map(p=>p[0]))>=minX&&Math.min(...r.points.map(p=>p[0]))<=maxX&&Math.max(...r.points.map(p=>p[1]))>=minZ&&Math.min(...r.points.map(p=>p[1]))<=maxZ);
  const boundary={ring,holes,roads};bySite.set(site,boundary);return boundary;
}
function edgeDistance(x:number,z:number,a:[number,number],b:[number,number]) {
  const dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz,t=length2?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length2)):0;
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}
/** Positive inside the usable park. Setbacks are model clearances, not survey data. */
export function jingshanClearance(site:Landmark,x:number,z:number,data?:CityData) {
  const boundary=groundBoundary(site,data);if(!boundary)return Infinity;
  if(!pointInPolygon([x,z],boundary.ring)||boundary.holes.some(r=>pointInPolygon([x,z],r)))return -1;
  let clearance=Infinity;
  for(const ring of [boundary.ring,...boundary.holes])for(let i=0;i<ring.length;i++)clearance=Math.min(clearance,edgeDistance(x,z,ring[i],ring[(i+1)%ring.length])-.6);
  for(const road of boundary.roads)for(let i=1;i<road.points.length;i++)clearance=Math.min(clearance,edgeDistance(x,z,road.points[i-1],road.points[i])-road.halfWidth-.4);
  return clearance;
}

/** A continuous five-peak ridge. Elevations and paths are atlas interpretations. */
export function jingshanHeight(site:Landmark,x:number,z:number,data?:CityData) {
  const clearance=jingshanClearance(site,x,z,data);if(clearance<=0)return 0;
  const peaks=jingshanPeaks(site),first=peaks[0],last=peaks.at(-1)!;
  let centerZ=first.z,crest=0,along=0;
  if(x<first.x){const t=Math.max(0,1-(first.x-x)/9);crest=first.height*smooth(t);}
  else if(x>last.x){const t=Math.max(0,1-(x-last.x)/9);centerZ=last.z;crest=last.height*smooth(t);}
  else for(let i=1;i<peaks.length;i++)if(x<=peaks[i].x) {
    const a=peaks[i-1],b=peaks[i],t=(x-a.x)/(b.x-a.x),u=smooth(t);
    centerZ=a.z+(b.z-a.z)*u;crest=a.height+(b.height-a.height)*u-.45*Math.sin(Math.PI*t)**2;along=Math.sin(Math.PI*t);break;
  }
  const endDistance=x<first.x?(first.x-x)/9:x>last.x?(x-last.x)/9:0;
  const width=(13.5+(z>centerZ?1.5:0)+.55*Math.sin(x*.36))*Math.sqrt(Math.max(.0001,1-endDistance*endDistance));
  const distance=Math.abs(z-centerZ)/width;
  if(distance>=1||crest<=0)return 0;
  let height=crest*Math.cos(distance*Math.PI/2)**1.65;
  height+=height*.035*along*Math.sin(x*.55+z*.32)*Math.sin(z*.63);
  for(const peak of peaks) {
    const r=Math.hypot(x-peak.x,z-peak.z);
    const terraceRadius=Math.max(1.15,jingshanPavilionProfile(peak.osmId).platformRadius+.08);
    if(r<terraceRadius){height=peak.height;break;}
    if(r<terraceRadius+.85)height=peak.height+(height-peak.height)*smooth((r-terraceRadius)/.85);
  }
  return Math.max(0,height)*smooth(Math.min(1,clearance/2));
}
export function jingshanPaths(site:Landmark):[number,number][][] {
  const peaks=jingshanPeaks(site),middle=peaks.find(p=>p.osmId===26390235)!;
  return [peaks.map(p=>[p.x,p.z]),[[middle.x,middle.z+13],[middle.x-4,middle.z+10],[middle.x+3,middle.z+7],[middle.x-2.7,middle.z+4],[middle.x,middle.z]]];
}
export function createJingshanTerrain(site:Landmark,m:Materials,data?:CityData) {
  const group=new THREE.Group();group.name='景山连续山体';
  const peaks=jingshanPeaks(site),minX=peaks[0].x-9,maxX=peaks.at(-1)!.x+9,minZ=Math.min(...peaks.map(p=>p.z))-14,maxZ=Math.max(...peaks.map(p=>p.z))+16;
  const geometry=new THREE.PlaneGeometry(maxX-minX,maxZ-minZ,Math.ceil((maxX-minX)/.35),Math.ceil((maxZ-minZ)/.35));geometry.rotateX(-Math.PI/2);geometry.translate((minX+maxX)/2,0,(minZ+maxZ)/2);
  const p=geometry.getAttribute('position'),colors:number[]=[],low=new THREE.Color('#3d5445'),high=new THREE.Color('#667451'),color=new THREE.Color();
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),z=p.getZ(i),h=jingshanHeight(site,x,z,data);p.setY(i,h+.005);
    const shade=Math.max(0,Math.min(1,h/6))*Math.max(0,Math.min(1,h/.4));color.copy(low).lerp(high,shade);colors.push(color.r,color.g,color.b);
  }
  // Discard the flat rectangle around the foot. Only the slope remains above
  // the park plan, with a rounded, irregular toe and matching ground colour.
  const old=geometry.index!,indices:number[]=[];
  for(let i=0;i<old.count;i+=3) {
    const a=old.getX(i),b=old.getX(i+1),c=old.getX(i+2);
    if(Math.max(p.getY(a),p.getY(b),p.getY(c))>.025&&[a,b,c].every(i=>jingshanClearance(site,p.getX(i),p.getZ(i),data)>.01))indices.push(a,b,c);
  }
  geometry.setIndex(indices);
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();const hill=new THREE.Mesh(geometry,m.hillEarth);hill.name='jingshan-ground';group.add(hill);
  for(const path of jingshanPaths(site)) {
    const vertices:number[]=[],indices:number[]=[];
    for(let segment=1;segment<path.length;segment++) {
      const a=path[segment-1],b=path[segment],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),steps=Math.ceil(length/.16);
      for(let j=0;j<steps;j++) {
        const quad:number[]=[];
        for(const t of [j/steps,(j+1)/steps])for(const side of [-1,1]) {
          const x=a[0]+dx*t-dz/length*.075*side,z=a[1]+dz*t+dx/length*.075*side;quad.push(x,jingshanHeight(site,x,z,data)+.055,z);
        }
        if([0,3,6,9].some(i=>jingshanClearance(site,quad[i],quad[i+2],data)<=.01))continue;
        const base=vertices.length/3;vertices.push(...quad);
        indices.push(base,base+1,base+2,base+1,base+3,base+2);
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();const mesh=new THREE.Mesh(g,m.stone);mesh.name='jingshan-hill-path';group.add(mesh);
  }
  return group;
}
