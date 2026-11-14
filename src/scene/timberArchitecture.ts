import * as THREE from 'three';
import type { Materials } from './materials';

const cube=new THREE.BoxGeometry(1,1,1);
const shaft=new THREE.CylinderGeometry(1,1.12,1,10);
function block(group:THREE.Group,material:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(cube,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);group.add(mesh);return mesh;
}

/** Recessed enclosure and a continuous, open perimeter colonnade by default.
 * Flush infill joins the columns for the exposed room between double eaves.
 * Dimensions include the veranda; all details remain under the supplied roof.
 * Ornament is schematic, informed by Palace Museum exterior photographs.
 */
export function timberBody(group:THREE.Group,m:Materials,width:number,depth:number,height:number,base:number,rich=true,options?:{frontBays?:number;sideBays?:number;enclosure?:'flush'}) {
  const body=new THREE.Group();body.position.y=base;group.add(body);
  const radius=Math.min(.065,height*.055,Math.min(width,depth)*.055);
  const porch=options?.enclosure==='flush'?radius:Math.min(.30,Math.min(width,depth)*.13);
  const wallW=width-porch*2,wallD=depth-porch*2;
  const core=block(body,m.vermilion,0,height*.48,0,wallW,height*.96,wallD);core.name='timber-enclosure';
  const faces=[
    {name:'south',span:width,cross:depth,angle:0},
    {name:'north',span:width,cross:depth,angle:Math.PI},
    {name:'east',span:depth,cross:width,angle:Math.PI/2},
    {name:'west',span:depth,cross:width,angle:-Math.PI/2},
  ];
  for(const face of faces) {
    const facade=new THREE.Group();facade.rotation.y=face.angle;body.add(facade);
    const windows=new THREE.Group();windows.name=`timber-windows-${face.name}`;facade.add(windows);
    const columns=new THREE.Group();columns.name=`timber-columns-${face.name}`;facade.add(columns);
    const span=face.span-radius*2,outer=face.cross/2-radius,wall=face.cross/2-porch;
    const specified=face.name==='north'||face.name==='south'?options?.frontBays:options?.sideBays;
    const bays=specified??Math.max(1,Math.min(rich?11:14,Math.round(span/(rich?.66:.72))));
    const spacing=span/bays;
    // Stone column shoes and slender red shafts are separate from the doors.
    for(let i=0;i<=bays;i++) {
      if((face.name==='east'||face.name==='west')&&(i===0||i===bays))continue;
      const x=-span/2+i*spacing;
      block(columns,m.stone,x,.035,outer,radius*2.7,.07,radius*2.7);
      const column=new THREE.Mesh(shaft,m.vermilion);column.position.set(x,height*.46+.055,outer);column.scale.set(radius,height*.87,radius);columns.add(column);
      // Crossed timber blocks, scaled to the bay instead of oversized cubes.
      const arm=Math.min(spacing*.48,.28);
      block(columns,m.green,x,height*.90,outer,arm,.06,Math.min(porch*1.2,.24));
      block(columns,m.wood,x,height*.945,outer,arm*.68,.04,Math.min(porch*1.5,.30));
      if(rich)block(columns,m.goldLeaf,x,height*.915,outer+radius*.8,arm*.72,.018,.018);
    }
    // Continuous painted architrave, with a thin gold line under the eaves.
    block(facade,m.green,0,height*.83,outer,face.span,.13,.085);
    block(facade,m.wood,0,height*.965,outer,face.span,.055,.10);
    block(facade,m.goldLeaf,0,height*.815,outer+.045,face.span,.012,.012);
    const wallSpan=face.span-porch*2;
    const windowBays=specified??Math.max(1,Math.min(rich?11:14,Math.round(wallSpan/(rich?.64:.72))));
    const bay=wallSpan/windowBays,panelW=bay*.76,panelH=height*.61;
    for(let i=0;i<windowBays;i++) {
      const x=-wallSpan/2+(i+.5)*bay,y=height*.43;
      block(windows,m.window,x,y,wall+.012,panelW,panelH,.025);
      for(const side of [-1,1])block(windows,m.wood,x+side*panelW/2,y,wall+.031,.025,panelH+.05,.026);
      for(const yy of [y-panelH/2,y+panelH*.10,y+panelH/2])block(windows,m.wood,x,yy,wall+.032,panelW,.023,.026);
      // Lower solid panels and upper lattice remain readable from the side.
      block(windows,m.vermilion,x,y-panelH*.31,wall+.032,panelW*.89,panelH*.25,.023);
      const slats=rich?4:2;
      for(let j=1;j<=slats;j++)block(windows,m.ridge,x-panelW/2+j*panelW/(slats+1),y+panelH*.22,wall+.047,.012,panelH*.48,.012);
      for(const yy of [.18,.34])block(windows,m.ridge,x,y+panelH*yy,wall+.048,panelW,.012,.012);
      if(rich) {
        const diamond=block(windows,m.goldLeaf,x,y+panelH*.26,wall+.055,panelW*.14,panelW*.14,.012);diamond.rotation.z=Math.PI/4;
        // Separate panels between columns on the painted beam, not whole-wall stripes.
        block(facade,m.paintedBlue,x,height*.83,outer+.047,bay*.65,.065,.012);
        block(facade,m.goldLeaf,x,height*.83,outer+.056,bay*.37,.009,.009);
      }
    }
  }
  return body;
}

/** A shallow tile apron following the actual roof where a flush upper room emerges.
 * This is a schematic transition, not a measured historical construction detail.
 */
export function timberRoofApron(body:THREE.Group,roof:THREE.Mesh,material:THREE.Material) {
  const core=body.getObjectByName('timber-enclosure') as THREE.Mesh;
  const halfW=core.scale.x/2,halfD=core.scale.z/2;
  const perimeter:THREE.Vector2[]=[];
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
  for(let side=0;side<4;side++) {
    const a=corners[side],b=corners[(side+1)%4];
    const length=side%2===0?halfW*2:halfD*2;
    const steps=Math.max(4,Math.min(16,Math.ceil(length/.3)));
    for(let i=0;i<steps;i++)perimeter.push(new THREE.Vector2(a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps));
  }
  body.updateWorldMatrix(true,false);roof.updateWorldMatrix(true,false);
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0).transformDirection(body.matrixWorld);
  const positions:number[]=[],indices:number[]=[];
  // The inner lip sits slightly inside the wall; the outer edge settles onto tiles.
  for(const [outset,lift] of [[-.012,.055],[.045,.030],[.11,.006]]) {
    for(const point of perimeter) {
      const x=point.x*(halfW+outset),z=point.y*(halfD+outset);
      ray.set(body.localToWorld(new THREE.Vector3(x,core.scale.y+10,z)),down);
      const hit=ray.intersectObject(roof,false)[0];
      // Small/narrow halls can place part of the room beyond the lower roof.
      // Leave those models unchanged rather than fabricate a surface height.
      if(!hit)return;
      positions.push(x,body.worldToLocal(hit.point).y+lift,z);
    }
  }
  const count=perimeter.length;
  for(let ring=0;ring<2;ring++)for(let i=0;i<count;i++) {
    const a=ring*count+i,b=a+count,c=ring*count+(i+1)%count,d=c+count;
    indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const apron=new THREE.Mesh(geometry,material);apron.name='timber-roof-apron';body.add(apron);
}

/** A downward-facing soffit with a hole above the room and visible rafter ends. */
export function timberEaves(group:THREE.Group,m:Materials,width:number,depth:number,coreW:number,coreD:number,y:number,rich=true) {
  const shape=new THREE.Shape();
  shape.moveTo(-width/2,-depth/2);shape.lineTo(width/2,-depth/2);shape.lineTo(width/2,depth/2);shape.lineTo(-width/2,depth/2);shape.closePath();
  const hole=new THREE.Path();hole.moveTo(-coreW/2,-coreD/2);hole.lineTo(-coreW/2,coreD/2);hole.lineTo(coreW/2,coreD/2);hole.lineTo(coreW/2,-coreD/2);hole.closePath();shape.holes.push(hole);
  const soffit=new THREE.Mesh(new THREE.ShapeGeometry(shape),m.wood);soffit.rotation.x=Math.PI/2;soffit.position.y=y-.045;soffit.name='timber-eave-underside';group.add(soffit);
  const fascia=Math.min(.06,depth*.065);
  for(const side of [-1,1]) {
    block(group,m.ridge,0,y-.012,side*(depth/2-fascia/2),width,.07,fascia);
    block(group,m.ridge,side*(width/2-fascia/2),y-.012,0,fascia,.07,depth);
  }
  if(!rich)return;
  const countW=Math.min(48,Math.max(6,Math.round(width/.14)));
  const countD=Math.min(30,Math.max(4,Math.round(depth/.14)));
  for(let i=0;i<countW;i++)for(const side of [-1,1]) {
    const x=-width*.48+i*width*.96/(countW-1);
    block(group,m.green,x,y-.045,side*(depth/2-.12),.025,.04,.19);
  }
  for(let i=0;i<countD;i++)for(const side of [-1,1]) {
    const z=-depth*.47+i*depth*.94/(countD-1);
    block(group,m.green,side*(width/2-.12),y-.045,z,.19,.04,.025);
  }
}
