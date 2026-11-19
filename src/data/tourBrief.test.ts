import { describe, expect, it } from 'vitest';
import { createTourStops } from '../scene/axisTour';
import { TOUR_BRIEFS } from './tourBrief';

/**
 * 讲解稿按站序跟音频对齐，顺序一错就会念错站。
 * 这里拿 createTourStops() 的站名逐条比，改站表忘了改讲解稿会当场红。
 */
const stops = createTourStops();

describe('游览讲解稿', () => {
  it('条数与站数一致', () => {
    expect(TOUR_BRIEFS).toHaveLength(stops.length);
  });

  it('第 i 条对的是第 i 站', () => {
    expect(TOUR_BRIEFS.map(brief => brief.stop)).toEqual(stops.map(stop => stop.name));
  });

  it('每条都读得完：8–30 字', () => {
    const bad = TOUR_BRIEFS.filter(brief => brief.text.length < 8 || brief.text.length > 30);
    expect(bad).toEqual([]);
  });
});
