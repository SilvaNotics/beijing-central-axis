import * as THREE from 'three';
import type { Materials } from './materials';
type Point=[number,number];
const cube=new THREE.BoxGeometry(1,1,1);
function stone(group:THREE.Group,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);group.add(mesh);return mesh;
}
function crop(ring:Point[],limit:number,sign:number):Point[] {
  const result:Point[]=[];
  for(let i=0;i<ring.length;i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],va=limit-sign*a[1],vb=limit-sign*b[1];
    if(va>=0)result.push(a);
    if(va*vb<0){const t=va/(va-vb);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
  }
  return result;
}

/** Mapped stone terrace; stair count, rail spacing and moldings are schematic. */
export function palacePlatform(ring:Point[],height:number,m:Materials,stairs?:{side:1|-1;run:number},openEnds=false) {
  const group=new THREE.Group();group.name='palace-stone-terrace';
  const sign=stairs?.side??1,far=Math.max(...ring.map(p=>sign*p[1])),cut=far-(stairs?.run??0),steps=stairs?15:3;
  for(let tier=0;tier<steps;tier++) {
    const outline=stairs?crop(ring,far-stairs.run*tier/(steps-1),sign):ring;
    const shape=new THREE.Shape(outline.map(([x,z])=>new THREE.Vector2(x,-z)));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:height/steps,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
    const mesh=new THREE.Mesh(geometry,m.marble);mesh.position.y=tier*height/steps;group.add(mesh);
  }
  for(let i=0;i<ring.length;i++) {
    const a=ring[i],b=ring[(i+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(openEnds&&Math.abs(b[0]-a[0])>Math.abs(b[1]-a[1]))continue;
    if(length<.05||stairs&&Math.max(sign*a[1],sign*b[1])>cut+.02)continue;
    const edge=new THREE.Group();edge.position.set((a[0]+b[0])/2,0,(a[1]+b[1])/2);edge.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);group.add(edge);
    for(const fraction of [.30,.64,.97])stone(edge,m.stone,0,height*fraction,0,length,.035,.045);
    const count=Math.max(1,Math.ceil(length/.32));
    for(let j=0;j<=count;j++)stone(edge,m.marble,-length/2+j*length/count,height+.09,0,.035,.18,.035);
    stone(edge,m.marble,0,height+.14,0,length,.035,.035);
    stone(edge,m.marble,0,height+.06,0,length,.055,.023);
  }
  return group;
}
