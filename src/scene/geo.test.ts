import { describe, expect, it } from 'vitest';
import { project, unproject, pointInPolygon } from './geo';
describe('local geographic projection', () => {
  it('preserves geographic coordinates when projecting and returning', () => {
    const position = project([116.39586, 39.942439]);
    const result = unproject(position);
    expect(result[0]).toBeCloseTo(116.39586, 8);
    expect(result[1]).toBeCloseTo(39.942439, 8);
  });
  it('places northern sites above southern sites without collapsing east-west distance', () => {
    expect(project([116.39, 39.94])[1]).toBeLessThan(project([116.39, 39.87])[1]);
    expect(project([116.41, 39.9])[0]).toBeGreaterThan(project([116.38, 39.9])[0]);
  });
  it('excludes ordinary building fill from water and protected footprints', () => {
    const polygon: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
    expect(pointInPolygon([5, 5], polygon)).toBe(true);
    expect(pointInPolygon([11, 5], polygon)).toBe(false);
  });
});
