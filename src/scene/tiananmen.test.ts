import { expect, it } from 'vitest';
import * as THREE from 'three';
import { landmarks } from '../data/heritage';
import { bake, createLandmark } from './architecture';
import { jinshuiLayout, tiananmenPortalOpenings, tiananmenPortals } from './gateLayout';
import { project, unproject } from './geo';
import type { Materials } from './materials';
import type { CityContext } from './geodata';

function model() {
  const palette: Record<string, THREE.MeshBasicMaterial> = {};
  const m = new Proxy(palette, {get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial({side: THREE.DoubleSide})}) as unknown as Materials;
  return createLandmark(landmarks.find(s => s.id === 'tiananmen')!, m);
}

it('keeps Tiananmen near the documented 34.7m height and a broad low platform', () => {
  const gate = model(), bounds = new THREE.Box3().setFromObject(gate);
  expect(bounds.max.y).toBeCloseTo(3.47, 2);
  const platform = gate.getObjectByName('tiananmen-platform')!;
  expect(platform).toBeDefined();
  const size = new THREE.Box3().setFromObject(platform).getSize(new THREE.Vector3());
  expect(size.x).toBeCloseTo(12, 2);
  expect(size.z).toBeCloseTo(4, 2);
  // DPM records the masonry bastion at 16.19m rather than a generic 13m wall.
  expect(size.y).toBeCloseTo(1.619, 2);
});

it('uses nine by five bays, two close eaves and hip-gable ends without an extra window storey', () => {
  const gate = model();
  const rooms: THREE.Object3D[] = [], gables: THREE.Object3D[] = [];
  gate.updateMatrixWorld(true);
  gate.traverse(o => {if (o.name === 'timber-enclosure') rooms.push(o); if (o.name === 'roof-gable' && o.getWorldPosition(new THREE.Vector3()).y > 2) gables.push(o);});
  expect(rooms).toHaveLength(1);
  expect(gables).toHaveLength(2);
  for (const [face, count] of [['south', 10], ['east', 4]] as const) {
    const columns = gate.getObjectByName(`timber-columns-${face}`)!;
    expect(columns.children.filter(o => o instanceof THREE.Mesh && o.geometry.type === 'CylinderGeometry')).toHaveLength(count);
  }
  const lower = gate.getObjectByName('tiananmen-lower-roof')!, upper = gate.getObjectByName('tiananmen-upper-roof')!;
  const a = new THREE.Box3().setFromObject(lower), b = new THREE.Box3().setFromObject(upper);
  expect(a.getSize(new THREE.Vector3()).x).toBeCloseTo(6.6, 2);
  expect(b.getSize(new THREE.Vector3()).x / a.getSize(new THREE.Vector3()).x).toBeGreaterThan(.9);
  expect(b.min.y - a.min.y).toBeLessThan(.5);
  expect(b.min.y).toBeLessThan(a.max.y + .1);
});

it('fits each principal bridge approach within its through passage', () => {
  const gate = model();gate.updateMatrixWorld(true);
  const baked = bake(gate.clone(), false);baked.updateMatrixWorld(true);
  for (const target of [gate, baked]) for (const x of tiananmenPortals) {
    for (const sign of [-1, 1]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, .20, sign * 3), new THREE.Vector3(0, 0, -sign), 0, 6);
      expect(ray.intersectObject(target, true), `passage ${x}, direction ${sign}`).toHaveLength(0);
    }
  }
  const site = landmarks.find(s => s.id === 'tiananmen')!, [ox, oz] = project(site.coords);
  const bridgeSite = landmarks.find(s => s.id === 'jinshui')!, [, riverZ] = project(bridgeSite.coords);
  const layout = jinshuiLayout(), principal = layout.filter(b => b.portal !== null);
  expect(principal).toHaveLength(5);
  for (const bridge of layout) {
    expect(bridge.riverZ).toBeCloseTo(riverZ, 8);
    expect(bridge.crossingNorthZ).toBeLessThan(bridge.riverZ);
    expect(bridge.crossingSouthZ).toBeGreaterThan(bridge.riverZ);
  }
  principal.forEach((bridge, index) => {
    expect(bridge.x - ox).toBeCloseTo(bridge.portal!, 8);
    expect(bridge.northZ - oz).toBeCloseTo(2, 8);
    expect(bridge.width).toBeLessThanOrEqual(tiananmenPortalOpenings[index].radius * 2);
  });
  for (const bridge of layout.filter(b => b.portal === null)) {
    // The outer pair leads toward Taimiao and Shejitan, so its schematic deck
    // stops at the river banks rather than ending against a blank gate wall.
    expect(bridge.northZ).toBeCloseTo(bridge.crossingNorthZ, 8);
    expect(bridge.southZ).toBeCloseTo(bridge.crossingSouthZ, 8);
  }
});

it('anchors every bridge crossing to the mapped river rather than its label POI', () => {
  const gate = landmarks.find(s => s.id === 'tiananmen')!, [gx, gz] = project(gate.coords);
  const riverZ = gz + 17, water: CityContext[] = [{
    name: 'synthetic river section for placement regression',
    kind: 'water',
    coordinates: [[gx - 30, riverZ - .45], [gx + 30, riverZ - .45], [gx + 30, riverZ + .35], [gx - 30, riverZ + .35]].map(point=>unproject(point as [number,number])),
  }];
  for (const bridge of jinshuiLayout(water)) {
    expect(bridge.riverZ).toBeCloseTo(riverZ - .05, 8);
    expect(bridge.crossingNorthZ).toBeCloseTo(riverZ - 1.1, 8);
    expect(bridge.crossingSouthZ).toBeCloseTo(riverZ + 1.0, 8);
  }
});

it('keeps the bridge group at the water and models the north half only as a causeway', () => {
  const gate = landmarks.find(s => s.id === 'tiananmen')!, [gx, gz] = project(gate.coords), riverZ = gz + 17;
  const water: CityContext[] = [{
    name: 'synthetic river section for bridge-body regression', kind: 'water',
    coordinates: [[gx - 30, riverZ - .45], [gx + 30, riverZ - .45], [gx + 30, riverZ + .35], [gx - 30, riverZ + .35]].map(point=>unproject(point as [number,number])),
  }];
  const palette: Record<string, THREE.MeshBasicMaterial> = {};
  const m = new Proxy(palette, {get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial()}) as unknown as Materials;
  const model = createLandmark(landmarks.find(s => s.id === 'jinshui')!, m, {buildings: [], context: water}); model.updateMatrixWorld(true);
  const named = (name: string) => { const objects: THREE.Object3D[] = []; model.traverse(o => {if (o.name === name) objects.push(o);}); return objects; };
  expect(named('jinshui-principal-bridge')).toHaveLength(5);
  expect(named('jinshui-lateral-bridge')).toHaveLength(2);
  expect(named('jinshui-causeway')).toHaveLength(5);
  for (const bridge of named('jinshui-principal-bridge')) {
    const size = new THREE.Box3().setFromObject(bridge).getSize(new THREE.Vector3());
    expect(size.z).toBeLessThan(2.5);
  }
});
