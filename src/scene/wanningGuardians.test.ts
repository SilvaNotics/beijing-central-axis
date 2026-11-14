import { expect, it } from 'vitest';
import * as THREE from 'three';
import { landmarks } from '../data/heritage';
import type { Materials } from './materials';
import { createWanning } from './northernLandmarks';

const palette: Record<string, THREE.MeshBasicMaterial> = {};
const materials = new Proxy(palette, { get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }) }) as unknown as Materials;
const site = landmarks.find(s => s.id === 'wanning')!;

it('places four guardians west and two east, with the western pair at two levels', () => {
  const bridge = createWanning(site, materials);
  const beasts = bridge.children.filter(o => o.name === '镇水兽');
  const west = beasts.filter(o => o.position.x < 0), east = beasts.filter(o => o.position.x > 0);
  expect(west).toHaveLength(4);
  expect(east).toHaveLength(2);
  for (const bank of [-1, 1]) {
    const pair = west.filter(o => o.position.z * bank > 0);
    expect(pair).toHaveLength(2);
    expect(Math.max(...pair.map(o => o.position.y)) - Math.min(...pair.map(o => o.position.y))).toBeGreaterThan(.15);
  }
});

it('keeps stone supports outside the water passage and the deck clear', () => {
  const bridge = createWanning(site, materials);
  // Test in bridge-local coordinates, independently of map placement.
  bridge.position.set(0, 0, 0); bridge.rotation.set(0, 0, 0); bridge.updateMatrixWorld(true);
  const beasts = bridge.children.filter(o => o.name === '镇水兽');
  for (const beast of beasts) {
    const bounds = new THREE.Box3().setFromObject(beast);
    expect(bounds.min.x > .85 || bounds.max.x < -.85).toBe(true);
    expect(bounds.max.y - bounds.min.y).toBeGreaterThan(.12);
    const support = new THREE.Raycaster(new THREE.Vector3(beast.position.x, beast.position.y + .001, beast.position.z), new THREE.Vector3(0, -1, 0), 0, .02);
    expect(support.intersectObjects(bridge.children.filter(o => o.name === '镇水兽岸座'), true).length).toBeGreaterThan(0);
  }
  const channel = new THREE.Raycaster(new THREE.Vector3(-2, .16, 0), new THREE.Vector3(1, 0, 0), 0, 4);
  expect(channel.intersectObject(bridge, true)).toHaveLength(0);
});
