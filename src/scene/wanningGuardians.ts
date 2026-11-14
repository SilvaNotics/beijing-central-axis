import * as THREE from 'three';
import type { Materials } from './materials';

const stoneForm = new THREE.SphereGeometry(1, 14, 10);
const stoneBlock = new THREE.BoxGeometry(1, 1, 1);

/** Sculptural shorthand, not a scan: broad dragon head, folded paws and curled tail. */
function guardian(m: Materials) {
  const g = new THREE.Group(); g.name = '镇水兽';
  const round = (x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
    const mesh = new THREE.Mesh(stoneForm, m.civicStone);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); g.add(mesh);
  };
  const curve = (points: [number, number, number][], radius: number, material = m.civicStone) => {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(path, 12, radius, 6, false), material));
  };
  round(0, .085, .035, .09, .073, .14); // Low, rounded body.
  round(0, .13, -.105, .085, .078, .075);
  round(0, .095, -.18, .068, .033, .065); // Projecting blunt muzzle.
  round(0, .066, -.177, .062, .016, .058);
  for (const side of [-1, 1]) {
    round(side * .086, .041, -.055, .036, .032, .082);
    round(side * .082, .029, -.12, .044, .023, .05);
    round(side * .071, .046, .119, .047, .036, .055);
    round(side * .069, .175, -.065, .027, .033, .03); // Ears.
    curve([[side * .049, .18, -.095], [side * .06, .215, -.063], [side * .048, .224, -.03]], .012);
    round(side * .073, .15, -.145, .026, .015, .03); // Brows.
    const eye = new THREE.Mesh(stoneForm, m.civicStoneDark);
    eye.position.set(side * .073, .135, -.163); eye.scale.set(.013, .009, .009); g.add(eye);
    curve([[side * .063, .09, -.204], [side * .066, .077, -.177], [side * .055, .077, -.15]], .0035, m.civicStoneDark);
    for (const toe of [-1, 0, 1]) {
      curve([[side * .082 + toe * .017, .046, -.146], [side * .082 + toe * .017, .031, -.166]], .004);
    }
  }
  curve([[0, .067, .14], [.055, .073, .19], [.065, .11, .23], [.018, .135, .235], [-.009, .117, .207]], .018);
  for (let i = 0; i < 5; i++) round(0, .157 - i * .005, -.015 + i * .032, .018, .013, .02);
  return g;
}

/** BRIDGE-HERITAGE: four west (two levels on each bank), two east. */
export function addWanningGuardians(bridge: THREE.Group, m: Materials, width: number) {
  const original = guardian(m);
  for (const side of [-1, 1]) for (const bank of [-1, 1]) {
    const levels = side < 0 ? [0, 1] : [1];
    for (const level of levels) {
      // Deliberately approximate display offsets; no surveyed sculpture coordinates.
      const x = side * (width / 2 + .28), z = bank * (level ? .76 : .41);
      const top = level ? .24 : .035, height = level ? .28 : .075;
      const seat = new THREE.Mesh(stoneBlock, m.civicStoneDark);
      seat.name = '镇水兽岸座'; seat.position.set(x, top - height / 2, z);
      seat.scale.set(.55, height, level ? .54 : .31); bridge.add(seat);
      const beast = original.clone(); beast.position.set(x, top, z);
      // East-bank heads face the bridge; west-bank heads face the channel.
      beast.rotation.y = side > 0 ? Math.PI / 2 : bank < 0 ? Math.PI : 0;
      if (!level) beast.scale.setScalar(.8);
      bridge.add(beast);
    }
  }
}
