import { describe, expect, it } from 'vitest';
import { landmarks } from '../data/heritage';
import { createTourStops, sampleTour, tourDuration, tourTravelMs } from './axisTour';

describe('south to north detail tour', () => {
  const stops = createTourStops();
  it('covers every heritage element and follows monotonically northward model positions', () => {
    expect(new Set(stops.map(p => p.siteId))).toEqual(new Set(landmarks.map(p => p.id)));
    expect(stops[0].siteId).toBe('yongdingmen');
    expect(stops.at(-1)?.name).toBe('钟楼');
    for (let i = 1; i < stops.length; i++) expect(stops[i].z).toBeLessThanOrEqual(stops[i - 1].z);
    for (const stop of stops) expect([stop.x, stop.y, stop.z].every(Number.isFinite)).toBe(true);
    expect(stops.filter(p => p.siteId === 'forbidden-city')).toHaveLength(9);
    expect(stops.filter(p => p.siteId === 'tiantan').map(p => p.name)).toEqual(['圜丘坛', '皇穹宇', '祈年殿']);
  });
  it('holds details, interpolates without overshooting and finishes at the north end', () => {
    expect(sampleTour(stops, 3000)).toMatchObject({ x: stops[0].x, z: stops[0].z, done: false });
    const middle = sampleTour(stops, 3200 + tourTravelMs(stops[0], stops[1]) / 2);
    expect(middle.x).toBeCloseTo((stops[0].x + stops[1].x) / 2);
    expect(middle.z).toBeCloseTo((stops[0].z + stops[1].z) / 2);
    let previousZ = Infinity;
    for (let elapsed = 0; elapsed < tourDuration(stops); elapsed += 250) {
      const sample = sampleTour(stops, elapsed);
      expect(sample.z).toBeLessThanOrEqual(previousZ); previousZ = sample.z;
    }
    expect(sampleTour(stops, tourDuration(stops))).toMatchObject({ name: '钟楼', done: true });
  });
});
