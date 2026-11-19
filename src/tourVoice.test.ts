import { describe, expect, it } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createTourStops } from './scene/axisTour';
import voiceGuide from './data/tourVoice.json';

/**
 * 播报音源是预生成的静态文件，站表一改就可能对不上号。
 * 这里守住：30 站 × 中英两条，编号与站序一一对应，且都不是空文件。
 */
const dir = join(process.cwd(), 'public', 'audio', 'tour');
const stops = createTourStops();
const files = stops.flatMap((_, index) =>
  (['zh', 'en'] as const).map(lang => `${String(index).padStart(2, '0')}-${lang}.mp3`));
const briefFiles = stops.map((_, index) => `${String(index).padStart(2, '0')}-brief.mp3`);

describe('游览播报音源', () => {
  it('每站中英各一条，文件都在', () => {
    expect(files.filter(file => !existsSync(join(dir, file)))).toEqual([]);
  });

  it('每条都像样（> 2 KB）', () => {
    const tiny = files.filter(file => statSync(join(dir, file)).size < 2048);
    expect(tiny).toEqual([]);
  });

  it('音源条数正好是站数的两倍', () => {
    expect(files.length).toBe(stops.length * 2);
  });

  it('讲解音源每站一条，时长表里也有数', () => {
    expect(briefFiles.filter(file => !existsSync(join(dir, file)))).toEqual([]);
    expect(briefFiles.filter(file => statSync(join(dir, file)).size < 2048)).toEqual([]);
    const missing = voiceGuide.clips.flatMap((clip, index) => (clip.brief ? [] : [index]));
    expect(missing).toEqual([]);
    expect(voiceGuide.clips).toHaveLength(stops.length);
  });
});
