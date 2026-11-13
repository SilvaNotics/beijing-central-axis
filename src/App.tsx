import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Layers, LocateFixed, Map, MoveUpRight, RotateCcw, X } from 'lucide-react';
import { landmarks, regions } from './data/heritage';
import type { RegionId } from './data/types';
import SceneView from './scene/SceneView';
import FlatMap from './components/FlatMap';
import AtlasDialog from './components/AtlasDialog';
import ChapterView from './components/ChapterView';
import OrnamentalFrame from './components/OrnamentalFrame';
import { parseRoute, type AtlasRoute } from './lib/navigation';

export default function App() {
  const [route, setRoute] = useState<AtlasRoute>(() => parseRoute(window.location.hash));
  const [selection, setSelection] = useState<string | null>(() => { const initial = parseRoute(window.location.hash); return initial.kind === 'site' ? initial.id : null; });
  const [focus, setFocus] = useState<RegionId | 'all'>('all');
  const [dialog, setDialog] = useState<'catalog' | 'about' | null>(null);
  const [viewRevision, setViewRevision] = useState(0);
  const [flat, setFlat] = useState(false);
  const [sceneStatus, setSceneStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [quality, setQuality] = useState<'cinematic' | 'balanced'>(() => window.matchMedia('(max-width: 700px)').matches ? 'balanced' : 'cinematic');
  const entryTrigger = useRef<HTMLElement | null>(null);
  const previousRoute = useRef(route);
  const landmark = landmarks.find(site => site.id === selection);
  const selectedRegion = landmark ? regions.find(region => region.id === landmark.region) : undefined;
  const chapter = route.kind === 'chapter' ? regions.find(region => region.id === route.region) : undefined;
  const sample = route.kind === 'sample';

  useEffect(() => {
    const change = () => {
      const next = parseRoute(window.location.hash);
      setRoute(next);
      if (next.kind === 'site') { setSelection(landmarks.some(site => site.id === next.id) ? next.id : null); }
      else if (next.kind === 'overview' || next.kind === 'sample') setSelection(null);
      if (previousRoute.current.kind === 'chapter' && next.kind !== 'chapter') requestAnimationFrame(() => (entryTrigger.current || document.querySelector<HTMLElement>('.brand'))?.focus());
      previousRoute.current = next;
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => { if (sceneStatus === 'fallback') setFlat(true); }, [sceneStatus]);
  useEffect(() => { document.title = chapter ? `${chapter.title} · 京华一线` : '京华一线 · 北京中轴线数字长卷'; }, [chapter]);
  const selectSite = (id: string) => { setSelection(id); window.location.hash = `/site/${id}`; };
  const enterChapter = (id: RegionId) => { entryTrigger.current = document.activeElement as HTMLElement; window.location.hash = `/chapter/${id}`; };
  const reset = () => { setViewRevision(value => value + 1); setFocus('all'); setSelection(null); window.location.hash = '/'; };

  return <>
    <div className={`atlas-app ${sample ? 'is-sample' : ''}`} inert={Boolean(chapter)} aria-hidden={chapter ? true : undefined}>
      <header className="topbar">
        <a className="brand" href="#/" onClick={reset} aria-label="京华一线，返回总览"><span className="brand-emblem" aria-hidden="true">中</span><span>京华一线<small>THE CENTRAL AXIS ATLAS</small></span></a>
        <nav aria-label="主导航"><button aria-label="展卷" className={!dialog ? 'nav-active' : ''} onClick={reset}>展卷<span>ATLAS</span></button><button aria-label="遗产名录" onClick={() => setDialog('catalog')}>遗产名录<span>HERITAGE</span></button><button aria-label="关于" onClick={() => setDialog('about')}>关于<span>ABOUT</span></button></nav>
        <span className="topbar-note">北京 · 中国 <span>39°54′ N / 116°23′ E</span></span>
      </header>
      <main className="atlas-layout">
        <aside className="editorial-panel" aria-label="中轴线导览"><OrnamentalFrame variant="panel" />
          <div className="title-block"><div className="edition-line"><span>一座城的秩序与回响</span><span>VOL. 01</span></div><h1>京华<span>一线</span><i className="title-seal" aria-label="北京">北<br />京</i></h1><p className="english-title">BEIJING<br />CENTRAL AXIS</p><div className="title-rule" /><h2>一条中轴，<br />读懂一座城。</h2><p className="intro">自钟鼓楼向南，穿过宫阙与市井，<br className="desktop-break" />抵达永定门。七点八公里之间，<br className="desktop-break" />铺展北京七百余年的城市记忆。</p></div>
          <div className="region-heading"><span>循轴而行</span><span>EXPLORE THE AXIS <ArrowDown size={12} /></span></div>
          <div className="region-list">{regions.map((region, index) => <div className={`region-row ${focus === region.id ? 'region-active' : ''}`} key={region.id}><button className="region-focus" onClick={() => { setFocus(region.id); setSelection(null); window.location.hash = '/'; }} aria-label={`聚焦${region.title.split(' · ')[0]}`} aria-pressed={focus === region.id}><span className="region-number">0{index + 1}</span><span><strong>{region.title.split(' · ')[0]}<em>{region.title.split(' · ')[1]}</em></strong><small>{region.subtitle}</small></span><LocateFixed size={15} className="focus-icon" /></button><button className="region-entry" onClick={() => enterChapter(region.id)} aria-label={`进入${region.title.split(' · ')[0]}`}>进入<span className="entry-label">{region.title.split(' · ')[0]}</span><ArrowRight size={15} /></button></div>)}</div>
          <p className="panel-footnote"><span className="mini-line" />一轴贯古今 · 三段读北京</p>
        </aside>
        <section className="scene-panel" aria-label="北京中轴线互动地图"><OrnamentalFrame />
          <div className="scene-corner"><span className="corner-cross">+</span><span>北京中轴线<br /><small>世界文化遗产 · 2024</small></span></div>
          <div className="scene-viewport" style={{ visibility: flat ? 'hidden' : 'visible' }}><SceneView selection={selection} focus={focus} viewRevision={viewRevision} sample={sample} quality={quality} active={!flat && !chapter} onSelect={selectSite} onReady={setSceneStatus} /></div>
          {flat && <FlatMap selection={selection} focus={focus} viewRevision={viewRevision} onSelect={selectSite} />}
          {!flat && sceneStatus === 'loading' && <div className="scene-loading" role="status"><span>正在铺展中轴长卷</span><i /><button onClick={() => setFlat(true)}>先浏览二维地图 <ArrowRight size={14} /></button></div>}
          <div className="map-side-label" aria-hidden="true">纵贯南北 · 秩序之美</div>
          <div className="map-controls"><button className="overview-control" onClick={reset} aria-label="全轴总览" title="全轴总览"><RotateCcw size={15} /><span>全轴总览</span></button><span className="control-divider" /><button className={`map-mode ${flat ? 'is-active' : ''}`} aria-pressed={flat} disabled={sceneStatus === 'fallback'} title={sceneStatus === 'fallback' ? '当前设备使用二维地图' : undefined} onClick={() => setFlat(value => !value)}><Map size={16} />{flat && sceneStatus !== 'fallback' ? '三维图景' : '二维地图'}</button><button className="quality-control" onClick={() => setQuality(value => value === 'cinematic' ? 'balanced' : 'cinematic')} aria-label={`当前${quality === 'cinematic' ? '精细' : '流畅'}画质，点击切换`}><Layers size={15} /><span>{quality === 'cinematic' ? '精细' : '流畅'}</span></button></div>
          {sceneStatus === 'fallback' && <p className="fallback-note" role="status">三维图景不可用 · 当前使用二维地图</p>}
          {landmark && selectedRegion ? <article className="landmark-detail" key={landmark.id} aria-label={`${landmark.name}详情`}><button className="detail-close icon-button" aria-label="关闭地标详情" onClick={() => { setSelection(null); window.location.hash = '/'; }}><X size={17} /></button><span className="eyebrow">{selectedRegion.title} / {landmark.category}</span><h2>{landmark.name}</h2><p className="detail-english">{landmark.enName}</p><p className="detail-summary">{landmark.summary}</p><dl><div><dt>时代</dt><dd>{landmark.era}</dd></div><div><dt>一眼千年</dt><dd>{landmark.fact}</dd></div></dl><button className="detail-entry" onClick={() => enterChapter(landmark.region)}>进入{selectedRegion.title.split(' · ')[0]}篇章<MoveUpRight size={17} /></button></article> : <div className="map-instruction"><span className="instruction-dot" />{flat || sceneStatus === 'fallback' ? '中键拖动 · 滚轮缩放 · 点选地标' : '左键 / 中键拖动 · 滚轮缩放'}<span className="instruction-line" /></div>}
          {!landmark && <div className="map-legend" aria-label="地图图例"><span><i className="legend-axis" />中轴序列</span><span><i className="legend-water" />水系</span><span><i className="legend-fabric" />城市肌理</span><span><i className="legend-heritage" />遗产建筑</span></div>}
          <div className="map-bottom"><div className="axis-distance">轴线全长 <span>7.8 km</span></div><span className="map-note">基于真实地理位置 · 周边肌理为示意<br /><small>AN INTERPRETATION OF BEIJING’S LIVING HERITAGE</small></span></div>
        </section>
      </main>
      <footer className="page-footer"><span>北京中轴线 — 中国理想都城秩序的杰作</span><span>钟鼓楼 <i /> 永定门 <span className="footer-distance">7.8 KM</span></span><button onClick={() => setDialog('about')}>资料与说明 <ArrowRight size={12} /></button></footer>
    </div>
    <AtlasDialog mode={dialog} onClose={() => setDialog(null)} onSelect={selectSite} />
    {chapter && <ChapterView region={chapter} onBack={() => { window.location.hash = selection ? `/site/${selection}` : '/'; }} />}
  </>;
}
