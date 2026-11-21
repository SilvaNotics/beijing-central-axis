import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Layers, LocateFixed, Map, MoveUpRight, RotateCcw, Rotate3D, Play, Volume2, VolumeX, X } from 'lucide-react';
import { landmarks, regions } from './data/heritage';
import type { RegionId } from './data/types';
import SceneView from './scene/SceneView';
import FlatMap from './components/FlatMap';
import TourProgress from './components/TourProgress';
import { bindUiSounds } from './uiSound';
import { narrateStop, setNarrationListener, stopNarration } from './tourVoice';
import { CITY_STAGES, type CityLoadProgress } from './scene/city';
import { createTourStops, tourDuration, tourTimeline } from './scene/axisTour';

/** 加载层的节奏：每段至少 LOAD_STEP_MS、条满后再停 LOAD_HOLD_MS、淡出 LOAD_FADE_MS。 */
const LOAD_TOTAL = CITY_STAGES.length;
const LOAD_STEP_MS = 200;
const LOAD_HOLD_MS = 400;
const LOAD_FADE_MS = 260;
import type { TourMode, TourStatus } from './scene/axisTour';
import AtlasDialog from './components/AtlasDialog';
import ChapterView from './components/ChapterView';
import OrnamentalFrame from './components/OrnamentalFrame';
import { useAtlasAudio } from './components/AtlasAudio';
import { parseRoute, type AtlasRoute } from './lib/navigation';
import { AXIS_ROTATION } from './scene/geo';
import { chapterPreloader } from './lib/chapterPreloader';

export default function App() {
  const [route, setRoute] = useState<AtlasRoute>(() => parseRoute(window.location.hash));
  const [selection, setSelection] = useState<string | null>(() => { const initial = parseRoute(window.location.hash); return initial.kind === 'site' ? initial.id : null; });
  const [focus, setFocus] = useState<RegionId | 'all'>('all');
  const [dialog, setDialog] = useState<'catalog' | 'about' | null>(null);
  const [viewRevision, setViewRevision] = useState(0);
  const [flat, setFlat] = useState(false);
  const [rotateMode, setRotateMode] = useState(false);
  const [tourMode, setTourMode] = useState<TourMode>('off');
  const [tourCommand, setTourCommand] = useState<{ rev: number; type: 'seek' | 'step'; value: number } | null>(null);
  /** 游览的站表：界面上的刻度和跳站都用它换算，跟场景里的完全同源。 */
  const [tourBrief, setTourBrief] = useState(() => { try { return localStorage.getItem('axis:tour-brief') === 'on'; } catch { return false; } });
  const toggleTourBrief = () => setTourBrief(value => { const next = !value; try { localStorage.setItem('axis:tour-brief', next ? 'on' : 'off'); } catch { /* 无痕模式也能用 */ } return next; });
  const tourPlan = useMemo(() => { const stops = createTourStops({ brief: tourBrief }); return { starts: tourTimeline(stops), total: tourDuration(stops), count: stops.length, stops: stops.map(stop => ({ name: stop.name, en: stop.en })) }; }, [tourBrief]);
  const [tourStatus, setTourStatus] = useState<TourStatus | null>(null);
  /** 正在读站名：读的时候背景音乐压低一档，读完回原音量。 */
  const [narrating, setNarrating] = useState(false);
  const [bearing, setBearing] = useState(0);
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [loadStage, setLoadStage] = useState<CityLoadProgress | null>(null);
  /** 加载层的显示进度：只跟着真实阶段走，但每段至少留 LOAD_STEP_MS，最后一格走满后再停 LOAD_HOLD_MS 才揭幕。 */
  const [shownStage, setShownStage] = useState(1);
  const [overlayPhase, setOverlayPhase] = useState<'work' | 'hold' | 'out' | 'off'>('work');
  const shownAt = useRef(0);
  const [slowScene, setSlowScene] = useState(false);
  const [quality, setQuality] = useState<'cinematic' | 'balanced'>('balanced');
  const entryTrigger = useRef<HTMLElement | null>(null);
  const previousRoute = useRef(route);
  const landmark = landmarks.find(site => site.id === selection);
  const selectedRegion = landmark ? regions.find(region => region.id === landmark.region) : undefined;
  const chapter = route.kind === 'chapter' ? regions.find(region => region.id === route.region) : undefined;
  const sample = route.kind === 'sample';

  // 背景音乐音量：章节里也放同一首，音量略低；章节会发消息要求压低或停（对话、视频、弹层）。
  const audioLevel = chapter ? 0.36 : dialog ? 0.16 : landmark ? 0.26 : tourMode === 'playing' ? (narrating ? 0.24 : 0.38) : 0.42;
  const atlasAudio = useAtlasAudio(audioLevel, Boolean(chapter));

  // 游览播报：到站读中英文名；暂停、退出、关静音都立刻停读。
  useEffect(() => {
    setNarrationListener(setNarrating);
    return () => setNarrationListener(null);
  }, []);

  useEffect(() => {
    // 播报只在镜头停稳的那一段（hold）开口；飞行途中 index 已经指向下一站，不能拿来触发。
    if (tourMode === 'playing' && tourStatus?.phase === 'hold') narrateStop(tourStatus.index - 1, undefined, tourBrief);
    else stopNarration();
  }, [tourMode, tourStatus?.index, tourStatus?.phase]);

  useEffect(() => {
    if (atlasAudio.muted) stopNarration();
  }, [atlasAudio.muted]);

  useEffect(() => {
    const change = () => {
      const next = parseRoute(window.location.hash);
      setRoute(next);
      // 点地标只是离开路线看细节：游览停在原地，回来按继续能接上。只有进章节/样例才真的结束。
      if (next.kind === 'site') setTourMode(value => value === 'playing' ? 'paused' : value);
      else if (next.kind === 'chapter' || next.kind === 'sample') setTourMode('off');
      if (next.kind === 'site') { setSelection(landmarks.some(site => site.id === next.id) ? next.id : null); }
      else if (next.kind === 'overview' || next.kind === 'sample') setSelection(null);
      if (previousRoute.current.kind === 'chapter' && next.kind !== 'chapter') requestAnimationFrame(() => (entryTrigger.current || document.querySelector<HTMLElement>('.brand'))?.focus());
      previousRoute.current = next;
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);

  // 章节资源预加载：三维场景就绪后开始后台加载
  useEffect(() => {
    if (sceneStatus === 'ready' && !chapter) {
      chapterPreloader.start(import.meta.env.BASE_URL);
    }
    return () => {
      // 进入章节时停止预加载，避免资源竞争
      if (chapter) chapterPreloader.stop();
    };
  }, [sceneStatus, chapter]);
  useEffect(() => { if (sceneStatus === 'fallback') setFlat(true); }, [sceneStatus]);
  // 十秒没有任何新进展才先给二维图，别让人对着空屏等；只要还在推进就重新计时，
  // 慢机器上不至于把已经算到一半的三维场景换掉。
  useEffect(() => {
    if (sceneStatus !== 'loading') return;
    const timer = window.setTimeout(() => { setSlowScene(true); setFlat(true); }, 10000);
    return () => window.clearTimeout(timer);
  }, [sceneStatus, loadStage?.index]);
  // 提示留到他真的切回三维为止，别在场景算完的瞬间把提示撤掉。
  useEffect(() => { if (!flat) setSlowScene(false); }, [flat]);

  // 真实阶段 → 显示阶段：一次只进一格，每格至少 LOAD_STEP_MS，快机也不会一闪而过。
  useEffect(() => {
    const target = Math.min(loadStage?.index ?? 1, LOAD_TOTAL);
    if (overlayPhase !== 'work' || target <= shownStage) return;
    const delay = Math.max(0, LOAD_STEP_MS - (performance.now() - shownAt.current));
    const timer = window.setTimeout(() => {
      setShownStage(value => Math.min(value + 1, LOAD_TOTAL));
      shownAt.current = performance.now();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [loadStage, shownStage, overlayPhase]);

  // 场景真就绪时把进度补到最后一格（快机可能没来得及报告收卷）。
  useEffect(() => {
    if (sceneStatus !== 'ready') return;
    setLoadStage(prev => prev && prev.index >= LOAD_TOTAL ? prev
      : { index: LOAD_TOTAL, total: LOAD_TOTAL, key: 'scape', label: CITY_STAGES[LOAD_TOTAL - 1].label });
  }, [sceneStatus]);

  // 条满之后再停一拍，然后淡出；不是一就绪就"啪"地换画面。
  useEffect(() => {
    if (overlayPhase !== 'work') return;
    if (sceneStatus === 'fallback') { setOverlayPhase('off'); return; }
    if (sceneStatus !== 'ready' || shownStage < LOAD_TOTAL) return;
    const wait = Math.max(0, LOAD_STEP_MS - (performance.now() - shownAt.current)) + LOAD_HOLD_MS;
    const timer = window.setTimeout(() => setOverlayPhase('out'), wait);
    return () => window.clearTimeout(timer);
  }, [sceneStatus, shownStage, overlayPhase]);

  useEffect(() => {
    if (overlayPhase !== 'out') return;
    const timer = window.setTimeout(() => setOverlayPhase('off'), LOAD_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [overlayPhase]);
  useEffect(() => { document.title = chapter ? `${chapter.title} · 京华一线` : '京华一线 · 北京中轴线数字长卷'; }, [chapter]);
  useEffect(() => { if (flat || chapter || sceneStatus === 'fallback') setTourMode('off'); }, [flat, chapter, sceneStatus]);
  useEffect(() => { if (dialog) setTourMode(value => value === 'playing' ? 'paused' : value); }, [dialog]);
  useEffect(() => {
    const keys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setTourMode('off'); return; }
      if (tourMode === 'off' || chapter || dialog) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        setTourCommand(null);
        setTourMode(value => value === 'playing' ? 'paused' : 'playing');
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const delta = event.key === 'ArrowLeft' ? -1 : 1;
        setTourCommand(prev => ({ rev: (prev?.rev ?? 0) + 1, type: 'step', value: delta }));
      }
    };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [tourMode, chapter, dialog]);
  useEffect(() => bindUiSounds(), []);
  const toggleTour = () => {
    if (tourMode === 'playing') { setTourMode('paused'); return; }
    if (tourMode !== 'paused') { setTourStatus(null); setSelection(null); setFocus('all'); window.location.hash = '/'; }
    setRotateMode(false); setTourMode('playing');
  };
  const selectSite = (id: string) => {
    setTourMode(value => (value === 'playing' || value === 'paused') ? 'paused' : 'off');
    setSelection(id); window.location.hash = `/site/${id}`;
  };
  const seekTour = (ratio: number) => setTourCommand(prev => ({ rev: (prev?.rev ?? 0) + 1, type: 'seek', value: Math.max(0, Math.min(1, ratio)) * (tourPlan.total - 1) }));
  const enterChapter = (id: RegionId) => { entryTrigger.current = document.activeElement as HTMLElement; window.location.hash = `/chapter/${id}`; };
  const reset = () => { setTourMode('off'); setViewRevision(value => value + 1); setRotateMode(false); setFocus('all'); setSelection(null); window.location.hash = '/'; };

  return <>
    <div className={`atlas-app ${sample ? 'is-sample' : ''}`} inert={Boolean(chapter)} aria-hidden={chapter ? true : undefined}>
      <header className="topbar">
        <a className="brand" href="#/" onClick={reset} aria-label="京华一线，返回总览"><span className="brand-emblem" aria-hidden="true">中</span><span>京华一线<small>THE CENTRAL AXIS ATLAS</small></span></a>
        <nav aria-label="主导航"><button aria-label="展卷" data-sfx="open" className={!dialog ? 'nav-active' : ''} onClick={reset}>展卷<span>ATLAS</span></button><button aria-label="遗产名录" data-sfx="open" onClick={() => setDialog('catalog')}>遗产名录<span>HERITAGE</span></button><button aria-label="关于" data-sfx="open" onClick={() => setDialog('about')}>关于<span>ABOUT</span></button></nav>
        <button className="audio-toggle" onClick={atlasAudio.toggle} aria-pressed={!atlasAudio.muted} aria-label={atlasAudio.muted ? '开启声音' : '关闭声音'} title="背景音乐与界面音效">{atlasAudio.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}<span>{atlasAudio.muted ? '静音' : '声音'}</span></button>
        <span className="topbar-note">北京 · 中国 <span>39°54′ N / 116°23′ E</span></span>
      </header>
      <main className="atlas-layout">
        <aside className="editorial-panel" aria-label="中轴线导览"><OrnamentalFrame variant="panel" />
          <div className="title-block"><div className="edition-line"><span>一座城的秩序与回响</span><span>VOL. 01</span></div><h1>京华<span>一线</span><i className="title-seal" aria-label="北京">北<br />京</i></h1><p className="english-title">BEIJING <i className="english-break" />CENTRAL AXIS</p><div className="title-rule" /><h2>一条中轴，<br />读懂一座城。</h2><p className="intro">自钟鼓楼向南，穿过宫阙与市井，<br className="desktop-break" />抵达永定门。七点八公里之间，<br className="desktop-break" />铺展北京七百余年的城市记忆。</p></div>
          <div className="region-heading"><span>循轴而行</span><span>EXPLORE THE AXIS <ArrowDown size={12} /></span></div>
          <div className="region-list">{regions.map((region, index) => <div className={`region-row ${focus === region.id ? 'region-active' : ''}`} key={region.id}><button className="region-focus" onClick={() => { setTourMode('off'); setViewRevision(value => value + 1); setFocus(region.id); setSelection(null); window.location.hash = '/'; }} aria-label={`聚焦${region.title.split(' · ')[0]}`} aria-pressed={focus === region.id}><span className="region-number">0{index + 1}</span><span><strong>{region.title.split(' · ')[0]}<em>{region.title.split(' · ')[1]}</em></strong><small>{region.subtitle}</small></span><LocateFixed size={15} className="focus-icon" /></button><button className="region-entry" data-sfx="page" onClick={() => enterChapter(region.id)} aria-label={`进入${region.title.split(' · ')[0]}`}>进入<span className="entry-label">{region.title.split(' · ')[0]}</span><ArrowRight size={15} /></button></div>)}</div>
          <p className="panel-footnote"><span className="mini-line" />一轴贯古今 · 三段读北京</p>
        </aside>
        <section className={`scene-panel${tourMode === 'off' ? '' : ' is-touring'}`} aria-label="北京中轴线互动地图"><OrnamentalFrame />
          <div className="scene-corner"><span className="corner-cross">+</span><span>北京中轴线<br /><small>世界文化遗产 · 2024</small></span></div>
          <div className="scene-viewport" style={{ visibility: flat ? 'hidden' : 'visible' }}><SceneView selection={selection} focus={focus} viewRevision={viewRevision} sample={sample} quality={quality} rotateMode={rotateMode} tourMode={tourMode} brief={tourBrief} tourCommand={tourCommand} onTourModeChange={setTourMode} onTourStatus={setTourStatus} active={!flat && !chapter} onSelect={selectSite} onReady={setSceneStatus} onLoadProgress={setLoadStage} onBearingChange={setBearing} /></div>
          {!flat && <TourProgress mode={tourMode} status={tourStatus} starts={tourPlan.starts} stops={tourPlan.stops} total={tourPlan.total} brief={tourBrief} onBrief={toggleTourBrief} onSeekRatio={seekTour} onStep={delta => setTourCommand(prev => ({ rev: (prev?.rev ?? 0) + 1, type: 'step', value: delta }))} onToggle={() => setTourMode(value => value === 'playing' ? 'paused' : 'playing')} onStop={() => setTourMode('off')} onRestart={() => { seekTour(0); setTourMode('playing'); }} />}
          {flat && <FlatMap selection={selection} focus={focus} viewRevision={viewRevision} onSelect={selectSite} />}
          {!flat && overlayPhase !== 'off' && <div className={`scene-loading${overlayPhase === 'out' ? ' is-out' : ''}`} role="status" aria-live="polite"><span>{overlayPhase === 'work' ? '正在铺展中轴长卷' : '中轴已展卷'}</span><div className="load-track" aria-hidden="true"><i style={{ width: `${overlayPhase === 'work' ? (shownStage - 1) / LOAD_TOTAL * 100 : 100}%` }} /></div><ol className="load-stages">{CITY_STAGES.map((item, i) => <li key={item.key} className={(overlayPhase === 'work' ? shownStage : LOAD_TOTAL) === i + 1 ? 'is-active' : i + 1 < (overlayPhase === 'work' ? shownStage : LOAD_TOTAL) ? 'is-done' : ''}>{item.label}</li>)}</ol><small className="load-hint">{overlayPhase === 'work' ? '首次载入要现算全部建筑，约三到五秒' : '纸纹与屋脊已就位'}</small>{overlayPhase === 'work' && <button onClick={() => setFlat(true)}>先看平面图 <ArrowRight size={14} /></button>}</div>}
          <div className="map-side-label" aria-hidden="true">纵贯南北 · 秩序之美</div>
          <div className="north-marker" aria-label="方向：北 / 南" data-bearing={flat ? AXIS_ROTATION*180/Math.PI : bearing} style={{transform:`rotate(${flat ? AXIS_ROTATION*180/Math.PI : bearing}deg)`}}><span>北</span><i aria-hidden="true" /><span>南</span></div>
          <div className="map-controls"><button className="overview-control" onClick={reset} aria-label="全轴总览" title="全轴总览"><RotateCcw size={15} /><span>全轴总览</span></button><span className="control-divider" />{!flat && tourMode === 'off' && <button className="tour-control" aria-label="由南至北游览" disabled={sceneStatus !== 'ready'} onClick={toggleTour}><Play size={15} /><span>游览</span></button>}{!flat && <button className="rotation-control" aria-label="旋转视角" aria-pressed={rotateMode} disabled={sceneStatus !== 'ready'} onClick={() => { setTourMode('off'); setRotateMode(value => !value); }}><Rotate3D size={16} /><span>{rotateMode ? '旋转中' : '旋转'}</span></button>}<button className={`map-mode ${flat ? 'is-active' : ''}`} aria-pressed={flat} disabled={sceneStatus === 'fallback'} title={sceneStatus === 'fallback' ? '当前设备使用二维地图' : undefined} onClick={() => { setTourMode('off'); setFlat(value => !value); setRotateMode(false); }}><Map size={16} />{flat && sceneStatus !== 'fallback' ? '三维图景' : '二维地图'}</button><button className="quality-control" onClick={() => setQuality(value => value === 'cinematic' ? 'balanced' : 'cinematic')} aria-label={`当前${quality === 'cinematic' ? '精细' : '流畅'}画质，点击切换`}><Layers size={15} /><span>{quality === 'cinematic' ? '精细' : '流畅'}</span></button></div>
          {sceneStatus === 'fallback' && <p className="fallback-note" role="status">三维图景不可用 · 当前使用二维地图</p>}
          {slowScene && sceneStatus !== 'fallback' && <p className="fallback-note" role="status">三维图景较慢 · 已先切到二维，可点右上角切回</p>}
          {landmark && selectedRegion ? <article className="landmark-detail" key={landmark.id} aria-label={`${landmark.name}详情`}><button className="detail-close icon-button" aria-label="关闭地标详情" onClick={() => { setSelection(null); window.location.hash = '/'; }}><X size={17} /></button><span className="eyebrow">{selectedRegion.title} / {landmark.category}</span><h2>{landmark.name}</h2><p className="detail-english">{landmark.enName}</p><p className="detail-summary">{landmark.summary}</p><dl><div><dt>时代</dt><dd>{landmark.era}</dd></div><div><dt>一眼千年</dt><dd>{landmark.fact}</dd></div></dl><button className="detail-entry" data-sfx="page" onClick={() => enterChapter(landmark.region)}>进入{selectedRegion.title.split(' · ')[0]}篇章<MoveUpRight size={17} /></button></article> : <div className="map-instruction"><span className="instruction-dot" /><span className="mouse-instruction">{flat || sceneStatus === 'fallback' ? '中键拖动 · 滚轮缩放 · 点选地标' : rotateMode ? '拖动旋转 · 点击「旋转中」恢复平移 · 滚轮缩放' : '拖动平移 · Shift + 拖动旋转 · 滚轮缩放'}</span><span className="touch-instruction">{flat || sceneStatus === 'fallback' ? '单指平移 · 双指缩放 · 点选地标' : rotateMode ? '单指旋转 · 双指缩放 · 再点「旋转中」恢复平移' : '单指平移 · 双指缩放 · 点「旋转」调整视角'}</span><span className="instruction-line" /></div>}
          {!landmark && <div className="map-legend" aria-label="地图图例"><span><i className="legend-axis" />中轴序列</span><span><i className="legend-water" />水系</span><span><i className="legend-fabric" />城市肌理</span><span><i className="legend-heritage" />遗产建筑</span></div>}
          <div className="map-bottom"><div className="axis-distance">轴线全长 <span>7.8 km</span></div></div>
        </section>
      </main>
      <footer className="page-footer"><span>北京中轴线 — 中国理想都城秩序的杰作</span><span>钟鼓楼 <i /> 永定门 <span className="footer-distance">7.8 KM</span></span><button onClick={() => setDialog('about')}>资料与说明 <ArrowRight size={12} /></button></footer>
    </div>
    <AtlasDialog mode={dialog} onClose={() => setDialog(null)} onSelect={selectSite} />
    {chapter && <ChapterView region={chapter} onBack={() => { window.location.hash = selection ? `/site/${selection}` : '/'; }} />}
  </>;
}
