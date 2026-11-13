import { project } from './geo';
import type { ContextFeature } from '../data/context';
export interface BuildingFootprint { id: number; ring: [number, number][]; height?: number; levels?: number; building?: string; roof?: string; name?: string; }
export interface CityContext extends ContextFeature { holes?: [number, number][][]; }
export interface CityData { buildings: BuildingFootprint[]; context: CityContext[]; }

/** WGS84 to GCJ-02, to align OSM geometry with the separately checked Amap anchors. */
export function wgs84ToGcj02([lon, lat]: [number, number]): [number, number] {
  if (lon < 72.004 || lon > 137.8347 || lat < .8293 || lat > 55.8271) return [lon, lat];
  const pi = Math.PI, x = lon - 105, y = lat - 35;
  let dLat = -100 + 2*x + 3*y + .2*y*y + .1*x*y + .2*Math.sqrt(Math.abs(x));
  let dLon = 300 + x + 2*y + .1*x*x + .1*x*y + .1*Math.sqrt(Math.abs(x));
  dLat += (20*Math.sin(6*x*pi) + 20*Math.sin(2*x*pi))*2/3;
  dLat += (20*Math.sin(y*pi) + 40*Math.sin(y/3*pi))*2/3;
  dLat += (160*Math.sin(y/12*pi) + 320*Math.sin(y*pi/30))*2/3;
  dLon += (20*Math.sin(6*x*pi) + 20*Math.sin(2*x*pi))*2/3;
  dLon += (20*Math.sin(x*pi) + 40*Math.sin(x/3*pi))*2/3;
  dLon += (150*Math.sin(x/12*pi) + 300*Math.sin(x/30*pi))*2/3;
  const rad = lat / 180*pi, sin = Math.sin(rad), magic = 1 - .006693421622965943 * sin*sin;
  dLat = dLat*180 / ((6378245*(1-.006693421622965943)) / (magic*Math.sqrt(magic))*pi);
  dLon = dLon*180 / (6378245 / Math.sqrt(magic)*Math.cos(rad)*pi);
  return [lon+dLon, lat+dLat];
}
export function buildingHeight(b: BuildingFootprint): number {
  return Math.max(2.5, Math.min(150, b.height && b.height > 0 ? b.height : b.levels && b.levels > 0 ? b.levels*3.2 : 6));
}
let cityDataPromise: Promise<CityData> | undefined;
export async function loadCityData(signal?: AbortSignal): Promise<CityData> {
  cityDataPromise ??= readCityData().catch(error => { cityDataPromise = undefined; throw error; });
  const data = await cityDataPromise;
  signal?.throwIfAborted();
  return data;
}
async function readCityData(): Promise<CityData> {
  const [b, c] = await Promise.all([
    fetch(`${import.meta.env.BASE_URL}data/buildings.json`).then(r => { if (!r.ok) throw new Error('本地建筑数据未能载入'); return r.json(); }),
    fetch(`${import.meta.env.BASE_URL}data/context.geojson`).then(r => { if (!r.ok) throw new Error('本地地形数据未能载入'); return r.json(); }),
  ]);
  const context: CityContext[] = [];
  for (const f of c.features) {
    const kind = f.properties.kind as ContextFeature['kind'];
    if (!['road', 'water', 'park'].includes(kind)) continue;
    const geometry = f.geometry;
    const polygons = geometry.type === 'LineString' ? [[geometry.coordinates]] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
    for (const polygon of polygons) {
      const [ring, ...holes] = polygon;
      if (!ring || ring.length < 2) continue;
      const highway = f.properties.highway;
      const width = highway === 'primary' ? 32 : highway === 'secondary' ? 24 : highway === 'tertiary' ? 17 : 9;
      context.push({ kind, name: f.properties.name || kind, coordinates: ring.map(wgs84ToGcj02), holes: holes.map((r: [number, number][]) => r.map(wgs84ToGcj02)), width });
    }
  }
  return { buildings: b.buildings, context };
}
export function localBuildingRing(building: BuildingFootprint) { return building.ring.map(point => project(wgs84ToGcj02(point))); }
