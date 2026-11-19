import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 总览背景音乐：一条循环曲，音量由调用方按场景给出，这里负责起播、淡变、静音偏好。
 * 浏览器不允许无交互自动出声，所以第一次 pointerdown / keydown / touchstart 才起播。
 * 章节里的配乐也由这里统一放：章节通过 {type:'axis:audio', state:'normal'|'duck'|'mute'}
 * 告诉这里正常、压低或停，避免同一条曲子在两层各放一遍。
 */
const TRACK_PATH = 'audio/atlas-theme.mp3';
const PREF_KEY = 'axis:atlas-audio';
const FADE_MS = 420;
const CHAPTER_MIX: Record<string, number> = { normal: 1, duck: 0.28, mute: 0 };

function readPref(): boolean {
  try {
    return window.localStorage.getItem(PREF_KEY) === 'off';
  } catch {
    return false;
  }
}

export function useAtlasAudio(target: number, chapter: boolean) {
  const [muted, setMuted] = useState(readPref);
  const audio = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(muted);
  const targetRef = useRef(target);
  const chapterRef = useRef(chapter);
  const mix = useRef(1);
  const engaged = useRef(false);

  useEffect(() => {
    const element = new Audio(`${import.meta.env.BASE_URL}${TRACK_PATH}`);
    element.loop = true;
    element.preload = 'auto';
    element.volume = 0;
    element.hidden = true;
    document.body.appendChild(element);
    audio.current = element;
    return () => {
      element.pause();
      element.remove();
      audio.current = null;
    };
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
    targetRef.current = target;
    chapterRef.current = chapter;
    if (!chapter) mix.current = 1;
  }, [muted, target, chapter]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; state?: string } | null;
      if (!data || data.type !== 'axis:audio') return;
      const value = CHAPTER_MIX[String(data.state)];
      if (typeof value === 'number') mix.current = value;
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    let from = 0;
    let startAt = performance.now();
    let goalAt = -1;
    const timer = window.setInterval(() => {
      const element = audio.current;
      if (!element) return;
      const now = performance.now();
      const goal = mutedRef.current ? 0 : Math.max(0, Math.min(1, targetRef.current * (chapterRef.current ? mix.current : 1)));
      if (goal !== goalAt) {
        goalAt = goal;
        from = element.volume;
        startAt = now;
      }
      if (now - startAt >= FADE_MS) element.volume = goal;
      else element.volume = from + (goal - from) * Math.min(1, Math.max(0, (now - startAt) / FADE_MS));
    }, 40);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    const start = () => {
      engaged.current = true;
      audio.current?.play().catch(() => { /* 用户偏好或系统策略拒绝时保持静止，下一个手势再试 */ });
    };
    events.forEach(name => window.addEventListener(name, start, { once: true, passive: true }));
    return () => events.forEach(name => window.removeEventListener(name, start));
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      const element = audio.current;
      if (!element || !engaged.current) return;
      if (document.hidden) element.pause();
      else element.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const toggle = useCallback(() => {
    setMuted(previous => {
      const next = !previous;
      if (!next) {
        engaged.current = true;
        audio.current?.play().catch(() => {});
      }
      try {
        window.localStorage.setItem(PREF_KEY, next ? 'off' : 'on');
      } catch { /* 隐私模式下写不进去，不影响本次会话 */ }
      return next;
    });
  }, []);

  return { muted, toggle };
}
