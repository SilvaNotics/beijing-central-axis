import { expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { bake, createLandmark } from './architecture';
import { palaceGateLayout, shenwuForecourtLayout } from './palaceGates';
import { createPalaceCityWalls, palaceCityWallLayout } from './palaceCityWalls';
import type { CityData } from './geodata';
import type { Materials } from './materials';

const site = landmarks.find(s => s.id === 'forbidden-city')!;
const data: CityData = { buildings: bundled.buildings as CityData['buildings'], context: [] };
const palette: Record<string, THREE.MeshBasicMaterial> = {};
const m = new Proxy(palette, { get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial() }) as unknown as Materials;

it('uses a separate gate platform and roof core, keeping all three central passages open after baking', () => {
  const model = createLandmark(site, m, data);
  model.updateMatrixWorld(true);
  for (const id of [638156366, 638741722]) {
    const plan = palaceGateLayout(site, data, id)!;
    const matches = model.children.filter((o): o is THREE.Group => o instanceof THREE.Group && o.userData.osmId === id);
    expect(matches).toHaveLength(1);
    const gate = matches[0];
    expect(gate.getObjectByName('gate-platform')).toBeDefined();
    const core = gate.getObjectByName('gate-main-hall')!;
    expect(core).toBeDefined();
    const bounds = new THREE.Box3().setFromObject(core);
    expect(bounds.max.x - bounds.min.x).toBeLessThan(id === 638741722 ? 5.6 : 6.4);
    const baked = bake(gate.clone(), false); baked.updateMatrixWorld(true);
    const c = Math.cos(plan.rotation), s = Math.sin(plan.rotation);
    for (const target of [gate, baked]) for (const portal of plan.portals) for (const offset of [-.12, 0, .12]) for (const direction of [-1, 1]) {
      const point = new THREE.Vector3(portal.x + offset, .34, direction * 9);
      point.applyAxisAngle(new THREE.Vector3(0, 1, 0), plan.rotation).add(new THREE.Vector3(plan.x, 0, plan.z));
      const ray = new THREE.Raycaster(point, new THREE.Vector3(-s * direction, 0, -c * direction), 0, 18);
      expect(ray.intersectObject(target, true), `passage ${id}/${portal.x}/${offset}/${direction}`).toHaveLength(0);
    }
    // Masonry remains above each arch and between the openings.
    for (const portal of plan.portals) {
      const p = new THREE.Vector3(portal.x, plan.height - .07, -9).applyAxisAngle(new THREE.Vector3(0, 1, 0), plan.rotation).add(new THREE.Vector3(plan.x, 0, plan.z));
      const ray = new THREE.Raycaster(p, new THREE.Vector3(s, 0, c), 0, 18);
      expect(ray.intersectObject(gate.getObjectByName('gate-platform')!, true).length).toBeGreaterThan(0);
    }
  }
});

it('connects both mapped wall ends to each gate without a transverse parapet or a gap in the walk', () => {
  const walls = palaceCityWallLayout(site, data);
  const perimeter = createPalaceCityWalls(site, data, m); perimeter.updateMatrixWorld(true);
  const model = createLandmark(site, m, data);
  model.updateMatrixWorld(true);
  for (const id of [638156366, 638741722]) {
    const plan = palaceGateLayout(site, data, id)!;
    const gate = model.children.find(o => o.userData.osmId === id)!;
    expect(plan.joins).toHaveLength(2);
    for (const join of plan.joins) {
      const wall = walls.find(w => w.id === join.wallId)!;
      const edge = wall.edges[join.edgeIndex];
      expect(edge.runs).toHaveLength(0);
      const midpoint = new THREE.Vector3((edge.a[0] + edge.b[0]) / 2, 2, (edge.a[1] + edge.b[1]) / 2);
      const top = wall.top[join.edgeIndex];
      expect(Math.hypot(top[0] - edge.a[0], top[1] - edge.a[1])).toBeLessThan(.07);
      const intoGate = new THREE.Vector3(edge.normal[0], 0, edge.normal[1]);
      for (const distance of [-.025, .025]) {
        const p = midpoint.clone().addScaledVector(intoGate, distance);
        const ray = new THREE.Raycaster(p, new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObjects([gate, perimeter], true).filter(h => h.point.y < 1.3)[0];
        expect(hit, `wall ${join.wallId}/${distance}`).toBeDefined();
        expect(hit!.point.y, `walk level ${id}/${join.wallId}/${distance}`).toBeCloseTo(.99, 1);
      }
    }
  }
});

it('mirrors Shenwumen forecourt gatehouses and galleries around the gate centre in both layout and rendered geometry', () => {
  const source = JSON.stringify(data.buildings);
  const plan = palaceGateLayout(site, data, 638741722)!;
  const c = Math.cos(plan.rotation), s = Math.sin(plan.rotation);
  const model = createLandmark(site, m, data);
  for (const ids of [[638741717, 638741716], [42740569, 42740572]]) {
    const layouts = ids.map(id => shenwuForecourtLayout(site, data, id)!);
    const local = layouts.map(p => [c * (p.x - plan.x) - s * (p.z - plan.z), s * (p.x - plan.x) + c * (p.z - plan.z)]);
    expect(local[0][0] + local[1][0]).toBeCloseTo(0, 7);
    expect(local[0][1]).toBeCloseTo(local[1][1], 7);
    expect(layouts[0].width).toBeCloseTo(layouts[1].width, 7);
    expect(layouts[0].depth).toBeCloseTo(layouts[1].depth, 7);
    expect(layouts[0].rotation).toBeCloseTo(layouts[1].rotation, 7);
    const boxes = ids.map(id => {
      const object = model.children.find(o => o.userData.osmId === id)!.clone();
      const parent = new THREE.Group(); parent.rotation.y = -plan.rotation;
      object.position.sub(new THREE.Vector3(plan.x, 0, plan.z)); parent.add(object); parent.updateMatrixWorld(true);
      return new THREE.Box3().setFromObject(parent);
    });
    expect(boxes[0].min.x + boxes[1].max.x).toBeCloseTo(0, 5);
    expect(boxes[0].max.x + boxes[1].min.x).toBeCloseTo(0, 5);
    for (const axis of ['y', 'z'] as const) {
      expect(boxes[0].min[axis]).toBeCloseTo(boxes[1].min[axis], 5);
      expect(boxes[0].max[axis]).toBeCloseTo(boxes[1].max[axis], 5);
    }
  }
  expect(JSON.stringify(data.buildings)).toBe(source);
});
