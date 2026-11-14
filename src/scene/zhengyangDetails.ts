import * as THREE from 'three';
import type {Materials} from './materials';
import {roofSection} from './roofForms';
import {zhengyangCityPlatform,zhengyangCityRoofs} from './zhengyangLayout';

const cylinder=new THREE.CylinderGeometry(1,1,1,6);
const cube=new THREE.BoxGeometry(1,1,1);
function block(group:THREE.Group,material:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(cube,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);group.add(mesh);
}
function line(group:THREE.Group,material:THREE.Material,a:THREE.Vector3,b:THREE.Vector3,radius:number) {
  const mesh=new THREE.Mesh(cylinder,material),direction=b.clone().sub(a);
  mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(radius,direction.length(),radius);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());group.add(mesh);
}

/** Relief for the dedicated city tower, without changing its corrected envelope.
 * ZHENGYANG-CENTER supports grey barrel tiles / green glazed borders;
 * ZHENGYANG-FIRE-2020 p.2 supports masonry, the arch and surrounding galleries.
 * Joint spacing, tile density and moulding sections are schematic, not measured.
 */
export function zhengyangDetails(tower:THREE.Group,m:Materials) {
  const masonry=new THREE.Group();masonry.name='city-tower-masonry-details';tower.add(masonry);
  const {width,depth,height}=zhengyangCityPlatform;
  const halfWidth=(y:number)=>width/2-.25*y/height;
  const faceZ=(y:number)=>depth/2*(1-.10*y/height);
  // Coplanar seam ribbons follow the battered wall, with a clear arch exclusion.
  // Keeping the relief outside the arch also keeps the actual tunnel open.
  function faceStrip(points:[number,number][],side:number,material:THREE.Material) {
    const shape=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,y)));
    const geometry=new THREE.ShapeGeometry(shape),position=geometry.getAttribute('position');
    for(let i=0;i<position.count;i++)position.setZ(i,faceZ(position.getY(i))+.003);
    geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);mesh.rotation.y=side<0?Math.PI:0;masonry.add(mesh);
  }
  for(const side of [-1,1]) {
    for(let row=1;row<15;row++) {
      const y=row*.095,w=halfWidth(y)-.018,gap=y<.76?.41:0;
      const ranges=gap?[[-w,-gap],[gap,w]]:[[-w,w]];
      for(const [left,right] of ranges) {
        faceStrip([[left,y],[right,y],[right,y+.004],[left,y+.004]],side,m.civicStoneDark);
        for(let x=left+.15+(row%2)*.15;x<right-.02;x+=.30) {
          faceStrip([[x,y],[x+.004,y],[x+.004,y+.088],[x,y+.088]],side,m.civicStoneDark);
        }
      }
    }
    // Segmented voussoirs, following the arch rather than a dark painted decal.
    for(let i=0;i<13;i++) {
      const a=i*Math.PI/13+.012,b=(i+1)*Math.PI/13-.012;
      faceStrip([[.306*Math.cos(a),.329+.306*Math.sin(a)],
        [.385*Math.cos(a),.329+.385*Math.sin(a)],
        [.385*Math.cos(b),.329+.385*Math.sin(b)],
        [.306*Math.cos(b),.329+.306*Math.sin(b)]],side,m.stone);
    }
    for(const sign of [-1,1])for(let i=0;i<4;i++) {
      const y=.018+i*.078;
      faceStrip([[sign*.306,y],[sign*.385,y],[sign*.385,y+.073],[sign*.306,y+.073]],side,m.stone);
    }
    for(const sign of [-1,1]) {
      const left=sign<0?-halfWidth(.08):.40,right=sign<0?-.40:halfWidth(.08);
      faceStrip([[left,.025],[right,.025],[right,.08],[left,.08]],side,m.civicStoneDark);
    }
  }
  // Continue the horizontal courses around the short sides of the platform.
  for(const side of [-1,1])for(let row=1;row<15;row++) {
    const y=row*.095;
    const points=[[y,-faceZ(y)],[y,faceZ(y)],[y+.004,faceZ(y+.004)],[y+.004,-faceZ(y+.004)]];
    const vertices=points.map(([yy,z])=>[side*(halfWidth(yy)+.006),yy,z]);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));
    geometry.setIndex(side>0?[0,2,1,0,3,2]:[0,1,2,0,2,3]);geometry.computeVertexNormals();
    masonry.add(new THREE.Mesh(geometry,m.civicStoneDark));
  }

  for(const [w,d,y,rise] of zhengyangCityRoofs) {
    const detail=new THREE.Group();detail.name='city-tower-roof-details';detail.position.y=y;tower.add(detail);
    const point=(t:number,u:number,side:number,lift=.018)=>{
      const p=roofSection(w,d,rise,t,'hip-gable');
      return new THREE.Vector3(u*p.w,p.y+p.corner*Math.abs(u)+lift,side*p.d);
    };
    // Sample the same eight rings as the roof, so relief never cuts through it.
    const tiles=Math.ceil(w/.10);
    for(const side of [-1,1])for(let tile=1;tile<tiles;tile++) {
      const x=(-.5+tile/tiles)*w;
      const tilePoint=(t:number)=>{
        const p=roofSection(w,d,rise,t,'hip-gable');
        return point(t,x/p.w,side);
      };
      // Parallel front tile courses end at the hips instead of fanning inward.
      const end=Math.abs(x)<=w*.34?1:(w/2-Math.abs(x))/(w*.16)*(3/8);
      for(let ring=0;ring<8&&ring/8<end;ring++)line(detail,m.flatRoof,tilePoint(ring/8),tilePoint(Math.min((ring+1)/8,end)),.009);
    }
    // Side hips stop at the gable shoulder; their tile rows follow that surface.
    for(const side of [-1,1])for(let tile=1;tile<14;tile++) {
      const u=-1+2*tile/14;
      const hipPoint=(t:number)=>{
        const p=roofSection(w,d,rise,t,'hip-gable');
        return new THREE.Vector3(side*p.w,p.y+p.corner*Math.abs(u)+.018,u*p.d);
      };
      for(let ring=0;ring<3;ring++)line(detail,m.flatRoof,hipPoint(ring/8),hipPoint((ring+1)/8),.009);
    }
    // Four sloping green ridges also frame the gables above the shoulder.
    for(const side of [-1,1])for(const end of [-1,1])for(let ring=0;ring<8;ring++) {
      line(detail,m.green,point(ring/8,end,side,.018),point((ring+1)/8,end,side,.018),.014);
    }
    for(const side of [-1,1]) {
      for(const end of [-1,1])line(detail,m.green,point(0,0,side,.015),point(0,end,side,.015),.018);
      const p=roofSection(w,d,rise,0,'hip-gable');
      for(const end of [-1,1])line(detail,m.green,new THREE.Vector3(side*p.w,.015,0),point(0,side,end,.015),.018);
    }
    const ridge=roofSection(w,d,rise,1,'hip-gable').w;
    block(detail,m.green,0,rise+.018,0,ridge*2,.036,.07);
  }

  // The upper gallery needs a separate floor edge and low open timber railing.
  const gallery=new THREE.Group();gallery.name='city-tower-gallery-details';tower.add(gallery);
  const w=3.50,d=1.50,base=2.75;
  for(const angle of [0,Math.PI,Math.PI/2,-Math.PI/2]) {
    const face=new THREE.Group();face.rotation.y=angle;gallery.add(face);
    const front=angle===0||angle===Math.PI,span=front?w:d,cross=front?d:w,bays=front?7:3;
    block(face,m.vermilion,0,base+.025,cross/2,span,.05,.07);
    block(face,m.vermilion,0,base+.17,cross/2,span,.025,.035);
    for(let i=1;i<bays*3;i++)block(face,m.vermilion,-span/2+i*span/(bays*3),base+.10,cross/2,.015,.13,.025);
  }
}
