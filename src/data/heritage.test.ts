import { describe, expect, it } from 'vitest';
import { landmarks, regions, sources } from './heritage';
describe('heritage atlas geography and chapter agreement', () => {
  it('preserves the 15 components with bell and drum towers as one component', () => {
    expect(landmarks).toHaveLength(15);
    expect(new Set(landmarks.map(s => s.id)).size).toBe(15);
    expect(landmarks.filter(s => s.id === 'bell-drum')).toHaveLength(1);
  });
  it('assigns each component to exactly one agreed chapter', () => {
    expect(regions.map(r => r.siteIds.length)).toEqual([3, 5, 7]);
    for (const site of landmarks) expect(regions.filter(r => r.siteIds.includes(site.id)).map(r => r.id)).toEqual([site.region]);
    expect(landmarks.find(s => s.id === 'tiananmen')?.region).toBe('south');
    expect(landmarks.find(s => s.id === 'jinshui')?.region).toBe('central');
  });
  it('retains the actual north-south ordering and east-west ritual layout', () => {
    const get = (id: string) => landmarks.find(s => s.id === id)!;
    expect(get('bell-drum').coords[1]).toBeGreaterThan(get('jingshan').coords[1]);
    expect(get('jingshan').coords[1]).toBeGreaterThan(get('forbidden-city').coords[1]);
    expect(get('forbidden-city').coords[1]).toBeGreaterThan(get('tiananmen').coords[1]);
    expect(get('tiananmen').coords[1]).toBeGreaterThan(get('yongdingmen').coords[1]);
    expect(get('tiantan').coords[0]).toBeGreaterThan(get('xiannongtan').coords[0]);
    expect(get('taimiao').coords[0]).toBeGreaterThan(get('shejitan').coords[0]);
  });
  it('has sourced nonempty introductions and local chapter entry points', () => {
    for (const site of landmarks) {
      expect(site.summary.length).toBeGreaterThanOrEqual(80);
      expect(site.sourceIds.every(id => sources.some(s => s.id === id))).toBe(true);
    }
    for (const region of regions) expect(region.entryUrl).toBe(`./chapters/${region.id}/index.html`);
  });
});
