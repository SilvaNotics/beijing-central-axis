import { describe, expect, it } from 'vitest';
import { landmarks } from '../data/heritage';
import { createTourStops, entryAzimuth, exitAzimuth, holdMs, sampleTour, tourDuration, tourTimeline, tourTravelMs } from './axisTour';

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
    const middle = sampleTour(stops, holdMs(stops[0]) + tourTravelMs(stops[0], stops[1]) / 2);
    expect(middle.x).toBeCloseTo((stops[0].x + stops[1].x) / 2);
    expect(middle.z).toBeCloseTo((stops[0].z + stops[1].z) / 2);
    let previousZ = Infinity;
    for (let elapsed = 0; elapsed < tourDuration(stops); elapsed += 250) {
      const sample = sampleTour(stops, elapsed);
      expect(sample.z).toBeLessThanOrEqual(previousZ); previousZ = sample.z;
    }
    expect(sampleTour(stops, tourDuration(stops))).toMatchObject({ name: '钟楼', done: true });
  });
  it('tourTimeline 与采样一致：第 i 个时刻正好停在第 i 站', () => {
    const times = tourTimeline(stops);
    expect(times).toHaveLength(stops.length);
    times.forEach((elapsed, index) => {
      // 到站那一帧仍是上一站的飞行收尾（0 ms），停稳看 1 ms 之后。
      expect(sampleTour(stops, elapsed + 1)).toMatchObject({ index, name: stops[index].name });
    });
    expect(times[0]).toBe(0);
    expect(times.at(-1)!).toBeLessThan(tourDuration(stops));
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
  });
  it('环绕：停靠期内方位角单向摆到出场角，飞行段首尾相接', () => {
    const times = tourTimeline(stops);
    stops.forEach((stop, index) => {
      if (!stop.orbit) return;
      const start = times[index];
      const entry = sampleTour(stops, start).azimuth;
      const afterLead = sampleTour(stops, start + 400).azimuth;
      const mid = sampleTour(stops, start + holdMs(stop) / 2).azimuth;
      const settled = sampleTour(stops, start + holdMs(stop) - 10).azimuth;
      expect(entry).toBeCloseTo(entryAzimuth(stop, index), 6);
      expect(settled).toBeCloseTo(exitAzimuth(stop, index), 6);
      const sign = Math.sign(exitAzimuth(stop, index) - entryAzimuth(stop, index));
      expect(Math.sign(afterLead - entry)).toBe(sign);
      expect(Math.sign(mid - afterLead)).toBe(sign);
      expect(Math.sign(settled - mid)).toBe(sign);
    });
  });
  it('相邻站方向相反而角度相接，飞行段不甩镜头', () => {
    const times = tourTimeline(stops);
    for (let i = 0; i < stops.length - 1; i++) {
      const travelStart = times[i] + holdMs(stops[i]);
      const travelMs = tourTravelMs(stops[i], stops[i + 1]);
      const leaving = sampleTour(stops, travelStart + 1).azimuth;
      const arriving = sampleTour(stops, travelStart + travelMs - 1).azimuth;
      expect(leaving).toBeCloseTo(exitAzimuth(stops[i], i), 3);
      expect(arriving).toBeCloseTo(entryAzimuth(stops[i + 1], i + 1), 3);
      if (stops[i].orbit === stops[i + 1].orbit) expect(Math.abs(leaving - arriving)).toBeLessThan(1e-3);
    }
  });
  it('跳站落在入场角，到位后镜头是静的（弧已走完）', () => {
    const times = tourTimeline(stops);
    times.forEach((elapsed, index) => {
      // 到站内 1 ms：飞行段（含 0 ms 那一帧）仍挂上一站的名号，这里看的是停稳后的第一帧。
      const point = sampleTour(stops, elapsed + 1);
      expect(point.index).toBe(index);
      expect(point.azimuth).toBeCloseTo(entryAzimuth(stops[index], index), 6);
      // 不绕的站入场时会带一点点推拉（0.05 幅度，1 ms 处几乎还是 1），给个窄区间而不是精确值。
      expect(point.zoomScale).toBeGreaterThan(0.999);
      expect(point.zoomScale).toBeLessThan(1.002);
    });
  });
  it('飞行段报的是「上一站」的名号，同时给出下一站的去向', () => {
    const times = tourTimeline(stops);
    const start = times[3] + holdMs(stops[3]);
    const point = sampleTour(stops, start + 1);
    expect(point.phase).toBe('travel');
    expect(point.index).toBe(3);
    expect(point.next?.name).toBe(stops[4].name);
  });
  it('平纸路面抬高看：南段道路 20°、殿堂仍是 12°', () => {
    const road = stops.find(stop => stop.siteId === 'southern-road')!;
    const hall = stops.find(stop => stop.name === '太和殿')!;
    expect(road.angle).toBeCloseTo(20 * Math.PI / 180, 6);
    expect(hall.angle).toBeCloseTo(12 * Math.PI / 180, 6);
    expect(sampleTour(stops, 0).angle).toBeCloseTo(stops[0].angle!, 6);
  });
  it('钟楼退到 0.86，把鼓楼一起收进画面', () => {
    const bell = stops.find(stop => stop.name === '钟楼')!;
    expect(bell.zoom).toBe(0.86);
    expect(stops.find(stop => stop.name === '鼓楼')!.zoom).toBe(1);
  });
  it('讲解模式把每站停靠拉长，时间表仍是递增的', () => {
    const plain = createTourStops();
    const spoken = createTourStops({ brief: true });
    expect(tourDuration(spoken)).toBeGreaterThan(tourDuration(plain));
    for (let i = 0; i < spoken.length; i++) expect(spoken[i].narrationMs!).toBeGreaterThan(plain[i].narrationMs!);
    const times = tourTimeline(spoken);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
  });
});
