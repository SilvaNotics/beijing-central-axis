import * as THREE from 'three';
import type { Materials } from './materials';

/** Heights: official park pages. Plan dimensions: DPM, printed p38.
 * Eave projections, tier levels and joinery below are model interpretations. */
export function jingshanPavilionProfile(id:number) {
  const central=id===26390235,octagonal=id===189309374||id===189309372;
  return {
    central, sides:central?4:octagonal?8:64,
    columnsPerSide:central?5:1,
    height:central?1.74:octagonal?1.205:1.175,
    bodyRadius:central?1.701/Math.SQRT2:octagonal?.5205:.3935,
    roofRadius:central?1.05*Math.SQRT2:octagonal?.73:.64,
    platformRadius:central?1.0*Math.SQRT2:octagonal?.66:.59,
    roof:central?'gold':octagonal?'green':'blue',
    edge:central?'green':octagonal?'gold':'purpleGlaze',
    tiers:central?3:2,
  } as const;
}

/** Shared with tree placement, including projecting steps. */
export function jingshanPavilionEnvelope(id:number) {
  const p=jingshanPavilionProfile(id);
  const half=p.central?p.roofRadius/Math.SQRT2:p.roofRadius;
  return {halfWidth:half,halfDepth:Math.max(half,(p.central?1:p.platformRadius)+.29)};
}

const unitBox=new THREE.BoxGeometry(1,1,1);
const unitColumn=new THREE.CylinderGeometry(1,1,1,12);
const up=new THREE.Vector3(0,1,0);
function box(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(unitBox,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);g.add(mesh);return mesh;
}
function rod(g:THREE.Group,m:THREE.Material,a:THREE.Vector3,b:THREE.Vector3,r:number) {
  const delta=b.clone().sub(a),mesh=new THREE.Mesh(unitColumn,m);
  mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(r,delta.length(),r);
  mesh.quaternion.setFromUnitVectors(up,delta.normalize());g.add(mesh);return mesh;
}
function post(g:THREE.Group,m:THREE.Material,x:number,z:number,bottom:number,top:number,r:number) {
  return rod(g,m,new THREE.Vector3(x,bottom,z),new THREE.Vector3(x,top,z),r);
}

function perimeter(sides:number,radius:number) {
  return Array.from({length:sides},(_,i)=>{
    const a=i/sides*Math.PI*2+(sides===4?Math.PI/4:Math.PI/sides);
    return new THREE.Vector2(Math.cos(a)*radius,Math.sin(a)*radius);
  });
}
function ring(g:THREE.Group,points:THREE.Vector2[],y:number,mat:THREE.Material,r:number) {
  points.forEach((a,i)=>{const b=points[(i+1)%points.length];rod(g,mat,new THREE.Vector3(a.x,y,a.y),new THREE.Vector3(b.x,y,b.y),r);});
}

/** Curved polygonal skirts retain a real central opening beneath the next tier.
 * Round roofs use a smooth perimeter, never a low-sided cone. */
export function pavilionRoofPoint(sides:number,radius:number,rise:number,top:boolean,u:number,t:number) {
  const edge=u*sides,face=Math.floor(edge)%sides,f=edge-Math.floor(edge);
  const angle=face/sides*Math.PI*2+(sides===4?Math.PI/4:Math.PI/sides),next=angle+Math.PI*2/sides;
  const ax=Math.cos(angle)*radius,az=Math.sin(angle)*radius,bx=Math.cos(next)*radius,bz=Math.sin(next)*radius;
  const radial=1-t*(top?.985:.46),corner=sides<16?Math.abs(f-.5)*2:0;
  const y=rise*Math.pow(t,1.7)+radius*.024*(1-t)**5+radius*.025*corner**4*(1-t)**4;
  return new THREE.Vector3((ax+(bx-ax)*f)*radial,y,(az+(bz-az)*f)*radial);
}

function roof(g:THREE.Group,m:Materials,p:ReturnType<typeof jingshanPavilionProfile>,radius:number,y:number,rise:number,top:boolean,index:number) {
  const group=new THREE.Group();group.name=`pavilion-roof-${index}`;group.position.y=y;g.add(group);
  const segments=p.sides<16?p.sides*12:p.sides;
  const point=(u:number,t:number)=>pavilionRoofPoint(p.sides,radius,rise,top,u,t);
  function surface(start:number,end:number,mat:THREE.Material,name:string) {
    const positions:number[]=[],uvs:number[]=[],indices:number[]=[],rows=10;
    for(let row=0;row<=rows;row++)for(let i=0;i<=segments;i++) {
      const t=start+(end-start)*row/rows,v=point(i/segments,t);positions.push(v.x,v.y,v.z);uvs.push(i/segments*4,t);
    }
    for(let row=0;row<rows;row++)for(let i=0;i<segments;i++) {
      const a=row*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,mat);mesh.name=name;group.add(mesh);
  }
  const edge=m[p.edge];
  surface(0,.13,edge,'glazed-tile-border');surface(.13,1,m[p.roof],'curved-glazed-roof');
  // Fascia, soffit rafters and rolled tile ends follow the same curved surface.
  const ends=perimeter(p.sides,radius);ring(group,ends,.018,edge,.014);
  ring(group,perimeter(p.sides,radius*.96),-.025,m.paintedBlue,.019);
  const flutes=p.central?64:48;
  for(let i=0;i<flutes;i++) {
    const u=i/flutes;
    for(let j=0;j<7;j++)rod(group,m[p.roof],point(u,.13+j/7*.87).add(new THREE.Vector3(0,.008,0)),point(u,.13+(j+1)/7*.87).add(new THREE.Vector3(0,.008,0)),.006);
    rod(group,m.wood,point(u,.025).add(new THREE.Vector3(0,-.035,0)),point(u,.29).add(new THREE.Vector3(0,-.035,0)),.009);
    const end=point(u,0);post(group,edge,end.x,end.z,end.y-.009,end.y+.009,.012);
  }
  if(p.sides<16)for(let i=0;i<p.sides;i++)for(let j=0;j<10;j++) {
    const a=point(i/p.sides,j/10),b=point(i/p.sides,(j+1)/10);a.y+=.014;b.y+=.014;rod(group,edge,a,b,.014);
  }
}

function lattice(g:THREE.Group,m:Materials,a:THREE.Vector2,b:THREE.Vector2,bottom:number,top:number) {
  const width=a.distanceTo(b),panel=new THREE.Group();panel.position.set((a.x+b.x)/2,0,(a.y+b.y)/2);panel.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);g.add(panel);
  box(panel,m.vermilion,0,bottom+.08,0,width,.16,.035);
  for(const y of [bottom+.16,top])box(panel,m.goldLeaf,0,y,0,width,.011,.025);
  for(const x of [-width/2,width/2])box(panel,m.vermilion,x,(bottom+top)/2,0,.022,top-bottom,.032);
  const lower=bottom+.18,upper=top-.025,columns=Math.max(3,Math.round(width/.055));
  for(let i=1;i<columns;i++)box(panel,m.wood,(i/columns-.5)*width,(lower+upper)/2,0,.009,upper-lower,.016);
  for(let y=lower+.055;y<upper;y+=.065)box(panel,m.wood,0,y,0,width,.009,.016);
}

export function createJingshanPavilion(id:number,m:Materials) {
  const p=jingshanPavilionProfile(id),g=new THREE.Group(),h=p.height;
  g.userData.osmId=id;g.userData.pavilionProfile=p;
  const platformTop=h*.075,firstEave=h*(p.central?.51:.57);
  for(const [radius,bottom,top] of [[p.platformRadius,0,platformTop*.65],[p.platformRadius*.96,platformTop*.65,platformTop]] as const) {
    const geometry=new THREE.CylinderGeometry(radius,radius,top-bottom,p.sides);geometry.rotateY(p.sides===4?Math.PI/4:Math.PI/p.sides);
    const stone=new THREE.Mesh(geometry,m.stone);stone.position.y=(bottom+top)/2;stone.name='pavilion-platform';g.add(stone);
  }
  const platformEdge=p.central?p.platformRadius/Math.SQRT2:p.platformRadius;
  for(const side of [-1,1])for(let i=0;i<3;i++)box(g,m.stone,0,platformTop*(i+1)/6,side*(platformEdge+.22-i*.08),p.central?.56:.35,platformTop*(i+1)/3,.14);

  const outer=perimeter(p.central?4:p.sides===8?8:6,p.bodyRadius),inner=outer.map(v=>v.clone().multiplyScalar(p.central?.56:.59));
  const columns=new THREE.Group();columns.name='pavilion-columns';g.add(columns);
  for(const [points,count] of [[outer,p.columnsPerSide],[inner,p.central?3:1]] as const) {
    for(let side=0;side<points.length;side++)for(let i=0;i<count;i++) {
      const a=points[side].clone().lerp(points[(side+1)%points.length],i/count);
      post(columns,m.stone,a.x,a.y,platformTop,platformTop+.045,.033);
      const column=post(columns,m.vermilion,a.x,a.y,platformTop+.045,firstEave-.065,.023);column.name='timber-column';
      // Layered dougong silhouettes; sizes are deliberately simplified.
      const bracket=new THREE.Group();bracket.position.set(a.x,firstEave-.1,a.y);bracket.rotation.y=Math.atan2(a.x,a.y);columns.add(bracket);
      for(let layer=0;layer<3;layer++) {
        box(bracket,layer%2?m.goldLeaf:m.paintedBlue,0,layer*.022,layer*.015,.085+layer*.025,.018,.075+layer*.035);
        for(const sign of [-1,1])box(bracket,m.paintedBlue,sign*(.027+layer*.009),layer*.022-.009,0,.019,.037,.055+layer*.02);
      }
    }
    ring(g,points,firstEave-.11,m.vermilion,.036);ring(g,points,firstEave-.067,m.paintedBlue,.023);
    ring(g,points,firstEave-.045,m.goldLeaf,.006);
  }
  // Enclosed inner bay with timber lattices; north/south doorways remain open.
  for(let i=0;i<inner.length;i++) {
    const a=inner[i],b=inner[(i+1)%inner.length],mid=a.clone().add(b).multiplyScalar(.5);
    if(Math.abs(mid.y)>Math.abs(mid.x)) {
      lattice(g,m,a,a.clone().lerp(b,.31),platformTop,firstEave-.15);
      lattice(g,m,a.clone().lerp(b,.69),b,platformTop,firstEave-.15);
    } else lattice(g,m,a,b,platformTop,firstEave-.15);
  }
  // Painted beam panels and gold lozenges make the open outer gallery legible.
  outer.forEach((a,i)=>{
    const b=outer[(i+1)%outer.length],count=p.central?5:1;
    for(let j=0;j<count;j++) {
      const v=a.clone().lerp(b,(j+.5)/count),plaque=new THREE.Group();plaque.position.set(v.x,firstEave-.1,v.y);plaque.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);g.add(plaque);
      box(plaque,m.paintedBlue,0,0,0,a.distanceTo(b)/count*.76,.065,.035);
      const diamond=box(plaque,m.goldLeaf,0,0,.02,.032,.032,.007);diamond.rotation.z=Math.PI/4;
    }
  });
  for(let tier=0;tier<p.tiers;tier++) {
    const top=tier===p.tiers-1;
    const radius=p.roofRadius*(p.central?[1,.81,.64][tier]:[1,.72][tier]);
    const y=h*(p.central?[.51,.655,.79][tier]:[.57,.745][tier]);
    roof(g,m,p,radius,y,h*(top?(p.central?.155:.18):.105),top,tier);
    if(!top) {
      const neck=perimeter(p.sides,radius*.56);
      ring(g,neck,y+h*.105,m.vermilion,.027);ring(g,neck,y+h*.12,m.paintedBlue,.02);
      for(const v of perimeter(p.central?4:8,radius*.56))post(g,m.vermilion,v.x,v.y,y+h*.085,y+h*.15,.018);
    }
  }
  // Lotus-like finial above the converging top roof; no oversized spike.
  post(g,m.goldLeaf,0,0,h*.92,h*.96,.018);
  for(const [r,y,height] of [[.041,.958,.025],[.028,.978,.025],[.012,.993,.014]] as const)post(g,m.goldLeaf,0,0,h*(y-height/2),h*(y+height/2),r);
  return g;
}
