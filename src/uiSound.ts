/**
 * 界面音效。
 *
 * 素材（都是可商用、无需署名）：
 * - 木叩 / 低木：sfxmint「Restrained Short Wood Tap」(CC0)，裁到 160ms，低频谐振留作「进入」用。
 * - 纸响：Wikimedia Commons「Turning a page」(公有领域)，截取 1.50–2.10s 的翻纸段，做了高切与 EQ。
 *
 * 音量压在背景乐之下：默认 0.30，翻页 0.34，低木 0.26（背景乐总览是 0.42）。
 * 跟顶栏「音乐」开关共用同一个偏好（axis:atlas-audio），关掉音乐就连音效一起静音，不另设开关。
 */

const FILES = {
  tap: 'audio/ui/ui-tap.mp3',
  open: 'audio/ui/ui-open.mp3',
  page: 'audio/ui/ui-page.mp3'
} as const;

export type UiSoundKind = keyof typeof FILES;

const PREF_KEY = 'axis:atlas-audio';
const GAIN: Record<UiSoundKind, number> = { tap: .30, open: .26, page: .34 };
const POOL_SIZE = 3;

const pools: Partial<Record<UiSoundKind, HTMLAudioElement[]>> = {};
const cursor: Record<string, number> = {};

function muted() {
  try { return localStorage.getItem(PREF_KEY) === 'off'; } catch { return false; }
}

export function playUi(kind: UiSoundKind = 'tap') {
  if (muted()) return;
  let pool = pools[kind];
  if (!pool) {
    pool = pools[kind] = Array.from({ length: POOL_SIZE }, () => {
      const audio = new Audio(FILES[kind]);
      audio.preload = 'auto';
      audio.volume = GAIN[kind];
      return audio;
    });
  }
  const slot = cursor[kind] = ((cursor[kind] ?? 0) + 1) % pool.length;
  const audio = pool[slot];
  try {
    audio.currentTime = 0;
    void audio.play().catch(() => { /* 未获得用户手势授权时静默失败 */ });
  } catch { /* 忽略 */ }
}

/** 全局委托：按钮、链接、地图地标按下即响；元素上写 data-sfx 可以换音色。 */
export function bindUiSounds() {
  const onPointerDown = (event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const hit = target.closest<HTMLElement>('[data-sfx], button, a[href], [role="button"], .flat-site');
    if (!hit) return;
    if (hit.hasAttribute('disabled') || hit.getAttribute('aria-disabled') === 'true') return;
    const kind = hit.dataset.sfx;
    playUi(kind === 'open' || kind === 'page' ? kind : 'tap');
  };
  document.addEventListener('pointerdown', onPointerDown, true);
  return () => document.removeEventListener('pointerdown', onPointerDown, true);
}
