import { describe, expect, it } from 'vitest';
import { buildingHeight, wgs84ToGcj02 } from './geodata';
describe('mixed-source geographic data', () => {
  it('converts Beijing WGS84 positions to GCJ02 instead of mixing coordinate systems', () => {
    const [lon, lat] = wgs84ToGcj02([116.3913, 39.9075]);
    expect(lon).toBeCloseTo(116.39754, 4);
    expect(lat).toBeCloseTo(39.90890, 4);
  });
  it('does not transform coordinates outside mainland coverage', () => {
    expect(wgs84ToGcj02([-73.98, 40.75])).toEqual([-73.98, 40.75]);
  });
  it('prefers measured height, then levels, then a documented context default', () => {
    expect(buildingHeight({id:1,ring:[],height:12,levels:2})).toBe(12);
    expect(buildingHeight({id:1,ring:[],levels:3})).toBeCloseTo(9.6);
    expect(buildingHeight({id:1,ring:[]})).toBe(6);
  });
});
