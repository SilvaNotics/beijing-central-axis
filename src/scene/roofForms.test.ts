import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { roofGeometry, roofGables, roofPlanLines, type RoofForm } from './roofForms';

describe('roof envelopes',()=>{
  for(const form of ['hipped','hip-gable','pyramidal','gable'] as RoofForm[]) {
    it(`${form} stays inside its mapped roof envelope`,()=>{
      const geometry=roofGeometry(6,3,1,form);geometry.computeBoundingBox();
      expect(geometry.boundingBox!.min.x).toBeGreaterThanOrEqual(-3);
      expect(geometry.boundingBox!.max.x).toBeLessThanOrEqual(3);
      expect(geometry.boundingBox!.min.z).toBeGreaterThanOrEqual(-1.5);
      expect(geometry.boundingBox!.max.z).toBeLessThanOrEqual(1.5);
      expect(geometry.boundingBox!.max.y).toBeCloseTo(1);
      expect([...geometry.getAttribute('normal').array].every(Number.isFinite)).toBe(true);
    });
  }
  it('makes both side gables visible with ordinary front-face materials',()=>{
    const gables=roofGables(6,3,1,'hip-gable',new THREE.MeshBasicMaterial());gables.updateMatrixWorld(true);
    for(const side of [-1,1]) {
      const ray=new THREE.Raycaster(new THREE.Vector3(side*4,.6,0),new THREE.Vector3(-side,0,0));
      expect(ray.intersectObject(gables,true)).toHaveLength(1);
    }
  });
  it('draws a four-sided pointed roof in the flat plan',()=>{
    const lines=roofPlanLines(3,3,'pyramidal');
    expect(lines).toHaveLength(4);for(const line of lines)expect(line[1]).toEqual([0,0]);
  });
});
