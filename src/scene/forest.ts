import * as THREE from 'three';
import type { CityData } from './geodata';
import { localBuildingRing } from './geodata';
import { project, pointInPolygon } from './geo';
import { landmarks } from '../data/heritage';
import { mappedLayout } from './layouts';
import { jingshanHeight, jingshanPeaks, jingshanPaths, jingshanClearance } from './jingshanTerrain';
import { jingshanBuildingBounds } from './jingshanLayout';
import { treeCrown, treeBranches, type TreeSpecies } from './treeGeometry';
import { moundCenter } from './templeLayout';
import { localPalaceBoundary } from './precincts';
import type { Materials } from './materials';
import { centralPlantingZones, createSquarePlanting, distanceToRing } from './centralGreenery';

export interface ForestPoint { x:number; z:number; y:number; height:number; radius:number; shade:number; species:TreeSpecies; region:string; formal?:boolean; }
const cache=new WeakMap<CityData,ForestPoint[]>();
export function forestPoints(data:CityData):ForestPoint[] {
  const cached=cache.get(data);if(cached)return cached;
  let seed=1939;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const result:ForestPoint[]=[];
  const waters=data.context.filter(f=>f.kind==='water').map(f=>{
    const ring=f.coordinates.map(project),holes=(f.holes??[]).map(h=>h.map(project));
    return {ring,holes,minX:Math.min(...ring.map(p=>p[0])),maxX:Math.max(...ring.map(p=>p[0])),minZ:Math.min(...ring.map(p=>p[1])),maxZ:Math.max(...ring.map(p=>p[1]))};
  });
  const nearEdge=(x:number,z:number,radius:number,ring:[number,number][])=>ring.some((a,i)=>{
    const b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length2=dx*dx+dz*dz;
    const t=length2?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length2)):0;
    return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t)<=radius;
  });
  const dryCrown=(x:number,z:number,radius:number)=>{
    // Includes the widest lobes, non-uniform crown scale and arbitrary yaw.
    const clearance=radius*1.9+.12;
    return !waters.some(w=>{
      if(x+clearance<w.minX||x-clearance>w.maxX||z+clearance<w.minZ||z-clearance>w.maxZ)return false;
      if(pointInPolygon([x,z],w.ring)&&!w.holes.some(h=>pointInPolygon([x,z],h)))return true;
      return [w.ring,...w.holes].some(r=>nearEdge(x,z,clearance,r));
    });
  };
  const plantedRow = (worldX:number,worldZ:number,index:number,outward?:[number,number],region='street',species:TreeSpecies='pagoda') => {
    const radius=.40+(index%4)*.035;
    // Palace rows seek the actual outer bank, rather than assuming a moat width.
    for(let step=0;step<=(outward?28:0);step++) {
      const x=worldX+(outward?.[0]??0)*step*.5,z=worldZ+(outward?.[1]??0)*step*.5;
      if(!dryCrown(x,z,radius))continue;
      result.push({x,z,y:0,height:.92+(index%5)*.07,radius,shade:(index%7)/7,species,region,formal:true});return;
    }
  };
  const buildingRings=data.buildings.map(localBuildingRing);
  const buildingBounds=buildingRings.map(r=>({minX:Math.min(...r.map(p=>p[0]))-.65,maxX:Math.max(...r.map(p=>p[0]))+.65,minZ:Math.min(...r.map(p=>p[1]))-.65,maxZ:Math.max(...r.map(p=>p[1]))+.65}));
  for(const [name,siteId,count] of [['景山公园','jingshan',320],['天坛公园','tiantan',1500]] as const) {
    const park=data.context.find(f=>f.kind==='park'&&f.name===name);if(!park)continue;
    const ring=park.coordinates.map(project), holes=(park.holes??[]).map(r=>r.map(project));
    const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
    const buildings=buildingBounds.filter(b=>b.maxX>=minX&&b.minX<=maxX&&b.maxZ>=minZ&&b.minZ<=maxZ);
    const site=landmarks.find(s=>s.id===siteId)!,[originX,originZ]=project(site.coords);
    const authoredBounds=siteId==='jingshan'?jingshanBuildingBounds(site):[];
    const prayer=mappedLayout(43921139,landmarks.find(s=>s.id==='tiantan')!),vault=mappedLayout(43921121,landmarks.find(s=>s.id==='tiantan')!);
    const [moundX,moundZ]=moundCenter(landmarks.find(s=>s.id==='tiantan')!);
    const peaks=jingshanPeaks(site);
    let accepted=0;
    for(let attempt=0;attempt<count*12&&accepted<count;attempt++) {
      const x=minX+random()*(maxX-minX),z=minZ+random()*(maxZ-minZ),lx=x-originX,lz=z-originZ;
      if(!pointInPolygon([x,z],ring)||holes.some(h=>pointInPolygon([x,z],h))||buildings.some(b=>x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ))continue;
      if(siteId==='tiantan'&&((Math.abs(lx-moundX)<8.9&&Math.abs(lz-moundZ)<8.9)||( Math.abs(lx-prayer.x)<13&&Math.abs(lz-prayer.z)<15)||(Math.abs(lx-vault.x)<10&&lz>vault.z-7&&lz<vault.z+20)||(Math.abs(lx-prayer.x)<3.3&&lz>prayer.z&&lz<vault.z)))continue;
      if(siteId==='jingshan'&&peaks.some(p=>Math.hypot(lx-p.x,lz-p.z)<2.3))continue;
      const y=siteId==='jingshan'?jingshanHeight(site,lx,lz,data)+.025:0,shade=random();
      // Planting character follows documented zones, not a citywide random mix.
      const northGrove=siteId==='tiantan'&&lz<prayer.z-15;
      const species:TreeSpecies=siteId==='tiantan'?(northGrove?(shade<.65?'ginkgo':'cypress'):(shade<.86?'cypress':'pine')):
        y>1?(shade<.58?'pine':shade<.88?'cypress':'pagoda'):(shade<.56?'cypress':shade<.80?'pagoda':'pine');
      const height=species==='cypress'?1.45+random()*.9:species==='pine'?1.1+random()*.7:1.3+random()*.75;
      const radius=species==='cypress'?.68+random()*.30:species==='pine'?.55+random()*.3:.52+random()*.35;
      const tree:ForestPoint={x,z,y,height,radius,shade,species,region:siteId};
      if(siteId==='jingshan') {
        const clearance=radius*1.9+.12;
        const overlaps=(px:number,pz:number,b:typeof buildingBounds[number])=>Math.hypot(Math.max(b.minX-px,0,px-b.maxX),Math.max(b.minZ-pz,0,pz-b.maxZ))<clearance;
        if(authoredBounds.some(b=>overlaps(lx,lz,b))||buildings.some(b=>overlaps(x,z,b)))continue;
      }
      if(siteId==='jingshan'&&jingshanClearance(site,lx,lz,data)<radius*1.9+.12)continue;
      if(siteId==='jingshan'&&jingshanPaths(site).some(path=>path.some((a,i)=>{
        if(!i)return false;const b=path[i-1],dx=b[0]-a[0],dz=b[1]-a[1],l2=dx*dx+dz*dz,t=Math.max(0,Math.min(1,((lx-a[0])*dx+(lz-a[1])*dz)/l2));return Math.hypot(lx-a[0]-dx*t,lz-a[1]-dz*t)<tree.radius*.8+.16;
      })))continue;
      if(!dryCrown(x,z,tree.radius))continue;
      result.push(tree);accepted++;
    }
  }
  let rowIndex=0;
  const palace=landmarks.find(site=>site.id==='forbidden-city')!, [palaceX,palaceZ]=project(palace.coords);
  const boundary=localPalaceBoundary(palace);
  // Trees follow the same transformed wall boundary, outside the water channel.
  for(let edge=0;edge<4;edge++) {
    const a=boundary[edge],b=boundary[(edge+1)%4],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    // South-bank planting belongs to the two gardens and Duanmen forecourt,
    // not an uninterrupted moat row crossing the palace entrance.
    if(edge===2)continue;
    for(let along=5;along<length-5;along+=4.8) plantedRow(palaceX+a[0]+dx*along/length+dz/length*5.4,palaceZ+a[1]+dz*along/length-dx/length*5.4,rowIndex++,[dz/length,-dx/length]);
  }
  const roads=data.context.filter(f=>f.kind==='road').map(f=>({ring:f.coordinates.map(project),halfWidth:(f.width??9)/20}));
  for(const zone of centralPlantingZones(data)) {
    const xs=zone.ring.map(p=>p[0]),zs=zone.ring.map(p=>p[1]);
    const left=Math.min(...xs),right=Math.max(...xs),north=Math.min(...zs),south=Math.max(...zs);
    // Restrict expensive polygon distances to this small precinct. The margin
    // includes the largest crown, so buildings just outside it still exclude trees.
    const buildings=buildingRings.filter((_,i)=>{
      const b=buildingBounds[i];return b.maxX>=left-2&&b.minX<=right+2&&b.maxZ>=north-2&&b.minZ<=south+2;
    });
    let row=0;
    for(let z=Math.min(...zs)+.8;z<Math.max(...zs);z+=1.65,row++) {
      for(let x=Math.min(...xs)+.8+(row%2)*.8;x<Math.max(...xs);x+=1.65) {
        const px=x+(random()-.5)*.22,pz=z+(random()-.5)*.22;
        const radius=zone.region==='duanmen'?.38+random()*.08:.43+random()*.13,clearance=radius*1.9+.12;
        const p:[number,number]=[px,pz];
        if(!zone.contains(p,clearance)||!dryCrown(px,pz,radius))continue;
        if(buildings.some(r=>pointInPolygon(p,r)||distanceToRing(p,r)<clearance+.2))continue;
        if(roads.some(r=>distanceToRing(p,r.ring,false)<r.halfWidth+clearance+.2))continue;
        result.push({x:px,z:pz,y:0,height:1.05+random()*.55,radius,shade:random(),
          species:zone.region==='duanmen'?'pagoda':'cypress',region:zone.region,formal:true});
      }
    }
  }
  cache.set(data,result);return result;
}


/** Per-species crowns and shared branch/trunk instances keep draw count bounded. */
export function createForest(data:CityData,m:Materials) {
  const points=forestPoints(data).filter((tree,i)=>tree.formal||tree.region==='jingshan'||i%2===0),group=new THREE.Group();group.name='park-forest';group.add(createSquarePlanting(data));
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.045,.085,1,10),m.trunk,points.length);
  const branches=new THREE.InstancedMesh(treeBranches(),m.trunk,points.length);
  const transform=new THREE.Object3D(),color=new THREE.Color();
  const crownMeshes=new Map<TreeSpecies,{mesh:THREE.InstancedMesh;index:number}>();
  for(const species of ['cypress','pine','pagoda','ginkgo'] as const) {
    const mesh=new THREE.InstancedMesh(treeCrown(species),m.leaf,points.filter(t=>t.species===species).length);mesh.name=`tree-crown-${species}`;crownMeshes.set(species,{mesh,index:0});group.add(mesh);
  }
  points.forEach((tree,i)=>{
    transform.position.set(tree.x,tree.y+tree.height*.72,tree.z);
    transform.scale.set(tree.radius*1.2,tree.height*(tree.species==='cypress'?.73:.53),tree.radius*1.2);
    transform.rotation.set((tree.shade-.5)*.055,tree.shade*Math.PI*2,(tree.shade-.4)*.045);transform.updateMatrix();
    const crown=crownMeshes.get(tree.species)!;crown.mesh.setMatrixAt(crown.index,transform.matrix);
    const shades=tree.species==='cypress'?['#4e6550','#5c7054','#6b7b59']:tree.species==='pine'?['#607558','#718361','#81916c']:tree.species==='ginkgo'?['#a29b63','#b3a66c','#bdaf73']:['#748464','#87936d','#a09c71'];
    color.set(shades[Math.min(2,Math.floor(tree.shade*3))]);crown.mesh.setColorAt(crown.index++,color);branches.setMatrixAt(i,transform.matrix);
    transform.rotation.set(0,tree.shade*Math.PI,0);transform.position.y=tree.y+tree.height*.30;transform.scale.set(.85+tree.shade*.35,tree.height*.60,.85+tree.shade*.35);transform.updateMatrix();trunks.setMatrixAt(i,transform.matrix);
  });
  group.add(branches,trunks);
  for(const mesh of [...[...crownMeshes.values()].map(v=>v.mesh),branches,trunks]) {
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();
  }
  return group;
}
