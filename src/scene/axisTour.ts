import { landmarks } from '../data/heritage';
import { project } from './geo';
import { mappedLayout, palaceAxis } from './layouts';
import { moundCenter } from './templeLayout';
import { roadStation } from './southernRoad';
import { wanningLayout } from './wanningLayout';
import { drumTowerDisplayOffset } from './bellDrumLayout';

export type TourMode = 'off' | 'playing' | 'paused' | 'complete';
export interface TourStop { siteId: string; name: string; x: number; y: number; z: number }
export interface TourStatus { index: number; total: number; name: string; progress: number }
export const TOUR_ANGLE = .9;
const HOLD_MS = 4200;

/** Display itinerary from the existing model, not a walkable or historical route. */
export function createTourStops(): TourStop[] {
  const stops: TourStop[] = [];
  const add = (siteId: string, name?: string, local = { x: 0, z: 0 }, y = 0) => {
    const site = landmarks.find(item => item.id === siteId)!;
    const [x, z] = project(site.coords);
    stops.push({ siteId, name: name ?? site.name, x: x + local.x, y, z: z + local.z });
  };
  const building = (siteId: string, id: number, y = 0, offsetX = 0) => {
    const p = mappedLayout(id, landmarks.find(item => item.id === siteId)!);
    add(siteId, p.name, { x: p.x + offsetX, z: p.z }, y);
  };
  for (const site of landmarks) {
    switch (site.id) {
      case 'forbidden-city':
        for (const id of palaceAxis) building(site.id, id);
        break;
      case 'tiantan': {
        const [x, z] = moundCenter(site);
        add(site.id, '圜丘坛', { x, z });
        building(site.id, 43921121); building(site.id, 43921139);
        break;
      }
      case 'xiannongtan': building(site.id, 587608667); building(site.id, 587608666); break;
      case 'shejitan': building(site.id, 60540199); break;
      case 'taimiao': building(site.id, 684772314); break;
      case 'jingshan': building(site.id, 26390235, 4.5); building(site.id, 26390117); break;
      case 'wanning': add(site.id, undefined, wanningLayout(site)); break;
      case 'bell-drum':
        building(site.id, 267371087, 0, drumTowerDisplayOffset(site));
        building(site.id, 425993664);
        break;
      case 'southern-road': {
        const [ox, oz] = project(site.coords);
        for (const station of [100, 400]) {
          const p = roadStation(station);
          add(site.id, station === 100 ? '南段道路 · 石板道路' : '南段道路 · 叠压遗存', { x: p.x - ox, z: p.z - oz });
        }
        break;
      }
      case 'square':
        add(site.id, '广场 · 毛主席纪念堂', { x: .3, z: 7.4 });
        add(site.id, '广场 · 人民英雄纪念碑', { x: -.8, z: -15.8 });
        break;
      default: add(site.id);
    }
  }
  return stops.sort((a, b) => b.z - a.z);
}

export function tourTravelMs(a: TourStop, b: TourStop) {
  return Math.max(2600, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / 22 * 1000);
}
export function tourDuration(stops: TourStop[]) {
  return stops.reduce((total, stop, i) => total + HOLD_MS + (i ? tourTravelMs(stops[i - 1], stop) : 0), 0);
}

/** Absolute elapsed-time sampling makes pauses and slow frames deterministic. */
export function sampleTour(stops: TourStop[], elapsedMs: number) {
  let remaining = Math.max(0, elapsedMs);
  for (let i = 0; i < stops.length; i++) {
    const a = stops[i];
    if (remaining < HOLD_MS || i === stops.length - 1) {
      return { ...a, index: i, done: i === stops.length - 1 && remaining >= HOLD_MS };
    }
    remaining -= HOLD_MS;
    const b = stops[i + 1], duration = tourTravelMs(a, b);
    if (remaining < duration) {
      const t = remaining / duration, eased = t * t * (3 - 2 * t);
      return { ...b, x: a.x + (b.x - a.x) * eased, y: a.y + (b.y - a.y) * eased, z: a.z + (b.z - a.z) * eased, index: i + 1, done: false };
    }
    remaining -= duration;
  }
  throw new Error('Tour needs at least one stop');
}
