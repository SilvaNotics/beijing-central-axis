import mappedBuildings from '../data/building-layouts.json';
import { project } from './geo';
import { wgs84ToGcj02 } from './geodata';
import type { Landmark } from '../data/types';

/** OSM bounding centres, cross-checked against official plans; dimensions are generalized. */
export function mappedLayout(osmId: number, site: Landmark) {
  const building = mappedBuildings.find(b => b.osmId === osmId);
  if (!building) throw new Error(`Missing documented structure ${osmId}`);
  const [x, z] = project(wgs84ToGcj02(building.coords as [number, number]));
  const [originX, originZ] = project(site.coords);
  return { ...building, x: x - originX, z: z - originZ, w: building.size[0] / 10, d: building.size[1] / 10 };
}
export const palaceAxis = [638308745, 638449347, 638473398, 638807674, 638981317, 638981229, 639012193, 40795244, 638741722];
export const jingshanPavilions = [189309373, 189309374, 26390235, 189309372, 189309369];
