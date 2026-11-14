import { expect, it } from 'vitest';
import contextSnapshot from '../../public/data/context.geojson?raw';
import { project } from './geo';
import { wgs84ToGcj02 } from './geodata';
import { squareGround } from './squareGround';
import { squarePlanParts } from './civicLayout';

it('extends the north paving to the south carriageway without covering the road', () => {
  const snapshot = JSON.parse(contextSnapshot);
  const road = snapshot.features.find((f: { id: string }) => f.id === 'way/127843732');
  const points = road.geometry.coordinates.map((p: [number, number]) => project(wgs84ToGcj02(p)));
  const ground = squareGround();
  for (const x of [ground.ring[0][0], ground.axisX, ground.ring[1][0]]) {
    const index = points.findIndex((p: [number, number], i: number) => i > 0 && points[i - 1][0] <= x && x <= p[0]);
    expect(index).toBeGreaterThan(0);
    const [a, b] = [points[index - 1], points[index]];
    const roadZ = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    // Current road renderer: 9 m carriageway plus 2 m border on each side.
    const clearance = ground.north - (roadZ + .65);
    expect(clearance).toBeGreaterThanOrEqual(0);
    expect(clearance).toBeLessThan(.5);
    expect(ground.contains([x === ground.axisX ? x : x + (x < ground.axisX ? .2 : -.2), roadZ + 1.2])).toBe(true);
  }
  expect(squarePlanParts().find(p => p.kind === 'plaza')?.ring).toEqual(ground.ring);
});
