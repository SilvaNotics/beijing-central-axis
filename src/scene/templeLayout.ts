import type { Landmark } from '../data/types';
import { project } from './geo';
import { localFootprintLayout, wgs84ToGcj02, type BuildingFootprint } from './geodata';

export function localWgsPoint(point: [number, number], site: Landmark): [number, number] {
  const [x,z]=project(wgs84ToGcj02(point)),[ox,oz]=project(site.coords);
  return [x-ox,z-oz];
}

// Exterior corners from the bundled OSM perimeter walls, including the gates.
export const templeBoundaries: Record<string,[number,number][]> = {
  taimiao: [[116.3923487,39.9111623],[116.3947855,39.9112335],[116.3949066,39.9088077],[116.3924698,39.9087236]],
  shejitan: [[116.387317,39.9110275],[116.3898019,39.9110644],[116.3898606,39.9086075],[116.3873772,39.9085721]],
};
export function templeBoundary(site: Landmark) {
  return templeBoundaries[site.id].map(point=>localWgsPoint(point,site));
}

// Midpoint of the opposing east/west Lingxing gate footprints. The former
// arbitrary offset from Huangqiongyu put the north gates on top of the altar.
export const moundCenterWgs: [number,number] = [(116.406345+116.4075687)/2,(39.8755654+39.8755884)/2];
export function moundCenter(site: Landmark) { return localWgsPoint(moundCenterWgs,site); }

export const tiantanDetailedIds = new Set([
  43921139,43921121, // circular halls
  43921140,43921141,43921137,43921136,43921111,43921133, // prayer compound
  43921117,43921122,43921123,43921120,43922670, // vault compound and approach gates
  727026433,727026437,727026438,727026439, // open Lingxing stone gates
  31099286, // actual bent corridor outline
]);

/** Rectangle corners, used for court extents and wall openings. */
export function layoutCorners(building: BuildingFootprint, site: Landmark): [number,number][] {
  const p=localFootprintLayout(building,site),c=Math.cos(p.rotation),s=Math.sin(p.rotation);
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>[
    p.x+u*p.width/2*c+v*p.depth/2*s,
    p.z-u*p.width/2*s+v*p.depth/2*c,
  ]);
}
