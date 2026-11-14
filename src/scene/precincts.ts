import { project } from './geo';
import { wgs84ToGcj02, type FootprintLayout } from './geodata';
import type { Landmark } from '../data/types';

// Exterior corners of the four surviving corner-wall footprints in the bundled
// OSM data. Keeping this polygon in geographic coordinates also aligns the moat.
export const palaceBoundary: [number, number][] = [
  [116.386202, 39.920878], [116.3949763, 39.9211913],
  [116.3953903, 39.912531], [116.3866043, 39.9122127],
];
export function localPalaceBoundary(site: Landmark): [number, number][] {
  const [ox, oz] = project(site.coords);
  return palaceBoundary.map(point => {
    const [x, z] = project(wgs84ToGcj02(point));
    return [x - ox, z - oz];
  });
}

/** Architectural orientation from the mapped palace wall, in the atlas plane. */
export function palaceRoofRotation() {
  const a=project(wgs84ToGcj02(palaceBoundary[0])),b=project(wgs84ToGcj02(palaceBoundary[1]));
  return -Math.atan2(b[1]-a[1],b[0]-a[0]);
}

/** Remove tiny digitising-angle differences without growing a roof footprint. */
export function alignPalaceRoof(layout: FootprintLayout): FootprintLayout {
  const datum=palaceRoofRotation();
  const rotation=datum+Math.round((layout.rotation-datum)/(Math.PI/2))*(Math.PI/2);
  const delta=Math.abs(layout.rotation-rotation);
  if(delta>.05)return layout;
  const c=Math.cos(delta),s=Math.sin(delta),denominator=c*c-s*s;
  const width=(layout.width*c-layout.depth*s)/denominator;
  const depth=(layout.depth*c-layout.width*s)/denominator;
  if(width<layout.width*.7||depth<layout.depth*.7)return layout;
  return {...layout,rotation,width,depth};
}
