import { expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { bake, createLandmark } from './architecture';
import { clipPalaceFootprint, cornerTowerPlan, createPalaceCityWalls, palaceCityWallLayout } from './palaceCityWalls';
import { localPalaceBoundary } from './precincts';
import { pointInPolygon, project } from './geo';
import { createPalaceWalls, palaceWallRuns } from './palaceWalls';
import { localBuildingRing, type CityData } from './geodata';
import type { Materials } from './materials';

const site = landmarks.find(s => s.id === 'forbidden-city')!;
const data: CityData = { buildings: bundled.buildings as CityData['buildings'], context: [] };
const palette: Record<string, THREE.MeshBasicMaterial> = {};
const m = new Proxy(palette, { get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial() }) as unknown as Materials;

it('keeps the four mapped gate gaps and the palace interior free of perimeter geometry', () => {
  const source = JSON.stringify(data.buildings);
  const walls = createPalaceCityWalls(site, data, m);
  expect(walls.children).toHaveLength(16);
  expect(walls.children.filter(child => child.name === 'palace-corner-tower')).toHaveLength(4);
  walls.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  // Centres of the existing footprint gaps, in the shared local palace plane.
  for (const [x, z] of [[0, -51], [0, 45], [-37, 32], [37.4, 32], [0, 0]]) {
    ray.set(new THREE.Vector3(x, 5, z), new THREE.Vector3(0, -1, 0));
    expect(ray.intersectObject(walls, true), `opening at ${x},${z}`).toHaveLength(0);
  }
  expect(JSON.stringify(data.buildings)).toBe(source);
  let authoredMeshes=0;walls.traverse(o=>{if(o instanceof THREE.Mesh)authoredMeshes++;});
  const baked = bake(walls, false);
  // Four detailed timber towers add window, painted beam and railing materials.
  // Retain a bounded draw budget and verify that batching removes >99% of nodes.
  expect(baked.children.length).toBeLessThan(32);
  expect(baked.children.length).toBeLessThan(authoredMeshes*.01);
});

it('removes detached palace-side buildings outside the mapped palace boundary', () => {
  const boundary = localPalaceBoundary(site);
  for (const id of [638156236, 638156248, 42740554]) {
    const building = data.buildings.find(b => b.id === id)!;
    const [ox, oz] = project(site.coords);
    const ring = localBuildingRing(building).map(([x, z]) => [x - ox, z - oz] as [number, number]);
    const clipped = clipPalaceFootprint(ring, boundary);
    expect(clipped, `outside footprint ${id}`).toHaveLength(0);
  }
});

it('shows mapped buildings beside all four palace wall corners without mutating source data', () => {
  const source=JSON.stringify(data.buildings);
  const model = createLandmark(site, m, data);
  const objects = new Map<number, THREE.Object3D>();
  model.traverse(object => { if (typeof object.userData.osmId === 'number') objects.set(object.userData.osmId, object); });
  for (const id of [42740551,42740548,42740549,638156236,638156248,42740554,42740569,42740572,638741716,638741717,42740564,42740565,42740573]) {
    expect(objects.has(id), 'edge building ' + id).toBe(true);
  }
  expect(JSON.stringify(data.buildings)).toBe(source);
});

it('joins the northwest wall walk across both footprint seams without transverse parapets', () => {
  const layout = palaceCityWallLayout(site, data);
  const corner = layout.find(w => w.id === 156145604)!;
  const west = layout.find(w => w.id === 156150832)!;
  const north = layout.find(w => w.id === 156148390)!;
  expect(corner.edges[2].runs).toHaveLength(0);
  expect(corner.edges[5].runs).toHaveLength(0);
  for (const [a, b] of [[corner.top[2], west.top[0]], [corner.top[3], west.top[4]], [corner.top[0], north.top[1]], [corner.top[5], north.top[2]]])
    expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(.005);
});

it('adds uncovered mapped city-wall lines while retaining the mapped interior wall runs', () => {
  const runs = palaceWallRuns(site, data);
  const walls = createPalaceWalls(site, data, m);
  expect(walls.children).toHaveLength(runs.length);
  expect(walls.children.some(child => runs.some(run => run.outer && run.id === child.userData.osmWallId))).toBe(true);
});

it('uses the documented asymmetric cross plan for each corner tower', () => {
  const plan = cornerTowerPlan(1, -1);
  expect(plan).toHaveLength(5);
  const bounds = plan.reduce((box, part) => ({
    minX: Math.min(box.minX, part.x - part.width / 2),
    maxX: Math.max(box.maxX, part.x + part.width / 2),
    minZ: Math.min(box.minZ, part.z - part.depth / 2),
    maxZ: Math.max(box.maxZ, part.z + part.depth / 2),
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
  expect(bounds.maxX - bounds.minX).toBeCloseTo(1.431, 3);
  expect(bounds.maxZ - bounds.minZ).toBeCloseTo(1.431, 3);
  const center = plan[0];
  expect(center.width).toBeCloseTo(.873, 3);
  expect(center.depth).toBeCloseTo(.873, 3);
  expect(plan.slice(1).map(part => part.extension).sort((a, b) => a - b))
    .toEqual([.16, .16, .398, .398]);
});

it('seats each detailed tower above its own corner bastion with supported feet', () => {
  const walls=createPalaceCityWalls(site,data,m);walls.updateMatrixWorld(true);
  const towers=walls.children.filter(o=>o.name==='palace-corner-tower');
  const ray=new THREE.Raycaster();
  for(const tower of towers) {
    expect(tower.position.y,'tower floor above the wall walk').toBeCloseTo(.99,5);
    const bastion=walls.children.find(o=>o.userData.osmId===tower.userData.bastionId)!;
    expect(bastion).toBeDefined();
    const floor=tower.getObjectByName('corner-stone-platform')!;
    const box=new THREE.Box3().setFromObject(floor);
    for(const x of [box.min.x+.02,box.max.x-.02])for(const z of [box.min.z+.02,box.max.z-.02]) {
      ray.set(new THREE.Vector3(x,1.5,z),new THREE.Vector3(0,-1,0));
      expect(ray.intersectObject(bastion,true)[0]?.point.y,'platform supported by wall walk').toBeCloseTo(.99,4);
    }
    const gables:THREE.Object3D[]=[];tower.traverse(o=>{if(o.name==='roof-gable')gables.push(o);});
    expect(gables.length).toBeGreaterThanOrEqual(8);
    expect(tower.getObjectByName('corner-lower-waist-eave')).toBeDefined();
    expect(tower.getObjectByName('corner-stone-railing')).toBeDefined();
    expect(new THREE.Box3().setFromObject(tower).max.y).toBeCloseTo(2.75,2);
  }
});
