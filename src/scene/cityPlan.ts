import { palaceCourtZones, palaceGardenZones } from './palaceLandscape';
import { palaceBridgeLayouts } from './palaceWater';
import { jingshanCourts, jingshanWalks } from './jingshanLayout';
import { tiantanGround } from './tiantanGround';
import { tiantanWallRuns } from './tiantanWalls';
import type { CityData } from './geodata';
import { localBuildingRing } from './geodata';
import { pointInPolygon, project } from './geo';
import { landmarks } from '../data/heritage';
import { zhengyangPlatformRing } from './zhengyangLayout';
import { palaceTerraces } from './palaceMassing';
import { palaceGateIds, shenwuForecourtLayout } from './palaceGates';

export const planBounds = { width: 640, depth: 1090, centerX: 45, centerZ: 3 };

/** 每画完一段让出主线程一帧：这张图有好几万笔绘制，一口气画完会把页面冻住两三秒。 */
const yieldFrame = () => new Promise<void>(resolve => {
  if (typeof requestAnimationFrame !== 'function') { setTimeout(resolve, 0); return; }
  requestAnimationFrame(() => setTimeout(resolve, 0));
});

/** A single local map surface replaces thousands of background meshes. */
export async function createCityPlan(data: CityData, resolution = 2048, architecturalPlan = false) {
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
  await yieldFrame();
  const temple = landmarks.find(site => site.id === 'tiantan')!;
  const paving = tiantanGround(temple,data), [tx,tz] = project(temple.coords);
  const world = ([x,z]: [number,number]): [number,number] => [x+tx,z+tz];
  ctx.fillStyle = '#b1a793'; ctx.strokeStyle = '#b1a793'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const court of paving.courts) { trace([court.ring.map(world)]); ctx.fill(); }
  for(const run of tiantanWallRuns(temple,data)) {
    const [ax,az]=world(run.a),[bx,bz]=world(run.b);
    ctx.beginPath();ctx.moveTo(ax,az);ctx.lineTo(bx,bz);
    ctx.strokeStyle=run.kind==='outer'?'#59615d':run.kind==='court'?'#884f42':'#6e7c68';
    ctx.lineWidth=run.kind==='outer'?.11:run.kind==='inner'||run.kind==='divider'?.09:.07;
    ctx.stroke();
  }
  for (const path of paving.paths) {
    ctx.beginPath(); path.points.map(world).forEach(([x,z],i) => i ? ctx.lineTo(x,z) : ctx.moveTo(x,z));
    ctx.lineWidth = path.width; ctx.stroke();
  }
  await yieldFrame();
  const hill = landmarks.find(site=>site.id==='jingshan')!, [jx,jz] = project(hill.coords);
  const hillPoint = ([x,z]:[number,number]):[number,number] => [x+jx,z+jz];
  for(const court of jingshanCourts(hill)) { trace([court.ring.map(hillPoint)]); ctx.fill(); }
  for(const walk of jingshanWalks(hill)) {
    ctx.beginPath();walk.points.map(hillPoint).forEach(([x,z],i)=>i?ctx.lineTo(x,z):ctx.moveTo(x,z));
    ctx.lineWidth=walk.width;ctx.stroke();
  }
  const cores = landmarks.map(s => ({ p: project(s.coords), w: s.footprint[0] / 20, d: s.footprint[1] / 20 }));
  const protectedAreas = data.context.filter(feature => feature.kind === 'park' || feature.kind === 'water').map(feature => ({
    ring: feature.coordinates.map(project),
    holes: (feature.holes ?? []).map(ring => ring.map(project)),
  }));
  const palaceSite = landmarks.find(site=>site.id==='forbidden-city')!, [ppx, ppz] = project(palaceSite.coords);
  let drawn = 0;
  for (const building of data.buildings) {
    if (++drawn % 250 === 0) await yieldFrame();
    const palace = palaceSite, display = shenwuForecourtLayout(palace,data,building.id), [px,pz] = [ppx,ppz];
    const ring = display ? display.ring.map(([x,z]):[number,number]=>[x+px,z+pz]) : building.id===25109960?zhengyangPlatformRing(landmarks.find(s=>s.id==='zhengyang')!,data):localBuildingRing(building);
    const [x, z] = ring[0];
    const center: [number, number] = ring.slice(0,-1).reduce((sum, point) => [sum[0]+point[0],sum[1]+point[1]],[0,0]).map(value => value / Math.max(1,ring.length-1)) as [number, number];
    if (!architecturalPlan && protectedAreas.some(area => pointInPolygon(center,area.ring) && !area.holes.some(hole => pointInPolygon(center,hole)))) continue;
    const heritage = cores.some(c => Math.abs(x - c.p[0]) < c.w && Math.abs(z - c.p[1]) < c.d);
    trace([ring]); ctx.fillStyle = (palaceTerraces.has(building.id)||palaceGateIds.some(id=>id===building.id))?'#c9bca4':heritage ? '#a28b68' : '#71766f'; ctx.fill();
    ctx.lineWidth = .055; ctx.strokeStyle = heritage ? '#6e5340' : '#505b58'; ctx.stroke();
  }
  await yieldFrame();
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
  await yieldFrame();
  const palace=landmarks.find(site=>site.id==='forbidden-city')!, [px,pz]=project(palace.coords);
  const palacePoint=([x,z]:[number,number]):[number,number]=>[x+px,z+pz];
  for(const garden of [...palaceGardenZones(palace,data),...palaceCourtZones(palace,data)]) {
    trace(garden.beds.map(r=>r.map(palacePoint)));ctx.fillStyle='#657653';ctx.fill();
    if(garden.paths?.length){trace(garden.paths.map(r=>r.map(palacePoint)));ctx.fillStyle='#c9bca4';ctx.fill();}
    for(const tree of garden.trees) { const [x,z]=palacePoint(tree.point);ctx.beginPath();ctx.arc(x,z,tree.radius,0,Math.PI*2);ctx.fillStyle='#415d43';ctx.fill(); }
  }
  for(const bridge of palaceBridgeLayouts(palace,data)) {
    const c=Math.cos(bridge.rotation),s=Math.sin(bridge.rotation);
    const at=(x:number,z:number):[number,number]=>palacePoint([bridge.center[0]+x*c+z*s,bridge.center[1]-x*s+z*c]);
    trace([[[ -bridge.width/2,-bridge.length/2],[bridge.width/2,-bridge.length/2],[bridge.width/2,bridge.length/2],[-bridge.width/2,bridge.length/2]].map(([x,z])=>at(x,z))]);
    ctx.fillStyle='#e0d5bf';ctx.fill();ctx.lineWidth=.05;ctx.strokeStyle='#827e70';ctx.stroke();
  }
  return canvas;
}
