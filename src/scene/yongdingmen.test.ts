import { expect, it } from 'vitest';
import * as THREE from 'three';
import { landmarks } from '../data/heritage';
import { bake, createLandmark } from './architecture';
import type { Materials } from './materials';

function fixture() {
  const palette: Record<string, THREE.MeshBasicMaterial> = {};
  const m = new Proxy(palette, { get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }) }) as unknown as Materials;
  const gate = createLandmark(landmarks.find(s => s.id === 'yongdingmen')!, m);
  gate.updateMatrixWorld(true);
  return { gate, m };
}

it('uses a grey brick platform and three grey roofs with separate green glazed borders', () => {
  const { gate, m } = fixture(), roofs: THREE.Mesh[] = [], trims: THREE.Mesh[] = [], gold: THREE.Mesh[] = [];
  gate.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    if (o.name === 'yongdingmen-roof') roofs.push(o);
    if (o.name === 'yongdingmen-green-border') trims.push(o);
    if (o.material === m.gold) gold.push(o);
  });
  expect(gold).toHaveLength(0);
  expect(roofs).toHaveLength(3);
  expect(trims).toHaveLength(3);
  expect(roofs.every(r => r.material === m.grayRoof)).toBe(true);
  expect(trims.every(r => r.material === m.green)).toBe(true);
  expect((gate.getObjectByName('yongdingmen-platform') as THREE.Mesh).material).toBe(m.grayBrick);
});

it('keeps the rebuilt gate near 26.04m high on the documented 31.41 by 16.96m platform', () => {
  const { gate } = fixture();
  expect(new THREE.Box3().setFromObject(gate).max.y).toBeCloseTo(2.604, 2);
  const size = new THREE.Box3().setFromObject(gate.getObjectByName('yongdingmen-platform')!).getSize(new THREE.Vector3());
  expect(size.x).toBeCloseTo(3.141, 3);
  expect(size.z).toBeCloseTo(1.696, 3);
  expect(size.y).toBeCloseTo(.8, 3);
  const rooms: THREE.Object3D[] = [];
  gate.traverse(o => { if (o.name === 'timber-enclosure') rooms.push(o); });
  expect(rooms).toHaveLength(2);
  expect(gate.getObjectByName('timber-columns-south')!.children.filter(o => o instanceof THREE.Mesh && o.geometry.type === 'CylinderGeometry')).toHaveLength(8);
});

it('has one central through passage before and after batching', () => {
  const { gate } = fixture(), baked = bake(gate.clone(), false); baked.updateMatrixWorld(true);
  for (const target of [gate, baked]) {
    for (const x of [-.15, 0, .15]) for (const sign of [-1, 1]) {
      expect(new THREE.Raycaster(new THREE.Vector3(x, .25, 2 * sign), new THREE.Vector3(0, 0, -sign), 0, 4).intersectObject(target, true)).toHaveLength(0);
    }
    expect(new THREE.Raycaster(new THREE.Vector3(.75, .25, 2), new THREE.Vector3(0, 0, -1), 0, 4).intersectObject(target, true).length).toBeGreaterThan(0);
  }
});
