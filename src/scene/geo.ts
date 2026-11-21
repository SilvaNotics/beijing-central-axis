export const ORIGIN: [number, number] = [116.3975, 39.9074];
const longitudeScale = 11132 * Math.cos(ORIGIN[1] * Math.PI / 180);
// Amap gate centres, checked 2026-11-13. Rotate the entire atlas, never individual
// landmark anchors: the palace axis is slightly west of geographic north.
export const AXIS_ROTATION = Math.atan2((116.397228 - 116.396786) * longitudeScale, (39.922305 - 39.913582) * 11132);
const cos = Math.cos(AXIS_ROTATION), sin = Math.sin(AXIS_ROTATION);
/** GCJ-02 to the shared axis-up plane. One unit is ten metres; distances are preserved. */
export function project([longitude, latitude]: [number, number]): [number, number] {
  const x = (longitude - ORIGIN[0]) * longitudeScale, z = -(latitude - ORIGIN[1]) * 11132;
  return [cos * x - sin * z, sin * x + cos * z];
}
export function unproject([x, z]: [number, number]): [number, number] {
  return [(cos * x + sin * z) / longitudeScale + ORIGIN[0], ORIGIN[1] - (-sin * x + cos * z) / 11132];
}
const ringBounds = new WeakMap<[number, number][], { minX: number; maxX: number; minZ: number; maxZ: number }>();
/** 外接框按环缓存：绝大多数查询点落在框外，先一步排除，省掉整圈遍历。 */
function boundsOf(polygon: [number, number][]) {
  let box = ringBounds.get(polygon);
  if (!box) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of polygon) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    box = { minX, maxX, minZ, maxZ };
    ringBounds.set(polygon, box);
  }
  return box;
}
export function pointInPolygon([x, y]: [number, number], polygon: [number, number][]): boolean {
  if (polygon.length < 3) return false;
  const box = boundsOf(polygon);
  if (x < box.minX || x > box.maxX || y < box.minZ || y > box.maxZ) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
