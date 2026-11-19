// Dump the tour stop list (Chinese + English name) as JSON, for scripts/gen-tour-voice.py.
// Bundles src/scene/axisTour.ts with the project's own esbuild, so no extra deps are needed.
// Usage: node scripts/dump-tour-stops.mjs
import { build } from 'esbuild';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const dir = mkdtempSync(join(tmpdir(), 'axis-stops-'));
const outfile = join(dir, 'stops.mjs');
const briefFile = join(dir, 'brief.mjs');

await build({
  entryPoints: ['src/scene/axisTour.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile,
  logLevel: 'error',
});
await build({
  entryPoints: ['src/data/tourBrief.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: briefFile,
  logLevel: 'error',
});

const { createTourStops } = await import(pathToFileURL(outfile).href);
const { TOUR_BRIEFS } = await import(pathToFileURL(briefFile).href);

const stops = createTourStops();
// 讲解稿按站名对齐：站序一变就立刻报错，别让第 7 站去念第 8 站的话。
stops.forEach((stop, index) => {
  const brief = TOUR_BRIEFS[index];
  if (!brief || brief.stop !== stop.name) {
    throw new Error(`brief mismatch at ${index}: stop=${stop.name} brief=${brief?.stop}`);
  }
});
console.log(JSON.stringify(stops.map((stop, index) => ({ name: stop.name, en: stop.en, brief: TOUR_BRIEFS[index].text }))));
