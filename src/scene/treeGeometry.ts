import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export type TreeSpecies='cypress'|'pine'|'pagoda'|'ginkgo';

/** Three distinct silhouettes with small irregular leaf masses, shared by instances. */
export function treeCrown(species:TreeSpecies) {
  const lobes:number[][]=[];
  if(species==='cypress') {
    lobes.push([0,.10,0,.52,.66,.48],[.10,.60,-.01,.28,.30,.26]);
    for(let i=0;i<7;i++){const a=i*2.4;lobes.push([Math.cos(a)*.22,-.35+i*.12,Math.sin(a)*.22,.29,.34,.27]);}
  } else if(species==='pine') {
    for(let tier=0;tier<3;tier++)for(let branch=0;branch<3;branch++) {
      const a=branch*Math.PI*2/3+tier*.8,r=.47-tier*.10;lobes.push([Math.cos(a)*r,-.20+tier*.33,Math.sin(a)*r,.48-tier*.06,.19,.38-tier*.04]);
    }
  } else if(species==='ginkgo') {
    for(let tier=0;tier<4;tier++)for(let branch=0;branch<4;branch++) {
      const a=branch*Math.PI/2+tier*.65,r=.40-tier*.07;
      lobes.push([Math.cos(a)*r,-.35+tier*.30,Math.sin(a)*r,.38-tier*.045,.27,.34-tier*.04]);
    }
  } else {
    for(let i=0;i<11;i++) {
      const a=i*2.4,r=i<7?.52:.23;lobes.push([Math.cos(a)*r,(i<7?-.05:.43)+Math.sin(i*3.1)*.12,Math.sin(a)*r,.43,.37,.42]);
    }
  }
  const parts=lobes.map(([x,y,z,sx,sy,sz],index)=>{
    const g=new THREE.SphereGeometry(1,7,5),p=g.getAttribute('position'),colors:number[]=[];
    for(let i=0;i<p.count;i++) {
      const xx=p.getX(i),yy=p.getY(i),zz=p.getZ(i),n=1+.08*Math.sin(xx*9+yy*7+zz*13+index*1.7);
      p.setXYZ(i,x+xx*sx*n,y+yy*sy*n,z+zz*sz*n);
      const shade=.80+(.12+.08*Math.sin(index*1.9))*((yy+1)/2);colors.push(shade,shade,shade*.98);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
  });
  const geometry=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());geometry.computeBoundingSphere();return geometry;
}
export function treeBranches() {
  const parts:THREE.BufferGeometry[]=[];
  for(let i=0;i<5;i++) {
    const angle=i*2.4,a=new THREE.Vector3(0,-.57+i*.09,0),b=new THREE.Vector3(Math.cos(angle)*.63,-.05+i*.09,Math.sin(angle)*.63),v=b.clone().sub(a);
    const g=new THREE.CylinderGeometry(.012,.028,v.length(),6);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);parts.push(g);
  }
  const geometry=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());return geometry;
}
