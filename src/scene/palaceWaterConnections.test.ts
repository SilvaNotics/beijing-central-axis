import { expect, it } from 'vitest';
import source from '../../public/data/context.geojson?raw';
import { palaceWaterConnections } from './palaceWaterConnections';
import { project, pointInPolygon } from './geo';
import { wgs84ToGcj02, type CityContext } from './geodata';

const features = JSON.parse(source).features as { properties: { kind: string; name: string; osmId: number }; geometry: { coordinates: [number, number][][] } }[];
const context: CityContext[] = features.filter((f) => f.properties.kind === 'water').map((f) => ({
  kind: 'water', name: f.properties.name, osmId: f.properties.osmId,
  coordinates: f.geometry.coordinates[0].map(wgs84ToGcj02),
}));

it('connects the mapped river ends across both galleries and the eastern court without changing source rings', () => {
  const before = JSON.stringify(context);
  const links = palaceWaterConnections(context);
  expect(links).toHaveLength(4);
  const water = [...context, ...links].map(f => f.coordinates.map(project));
  // Hand-checked midpoints in the four source polygon gaps.
  for (const point of [[116.38965,39.91338],[116.39222,39.91347],[116.39279,39.91452],[116.39351,39.91459]] as [number,number][]) {
    expect(water.some(r => pointInPolygon(project(wgs84ToGcj02(point)),r)), `river connection at ${point}`).toBe(true);
  }
  expect(JSON.stringify(context)).toBe(before);
  expect(palaceWaterConnections([...context,...links])).toEqual([]);
  expect(palaceWaterConnections([])).toEqual([]);
});
