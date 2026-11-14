import * as THREE from 'three';
import type { Materials } from './materials';
import { roofGables, roofGeometry, roofSection } from './roofForms';
import { timberBody, timberEaves } from './timberArchitecture';

/** DUAN-OSM supplies the wide mapped bastion envelope. DUAN-DPM records the
 * Qing gatehouse as nine by five bays, with a 187-chi facade and 85.9-chi
 * depth. The 0.32m/ch'ih conversion, bastion height and eave levels remain
 * schematic estimates pending a measured elevation.
 */
export const duanmenPlatform = { width: 11.87, depth: 4.245, height: 1.3 };
export const duanmenPortalOpenings = [
  { offset: -3.6, radius: .18, top: .58 },
  { offset: -1.8, radius: .21, top: .64 },
  { offset: 0, radius: .24, top: .72 },
  { offset: 1.8, radius: .21, top: .64 },
  { offset: 3.6, radius: .18, top: .58 },
] as const;
export const duanmenRoofs = [
  { width: 6.15, depth: 2.95, y: 2.18, rise: .30, form: 'hipped' },
  { width: 5.85, depth: 2.7, y: 2.48, rise: .82, form: 'hip-gable' },
] as const;

const cube = new THREE.BoxGeometry(1, 1, 1);
function block(g: THREE.Group, material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) {
  const mesh = new THREE.Mesh(cube, material);
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d); g.add(mesh); return mesh;
}

export function createDuanmen(g: THREE.Group, m: Materials) {
  const { width: w, depth: d, height: h } = duanmenPlatform;
  const shape = new THREE.Shape(); shape.moveTo(-w / 2, 0);
  for (const { offset: x, radius, top } of duanmenPortalOpenings) {
    shape.lineTo(x - radius, 0); shape.lineTo(x - radius, top - radius);
    shape.absarc(x, top - radius, radius, Math.PI, 0, true);
    shape.lineTo(x + radius, 0);
  }
  shape.lineTo(w / 2, 0); shape.lineTo(w / 2 - .05, h); shape.lineTo(-w / 2 + .05, h); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 16 });
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    positions.setZ(i, (positions.getZ(i) - d / 2) * (1 - .018 * positions.getY(i) / h));
  }
  geometry.computeVertexNormals();
  const platform = new THREE.Mesh(geometry, m.wall); platform.name = 'duanmen-platform'; g.add(platform);

  // Split the white plinth at every opening so no rail or slab closes a
  // passage after the rest of the model is batched.
  let left = -w / 2;
  for (const { offset: x, radius } of [...duanmenPortalOpenings, { offset: w / 2, radius: 0 }]) {
    const right = x - radius;
    for (const face of [-1, 1]) block(g, m.marble, (left + right) / 2, .055, face * (d / 2 - .012), right - left, .11, .045);
    left = x + radius;
  }
  block(g, m.stone, 0, h + .025, 0, 10.25, .05, 3.42);
  for (const face of [-1, 1]) {
    block(g, m.marble, 0, h + .10, face * 1.68, 10.2, .07, .045);
    for (let i = 0; i <= 38; i++) block(g, m.marble, (i / 38 - .5) * 10.2, h + .13, face * 1.68, .025, .14, .03);
    block(g, m.marble, face * 5.1, h + .10, 0, .045, .07, 3.36);
    for (let i = 1; i < 13; i++) block(g, m.marble, face * 5.1, h + .13, (i / 13 - .5) * 3.36, .03, .14, .025);
  }

  const body = timberBody(g, m, 5.98, 2.75, .85, h + .04, true, { frontBays: 9, sideBays: 5 });
  body.name = 'duanmen-hall';
  // The second eave sits on a short painted structural band rather than a
  // second row of doors. The historic structure still has one main enclosure.
  block(g, m.green, 0, 2.33, 0, 5.36, .30, 2.36);
  for (const face of [-1, 1]) {
    block(g, m.green, 0, 2.38, face * 1.19, 5.38, .12, .03);
    for (let i = 0; i < 9; i++) {
      const x = (i - 4) * 5.38 / 9;
      block(g, m.paintedBlue, x, 2.34, face * 1.21, .45, .17, .012);
      block(g, m.goldLeaf, x, 2.34, face * 1.22, .31, .012, .008);
    }
  }

  for (const [index, roof] of duanmenRoofs.entries()) {
    const mesh = new THREE.Mesh(roofGeometry(roof.width, roof.depth, roof.rise, roof.form), m.gold);
    mesh.name = index === 0 ? 'duanmen-lower-roof' : 'duanmen-upper-roof';
    mesh.position.y = roof.y; g.add(mesh);
    timberEaves(g, m, roof.width, roof.depth, index === 0 ? 5.98 : 5.38, index === 0 ? 2.75 : 2.36, roof.y);
    const gables = roofGables(roof.width, roof.depth, roof.rise, roof.form, m.vermilion);
    gables.position.y = roof.y; g.add(gables);
    if (index === 1) {
      const ridgeWidth = roofSection(roof.width, roof.depth, roof.rise, 1, roof.form).w * 2;
      block(g, m.ridge, 0, roof.y + roof.rise - .0225, 0, ridgeWidth, .045, .07);
    }
  }
}
