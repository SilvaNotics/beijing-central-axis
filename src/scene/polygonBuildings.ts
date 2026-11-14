import * as THREE from 'three';
import type { Materials } from './materials';
import { polygonRoof } from './polygonRoof';
export { polygonRoof } from './polygonRoof';
type Point=[number,number];
const cube=new THREE.BoxGeometry(1,1,1);
function block(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);g.add(mesh);return mesh;
}
function solid(ring:Point[],height:number,material:THREE.Material,y:number) {
  const shape=new THREE.Shape(ring.map(([x,z])=>new THREE.Vector2(x,-z)));
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});geometry.rotateX(-Math.PI/2);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.y=y;return mesh;
}

/** Atlas-scale tile pitches, framed windows and piers on irregular mapped buildings. */
export function polygonBuilding(source:Point[],m:Materials,roofMaterial:THREE.Material,height:number,facade:'timber'|'wall'='timber') {
  const ring=source.filter((p,i)=>i===0||Math.hypot(p[0]-source[i-1][0],p[1]-source[i-1][1])>1e-6);
  if(ring.length>1&&Math.hypot(ring[0][0]-ring.at(-1)![0],ring[0][1]-ring.at(-1)![1])<1e-6)ring.pop();
  const result=new THREE.Group();
  result.add(solid(ring,.06,m.darkStone,0),solid(ring,height,facade==='wall'?m.wall:m.vermilion,.06),solid(ring,.035,m.wood,height+.06));
  const roof=new THREE.Mesh(polygonRoof(ring,height+.095),roofMaterial);roof.name='mapped-concave-roof';result.add(roof);
  const details=new THREE.Group();details.name='polygon-facade-details';result.add(details);
  // Digitised points along one straight wall must not produce many tiny facades.
  let edges=ring.slice();
  for(let pass=0;pass<3;pass++)edges=edges.filter((p,i)=>{
    const a=edges[(i+edges.length-1)%edges.length],b=edges[(i+1)%edges.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    return length<.03||Math.abs((p[0]-a[0])*dz-(p[1]-a[1])*dx)/length>.012;
  });
  const area=ring.reduce((sum,a,i)=>{const b=ring[(i+1)%ring.length];return sum+a[0]*b[1]-b[0]*a[1];},0),outward=area>0?-1:1;
  for(let i=0;i<edges.length;i++) {
    const a=edges[i],b=edges[(i+1)%edges.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    if(length<.15)continue;
    const face=new THREE.Group();face.position.set((a[0]+b[0])/2,.06,(a[1]+b[1])/2);face.rotation.y=-Math.atan2(dz,dx);details.add(face);
    const bays=Math.max(1,Math.ceil(length/.70)),bay=length/bays,t=Math.min(.023,height*.04,bay*.05);
    block(face,facade==='wall'?m.wood:m.green,0,height*.90,outward*(facade==='wall'?.022:.012),length,height*.09,facade==='wall'?.045:.025);
    block(face,m.ridge,0,height+.055,outward*.015,length,.035,.045);
    if(facade==='wall')block(face,m.stone,0,.035,outward*.026,length,.07,.055);
    for(let j=0;j<=bays;j++) {
      const x=-length/2+j*bay;
      block(face,m.vermilion,x,height*.46,outward*(facade==='wall'?.035:.019),t*(facade==='wall'?3:1.7),height*.92,facade==='wall'?.065:.035);
      block(face,m.stone,x,.027,outward*(facade==='wall'?.036:.020),t*(facade==='wall'?3.8:2.4),.055,facade==='wall'?.075:.045);
    }
    for(let j=0;j<bays;j++) {
      const x=-length/2+(j+.5)*bay,w=bay*.70,y=height*.45,h=height*.60;
      if(facade==='wall') {
        // These OSM runs are labelled courtyard walls: show relief, not invented
        // windows or open colonnades. Exact bay spacing remains schematic.
        block(face,m.vermilion,x,y,outward*.012,w,h,.028);
        for(const yy of [-.5,.5])block(face,m.wood,x,y+h*yy,outward*.030,w,.012,.025);
        continue;
      }
      block(face,m.window,x,y,outward*.010,w,h,.018);
      for(const side of [-1,1])block(face,m.wood,x+side*w/2,y,outward*.023,t,h+.025,.019);
      for(const yy of [-.5,.06,.5])block(face,m.wood,x,y+h*yy,outward*.023,w,t,.019);
      block(face,m.vermilion,x,y-h*.28,outward*.024,w*.90,h*.28,.018);
      for(const side of [-1,0,1])block(face,m.ridge,x+side*w*.25,y+h*.26,outward*.025,t*.6,h*.43,.012);
    }
  }
  return result;
}
