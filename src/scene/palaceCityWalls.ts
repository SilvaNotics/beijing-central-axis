import * as THREE from 'three';
import type { Landmark } from '../data/types';
import { localBuildingRing, type CityData } from './geodata';
import { project } from './geo';
import type { Materials } from './materials';
import { wallRuns } from './wallRuns';
import { createPalaceCornerTower } from './palaceCornerTowers';
import { palaceGateIds } from './palaceGates';
export { cornerTowerPlan } from './palaceCornerTowers';

type Point = [number, number];
const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
const height = .99;
const setback = .06;
function block(group: THREE.Group, material: THREE.Material, a: Point, b: Point, y: number, h: number, depth: number) {
  const mesh = new THREE.Mesh(blockGeometry, material);
  mesh.position.set((a[0] + b[0]) / 2, y + h / 2, (a[1] + b[1]) / 2);
  mesh.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  mesh.scale.set(Math.hypot(b[0] - a[0], b[1] - a[1]), h, depth);
  group.add(mesh);
}

/** Mapped footprints own gate gaps. Only exposed edges receive a parapet;
 * the shared cross sections between neighbouring wall polygons stay open. */
export function palaceCityWallLayout(site: Landmark, data: CityData) {
  const [ox, oz] = project(site.coords);
  const walls = data.buildings.filter(b => /城墙/.test(b.name ?? '')).map(building => {
    const ring = localBuildingRing(building).map(([x, z]): Point => [x - ox, z - oz]);
    if (Math.hypot(ring[0][0] - ring.at(-1)![0], ring[0][1] - ring.at(-1)![1]) < 1e-7) ring.pop();
    return { id: building.id, name: building.name!, ring };
  });
  const gates = data.buildings.filter(b => palaceGateIds.some(id => id === b.id)).map(building =>
    localBuildingRing(building).map(([x, z]): Point => [x - ox, z - oz]));
  const allPoints = walls.flatMap(w => w.ring);
  const center: Point = [
    (Math.min(...allPoints.map(p => p[0])) + Math.max(...allPoints.map(p => p[0]))) / 2,
    (Math.min(...allPoints.map(p => p[1])) + Math.max(...allPoints.map(p => p[1]))) / 2,
  ];
  const layouts = walls.map(wall => {
    const { ring } = wall;
    const area = ring.reduce((s, a, i) => {
      const b = ring[(i + 1) % ring.length]; return s + a[0] * b[1] - b[0] * a[1];
    }, 0);
    const neighbours = [...walls.filter(w => w !== wall).map(w => w.ring), ...gates];
    const edges = ring.map((a, i) => {
      const b = ring[(i + 1) % ring.length], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      const sign = Math.sign(area);
      const normal: Point = [sign * dz / length, -sign * dx / length];
      const probe = (p: Point): Point => [p[0] + normal[0] * .003, p[1] + normal[1] * .003];
      const runs = wallRuns(probe(a), probe(b), neighbours).map(([c, d]) =>
        [c, d].map(p => [p[0] - normal[0] * .003, p[1] - normal[1] * .003] as Point) as [Point, Point])
        .filter(([c, d]) => Math.hypot(c[0] - d[0], c[1] - d[1]) > .02);
      const radial: Point = [(a[0] + b[0]) / 2 - center[0], (a[1] + b[1]) / 2 - center[1]];
      const facing = (normal[0] * radial[0] + normal[1] * radial[1]) / Math.hypot(...radial);
      return { a, b, normal, runs, outer: facing > .25, parapet: Math.abs(facing) > .25, exposed: runs.length > 0 };
    });
    return { ...wall, edges };
  });
  // A shared vertex needs the exposed normals from BOTH polygons. Applying
  // separate insets at the corner/long-wall seam tears their wall walks apart.
  const key = (p: Point) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;
  const normals = new Map<string, Point[]>();
  for (const wall of layouts) for (const edge of wall.edges) if (edge.exposed) {
    for (const p of [edge.a, edge.b]) {
      const list = normals.get(key(p)) ?? [];
      if (!list.some(n => n[0] * edge.normal[0] + n[1] * edge.normal[1] > .99999)) list.push(edge.normal);
      normals.set(key(p), list);
    }
  }
  return layouts.map(wall => {
    const top = wall.ring.map((p): Point => {
      const list = normals.get(key(p));
      if (!list?.length) return p;
      const a = list[0], b = list[1] ?? a, denominator = 1 + a[0] * b[0] + a[1] * b[1];
      if (denominator < .01) return p;
      return [p[0] - (a[0] + b[0]) * setback / denominator, p[1] - (a[1] + b[1]) * setback / denominator];
    });
    return { ...wall, top };
  });
}

/** Clip a footprint to the convex palace boundary, preserving unchanged vertex order. */
export function clipPalaceFootprint(source: Point[], boundary: Point[]): Point[] {
  const area = boundary.reduce((s, a, i) => { const b = boundary[(i + 1) % boundary.length]; return s + a[0] * b[1] - b[0] * a[1]; }, 0);
  const sign = Math.sign(area);
  let output = source.slice();
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i], b = boundary[(i + 1) % boundary.length], dx = b[0] - a[0], dz = b[1] - a[1];
    const inside = (p: Point) => sign * (dx * (p[1] - a[1]) - dz * (p[0] - a[0])) >= -1e-7;
    // A no-op pass would rotate the ring by one vertex. The caller compares
    // vertices to detect clipping before selecting the generic-building fallback.
    if (output.every(inside)) continue;
    const intersect = (p: Point, q: Point): Point => {
      const ex = q[0] - p[0], ez = q[1] - p[1], det = ex * dz - ez * dx;
      if (Math.abs(det) < 1e-10) return q;
      const t = ((a[0] - p[0]) * dz - (a[1] - p[1]) * dx) / det;
      return [p[0] + ex * t, p[1] + ez * t];
    };
    const input = output; output = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j], q = input[(j + 1) % input.length], pi = inside(p), qi = inside(q);
      if (pi && qi) output.push(q);
      else if (pi && !qi) output.push(intersect(p, q));
      else if (!pi && qi) output.push(intersect(p, q), q);
    }
    if (!output.length) return [];
  }
  return output;
}

/** PAL-CITY-WALL: tapered masonry, brick walk, outer crenels and inner coping.
 * Footprints and gates remain mapped; inset, spacing and brick scale are atlas parameters. */
export function createPalaceCityWalls(site: Landmark, data: CityData, m: Materials) {
  const group = new THREE.Group(); group.name = 'palace-exterior-city-walls';
  for (const wall of palaceCityWallLayout(site, data)) {
    const item = new THREE.Group(); item.name = wall.name; item.userData.osmId = wall.id; group.add(item);
    const shape = new THREE.Shape(wall.top.map(([x, z]) => new THREE.Vector2(x, -z)));
    const paving = new THREE.ShapeGeometry(shape); paving.rotateX(-Math.PI / 2);
    const pavingUV = paving.getAttribute('uv');
    for (let j = 0; j < pavingUV.count; j++) pavingUV.setXY(j, pavingUV.getX(j) * 6, pavingUV.getY(j) * 6);
    const walk = new THREE.Mesh(paving, m.paving); walk.position.y = height; item.add(walk);
    wall.edges.forEach((edge, i) => {
      const a = edge.a, b = edge.b, c = wall.top[i], d = wall.top[(i + 1) % wall.top.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const positions = [a[0], 0, a[1], c[0], height, c[1], d[0], height, d[1], a[0], 0, a[1], d[0], height, d[1], b[0], 0, b[1]];
      // Orient each face outwards for both clockwise and anticlockwise source rings.
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, height * 6, length * 6, height * 6, 0, 0, length * 6, height * 6, length * 6, 0], 2));
      geometry.computeVertexNormals();
      const normal = geometry.getAttribute('normal');
      if (normal.getX(0) * edge.normal[0] + normal.getZ(0) * edge.normal[1] < 0) {
        geometry.setIndex([0, 2, 1, 3, 5, 4]); geometry.computeVertexNormals();
      }
      item.add(new THREE.Mesh(geometry, edge.outer ? m.cityWallBrick : m.wall));
      for (const [start, end] of edge.runs) {
        block(item, m.stone, start, end, 0, .025, .018);
        if (!edge.parapet) continue;
        const projectTop = (p: Point): Point => {
          const t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (length * length);
          return [c[0] + (d[0] - c[0]) * t - edge.normal[0] * .021, c[1] + (d[1] - c[1]) * t - edge.normal[1] * .021];
        };
        const from = projectTop(start), to = projectTop(end), runLength = Math.hypot(to[0] - from[0], to[1] - from[1]);
        if (runLength < .04) continue;
        const details = new THREE.Group(); details.name = edge.outer ? 'outer-crenellations' : 'inner-coping'; item.add(details);
        block(details, m.cityWallBrick, from, to, height, edge.outer ? .073 : .095, .037);
        if (edge.outer) {
          const count = Math.max(1, Math.round(runLength / .28)), pitch = runLength / count;
          const point = (t: number): Point => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
          for (let j = 0; j < count; j++) {
            const t = (j + .5) / count, half = Math.min(.09, pitch * .31) / runLength;
            block(details, m.cityWallBrick, point(t - half), point(t + half), height + .073, .061, .037);
          }
        } else {
          block(details, m.gold, from, to, height + .095, .012, .052);
          block(details, m.ridge, from, to, height + .107, .009, .025);
        }
      }
    });
  }
  for (const wall of palaceCityWallLayout(site, data).filter(w => /[东南西北]{2}城墙/.test(w.name))) {
    const xs=wall.top.map(p=>p[0]),zs=wall.top.map(p=>p[1]);
    const x=(Math.min(...xs)+Math.max(...xs))/2,z=(Math.min(...zs)+Math.max(...zs))/2;
    const inwardX=x<0?1:-1,inwardZ=z<0?1:-1;
    const tower=createPalaceCornerTower(m,inwardX,inwardZ);
    tower.position.set(x,height,z);tower.userData.bastionId=wall.id;
    group.add(tower);
  }
  return group;
}
