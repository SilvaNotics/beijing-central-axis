export type RegionId = 'north' | 'central' | 'south';
export type LandmarkKind = 'palace' | 'hill' | 'tower' | 'bridge' | 'altar' | 'temple' | 'gate' | 'square' | 'road';
export interface Landmark {
  id: string;
  name: string;
  enName: string;
  region: RegionId;
  category: string;
  era: string;
  coords: [number, number];
  footprint: [number, number];
  kind: LandmarkKind;
  summary: string;
  fact: string;
  sourceIds: string[];
}
export interface Region {
  id: RegionId;
  title: string;
  kicker: string;
  subtitle: string;
  description: string;
  color: string;
  entryUrl: string;
  siteIds: string[];
}
export interface Source { id: string; title: string; url: string; note: string; }
