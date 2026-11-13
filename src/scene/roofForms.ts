import * as THREE from 'three';
export type RoofForm='hipped'|'hip-gable'|'pyramidal'|'gable';
const shoulder=3/8;
export function mappedRoofForm(tag?:string):RoofForm {
  if(tag==='gabled')return 'gable';
  if(tag==='hipped-and-gabled')return 'hip-gable';
  if(tag==='pyramidal')return 'pyramidal';
  return 'hipped';
}

/** Curved tile envelope, in metres/10. Gables stop the hip at the shoulder. */
export function roofSection(width:number,depth:number,rise:number,t:number,form:RoofForm='hipped') {
  const ridge=Math.max(width*.16,width-depth*.88);
  const w=form==='pyramidal'?width/2*(1-t):form==='gable'?width/2:form==='hip-gable'?width/2-width*.16*Math.min(1,t/shoulder):(width+(ridge-width)*t)/2;
  return {w,d:depth/2*(1-t),y:rise*Math.pow(t,1.55),corner:rise*.11*Math.pow(1-t,3)};
}
export function roofGeometry(width:number,depth:number,rise:number,form:RoofForm='hipped') {
  const vertices:number[]=[],uvs:number[]=[],indices:number[]=[],rings=8;
  for(let r=0;r<=rings;r++) {
    const t=r/rings,{w,d,y,corner}=roofSection(width,depth,rise,t,form);
    const points=[[-w,y+corner,-d],[0,y,-d],[w,y+corner,-d],[w,y,0],[w,y+corner,d],[0,y,d],[-w,y+corner,d],[-w,y,0]];
    points.forEach((p,i)=>{vertices.push(...p);uvs.push(i/8*Math.max(1,width/2),t*2);});
  }
  for(let r=0;r<rings;r++)for(let k=0;k<8;k++) {
    if(([2,3,6,7].includes(k))&&(form==='gable'||form==='hip-gable'&&r/rings>=shoulder))continue;
    const a=r*8+k,b=r*8+(k+1)%8,c=a+8,d=b+8;indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Timber infill below a hip-and-gable roof, with outward-facing triangles. */
export function roofGables(width:number,depth:number,rise:number,form:RoofForm,material:THREE.Material) {
  const result=new THREE.Group();
  if(form!=='hip-gable'&&form!=='gable')return result;
  const s=roofSection(width,depth,rise,form==='gable'?0:shoulder,form);
  for(const side of [-1,1]) {
    const geometry=new THREE.BufferGeometry(),x=side*(s.w-.012);
    const points=[[x,s.y+s.corner,-s.d],[x,s.y+s.corner,s.d],[x,rise,0]];
    if(side>0)points.reverse();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);mesh.name='roof-gable';result.add(mesh);
  }
  return result;
}

/** Roof lines shared with the flat map, before geographic rotation. */
export function roofPlanLines(width:number,depth:number,form:RoofForm):[number,number][][] {
  const peak=roofSection(width,depth,1,1,form).w;
  if(form==='pyramidal')return [[[-width/2,-depth/2],[0,0]],[[width/2,-depth/2],[0,0]],[[width/2,depth/2],[0,0]],[[-width/2,depth/2],[0,0]]];
  const lines:[number,number][][]=[[[-peak,0],[peak,0]]];
  if(form==='gable')return lines;
  for(const side of [-1,1])for(const front of [-1,1])lines.push([[side*width/2,front*depth/2],[side*peak,0]]);
  return lines;
}
