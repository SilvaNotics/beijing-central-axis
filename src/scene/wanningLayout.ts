import type { Landmark } from '../data/types';
import { project } from './geo';
import { wgs84ToGcj02 } from './geodata';

// Bundled OSM way 561198196 explicitly carries bridge=yes and bridge:name=万宁桥.
// Its two road endpoints define the bridge placement; the Amap POI is a label anchor.
export const wanningRoadEndpoints:[number,number][]=[
  [116.3898859,39.9351679],[116.3898988,39.9348597],
];
export function wanningLayout(site:Landmark) {
  const [north,south]=wanningRoadEndpoints.map(p=>project(wgs84ToGcj02(p)));
  const [ox,oz]=project(site.coords);
  return {x:(north[0]+south[0])/2-ox,z:(north[1]+south[1])/2-oz,
    rotation:Math.atan2(south[0]-north[0],south[1]-north[1]),width:1.7,length:3.46};
}
