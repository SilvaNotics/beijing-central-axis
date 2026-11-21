import * as THREE from 'three';
import { landmarks } from '../data/heritage';
import { project } from './geo';
import type { CityData } from './geodata';
import { createCityPlan } from './cityPlan';
import { bakedPlanImage } from './cityPlanAsset';
import { createForest } from './forest';
import { zhengyangLayout } from './zhengyangLayout';
import { southernRoadPath } from './southernRoad';
import { axisThroughShenwu } from './axisRoute';
import { bakeIter, createLandmarkAsync } from './architecture';
import { pumpAsync } from './coop';
import type { Materials } from './materials';

export const bounds = { width: 640, depth: 1090, centerX: 45, centerZ: 3 };
export interface City {
  object: THREE.Group;
  /** 树林占位：首帧先不给树，画面出来之后再种，省掉一段白等。 */
  grow: () => void;
  anchors: Map<string, THREE.Vector3>;
  labelOffsets: Map<string, { x: number; z: number }>;
  pickers: THREE.Mesh[];
  halo: THREE.Mesh;
}

function path(points: [number, number][], width: number, material: THREE.Material, height: number) {
  const group = new THREE.Group();
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1], points[i]];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!length) continue;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, .035, length + .12), material);
    mesh.position.set((a[0] + b[0]) / 2, height, (a[1] + b[1]) / 2);
    mesh.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]);
    group.add(mesh);
  }
  return group;
}

function waterSurface(data: CityData, material: THREE.Material) {
  const group = new THREE.Group();
  group.name = 'mapped-water';
  const toShapePath = (points: [number, number][], path: THREE.Shape | THREE.Path) => {
    points.map(project).forEach(([x, z], index) => {
      if (index === 0) path.moveTo(x, -z); else path.lineTo(x, -z);
    });
    path.closePath();
  };
  for (const feature of data.context.filter(item => item.kind === 'water')) {
    const shape = new THREE.Shape();
    toShapePath(feature.coordinates, shape);
    for (const hole of feature.holes ?? []) {
      const inner = new THREE.Path();
      toShapePath(hole, inner);
      shape.holes.push(inner);
    }
    const surface = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    surface.rotation.x = -Math.PI / 2;
    surface.position.y = .025;
    surface.renderOrder = 2;
    group.add(surface);
  }
  return group;
}

export const CITY_STAGES = [
  { key: 'paper', label: '铺纸' },
  { key: 'sites', label: '起屋' },
  { key: 'palace', label: '立宫' },
  { key: 'scape', label: '收卷' }
] as const;
export type CityStageKey = typeof CITY_STAGES[number]['key'];
export interface CityLoadProgress { index: number; total: number; key: CityStageKey; label: string }
export type CityStageListener = (progress: CityLoadProgress) => void;

/** 让出主线程一帧，让加载层把上一步的文案和进度真正画出来。 */
const yieldFrame = () => new Promise<void>(resolve => {
  if (typeof requestAnimationFrame !== 'function') { setTimeout(resolve, 0); return; }
  requestAnimationFrame(() => setTimeout(resolve, 0));
});

export async function createCity(m: Materials, data: CityData, sample = false, onStage?: CityStageListener): Promise<City> {
  const object = new THREE.Group(), authored = new THREE.Group();
  const anchors = new Map<string, THREE.Vector3>();
  const labelOffsets = new Map<string, { x: number; z: number }>();
  const pickers: THREE.Mesh[] = [];
  const stage = async (key: CityStageKey) => {
    const index = CITY_STAGES.findIndex(item => item.key === key);
    onStage?.({ index: index + 1, total: CITY_STAGES.length, key, label: CITY_STAGES[index].label });
    performance.mark(`city-stage-${key}`);
    await yieldFrame();
  };
  await stage('paper');
  const ground = new THREE.Mesh(new THREE.BoxGeometry(bounds.width, 2.0, bounds.depth), m.earth);
  ground.position.set(bounds.centerX, -1.2, bounds.centerZ); ground.receiveShadow = true; object.add(ground);
  const base = new THREE.Mesh(new THREE.BoxGeometry(bounds.width + .8, 1, bounds.depth + .8), m.darkStone);
  base.position.set(bounds.centerX, -2.5, bounds.centerZ); object.add(base);
  // Fine brass boundary of a physical exhibition model.
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(bounds.width + .5, .06, bounds.depth + .5)), new THREE.LineBasicMaterial({ color: '#8e7956', transparent: true, opacity: .65 }));
  edge.position.set(bounds.centerX, -.15, bounds.centerZ); object.add(edge);

  performance.mark('plan-start');
  const bakedImage = await bakedPlanImage();
  const texture = bakedImage ? new THREE.Texture(bakedImage) : new THREE.CanvasTexture(await createCityPlan(data));
  if (bakedImage) texture.needsUpdate = true;
  performance.mark('plan-end');
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 2;
  const terrainMaterial = new THREE.MeshBasicMaterial({ map: texture });
  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(bounds.width, bounds.depth), terrainMaterial);
  terrain.rotation.x = -Math.PI / 2; terrain.position.set(bounds.centerX, -.08, bounds.centerZ);
  terrain.name = 'city-plan'; object.add(terrain);
  object.add(waterSurface(data, m.water));
  const lateralSites = new Set(['shejitan', 'taimiao', 'tiantan', 'xiannongtan']);
  const place = async (site: typeof landmarks[number]) => {
    const [x, z] = project(site.coords);
    const group = await createLandmarkAsync(site, m, data); group.position.set(x, .05, z);
    authored.add(group);
    const anchorY = site.kind === 'temple' ? 9 : site.kind === 'hill' ? 10 : site.kind === 'tower' ? 9 : site.kind === 'gate' ? 9 : 5;
    // 名牌挂在实际画出来的那团建筑上，而不是数据里的坐标点：
    // 坐标偶有偏差（太庙偏 120 m、天坛 180 m），名牌就会悬在空地上。
    // 只挪名牌和点击框，anchor 本身不动——详情卡的标注是按 anchor 的相对坐标写的。
    group.updateMatrixWorld(true);
    const drawn = new THREE.Box3().setFromObject(group), center = drawn.getCenter(new THREE.Vector3());
    let labelX = Number.isFinite(center.x) ? center.x : x, labelZ = Number.isFinite(center.z) ? center.z : z;
    // 先农坛的院子从祭台一直拉到东边的神仓院，外接框中心被拉偏近 200 m，名牌会落在神仓院头上。
    // 单独钉回太岁殿那一团（相对坐标点），导览镜头也对着这里。
    if (site.id === 'xiannongtan') { labelX = x - 6.9; labelZ = z + 11.3; }
    labelOffsets.set(site.id, { x: labelX - x, z: labelZ - z });
    anchors.set(site.id, new THREE.Vector3(x, anchorY, z));
    const pick = new THREE.Mesh(new THREE.BoxGeometry(Math.max(2.2, site.footprint[0] / 10), 6, Math.max(2.2, site.footprint[1] / 10)), new THREE.MeshBasicMaterial({ visible: false }));
    pick.position.set(labelX, 3, labelZ); pick.userData.id = site.id; pickers.push(pick); object.add(pick);
  };
  await stage('sites');
  for (const site of landmarks) if (site.kind !== 'palace') {
    await place(site);
    await yieldFrame();
  }
  await stage('palace');
  for (const site of landmarks) if (site.kind === 'palace') {
    await place(site);
    await yieldFrame();
  }
  await stage('scape');
  // The route and every physical layer use the same geographic projection.
  const centerline = [...landmarks.filter(site => !lateralSites.has(site.id) && !['square','southern-road','zhengyang'].includes(site.id)).map(site => project(site.coords)), ...Object.values(zhengyangLayout(landmarks.find(s=>s.id==='zhengyang')!,data)).map(p=>{const [x,z]=project(landmarks.find(s=>s.id==='zhengyang')!.coords);return [x+p.x,z+p.z] as [number,number];}), ...southernRoadPath()].sort((a, b) => a[1] - b[1]);
  authored.add(path(axisThroughShenwu(centerline,landmarks.find(s=>s.id==='forbidden-city')!,data), .38, m.brass, .01));

  performance.mark('bake-start');
  const baked = await pumpAsync(bakeIter(authored));
  performance.mark('bake-end');
  let forest: THREE.Group | null = null;
  const grow = () => {
    if (forest) return;
    performance.mark('forest-start');
    forest = createForest(data, m);
    performance.mark('forest-end');
    object.add(forest);
  };
  object.add(baked);
  const halo = new THREE.Mesh(new THREE.RingGeometry(5, 5.18, 64), new THREE.MeshBasicMaterial({ color: '#d8b476', transparent: true, opacity: .75, depthWrite: false, side: THREE.DoubleSide }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = .25; halo.visible = false; object.add(halo);
  if (sample) {
    // Same full-quality architecture as the main city, framed tightly for material inspection.
    object.name = 'courtyard-lighting-study';
  }
  return { object, grow, anchors, labelOffsets, pickers, halo };
}
