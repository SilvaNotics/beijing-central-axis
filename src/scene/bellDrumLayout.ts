import { landmarks } from '../data/heritage';
import type { Landmark } from '../data/types';
import { project } from './geo';
import { mappedLayout } from './layouts';

/** Display-only translation onto the existing bell-drum → Wanning route segment. */
export function drumTowerDisplayOffset(site: Landmark): number {
  const drum = mappedLayout(267371087, site);
  const [originX, originZ] = project(site.coords);
  const [nextX, nextZ] = project(landmarks.find(item => item.id === 'wanning')!.coords);
  const axisX = (nextX - originX) * drum.z / (nextZ - originZ);
  return axisX - drum.x;
}
