import * as THREE from 'three';
import type { Materials } from './materials';
import { roofGeometry, roofGables, roofSection } from './roofForms';
import { timberBody, timberEaves } from './timberArchitecture';

/** YONG-DONGCHENG / YONG-REBUILD: the extant rebuilt tower, not its lost
 * barbican or arrow tower. Elevations, taper and ornament remain schematic.
 */
export const yongdingmenPlatform = { width: 3.141, depth: 1.696, height: .8 };
export const yongdingmenRoofs = [
  { width: 2.92, depth: 1.55, y: 1.40, rise: .20, form: 'hipped' },
  { width: 2.85, depth: 1.43, y: 2.16, rise: .17, form: 'hipped' },
  { width: 2.67, depth: 1.32, y: 2.36, rise: .20, form: 'hip-gable' },
] as const;

const cube = new THREE.BoxGeometry(1, 1, 1);
function block(g: THREE.Group, material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number) {
  const mesh = new THREE.Mesh(cube, material);
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d); g.add(mesh); return mesh;
}

export function createYongdingmen(g: THREE.Group, m: Materials) {
  const { width: w, depth: d, height: h } = yongdingmenPlatform;
  const r = .26, archTop = .52;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0); shape.lineTo(-r, 0); shape.lineTo(-r, archTop - r);
  shape.absarc(0, archTop - r, r, Math.PI, 0, true); shape.lineTo(r, 0);
  shape.lineTo(w / 2, 0); shape.lineTo(w / 2 - .075, h); shape.lineTo(-w / 2 + .075, h); shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 20 });
  const vertices = geometry.getAttribute('position');
  for (let i = 0; i < vertices.count; i++) vertices.setZ(i, (vertices.getZ(i) - d / 2) * (1 - .08 * vertices.getY(i) / h));
  geometry.computeVertexNormals();
  const platform = new THREE.Mesh(geometry, m.grayBrick); platform.name = 'yongdingmen-platform'; g.add(platform);
  for (const sign of [-1, 1]) {
    // A split plinth keeps the central passage open right to the paving.
    block(g, m.stone, sign * (w / 4 + r / 2), .04, 0, w / 2 - r, .08, d);
    block(g, m.grayBrick, 0, .86, sign * .78, w - .15, .12, .07);
    block(g, m.grayRoof, 0, .925, sign * .78, w - .13, .025, .09);
    block(g, m.grayBrick, sign * (w / 2 - .12), .86, 0, .07, .12, d * .92);
    block(g, m.grayRoof, sign * (w / 2 - .12), .925, 0, .09, .025, d * .92);
  }
  block(g, m.stone, 0, .79, 0, w - .12, .035, d * .93);
  block(g, m.stone, 0, .675, d / 2 + .008, .30, .11, .02);
  block(g, m.grayBrick, 0, .675, d / 2 + .022, .26, .075, .012);

  const lower = timberBody(g, m, 2.4, 1.08, .56, .84, true, { frontBays: 7, sideBays: 3 });
  lower.name = 'yongdingmen-lower-hall';
  (lower.getObjectByName('timber-enclosure') as THREE.Mesh).material = m.grayBrick;
  // Upper floor and its balcony sit above the first roof. The third eave is
  // a short structural band, not a third inhabited floor.
  block(g, m.wood, 0, 1.625, 0, 2.56, .05, 1.22);
  const upper = timberBody(g, m, 2.35, 1.0, .51, 1.65, true, { frontBays: 7, sideBays: 3 });
  upper.name = 'yongdingmen-upper-hall';
  for (const side of [-1, 1]) {
    block(g, m.vermilion, 0, 1.76, side * .60, 2.56, .025, .025);
    for (let i = 0; i <= 21; i++) block(g, m.vermilion, (i / 21 - .5) * 2.56, 1.705, side * .60, .016, .15, .022);
    block(g, m.vermilion, side * 1.28, 1.76, 0, .025, .025, 1.2);
    for (let i = 1; i < 10; i++) block(g, m.vermilion, side * 1.28, 1.705, (i / 10 - .5) * 1.2, .022, .15, .016);
  }
  block(g, m.vermilion, 0, 2.26, 0, 2.28, .20, .96);
  for (const sign of [-1, 1]) block(g, m.green, 0, 2.315, sign * .49, 2.3, .065, .025);

  for (const roof of yongdingmenRoofs) {
    const tiles = roofGeometry(roof.width, roof.depth, roof.rise, roof.form);
    const mesh = new THREE.Mesh(tiles, m.grayRoof); mesh.position.y = roof.y; mesh.name = 'yongdingmen-roof'; g.add(mesh);
    // Only the first strip of the curved roof is green glazed edging. Its
    // geometric shape follows the tiles rather than a floating flat outline.
    const borderGeometry = tiles.clone(), uv = borderGeometry.getAttribute('uv'), index = borderGeometry.getIndex()!, indices: number[] = [];
    for (let i = 0; i < index.count; i += 3) {
      const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      if (tri.every(v => uv.getY(v) <= .251)) indices.push(...tri);
    }
    borderGeometry.setIndex(indices);
    const border = new THREE.Mesh(borderGeometry, m.green); border.position.y = roof.y + .003; border.name = 'yongdingmen-green-border'; g.add(border);
    const gables = roofGables(roof.width, roof.depth, roof.rise, roof.form, m.vermilion); gables.position.y = roof.y; g.add(gables);
    timberEaves(g, { ...m, ridge: m.green }, roof.width, roof.depth, 2.25, .94, roof.y, false);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const end = roof.form === 'hip-gable' ? 3 / 8 : 1;
      const points = Array.from({ length: 9 }, (_, i) => {
        const p = roofSection(roof.width, roof.depth, roof.rise, i / 8 * end, roof.form);
        return new THREE.Vector3(sx * p.w, roof.y + p.y + p.corner + .006, sz * p.d);
      });
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, .007, 5, false), m.green));
    }
  }
  const top = yongdingmenRoofs[2];
  block(g, m.green, 0, 2.582, 0, roofSection(top.width, top.depth, top.rise, 1, top.form).w * 2, .044, .045);
}
