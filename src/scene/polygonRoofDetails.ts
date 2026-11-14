import * as THREE from 'three';
import type {Materials} from './materials';

const shaft=new THREE.CylinderGeometry(1,1,1,5);
/** Follow the existing concave roof surface; do not stack rectangular roofs
 * across its open courts. Spacing and ridge profiles are atlas interpretations. */
export function polygonRoofDetails(roof:THREE.Mesh,m:Materials) {
  const group=new THREE.Group();group.name='polygon-roof-details';
  const beam=(a:THREE.Vector3,b:THREE.Vector3,radius:number)=>{
    const direction=b.clone().sub(a),length=direction.length();if(length<.025)return;
    const mesh=new THREE.Mesh(shaft,m.ridge);mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());mesh.scale.set(radius,length,radius);group.add(mesh);
  };
  const edges=new THREE.EdgesGeometry(roof.geometry,15),creases=edges.getAttribute('position');
  for(let i=0;i<creases.count;i+=2) {
    const a=new THREE.Vector3().fromBufferAttribute(creases,i),b=new THREE.Vector3().fromBufferAttribute(creases,i+1);
    a.y+=.014;b.y+=.014;beam(a,b,.012);
  }
  edges.dispose();
  const vertices=roof.geometry.getAttribute('position'),index=roof.geometry.index;
  const seen=new Set<string>();
  for(let i=0;i<(index?.count??vertices.count);i+=3) {
    const triangle=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(vertices,index?index.getX(i+j):i+j));
    const normal=triangle[1].clone().sub(triangle[0]).cross(triangle[2].clone().sub(triangle[0])).normalize();
    const length=Math.hypot(normal.x,normal.z);if(length<.001)continue;
    const ux=-normal.z/length,uz=normal.x/length,values=triangle.map(p=>p.x*ux+p.z*uz);
    // Tile channels run downhill on each actual pitch and stop at hips/valleys.
    for(let offset=Math.ceil(Math.min(...values)/.24)*.24;offset<Math.max(...values);offset+=.24) {
      const hits:THREE.Vector3[]=[];
      for(let j=0;j<3;j++) {
        const next=(j+1)%3,a=values[j]-offset,b=values[next]-offset;
        if((a<0)===(b<0)||Math.abs(a-b)<1e-8)continue;
        hits.push(triangle[j].clone().lerp(triangle[next],a/(a-b)));
      }
      if(hits.length!==2)continue;
      const key=hits.map(p=>[p.x,p.y,p.z].map(n=>n.toFixed(4)).join(',')).sort().join(':');
      if(seen.has(key))continue;seen.add(key);
      hits.forEach(p=>p.y+=.008);beam(hits[0],hits[1],.004);
    }
  }
  return group;
}
