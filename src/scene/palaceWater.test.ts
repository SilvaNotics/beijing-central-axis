import { expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import context from '../../public/data/context.geojson?raw';
import { landmarks } from '../data/heritage';
import { createLandmark, bake } from './architecture';
import { wgs84ToGcj02, type CityData } from './geodata';
import { project } from './geo';
import { palaceWaterConnections } from './palaceWaterConnections';
import { createPalacePaving } from './palaceWater';
import type { Materials } from './materials';

const site = landmarks.find(s => s.id === 'forbidden-city')!;
const data: CityData = {
  buildings: bundled.buildings as CityData['buildings'],
  context: JSON.parse(context).features.filter((f: { properties: { kind: string } }) => f.properties.kind === 'water').map((f: { properties: { name: string; osmId: number }; geometry: { coordinates: [number, number][][] } }) => ({
    kind: 'water', name: f.properties.name, osmId: f.properties.osmId,
    coordinates: f.geometry.coordinates[0].map(wgs84ToGcj02),
    holes: f.geometry.coordinates.slice(1).map(r => r.map(wgs84ToGcj02)),
  })),
};
data.context.push(...palaceWaterConnections(data.context));
const palette: Record<string, THREE.MeshBasicMaterial> = {};
const m = new Proxy(palette, { get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial() }) as unknown as Materials;
const [ox, oz] = project(site.coords);

it('leaves the mapped inner river open through palace paving, courts and the axial walk after baking', () => {
  const model = bake(createLandmark(site, m, data), false); model.updateMatrixWorld(true);
  const paving = new Set([m.paving, m.stone, m.darkStone, m.brass]);
  // Independent WGS84 points inside the archived western, central and eastern river polygons.
  for (const coords of [[116.3885, 39.91332], [116.3908, 39.91309], [116.392635, 39.9141]] as [number, number][]) {
    const [x, z] = project(wgs84ToGcj02(coords));
    const ray = new THREE.Raycaster(new THREE.Vector3(x - ox, .4, z - oz), new THREE.Vector3(0, -1, 0));
    const blockers = ray.intersectObject(model, true).filter(hit => paving.has((hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial));
    expect(blockers, `paving over river at ${coords}`).toHaveLength(0);
  }
  // Land immediately north of the central channel must remain paved.
  const [x, z] = project(wgs84ToGcj02([116.3908, 39.91323]));
  const ray = new THREE.Raycaster(new THREE.Vector3(x - ox, .4, z - oz), new THREE.Vector3(0, -1, 0));
  expect(ray.intersectObject(model, true).some(hit => paving.has((hit.object as THREE.Mesh).material as THREE.MeshStandardMaterial))).toBe(true);
});

it('connects five marble bridges to both river banks and keeps a channel below each arch', () => {
  const model = createLandmark(site, m, data); model.updateMatrixWorld(true);
  const bridges: THREE.Object3D[] = [];
  model.traverse(o => { if (o.name === 'inner-jinshui-bridge') bridges.push(o); });
  expect(bridges).toHaveLength(5);
  for (const bridge of bridges) {
    const bounds = new THREE.Box3().setFromObject(bridge), center = bounds.getCenter(new THREE.Vector3());
    const top = new THREE.Raycaster(new THREE.Vector3(center.x, 1, center.z), new THREE.Vector3(0, -1, 0));
    const hit = top.intersectObject(bridge, true)[0];
    expect(hit).toBeDefined();
    expect(hit.point.y).toBeGreaterThan(.15);
    const under = new THREE.Raycaster(new THREE.Vector3(bounds.min.x - .1, .05, center.z), new THREE.Vector3(1, 0, 0), 0, bounds.max.x - bounds.min.x + .2);
    expect(under.intersectObject(bridge, true)).toHaveLength(0);
    for (const end of [bounds.min.z + .03, bounds.max.z - .03]) {
      const bank = new THREE.Raycaster(new THREE.Vector3(center.x, .09, end), new THREE.Vector3(0, -1, 0));
      expect(bank.intersectObject(model, true).length, 'bridge approach meets a paved bank').toBeGreaterThan(0);
    }
  }
});

it('cuts overlapping display links out of all paving layers without adding banks across their joins', () => {
  // Gallery floors can conceal the channel in the full landmark, so inspect
  // the land mesh separately for these crossings and its actual merged output.
  const paving = bake(createPalacePaving(site, data, m, 0, 96), false);
  paving.updateMatrixWorld(true);
  for (const coords of [[116.38965,39.91338],[116.39222,39.91347],[116.39279,39.91452],[116.39351,39.91459]] as [number,number][]) {
    const [x,z] = project(wgs84ToGcj02(coords));
    const ray = new THREE.Raycaster(new THREE.Vector3(x-ox,.4,z-oz),new THREE.Vector3(0,-1,0));
    expect(ray.intersectObject(paving,true), `ground closes link at ${coords}`).toHaveLength(0);
  }
  for(const link of data.context.filter(f=>f.geometryOrigin==='display-link')) {
    const ring = link.coordinates.map(project);
    const a = new THREE.Vector3((ring[0][0]+ring[3][0])/2-ox,0,(ring[0][1]+ring[3][1])/2-oz);
    const b = new THREE.Vector3((ring[1][0]+ring[2][0])/2-ox,0,(ring[1][1]+ring[2][1])/2-oz);
    const delta = b.clone().sub(a);
    // Endpoint caps meet the original polygon banks; the open span between
    // those joins must remain free of cross-channel paving.
    const from = a.clone().addScaledVector(delta, .1);
    const to = b.clone().addScaledVector(delta, -.1);
    const ray = new THREE.Raycaster(from,to.clone().sub(from).normalize(),0,from.distanceTo(to));
    expect(ray.intersectObject(paving,true), `bank blocks ${link.displayId}`).toHaveLength(0);
  }
});
