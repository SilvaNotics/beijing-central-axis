import { landmarks } from '../data/heritage';
import voiceGuide from '../data/tourVoice.json';
import { stopEnglish } from '../data/stopEnglish';
import { project } from './geo';
import { mappedLayout, palaceAxis } from './layouts';
import { moundCenter } from './templeLayout';
import { roadStation } from './southernRoad';
import { wanningLayout } from './wanningLayout';
import { drumTowerDisplayOffset } from './bellDrumLayout';

export type TourMode = 'off' | 'playing' | 'paused' | 'complete';
export interface TourStop {
  siteId: string; name: string; en: string; x: number; y: number; z: number;
  /** 停靠期间相机绕点摆过的总弧度；0 表示原地停（平面道路点）。 */
  orbit: number;
  /**
   * 本站中英播报的时长（毫秒，含中英之间的停顿，不含淡入淡出）。
   * 由 scripts/gen-tour-voice.py 量出来写进 data/tourVoice.json；没有音源就是 0。
   */
  narrationMs?: number;
  /** 相对默认游距的缩放：<1 退远看全景，>1 推近看细部。缺省 1。 */
  zoom?: number;
  /** 本站俯角（弧度）。平纸路面要抬高看，否则细带压成一根竖杆。缺省 TOUR_ANGLE。 */
  angle?: number;
}
export interface TourStatus {
  siteId: string; index: number; total: number; name: string; en: string; progress: number;
  /** 这一段是还在飞，还是已经停在点上。播报只认 hold。 */
  phase: 'hold' | 'travel';
  /** 飞行段的去向，面板据此显示「前往 X →」。 */
  next?: { name: string; en: string };
}
export const TOUR_ANGLE = 12 * Math.PI / 180;
/** 游览停留时相机到停靠点的距离：比总览的 1600 近一档，配合更小的焦距露出立面。 */
export const TOUR_DISTANCE = 900;
/** 每站停靠：0.3 s 对位静止 + 3.0 s 环绕 + 0.3 s 收尾静止。 */
const ORBIT_LEAD_MS = 300;
const ORBIT_TAIL_MS = 300;
/** 环绕角速度：12°/s。摆幅越大停得越久，各站看起来是同一种速度。 */
const ORBIT_SPEED = 12 * Math.PI / 180;
/**
 * 不绕的站也要站住：中英文名字读完约 5–6 s，1.5 s 现在读不完一半。
 * 停 4.6 s，正好盖住「南段道路·石板道路」这类长名字。
 */
const STILL_HOLD_MS = 4600;
/** 到站后先静 0.25 s 再开口，读完再留 0.25 s 气口，别一读完就飞走。 */
const NARRATION_TAIL_MS = 500;
type Clip = { zh: number; en: number; brief?: number };
const clips: Clip[] = voiceGuide.clips;
/** 播报时长：中文名 →（讲解）→ 英文名，句间各留一个 gap。 */
const narrationOf = (index: number, brief = false) => {
  const clip = clips[index];
  if (!clip) return 0;
  const extra = brief && clip.brief ? voiceGuide.gapMs + clip.brief : 0;
  return clip.zh + voiceGuide.gapMs + extra + clip.en + NARRATION_TAIL_MS;
};

/**
 * 每站停多久：摆幅决定的基础时长（0.3 s 对位 + 环绕 + 0.3 s 收尾，不绕的站 4.6 s）
 * 与本站播报时长取大者——名字长的站自动站久一点，英文不会被下一站切掉。
 */
export const holdMs = (stop: TourStop) => {
  const base = stop.orbit
    ? Math.round(ORBIT_LEAD_MS + ORBIT_TAIL_MS + stop.orbit / ORBIT_SPEED * 1000)
    : STILL_HOLD_MS;
  return Math.max(base, stop.narrationMs ?? 0);
};

/**
 * 每站的环绕摆幅：体量越大、越需要看侧面就摆得越多；
 * 平面纸片（南段道路、金水桥）不绕，直接停。
 */
const ORBIT_DEGREES: Record<string, number> = {
  'forbidden-city': 60,
  tiantan: 90,
  shejitan: 70,
  xiannongtan: 60,
  taimiao: 60,
  jingshan: 70,
  'bell-drum': 70,
  wanning: 44,
  tiananmen: 50,
  zhengyang: 50,
  yongdingmen: 50,
  'southern-road': 0,
  jinshui: 0,
};
/**
 * 俯角：平纸路面（轴线纸带、广场、桥面）在 12° 下会被压成一根竖杆，
 * 抬高到 14–20° 才看得出是路面而不是柱子；殿堂仍守 12°，让立面说话。
 */
const ANGLE_DEGREES: Record<string, number> = {
  'southern-road': 20,
  jinshui: 18,
  yongdingmen: 16,
  square: 15,
  zhengyang: 14,
};
const angleOf = (siteId: string) => (ANGLE_DEGREES[siteId] ?? 12) * Math.PI / 180;
const DEFAULT_ORBIT_DEGREES = 44;
const orbitOf = (siteId: string) => (ORBIT_DEGREES[siteId] ?? DEFAULT_ORBIT_DEGREES) * Math.PI / 180;

/** Display itinerary from the existing model, not a walkable or historical route. */
export function createTourStops(options: { brief?: boolean } = {}): TourStop[] {
  const stops: TourStop[] = [];
  const add = (siteId: string, name?: string, local = { x: 0, z: 0 }, y = 0, zoom = 1) => {
    const site = landmarks.find(item => item.id === siteId)!;
    const [x, z] = project(site.coords);
    const label = name ?? site.name;
    stops.push({ siteId, name: label, en: stopEnglish[label] ?? site.enName, x: x + local.x, y, z: z + local.z, orbit: orbitOf(siteId), zoom, angle: angleOf(siteId) });
  };
  const building = (siteId: string, id: number, y = 0, offsetX = 0, zoom = 1) => {
    const p = mappedLayout(id, landmarks.find(item => item.id === siteId)!);
    add(siteId, p.name, { x: p.x + offsetX, z: p.z }, y, zoom);
  };
  for (const site of landmarks) {
    switch (site.id) {
      case 'forbidden-city':
        for (const id of palaceAxis) building(site.id, id);
        break;
      case 'tiantan': {
        const [x, z] = moundCenter(site);
        add(site.id, '圜丘坛', { x, z });
        building(site.id, 43921121); building(site.id, 43921139);
        break;
      }
      case 'xiannongtan': {
        // 先农神坛只是一方矮台面，镜头正对它时画面正中是空地，旁边那团太岁殿反倒成了主体。
        // 这一站改成整座坛址的中景：取祭台与太岁殿的中点，两处都在画里。
        const altar = mappedLayout(587608667, site), hall = mappedLayout(587608666, site);
        add(site.id, site.name, { x: (altar.x + hall.x) / 2, z: (altar.z + hall.z) / 2 }, 0, 0.84);
        building(site.id, 587608666);
        break;
      }
      case 'shejitan': building(site.id, 60540199); break;
      case 'taimiao': building(site.id, 684772314); break;
      case 'jingshan': building(site.id, 26390235, 4.5); building(site.id, 26390117); break;
      case 'wanning': add(site.id, undefined, wanningLayout(site)); break;
      // 永定门南端空地大、城楼小，12° 下画面大半是纸面，推近一档让城门占住画面。
      case 'yongdingmen': add(site.id, undefined, { x: 0, z: 0 }, 0, 1.22); break;
      case 'bell-drum':
        building(site.id, 267371087, 0, drumTowerDisplayOffset(site));
        // 钟楼站在鼓楼北边约 100 m 外，12° 俯角下镜头正对钟楼时鼓楼掉在画外，
        // 「钟鼓楼」这一处却只看见一座。退到 0.86 把两楼收进同一个画面。
        building(site.id, 425993664, 0, 0, 0.86);
        break;
      case 'southern-road': {
        const [ox, oz] = project(site.coords);
        for (const station of [100, 400]) {
          const p = roadStation(station);
          add(site.id, station === 100 ? '南段道路 · 石板道路' : '南段道路 · 叠压遗存', { x: p.x - ox, z: p.z - oz });
        }
        break;
      }
      case 'square':
        add(site.id, '广场 · 毛主席纪念堂', { x: .3, z: 7.4 });
        add(site.id, '广场 · 人民英雄纪念碑', { x: -.8, z: -15.8 });
        break;
      default: add(site.id);
    }
  }
  const ordered = stops.sort((a, b) => b.z - a.z);
  // 站序 = 播报音源的编号，必须排在 sort 之后再挂。
  ordered.forEach((stop, index) => { stop.narrationMs = narrationOf(index, options.brief); });
  return ordered;
}

/** 行程时长：按巡航速度算，短程也至少给一个能看清的起落。 */
const TRAVEL_SPEED = 58;
const TRAVEL_MIN_MS = 750;
export function tourTravelMs(a: TourStop, b: TourStop) {
  return Math.max(TRAVEL_MIN_MS, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z) / TRAVEL_SPEED * 1000);
}
/** 五次缓动：起步和收尾都慢，中段速度约为平均值的 1.9 倍。 */
const ease = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export function tourDuration(stops: TourStop[]) {
  return stops.reduce((total, stop, i) => total + holdMs(stop) + (i ? tourTravelMs(stops[i - 1], stop) : 0), 0);
}

/**
 * 每一站开始停留的绝对时刻（累计：该站 holdMs + 路程）。
 * 界面上的刻度、上一站/下一站都按这张表跳，不再自己算一遍。
 */
export function tourTimeline(stops: TourStop[]): number[] {
  const times: number[] = [];
  let elapsed = 0;
  stops.forEach((stop, i) => {
    times.push(elapsed);
    elapsed += holdMs(stop);
    if (i < stops.length - 1) elapsed += tourTravelMs(stop, stops[i + 1]);
  });
  return times;
}

/* ------------------------------ 环绕 ------------------------------ */

/** 双向往返：双数站顺时针、单数站逆时针，飞行段两端方位角正好抵消。 */
const direction = (index: number) => (index % 2 === 0 ? 1 : -1);
/** 入场角：相机从这一侧滑进来停住，再摆到对面。 */
export const entryAzimuth = (stop: TourStop, index: number) => -direction(index) * stop.orbit / 2;
export const exitAzimuth = (stop: TourStop, index: number) => direction(index) * stop.orbit / 2;
/** 摆幅越大，环绕中段退得越多，免得殿堂的进深撑出画框。 */
const orbitPullBack = (stop: TourStop) => (stop.orbit >= Math.PI / 3 ? 0.92 : 0.95);

export interface TourPoint extends TourStop { index: number; done: boolean; phase: 'hold' | 'travel'; azimuth: number; zoomScale: number; angle: number; next?: { name: string; en: string } }

/** 停靠期内的环绕相位：入场角 → 出场角，前后各留静止。 */
function orbitPhase(stop: TourStop, index: number, inHold: number) {
  const entry = entryAzimuth(stop, index);
  if (!stop.orbit) {
    // 不绕的平面站：整段完全静止像卡住了，给 5% 的推拉。
    const span = Math.max(1, holdMs(stop) - ORBIT_LEAD_MS - ORBIT_TAIL_MS);
    const u = Math.max(0, Math.min(1, (inHold - ORBIT_LEAD_MS) / span));
    return { azimuth: 0, zoomScale: 1 + 0.05 * Math.sin(Math.PI * u) };
  }
  const span = Math.max(1, holdMs(stop) - ORBIT_LEAD_MS - ORBIT_TAIL_MS);
  const u = Math.max(0, Math.min(1, (inHold - ORBIT_LEAD_MS) / span));
  /** 正弦缓动：中段最快也只有均速的 1.57 倍，比五次曲线稳。 */
  const eased = (1 - Math.cos(Math.PI * u)) / 2;
  return {
    azimuth: entry + (exitAzimuth(stop, index) - entry) * eased,
    zoomScale: 1 - (1 - orbitPullBack(stop)) * Math.sin(Math.PI * u),
  };
}

/** Absolute elapsed-time sampling makes pauses and slow frames deterministic. */
export function sampleTour(stops: TourStop[], elapsedMs: number): TourPoint {
  if (stops.length && elapsedMs >= tourDuration(stops)) {
    const last = stops.length - 1;
    return { ...stops[last], index: last, done: true, phase: 'hold', azimuth: exitAzimuth(stops[last], last), zoomScale: 1, angle: stops[last].angle ?? TOUR_ANGLE };
  }
  let remaining = Math.max(0, elapsedMs);
  for (let i = 0; i < stops.length; i++) {
    const a = stops[i];
    const hold = holdMs(a);
    if (remaining < hold || i === stops.length - 1) {
      return { ...a, index: i, done: i === stops.length - 1 && remaining >= hold, phase: 'hold', angle: a.angle ?? TOUR_ANGLE, ...orbitPhase(a, i, remaining) };
    }
    remaining -= hold;
    const b = stops[i + 1], duration = tourTravelMs(a, b);
    if (remaining < duration) {
      const t = remaining / duration, eased = ease(t);
      const from = exitAzimuth(a, i), to = entryAzimuth(b, i + 1);
      // 飞行段仍报「上一站」的名号：镜头这时还在上一站上空掠过，
      // 换成下一站的名字就会出现「说的是先农坛、眼前还是天坛」。
      return {
        ...a,
        x: a.x + (b.x - a.x) * eased,
        y: a.y + (b.y - a.y) * eased,
        z: a.z + (b.z - a.z) * eased,
        index: i,
        done: false,
        phase: 'travel',
        azimuth: from + (to - from) * eased,
        zoomScale: 1,
        // 俯角跟着站走：平纸站 20°、殿堂站 12°，飞行段匀速过渡，别在空中折一下。
        angle: (a.angle ?? TOUR_ANGLE) + ((b.angle ?? TOUR_ANGLE) - (a.angle ?? TOUR_ANGLE)) * eased,
        next: { name: b.name, en: b.en },
      };
    }
    remaining -= duration;
  }
  throw new Error('Tour needs at least one stop');
}
