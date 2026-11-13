import type { CityData } from './geodata';
import { localBuildingRing } from './geodata';
import { project } from './geo';
import { landmarks } from '../data/heritage';

export const planBounds = { width: 640, depth: 1090, centerX: 45, centerZ: 3 };

/** A single local map surface replaces thousands of background meshes. */
export function createCityPlan(data: CityData, resolution = 2048) {
  const canvas = document.createElement('canvas');
  canvas.width = resolution;
  canvas.height = Math.round(resolution * planBounds.depth / planBounds.width);
  const ctx = canvas.getContext('2d')!;
  const sx = canvas.width / planBounds.width, sz = canvas.height / planBounds.depth;
  ctx.scale(sx, sz);
  ctx.translate(planBounds.width / 2 - planBounds.centerX, planBounds.depth / 2 - planBounds.centerZ);
  ctx.fillStyle = '#5b625e';
  ctx.fillRect(planBounds.centerX - planBounds.width / 2, planBounds.centerZ - planBounds.depth / 2, planBounds.width, planBounds.depth);
  const trace = (rings: [number, number][][]) => {
    ctx.beginPath();
    for (const ring of rings) {
      ring.forEach(([x, z], i) => i ? ctx.lineTo(x, z) : ctx.moveTo(x, z));
      ctx.closePath();
    }
  };
  for (const feature of data.context.filter(f => f.kind === 'park')) {
    trace([feature.coordinates.map(project), ...(feature.holes ?? []).map(r => r.map(project))]);
    ctx.fillStyle = '#3d5445'; ctx.fill('evenodd');
    ctx.strokeStyle = '#697560'; ctx.lineWidth = .14; ctx.stroke();
  }
  const cores = landmarks.map(s => ({ p: project(s.coords), w: s.footprint[0] / 20, d: s.footprint[1] / 20 }));
  for (const building of data.buildings) {
    const ring = localBuildingRing(building);
    const [x, z] = ring[0];
    const heritage = cores.some(c => Math.abs(x - c.p[0]) < c.w && Math.abs(z - c.p[1]) < c.d);
    trace([ring]); ctx.fillStyle = heritage ? '#a28b68' : '#71766f'; ctx.fill();
    ctx.lineWidth = .055; ctx.strokeStyle = heritage ? '#6e5340' : '#505b58'; ctx.stroke();
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const feature of data.context.filter(f => f.kind === 'road')) {
    ctx.beginPath(); feature.coordinates.map(project).forEach(([x, z], i) => i ? ctx.lineTo(x, z) : ctx.moveTo(x, z));
    ctx.lineWidth = (feature.width ?? 17) / 10 + .40; ctx.strokeStyle = '#3b4e51'; ctx.stroke();
    ctx.lineWidth = (feature.width ?? 17) / 10; ctx.strokeStyle = '#9d9687'; ctx.stroke();
    if ((feature.width ?? 0) >= 24) { ctx.lineWidth = .10; ctx.strokeStyle = '#b3a58e'; ctx.stroke(); }
  }
  for (const feature of data.context.filter(f => f.kind === 'water')) {
    trace([feature.coordinates.map(project), ...(feature.holes ?? []).map(r => r.map(project))]);
    ctx.fillStyle = '#3d6268'; ctx.fill('evenodd');
    ctx.lineWidth = .28; ctx.strokeStyle = '#86968a'; ctx.stroke();
  }
  return canvas;
}
