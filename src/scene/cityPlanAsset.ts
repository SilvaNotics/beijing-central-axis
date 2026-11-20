import { cityDataHash } from './geodata';

interface PlanManifest { hash: string; plan: string; arch: string; width: number; height: number }

const base = import.meta.env.BASE_URL;
let manifestPromise: Promise<PlanManifest | null> | undefined;
const images = new Map<string, Promise<HTMLImageElement | null>>();

function manifest() {
  manifestPromise ??= fetch(`${base}data/city-plan.json`)
    .then(response => response.ok ? response.json() as Promise<PlanManifest> : null)
    .catch(() => null);
  return manifestPromise;
}

/** 预烤的地面图；数据指纹不符、文件缺失或浏览器不支持时返回 null，由调用方现场绘制。 */
export async function bakedPlanUrl(architectural = false): Promise<string | null> {
  const entry = await manifest();
  if (!entry) return null;
  const hash = cityDataHash();
  if (!hash || entry.hash !== hash) {
    console.warn('地面图与当前数据不一致，改回现场绘制；改动 data/ 之后请运行 npm run bake:plan。');
    return null;
  }
  return `${base}data/${architectural ? entry.arch : entry.plan}`;
}

export function bakedPlanImage(architectural = false): Promise<HTMLImageElement | null> {
  const key = architectural ? 'arch' : 'plan';
  let pending = images.get(key);
  if (!pending) {
    pending = (async () => {
      const url = await bakedPlanUrl(architectural);
      if (!url) return null;
      const image = new Image();
      image.src = url;
      await image.decode();
      return image;
    })().catch(() => null);
    images.set(key, pending);
  }
  return pending;
}
