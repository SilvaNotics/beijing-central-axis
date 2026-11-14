import * as THREE from 'three';
import type { Landmark } from '../data/types';
import type { Materials } from './materials';
import { localFootprintLayout, type CityData } from './geodata';
import { roofGeometry, roofGables, roofSection } from './roofForms';

const cube=new THREE.BoxGeometry(1,1,1);
function block(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);g.add(mesh);return mesh;
}
function arch(x:number,bottom:number,width:number,height:number) {
  const p=new THREE.Path(),r=width/2;
  p.moveTo(x-r,bottom);p.lineTo(x+r,bottom);p.lineTo(x+r,bottom+height-r);
  p.absarc(x,bottom+height-r,r,0,Math.PI,false);p.lineTo(x-r,bottom);p.closePath();return p;
}
function rectangle(width:number,bottom:number,top:number) {
  const p=new THREE.Shape();p.moveTo(-width/2,bottom);p.lineTo(width/2,bottom);p.lineTo(width/2,top);p.lineTo(-width/2,top);p.closePath();return p;
}

/** Recessed arrow apertures with stone reveals and the simplified 1915 hoods. */
function windowWall(g:THREE.Group,m:Materials,width:number,bottom:number,top:number,rows:number[],columns:number,turn:number,cross:number,z:number,annex=false) {
  const side=new THREE.Group();side.rotation.y=turn;side.position.z=z;g.add(side);
  const outline=rectangle(width,bottom,top),apertures:{x:number;y:number}[]=[];
  for(const y of rows)for(let i=0;i<columns;i++) {
    const x=(i-(columns-1)/2)*(width*.89/columns);outline.holes.push(arch(x,y-.135,.19,.27));apertures.push({x,y});
  }
  const wall=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:.12,bevelEnabled:false,curveSegments:8}),m.grayBrick);wall.name='arrow-perforated-wall';wall.position.z=cross/2-.12;side.add(wall);
  for(const {x,y} of apertures) {
    const recess=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(arch(x,y-.135,.19,.27).getPoints(20))),m.window);
    recess.position.z=cross/2-.105;recess.name='arrow-window';side.add(recess);
    block(side,m.stone,x,y-.137,cross/2-.035,.215,.025,.15);
    if(y<2.1&&!annex) {
      block(side,m.stone,x,y+.16,cross/2+.035,.29,.035,.12);
      for(const sign of [-1,1])block(side,m.stone,x+sign*.13,y+.12,cross/2+.018,.025,.09,.08);
    }
  }
  // Masonry bands remain legible at map scale without turning the wall black.
  for(const y of [bottom+.025,top-.035])block(side,m.civicStoneDark,0,y,cross/2+.004,width,.045,.018);
  return side;
}
function roof(g:THREE.Group,m:Materials,w:number,d:number,z:number,y:number,rise:number) {
  const mesh=new THREE.Mesh(roofGeometry(w,d,rise,'hip-gable'),m.grayRoof);mesh.position.set(0,y,z);mesh.name='arrow-roof';g.add(mesh);
  const infill=roofGables(w,d,rise,'hip-gable',m.grayBrick);infill.position.set(0,y,z);g.add(infill);
  block(g,m.wood,0,y-.02,z,w,.045,d);
  for(const sign of [-1,1]) {
    block(g,m.green,0,y+.018,z+sign*d/2,w,.04,.055);
    block(g,m.green,sign*w/2,y+.018,z,.055,.04,d);
  }
  block(g,m.grayRoof,0,y+rise+.02,z,roofSection(w,d,rise,1,'hip-gable').w*2,.04,.065);
  for(let i=0;i<=Math.ceil(w/.25);i++)for(const sign of [-1,1])block(g,m.grayBrick,-w/2+i*w/Math.ceil(w/.25),y-.055,z+sign*(d/2-.05),.035,.07,.14);
}

/** Mapped centre/yaw; documented 62 m facade, 32 m depth and 35.37 m height.
 * Window counts follow the heritage bureau; platform/ornament dimensions are interpreted.
 */
export function createArrowTower(site:Landmark,m:Materials,data:CityData) {
  const source=data.buildings.find(b=>b.id===439956436)!;
  const p=localFootprintLayout(source,site),g=new THREE.Group();g.name='正阳门箭楼';g.userData.osmId=source.id;g.position.set(p.x,0,p.z);g.rotation.y=p.rotation;
  const base=new THREE.Group();base.name='arrow-platform';g.add(base);
  const outline=rectangle(6.4,0,1.2);outline.holes.push(arch(0,.015,.66,1.02));
  const masonry=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:3.6,bevelEnabled:false,curveSegments:18}),m.grayBrick);masonry.position.z=-1.8;base.add(masonry);
  // Stone arch surrounds on the front and rear of the real through-passage.
  for(const sign of [-1,1]) {
    const trim=new THREE.Shape(arch(0,0,.77,1.075).getPoints(32));trim.holes.push(arch(0,.015,.66,1.02));
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(trim),m.stone);mesh.position.z=sign*1.805;if(sign<0)mesh.rotation.y=Math.PI;base.add(mesh);
  }
  block(g,m.stone,0,1.215,0,6.52,.07,3.72);
  for(const turn of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
    const side=new THREE.Group();side.rotation.y=turn;g.add(side);const w=turn%Math.PI===0?6.45:3.65,d=turn%Math.PI===0?3.65:6.45;
    block(side,m.stone,0,1.43,d/2,w,.035,.05);
    for(let i=0;i<=Math.ceil(w/.22);i++)block(side,m.stone,-w/2+i*w/Math.ceil(w/.22),1.35,d/2,.035,.26,.04);
  }
  const lower=[1.53,1.92,2.31];
  for(const [w,d,z,bottom,top,rows] of [[6.2,2,.6,1.25,2.59,lower],[5.8,1.65,.6,2.68,3.12,[2.96]]] as const) {
    windowWall(g,m,w,bottom,top,[...rows],13,0,d,z);
    for(const sign of [-1,1])windowWall(g,m,d,bottom,top,[...rows],4,sign*Math.PI/2,w,z);
    block(g,m.grayBrick,0,(bottom+top)/2,z-d/2+.06,w,top-bottom,.12);
  }
  // The northern annex has five arrows on each side and a separate glazed north window.
  for(const sign of [-1,1]) {
    const face=windowWall(g,m,1.2,1.25,2.28,[1.55,1.92],2,sign*Math.PI/2,4.2,-1,true);
    const extra=windowWall(g,m,1.2,2.28,2.62,[2.44],1,sign*Math.PI/2,4.2,-1,true);
    // Two adjacent masonry bands share the same side, separated at the top row.
    face.userData.annex=true;extra.userData.annex=true;
  }
  block(g,m.grayBrick,0,1.91,-1.56,4.2,1.32,.12);
  block(g,m.stone,0,1.84,-1.625,.38,.28,.025);block(g,m.glass,0,1.84,-1.642,.32,.216,.015);
  for(const x of [-.10,0,.10])block(g,m.grayBrick,x,1.84,-1.652,.015,.22,.02);
  roof(g,m,6.40,2.24,.6,2.57,.29);
  roof(g,m,6.12,1.99,.6,3.10,.397);
  roof(g,m,4.42,1.45,-.96,2.60,.30);
  // Simplified pale side ornaments added in 1915.
  for(const sign of [-1,1]) {
    const ornament=new THREE.Group();ornament.position.set(sign*3.12,1.92,.6);ornament.rotation.y=sign*Math.PI/2;g.add(ornament);
    block(ornament,m.stone,0,.18,0,.24,.29,.035);block(ornament,m.marble,0,.34,.01,.42,.065,.08);
  }
  return g;
}
