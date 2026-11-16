import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, RotateCw } from 'lucide-react';
import type { Region } from '../data/types';
import { resolveEntryUrl } from '../lib/navigation';

export default function ChapterView({ region, onBack }: { region: Region; onBack: () => void }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'displayed' | 'slow'>('loading');
  const backRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const src = resolveEntryUrl(region.entryUrl, import.meta.env.BASE_URL);
  useEffect(() => { backRef.current?.focus(); }, [region.id]);
  useEffect(() => {
    if (!src) return;
    const origin = new URL(src, window.location.href).origin;
    const handleMessage = (event: MessageEvent) => {
      if (event.source === frameRef.current?.contentWindow && event.origin === origin && event.data?.type === 'axis:return') onBack();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [src, onBack]);
  useEffect(() => {
    setStatus('loading');
    // Media preloads can hold iframe.load indefinitely on mobile connections.
    // Reveal same-origin documents once their DOM is usable, without waiting
    // for background audio/video. Cross-origin entries still use onLoad.
    const expected = src ? new URL(src, window.location.href) : null;
    const checkDocument = () => {
      try {
        const doc = frameRef.current?.contentDocument;
        if (!doc || !expected || doc.URL === 'about:blank') return;
        const actual = new URL(doc.URL);
        if (actual.origin === expected.origin && actual.pathname === expected.pathname
          && doc.readyState !== 'loading' && doc.body) {
          setStatus('displayed');
          window.clearInterval(poll);
        }
      } catch { /* Cross-origin pages expose readiness through onLoad only. */ }
    };
    const poll = window.setInterval(checkDocument, 100);
    checkDocument();
    const timeout = window.setTimeout(() => setStatus(previous => previous === 'loading' ? 'slow' : previous), 8000);
    return () => { window.clearTimeout(timeout); window.clearInterval(poll); };
  }, [region.id, attempt, src]);
  return <section className="chapter-view" aria-label={`${region.title}篇章`}>
    <header className="chapter-header">
      <button ref={backRef} className="text-button" onClick={onBack}><ArrowLeft size={17} /> 返回中轴总览</button>
      <div className="chapter-title"><span className="eyebrow">{region.kicker}</span><h1>{region.title}<span>{region.subtitle}</span></h1></div>
      {src && <a className="text-button" href={src} target="_blank" rel="noopener noreferrer">独立打开 <ExternalLink size={15} /></a>}
    </header>
    <div className="chapter-frame-wrap">
      {src ? <iframe ref={frameRef} key={`${region.id}-${attempt}`} title={`北京中轴线 · ${region.title} · ${region.subtitle}`} src={src} className="chapter-frame" onLoad={() => setStatus('displayed')} onError={() => setStatus('slow')} allow="fullscreen" /> : <div className="chapter-unavailable"><p>篇章地址尚未正确配置。</p><button onClick={onBack}>返回总览</button></div>}
      {status !== 'displayed' && src && <div className="chapter-loading" role="status"><span className="loading-mark" aria-hidden="true">轴</span><p>{status === 'loading' ? '正在展开篇章…' : '篇章暂未响应，可重试或独立打开。'}</p></div>}
    </div>
    <footer className="chapter-footer"><span>{status === 'loading' ? '正在请求篇章页面' : '若画面空白或无法交互，可尝试重新载入或独立打开。'}</span><button className="text-button" onClick={() => setAttempt(value => value + 1)}><RotateCw size={14} /> 重新载入</button></footer>
  </section>;
}
