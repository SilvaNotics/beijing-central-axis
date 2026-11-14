import * as THREE from 'three';
import type { Landmark } from '../data/types';
import type { Materials } from './materials';
import { mappedLayout } from './layouts';
import { wanningLayout } from './wanningLayout';
import { roofGeometry, roofGables, roofSection, type RoofForm } from './roofForms';
import { timberBody, timberEaves } from './timberArchitecture';

const cube=new THREE.BoxGeometry(1,1,1);
function block(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);g.add(mesh);return mesh;
}
function arch(width:number,height:number,x=0,bottom=.025) {
  const p=new THREE.Path(),r=width/2;
  p.moveTo(x-r,bottom);p.lineTo(x+r,bottom);p.lineTo(x+r,height-r);
  p.absarc(x,height-r,r,0,Math.PI,false);p.lineTo(x-r,bottom);p.closePath();return p;
}
function face(width:number,height:number,openings:number[],openingWidth:number,openingHeight:number,mat:THREE.Material) {
  const outline=new THREE.Shape();outline.moveTo(-width/2,0);outline.lineTo(width/2,0);outline.lineTo(width/2,height);outline.lineTo(-width/2,height);outline.closePath();
  for(const x of openings)outline.holes.push(arch(openingWidth,openingHeight,x));
  return new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:.18,bevelEnabled:false,curveSegments:12}),mat);
}
/** Four thick walls leave real cross passages through the raised tower bases. */
function masonry(g:THREE.Group,m:Materials,width:number,depth:number,height:number,y:number,drum:boolean,upper=false) {
  const walls=new THREE.Group();walls.position.y=y;g.add(walls);
  for(const [turn,span,cross] of [[0,width,depth],[Math.PI,width,depth],[Math.PI/2,depth,width],[-Math.PI/2,depth,width]]) {
    const side=new THREE.Group();side.rotation.y=turn;walls.add(side);
    const openings=drum&&Math.abs(Math.sin(turn))<.1?[-span*.28,0,span*.28]:[0];
    const openingWidth=upper?.64:drum?.44:.62,openingHeight=upper?height*.88:height*.66;
    const wall=face(span,height,openings,openingWidth,openingHeight,drum?m.wall:m.grayBrick);wall.position.z=cross/2-.18;side.add(wall);
    if(upper)for(const x of [-span*.31,span*.31]) {
      const window=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(arch(.32,.66).getPoints(18))),m.window);window.position.set(x,.12,cross/2+.006);side.add(window);
      for(const dx of [-.10,0,.10])block(side,m.grayBrick,x+dx,.37,cross/2+.016,.025,.44,.02);
    }
    for(const x of openings) {
      const outline=new THREE.Shape(arch(openingWidth+.11,openingHeight+.055,x,0).getPoints(24));outline.holes.push(arch(openingWidth,openingHeight,x));
      const trim=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:.025,bevelEnabled:false,curveSegments:12}),drum?m.stone:m.marble);trim.position.z=cross/2;side.add(trim);
    }
  }
  return walls;
}
function rails(g:THREE.Group,m:THREE.Material,w:number,d:number,y:number) {
  for(const turn of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
    const width=turn%Math.PI===0?w:d,depth=turn%Math.PI===0?d:w,edge=new THREE.Group();edge.rotation.y=turn;g.add(edge);
    block(edge,m,0,y+.26,depth/2,width,.035,.04);
    block(edge,m,0,y+.10,depth/2,width,.09,.025);
    for(let i=0;i<=Math.ceil(width/.20);i++)block(edge,m,-width/2+i*width/Math.ceil(width/.20),y+.15,depth/2,.035,.30,.035);
  }
}
function towerRoof(g:THREE.Group,m:Materials,w:number,d:number,y:number,rise:number,form:RoofForm) {
  const roof=new THREE.Mesh(roofGeometry(w,d,rise,form),m.grayRoof);roof.name='tower-roof';roof.position.y=y;g.add(roof);
  const gables=roofGables(w,d,rise,form,m.grayBrick);gables.position.y=y;g.add(gables);
  timberEaves(g,m,w,d,w*.70,d*.66,y,false);
  for(const side of [-1,1]) {
    block(g,m.green,0,y+.025,side*d/2,w,.055,.065);
    block(g,m.green,side*w/2,y+.025,0,.065,.055,d);
  }
  const ridge=roofSection(w,d,rise,1,form).w*2;
  block(g,m.grayRoof,0,y+rise+.02,0,ridge,.04,.09);
}

/** Municipal heritage descriptions and library photographs distinguish the two towers. */
export function createBellDrum(site:Landmark,m:Materials) {
  const result=new THREE.Group();
  for(const id of [425993664,267371087]) {
    const p=mappedLayout(id,site),drum=id===267371087,tower=new THREE.Group();tower.name=p.name;tower.userData.osmId=id;tower.position.set(p.x,0,p.z);result.add(tower);
    const w=p.w,d=p.d,baseHeight=drum?1.58:1.94;
    block(tower,m.darkStone,0,.04,0,w+.16,.08,d+.16);
    const base=masonry(tower,m,w,d,baseHeight,.08,drum);base.name='tower-base';
    block(tower,m.stone,0,baseHeight+.10,0,w+.12,.12,d+.12);
    // Horizontal stone courses and projecting corner blocks give the base mass scale.
    for(let row=1;row<6;row++)for(const side of [-1,1]) {
      for(const corner of [-1,1]) {
        block(tower,drum?m.vermilion:m.civicStoneDark,side*(w/2+.005),.08+baseHeight*row/6,corner*(d/2-.16),.016,.025,.32);
        block(tower,drum?m.vermilion:m.civicStoneDark,corner*(w/2-.16),.08+baseHeight*row/6,side*(d/2+.005),.32,.025,.016);
      }
    }
    if(drum) {
      block(tower,m.wall,0,1.88,0,w*.76,.42,d*.68);
      timberBody(tower,m,w*.82,d*.77,1.02,2.12,true,{frontBays:5,sideBays:3});
      rails(tower,m.wood,w*.86,d*.82,2.10);
      towerRoof(tower,m,w*1.02,d*1.04,1.85,.25,'hipped');
      towerRoof(tower,m,w*1.04,d*1.04,3.13,.39,'hipped');
      block(tower,m.wall,0,3.61,0,w*.56,.27,d*.50);
      towerRoof(tower,m,w*.76,d*.75,3.70,.93,'hip-gable');
    } else {
      rails(tower,m.marble,w*.94,d*.94,2.10);
      masonry(tower,m,w*.73,d*.73,1.17,2.04,false,true);
      // The bronze bell remains visible through the four large upper arches.
      const bell=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.19,0),new THREE.Vector2(.21,.035),new THREE.Vector2(.18,.09),new THREE.Vector2(.145,.48),new THREE.Vector2(.09,.60),new THREE.Vector2(0,.65)],24),m.brass);bell.position.y=2.24;bell.name='永乐铜钟';tower.add(bell);
      block(tower,m.wood,0,2.98,0,.10,.28,.10);
      towerRoof(tower,m,w*1.02,d*1.02,3.20,.35,'hipped');
      block(tower,m.grayBrick,0,3.64,0,w*.59,.39,d*.59);
      towerRoof(tower,m,w*.82,d*.82,3.83,.92,'hip-gable');
    }
  }
  return result;
}

function guardian(m:Materials) {
  const g=new THREE.Group();g.name='镇水兽';
  const round=(x:number,y:number,z:number,sx:number,sy:number,sz:number)=>{
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),m.civicStone);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);g.add(mesh);
  };
  round(0,.07,.015,.095,.065,.17);round(0,.10,-.13,.075,.075,.065);round(0,.075,-.19,.055,.035,.05);
  for(const side of [-1,1])for(const z of [-.065,.10]){round(side*.09,.035,z,.045,.025,.055);round(side*.045,.16,-.11,.018,.035,.02);}
  block(g,m.civicStone,0,.015,0,.23,.03,.40);return g;
}

/** One north–south stone arch crossing an east–west channel. Units are 10 m. */
export function createWanning(site:Landmark,m:Materials) {
  const result=new THREE.Group(),layout=wanningLayout(site),{length,width}=layout;
  result.position.set(layout.x,0,layout.z);result.rotation.y=layout.rotation;
  const profile=new THREE.Shape();profile.moveTo(-length/2,.04);profile.lineTo(-length/2,.27);profile.lineTo(-.65,.49);profile.quadraticCurveTo(0,.65,.65,.49);profile.lineTo(length/2,.27);profile.lineTo(length/2,.04);profile.lineTo(.36,.04);profile.lineTo(.36,.12);profile.absellipse(0,.12,.36,.35,0,Math.PI,false,0);profile.lineTo(-.36,.04);profile.closePath();
  const geometry=new THREE.ExtrudeGeometry(profile,{depth:width,bevelEnabled:false,curveSegments:28});geometry.rotateY(Math.PI/2);geometry.translate(-width/2,0,0);
  const body=new THREE.Mesh(geometry,m.civicStone);body.name='万宁桥桥身';result.add(body);
  // Individual paving bands follow the gently crowned deck.
  const crown=(z:number)=>Math.abs(z)<.65?.57-.08*(z/.65)**2:.49-(Math.abs(z)-.65)*.22/(length/2-.65);
  for(let i=0;i<26;i++) {
    const z=-length/2+(i+.5)*length/26,top=crown(z);
    block(result,m.stone,0,top+.006,z,width-.04,.018,length/26*.97);
  }
  for(const side of [-1,1]) {
    for(let i=0;i<12;i++) {
      const z=-length/2+i*length/11,y=crown(z),x=side*(width/2+.02);
      block(result,m.marble,x,y+.18,z,.065,.36,.065);
      const cap=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),m.marble);cap.position.set(x,y+.38,z);result.add(cap);
      if(i===11)continue;
      const next=-length/2+(i+1)*length/11,yy=(y+crown(next))/2;
      const panel=block(result,m.marble,x,yy+.19,(z+next)/2,.045,.24,length/11-.045);panel.rotation.x=-Math.atan2(crown(next)-y,next-z);
      block(result,m.civicStoneDark,x+side*.025,yy+.19,(z+next)/2,.008,.025,length/11*.65);
    }
    for(const bank of [-1,1]) {
      const beast=guardian(m);beast.position.set(side*1.08,.17,bank*.56);beast.rotation.y=bank<0?Math.PI:0;result.add(beast);
    }
  }
  return result;
}
