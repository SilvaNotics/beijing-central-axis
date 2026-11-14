import { expect, it } from 'vitest';
import * as THREE from 'three';
import { polygonRoof } from './polygonBuildings';

const elbow: [number,number][] = [[0,0],[6,0],[6,2],[2,2],[2,6],[0,6]];
function sample(geometry:THREE.BufferGeometry,x:number,z:number) {
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  return new THREE.Raycaster(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0)).intersectObject(mesh)[0];
}
it('keeps the re-entrant roof junction angular instead of rounding around its corner',()=>{
  const roof=polygonRoof(elbow,0);
  // Along this line the corner is controlled by the same planar roof pitch.
  const heights=[1.6,1.7,1.8].map(z=>sample(roof,1.5,z).point.y);
  expect(Math.max(...heights)-Math.min(...heights)).toBeLessThan(1e-5);
  expect(sample(roof,3,3)).toBeUndefined();
});
it('meets at a ridge without clipping a broad roof into a flat plateau',()=>{
  const roof=polygonRoof([[0,0],[8,0],[8,4],[0,4]],0);
  expect(sample(roof,4,2).point.y-sample(roof,4,1.5).point.y).toBeGreaterThan(.1);
});
it('keeps separate face normals on either side of a hip',()=>{
  const roof=polygonRoof([[0,0],[6,0],[6,2],[0,2]],0);
  const a=sample(roof,.5,.49),b=sample(roof,.49,.5);
  expect(a.normal!.dot(b.normal!)).toBeLessThan(.9);
});
