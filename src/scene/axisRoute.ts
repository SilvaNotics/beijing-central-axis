import type { Landmark } from '../data/types';
import type { CityData } from './geodata';
import { palaceGateLayout } from './palaceGates';
import { project } from './geo';

type Point = [number, number];

/** Local display adjustment only: centre the route on Shenwumen's middle
 * passage, blending back into the original route within 70 m on each side. */
export function axisThroughShenwu(points: Point[], site: Landmark, data?: CityData): Point[] {
  if (!data || points.length < 2) return points.map(p => [...p]);
  const gate = palaceGateLayout(site, data, 638741722);
  if (!gate) return points.map(p => [...p]);
  const [ox, oz] = project(site.coords), centerZ = oz + gate.z;
  const sorted = points.map(([x,z]): Point => [x,z]).sort((a,b) => a[1]-b[1]);
  const inserted: Point[] = [];
  for (const z of [-7, -3, 0, 3, 7].map(offset=>centerZ+offset)) {
    if (z <= sorted[0][1] || z >= sorted.at(-1)![1] || sorted.some(p=>Math.abs(p[1]-z)<1e-7)) continue;
    const index = sorted.findIndex(p=>p[1]>z), a = sorted[index-1], b = sorted[index];
    inserted.push([a[0]+(b[0]-a[0])*(z-a[1])/(b[1]-a[1]),z]);
  }
  return [...sorted,...inserted].sort((a,b)=>a[1]-b[1]).map(([x,z]): Point => {
    const distance = Math.abs(z-centerZ);
    if (distance >= 7) return [x,z];
    const weight = Math.min(1,(7-distance)/4);
    const gateX = ox + gate.x + Math.tan(gate.rotation)*(z-centerZ);
    return [x+(gateX-x)*weight,z];
  });
}
