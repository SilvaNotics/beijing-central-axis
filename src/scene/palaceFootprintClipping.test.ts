import { expect, it } from 'vitest';
import { clipPalaceFootprint } from './palaceCityWalls';

type Point = [number, number];
const boundary: Point[] = [[-5, -5], [5, -5], [5, 5], [-5, 5]];

it.each([false, true])('preserves an interior footprint and its vertex order (closed: %s)', closed => {
  // A no-op clip must not trigger the generic-building fallback in architecture.ts.
  const ring: Point[] = [[-2, -2], [2, -2], [2, 2], [0, 3], [-2, 2]];
  if (closed) ring.push([...ring[0]]);
  const original = structuredClone(ring);
  for (const bounds of [boundary, [...boundary].reverse()])
    expect(clipPalaceFootprint(ring, bounds)).toEqual(original);
  expect(ring).toEqual(original);
});

it('still clips crossing footprints and discards exterior ones without changing source data', () => {
  const ring: Point[] = [[3, -1], [7, -1], [7, 1], [3, 1]];
  const original = structuredClone(ring);
  for (const bounds of [boundary, [...boundary].reverse()]) {
    const result = clipPalaceFootprint(ring, bounds);
    expect(result).toHaveLength(4);
    expect(result).toEqual(expect.arrayContaining([[3, -1], [5, -1], [5, 1], [3, 1]]));
    expect(clipPalaceFootprint(ring.map(([x, z]) => [x + 10, z]), bounds)).toEqual([]);
  }
  expect(ring).toEqual(original);
});
