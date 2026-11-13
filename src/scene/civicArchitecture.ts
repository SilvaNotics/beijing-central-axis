import * as THREE from 'three';
import type { Materials } from './materials';
import { civicLayouts, civicColumnPositions, type CivicKind } from './civicLayout';

function box(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,name?:string) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);if(name)mesh.name=name;g.add(mesh);return mesh;
}
function cylinder(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,r:number,h:number) {
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),m);mesh.position.set(x,y,z);g.add(mesh);return mesh;
}
function cornice(g:THREE.Group,m:Materials,x:number,z:number,w:number,d:number,y:number) {
  box(g,m.civicStone,x,y,z,w+.16,.12,d+.16);
  box(g,m.green,x,y+.105,z,w+.25,.09,d+.25);
  box(g,m.bronzeRoof,x,y+.19,z,w+.39,.08,d+.39);
  box(g,m.civicStoneDark,x,y+.25,z,w+.45,.04,d+.45);
}
function windowBay(g:THREE.Group,m:Materials,x:number,y:number,z:number,w:number,h:number) {
  box(g,m.glass,x,y,z,w,h,.035);
  for(const side of [-1,1])box(g,m.civicStone,x+side*(w/2+.04),y,z+.025,.07,h+.10,.07);
  for(let row=0;row<5;row++)box(g,m.civicStoneDark,x,y-h/2+row*h/4,z+.04,w,.025,.025);
  box(g,m.civicStoneDark,x,y,z+.04,.025,h,.025);
  box(g,m.civicStone,x,y-h/2-.04,z+.06,w+.16,.08,.12);
}
function star(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,r:number) {
  const shape=new THREE.Shape();
  for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,rr=i%2?r*.40:r,px=Math.cos(a)*rr,py=Math.sin(a)*rr;if(i===0)shape.moveTo(px,py);else shape.lineTo(px,py);}
  shape.closePath();const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),m);mesh.position.set(x,y,z);g.add(mesh);
}
function emblem(g:THREE.Group,m:Materials,y:number,z:number,museum:boolean) {
  const badge=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.055,40),m.flagRed);badge.rotation.x=Math.PI/2;badge.position.set(0,y,z);g.add(badge);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.28,.022,6,40),m.goldLeaf);rim.position.set(0,y,z+.04);g.add(rim);
  star(g,m.goldLeaf,0,y+.08,z+.05,.11);
  if(museum) {
    for(const side of [-1,1])for(let fold=0;fold<5;fold++) {
      const x=side*(.34+fold*.10);box(g,m.flagRed,x,y-.04,z-.015,.12,.38-fold*.025,.035);
      box(g,m.goldLeaf,x,y+.15-fold*.012,z+.015,.012,.08,.025);
    }
  } else {
    for(const side of [-1,1])for(let i=0;i<4;i++)star(g,m.goldLeaf,side*(.12+i*.015),y+.02+i*.03,z+.05,.025);
    box(g,m.goldLeaf,0,y-.09,z+.05,.28,.06,.015);
    box(g,m.goldLeaf,0,y-.045,z+.05,.23,.035,.015);
  }
}

export function createCivicBuilding(kind:CivicKind,m:Materials,x:number,z:number) {
  const p=civicLayouts[kind],museum=kind==='museum',g=new THREE.Group();g.name=p.name;g.userData.civicKind=kind;
  g.position.set(x,0,z);g.rotation.y=p.rotation;
  const front=p.depth/2,top=p.floor+p.columnHeight;
  box(g,m.civicStoneDark,0,.14,0,p.width+.5,.28,p.depth+.5);
  for(const [index,b] of p.blocks.entries()) {
    box(g,m.civicStone,b.x,p.floor+b.height/2,b.z,b.width,b.height,b.depth,`volume-${index}`);
    // Flat roof slabs and parapets, not hipped palace roofs.
    box(g,m.flatRoof,b.x,p.floor+b.height+.05,b.z,b.width,.10,b.depth);
    for(let seam=1;seam<Math.floor(b.width/2);seam++)box(g,m.civicStoneDark,b.x-b.width/2+seam*2,p.floor+b.height+.105,b.z,.012,.008,b.depth-.28);
    for(const side of [-1,1]) {
      box(g,m.civicStone,b.x+side*(b.width/2-.07),p.floor+b.height+.17,b.z,.14,.24,b.depth);
      box(g,m.civicStone,b.x,p.floor+b.height+.17,b.z+side*(b.depth/2-.07),b.width,.24,.14);
    }
  }
  // The museum's western colonnade stands in front of the newer recessed hall.
  // The Great Hall's foyer glazing is set behind its twelve round columns.
  const glazingZ=museum?6.28:front-.94;
  for(let i=0;i<11;i++)windowBay(g,m,-p.porticoWidth*.41+i*p.porticoWidth*.82/10,p.floor+1.22,glazingZ,.55,2.2);
  const porch=new THREE.Group();porch.name='entrance-portico';g.add(porch);
  box(porch,m.civicStone,0,p.floor-.04,front-.55,p.porticoWidth+.8,.12,1.55);
  civicColumnPositions(p).forEach((px,i)=>{
    const column=new THREE.Group();column.name=`portico-column-${i}`;column.position.set(px,p.floor,front-.12);column.userData.section=museum?'square':'fluted-round';
    if(museum) {
      box(column,m.civicStone,0,p.columnHeight/2,0,.22,p.columnHeight,.25);
      for(const side of [-1,1])box(column,m.civicStoneDark,side*.092,p.columnHeight/2,.13,.013,p.columnHeight-.06,.012);
    } else {
      const geometry=new THREE.CylinderGeometry(.10,.115,p.columnHeight,48,1);
      const vertices=geometry.getAttribute('position');
      for(let j=0;j<vertices.count;j++) {
        const xx=vertices.getX(j),zz=vertices.getZ(j),factor=1+.045*Math.cos(Math.atan2(zz,xx)*12);
        vertices.setX(j,xx*factor);vertices.setZ(j,zz*factor);
      }
      geometry.computeVertexNormals();const shaft=new THREE.Mesh(geometry,m.civicStone);shaft.position.y=p.columnHeight/2;column.add(shaft);
      cylinder(column,m.civicStoneDark,0,.05,0,.14,.10);
      cylinder(column,m.civicStone,0,p.columnHeight-.035,0,.15,.10);
    }
    box(column,m.civicStone,0,.035,0,.31,.07,.34);
    box(column,m.civicStone,0,p.columnHeight+.025,0,.34,.09,.37);porch.add(column);
  });
  // Open bays remain empty between the columns and glazing.
  box(porch,m.civicStone,0,top+.25,front-.25,p.porticoWidth+.55,.42,.85,'frieze');
  for(let i=0;i<12;i++) {
    const px=-p.porticoWidth*.45+i*p.porticoWidth*.9/11;
    box(porch,m.civicStoneDark,px,top+.25,front+.19,.54,.25,.025);
    for(const side of [-1,1])box(porch,m.civicStone,px+side*.20,top+.25,front+.22,.035,.20,.025);
    const motif=new THREE.Mesh(new THREE.TorusGeometry(.075,.013,4,12),m.civicStone);motif.position.set(px,top+.25,front+.23);porch.add(motif);
  }
  cornice(porch,m,0,front-.25,p.porticoWidth+.7,1.08,top+.49);
  for(const side of [-1,1]) {
    const px=side*(p.porticoWidth/2+.67),height=museum?top+.88:top+.53;
    box(g,m.civicStone,px,p.floor+(height-p.floor)/2,front-.5,1.20,height-p.floor,1.25);
    cornice(g,m,px,front-.5,1.22,1.3,height);
    if(museum) {
      box(g,m.civicStone,px,height+.39,front-.5,1.06,.18,1.10);
      box(g,m.bronzeRoof,px,height+.51,front-.5,.85,.07,.90);
    }
  }
  for(let i=0;i<8;i++)box(g,m.civicStone,0,(8-i)*p.floor/8/2,front+.08+i*.14,p.porticoWidth+1.2,(8-i)*p.floor/8,.17);
  // Long wings have individual window reveals; the north/south elevations use
  // the same real openings rather than solid blank end walls.
  for(const side of [-1,1]) {
    for(let i=0;i<8;i++)windowBay(g,m,side*(8.2+i*.98),p.floor+1.40,front+.018,.58,2.10);
    const end=new THREE.Group();end.position.set(side*(museum?16.4:p.width/2),0,0);end.rotation.y=side*Math.PI/2;
    for(let i=0;i<16;i++) {
      const along=-p.depth*.44+i*p.depth*.88/15;
      windowBay(end,m,along,p.floor+1.40,museum&&-side*along>5.95?.165:.015,.54,2.10);
    }
    g.add(end);
    cornice(g,m,side*12,front-.32,9.5,.8,p.floor+2.95);
  }
  emblem(g,m,top+(museum?.77:.28),front+.57,museum);
  for(let i=-5;i<=5;i++)cylinder(g,m.civicStoneDark,i*.95,top+1.02,front-.25,.012,.78);
  if(museum) {
    for(const side of [-1,1])for(let row=0;row<2;row++)box(g,m.park,side*9.7,p.floor+3.50,-5.7+row*7,9,.035,5.6);
    // Preserve the central courtyard in gmp's published plan instead of
    // filling the entire new museum with a single solid roof volume.
    box(g,m.paving,0,p.floor,-4.5,6,.08,5,'inner-courtyard');
    for(const side of [-1,1]) {
      const courtWall=new THREE.Group();courtWall.position.set(side*2.98,0,-4.5);courtWall.rotation.y=-side*Math.PI/2;
      for(let i=0;i<5;i++)windowBay(courtWall,m,-1.8+i*.9,p.floor+1.5,0,.65,2.5);
      g.add(courtWall);
    }
    box(g,m.civicStone,0,4.02,2.1,5.2,.30,7.3);
    box(g,m.civicStoneDark,0,4.22,2.1,5.35,.06,7.45);
    box(g,m.glass,0,p.floor+3.05,6.28,31.9,.45,.035);
    for(let i=-20;i<=20;i++)box(g,m.civicStone,i*.77,p.floor+3.05,6.31,.035,.49,.055);
  } else {
    box(g,m.civicStoneDark,0,4.58,-2.2,8.6,.10,9.5);
  }
  return g;
}

/** Stepped marble base and rectangular granite stele, interpreted from photos. */
export function createMonument(m:Materials,x:number,z:number) {
  const g=new THREE.Group();g.name='人民英雄纪念碑';g.position.set(x,0,z);
  const terraces=[[5.06,6.15,.10,.20],[4.05,5.15,.34,.28]] as const;
  for(const [w,d,y,h] of terraces) {
    box(g,m.marble,0,y,0,w,h,d);
    for(const face of [-1,1])for(let i=-7;i<=7;i++)if(Math.abs(i)>1) {
      const px=i*w*.061,pz=face*(d/2-.13);box(g,m.marble,px,y+h/2+.13,pz,.045,.26,.045);
      box(g,m.marble,px,y+h/2+.22,pz,w*.062,.035,.035);
    }
    for(const side of [-1,1])for(let i=-6;i<=6;i++)if(Math.abs(i)>1) {
      const pz=i*d*.071,px=side*(w/2-.13);box(g,m.marble,px,y+h/2+.13,pz,.045,.26,.045);
      box(g,m.marble,px,y+h/2+.22,pz,.035,.035,d*.072);
    }
  }
  for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
    const flight=new THREE.Group();flight.rotation.y=angle;
    for(const [w,d,y,h] of terraces) {
      const edge=(Math.abs(Math.sin(angle))>.5?w:d)/2;
      for(let i=0;i<4;i++)box(flight,m.marble,0,y-h/2+(i+1)*h/4-.025,edge+.30-i*.11,.72,.05,.14);
    }
    g.add(flight);
  }
  // Two plinths with projecting mouldings and recessed relief panels.
  box(g,m.marble,0,.69,0,2.40,.40,2.85);
  box(g,m.marble,0,.49,0,2.62,.10,3.07);box(g,m.marble,0,.91,0,2.55,.13,3.0);
  for(const face of [-1,1])for(let panel=0;panel<3;panel++) {
    const relief=new THREE.Group();relief.position.set((panel-1)*.73,.69,face*1.438);relief.rotation.y=face===1?0:Math.PI;
    box(relief,m.civicStoneDark,0,0,0,.67,.26,.025);
    // Low-relief groups are schematic sculptural motifs, not reconstructions
    // of the historical scenes carved on the original monument.
    for(let figure=0;figure<5;figure++) {
      const px=-.25+figure*.12,py=(figure%2)*.02;
      cylinder(relief,m.marble,px,py+.055,.025,.024,.04);
      box(relief,m.marble,px,py-.02,.023,.045,.10,.027);
      for(const side of [-1,1])box(relief,m.marble,px+side*.018,py-.09,.023,.015,.06,.025);
    }
    g.add(relief);
  }
  for(const side of [-1,1]) {
    const relief=new THREE.Group();relief.name='side-relief';relief.position.set(side*1.213,.69,0);relief.rotation.y=side*Math.PI/2;
    box(relief,m.civicStoneDark,0,0,0,2.50,.26,.025);
    for(let figure=0;figure<17;figure++) {
      const px=-1.12+figure*.14;
      cylinder(relief,m.marble,px,.055,.028,.025,.04);
      box(relief,m.marble,px,-.02,.025,.05,.10,.03);
      for(const leg of [-1,1])box(relief,m.marble,px+leg*.019,-.09,.025,.016,.06,.025);
    }
    g.add(relief);
  }
  box(g,m.marble,0,1.06,0,1.52,.22,1.76);
  box(g,m.marble,0,1.19,0,1.70,.10,1.92);
  const shaft=new THREE.Mesh(new THREE.BoxGeometry(.94,2.25,.52),m.marble);shaft.position.y=2.365;shaft.name='granite-stele';g.add(shaft);
  // Gold front inscription sits on the north face; long rear text uses its own
  // local canvas map. Materials are disposed with the scene palette.
  box(g,m.monumentFront,0,2.35,-.267,.64,1.78,.014,'north-inscription');
  box(g,m.monumentBack,0,2.35,.267,.65,1.78,.014,'south-inscription');
  box(g,m.marble,0,3.53,0,1.07,.08,.65);
  box(g,m.marble,0,3.62,0,1.16,.10,.72);
  box(g,m.marble,0,3.71,0,1.04,.08,.62);
  box(g,m.marble,0,3.777,0,.87,.034,.48);
  return g;
}
