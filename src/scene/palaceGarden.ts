import * as THREE from 'three';
import type {Landmark} from '../data/types';
import type {Materials} from './materials';
import {localFootprintLayout,wgs84ToGcj02,type CityData} from './geodata';
import {project} from './geo';
import {roofGeometry} from './roofForms';
import {timberBody,timberEaves} from './timberArchitecture';
const cube=new THREE.BoxGeometry(1,1,1);
function block(g:THREE.Group,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number) {
  const mesh=new THREE.Mesh(cube,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);g.add(mesh);return mesh;
}
export function palaceGardenLayout(site:Landmark,data?:CityData) {
  const b=data?.buildings.find(b=>b.id===42424174);
  if(b){const p=localFootprintLayout(b,site);return {...p,rotation:p.rotation-Math.round(p.rotation/(Math.PI/2))*(Math.PI/2)};}
  const [x,z]=project(wgs84ToGcj02([116.390934,39.920507])),[ox,oz]=project(site.coords);
  return {x:x-ox,z:z-oz,width:.8,depth:.8,rotation:0,height:0};
}
/** Duixiu's 10 m hill, frontal cave and two stairways are documented.
 * Porous stone profiles, steps and the envelope are interpreted from museum photos.
 */
export function createPalaceGarden(site:Landmark,m:Materials,data?:CityData) {
  const p=palaceGardenLayout(site,data),g=new THREE.Group();g.name='堆秀山';g.position.set(p.x,0,p.z);g.rotation.y=p.rotation;
  const outline=new THREE.Shape();
  outline.moveTo(-1.12,0);outline.lineTo(-1.18,.20);outline.lineTo(-.99,.46);outline.lineTo(-1.04,.66);outline.lineTo(-.77,.88);outline.lineTo(-.51,1.0);outline.lineTo(.54,1.0);outline.lineTo(.82,.90);outline.lineTo(.99,.65);outline.lineTo(.92,.39);outline.lineTo(1.13,.23);outline.lineTo(1.12,0);
  // The cave is an open-bottom notch through the body, not a black decal.
  outline.lineTo(.24,0);outline.lineTo(.24,.27);outline.absarc(0,.27,.24,0,Math.PI,false);outline.lineTo(-.24,0);outline.closePath();
  const bodyGeometry=new THREE.ExtrudeGeometry(outline,{depth:1.35,bevelEnabled:false,curveSegments:14});
  const positions=bodyGeometry.getAttribute('position'),colors:number[]=[];
  for(let i=0;i<positions.count;i++){const shade=.68+Math.sin(positions.getX(i)*14+positions.getY(i)*19)*.10;colors.push(shade,shade,shade*.95);}
  bodyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const body=new THREE.Mesh(bodyGeometry,m.gardenRock);body.position.z=-.675;body.name='duixiu-cave-body';g.add(body);
  // Fragmented limestone ledges and darker pits break the artificial solid face.
  for(let row=0;row<5;row++)for(let col=0;col<11;col++) {
    const x=(col-5)*.20+.045*Math.sin(row*7+col),y=.10+row*.19;
    if(Math.abs(x)<.32&&y<.58)continue;
    const geom=new THREE.IcosahedronGeometry(1,1),p=geom.getAttribute('position'),c:number[]=[];
    for(let i=0;i<p.count;i++) {
      const xx=p.getX(i),yy=p.getY(i),zz=p.getZ(i),n=.84+.14*Math.sin(xx*9+yy*7+zz*13+col+row*2);
      p.setXYZ(i,xx*n,yy*n,zz*n);const shade=.66+.13*Math.sin(xx*5+yy*8+col);c.push(shade,shade,shade*.95);
    }
    geom.setAttribute('color',new THREE.Float32BufferAttribute(c,3));geom.computeVertexNormals();
    const rock=new THREE.Mesh(geom,m.gardenRock);rock.name='porous-limestone';rock.position.set(x,y,.66+.03*Math.sin(col*3+row));rock.scale.set(.13,.14,.12);g.add(rock);
  }
  for(const side of [-1,1])for(let i=0;i<16;i++) {
    const z=.68-i*.081,h=(i+1)/16;
    block(g,m.stone,side*(.91-i*.022),h-.025,z,.20,.05,.10).name='duixiu-side-step';
  }
  const pavilion=new THREE.Group();pavilion.name='御景亭';pavilion.userData.osmId=42424174;pavilion.position.y=1.0;g.add(pavilion);
  block(pavilion,m.stone,0,.035,0,.98,.07,.98);
  timberBody(pavilion,m,.76,.76,.60,.07,true,{frontBays:1,sideBays:1});
  const roof=new THREE.Mesh(roofGeometry(1.08,1.08,.35,'pyramidal'),m.green);roof.position.y=.68;pavilion.add(roof);
  timberEaves(pavilion,m,1.08,1.08,.66,.66,.68);
  for(const side of [-1,1]) {
    block(pavilion,m.gold,0,.69,side*.54,1.08,.026,.035);block(pavilion,m.gold,side*.54,.69,0,.035,.026,1.08);
    for(let i=0;i<5;i++) {
      const x=-.45+i*.225;
      block(pavilion,m.stone,x,.19,side*.45,.026,.26,.026);block(pavilion,m.stone,side*.45,.19,x,.026,.26,.026);
    }
    block(pavilion,m.stone,0,.29,side*.45,.9,.03,.03);block(pavilion,m.stone,side*.45,.29,0,.03,.03,.9);
  }
  const finial=new THREE.Mesh(new THREE.SphereGeometry(.045,10,6),m.goldLeaf);finial.position.y=1.065;pavilion.add(finial);
  return g;
}
