import * as THREE from 'three';
import type { Materials } from './materials';
import { roofGeometry, roofGables, roofSection } from './roofForms';
import { timberBody } from './timberArchitecture';

type Point=[number,number];
const core=.873,inner=.398,outer=.16;
export type CornerTowerPart={x:number;z:number;width:number;depth:number;extension:number;axis:'core'|'x'|'z';side:-1|0|1};
/** PAL-CORNER-TOWER gives the core and projecting depths. The middle-bay
 * width is a three-bay display interpretation, not a surveyed bay measurement. */
export function cornerTowerPlan(inwardX:-1|1,inwardZ:-1|1):CornerTowerPart[] {
  const parts:CornerTowerPart[]=[{x:0,z:0,width:core,depth:core,extension:0,axis:'core',side:0}];
  for(const axis of ['x','z'] as const)for(const side of [-1,1] as const) {
    const extension=side===(axis==='x'?inwardX:inwardZ)?inner:outer,center=side*(core/2+extension/2);
    parts.push({x:axis==='x'?center:0,z:axis==='z'?center:0,width:axis==='x'?extension:core/3,depth:axis==='z'?extension:core/3,extension,axis,side});
  }
  return parts;
}
const cube=new THREE.BoxGeometry(1,1,1);
const rod=new THREE.CylinderGeometry(1,1,1,8);
function block(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);g.add(mesh);return mesh;
}
function beam(g:THREE.Group,m:THREE.Material,a:THREE.Vector3,b:THREE.Vector3,r=.012) {
  const direction=b.clone().sub(a),mesh=new THREE.Mesh(rod,m);mesh.scale.set(r,direction.length(),r);
  mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());g.add(mesh);
}
function crossOutline(ix:-1|1,iz:-1|1):Point[] {
  const c=core/2+.10,b=core/6+.10,x0=-core/2-(ix===-1?inner:outer)-.11,x1=core/2+(ix===1?inner:outer)+.11;
  const z0=-core/2-(iz===-1?inner:outer)-.11,z1=core/2+(iz===1?inner:outer)+.11;
  return [[-b,z0],[b,z0],[b,-c],[c,-c],[c,-b],[x1,-b],[x1,b],[c,b],[c,c],[b,c],[b,z1],[-b,z1],[-b,c],[-c,c],[-c,b],[x0,b],[x0,-b],[-c,-b],[-c,-c],[-b,-c]];
}
function waistRoof(points:Point[]) {
  const positions:number[]=[],uv:number[]=[];
  for(let j=0;j<5;j++)for(let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length];
    const vertex=(p:Point,t:number)=>[p[0]*(1-.24*t),.64+.18*t*t+.024*(1-t)**3,p[1]*(1-.24*t)];
    const v=[vertex(a,j/5),vertex(b,j/5),vertex(a,(j+1)/5),vertex(b,(j+1)/5)];
    for(const k of [0,2,1,1,2,3]) {positions.push(...v[k]);uv.push(v[k][0]*2,v[k][2]*2);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
/** Each roof owns two opposite diagonal sectors, so the crossing has valleys,
 * no doubled tiles and no floating central pyramid. Gables remain at four ends. */
function crossedRoof(g:THREE.Group,m:Materials,width:number,depth:number,rise:number,y:number,offsetX=0,offsetZ=0) {
  for(const axis of ['x','z'] as const) {
    const offset=axis==='x'?offsetX:offsetZ;
    const source=roofGeometry(width,depth,rise,'hip-gable').toNonIndexed(),p=source.getAttribute('position');
    const positions:number[]=[],uv:number[]=[];
    const clip=(poly:THREE.Vector3[],value:(v:THREE.Vector3)=>number)=> {
      const result:THREE.Vector3[]=[];
      for(let i=0;i<poly.length;i++) {const a=poly[i],b=poly[(i+1)%poly.length],va=value(a),vb=value(b);if(va>=0)result.push(a);if((va<0)!==(vb<0))result.push(a.clone().lerp(b,va/(va-vb)));}return result;
    };
    for(let i=0;i<p.count;i+=3)for(const side of [-1,1]) {
      let poly=[0,1,2].map(j=>new THREE.Vector3(p.getX(i+j)+offset,p.getY(i+j),p.getZ(i+j)));
      poly=clip(clip(poly,v=>side*v.x-v.z),v=>side*v.x+v.z);
      for(let j=1;j<poly.length-1;j++)for(const v of [poly[0],poly[j],poly[j+1]]) {positions.push(v.x,v.y,v.z);uv.push(v.x*2,v.z*2);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
    const roof=new THREE.Group();roof.position.y=y;if(axis==='z')roof.rotation.y=-Math.PI/2;g.add(roof);
    roof.add(new THREE.Mesh(geometry,m.gold));
    const gables=roofGables(width,depth,rise,'hip-gable',m.wood);gables.position.x=offset;roof.add(gables);
    const peak=roofSection(width,depth,rise,1,'hip-gable').w;
    beam(roof,m.ridge,new THREE.Vector3(-peak+offset,rise+.012,0),new THREE.Vector3(peak+offset,rise+.012,0),.016);
    for(const sx of [-1,1]) {
      // Hip/gable edge curves follow the same sampled tile profile.
      for(const sz of [-1,1])for(let j=0;j<8;j++) {
        const point=(t:number)=>{const s=roofSection(width,depth,rise,t,'hip-gable');return new THREE.Vector3(sx*s.w+offset,s.y+s.corner+.014,sz*s.d);};
        beam(roof,m.ridge,point(j/8),point((j+1)/8),.009);
      }
      const finial=new THREE.Mesh(new THREE.ConeGeometry(.024,.075,8),m.goldLeaf);finial.position.set(sx*peak+offset,rise+.045,0);roof.add(finial);
    }
    source.dispose();
  }
}

/** Local y=0 is the existing wall walk, NOT the ground. */
export function createPalaceCornerTower(m:Materials,inwardX:-1|1,inwardZ:-1|1) {
  const tower=new THREE.Group();tower.name='palace-corner-tower';tower.userData.schematic=true;
  const platform=new THREE.Group();platform.name='corner-stone-platform';tower.add(platform);
  block(platform,m.marble,0,.025,0,2.02,.05,2.02);
  block(platform,m.stone,0,.065,0,1.94,.03,1.94);
  block(platform,m.marble,0,.10,0,1.98,.04,1.98);
  // Continuous three-bay core with narrower one-bay projecting arms.
  const body=new THREE.Group();body.name='corner-timber-body';tower.add(body);
  timberBody(body,m,core,core,.49,.12,true,{frontBays:3,sideBays:3});
  for(const part of cornerTowerPlan(inwardX,inwardZ).slice(1)) {
    const wing=new THREE.Group();wing.position.set(part.x,0,part.z);body.add(wing);
    // Normalise small details before scaling to the projecting bay.
    const frame=new THREE.Group();frame.scale.set(part.width/.8,1,part.depth/.8);wing.add(frame);
    timberBody(frame,m,.8,.8,.49,.12,true,{frontBays:1,sideBays:1});
  }
  const upperRoom=new THREE.Group();upperRoom.name='corner-upper-timber-room';body.add(upperRoom);
  timberBody(upperRoom,m,.70,.70,.73,.585,true,{frontBays:3,sideBays:3});
  for(const y of [.80,1.25]) {
    block(body,m.green,0,y,0,.74,.075,.74);
    block(body,m.goldLeaf,0,y+.044,0,.75,.01,.75);
  }
  const outline=crossOutline(inwardX,inwardZ),waist=new THREE.Mesh(waistRoof(outline),m.gold);waist.name='corner-lower-waist-eave';tower.add(waist);
  for(let i=0;i<outline.length;i++) {
    const a=outline[i],b=outline[(i+1)%outline.length];
    beam(tower,m.ridge,new THREE.Vector3(a[0],.665,a[1]),new THREE.Vector3(b[0],.665,b[1]),.012);
    // Painted fascia and bracket ends under the entire waist eave.
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.max(1,Math.ceil(length/.10));
    for(let j=0;j<count;j++){const t=(j+.5)/count;block(tower,m.green,a[0]+(b[0]-a[0])*t,.615,a[1]+(b[1]-a[1])*t,.035,.06,.035);}
  }
  const mid=new THREE.Group();mid.name='corner-middle-hip-gables';tower.add(mid);
  crossedRoof(mid,m,core+inner+outer+.12,.64,.27,.88,inwardX*(inner-outer)/2,inwardZ*(inner-outer)/2);
  const upper=new THREE.Group();upper.name='corner-upper-cross-hip-gables';tower.add(upper);
  crossedRoof(upper,m,1.12,.70,.32,1.30);
  const top=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),m.goldLeaf);top.position.y=1.67;tower.add(top);
  const spire=new THREE.Mesh(new THREE.ConeGeometry(.022,.09,10),m.goldLeaf);spire.position.y=1.715;tower.add(spire);
  const rails=new THREE.Group();rails.name='corner-stone-railing';tower.add(rails);
  for(const axis of ['x','z'])for(const side of [-1,1])for(let i=0;i<8;i++) {
    const a=-.92+i*.23,b=a+.23;
    // Open the middle bay toward the two interior wall walks.
    if(side===(axis==='x'?inwardZ:inwardX)&&i===4)continue;
    if(axis==='x'){block(rails,m.marble,a,.20,side*.92,.035,.18,.035);block(rails,m.marble,(a+b)/2,.26,side*.92,.23,.025,.028);block(rails,m.marble,(a+b)/2,.19,side*.92,.21,.07,.018);}
    else {block(rails,m.marble,side*.92,.20,a,.035,.18,.035);block(rails,m.marble,side*.92,.26,(a+b)/2,.028,.025,.23);block(rails,m.marble,side*.92,.19,(a+b)/2,.018,.07,.21);}
  }
  return tower;
}
