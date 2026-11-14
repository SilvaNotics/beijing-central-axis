import { expect, it } from 'vitest';
import * as THREE from 'three';
import { landmarks } from '../data/heritage';
import { bake, createLandmark } from './architecture';
import type { Materials } from './materials';
import { duanmenPlatform, duanmenRoofs } from './duanmen';

function model() {
  const palette: Record<string, THREE.MeshBasicMaterial> = {};
  const m = new Proxy(palette, {get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial({side: THREE.DoubleSide})}) as unknown as Materials;
  return createLandmark(landmarks.find(s => s.id === 'duanmen')!, m);
}

it('uses the mapped platform envelope and a compact 33m-scale gatehouse', () => {
  const gate = model(), bounds = new THREE.Box3().setFromObject(gate);
  expect(bounds.max.y).toBeCloseTo(3.30, 2);
  const platform = gate.getObjectByName('duanmen-platform')!;
  const size = new THREE.Box3().setFromObject(platform).getSize(new THREE.Vector3());
  expect(size.x).toBeCloseTo(duanmenPlatform.width, 2);
  expect(size.z).toBeCloseTo(duanmenPlatform.depth, 2);
  expect(size.y).toBeCloseTo(duanmenPlatform.height, 2);
});

it('separates the nine-by-five hall from the much wider gate platform', () => {
  const gate = model(), body = gate.getObjectByName('duanmen-hall')!;
  const bodySize = new THREE.Box3().setFromObject(gate.getObjectByName('timber-enclosure')!).getSize(new THREE.Vector3());
  expect(body).toBeDefined();
  expect(bodySize.x).toBeLessThan(duanmenPlatform.width * .55);
  expect(bodySize.z).toBeLessThan(duanmenPlatform.depth * .8);
  expect(gate.getObjectByName('timber-columns-south')!.children.filter(o => o instanceof THREE.Mesh && o.geometry.type === 'CylinderGeometry')).toHaveLength(10);
  expect(gate.getObjectByName('timber-columns-east')!.children.filter(o => o instanceof THREE.Mesh && o.geometry.type === 'CylinderGeometry')).toHaveLength(4);
  expect(duanmenRoofs).toHaveLength(2);
  expect(duanmenRoofs[0].form).toBe('hipped');
  expect(duanmenRoofs[1].form).toBe('hip-gable');
});

it('retains five through passages before and after baking', () => {
  const gate = model(); gate.updateMatrixWorld(true);
  const baked = bake(gate.clone(), false); baked.updateMatrixWorld(true);
  for (const target of [gate, baked]) for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) {
    for (const sign of [-1, 1]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, .18, sign * 3), new THREE.Vector3(0, 0, -sign), 0, 6);
      expect(ray.intersectObject(target, true), `passage ${x}, direction ${sign}`).toHaveLength(0);
    }
  }
});
