import * as THREE from 'three';
import type { Materials } from './materials';
import { roofGeometry,roofGables } from './roofForms';
import { timberEaves } from './timberArchitecture';
import type { FootprintLayout } from './geodata';

const cube=new THREE.BoxGeometry(1,1,1);
function block(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);g.add(mesh);return mesh;
}

/** White-stone six-post, three-passage Lingxing form; each doorway has its own pair. */
export function lingxingGate(m:Materials,width:number) {
  const group=new THREE.Group();group.name='棂星门';
  const postHeight=.74;
  for(const x of [-.48,-.31,-.16,.16,.31,.48]) {
    const post=block(group,m.marble,x*width,postHeight/2,0,.055,postHeight,.075);post.name='lingxing-post';
    block(group,m.stone,x*width,.035,0,.10,.07,.14);
    block(group,m.marble,x*width,postHeight+.015,0,.09,.06,.11);
    const finial=new THREE.Mesh(new THREE.SphereGeometry(.038,8,6),m.marble);finial.position.set(x*width,postHeight+.07,0);group.add(finial);
  }
  for(const [left,right] of [[-.48,-.31],[-.16,.16],[.31,.48]]) {
    block(group,m.marble,(left+right)*width/2,.60,0,(right-left)*width,.075,.08);
    block(group,m.stone,(left+right)*width/2,.65,0,(right-left)*width+.035,.025,.11);
    // Open red lattice leaves fold alongside the piers, retaining clear passages.
    for(const [hinge,side] of [[left,1],[right,-1]]) {
      const leaf=new THREE.Group();leaf.position.set(hinge*width,.10,0);group.add(leaf);
      const d=(right-left)*width*.43;
      for(const z of [0,-d])block(leaf,m.vermilion,side*.025,.22,z,.022,.44,.025);
      for(const y of [0,.12,.44])block(leaf,m.vermilion,side*.025,y,-d/2,.025,.025,d);
      for(let i=1;i<5;i++)block(leaf,m.vermilion,side*.025,.29,-d*i/5,.015,.28,.012);
    }
  }
  return group;
}

/** Small masonry enclosure gates have real passages, rather than a red infill box. */
export function masonryTempleGate(m:Materials,p:Pick<FootprintLayout,'width'|'depth'|'height'>,roofMaterial:THREE.Material) {
  const g=new THREE.Group();g.name='masonry-temple-gate';
  const w=p.width-.025,d=Math.max(.10,p.depth-.03),h=Math.max(.42,Math.min(.85,p.height));
  const centers=w>1.2?[-w*.29,0,w*.29]:[0],opening=w>1.2?w*.17:w*.40,top=h*.77;
  const outline=new THREE.Shape();outline.moveTo(-w/2,0);outline.lineTo(w/2,0);outline.lineTo(w/2,h);outline.lineTo(-w/2,h);outline.closePath();
  const arch=(width:number,height:number,x:number)=>{
    const r=width/2,path=new THREE.Path();path.moveTo(x-r,.008);path.lineTo(x+r,.008);path.lineTo(x+r,height-r);path.absarc(x,height-r,r,0,Math.PI,false);path.lineTo(x-r,.008);path.closePath();return path;
  };
  for(const x of centers)outline.holes.push(arch(opening,top,x));
  const body=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:d,bevelEnabled:false,curveSegments:12}),m.wall);body.position.z=-d/2;body.name='gate-pierced-wall';g.add(body);
  for(const side of [-1,1])for(const x of centers) {
    const trim=new THREE.Shape(arch(opening+.045,top+.025,x).getPoints(24));trim.holes.push(arch(opening,top,x));
    const stones=new THREE.Mesh(new THREE.ShapeGeometry(trim),m.stone);stones.position.z=side*(d/2+.003);if(side<0)stones.rotation.y=Math.PI;g.add(stones);
    for(const hinge of [-1,1]) {
      // Door leaves lie against the reveal; nail rows remain visible on oblique views.
      block(g,m.vermilion,x+hinge*(opening/2-.018),top*.38,side*d*.20,.025,top*.72,d*.40);
      for(let row=1;row<5;row++)block(g,m.brass,x+hinge*(opening/2-.033),top*.15+row*top*.10,side*d*.20,.012,.012,.018);
    }
  }
  block(g,m.green,0,h-.015,0,w,.06,d+.015);
  const rise=Math.min(.32,Math.max(.13,d*.65));
  const roof=new THREE.Mesh(roofGeometry(w+.025,p.depth,rise,'hip-gable'),roofMaterial);roof.position.y=h+.03;g.add(roof);
  const gables=roofGables(w+.025,p.depth,rise,'hip-gable',m.wood);gables.position.y=h+.03;g.add(gables);
  timberEaves(g,m,w+.025,p.depth,w*.92,d*.85,h+.03,false);
  block(g,m.ridge,0,h+rise+.04,0,w*.68,.025,.04);
  for(const side of [-1,1])block(g,m.stone,0,h*.91,side*(d/2+.01),w*.18,.055,.014);
  return g;
}
