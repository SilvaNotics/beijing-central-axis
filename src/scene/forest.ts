import * as THREE from 'three';
import type { CityData } from './geodata';
import { localBuildingRing } from './geodata';
import { project, pointInPolygon } from './geo';
import { landmarks } from '../data/heritage';
import { mappedLayout, jingshanPavilions } from './layouts';
import type { Materials } from './materials';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface ForestPoint { x:number; z:number; y:number; height:number; radius:number; shade:number; formal?:boolean; }
const cache=new WeakMap<CityData,ForestPoint[]>();
export function forestPoints(data:CityData):ForestPoint[] {
  const cached=cache.get(data);if(cached)return cached;
  let seed=1939;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const result:ForestPoint[]=[];
  const plantedRow = (worldX:number, worldZ:number, index:number) => result.push({
    x:worldX,z:worldZ,y:0,height:.92+(index%5)*.07,radius:.40+(index%4)*.035,shade:(index%7)/7,formal:true
  });
  for(const [name,siteId,count] of [['景山公园','jingshan',320],['天坛公园','tiantan',1500]] as const) {
    const park=data.context.find(f=>f.kind==='park'&&f.name===name);if(!park)continue;
    const ring=park.coordinates.map(project), holes=(park.holes??[]).map(r=>r.map(project));
    const xs=ring.map(p=>p[0]),zs=ring.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
    const buildings=data.buildings.map(localBuildingRing).map(r=>({minX:Math.min(...r.map(p=>p[0]))-.65,maxX:Math.max(...r.map(p=>p[0]))+.65,minZ:Math.min(...r.map(p=>p[1]))-.65,maxZ:Math.max(...r.map(p=>p[1]))+.65})).filter(b=>b.maxX>=minX&&b.minX<=maxX&&b.maxZ>=minZ&&b.minZ<=maxZ);
    const site=landmarks.find(s=>s.id===siteId)!,[originX,originZ]=project(site.coords);
    const prayer=mappedLayout(43921139,landmarks.find(s=>s.id==='tiantan')!),vault=mappedLayout(43921121,landmarks.find(s=>s.id==='tiantan')!);
    const peaks=jingshanPavilions.map((id,index)=>({...mappedLayout(id,site),height:index===2?4.57:Math.abs(index-2)===1?3.5:2.6,radius:index===2?10:7}));
    let accepted=0;
    for(let attempt=0;attempt<count*12&&accepted<count;attempt++) {
      const x=minX+random()*(maxX-minX),z=minZ+random()*(maxZ-minZ),lx=x-originX,lz=z-originZ;
      if(!pointInPolygon([x,z],ring)||holes.some(h=>pointInPolygon([x,z],h))||buildings.some(b=>x>b.minX&&x<b.maxX&&z>b.minZ&&z<b.maxZ))continue;
      if(siteId==='tiantan'&&((Math.abs(lx-prayer.x)<13&&Math.abs(lz-prayer.z)<15)||(Math.abs(lx-vault.x)<10&&lz>vault.z-7&&lz<vault.z+20)||(Math.abs(lx-prayer.x)<3.3&&lz>prayer.z&&lz<vault.z)))continue;
      if(siteId==='jingshan'&&peaks.some(p=>Math.hypot(lx-p.x,lz-p.z)<2.3))continue;
      let y=0;
      if(siteId==='jingshan')for(const peak of peaks){const q=((lx-peak.x)/peak.radius)**2+((lz-peak.z)/9)**2;if(q<1)y=Math.max(y,peak.height*Math.sqrt(1-q));}
      result.push({x,z,y,height:1.0+random()*1.1,radius:.42+random()*.5,shade:random()});accepted++;
    }
  }
  // Formal tree lines frame the public square and the palace moat; they remain outside the protected footprints.
  const square=landmarks.find(site=>site.id==='square')!, [squareX,squareZ]=project(square.coords);
  let rowIndex=0;
  for(const side of [-1,1]) for(let z=-48;z<=37;z+=2.8) plantedRow(squareX+side*22.8,squareZ+z,rowIndex++);
  for(let x=-19;x<=19;x+=4) plantedRow(squareX+x,squareZ+39.4,rowIndex++);
  const palace=landmarks.find(site=>site.id==='forbidden-city')!, [palaceX,palaceZ]=project(palace.coords);
  for(const side of [-1,1]) for(let z=-38;z<=38;z+=4.2) plantedRow(palaceX+side*41.7,palaceZ+z,rowIndex++);
  for(let x=-30;x<=30;x+=4.4) { plantedRow(palaceX+x,palaceZ-50.4,rowIndex++); plantedRow(palaceX+x,palaceZ+50.4,rowIndex++); }
  for(const side of [-1,1]) for(let i=0;i<12;i++) plantedRow(palaceX+side*(11+(i%3)*2.4),palaceZ-20-i*1.45,rowIndex++);
  const taimiao=landmarks.find(site=>site.id==='taimiao')!, [taimiaoX,taimiaoZ]=project(taimiao.coords);
  for(let z=-19;z<=19;z+=3.8) {
    plantedRow(taimiaoX-22,taimiaoZ+z,rowIndex++);
    plantedRow(taimiaoX+22,taimiaoZ+z,rowIndex++);
  }
  const shejitan=landmarks.find(site=>site.id==='shejitan')!, [shejitanX,shejitanZ]=project(shejitan.coords);
  for(let z=-20;z<=20;z+=4.4) {
    plantedRow(shejitanX-23,shejitanZ+z,rowIndex++);
    plantedRow(shejitanX+23,shejitanZ+z,rowIndex++);
  }
  cache.set(data,result);return result;
}

function crownGeometry() {
  const geoms: THREE.BufferGeometry[] = [];
  for (const [x,y,z,sx,sy,sz] of [
    [0,.12,0,1,.90,1],
    [-.43,.00,.13,.63,.68,.68],
    [.37,-.06,-.18,.70,.72,.63],
    [-.08,.40,-.12,.68,.60,.70],
    [.08,-.13,.45,.62,.58,.60],
  ] as const) {
    const lobe = new THREE.SphereGeometry(1,8,5);
    lobe.applyMatrix4(new THREE.Matrix4().makeTranslation(x,y,z).multiply(new THREE.Matrix4().makeScale(sx,sy,sz)));
    geoms.push(lobe);
  }
  const merged = mergeGeometries(geoms,false)!;
  geoms.forEach(geometry => geometry.dispose());
  return merged;
}

/** Rounded multi-lobed crowns share two GPU draws, with formal rows and park clusters in one planting system. */
export function createForest(data:CityData,m:Materials) {
  const points=forestPoints(data).filter((tree,i)=>tree.formal||i%3===0),group=new THREE.Group();group.name='park-forest';
  const crowns=new THREE.InstancedMesh(crownGeometry(),m.leaf,points.length);
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.055,.08,1,7),m.trunk,points.length);
  const transform=new THREE.Object3D(),color=new THREE.Color();
  points.forEach((tree,i)=>{
    const trunkHeight=tree.height*.62;
    transform.position.set(tree.x,tree.y+trunkHeight+tree.radius*.55,tree.z);
    transform.scale.set(tree.radius*1.34,tree.radius*1.08,tree.radius*1.16);
    transform.rotation.set((tree.shade-.5)*.08,tree.shade*Math.PI*2,(tree.shade-.4)*.07);
    transform.updateMatrix();crowns.setMatrixAt(i,transform.matrix);
    color.set(tree.shade>.72?'#84916f':tree.shade>.38?'#708167':'#5d705a');crowns.setColorAt(i,color);
    transform.rotation.set(0,tree.shade*Math.PI,0);
    transform.position.y=tree.y+trunkHeight*.5;transform.scale.set(1,trunkHeight,1);transform.updateMatrix();trunks.setMatrixAt(i,transform.matrix);
  });
  crowns.instanceMatrix.needsUpdate=true;
  if(crowns.instanceColor)crowns.instanceColor.needsUpdate=true;
  trunks.instanceMatrix.needsUpdate=true;
  crowns.castShadow=trunks.castShadow=true;crowns.receiveShadow=trunks.receiveShadow=true;
  crowns.computeBoundingSphere();trunks.computeBoundingSphere();group.add(crowns,trunks);return group;
}
