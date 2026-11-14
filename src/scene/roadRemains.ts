import * as THREE from 'three';
import type { Landmark } from '../data/types';
import type { Materials } from './materials';
import { roadStation, roadPavingRuns, roadExhibits } from './southernRoad';
import { project } from './geo';

const cube=new THREE.BoxGeometry(1,1,1);
function block(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);g.add(mesh);return mesh;
}
function colored(geometry:THREE.BufferGeometry,shade:number) {
  const p=geometry.getAttribute('position'),colors:number[]=[];
  for(let i=0;i<p.count;i++)colors.push(shade,shade*.98,shade*.93);
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return geometry;
}
function slabGeometry(width:number,depth:number,seed:number) {
  const w=width/2,d=depth/2,ch=.008+(seed%3)*.003;
  const shape=new THREE.Shape([[-w+ch,-d],[w-ch,-d],[w,-d+ch],[w,d-ch],[w-ch,d],[-w+ch,d],[-w,d-ch],[-w,-d+ch]].map(([x,z])=>new THREE.Vector2(x,z)));
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.032,bevelEnabled:true,bevelThickness:.004,bevelSize:.003,bevelSegments:1,steps:1});geometry.rotateX(-Math.PI/2);
  const p=geometry.getAttribute('position');
  for(let i=0;i<p.count;i++) {
    const x=p.getX(i),z=p.getZ(i);p.setY(i,p.getY(i)+.002*Math.sin(x*37+seed)*Math.sin(z*29+seed*.7));
  }
  geometry.computeVertexNormals();return colored(geometry,.80+(seed%7)*.025);
}
function crack(g:THREE.Group,m:Materials,x:number,z:number,seed:number) {
  const points=Array.from({length:5},(_,i)=>new THREE.Vector3(x+(i-2)*.022,.174,z+Math.sin(i*2.1+seed)*.013));
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],v=b.clone().sub(a),mesh=new THREE.Mesh(new THREE.CylinderGeometry(.0008,.0008,v.length(),3),m.darkStone);mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());g.add(mesh);
  }
}
function soilStrip(g:THREE.Group,m:Materials,x:number,width:number,depth:number) {
  const geometry=new THREE.PlaneGeometry(width,depth,8,72);geometry.rotateX(-Math.PI/2);const p=geometry.getAttribute('position');
  for(let i=0;i<p.count;i++) {
    const xx=p.getX(i),z=p.getZ(i),rut=Math.exp(-(((xx-.018*Math.sin(z*2.4))/.012)**2));
    p.setY(i,.132+.002*Math.sin(z*31+xx*57)-rut*.008);
  }
  geometry.computeVertexNormals();colored(geometry,.88);const mesh=new THREE.Mesh(geometry,m.cutEarth);mesh.position.x=x;mesh.name='earth-wheel-ruts';g.add(mesh);
}

/** Source-based stone-strip / soil-shoulder relationship; weathering and display extents are interpreted. */
export function createRoadRemains(site:Landmark,m:Materials) {
  const group=new THREE.Group(),[ox,oz]=project(site.coords);
  const place=(station:number,lateral=0)=>{
    const p=roadStation(station,lateral),g=new THREE.Group();g.position.set(p.x-ox,0,p.z-oz);g.rotation.y=p.rotation;group.add(g);return g;
  };
  for(let metres=28;metres<440;metres+=4) {
    const tile=place(metres);tile.name='modern-road-paving';
    for(const [a,b] of roadPavingRuns(metres)) {
      const center=(a+b)/2,width=b-a;
      block(tile,m.paving,center,.025,0,width,.05,.402);
      for(const edge of [a,b])block(tile,m.stone,edge,.055,0,.035,.06,.402);
      const left=Math.max(a+.024,-.24),right=Math.min(b-.024,.24);
      if(right>left) {
        block(tile,m.stone,(left+right)/2,.058,0,right-left,.035,.392);
        for(const x of [-.08,.08])if(x>left&&x<right)block(tile,m.plazaLine,x,.077,0,.003,.003,.392);
        block(tile,m.plazaLine,(left+right)/2,.077,.196,right-left,.003,.003);
      }
    }
  }
  for(const side of [-1,1]) {
    const exhibit=roadExhibits.find(e=>e.lateral===side*8)!,bed=place(exhibit.station,exhibit.lateral);bed.name='永定门北侧石板道遗存';
    block(bed,m.darkStone,0,.035,0,exhibit.width,.07,exhibit.depth);
    block(bed,m.cutEarth,0,.075,0,.69,.08,3.68);
    for(const x of [-.29,.29])soilStrip(bed,m,x,.10,3.6);
    for(let row=0;row<14;row++)for(let col=0;col<3;col++) {
      const seed=row*11+col*7+(side+1)*3,depth=3.5/14-.008;
      const slab=new THREE.Mesh(slabGeometry(.151,depth,seed),m.weatheredStone);slab.position.set((col-1)*.16,.138,-1.75+(row+.5)*3.5/14);slab.name='worn-road-slab';bed.add(slab);
      if(seed%6===0)crack(bed,m,slab.position.x,slab.position.z,seed);
    }
    for(const edge of [-1,1]) {
      const wall=block(bed,m.grayBrick,edge*.365,.13,0,.05,.18,3.80);wall.name='retaining-wall';
      for(let row=0;row<20;row++)block(bed,m.stone,edge*.365,.228,-1.9+(row+.5)*.19,.067,.023,.184);
    }
    for(const z of [-1.85,1.85])block(bed,m.grayBrick,0,.13,z,.72,.18,.055);
  }
  const exhibit=roadExhibits[2],section=place(exhibit.station,exhibit.lateral);section.name='永定门内历史道路叠压遗存';
  block(section,m.darkStone,0,.035,0,exhibit.width,.07,exhibit.depth);
  // Seven exposed shelves retain their aligned axis; uneven cut faces, soil
  // grain and gravel distinguish them from seven identical stacked bricks.
  for(let layer=0;layer<7;layer++) {
    const front=1.16-layer*.29,back=-1.16,width=.84,depth=front-back,seed=layer*13;
    const shape=new THREE.Shape([[-width/2,-back],[width/2,-back],[width/2,-front+.018],[width*.22,-front-.006],[0,-front+.012],[-width*.23,-front-.014],[-width/2,-front+.008]].map(([x,z])=>new THREE.Vector2(x,z)));
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false});geometry.rotateX(-Math.PI/2);colored(geometry,.70+layer*.035);
    const earth=new THREE.Mesh(geometry,m.cutEarth);earth.position.y=.07+layer*.045;earth.name='exposed-road-layer';earth.userData.layer=7-layer;section.add(earth);
    const y=.116+layer*.045;
    for(let j=0;j<16;j++) {
      const x=-.39+j*.052,z=front+.004*Math.sin(j*2.7+layer);
      block(section,m.weatheredStone,x,y-.029,z,.028,.003,.007).name='soil-mineral-seam';
    }
    for(let i=0;i<13;i++) {
      const stone=new THREE.Mesh(new THREE.IcosahedronGeometry(.009+(i%3)*.004,0),m.stone);stone.position.set((i%5-2)*.16,y,front-.07-Math.floor(i/5)*.035);stone.scale.y=.45;section.add(stone);
    }
    if(layer===1||layer===6)for(let col=0;col<3;col++) {
      const slab=new THREE.Mesh(slabGeometry(.245,.19,seed+col),m.weatheredStone);slab.position.set((col-1)*.26,y,front-.13);slab.name=layer===1?'qing-stone-road':'recent-road-surface';section.add(slab);
    }
  }
  for(const edge of [-1,1]) {
    block(section,m.grayBrick,edge*.49,.09,0,.055,.11,2.5);
    for(let i=0;i<7;i++)block(section,m.civicStoneDark,edge*.49,.24,-1.18+i*.393,.018,.25,.018);
    block(section,m.civicStoneDark,edge*.49,.36,0,.018,.018,2.4);
  }
  return group;
}
