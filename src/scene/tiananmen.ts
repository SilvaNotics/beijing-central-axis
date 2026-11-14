import * as THREE from 'three';
import type { Materials } from './materials';
import { tiananmenDepth, tiananmenPortalOpenings, tiananmenWidth } from './gateLayout';
import { roofGables, roofGeometry, roofSection } from './roofForms';
import { timberBody, timberEaves } from './timberArchitecture';

/** TIAN-DPM: nine by five bays, five openings and a 16.19m masonry bastion.
 * TIAN-VISIT: 34.7m overall, 66×37m tower envelope. Platform dimensions
 * use the documented bastion height; individual eave elevations and details
 * remain atlas interpretations rather than surveyed reconstruction.
 */
export const tiananmenRoofs = [
  { width: 6.6, depth: 3.7, y: 2.33, rise: .28, form: 'hipped' },
  { width: 6.1, depth: 3.2, y: 2.55, rise: .912, form: 'hip-gable' },
] as const;

const cube = new THREE.BoxGeometry(1, 1, 1);
function block(g: THREE.Group, material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) {
  const mesh = new THREE.Mesh(cube, material);
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d); g.add(mesh);
  return mesh;
}

function roofDetails(g: THREE.Group, m: Materials, roof: typeof tiananmenRoofs[number]) {
  const { width, depth, rise, y, form } = roof;
  const line = (points: THREE.Vector3[], radius: number) => {
    const curve = new THREE.CatmullRomCurve3(points);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 5, false), m.ridge));
  };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    // Hip ridges end at the gable shoulder; a hip-gable roof has no diagonal
    // across its vertical triangular end.
    const end = form === 'hip-gable' ? 3 / 8 : 1;
    line(Array.from({ length: 9 }, (_, i) => {
      const p = roofSection(width, depth, rise, i / 8 * end, form);
      return new THREE.Vector3(sx * p.w, y + p.y + p.corner + .015, sz * p.d);
    }), .012);
  }
  for (let i = 0; i <= 28; i++) for (const side of [-1, 1]) {
    const x = (i / 28 - .5) * width * .95;
    line(Array.from({ length: 9 }, (_, j) => {
      const p = roofSection(width, depth, rise, j / 8, form);
      return new THREE.Vector3(x * p.w / (width / 2), y + p.y + .006, side * p.d);
    }), .003);
  }
}

export function createTiananmen(g: THREE.Group, m: Materials) {
  const w = tiananmenWidth, d = tiananmenDepth, h = 1.619;
  // A notched outline makes the five arches open at pavement level, including
  // after material batching. Do not put an unperforated plinth across them.
  const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0);
  const portals = tiananmenPortalOpenings.map(({offset:x,radius,top}) => ({x,radius,top}));
  for (const { x, radius, top } of portals) {
    shape.lineTo(x - radius, 0); shape.lineTo(x - radius, top - radius);
    shape.absarc(x, top - radius, radius, Math.PI, 0, true);
    shape.lineTo(x + radius, 0);
  }
  shape.lineTo(w / 2, 0); shape.lineTo(w / 2, h); shape.lineTo(-w / 2, h); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 18 });
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i), x = positions.getX(i);
    // Taper only the outer flanks, keeping each passage on its bridge axis.
    positions.setX(i, Math.abs(x) > 5.6 ? x - Math.sign(x) * .2 * y / h : x);
    positions.setZ(i, (positions.getZ(i) - d / 2) * (1 - .031 * y / h));
  }
  geometry.computeVertexNormals();
  const platform = new THREE.Mesh(geometry, m.wall); platform.name = 'tiananmen-platform'; g.add(platform);
  let left = -w / 2;
  for (const { x, radius } of [...portals, { x: w / 2, radius: 0 }]) {
    const right = x - radius;
    for (const face of [-1, 1]) block(g, m.marble, (left + right) / 2, .0795, face * (d / 2 - .012), right - left, .159, .045);
    left = x + radius;
  }
  block(g, m.stone, 0, h + .02, 0, 11.65, .04, 3.92);
  for (const face of [-1, 1]) {
    block(g, m.marble, 0, h + .09, face * 1.93, 11.6, .085, .055);
    for (let i = 0; i <= 46; i++) block(g, m.marble, (i / 46 - .5) * 11.6, h + .12, face * 1.93, .028, .16, .035);
    block(g, m.marble, face * 5.8, h + .09, 0, .055, .085, 3.86);
    for (let i = 1; i < 15; i++) block(g, m.marble, face * 5.8, h + .12, (i / 15 - .5) * 3.86, .035, .16, .028);
  }

  const body = timberBody(g, m, 5.75, 2.8, .67, h + .04, true, { frontBays: 9, sideBays: 5 });
  body.name = 'tiananmen-hall';
  // Between the eaves is a short painted structural band, not another room
  // with a second row of full-height doors and columns.
  block(g, m.green, 0, 2.44, 0, 5.12, .22, 2.46);
  for (const face of [-1, 1]) {
    block(g, m.green, 0, 2.495, face * 1.24, 5.15, .13, .035);
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 5.12 / 9;
      block(g, m.paintedBlue, x, 2.455, face * 1.265, .43, .14, .012);
      block(g, m.goldLeaf, x, 2.455, face * 1.275, .30, .012, .008);
    }
  }
  for (const [index, roof] of tiananmenRoofs.entries()) {
    const mesh = new THREE.Mesh(roofGeometry(roof.width, roof.depth, roof.rise, roof.form), m.gold);
    mesh.name = index === 0 ? 'tiananmen-lower-roof' : 'tiananmen-upper-roof'; mesh.position.y = roof.y; g.add(mesh);
    timberEaves(g, m, roof.width, roof.depth, index === 0 ? 5.75 : 5.12, index === 0 ? 2.8 : 2.46, roof.y);
    const gables = roofGables(roof.width, roof.depth, roof.rise, roof.form, m.vermilion); gables.position.y = roof.y; g.add(gables);
    roofDetails(g, m, roof);
    if (index === 1) block(g, m.ridge, 0, roof.y + roof.rise - .025, 0, roofSection(roof.width, roof.depth, roof.rise, 1, roof.form).w * 2, .05, .075);
  }

  // Low flanking roof masses observed in IMG-TIANANMEN; sizes/positions are
  // schematic. The photograph is a reference, never a runtime texture.
  for (const side of [-1, 1]) {
    block(g, m.wall, side * 4.65, h + .18, -.2, 1.38, .32, .75);
    const wing = new THREE.Mesh(roofGeometry(1.55, .9, .22, 'gable'), m.gold);
    wing.position.set(side * 4.65, h + .34, -.2); g.add(wing);
    const ends = roofGables(1.55, .9, .22, 'gable', m.wall); ends.position.copy(wing.position); g.add(ends);
    block(g, m.marble, side * 7.44, .32, 1.8, .07, .64, .07);
    block(g, m.marble, side * 7.44, .65, 1.8, .24, .025, .08);
    block(g, m.darkStone, side * 5.65, .14, 2.55, .25, .28, .48);
  }
  // Portrait and slogan positions are abstract sign panels, without copying
  // the photograph, lettering or portrait artwork.
  block(g, m.stone, 0, .96, d / 2 + .022, .53, .66, .025);
  block(g, m.window, 0, .96, d / 2 + .039, .47, .60, .015);
  for (const side of [-1, 1]) {
    block(g, m.stone, side * 3.1, 1.00, d / 2 + .022, 3.15, .30, .025);
    block(g, m.wall, side * 3.1, 1.00, d / 2 + .039, 3.06, .23, .015);
  }
}
