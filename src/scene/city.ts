import * as THREE from 'three';
import { landmarks } from '../data/heritage';
import { project } from './geo';
import type { CityData } from './geodata';
import { createCityPlan } from './cityPlan';
import { createForest } from './forest';
import { bake, createLandmark } from './architecture';
import type { Materials } from './materials';

export const bounds = { width: 640, depth: 1090, centerX: 45, centerZ: 3 };
export interface City {
  object: THREE.Group;
  anchors: Map<string, THREE.Vector3>;
  pickers: THREE.Mesh[];
  halo: THREE.Mesh;
}

function path(points: [number, number][], width: number, material: THREE.Material, height: number) {
  const group = new THREE.Group();
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!length) continue;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, .035, length + .12), material);
    mesh.position.set((a[0] + b[0]) / 2, height, (a[1] + b[1]) / 2);
    mesh.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    group.add(mesh);
  }
  return group;
}

function waterSurface(data: CityData, material: THREE.Material) {
  const group = new THREE.Group();
  group.name = 'mapped-water';
  const toShapePath = (points: [number, number][], path: THREE.Shape | THREE.Path) => {
    points.map(project).forEach(([x, z], index) => {
      if (index === 0) path.moveTo(x, -z); else path.lineTo(x, -z);
    });
    path.closePath();
  };
  for (const feature of data.context.filter(item => item.kind === 'water')) {
    const shape = new THREE.Shape();
    toShapePath(feature.coordinates, shape);
    for (const hole of feature.holes ?? []) {
      const inner = new THREE.Path();
      toShapePath(hole, inner);
      shape.holes.push(inner);
    }
    const surface = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = .025;
    surface.renderOrder = 2;
    group.add(surface);
  }
  return group;
}

function palaceMoat(siteX: number, siteZ: number, material: THREE.Material) {
  const shape = new THREE.Shape();
  shape.moveTo(siteX - 40.2, -(siteZ - 52.2));
  shape.lineTo(siteX + 40.2, -(siteZ - 52.2));
  shape.lineTo(siteX + 40.2, -(siteZ + 52.2));
  shape.lineTo(siteX - 40.2, -(siteZ + 52.2));
  shape.closePath();
  const island = new THREE.Path();
  island.moveTo(siteX - 36.8, -(siteZ - 48.8));
  island.lineTo(siteX + 36.8, -(siteZ - 48.8));
  island.lineTo(siteX + 36.8, -(siteZ + 48.8));
  island.lineTo(siteX - 36.8, -(siteZ + 48.8));
  island.closePath();
  shape.holes.push(island);
  const moat = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  moat.name = 'forbidden-city-moat';
  moat.rotation.x = -Math.PI / 2;
  moat.position.y = .045;
  moat.renderOrder = 3;
  return moat;
}

export function createCity(m: Materials, data: CityData, sample = false): City {
  const object = new THREE.Group(), authored = new THREE.Group();
  const anchors = new Map<string, THREE.Vector3>();
  const pickers: THREE.Mesh[] = [];
  const ground = new THREE.Mesh(new THREE.BoxGeometry(bounds.width, 2.0, bounds.depth), m.earth);
  ground.position.set(bounds.centerX, -1.2, bounds.centerZ); ground.receiveShadow = true; object.add(ground);
  const base = new THREE.Mesh(new THREE.BoxGeometry(bounds.width + .8, 1, bounds.depth + .8), m.darkStone);
  base.position.set(bounds.centerX, -2.5, bounds.centerZ); object.add(base);
  // Fine brass boundary of a physical exhibition model.
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(bounds.width + .5, .06, bounds.depth + .5)), new THREE.LineBasicMaterial({ color: '#8e7956', transparent: true, opacity: .65 }));
  edge.position.set(bounds.centerX, -.15, bounds.centerZ); object.add(edge);

  const texture = new THREE.CanvasTexture(createCityPlan(data));
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 2;
  const terrainMaterial = new THREE.MeshBasicMaterial({ map: texture });
  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(bounds.width, bounds.depth), terrainMaterial);
  terrain.rotation.x = -Math.PI / 2; terrain.position.set(bounds.centerX, -.08, bounds.centerZ);
  terrain.name = 'city-plan'; object.add(terrain);
  object.add(waterSurface(data, m.water));
  const forbiddenCity = project(landmarks.find(site => site.id === 'forbidden-city')!.coords);
  object.add(palaceMoat(forbiddenCity[0], forbiddenCity[1], m.water));
  for (const site of landmarks) {
    const [x, z] = project(site.coords);
    const group = createLandmark(site, m, data); group.position.set(x, .05, z);
    authored.add(group);
    const anchorY = site.kind === 'temple' ? 9 : site.kind === 'hill' ? 10 : site.kind === 'tower' ? 9 : site.kind === 'gate' ? 9 : 5;
    anchors.set(site.id, new THREE.Vector3(x, anchorY, z));
    const pick = new THREE.Mesh(new THREE.BoxGeometry(Math.max(2.2, site.footprint[0] / 10), 6, Math.max(2.2, site.footprint[1] / 10)), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set(x, 3, z); pick.userData.id = site.id; pickers.push(pick); object.add(pick);
  }
  // The axial sequence follows point geometry rather than forcing a mathematically straight line.
  const centerline = landmarks.filter(site => !['shejitan', 'taimiao', 'tiantan', 'xiannongtan', 'square'].includes(site.id)).map(site => project(site.coords)).sort((a, b) => a[1] - b[1]);
  authored.add(path(centerline, .38, m.brass, .01));

  object.add(bake(authored),createForest(data,m));
  const halo = new THREE.Mesh(new THREE.RingGeometry(5, 5.18, 64), new THREE.MeshBasicMaterial({ color: '#d8b476', transparent: true, opacity: .75, depthWrite: false, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = .25; halo.visible = false; object.add(halo);
  if (sample) {
    // Same full-quality architecture as the main city, framed tightly for material inspection.
    object.name = 'courtyard-lighting-study';
  }
  return { object, anchors, pickers, halo };
}
