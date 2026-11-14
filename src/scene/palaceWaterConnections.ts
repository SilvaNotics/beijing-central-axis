import type { CityContext } from './geodata';
import { project, unproject } from './geo';

type End = { osmId: number; vertices: number; edge: [number, number] };
const connections: { id: string; from: End; to: End; width: number }[] = [
  { id: 'jinshui-west-gallery', from: { osmId: 891271559, vertices: 84, edge: [0, 2] }, to: { osmId: 638204006, vertices: 64, edge: [59, 61] }, width: .45 },
  { id: 'jinshui-east-gallery', from: { osmId: 638204006, vertices: 64, edge: [26, 28] }, to: { osmId: 685378539, vertices: 38, edge: [19, 28] }, width: .35 },
  { id: 'jinshui-wenyuan-west', from: { osmId: 685378539, vertices: 38, edge: [4, 6] }, to: { osmId: 41657452, vertices: 13, edge: [0, 10] }, width: .30 },
  { id: 'jinshui-wenyuan-east', from: { osmId: 41657452, vertices: 13, edge: [4, 6] }, to: { osmId: 685378546, vertices: 38, edge: [0, 35] }, width: .35 },
];

/** Four display links, NOT newly surveyed water polygons. PAL-DRAINAGE-2019
 * supports the connected river system; the archived OSM ends set anchors.
 * Straight courses, 3–4.5m widths and 1.5m overlaps are display interpretations.
 * Vertex counts guard these snapshot-specific anchors against data replacement.
 */
export function palaceWaterConnections(context: CityContext[]): CityContext[] {
  const endpoint = (end: End) => {
    const feature = context.find(f => f.kind === 'water' && f.osmId === end.osmId);
    if (!feature || feature.coordinates.length !== end.vertices) return undefined;
    const [a, b] = end.edge.map(i => project(feature.coordinates[i]));
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as [number, number];
  };
  return connections.flatMap(link => {
    if (context.some(f => f.displayId === link.id)) return [];
    const a = endpoint(link.from), b = endpoint(link.to);
    if (!a || !b) return [];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < .01) return [];
    const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length;
    const ring: [number, number][] = [
      [a[0] - dx*.15 - dz*link.width/2, a[1] - dz*.15 + dx*link.width/2],
      [b[0] + dx*.15 - dz*link.width/2, b[1] + dz*.15 + dx*link.width/2],
      [b[0] + dx*.15 + dz*link.width/2, b[1] + dz*.15 - dx*link.width/2],
      [a[0] - dx*.15 + dz*link.width/2, a[1] - dz*.15 - dx*link.width/2],
    ];
    ring.push(ring[0]);
    return [{ kind: 'water', name: '内金水河连接（示意）', coordinates: ring.map(unproject),
      geometryOrigin: 'display-link', displayId: link.id, sourceOsmIds: [link.from.osmId, link.to.osmId] }];
  });
}
