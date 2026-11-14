import { beforeAll, expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { bake, createLandmark } from './architecture';
import { palaceGateHalls, palaceGateLayout } from './palaceGates';
import { palaceCityWallLayout } from './palaceCityWalls';
import type { CityData } from './geodata';
import type { Materials } from './materials';

const site = landmarks.find(s => s.id === 'forbidden-city')!;
const data: CityData = { buildings: bundled.buildings as CityData['buildings'], context: [] };
const palette: Record<string, THREE.MeshBasicMaterial> = {};
const m = new Proxy(palette, { get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial() }) as unknown as Materials;
let model: THREE.Group, baked: THREE.Group;
beforeAll(() => {
  model = createLandmark(site, m, data); model.updateMatrixWorld(true);
  baked = bake(model.clone(), false); baked.updateMatrixWorld(true);
}, 30_000);

for (const id of [40343947, 40343948]) {
  it(`seats side gate ${id} on masonry with a five-by-three-bay double roof`, () => {
    const source = JSON.stringify(data.buildings);
    const gates = model.children.filter(o => o.userData.osmId === id);
    expect(gates).toHaveLength(1);
    const gate = gates[0];
    expect(gate.getObjectByName('gate-platform'), 'side gate must not be a ground-level generic house').toBeDefined();
    const plan = palaceGateLayout(site, data, id)!;
    const [part] = palaceGateHalls(plan);
    expect(part.profile).toMatchObject({ roof: 'hipped', double: true, frontBays: 5, sideBays: 3 });
    expect(part.elevation).toBeCloseTo(.99, 5);
    expect(Math.abs(Math.sin(plan.rotation))).toBeGreaterThan(.99);
    const hall = gate.getObjectByName('gate-main-hall')!;
    const gold: THREE.Mesh[] = [], timber: THREE.Mesh[] = [];
    hall.traverse(o => {
      if (o instanceof THREE.Mesh && o.material === m.gold) gold.push(o);
      if (o instanceof THREE.Mesh && [m.wood, m.window, m.vermilion].includes(o.material)) timber.push(o);
    });
    expect(gold).toHaveLength(2);
    expect(timber.length).toBeGreaterThan(0);
    for (const mesh of timber) expect(new THREE.Box3().setFromObject(mesh).min.y).toBeGreaterThanOrEqual(plan.height);
    expect(gate.getObjectByName('gate-stone-balustrade')).toBeDefined();
    expect(JSON.stringify(data.buildings)).toBe(source);
  });

  it(`opens east–west passages through assembled gate ${id}, including baked geometry`, () => {
    const gate = model.children.find(o => o.userData.osmId === id)!;
    expect(gate.getObjectByName('gate-platform')).toBeDefined();
    const plan = palaceGateLayout(site, data, id)!;
    const c = Math.cos(plan.rotation), s = Math.sin(plan.rotation);
    for (const target of [model, baked]) {
      target.updateMatrixWorld(true);
      for (const portal of plan.portals) for (const offset of [-.10, 0, .10]) for (const direction of [-1, 1]) {
        const end = direction > 0 ? Math.max(...plan.ring.map(p => p[1])) + .25 : Math.min(...plan.ring.map(p => p[1])) - .25;
        const start = new THREE.Vector3(portal.x + offset, .34, end).applyAxisAngle(new THREE.Vector3(0, 1, 0), plan.rotation).add(new THREE.Vector3(plan.x, 0, plan.z));
        const ray = new THREE.Raycaster(start, new THREE.Vector3(-s * direction, 0, -c * direction), 0, Math.max(...plan.ring.map(p => p[1])) - Math.min(...plan.ring.map(p => p[1])) + .5);
        expect(ray.intersectObject(target, true), `passage ${id}/${portal.x}/${offset}/${direction}`).toHaveLength(0);
      }
    }
  });

  it(`keeps both wall walks open and continuously supported at side gate ${id}`, () => {
    const plan = palaceGateLayout(site, data, id)!;
    expect(plan.joins).toHaveLength(2);
    const walls = palaceCityWallLayout(site, data);
    for (const join of plan.joins) {
      const wall = walls.find(w => w.id === join.wallId)!;
      const edge = wall.edges[join.edgeIndex];
      expect(edge.runs, 'no parapet across gate contact').toHaveLength(0);
      for (const distance of [-.025, .025]) {
        const x = (edge.a[0] + edge.b[0]) / 2 + edge.normal[0] * distance;
        const z = (edge.a[1] + edge.b[1]) / 2 + edge.normal[1] * distance;
        const hit = new THREE.Raycaster(new THREE.Vector3(x, 1.04, z), new THREE.Vector3(0, -1, 0)).intersectObject(model, true)[0];
        expect(hit, `supported wall contact ${join.wallId}/${distance}`).toBeDefined();
        expect(hit!.point.y).toBeCloseTo(.99, 1);
        const obstacle = new THREE.Raycaster(new THREE.Vector3(x, 1.16, z), new THREE.Vector3(edge.normal[0], 0, edge.normal[1]), 0, .12).intersectObject(model, true);
        expect(obstacle, 'no railing or parapet blocking the wall walk').toHaveLength(0);
      }
    }
  });

  it(`expresses the square outer doorway and recessed round arch at side gate ${id}`, () => {
    const gate = model.children.find(o => o.userData.osmId === id)!;
    expect(gate.getObjectByName('gate-platform')).toBeDefined();
    const plan = palaceGateLayout(site, data, id)!;
    const direction = id === 40343947 ? 1 : -1;
    const c = Math.cos(plan.rotation), s = Math.sin(plan.rotation);
    for (const portal of plan.portals) {
      const x = portal.x + portal.width * .44;
      const hits: number[] = [];
      for (let i = 0; i < plan.ring.length; i++) {
        const a = plan.ring[i], b = plan.ring[(i + 1) % plan.ring.length];
        if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x)) hits.push(a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]));
      }
      const z = (direction > 0 ? Math.max(...hits) : Math.min(...hits)) + direction * .015;
      const point = new THREE.Vector3(x, portal.top - .035, z).applyAxisAngle(new THREE.Vector3(0, 1, 0), plan.rotation).add(new THREE.Vector3(plan.x, 0, plan.z));
      const vector = new THREE.Vector3(-s * direction, 0, -c * direction);
      expect(new THREE.Raycaster(point, vector, 0, .09).intersectObject(gate, true), 'square exterior lintel clears the upper corners').toHaveLength(0);
      expect(new THREE.Raycaster(point, vector, .09, .5).intersectObject(gate, true).length, 'rounded arch remains inside the tunnel').toBeGreaterThan(0);
    }
  });

  it(`supports the lower column shoes of side gate ${id} without an air gap`, () => {
    const gate = model.children.find(o => o.userData.osmId === id)!;
    const columns = gate.getObjectByName('gate-main-hall')!.getObjectByName('timber-columns-south')!;
    const shoes = columns.children.filter((o): o is THREE.Mesh => o instanceof THREE.Mesh && o.material === m.stone);
    expect(shoes.length).toBeGreaterThan(0);
    for (const shoe of shoes) {
      const bounds = new THREE.Box3().setFromObject(shoe), point = bounds.getCenter(new THREE.Vector3());
      point.y = bounds.min.y + .002;
      const hit = new THREE.Raycaster(point, new THREE.Vector3(0, -1, 0), 0, .2).intersectObject(gate, true)[0];
      expect(hit).toBeDefined();
      expect(bounds.min.y - hit!.point.y, 'stone shoe meets the raised hall plinth').toBeLessThan(.006);
    }
  });
}
