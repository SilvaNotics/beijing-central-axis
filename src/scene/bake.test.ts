import {expect,it} from 'vitest';
import * as THREE from 'three';
import {bake} from './architecture';
it('reuses repeated geometry while preserving every world transform and open space',()=>{
  const root=new THREE.Group(),row=new THREE.Group();row.position.set(3,2,5);row.rotation.y=.15;root.add(row);
  const geometry=new THREE.BoxGeometry(.2,1,.2),material=new THREE.MeshBasicMaterial();
  for(let i=0;i<20;i++){const mesh=new THREE.Mesh(geometry,material);mesh.position.x=i*.5;row.add(mesh);}
  root.updateMatrixWorld(true);const expected=row.children.map(o=>o.matrixWorld.clone());
  const baked=bake(root),instances=baked.children.find(o=>o instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
  expect(instances).toBeDefined();expect(instances.count).toBe(20);
  for(let i=0;i<20;i++){const actual=new THREE.Matrix4();instances.getMatrixAt(i,actual);actual.elements.forEach((v,j)=>expect(v).toBeCloseTo(expected[i].elements[j],5));}
  expect(instances.geometry.getAttribute('position').count).toBe(24);
});
it('retains uncoloured masonry alongside coloured natural surfaces in one material batch',()=>{
  const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial({vertexColors:true});
  const colored=new THREE.BoxGeometry(1,1,1);colored.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(72).fill(.7),3));
  const a=new THREE.Mesh(colored,mat),b=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat);b.position.x=3;group.add(a,b);
  const result=bake(group);expect(result.children).toHaveLength(1);
  expect((result.children[0] as THREE.Mesh).geometry.getAttribute('position').count).toBe(72);
});
