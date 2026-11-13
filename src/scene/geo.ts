export const ORIGIN: [number, number] = [116.3975, 39.9074];
const longitudeScale = 11132 * Math.cos(ORIGIN[1] * Math.PI / 180);
/** GCJ-02 coordinates to a local plane. One model unit represents ten metres. */
export function project([longitude, latitude]: [number, number]): [number, number] {
  return [(longitude - ORIGIN[0]) * longitudeScale, -(latitude - ORIGIN[1]) * 11132];
}
export function unproject([x, z]: [number, number]): [number, number] {
  return [x / longitudeScale + ORIGIN[0], ORIGIN[1] - z / 11132];
}
export function pointInPolygon([x, y]: [number, number], polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
