import { expect, it } from 'vitest';
import * as THREE from 'three';
import bundled from '../../public/data/buildings.json';
import { landmarks } from '../data/heritage';
import { createLandmark } from './architecture';
import type { CityData } from './geodata';
import type { Materials } from './materials';

const reportedHouses = [40544224, 40544225, 40544226, 649255320, 40544875, 40544228, 40544234, 42681366, 42681367, 42681368];

it('keeps the full wall cap clear of windows at the reported east service houses', () => {
  const palette: Record<string, THREE.MeshBasicMaterial> = {};
  const m = new Proxy(palette, { get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial() }) as unknown as Materials;
  const site = landmarks.find(s => s.id === 'forbidden-city')!;
  const data: CityData = { buildings: bundled.buildings as CityData['buildings'], context: [] };
  const model = createLandmark(site, m, data);
  model.updateMatrixWorld(true);
  const buildings = new Map<number, THREE.Object3D>();
  model.traverse(o => { if (o.userData.osmId) buildings.set(o.userData.osmId, o); });
  const walls = model.getObjectByName('mapped-palace-wall-lines')!;
  for (const id of reportedHouses) {
    const contacts = walls.children.filter(o => o.userData.contactBuilding === id);
    expect(contacts.length, `house ${id} keeps its wall connection`).toBeGreaterThan(0);
    for (const contact of contacts) {
      const cap = contact.children[2] as THREE.Mesh;
      cap.geometry.computeBoundingBox();
      const bounds = cap.geometry.boundingBox!;
      // Shoot through the actual cap's centre at window height. Include its
      // longitudinal overhang, which a ray along the wall body would miss.
      const a = cap.localToWorld(new THREE.Vector3(bounds.min.x, .03, 0));
      const b = cap.localToWorld(new THREE.Vector3(bounds.max.x, .03, 0));
      const direction = b.clone().sub(a).normalize(), length = a.distanceTo(b);
      for (const offset of [-.03, 0, .03]) {
        const start = a.clone().add(new THREE.Vector3(-direction.z * offset, 0, direction.x * offset));
        const hit = new THREE.Raycaster(start, direction, 0, length - .001).intersectObject(buildings.get(id)!, true)[0];
        expect(Boolean(hit), `wall ${contact.userData.osmWallId} cap enters house ${id}`).toBe(false);
      }
    }
  }
}, 30_000);

it('joins the outside columns instead of running through the veranda to recessed windows', () => {
  const palette: Record<string, THREE.MeshBasicMaterial> = {};
  const m = new Proxy(palette, { get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial() }) as unknown as Materials;
  const site = landmarks.find(s => s.id === 'forbidden-city')!;
  const data: CityData = { buildings: bundled.buildings as CityData['buildings'], context: [] };
  const model = createLandmark(site, m, data);
  model.updateMatrixWorld(true);
  const buildings = new Map<number, THREE.Object3D>();
  model.traverse(o => { if (o.userData.osmId) buildings.set(o.userData.osmId, o); });
  const walls = model.getObjectByName('mapped-palace-wall-lines')!;
  for (const id of reportedHouses) {
    const contacts = walls.children.filter(o => o.userData.contactBuilding === id && !o.userData.contactElbow);
    expect(contacts.length, `house ${id} still connects to the court wall`).toBeGreaterThan(0);
    const building=buildings.get(id)!;
    const body=building.getObjectByName('timber-enclosure')!.parent!;
    const columnPoints:THREE.Vector3[]=[];
    building.traverse(o=>{
      if(o instanceof THREE.Mesh&&o.geometry.type==='CylinderGeometry')
        columnPoints.push(body.worldToLocal(o.getWorldPosition(new THREE.Vector3())));
    });
    expect(columnPoints.length).toBeGreaterThan(0);
    const minX=Math.min(...columnPoints.map(p=>p.x))+.04,maxX=Math.max(...columnPoints.map(p=>p.x))-.04;
    const minZ=Math.min(...columnPoints.map(p=>p.z))+.04,maxZ=Math.max(...columnPoints.map(p=>p.z))-.04;
    for(const segment of walls.children.filter(o=>o.userData.contactBuilding===id)) {
      const mesh=segment.children[1] as THREE.Mesh;
      for(const t of [0,.25,.5,.75,1]) {
        const point=body.worldToLocal(mesh.localToWorld(new THREE.Vector3(t-.5,0,0)));
        expect(point.x>minX&&point.x<maxX&&point.z>minZ&&point.z<maxZ,
          `wall ${segment.userData.osmWallId} must not turn inside house ${id}'s veranda`).toBe(false);
      }
    }
    for (const contact of contacts) {
      const mesh = contact.children[1] as THREE.Mesh;
      const end = mesh.localToWorld(new THREE.Vector3(.5, 0, 0));
      end.y = .23;
      const direction = new THREE.Vector3(1, 0, 0).transformDirection(mesh.matrixWorld);
      const hit = new THREE.Raycaster(end.clone().addScaledVector(direction, -.005), direction, 0, .05)
        .intersectObject(buildings.get(id)!, true)[0];
      expect(Boolean(hit), `house ${id} has a visible structural contact`).toBe(true);
      let column = false;
      for (let object: THREE.Object3D | null = hit?.object ?? null; object; object = object.parent)
        if (object.name.startsWith('timber-columns-')) column = true;
      expect(column, `wall ${contact.userData.osmWallId} must end at the outer column, not the inner window`).toBe(true);
    }
  }
}, 30_000);


it('keeps the wall body out of the concave southwest kitchen room and its facade details', () => {
  const palette: Record<string, THREE.MeshBasicMaterial> = {};
  const m = new Proxy(palette, { get: (t, k: string) => t[k] ??= new THREE.MeshBasicMaterial() }) as unknown as Materials;
  const site = landmarks.find(s => s.id === 'forbidden-city')!;
  const data: CityData = { buildings: bundled.buildings as CityData['buildings'], context: [] };
  const model = createLandmark(site, m, data);
  model.updateMatrixWorld(true);
  let building: THREE.Object3D | undefined;
  model.traverse(o => { if (o.userData.osmId === 654664225) building = o; });
  expect(building).toBeDefined();
  const walls = model.getObjectByName('mapped-palace-wall-lines')!.children.filter(o => o.userData.osmWallId === 654664219);
  expect(walls.length).toBeGreaterThan(0);
  for (const wall of walls) {
    const mesh = wall.children[1] as THREE.Mesh;
    const a = mesh.localToWorld(new THREE.Vector3(-.5, 0, 0));
    const b = mesh.localToWorld(new THREE.Vector3(.5, 0, 0));
    const length = a.distanceTo(b), direction = b.clone().sub(a).normalize();
    for (const height of [.12, .23, .4]) for (const offset of [-.0325, 0, .0325]) {
      const start = new THREE.Vector3(a.x - direction.z * offset, height, a.z + direction.x * offset);
      const hit = new THREE.Raycaster(start, direction, .002, length - .002).intersectObject(building!, true)[0];
      expect(Boolean(hit), `wall ${wall.userData.osmWallId} crosses concave room at ${height}/${offset}`).toBe(false);
    }
    const cap = wall.children[2] as THREE.Mesh;
    cap.geometry.computeBoundingBox();
    const bounds = cap.geometry.boundingBox!;
    const capStart = cap.localToWorld(new THREE.Vector3(bounds.min.x, .03, 0));
    const capEnd = cap.localToWorld(new THREE.Vector3(bounds.max.x, .03, 0));
    const capDirection = capEnd.clone().sub(capStart).normalize(), capLength = capStart.distanceTo(capEnd);
    for (const offset of [-.03, 0, .03]) {
      const start = capStart.clone().add(new THREE.Vector3(-capDirection.z * offset, 0, capDirection.x * offset));
      expect(new THREE.Raycaster(start, capDirection, .001, capLength - .001).intersectObject(building!, true).length,
        'concave room also clears the cap overhang').toBe(0);
    }
  }
}, 30_000);
