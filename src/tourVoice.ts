/**
 * 游览播报：到一站，先读中文名，再读英文名。
 *
 * 音源是预生成的 MP3（public/audio/tour/00-zh.mp3 … 29-en.mp3），
 * Edge TTS 合成：中文 zh-CN-YunxiNeural（少年音，rate +10%、pitch +28Hz），
 * 英文 en-US-GuyNeural（rate +10%、pitch +10Hz）。实测中位基频 158 / 178 Hz，都是男声偏亮的档位。
 * 生成脚本见 docs/development.md「游览播报」。
 *
 * 跟顶栏「音乐」开关共用 axis:atlas-audio：关掉音乐就不播报。
 * 换站时旧句子 200 ms 淡出，不硬切。
 */
const BASE = `${import.meta.env.BASE_URL}audio/tour/`;
const PREF_KEY = 'axis:atlas-audio';
const GAIN = 0.92;
const GAP_MS = 150;
const FADE_MS = 200;
/** 到站先静一下再开口：镜头刚停住就说话，会显得抢。 */
const SETTLE_MS = 250;

type Listener = (speaking: boolean) => void;

let active: HTMLAudioElement | null = null;
let gapTimer = 0;
let fadeTimer = 0;
let token = 0;
let listener: Listener | null = null;
let current = -1;

const preloaded = new Set<string>();

function muted() {
  try { return localStorage.getItem(PREF_KEY) === 'off'; } catch { return false; }
}

type Lang = 'zh' | 'en' | 'brief';
const src = (index: number, lang: Lang) => `${BASE}${String(index).padStart(2, '0')}-${lang}.mp3`;

function clip(index: number, lang: Lang) {
  const audio = new Audio(src(index, lang));
  audio.preload = 'auto';
  audio.volume = GAIN;
  return audio;
}

/** 下一站的几条先扒下来，换站时不至于等网络；讲解开着时连 brief 一起。 */
function preload(index: number, withBrief = false) {
  for (const lang of (withBrief ? ['zh', 'en', 'brief'] : ['zh', 'en']) as Lang[]) {
    const key = `${index}-${lang}`;
    if (preloaded.has(key)) continue;
    preloaded.add(key);
    const audio = clip(index, lang);
    audio.load();
  }
}

function emit(speaking: boolean) {
  listener?.(speaking);
}

export function setNarrationListener(fn: Listener | null) {
  listener = fn;
}

export function stopNarration() {
  token += 1;
  window.clearTimeout(gapTimer);
  window.clearTimeout(fadeTimer);
  const element = active;
  active = null;
  if (!element) { emit(false); return; }
  const from = element.volume;
  const start = performance.now();
  const step = () => {
    const k = Math.min(1, (performance.now() - start) / FADE_MS);
    if (k >= 1 || element.paused) { element.pause(); element.currentTime = 0; emit(false); return; }
    element.volume = from * (1 - k);
    fadeTimer = window.setTimeout(step, 40);
  };
  step();
}

/**
 * 读第 index 站。只在镜头真的停在点上之后调用（`TourStatus.phase === 'hold'`），
 * 否则名字会在飞行途中读完，到站反而没声。
 */
export function narrateStop(index: number, settleMs = SETTLE_MS, brief = false) {
  if (index === current && active) return;
  current = index;
  stopNarration();
  if (muted() || index < 0) return;
  const my = ++token;
  // 本站的先扒（跳站时来不及），再扒下一站。
  preload(index, brief);
  preload(index + 1, brief);

  const begin = () => {
    if (my !== token) return;
    // 顺序固定：中文名 →（讲解）→ 英文名。讲解夹在两个名字中间，不另起一句开场白。
    const order: Lang[] = brief ? ['zh', 'brief', 'en'] : ['zh', 'en'];
    let at = 0;
    const next = () => {
      if (my !== token) return;
      if (at >= order.length) { active = null; emit(false); return; }
      const audio = clip(index, order[at++]);
      audio.addEventListener('ended', () => {
        if (my !== token) return;
        gapTimer = window.setTimeout(next, GAP_MS);
      });
      audio.addEventListener('error', () => {
        if (my !== token) return;
        at = order.length;
        active = null;
        emit(false);
      });
      active = audio;
      emit(true);
      audio.play().catch(() => { if (my === token) next(); });
    };
    next();
  };

  if (settleMs > 0) gapTimer = window.setTimeout(begin, settleMs);
  else begin();
}

/** 静音开关拨到「关」时把正在读的句子停下。 */
export function handleMuteChange(nowMuted: boolean) {
  if (nowMuted) stopNarration();
}
