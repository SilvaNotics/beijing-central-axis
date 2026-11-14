import * as THREE from 'three';
import type { Landmark } from '../data/types';
import { localBuildingRing, type CityData } from './geodata';
import { project } from './geo';
import { palaceRoofRotation } from './precincts';
import type { Materials } from './materials';
import type { HallProfile } from './palaceArchitecture';
import { wallRuns } from './wallRuns';

type Point = [number, number];
export const palaceGateIds = [638156366, 638741722, 40343947, 40343948] as const;
const cube = new THREE.BoxGeometry(1, 1, 1);

function openRing(ring: Point[]) {
  return ring.length > 1 && Math.hypot(ring[0][0] - ring.at(-1)![0], ring[0][1] - ring.at(-1)![1]) < 1e-7 ? ring.slice(0, -1) : ring;
}

/** Intersections with a north–south section, retaining the mapped gate platform. */
function section(ring: Point[], x: number) {
  const values: number[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x)) values.push(a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]));
  }
  return values.sort((a, b) => a - b);
}

export function palaceGateLayout(site: Landmark, data: CityData, id: number) {
  const source = data.buildings.find(b => b.id === id);
  if (!source) return;
  const [ox, oz] = project(site.coords), world = openRing(localBuildingRing(source).map(([x, z]): Point => [x - ox, z - oz]));
  const x = (Math.min(...world.map(p => p[0])) + Math.max(...world.map(p => p[0]))) / 2;
  const z = (Math.min(...world.map(p => p[1])) + Math.max(...world.map(p => p[1]))) / 2;
  const sideGate = id === 40343947 || id === 40343948;
  const rotation = palaceRoofRotation() + (sideGate ? Math.PI / 2 : 0), c = Math.cos(rotation), s = Math.sin(rotation);
  const local = ([px, pz]: Point): Point => [c * (px - x) - s * (pz - z), s * (px - x) + c * (pz - z)];
  const ring = world.map(local), meridian = id === 638156366;
  const wallIds = meridian ? [638206927, 156149069] : id === 40343947 ? [156151148, 156151306] : id === 40343948 ? [156149281, 156150832] : [156148390, 156148328];
  const walls = wallIds.flatMap(wallId => {
    const building = data.buildings.find(b => b.id === wallId);
    return building ? [{ wallId, ring: openRing(localBuildingRing(building).map(([px, pz]): Point => [px - ox, pz - oz])) }] : [];
  });
  const joins = walls.flatMap(wall => {
    const shared = wall.ring.map((a, edgeIndex) => ({ a, b: wall.ring[(edgeIndex + 1) % wall.ring.length], edgeIndex }))
      .filter(({ a, b }) => [a, b].every(p => world.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-6)))
      .filter(({ a, b }) => { const p = local(a), q = local(b); return Math.abs(p[0] - q[0]) < Math.abs(p[1] - q[1]) * .3; });
    if (!shared.length) return [];
    const edge = shared.reduce((a, b) => Math.hypot(a.a[0] - a.b[0], a.a[1] - a.b[1]) > Math.hypot(b.a[0] - b.b[0], b.a[1] - b.b[1]) ? a : b);
    return [{ wallId: wall.wallId, edgeIndex: edge.edgeIndex, x: local(edge.a)[0] }];
  });
  // PAL-UMEN gives 12 m for the platform. Shenwumen's platform elevation is
  // aligned to the adjacent 9.9 m wall as an atlas interpretation, not a survey.
  const height = meridian ? 1.2 : .99;
  // Side-gate ways also include narrow wall/stair extensions. Only the space
  // between the mapped contacts is the main platform; those extensions are not roof.
  const mainX = sideGate && joins.length === 2 ? (joins[0].x + joins[1].x) / 2 : 0;
  const portals = [-1, 0, 1].map(side => ({ x: mainX + side * (meridian ? 1.65 : 1.18), width: side ? .50 : .64, top: meridian ? .87 : .76 }));
  const mainSection = section(ring, mainX);
  const span = joins.length === 2 ? Math.abs(joins[0].x - joins[1].x) : 5.08;
  return { id, name: source.name!, x, z, rotation, ring, walls: walls.map(w => w.ring.map(local)), joins, height, portals, meridian, sideGate, mainX,
    mainZ: (mainSection[0] + mainSection.at(-1)!) / 2,
    // PAL-DONGHUAMEN / PAL-XIHUAMEN establish form and bays, not dimensions.
    // Leave a visible terrace around an estimated roof envelope inside the core.
    mainWidth: meridian ? 6.005 : sideGate ? span * .72 : (joins.length ? Math.min(...joins.map(j => Math.abs(j.x))) : 2.54) * 2 - .12,
    mainDepth: meridian ? 2.5 : sideGate ? (mainSection.at(-1)! - mainSection[0]) * .82 : mainSection.at(-1)! - mainSection[0] - .18 };
}

export const shenwuForecourtIds = [638741717, 638741716, 42740569, 42740572];

/** Pairwise display correction requested by the user. The original OSM rings
 * are retained in the snapshot; averaged extents are not measured dimensions. */
export function shenwuForecourtLayout(site: Landmark, data: CityData, id: number) {
  const pair = [[638741717, 638741716], [42740569, 42740572]].find(ids => ids.includes(id));
  if (!pair) return;
  const gate = palaceGateLayout(site, data, 638741722);
  const sources = pair.map(key => data.buildings.find(b => b.id === key));
  if (!gate || sources.some(b => !b)) return;
  const [ox, oz] = project(site.coords), c = Math.cos(gate.rotation), s = Math.sin(gate.rotation);
  const bounds = sources.map(source => {
    const ring = localBuildingRing(source!).map(([x, z]): Point => [c * (x - ox - gate.x) - s * (z - oz - gate.z), s * (x - ox - gate.x) + c * (z - oz - gate.z)]);
    const xs = ring.map(p => p[0]), zs = ring.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2, width: maxX - minX, depth: maxZ - minZ };
  });
  const distance = bounds.reduce((sum, b) => sum + Math.abs(b.x), 0) / 2;
  const localX = (id === pair[0] ? -1 : 1) * distance, localZ = (bounds[0].z + bounds[1].z) / 2;
  const w = (bounds[0].width + bounds[1].width) / 2, d = (bounds[0].depth + bounds[1].depth) / 2;
  const x = gate.x + localX * c + localZ * s, z = gate.z - localX * s + localZ * c;
  const turn = d > w ? Math.PI / 2 : 0, rotation = gate.rotation + turn;
  const ring: Point[] = [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([u,v]) => [x+u*c+v*s,z-u*s+v*c]);
  return { x, z, width: turn ? d : w, depth: turn ? w : d, rotation, height: .6, ring };
}

type GatePlan = NonNullable<ReturnType<typeof palaceGateLayout>>;
export type GateHall = { name: string; x: number; z: number; width: number; depth: number; rotation: number; elevation: number; profile: HallProfile };

/** Shared roof composition for the Three.js scene and the flat map. */
export function palaceGateHalls(plan: GatePlan): GateHall[] {
  const parts: GateHall[] = [];
  parts.push({ name: 'gate-main-hall', x: plan.mainX, z: plan.mainZ, width: plan.mainWidth, depth: plan.mainDepth, rotation: 0, elevation: plan.height,
    profile: { roof: 'hipped', double: true, height: plan.meridian ? 2.1 : plan.sideGate ? 1.65 : 2.11, platform: .10, frontBays: plan.meridian ? 9 : 5, sideBays: plan.meridian ? 5 : plan.sideGate ? 3 : 1 } });
  if (plan.meridian) {
    const cross = section(plan.ring.map(([x, z]): Point => [z, x]), 0);
    for (let side = 0; side < 2; side++) {
      const left = cross[side * 2], right = cross[side * 2 + 1], x = (left + right) / 2;
      const ends = section(plan.ring, x), south = ends.at(-1)!, pavilionZ = south - .9;
      const wingStart = plan.mainZ + .6, wingEnd = pavilionZ - .6;
      parts.push({ name: 'gate-wing-gallery', x, z: (wingStart + wingEnd) / 2, width: wingEnd - wingStart, depth: Math.min(1.25, right - left - .25), rotation: Math.PI / 2, elevation: plan.height,
        profile: { roof: 'hipped', double: false, height: .76, platform: .05, frontBays: 13, sideBays: 1 } });
      for (const z of [plan.mainZ, pavilionZ]) parts.push({ name: 'gate-wing-pavilion', x, z, width: 1.65, depth: 1.65, rotation: 0, elevation: plan.height,
        profile: { roof: 'pyramidal', double: true, height: 1.5, platform: .07, frontBays: 3, sideBays: 3 } });
    }
  }
  return parts;
}

function block(g: THREE.Group, m: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) {
  const mesh = new THREE.Mesh(cube, m); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); g.add(mesh); return mesh;
}

function platformHeight(plan: GatePlan, x: number) {
  if (!plan.meridian || !plan.joins.length) return plan.height;
  // A short transition within the existing platform closes the 2.1 m level
  // difference at each mapped wall contact. Its run is schematic.
  const distance = Math.min(...plan.joins.map(join => Math.abs(x - join.x)));
  return .99 + (plan.height - .99) * Math.min(1, distance / .65);
}

/** Clip only to an x slab; gate sections at the three portal bands are connected. */
function slab(ring: Point[], min: number, max: number) {
  let out = ring;
  for (const [limit, sign] of [[min, 1], [max, -1]]) {
    const input = out; out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i], b = input[(i + 1) % input.length], ai = sign * (a[0] - limit) >= 0, bi = sign * (b[0] - limit) >= 0;
      const intersect = (): Point => [limit, a[1] + (b[1] - a[1]) * (limit - a[0]) / (b[0] - a[0])];
      if (ai && bi) out.push(b);
      else if (ai) out.push(intersect());
      else if (bi) out.push(intersect(), b);
    }
  }
  return out;
}

function addPlatform(g: THREE.Group, plan: GatePlan, m: Materials) {
  const base = new THREE.Group(); base.name = 'gate-platform'; g.add(base);
  const minX = Math.min(...plan.ring.map(p => p[0])), maxX = Math.max(...plan.ring.map(p => p[0]));
  const cuts = [minX, ...plan.portals.flatMap(p => [p.x - p.width / 2, p.x + p.width / 2]), maxX,
    ...plan.joins.flatMap(j => [j.x - .65, j.x, j.x + .65])].filter(x => x >= minX && x <= maxX).sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const left = cuts[i], right = cuts[i + 1];
    if (right - left < 1e-7) continue;
    const portal = plan.portals.find(p => Math.abs((left + right) / 2 - p.x) < p.width / 2);
    const ring = slab(plan.ring, left, right);
    if (ring.length < 3) continue;
    const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
    const paving = new THREE.ShapeGeometry(shape); paving.rotateX(-Math.PI / 2);
    const surface = paving.getAttribute('position');
    for (let j = 0; j < surface.count; j++) surface.setY(j, platformHeight(plan, surface.getX(j)) + .002);
    const uv = paving.getAttribute('uv');
    for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * 6, uv.getY(j) * 6);
    paving.computeVertexNormals(); const walk = new THREE.Mesh(paving, m.paving); walk.name = 'gate-wall-walk'; g.add(walk);
    if (portal) continue;
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: plan.height, bevelEnabled: false }); geometry.rotateX(-Math.PI / 2);
    const position = geometry.getAttribute('position');
    for (let j = 0; j < position.count; j++) position.setY(j, position.getY(j) > .5 ? platformHeight(plan, position.getX(j)) : plan.sideGate ? .08 : 0);
    geometry.computeVertexNormals(); base.add(new THREE.Mesh(geometry, m.wall));
    if (plan.sideGate) {
      const stone = new THREE.ExtrudeGeometry(shape, { depth: .08, bevelEnabled: false }); stone.rotateX(-Math.PI / 2);
      const plinth = new THREE.Mesh(stone, m.marble); plinth.name = 'gate-white-stone-base'; base.add(plinth);
    }
  }
  for (const portal of plan.portals) {
    const r = portal.width / 2, spring = portal.top - r;
    const exteriorFace = plan.id === 40343947 ? 1 : 0;
    const inset = plan.sideGate ? .14 : 0;
    // The arch is the bottom boundary of a spandrel, open to ground on both faces.
    const shape = new THREE.Shape(); shape.moveTo(portal.x - r, spring);
    shape.absarc(portal.x, spring, r, Math.PI, 0, true);
    shape.lineTo(portal.x + r, plan.height); shape.lineTo(portal.x - r, plan.height); shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 20 });
    const positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const values = section(plan.ring, positions.getX(i));
      const start = values[0] + (exteriorFace === 0 ? inset : 0);
      const end = values.at(-1)! - (exteriorFace === 1 ? inset : 0);
      positions.setZ(i, start + positions.getZ(i) * (end - start));
    }
    geometry.computeVertexNormals(); const mesh = new THREE.Mesh(geometry, m.wall); mesh.name = 'gate-arch-spandrel'; base.add(mesh);
    if (plan.sideGate) {
      // Museum text and exterior photos: square outside, rounded on the inside.
      // The depth of the rectangular entrance recess is an atlas interpretation.
      const square = new THREE.Shape(); square.moveTo(portal.x - r, portal.top);
      square.lineTo(portal.x + r, portal.top); square.lineTo(portal.x + r, plan.height);
      square.lineTo(portal.x - r, plan.height); square.closePath();
      const head = new THREE.ExtrudeGeometry(square, { depth: 1, bevelEnabled: false });
      const p = head.getAttribute('position');
      for (let i = 0; i < p.count; i++) {
        const values = section(plan.ring, p.getX(i));
        const front = exteriorFace ? values.at(-1)! - inset : values[0];
        p.setZ(i, front + p.getZ(i) * inset);
      }
      head.computeVertexNormals(); const lintel = new THREE.Mesh(head, m.wall); lintel.name = 'gate-square-entrance'; base.add(lintel);
    }
    for (const face of [0, 1]) {
      if (plan.sideGate && face === exteriorFace) {
        const values = section(plan.ring, portal.x), front = face ? values.at(-1)! + .015 : values[0] - .015;
        const lintel = block(g, m.stone, portal.x, portal.top + .03, front, portal.width + .18, .06, .04);
        lintel.name = 'gate-exterior-lintel';
        continue;
      }
      const outer = new THREE.Shape(); outer.absarc(portal.x, spring, r + .045, 0, Math.PI, false);
      outer.absarc(portal.x, spring, r, Math.PI, 0, true); outer.closePath();
      const trim = new THREE.ShapeGeometry(outer, 30), p = trim.getAttribute('position');
      for (let i = 0; i < p.count; i++) { const values = section(plan.ring, p.getX(i)); p.setZ(i, (face ? values.at(-1)! : values[0]) + (face ? .003 : -.003)); }
      if (!face) trim.setIndex(Array.from(trim.index!.array).reduce<number[]>((a, _, i, arr) => { if (i % 3 === 0) a.push(arr[i], arr[i + 2], arr[i + 1]); return a; }, []));
      const arch = new THREE.Mesh(trim, m.stone); arch.name = 'gate-arch-stone'; g.add(arch);
      for (const side of [-1, 1]) { const values = section(plan.ring, portal.x + side * r); block(g, m.stone, portal.x + side * (r + .022), spring / 2, (face ? values.at(-1)! : values[0]) + (face ? .003 : -.003), .045, spring, .018); }
    }
  }
  // Low platform edging follows the actual concave outline. Shared city-wall
  // sections stay open so neither coping nor a railing cuts across the walk.
  const sign = Math.sign(plan.ring.reduce((area, a, i) => { const b = plan.ring[(i + 1) % plan.ring.length]; return area + a[0] * b[1] - b[0] * a[1]; }, 0));
  for (let i = 0; i < plan.ring.length; i++) {
    const a = plan.ring[i], b = plan.ring[(i + 1) % plan.ring.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const normal: Point = [sign * (b[1] - a[1]) / length, -sign * (b[0] - a[0]) / length];
    const probe = (p: Point): Point => [p[0] + normal[0] * .003, p[1] + normal[1] * .003];
    for (const run of wallRuns(probe(a), probe(b), plan.walls)) {
      const [p, q] = run.map(([x, z]): Point => [x - normal[0] * .003, z - normal[1] * .003]);
      const dx = q[0] - p[0], dz = q[1] - p[1], length = Math.hypot(dx, dz);
      if (length < .03) continue;
      const edge = new THREE.Group(); edge.position.set((p[0] + q[0]) / 2, platformHeight(plan, (p[0] + q[0]) / 2), (p[1] + q[1]) / 2); edge.rotation.y = -Math.atan2(dz, dx); g.add(edge);
      if (plan.sideGate) {
        edge.name = 'gate-stone-balustrade';
        block(edge, m.marble, 0, .025, 0, length, .05, .045);
        const count = Math.max(1, Math.ceil(length / .24)), pitch = length / count;
        for (let j = 0; j <= count; j++) block(edge, m.marble, -length / 2 + j * pitch, .105, 0, .035, .16, .035);
        block(edge, m.marble, 0, .16, 0, length, .025, .035);
        block(edge, m.marble, 0, .09, 0, length, .055, .023);
      } else {
        block(edge, m.stone, 0, .025, 0, length, .05, .04);
        block(edge, m.wall, 0, .095, 0, length, .09, .04);
        block(edge, m.grayRoof, 0, .15, 0, length + .005, .025, .055);
      }
    }
  }
}

/** Gate decks preserve OSM contacts; roofs occupy their own architectural core.
 * PAL-UMEN / PAL-SHENWUMEN / PAL-DONGHUAMEN / PAL-XIHUAMEN support the
 * composition and bay counts, not the inferred dimensions of the side gates. */
export function createPalaceGates(site: Landmark, data: CityData, m: Materials, addHall: (g: THREE.Group, hall: GateHall) => void) {
  return palaceGateIds.flatMap(id => {
    const plan = palaceGateLayout(site, data, id); if (!plan) return [];
    const g = new THREE.Group(); g.name = plan.name; g.userData.osmId = id; g.position.set(plan.x, 0, plan.z); g.rotation.y = plan.rotation;
    addPlatform(g, plan, m);
    for (const part of palaceGateHalls(plan)) {
      if (plan.sideGate) {
        const plinth = block(g, m.marble, part.x, part.elevation + part.profile.platform / 2, part.z,
          part.width * .90, part.profile.platform, part.depth * .90);
        plinth.name = 'gate-hall-stone-plinth';
      }
      addHall(g, part);
    }
    return [g];
  });
}
